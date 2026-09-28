import { apiRequest } from './api';
import type { ApiPage, Goat, GoatDetail } from '@/types/api';
export const goatService = {
  list: (search = '', page = 1, signal?: AbortSignal) => apiRequest<ApiPage<Goat>>(`/api/mobile/goats/?page=${page}&search=${encodeURIComponent(search)}`, signal ? { signal } : {}),
  detail: (goatId: string) => apiRequest<GoatDetail>(`/api/mobile/goats/${encodeURIComponent(goatId)}/`),
};
