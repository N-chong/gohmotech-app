import { API_BASE, apiRequest } from './api';
export class FarmSocket {
  private socket?: WebSocket;
  private connectPromise?: Promise<void>;
  private reconnectTimer?: number;
  private retries = 0;
  private stopped = true;
  private generation = 0;
  constructor(private channel: 'sensors' | 'alerts' | 'feeding' | 'detections', private onMessage: (data: unknown) => void) {}

  connect(): Promise<void> {
    this.stopped = false;
    if (this.reconnectTimer) { window.clearTimeout(this.reconnectTimer); this.reconnectTimer = undefined; }
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

    const generation = ++this.generation;
    const pending = this.open(generation);
    this.connectPromise = pending;
    void pending.finally(() => {
      if (this.connectPromise === pending) this.connectPromise = undefined;
    }).catch(() => undefined);
    void pending.catch(() => {
      if (!this.stopped && generation === this.generation) this.scheduleReconnect();
    });
    return pending;
  }

  private async open(generation: number): Promise<void> {
    const { ticket } = await apiRequest<{ ticket: string }>('/api/mobile/auth/realtime-ticket/', { method: 'POST', body: JSON.stringify({ purpose: 'websocket' }) });
    if (this.stopped || generation !== this.generation) return;

    const wsBase = (API_BASE || window.location.origin).replace(/^http/, 'ws');
    const socket = new WebSocket(`${wsBase}/ws/${this.channel}/?ticket=${encodeURIComponent(ticket)}`);
    this.socket = socket;
    socket.onopen = () => { if (this.socket === socket) this.retries = 0; };
    socket.onmessage = (event) => {
      if (this.socket !== socket || this.stopped) return;
      try { this.onMessage(JSON.parse(event.data)); } catch { /* malformed frame */ }
    };
    socket.onclose = () => {
      if (this.socket === socket) this.socket = undefined;
      if (!this.stopped && generation === this.generation) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.stopped) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.retries++);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      if (!this.stopped) void this.connect().catch(() => this.scheduleReconnect());
    }, delay);
  }

  close() {
    this.stopped = true;
    this.generation += 1;
    this.connectPromise = undefined;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    const socket = this.socket;
    this.socket = undefined;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.close();
    }
  }
}
