import { apiRequest } from './api';
import type { ApiPage } from '@/types/api';

export interface FeedingConfig {
  id: number;
  is_enabled: boolean;
  updated_at: string;
  updated_by: string;
}

export interface FeedSchedule {
  id: number;
  feeder: number;
  feeder_name: string;
  schedule_time: string;
  amount_grams: number;
  is_active: boolean;
  days_of_week: number[];
  created_at: string;
  updated_at: string;
}

export interface FeedLevel {
  id: number;
  feeder: number;
  feeder_name: string;
  current_level_grams: number;
  capacity_grams: number;
  low_level_threshold: number;
  percentage_full: number;
  is_low: boolean;
  distance_cm: number | null;
  percentage: number | null;
  last_refilled_at: string | null;
  updated_at: string;
}

export interface FeedLog {
  id: number;
  feeder: number;
  feeder_name: string;
  amount_dispensed: number;
  feeding_mode: string;
  trigger_reason: string;
  scheduled: boolean;
  status: 'pending' | 'success' | 'failed' | 'partial';
  timestamp: string;
}

export interface ScheduleInput {
  feeder: number;
  schedule_time: string;
  amount_grams: number;
  days_of_week: number[];
  is_active: boolean;
}

function results<T>(value: ApiPage<T> | T[]): T[] {
  return Array.isArray(value) ? value : value.results;
}

export const feedingService = {
  async snapshot(signal?: AbortSignal) {
    const options = signal ? { signal } : {};
    const [config, scheduleResponse, levelResponse, logResponse] = await Promise.all([
      apiRequest<FeedingConfig>('/feeding/api/config/status/', options),
      apiRequest<ApiPage<FeedSchedule> | FeedSchedule[]>('/feeding/api/schedules/', options),
      apiRequest<ApiPage<FeedLevel> | FeedLevel[]>('/feeding/api/levels/', options),
      apiRequest<ApiPage<FeedLog> | FeedLog[]>('/feeding/api/logs/?page_size=25', options),
    ]);
    return {
      config,
      schedules: results(scheduleResponse),
      levels: results(levelResponse),
      logs: results(logResponse),
    };
  },
  toggleAutomation() {
    return apiRequest<{ status: string; is_enabled: boolean; message: string }>('/feeding/api/config/toggle/', { method: 'POST' });
  },
  createSchedule(payload: ScheduleInput) {
    return apiRequest<FeedSchedule>('/feeding/api/schedules/', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateSchedule(id: number, payload: ScheduleInput) {
    return apiRequest<FeedSchedule>(`/feeding/api/schedules/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  toggleSchedule(id: number) {
    return apiRequest<FeedSchedule>(`/feeding/api/schedules/${id}/toggle_active/`, { method: 'POST' });
  },
  removeSchedule(id: number) {
    return apiRequest<void>(`/feeding/api/schedules/${id}/`, { method: 'DELETE' });
  },
  refill(levelId: number, amount: number) {
    return apiRequest<{ status: string; current_level: number; percentage_full: number }>(`/feeding/api/levels/${levelId}/refill/`, { method: 'POST', body: JSON.stringify({ amount }) });
  },
  manualFeed(feederId: number, amount: number) {
    return apiRequest<FeedLog & { device_online: boolean; result: string; confirmation: string }>('/feeding/api/logs/manual_feed/', { method: 'POST', body: JSON.stringify({ feeder_id: feederId, amount }) });
  },
};