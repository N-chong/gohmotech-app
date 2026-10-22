import { afterEach, describe, expect, test, vi } from 'vitest';

describe('live detection mobile contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('uses the token-authenticated mobile adapter for status and viewer demand', async () => {
    const status = {
      mode: 'Live Viewing', running: true, viewers: 1, manual_enabled: false,
      next_scheduled_at: '2026-10-17T11:00:00+08:00', latest: null,
      camera: { id: 1, camera_id: 'CAM-1', name: 'Goat House', location: 'Pen', detection_interval_seconds: 5 },
    };
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => status })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => status });
    vi.stubGlobal('fetch', request);
    const { liveDetectionService } = await import('@/services/live-detection.service');

    await liveDetectionService.status();
    await liveDetectionService.view('11111111-1111-4111-8111-111111111111');

    expect(request.mock.calls[0][0]).toBe('/api/mobile/live-detection/');
    expect(request.mock.calls[1][0]).toBe('/api/mobile/live-detection/');
    expect(JSON.parse(String((request.mock.calls[1][1] as RequestInit).body))).toEqual({
      action: 'view',
      token: '11111111-1111-4111-8111-111111111111',
    });
  });

  test('ties manual detection controls to the same viewer token', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ mode: 'Manual', running: true, manual_enabled: true }),
    });
    vi.stubGlobal('fetch', request);
    const { liveDetectionService } = await import('@/services/live-detection.service');
    const token = '22222222-2222-4222-8222-222222222222';

    await liveDetectionService.manualStart(token);
    await liveDetectionService.manualStop(token);

    expect(JSON.parse(String((request.mock.calls[0][1] as RequestInit).body))).toEqual({
      action: 'manual_start', token,
    });
    expect(JSON.parse(String((request.mock.calls[1][1] as RequestInit).body))).toEqual({
      action: 'manual_stop', token,
    });
  });
});
