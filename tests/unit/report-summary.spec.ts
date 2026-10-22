import { afterEach, describe, expect, test, vi } from 'vitest';

describe('report summary mobile contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('requests the authoritative owner summary for a bounded window', async () => {
    const payload = {
      generated_at: '2026-10-22T12:00:00+08:00',
      hours: 168,
      herd: { total: 2, active: 2, gender: [], health: [] },
      security: {
        total: 3,
        reviewed: 2,
        unreviewed: 1,
        confirmed: 0,
        dismissed: 2,
        average_confidence: 81.5,
      },
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });
    vi.stubGlobal('fetch', request);
    const { reportSummaryService } = await import(
      '@/services/report-summary.service'
    );

    await expect(reportSummaryService.get(168)).resolves.toEqual(payload);
    expect(request.mock.calls[0][0]).toBe(
      '/api/mobile/report-summary/?hours=168',
    );
  });
});