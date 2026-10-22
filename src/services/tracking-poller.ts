export class TrackingPoller {
  private timer?: number;
  private running?: Promise<void>;
  private active = false;

  constructor(
    private readonly refresh: () => Promise<number | void>,
    private readonly fallbackIntervalMs = 5000,
  ) {}

  start(): Promise<void> {
    if (this.active) return this.running || Promise.resolve();
    this.active = true;
    return this.run();
  }

  refreshNow(): Promise<void> {
    if (!this.active) return Promise.resolve();
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = undefined;
    return this.run();
  }

  stop() {
    this.active = false;
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = undefined;
  }

  private run(): Promise<void> {
    if (!this.active) return Promise.resolve();
    if (this.running) return this.running;

    const pending = (async () => {
      let interval = this.fallbackIntervalMs;
      try {
        const requested = await this.refresh();
        if (typeof requested === 'number' && Number.isFinite(requested)) {
          interval = Math.min(30_000, Math.max(2_000, requested));
        }
      } finally {
        if (this.active) {
          this.timer = window.setTimeout(() => {
            this.timer = undefined;
            void this.run();
          }, interval);
        }
      }
    })();
    this.running = pending;
    void pending.finally(() => {
      if (this.running === pending) this.running = undefined;
    }).catch(() => undefined);
    return pending;
  }
}