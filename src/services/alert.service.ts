import { apiRequest } from './api';
import type { ApiPage, Notification } from '@/types/api';
export const alertService = {
  list: (page = 1, signal?: AbortSignal) => apiRequest<ApiPage<Notification>>(`/security/api/notifications/?page=${page}&ordering=-created_at`, signal ? { signal } : {}),
  markRead: (id: number, signal?: AbortSignal) => apiRequest<Notification>(`/security/api/notifications/${id}/mark_read/`, { method: 'POST', signal }),
};
