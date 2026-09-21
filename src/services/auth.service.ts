import { apiRequest, ApiError, clearPrivateApiState, configureAuthRecovery } from './api';
import { authState, clearSession, persistSession, readStoredSession, restoreSession, setAuthStatus, setSession } from '@/stores/auth.store';
import { clearDeviceState, markServerConnecting } from '@/stores/device.store';
import { closeAuthenticatedSockets } from './websocket.service';
import type { MobileUser } from '@/types/api';

interface LoginResponse { token: string; refresh?: string; refresh_token?: string; user: MobileUser }
let bootstrapPromise: Promise<void> | undefined;

async function clearPrivateState(status: 'anonymous' | 'expired') {
  closeAuthenticatedSockets();
  clearPrivateApiState();
  clearDeviceState();
  await clearSession(status);
}

async function refreshSession(): Promise<boolean> {
  if (!authState.refreshToken) {
    await clearPrivateState('expired');
    return false;
  }
  try {
    const result = await apiRequest<LoginResponse>('/api/mobile/auth/refresh/', {
      method: 'POST', auth: false, retryAuth: false,
      body: JSON.stringify({ refresh: authState.refreshToken }),
    });
    await setSession(result.token, result.user || authState.user!, result.refresh_token || result.refresh || authState.refreshToken);
    return true;
  } catch (reason) {
    if (reason instanceof ApiError && (reason.status === 0 || reason.status >= 500 || reason.status === 408 || reason.status === 429)) throw reason;
    await clearPrivateState('expired');
    return false;
  }
}

configureAuthRecovery(refreshSession);

export const authService = {
  async login(username: string, password: string) {
    const result = await apiRequest<LoginResponse>('/api/mobile/auth/login/', {
      method: 'POST', auth: false, retryAuth: false, body: JSON.stringify({ username, password }),
    });
    await setSession(result.token, result.user, result.refresh_token || result.refresh || null);
    return result.user;
  },

  bootstrap(force = false): Promise<void> {
    if (bootstrapPromise && !force) return bootstrapPromise;
    const pending = (async () => {
      setAuthStatus('bootstrapping', 'Restoring session…');
      const saved = authState.token && authState.user
        ? { token: authState.token, refreshToken: authState.refreshToken, user: authState.user }
        : await readStoredSession();
      if (!saved) { setAuthStatus('anonymous'); return; }
      restoreSession(saved);
      markServerConnecting();
      try {
        await apiRequest('/api/mobile/dashboard/', { retryAuth: true });
        if (authState.token) {
          setAuthStatus('authenticated');
          await persistSession({ token: authState.token, refreshToken: authState.refreshToken, user: authState.user! });
        }
      } catch (reason) {
        if (reason instanceof ApiError && (reason.status === 0 || reason.status >= 500 || reason.status === 408 || reason.status === 429)) {
          setAuthStatus('offline', 'Unable to connect to the farm server. Some information may be unavailable.');
          return;
        }
        if (authState.status !== 'expired') await clearPrivateState('expired');
      }
    })();
    bootstrapPromise = pending;
    void pending.finally(() => { if (bootstrapPromise === pending) bootstrapPromise = undefined; }).catch(() => undefined);
    return pending;
  },

  async logout() {
    try { await apiRequest<void>('/api/mobile/auth/logout/', { method: 'POST', retryAuth: false }); }
    catch { /* local logout must always complete, including while offline */ }
    finally { await clearPrivateState('anonymous'); }
  },
};
