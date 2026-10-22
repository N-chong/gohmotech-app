import { afterEach, describe, expect, test, vi } from 'vitest';

describe('authoritative paginated metadata contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('requests inventory filters from the server and preserves returned facets', async () => {
    const payload = {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 2, goat_id: 'GOAT-002' }],
      facets: { all: 8, male: 3, female: 5, active: 7, missing: 1, detected: 6, attention: 2 },
    };
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload });
    vi.stubGlobal('fetch', request);
    const { goatService } = await import('@/services/goat.service');

    await expect(goatService.list('Max', 'male', 1)).resolves.toEqual(payload);
    expect(request.mock.calls[0][0]).toBe('/api/mobile/goats/?page=1&search=Max&gender=male');
  });

  test('preserves server-wide security KPIs beside paginated events', async () => {
    const payload = {
      count: 12,
      next: '/security/api/detections/?page=2',
      previous: null,
      results: [],
      summary: { high_confidence: 9, reviewed: 7, unreviewed: 5 },
    };
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload });
    vi.stubGlobal('fetch', request);
    const { securityService } = await import('@/services/security.service');

    await expect(securityService.list()).resolves.toEqual(payload);
    expect(request.mock.calls[0][0]).toBe('/security/api/detections/?page=1&ordering=-detected_at');
  });
});