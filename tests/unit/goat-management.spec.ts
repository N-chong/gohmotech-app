import { afterEach, describe, expect, test, vi } from 'vitest';

const input = {
  goat_id: 'GOAT 01',
  name: 'May',
  tag_number: 'RFID-01',
  breed: 'native',
  gender: 'female',
  date_of_birth: '2025-03-01',
  weight_kg: '24.5',
  color_markings: 'White blaze',
  health_status: 'healthy',
  health_notes: '',
  vaccination_status: 'vaccinated',
  vaccine_name: 'CDT',
  vaccination_date: '2026-09-01',
  next_due_date: '2027-09-01',
  notes: 'Owner record',
};

describe('owner goat management mobile contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('loads server-defined livestock form choices', async () => {
    const payload = { breeds: [], genders: [], health_statuses: [], vaccination_statuses: [] };
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload });
    vi.stubGlobal('fetch', request);
    const { goatService } = await import('@/services/goat.service');

    await expect(goatService.options()).resolves.toEqual(payload);
    expect(request.mock.calls[0][0]).toBe('/api/mobile/goats/options/');
  });

  test('uploads and manages standardized photos using encoded goat identifiers', async () => {
    const saved = { ...input, images: [], weight_history: [] };
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => saved })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => saved });
    vi.stubGlobal('fetch', request);
    const { goatService } = await import('@/services/goat.service');
    const file = new File(['image'], 'front.jpg', { type: 'image/jpeg' });

    await goatService.uploadPhoto('GOAT 01', 'front', file);
    await goatService.photoAction('GOAT 01', 17, 'delete');

    expect(request.mock.calls[0][0]).toBe('/api/mobile/goats/GOAT%2001/images/');
    expect(request.mock.calls[0][1]?.method).toBe('POST');
    const form = request.mock.calls[0][1]?.body as FormData;
    expect(form.get('angle')).toBe('front');
    expect(form.get('image')).toBe(file);
    expect(request.mock.calls[1][0]).toBe('/api/mobile/goats/GOAT%2001/images/17/');
    expect(request.mock.calls[1][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ action: 'delete' }) });
  });
  test('creates and updates owner livestock records with encoded identifiers', async () => {
    const saved = { ...input, images: [], weight_history: [] };
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => saved })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => saved });
    vi.stubGlobal('fetch', request);
    const { goatService } = await import('@/services/goat.service');

    await goatService.create(input);
    await goatService.update('GOAT 01', input);

    expect(request.mock.calls[0][0]).toBe('/api/mobile/goats/');
    expect(request.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(input) });
    expect(request.mock.calls[1][0]).toBe('/api/mobile/goats/GOAT%2001/');
    expect(request.mock.calls[1][1]).toMatchObject({ method: 'PUT', body: JSON.stringify(input) });
  });
});