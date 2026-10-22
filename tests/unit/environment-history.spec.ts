import { afterEach, describe, expect, test, vi } from 'vitest';

describe('environment history mobile contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('requests a bounded history range from the mobile adapter', async () => {
    const payload = {
      generated_at: '2026-10-17T12:00:00+08:00',
      hours: 168,
      device: { id: 1, device_id: 'ENV-1', name: 'Environment node' },
      series: {
        temperature: [],
        humidity: [],
        light_level_percentage: [],
      },
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });
    vi.stubGlobal('fetch', request);
    const { environmentHistoryService } = await import(
      '@/services/environment-history.service'
    );

    await expect(environmentHistoryService.get(168)).resolves.toEqual(payload);
    expect(request.mock.calls[0][0]).toBe(
      '/api/mobile/environment-history/?hours=168',
    );
  });
});
