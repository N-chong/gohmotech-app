export class RefreshScheduler {
  private timer?: number;
  private lastStartedAt = Number.NEGATIVE_INFINITY;
  private running?: Promise<void>;
  private queued = false;
  private active = false;

  constructor(private refresh: () => Promise<void>, private minimumIntervalMs: number) {}

  start(immediate = true): Promise<void> {
    this.active = true;
    return immediate ? this.run() : Promise.resolve();
  }

  notify() {
    if (!this.active) return;
    if (this.running) { this.queued = true; return; }
    const wait = Math.max(0, this.minimumIntervalMs - (Date.now() - this.lastStartedAt));
    if (wait === 0) { void this.run(); return; }
    if (!this.timer) this.timer = window.setTimeout(() => { this.timer = undefined; void this.run(); }, wait);
  }

  stop() {
    this.active = false;
    this.queued = false;
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = undefined;
  }

  private run(): Promise<void> {
    if (!this.active) return Promise.resolve();
    if (this.running) { this.queued = true; return this.running; }
    this.lastStartedAt = Date.now();
    const pending = this.refresh();
    this.running = pending;
    void pending.finally(() => {
      if (this.running !== pending) return;
      this.running = undefined;
      if (this.queued && this.active) { this.queued = false; this.notify(); }
    }).catch(() => undefined);
    return pending;
  }
}
