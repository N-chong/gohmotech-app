import { apiRequest } from './api';
import type { ApiPage } from '@/types/api';

export type UnifiedNotificationFilter = 'all' | 'alerts' | 'messages' | 'transactions' | 'marketplace';

export interface UnifiedNotification {
  key: string;
  source_kind: 'farm' | 'marketplace';
  source_id: number;
  category: 'alerts' | 'messages' | 'transactions' | 'marketplace';
  notification_type: string;
  type_display: string;
  title: string;
  message: string;
  source_label: string;
  severity: 'critical' | 'warning' | 'information';
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
  target: string;
}

export interface NotificationFacets {
  all: number;
  alerts: number;
  messages: number;
  transactions: number;
  marketplace: number;
}

export interface NotificationSummary {
  unread_count: number;
  farm_unread_count: number;
  marketplace_unread_count: number;
  message_unread_count: number;
  facets: NotificationFacets;
}

export interface UnifiedNotificationPage extends ApiPage<UnifiedNotification>, NotificationSummary {}

export const notificationService = {
  list(filter: UnifiedNotificationFilter, page = 1, signal?: AbortSignal) {
    const query = new URLSearchParams({ filter, page: String(page) });
    return apiRequest<UnifiedNotificationPage>('/api/mobile/notifications/?' + query.toString(), signal ? { signal } : {});
  },
  summary(signal?: AbortSignal) {
    return apiRequest<NotificationSummary>('/api/mobile/notifications/summary/', signal ? { signal } : {});
  },
  markRead(item: UnifiedNotification) {
    return apiRequest<{ key: string; is_read: boolean }>(
      '/api/mobile/notifications/' + item.source_kind + '/' + item.source_id + '/',
      { method: 'POST', body: '{}' },
    );
  },
  markAllRead() {
    return apiRequest<{ marked_read: number }>('/api/mobile/notifications/read-all/', { method: 'POST', body: '{}' });
  },
};
