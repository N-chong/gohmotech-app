describe('GoHMoTech mobile workflows', () => {
  const user = {
    id: 1,
    username: 'owner',
    email: 'owner@example.com',
    display_name: 'Farm Owner',
    role: 'farm_owner',
    permissions: { farm_access: true, manage_farm: true },
  }
  const session = { token: 'e2e-token', user }
  const dashboard = {
    generated_at: '2026-09-28T00:00:00Z',
    system: { online: true, controller_online: true, controller_last_seen: '2026-09-28T00:00:00Z', iot_online: 2, iot_total: 2, cameras_online: 1, cameras_total: 1 },
    environment: { temperature: 28.5, humidity: 67, light_level: 54, updated_at: '2026-09-28T00:00:00Z' },
    feed: { percentage: 72, is_low: false, updated_at: '2026-09-28T00:00:00Z' },
    goats: { registered: 3 },
    automation: { door: { id: 1, state: 'closed', mode: 'manual', updated_at: '2026-09-28T00:00:00Z' }, light: { id: 2, state: 'off', mode: 'manual', updated_at: '2026-09-28T00:00:00Z' } },
    alerts: [],
  }

  function visitAuthenticated(path: string) {
    cy.visit(path, {
      onBeforeLoad(window) {
        window.sessionStorage.setItem('gohmotech.mobile.session', JSON.stringify(session))
      },
    })
  }

  function triggerInfiniteScroll() {
    cy.get('ion-infinite-scroll').should('not.have.attr', 'disabled')
    cy.get('ion-infinite-scroll').then(($scroll) => {
      $scroll[0].dispatchEvent(new CustomEvent('ionInfinite', { bubbles: true, composed: true }))
    })
  }

  function enterIonInput(selector: string, value: string) {
    cy.get(selector).then(($input) => {
      const input = $input[0] as HTMLIonInputElement
      input.value = value
      input.dispatchEvent(new CustomEvent('ionInput', { bubbles: true, composed: true, detail: { value } }))
    })
  }

  beforeEach(() => {
    cy.intercept('GET', '**/api/mobile/dashboard/**', dashboard).as('dashboard')
    cy.intercept('GET', '**/api/mobile/tracking/**', { summary: {}, goats: [] })
    cy.intercept('POST', '**/api/mobile/auth/realtime-ticket/**', { statusCode: 503, body: { detail: 'Realtime disabled in E2E.' } })
  })

  it('logs in, enters the authenticated application, and loads the dashboard', () => {
    cy.intercept('OPTIONS', '**/api/mobile/auth/login/**', { statusCode: 200 }).as('serverCheck')
    cy.intercept('POST', '**/api/mobile/auth/login/**', { token: 'e2e-token', user }).as('login')

    cy.visit('/login')
    enterIonInput('ion-input#farm-identity', 'owner')
    enterIonInput('ion-input#farm-access-key', 'correct-password')
    cy.get('.terminal-enter').click({ force: true })

    cy.wait('@login')
    cy.location('pathname').should('eq', '/app/home')
    cy.contains('h1', 'Your farm is speaking.').should('be.visible')
    cy.contains('.hero-stat-grid', '2/2').should('be.visible')
    cy.contains('.network-banner', 'Farm server online').should('be.visible')
  })

  it('loads additional goats without duplicates and opens a goat profile', () => {
    const goat = (id: number, goatId: string, name: string) => ({
      id, goat_id: goatId, name, tag_number: `TAG-${id}`, breed: 'boer', breed_display: 'Boer', gender: id % 2 ? 'female' : 'male',
      gender_display: id % 2 ? 'Female' : 'Male', age: '2 years', weight_kg: 35, latest_weight: null,
      health_status: 'healthy', status: 'active', last_seen: '2026-09-28T00:00:00Z', cover_image_url: null,
    })
    const first = goat(1, 'GOAT-001', 'Luna')
    const second = goat(2, 'GOAT-002', 'Milo')
    cy.intercept('GET', '**/api/mobile/goats/**', (request) => {
      const page = new URL(request.url).searchParams.get('page')
      if (page === '2') {
        request.alias = 'goatsPage2'
        request.reply({ count: 2, next: null, previous: '/api/mobile/goats/?page=1', results: [first, second] })
        return
      }
      request.reply({ count: 2, next: '/api/mobile/goats/?page=2', previous: null, results: [first] })
    })
    cy.intercept('GET', '**/api/mobile/goats/GOAT-002/', {
      ...second,
      date_of_birth: null, color_markings: '', health_notes: '', notes: '', vaccination_status: 'current',
      vaccination_status_display: 'Current', vaccine_name: '', vaccination_date: null, next_due_date: null,
      date_added: '2026-01-01T00:00:00Z', last_updated: '2026-09-28T00:00:00Z', images: [], weight_history: [],
    }).as('goatDetail')

    visitAuthenticated('/app/goats')
    cy.contains('.premium-goat-card', 'Luna').should('exist')
    triggerInfiniteScroll()
    cy.wait('@goatsPage2')
    cy.get('.premium-goat-card').should('have.length', 2)
    cy.contains('.premium-goat-card', 'Milo').scrollIntoView().click({ force: true })

    cy.wait('@goatDetail')
    cy.location('pathname').should('eq', '/app/goats/GOAT-002')
    cy.contains('h1', 'Milo').should('be.visible')
  })

  it('paginates alerts and marks an unread notification as reviewed', () => {
    const notification = (id: number, title: string) => ({
      id, title, description: `${title} description`, severity: 'high', severity_display: 'High',
      notification_type: 'security', type_display: 'Security', source: 'Goat house', is_read: false,
      is_resolved: false, created_at: '2026-09-28T00:00:00Z', event_url: null,
    })
    const first = notification(11, 'Motion detected')
    const second = notification(12, 'Door open')
    cy.intercept('GET', '**/security/api/notifications/**', (request) => {
      const page = new URL(request.url).searchParams.get('page')
      if (page === '2') {
        request.alias = 'alertsPage2'
        request.reply({ count: 2, next: null, previous: '/security/api/notifications/?page=1', results: [second] })
        return
      }
      request.reply({ count: 2, next: '/security/api/notifications/?page=2', previous: null, results: [first] })
    })
    cy.intercept('POST', '**/security/api/notifications/12/mark_read/', { ...second, is_read: true }).as('markRead')

    visitAuthenticated('/app/alerts')
    triggerInfiniteScroll()
    cy.wait('@alertsPage2')
    cy.contains('.rich-alert-list article', 'Door open').within(() => {
      cy.get('.alert-summary').click()
      cy.contains('button', 'MARK AS REVIEWED').click()
    })
    cy.wait('@markRead')
    cy.contains('.rich-alert-list article', 'Door open').should('not.have.class', 'unread')
  })

  it('paginates security detections and returns to the tab layout', () => {
    const detection = (id: number, source: string) => ({
      id, detected_at: '2026-09-28T00:00:00Z', snapshot_url: null, source_display: source,
      detection_type_display: 'Person', confidence: 0.91, status_display: 'Detected', review_state: 'pending',
    })
    cy.intercept('GET', '**/security/api/detections/**', (request) => {
      const page = new URL(request.url).searchParams.get('page')
      if (page === '2') {
        request.alias = 'detectionsPage2'
        request.reply({ count: 2, next: null, previous: '/security/api/detections/?page=1', results: [detection(22, 'North gate')] })
        return
      }
      request.reply({ count: 2, next: '/security/api/detections/?page=2', previous: null, results: [detection(21, 'Goat house')] })
    })
    cy.intercept('GET', '**/security/api/notifications/**', { count: 0, next: null, previous: null, results: [] })

    visitAuthenticated('/app/security')
    triggerInfiniteScroll()
    cy.wait('@detectionsPage2')
    cy.get('.security-event-card').should('have.length', 2)
    cy.contains('.security-event-card', 'North gate').should('be.visible')
    cy.get('ion-button.app-back-button').click()
    cy.location('pathname').should('eq', '/app/more')
    cy.contains('h1', 'Farm Owner').should('be.visible')
  })

  it('shows camera loading and configured-camera states without a production backend', () => {
    cy.intercept('GET', '**/api/mobile/cameras/**', {
      delay: 250,
      body: {
        count: 1, next: null, previous: null,
        results: [{ id: 5, camera_id: 'CAM-05', name: 'Barn camera', camera_type: 'fixed', location: 'Goat house', status: 'offline', is_active: true, last_connected: null, last_error: '', updated_at: '2026-09-28T00:00:00Z' }],
      },
    }).as('cameras')

    visitAuthenticated('/app/live')
    cy.contains('Loading controls').should('not.exist')
    cy.contains('Connecting to cameras').should('be.visible')
    cy.wait('@cameras')
    cy.contains('.camera-name-control', 'Barn camera').should('be.visible')
    cy.contains('.camera-signal-row', 'OFFLINE').should('be.visible')
  })

  it('keeps automation enabled only for confirmed-online devices', () => {
    const actuator = {
      id: 3, device_name: 'Goat house door', actuator_type: 'door', current_state: 'closed', current_state_display: 'Closed',
      mode: 'manual', mode_display: 'Manual', last_changed_at: '2026-09-28T00:00:00Z',
      device_online: true, controller_online: true, controller_role: 'main',
    }
    cy.intercept('GET', '**/iot/api/actuators/**', { count: 1, results: [actuator] }).as('actuatorsOnline')
    visitAuthenticated('/app/automation')
    cy.wait('@actuatorsOnline')
    cy.contains('.smart-control-card', 'Goat house door').within(() => {
      cy.contains('ion-button', 'Open door').should('not.have.class', 'button-disabled')
      cy.contains('.device-state', 'ONLINE').should('be.visible')
    })

    cy.intercept('GET', '**/iot/api/actuators/**', { count: 1, results: [{ ...actuator, device_online: false, controller_online: false }] }).as('actuatorsOffline')
    cy.intercept('GET', '**/api/mobile/dashboard/**', {
      ...dashboard,
      system: { ...dashboard.system, controller_online: false },
    })
    cy.reload()
    cy.wait('@actuatorsOffline')
    cy.contains('.smart-control-card', 'Goat house door').within(() => {
      cy.contains('ion-button', 'Open door').should('have.class', 'button-disabled')
      cy.contains('.control-unavailable', 'offline').should('exist')
    })
  })
})
