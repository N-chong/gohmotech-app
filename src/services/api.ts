import { authState } from '@/stores/auth.store';
import { markServerOffline, markServerOnline } from '@/stores/device.store';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 15_000;
const inFlightReads = new Map<string, Promise<unknown>>();
type AuthRecovery = () => Promise<boolean>;
let authRecovery: AuthRecovery | undefined;
let refreshPromise: Promise<boolean> | undefined;

export interface ApiRequestOptions extends RequestInit { auth?: boolean; retryAuth?: boolean }
export class ApiError extends Error { constructor(public status: number, message: string, public payload?: unknown) { super(message); } }
export function configureAuthRecovery(recovery: AuthRecovery) { authRecovery = recovery; }
export function clearPrivateApiState() { inFlightReads.clear(); refreshPromise = undefined; }

function requestUrl(path: string): string {
  if (!/^https?:\/\//i.test(path)) return `${API_BASE}${path}`;
  try {
    const absolute = new URL(path);
    if (!API_BASE && absolute.hostname === 'gohmotech.site') return `${absolute.pathname}${absolute.search}`;
  } catch { /* fetch will report an invalid URL */ }
  return path;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const forwardAbort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) forwardAbort();
  else init.signal?.addEventListener('abort', forwardAbort, { once: true });
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    markServerOnline();
    return response;
  } catch (reason) {
    if (init.signal?.aborted) throw reason;
    markServerOffline();
    if (timedOut) throw new ApiError(0, 'The GoHMoTech server took too long to respond.');
    throw new ApiError(0, navigator.onLine ? 'Cannot connect to GoHMoTech server.' : 'No internet connection.');
  } finally {
    window.clearTimeout(timeout);
    init.signal?.removeEventListener('abort', forwardAbort);
  }
}

async function recoverAuthentication(): Promise<boolean> {
  if (!authRecovery) return false;
  if (!refreshPromise) {
    const pending = authRecovery();
    refreshPromise = pending;
    void pending.finally(() => { if (refreshPromise === pending) refreshPromise = undefined; }).catch(() => undefined);
  }
  return refreshPromise;
}

async function performRequest<T>(path: string, options: ApiRequestOptions, alreadyRetried = false): Promise<T> {
  const { auth = true, retryAuth = true, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (auth && authState.token) headers.set('Authorization', `Token ${authState.token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetchWithTimeout(requestUrl(path), { ...init, headers });
  if (response.status === 401 && auth && retryAuth && !alreadyRetried && authState.token) {
    if (await recoverAuthentication()) return performRequest<T>(path, options, true);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string; error?: string; code?: string } | null;
    throw new ApiError(response.status, payload?.detail || payload?.error || `Request failed (${response.status}).`, payload);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' || options.signal) return performRequest<T>(path, options);
  const key = `${authState.token || 'anonymous'}:${requestUrl(path)}`;
  const existing = inFlightReads.get(key);
  if (existing) return existing as Promise<T>;
  const request = performRequest<T>(path, options);
  inFlightReads.set(key, request);
  void request.finally(() => { if (inFlightReads.get(key) === request) inFlightReads.delete(key); }).catch(() => undefined);
  return request;
}

export async function authenticatedImageUrl(path: string): Promise<string> {
  const headers = new Headers();
  if (authState.token) headers.set('Authorization', `Token ${authState.token}`);
  const response = await fetchWithTimeout(requestUrl(path), { headers });
  if (!response.ok) throw new ApiError(response.status, 'Unable to load image.');
  return URL.createObjectURL(await response.blob());
}
