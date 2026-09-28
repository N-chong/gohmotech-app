import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ApiPage } from '@/types/api';
import { usePaginatedResource } from '@/composables/usePaginatedResource';

interface Item { id: number; label: string }

function page(results: Item[], next: string | null, count = results.length, previous: string | null = null): ApiPage<Item> {
  return { count, next, previous, results };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

function createLoader(fetchPage: (pageNumber: number, signal: AbortSignal) => Promise<ApiPage<Item>>) {
  return usePaginatedResource<Item>({
    fetchPage,
    getKey: (item) => item.id,
    initialErrorMessage: 'Initial page failed.',
    moreErrorMessage: 'Next page failed.',
    now: () => '2026-09-28T00:00:00Z',
  });
}

afterEach(() => vi.restoreAllMocks());

describe('paginated resource loading', () => {
  test('stores the DRF pagination response and removes duplicate records on the first page', async () => {
    const loader = createLoader(vi.fn().mockResolvedValue(page(
      [{ id: 1, label: 'One' }, { id: 1, label: 'Updated one' }],
      '/api/items/?page=2',
      4,
      '/api/items/?page=0',
    )));
    loader.activate();

    await expect(loader.reset()).resolves.toBe(true);

    expect(loader.items.value).toEqual([{ id: 1, label: 'Updated one' }]);
    expect(loader.count.value).toBe(4);
    expect(loader.next.value).toBe('/api/items/?page=2');
    expect(loader.previous.value).toBe('/api/items/?page=0');
    expect(loader.hasMore.value).toBe(true);
    expect(loader.lastUpdatedAt.value).toBe('2026-09-28T00:00:00Z');
  });

  test('loads the next page, appends only new records, and stops when next is null', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page([{ id: 1, label: 'One' }, { id: 2, label: 'Two' }], 'https://gohmotech.site/api/items/?page=2', 3))
      .mockResolvedValueOnce(page([{ id: 2, label: 'Duplicate' }, { id: 3, label: 'Three' }], null, 3, '/api/items/?page=1'));
    const loader = createLoader(fetchPage);
    loader.activate();
    await loader.reset();

    await expect(loader.loadMore()).resolves.toBe(true);
    await expect(loader.loadMore()).resolves.toBe(false);

    expect(fetchPage.mock.calls.map(([pageNumber]) => pageNumber)).toEqual([1, 2]);
    expect(loader.items.value.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(loader.hasMore.value).toBe(false);
  });

  test('shares a concurrent next-page request instead of fetching it twice', async () => {
    const second = deferred<ApiPage<Item>>();
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page([{ id: 1, label: 'One' }], '/api/items/?page=2', 2))
      .mockImplementationOnce(() => second.promise);
    const loader = createLoader(fetchPage);
    loader.activate();
    await loader.reset();

    const firstRequest = loader.loadMore();
    const duplicateRequest = loader.loadMore();
    expect(fetchPage).toHaveBeenCalledTimes(2);
    second.resolve(page([{ id: 2, label: 'Two' }], null, 2));

    await expect(Promise.all([firstRequest, duplicateRequest])).resolves.toEqual([true, true]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  test('honors an infinite-scroll request that arrives while page one is still settling', async () => {
    const first = deferred<ApiPage<Item>>();
    const fetchPage = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce(page([{ id: 2, label: 'Two' }], null, 2));
    const loader = createLoader(fetchPage);
    loader.activate();
    const initial = loader.reset();
    const nextPage = loader.loadMore();
    first.resolve(page([{ id: 1, label: 'One' }], '/api/items/?page=2', 2));

    await expect(Promise.all([initial, nextPage])).resolves.toEqual([true, true]);
    expect(fetchPage.mock.calls.map(([pageNumber]) => pageNumber)).toEqual([1, 2]);
    expect(loader.items.value.map((item) => item.id)).toEqual([1, 2]);
  });

  test('resets to page one after criteria change and replaces the previous criteria results', async () => {
    let query = 'all';
    const fetchPage = vi.fn(async () => query === 'all'
      ? page([{ id: 1, label: 'All' }], '/api/items/?page=2', 2)
      : page([{ id: 8, label: 'Filtered' }], null, 1));
    const loader = createLoader(fetchPage);
    loader.activate();
    await loader.reset();
    query = 'missing';

    await loader.reset();

    expect(fetchPage.mock.calls.map(([pageNumber]) => pageNumber)).toEqual([1, 1]);
    expect(loader.items.value).toEqual([{ id: 8, label: 'Filtered' }]);
    expect(loader.count.value).toBe(1);
  });

  test('preserves existing results when a later page fails and can retry that page', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page([{ id: 1, label: 'One' }], '/api/items/?page=2', 2))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(page([{ id: 2, label: 'Two' }], null, 2));
    const loader = createLoader(fetchPage);
    loader.activate();
    await loader.reset();

    await expect(loader.loadMore()).resolves.toBe(false);
    expect(loader.items.value).toEqual([{ id: 1, label: 'One' }]);
    expect(loader.loadMoreError.value).toBe('Next page failed.');

    await expect(loader.loadMore()).resolves.toBe(true);
    expect(loader.items.value.map((item) => item.id)).toEqual([1, 2]);
    expect(loader.loadMoreError.value).toBe('');
  });

  test('preserves loaded data when a refresh fails so the UI can mark it stale', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page([{ id: 1, label: 'One' }], null, 1))
      .mockRejectedValueOnce(new Error('offline'));
    const loader = createLoader(fetchPage);
    loader.activate();
    await loader.reset();

    await expect(loader.refresh()).resolves.toBe(false);

    expect(loader.items.value).toEqual([{ id: 1, label: 'One' }]);
    expect(loader.error.value).toBe('Initial page failed.');
    expect(loader.lastUpdatedAt.value).toBe('2026-09-28T00:00:00Z');
  });

  test('aborts and ignores a late page response after an Ionic page leaves', async () => {
    const second = deferred<ApiPage<Item>>();
    let secondSignal: AbortSignal | undefined;
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page([{ id: 1, label: 'One' }], '/api/items/?page=2', 2))
      .mockImplementationOnce((_pageNumber: number, signal: AbortSignal) => {
        secondSignal = signal;
        return second.promise;
      });
    const loader = createLoader(fetchPage);
    loader.activate();
    await loader.reset();
    const request = loader.loadMore();

    loader.deactivate();
    second.resolve(page([{ id: 2, label: 'Late' }], null, 2));

    await expect(request).resolves.toBe(false);
    expect(secondSignal?.aborted).toBe(true);
    expect(loader.items.value).toEqual([{ id: 1, label: 'One' }]);
    expect(loader.loadingMore.value).toBe(false);
  });
});
