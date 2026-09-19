import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { relativeTime, titleCase } from '@/utils/format'

describe('format utilities', () => {
  beforeEach(() => vi.setSystemTime(new Date('2026-09-19T06:00:00Z')))
  afterEach(() => vi.useRealTimers())

  test('formats server timestamps relative to the current time', () => {
    expect(relativeTime('2026-09-19T05:55:00Z')).toBe('5 minutes ago')
    expect(relativeTime(null)).toBe('No recent update')
  })

  test('formats API state values for presentation', () => {
    expect(titleCase('out_of_range')).toBe('Out Of Range')
    expect(titleCase('camera_offline')).toBe('Camera Offline')
  })
})
describe('mobile session restoration', () => {
  const user = { id: 1, username: 'owner', email: '', display_name: 'Farm Owner', role: 'farm_owner' as const, permissions: { farm_access: true, manage_farm: true } }

  afterEach(() => {
    window.sessionStorage.clear()
    vi.resetModules()
  })

  test('restores authentication after a page reload in the same app window', async () => {
    window.sessionStorage.setItem('gohmotech.mobile.session', JSON.stringify({ token: 'test-token', user }))
    vi.resetModules()
    const { authState } = await import('@/stores/auth.store')
    expect(authState.token).toBe('test-token')
    expect(authState.user?.display_name).toBe('Farm Owner')
  })
})

describe('mobile authentication transport', () => {
  const user = { id: 1, username: 'owner', email: '', display_name: 'Farm Owner', role: 'farm_owner' as const, permissions: { farm_access: true, manage_farm: true } }

  afterEach(() => {
    window.sessionStorage.clear()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  test('preserves the existing successful login contract and stores the session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: 'fresh-token', user }),
    }))
    const { authService } = await import('@/services/auth.service')
    const { authState } = await import('@/stores/auth.store')

    await authService.login('owner', 'correct-password')

    expect(fetch).toHaveBeenCalledOnce()
    expect(authState.token).toBe('fresh-token')
    expect(authState.user?.display_name).toBe('Farm Owner')
  })

  test('keeps incorrect credentials distinguishable from connectivity failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials.' }),
    }))
    const { authService } = await import('@/services/auth.service')

    await expect(authService.login('owner', 'wrong-password')).rejects.toMatchObject({ status: 401 })
  })

  test('reports an unreachable backend as a connection failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')))
    const { authService } = await import('@/services/auth.service')

    await expect(authService.login('owner', 'password')).rejects.toMatchObject({
      status: 0,
      message: 'Cannot connect to GoHMoTech server.',
    })
  })
})

describe('camera and automation service contracts', () => {
  afterEach(() => {
    window.sessionStorage.clear()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  test('requests the existing camera ticket and preserves the configured stream profile', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ticket: 'camera-ticket' }) })
    vi.stubGlobal('fetch', request)
    const { cameraService } = await import('@/services/camera.service')

    const stream = await cameraService.streamUrl(7)

    expect(request).toHaveBeenCalledWith('/api/mobile/auth/realtime-ticket/', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(String((request.mock.calls[0][1] as RequestInit).body))).toEqual({ purpose: 'camera', camera_id: 7 })
    expect(stream).toContain('/api/mobile/cameras/7/stream/?quality=55&fps=8&width=640&ticket=camera-ticket')
  })

  test('sends actuator commands to the existing control endpoint without changing the payload', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ message: 'Accepted', current_state: 'open', result: 'ok', device_online: true }) })
    vi.stubGlobal('fetch', request)
    const { automationService } = await import('@/services/automation.service')

    const response = await automationService.control(3, 'open')

    expect(request).toHaveBeenCalledWith('/iot/api/actuators/3/control/', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(String((request.mock.calls[0][1] as RequestInit).body))).toEqual({ state: 'open' })
    expect(response.current_state).toBe('open')
  })
})

describe('goat mobile API contract', () => {
  afterEach(() => {
    window.sessionStorage.clear()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  test('preserves encoded inventory search and goat-detail endpoints', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ count: 0, next: null, previous: null, results: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ goat_id: 'GOAT 01', images: [], weight_history: [] }) })
    vi.stubGlobal('fetch', request)
    const { goatService } = await import('@/services/goat.service')

    await goatService.list('alpine goat')
    await goatService.detail('GOAT 01')

    expect(request.mock.calls[0][0]).toBe('/api/mobile/goats/?page=1&search=alpine%20goat')
    expect(request.mock.calls[1][0]).toBe('/api/mobile/goats/GOAT%2001/')
  })
})

describe('monitoring API contracts', () => {
  afterEach(() => {
    window.sessionStorage.clear()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  test('keeps tracking, detection and notification reads on their existing endpoints', async () => {
    const page = { count: 0, next: null, previous: null, results: [] }
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ summary: {}, goats: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page })
    vi.stubGlobal('fetch', request)
    const { trackingService } = await import('@/services/tracking.service')
    const { securityService } = await import('@/services/security.service')
    const { alertService } = await import('@/services/alert.service')

    await trackingService.get()
    await securityService.list()
    await alertService.list()

    expect(request.mock.calls[0][0]).toBe('/api/mobile/tracking/')
    expect(request.mock.calls[1][0]).toBe('/security/api/detections/?page=1&ordering=-detected_at')
    expect(request.mock.calls[2][0]).toBe('/security/api/notifications/?page=1&ordering=-created_at')
  })

  test('marks a notification read through the existing POST action', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 19, is_read: true }) })
    vi.stubGlobal('fetch', request)
    const { alertService } = await import('@/services/alert.service')

    await alertService.markRead(19)

    expect(request).toHaveBeenCalledWith('/security/api/notifications/19/mark_read/', expect.objectContaining({ method: 'POST' }))
  })
})
