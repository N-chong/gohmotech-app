import { apiRequest } from './api';

export interface LiveDetectionLatest {
  id: number;
  detection_count: number;
  confidence: number;
  detections: Array<Record<string, unknown>>;
  persons: { count?: number; detections?: Array<Record<string, unknown>> };
  frame_width: number;
  frame_height: number;
  timestamp: string;
}

export interface LiveDetectionStatus {
  mode: string;
  running: boolean;
  viewers: number;
  manual_enabled: boolean;
  next_scheduled_at: string;
  latest: LiveDetectionLatest | null;
  camera: {
    id: number;
    camera_id: string;
    name: string;
    location: string;
    detection_interval_seconds: number;
  };
}

export function createDetectionViewerToken(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (item) => item.toString(16).padStart(2, '0')).join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function post(action: string, token: string, signal?: AbortSignal) {
  return apiRequest<LiveDetectionStatus>('/api/mobile/live-detection/', {
    method: 'POST',
    body: JSON.stringify({ action, token }),
    signal,
  });
}

export const liveDetectionService = {
  status: (signal?: AbortSignal) => apiRequest<LiveDetectionStatus>('/api/mobile/live-detection/', signal ? { signal } : {}),
  view: (token: string, signal?: AbortSignal) => post('view', token, signal),
  leave: (token: string) => post('leave', token),
  manualStart: (token: string, signal?: AbortSignal) => post('manual_start', token, signal),
  manualStop: (token: string, signal?: AbortSignal) => post('manual_stop', token, signal),
};
