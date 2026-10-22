import { apiRequest } from './api';
import type { ApiPage, Goat, GoatDetail } from '@/types/api';

export interface GoatFacets {
  all: number;
  male: number;
  female: number;
  active: number;
  missing: number;
  detected: number;
  attention: number;
}

export interface GoatPage extends ApiPage<Goat> {
  facets: GoatFacets;
}

export interface GoatChoice { value: string; label: string }
export interface GoatImageAngle extends GoatChoice { guidance: string; optional: boolean }
export interface GoatOptions {
  breeds: GoatChoice[];
  genders: GoatChoice[];
  health_statuses: GoatChoice[];
  vaccination_statuses: GoatChoice[];
  image_angles: GoatImageAngle[];
}
export interface GoatRecordInput {
  goat_id: string;
  name: string;
  tag_number: string;
  breed: string;
  gender: string;
  date_of_birth: string;
  weight_kg?: string;
  color_markings: string;
  health_status: string;
  health_notes: string;
  vaccination_status: string;
  vaccine_name: string;
  vaccination_date: string;
  next_due_date: string;
  notes: string;
}

export const goatService = {
  list: (search = '', filter = 'all', page = 1, signal?: AbortSignal) => {
    let query = `page=${page}&search=${encodeURIComponent(search)}`;
    if (filter === 'male' || filter === 'female') query += `&gender=${filter}`;
    if (filter === 'active' || filter === 'missing') query += `&status=${filter}`;
    return apiRequest<GoatPage>(
      `/api/mobile/goats/?${query}`,
      signal ? { signal } : {},
    );
  },
  options: () => apiRequest<GoatOptions>('/api/mobile/goats/options/'),
  detail: (goatId: string) => apiRequest<GoatDetail>(`/api/mobile/goats/${encodeURIComponent(goatId)}/`),
  uploadPhoto(goatId: string, angle: string, file: File) {
    const body = new FormData();
    body.append('angle', angle);
    body.append('image', file);
    return apiRequest<GoatDetail>('/api/mobile/goats/' + encodeURIComponent(goatId) + '/images/', {
      method: 'POST', body,
    });
  },
  photoAction(goatId: string, imageId: number, action: 'set_primary' | 'delete') {
    return apiRequest<GoatDetail>('/api/mobile/goats/' + encodeURIComponent(goatId) + '/images/' + imageId + '/', {
      method: 'POST', body: JSON.stringify({ action }),
    });
  },
  create: (payload: GoatRecordInput) => apiRequest<GoatDetail>('/api/mobile/goats/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (goatId: string, payload: GoatRecordInput) => apiRequest<GoatDetail>(
    `/api/mobile/goats/${encodeURIComponent(goatId)}/`,
    { method: 'PUT', body: JSON.stringify(payload) },
  ),
};