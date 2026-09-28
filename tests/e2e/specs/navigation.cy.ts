describe('Ionic back navigation', () => {
  const session = {
    token: 'e2e-token',
    user: {
      id: 1,
      username: 'owner',
      email: '',
      display_name: 'Farm Owner',
      role: 'farm_owner',
      permissions: { farm_access: true, manage_farm: true },
    },
  }

  it('renders the previous tab page when leaving a secondary screen', () => {
    cy.intercept('GET', '**/api/mobile/dashboard/**', {
      generated_at: '2026-09-19T00:00:00Z',
      system: { online: true, controller_online: true, controller_last_seen: null, iot_online: 1, iot_total: 1, cameras_online: 0, cameras_total: 0 },
      environment: { temperature: null, humidity: null, light_level: null, updated_at: null },
      feed: { percentage: null, is_low: null, updated_at: null },
      goats: { registered: 0 },
      automation: { door: null, light: null },
      alerts: [],
    })
    cy.intercept('GET', '**/api/mobile/tracking/**', { summary: {}, goats: [] })
    cy.intercept('GET', '**/security/api/notifications/**', { count: 0, next: null, previous: null, results: [] })
    cy.intercept('GET', '**/iot/api/actuators/**', { count: 0, results: [] })

    cy.visit('/app/more', {
      onBeforeLoad(window) {
        window.sessionStorage.setItem('gohmotech.mobile.session', JSON.stringify(session))
      },
    })

    cy.contains('.more-page:not(.ion-page-hidden) h1', 'Farm Owner').should('exist')
    cy.get('.hub-focus-action a').click()
    cy.location('pathname').should('eq', '/app/automation')
    cy.contains('.automation-page:not(.ion-page-hidden) h1', 'Physical systems.').should('exist')

    cy.get('ion-button.app-back-button').should('be.visible')
    cy.wait(250)
    cy.get('ion-button.app-back-button').click()
    cy.location('pathname').should('eq', '/app/more')
    cy.contains('.more-page:not(.ion-page-hidden) h1', 'Farm Owner').should('exist')
  })
})
