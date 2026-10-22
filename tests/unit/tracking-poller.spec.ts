import { afterEach, describe, expect, test, vi } from 'vitest';
import { TrackingPoller } from '@/services/tracking-poller';

describe('tracking poller', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('uses the server interval and stops when the cached Ionic page leaves', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockResolvedValue(2000);
    const poller = new TrackingPoller(refresh);

    await poller.start();
    expect(refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1999);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(2);

    poller.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test('clamps an unsafe fast interval to two seconds', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockResolvedValue(100);
    const poller = new TrackingPoller(refresh);

    await poller.start();
    await vi.advanceTimersByTimeAsync(1999);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    poller.stop();
  });
});