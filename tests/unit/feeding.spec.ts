import { afterEach, describe, expect, test, vi } from 'vitest';

const jsonResponse = (payload: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

describe('feeding service contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('loads config, schedules, levels, and logs from production feeding APIs', async () => {
    const request = vi.fn((url: string) => {
      if (url.endsWith('/config/status/')) return Promise.resolve(jsonResponse({ id: 1, is_enabled: true }));
      if (url.endsWith('/schedules/')) return Promise.resolve(jsonResponse({ count: 1, next: null, previous: null, results: [{ id: 4 }] }));
      if (url.endsWith('/levels/')) return Promise.resolve(jsonResponse([{ id: 2, feeder: 8 }]));
      return Promise.resolve(jsonResponse({ count: 1, next: null, previous: null, results: [{ id: 9, status: 'success' }] }));
    });
    vi.stubGlobal('fetch', request);
    const { feedingService } = await import('@/services/feeding.service');

    const result = await feedingService.snapshot();

    expect(result.config.is_enabled).toBe(true);
    expect(result.schedules).toHaveLength(1);
    expect(result.levels[0].feeder).toBe(8);
    expect(result.logs[0].status).toBe('success');
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      '/feeding/api/config/status/',
      '/feeding/api/schedules/',
      '/feeding/api/levels/',
      '/feeding/api/logs/?page_size=25',
    ]);
  });

  test('sends manual feed amount and feeder identity as JSON', async () => {
    const request = vi.fn().mockResolvedValue(jsonResponse({ id: 12, status: 'pending', device_online: true }));
    vi.stubGlobal('fetch', request);
    const { feedingService } = await import('@/services/feeding.service');

    await feedingService.manualFeed(8, 650);

    expect(request).toHaveBeenCalledWith('/feeding/api/logs/manual_feed/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ feeder_id: 8, amount: 650 }),
    }));
  });
});