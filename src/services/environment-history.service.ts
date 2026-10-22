import { apiRequest } from './api';

export type EnvironmentHistoryHours = 24 | 168;
export type EnvironmentMetricKey = 'temperature' | 'humidity' | 'light_level_percentage';

export interface EnvironmentHistoryPoint {
  id: number;
  unit: string;
  period_start: string;
  period_end: string;
  average: number;
  minimum: number;
  maximum: number;
  sample_count: number;
}

export interface EnvironmentHistory {
  generated_at: string;
  hours: EnvironmentHistoryHours;
  device: {
    id: number;
    device_id: string;
    name: string;
  } | null;
  series: Record<EnvironmentMetricKey, EnvironmentHistoryPoint[]>;
}

export const environmentHistoryService = {
  get: (hours: EnvironmentHistoryHours, signal?: AbortSignal) =>
    apiRequest<EnvironmentHistory>(
      `/api/mobile/environment-history/?hours=${hours}`,
      signal ? { signal } : {},
    ),
};
