import { computed, ref, type Ref } from 'vue';
import type { ApiPage } from '@/types/api';

interface PaginatedResourceOptions<T> {
  fetchPage: (page: number, signal: AbortSignal) => Promise<ApiPage<T>>;
  getKey: (item: T) => string | number;
  initialErrorMessage: string;
  moreErrorMessage: string;
  now?: () => string;
}

function pageFromNext(next: string | null, currentPage: number): number | null {
  if (!next) return null;
  try {
    const page = Number(new URL(next, window.location.origin).searchParams.get('page'));
    if (Number.isInteger(page) && page > 0) return page;
  } catch { /* fall back to the next sequential page */ }
  return currentPage + 1;
}

export function usePaginatedResource<T>(options: PaginatedResourceOptions<T>) {
  const items = ref<T[]>([]) as Ref<T[]>;
  const count = ref(0);
  const next = ref<string | null>(null);
  const previous = ref<string | null>(null);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref('');
  const loadMoreError = ref('');
  const lastUpdatedAt = ref<string | null>(null);
  const hasLoaded = ref(false);

  let active = false;
  let currentPage = 0;
  let generation = 0;
  let controller: AbortController | undefined;
  let requestPromise: Promise<boolean> | undefined;
  let requestKind: 'reset' | 'more' | undefined;

  const hasMore = computed(() => next.value !== null);

  function abortCurrent() {
    generation += 1;
    controller?.abort();
    controller = undefined;
    requestPromise = undefined;
    requestKind = undefined;
    loading.value = false;
    loadingMore.value = false;
  }

  function activate() {
    active = true;
  }

  function deactivate() {
    active = false;
    abortCurrent();
  }

  async function reset(preserveExisting = false): Promise<boolean> {
    if (!active) return false;
    abortCurrent();
    const requestGeneration = generation;
    const requestController = new AbortController();
    controller = requestController;
    loading.value = true;
    error.value = '';
    loadMoreError.value = '';
    if (!preserveExisting) {
      items.value = [];
      count.value = 0;
      next.value = null;
      previous.value = null;
      currentPage = 0;
      hasLoaded.value = false;
    }

    const pending = (async () => {
      try {
        const page = await options.fetchPage(1, requestController.signal);
        if (!active || requestController.signal.aborted || requestGeneration !== generation) return false;
        const unique = new Map<string | number, T>();
        for (const item of page.results) unique.set(options.getKey(item), item);
        items.value = [...unique.values()];
        count.value = page.count;
        next.value = page.next;
        previous.value = page.previous;
        currentPage = 1;
        hasLoaded.value = true;
        lastUpdatedAt.value = (options.now || (() => new Date().toISOString()))();
        return true;
      } catch {
        if (!active || requestController.signal.aborted || requestGeneration !== generation) return false;
        error.value = options.initialErrorMessage;
        return false;
      } finally {
        if (controller === requestController) {
          controller = undefined;
          loading.value = false;
        }
      }
    })();
    requestPromise = pending;
    requestKind = 'reset';
    try { return await pending; }
    finally {
      if (requestPromise === pending) {
        requestPromise = undefined;
        requestKind = undefined;
      }
    }
  }

  function refresh(): Promise<boolean> {
    return reset(true);
  }

  async function loadMore(): Promise<boolean> {
    if (!active) return false;
    if (requestPromise) {
      if (requestKind === 'more') return requestPromise;
      await requestPromise;
      await Promise.resolve();
      return active && next.value ? loadMore() : false;
    }
    if (!next.value) return false;
    const targetPage = pageFromNext(next.value, currentPage);
    if (!targetPage) return false;

    const requestGeneration = generation;
    const requestController = new AbortController();
    controller = requestController;
    loadingMore.value = true;
    loadMoreError.value = '';

    const pending = (async () => {
      try {
        const page = await options.fetchPage(targetPage, requestController.signal);
        if (!active || requestController.signal.aborted || requestGeneration !== generation) return false;
        const known = new Set(items.value.map(options.getKey));
        const appended = page.results.filter((item) => {
          const key = options.getKey(item);
          if (known.has(key)) return false;
          known.add(key);
          return true;
        });
        items.value = [...items.value, ...appended];
        count.value = page.count;
        next.value = page.next;
        previous.value = page.previous;
        currentPage = targetPage;
        lastUpdatedAt.value = (options.now || (() => new Date().toISOString()))();
        return true;
      } catch {
        if (!active || requestController.signal.aborted || requestGeneration !== generation) return false;
        loadMoreError.value = options.moreErrorMessage;
        return false;
      } finally {
        if (controller === requestController) {
          controller = undefined;
          loadingMore.value = false;
        }
      }
    })();
    requestPromise = pending;
    requestKind = 'more';
    try { return await pending; }
    finally {
      if (requestPromise === pending) {
        requestPromise = undefined;
        requestKind = undefined;
      }
    }
  }

  return {
    items,
    count,
    next,
    previous,
    loading,
    loadingMore,
    error,
    loadMoreError,
    lastUpdatedAt,
    hasLoaded,
    hasMore,
    activate,
    deactivate,
    reset,
    refresh,
    loadMore,
  };
}
