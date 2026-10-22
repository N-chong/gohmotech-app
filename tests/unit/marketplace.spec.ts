import { afterEach, describe, expect, test, vi } from 'vitest';

const response = (payload: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

describe('marketplace mobile contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('encodes catalog search, availability, sorting, and page criteria', async () => {
    const request = vi.fn().mockResolvedValue(response({ count: 0, next: null, previous: null, results: [] }));
    vi.stubGlobal('fetch', request);
    const { marketplaceService } = await import('@/services/marketplace.service');

    await marketplaceService.list({ search: 'Boer Farm', availability: 'available', sort: 'price_low' }, 2);

    expect(request.mock.calls[0][0]).toBe('/api/mobile/marketplace/listings/?page=2&search=Boer+Farm&availability=available&sort=price_low');
  });

  test('uses protected management endpoints for drafts, edits, and publication', async () => {
    const request = vi.fn().mockResolvedValue(response({ id: 7, status: 'draft' }));
    vi.stubGlobal('fetch', request);
    const { marketplaceService } = await import('@/services/marketplace.service');
    const payload = { goat_id: 3, price: '12500', sales_description: 'Healthy farm goat' };

    await marketplaceService.createListing(payload);
    await marketplaceService.updateListing(7, payload);
    await marketplaceService.publication(7, 'publish');

    expect(request.mock.calls[0]).toEqual(['/api/mobile/marketplace/manage/', expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) })]);
    expect(request.mock.calls[1]).toEqual(['/api/mobile/marketplace/manage/7/', expect.objectContaining({ method: 'PATCH', body: JSON.stringify(payload) })]);
    expect(request.mock.calls[2]).toEqual(['/api/mobile/marketplace/manage/7/', expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'publish' }) })]);
  });
  test('uploads photos with multipart data and uses protected photo actions', async () => {
    const request = vi.fn().mockResolvedValue(response({ id: 7, images: [] }));
    vi.stubGlobal('fetch', request);
    const { marketplaceService } = await import('@/services/marketplace.service');
    const photo = new File(['image'], 'goat.jpg', { type: 'image/jpeg' });

    await marketplaceService.uploadPhotos(7, [photo]);
    await marketplaceService.photoAction(7, 12, 'set_primary');
    await marketplaceService.photoAction(7, 12, 'delete');

    expect(request.mock.calls[0][0]).toBe('/api/mobile/marketplace/manage/7/images/');
    const upload = request.mock.calls[0][1];
    expect(upload.method).toBe('POST');
    expect(upload.body).toBeInstanceOf(FormData);
    expect((upload.body as FormData).getAll('photos')).toHaveLength(1);
    expect(request.mock.calls[1]).toEqual(['/api/mobile/marketplace/manage/7/images/12/', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ action: 'set_primary' }),
    })]);
    expect(request.mock.calls[2][1]).toEqual(expect.objectContaining({
      method: 'POST', body: JSON.stringify({ action: 'delete' }),
    }));
  });
  test('sends a seller image reply as participant-protected multipart data', async () => {
    const request = vi.fn().mockResolvedValue(response({ id: 15, body: '', image_url: '/private/image/' }, 201));
    vi.stubGlobal('fetch', request);
    const { marketplaceService } = await import('@/services/marketplace.service');
    const image = new File(['image'], 'inspection.jpg', { type: 'image/jpeg' });

    await marketplaceService.sendSellerMessage(4, '', image);

    expect(request.mock.calls[0][0]).toBe('/api/mobile/marketplace/seller/conversations/4/');
    const options = request.mock.calls[0][1];
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get('action')).toBe('message');
    expect((options.body as FormData).get('body')).toBe('');
    expect((options.body as FormData).get('image_attachment')).toBe(image);
  });
  test('uses protected seller conversation and reservation endpoints', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(response({ unread_count: 0, conversations: [] }))
      .mockResolvedValueOnce(response({ id: 4, messages: [] }))
      .mockResolvedValueOnce(response({ id: 8, status: 'accepted' }));
    vi.stubGlobal('fetch', request);
    const { marketplaceService } = await import('@/services/marketplace.service');

    await marketplaceService.sellerConversations();
    await marketplaceService.sendSellerMessage(4, 'Pickup is available this weekend.');
    await marketplaceService.reservationAction(8, 'accept', { pickup_location: 'Main farm gate' });

    expect(request.mock.calls[0][0]).toBe('/api/mobile/marketplace/seller/conversations/');
    expect(request.mock.calls[1]).toEqual(['/api/mobile/marketplace/seller/conversations/4/', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ action: 'message', body: 'Pickup is available this weekend.' }),
    })]);
    expect(request.mock.calls[2]).toEqual(['/api/mobile/marketplace/seller/reservations/8/', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ action: 'accept', pickup_location: 'Main farm gate' }),
    })]);
  });

});
