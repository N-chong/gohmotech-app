import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RefreshScheduler } from '@/services/refresh-scheduler';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

describe('real-time dashboard refresh coalescing', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
  afterEach(() => vi.useRealTimers());

  test('turns a burst of sensor frames into one active request and one delayed refresh', async () => {
    const first = deferred<void>();
    const refresh = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(undefined);
    const scheduler = new RefreshScheduler(refresh, 5_000);

    void scheduler.start();
    for (let index = 0; index < 100; index += 1) scheduler.notify();
    expect(refresh).toHaveBeenCalledTimes(1);

    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(4_999);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test('cancels a queued refresh when its Ionic page leaves', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const scheduler = new RefreshScheduler(refresh, 5_000);
    await scheduler.start();
    scheduler.notify();
    scheduler.stop();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('bounds two simultaneous clients to one active dashboard request each', async () => {
    const gate = deferred<void>();
    let active = 0;
    let maximumActive = 0;
    let total = 0;
    const makeRefresh = () => vi.fn(async () => {
      total += 1; active += 1; maximumActive = Math.max(maximumActive, active);
      if (total <= 2) await gate.promise;
      active -= 1;
    });
    const first = new RefreshScheduler(makeRefresh(), 5_000);
    const second = new RefreshScheduler(makeRefresh(), 5_000);

    void first.start(); void second.start();
    for (let index = 0; index < 100; index += 1) { first.notify(); second.notify(); }
    expect(total).toBe(2);
    expect(active).toBe(2);
    expect(maximumActive).toBe(2);

    gate.resolve();
    await Promise.resolve(); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(total).toBe(4);
    expect(maximumActive).toBe(2);
    first.stop(); second.stop();
  });
});

describe('central HTTP request deduplication', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  test('shares simultaneous identical GET requests', async () => {
    const response = deferred<Response>();
    const request = vi.fn(() => response.promise);
    vi.stubGlobal('fetch', request);
    const { apiRequest } = await import('@/services/api');

    const first = apiRequest<{ value: number }>('/api/mobile/dashboard/');
    const second = apiRequest<{ value: number }>('/api/mobile/dashboard/');
    expect(request).toHaveBeenCalledTimes(1);
    response.resolve({ ok: true, status: 200, json: async () => ({ value: 7 }) } as Response);

    await expect(Promise.all([first, second])).resolves.toEqual([{ value: 7 }, { value: 7 }]);
  });
});

describe('authentication recovery synchronization', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  test('uses one refresh request for simultaneous 401 responses and retries both calls once', async () => {
    const refreshGate = deferred<void>();
    let refreshCalls = 0;
    const user = { id: 1, username: 'owner', email: '', display_name: 'Farm Owner', role: 'farm_owner' as const, permissions: { farm_access: true, manage_farm: true } };
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/login/')) return { ok: true, status: 200, json: async () => ({ token: 'old-access', refresh_token: 'refresh-token', user }) } as Response;
      if (url.includes('/auth/refresh/')) {
        refreshCalls += 1;
        await refreshGate.promise;
        return { ok: true, status: 200, json: async () => ({ token: 'new-access', refresh_token: 'refresh-token', user }) } as Response;
      }
      const authorization = new Headers(init?.headers).get('Authorization');
      if (authorization === 'Token old-access') return { ok: false, status: 401, json: async () => ({ detail: 'Expired' }) } as Response;
      return { ok: true, status: 200, json: async () => ({ ok: true }) } as Response;
    });
    vi.stubGlobal('fetch', request);
    const { authService } = await import('@/services/auth.service');
    const { apiRequest } = await import('@/services/api');
    await authService.login('owner', 'password');

    const first = apiRequest('/api/one/');
    const second = apiRequest('/api/two/');
    await vi.waitFor(() => expect(refreshCalls).toBe(1));
    refreshGate.resolve();

    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1);
  });
});

describe('WebSocket connection ownership', () => {
  class FakeWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    static instances: FakeWebSocket[] = [];
    readyState = FakeWebSocket.CONNECTING;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    constructor(public url: string) { FakeWebSocket.instances.push(this); }
    close() { this.readyState = FakeWebSocket.CLOSED; }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetModules(); });

  test('allows only one ticket request and one socket while connecting', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ticket: 'socket-ticket' }) });
    vi.stubGlobal('fetch', request);
    const { FarmSocket } = await import('@/services/websocket.service');
    const socket = new FarmSocket('sensors', vi.fn());

    await Promise.all([socket.connect(), socket.connect(), socket.connect()]);

    expect(request).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(1);
    socket.close();
  });

  test('does not create a socket when closed while its ticket is pending', async () => {
    const ticket = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn(() => ticket.promise));
    const { FarmSocket } = await import('@/services/websocket.service');
    const socket = new FarmSocket('sensors', vi.fn());

    const connecting = socket.connect();
    socket.close();
    ticket.resolve({ ok: true, status: 200, json: async () => ({ ticket: 'late-ticket' }) } as Response);
    await connecting;

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  test('cancels a scheduled reconnect on close', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ticket: 'socket-ticket' }) });
    vi.stubGlobal('fetch', request);
    const { FarmSocket } = await import('@/services/websocket.service');
    const socket = new FarmSocket('sensors', vi.fn());
    await socket.connect();
    const connection = FakeWebSocket.instances[0];

    connection.onclose?.({} as CloseEvent);
    socket.close();
    await vi.advanceTimersByTimeAsync(30_000);

    expect(request).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
