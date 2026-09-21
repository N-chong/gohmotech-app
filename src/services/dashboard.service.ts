import { apiRequest } from './api';
import type { DashboardData } from '@/types/api';
export const dashboardService = { get: (signal?: AbortSignal) => apiRequest<DashboardData>('/api/mobile/dashboard/', { signal }) };
