import { afterEach, describe, expect, test, vi } from 'vitest';

const response = (payload: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

describe('owner notification center contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('loads the merged owner inbox and unread summary', async () => {
    const facets = { all: 9, alerts: 4, messages: 2, transactions: 2, marketplace: 5 };
    const request = vi.fn()
      .mockResolvedValueOnce(response({ count: 9, next: null, previous: null, results: [], unread_count: 3, facets }))
      .mockResolvedValueOnce(response({ unread_count: 3, farm_unread_count: 2, marketplace_unread_count: 1, message_unread_count: 1, facets }));
    vi.stubGlobal('fetch', request);
    const { notificationService } = await import('@/services/notification.service');

    const list = await notificationService.list('all', 2);
    const summary = await notificationService.summary();

    expect(list.facets.messages).toBe(2);
    expect(summary.facets.marketplace).toBe(5);

    expect(request.mock.calls[0][0]).toBe('/api/mobile/notifications/?filter=all&page=2');
    expect(request.mock.calls[1][0]).toBe('/api/mobile/notifications/summary/');
  });

  test('marks an owned notification and the full owner inbox as read', async () => {
    const request = vi.fn().mockResolvedValue(response({ is_read: true }));
    vi.stubGlobal('fetch', request);
    const { notificationService } = await import('@/services/notification.service');
    const item = {
      key: 'marketplace:7',
      source_kind: 'marketplace' as const,
      source_id: 7,
      category: 'messages' as const,
      notification_type: 'message',
      type_display: 'Message',
      title: 'Buyer replied',
      message: 'Is Saturday available?',
      source_label: 'Marketplace',
      severity: 'information' as const,
      is_read: false,
      is_resolved: false,
      created_at: '2026-10-22T01:00:00Z',
      target: '/app/marketplace/conversations/4',
    };

    await notificationService.markRead(item);
    await notificationService.markAllRead();

    expect(request.mock.calls[0]).toEqual(['/api/mobile/notifications/marketplace/7/', expect.objectContaining({ method: 'POST' })]);
    expect(request.mock.calls[1]).toEqual(['/api/mobile/notifications/read-all/', expect.objectContaining({ method: 'POST' })]);
  });
});
