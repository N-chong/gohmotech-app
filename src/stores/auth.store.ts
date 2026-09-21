import { reactive, readonly } from 'vue';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';
import type { MobileUser } from '@/types/api';

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous' | 'offline' | 'expired';

export interface PersistedSession {
  token: string;
  refreshToken?: string | null;
  user: MobileUser;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: MobileUser | null;
  status: AuthStatus;
  message: string;
  generation: number;
}

const SESSION_KEY = 'mobile.auth.session.v2';
const LEGACY_SESSION_KEY = 'gohmotech.mobile.session';
const mutable = reactive<AuthState>({ token: null, refreshToken: null, user: null, status: 'bootstrapping', message: '', generation: 0 });
export const authState = readonly(mutable);

function isSession(value: unknown): value is PersistedSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<PersistedSession>;
  return typeof session.token === 'string' && Boolean(session.token) && Boolean(session.user?.id);
}

async function configureStorage() {
  if (!Capacitor.isNativePlatform()) return;
  await SecureStorage.setKeyPrefix('gohmotech_');
  await SecureStorage.setSynchronize(false);
  await SecureStorage.setDefaultKeychainAccess(KeychainAccess.afterFirstUnlockThisDeviceOnly);
}

export async function readStoredSession(): Promise<PersistedSession | null> {
  try {
    let saved: unknown;
    if (Capacitor.isNativePlatform()) {
      await configureStorage();
      saved = await SecureStorage.get(SESSION_KEY, false, false);
    } else {
      const raw = window.localStorage?.getItem(SESSION_KEY);
      saved = raw ? JSON.parse(raw) : null;
    }
    if (isSession(saved)) return saved;
  } catch { /* a locked or unavailable keystore is treated as no restored session */ }

  // One-time migration from the former same-window session storage.
  try {
    const legacy = window.sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy) as unknown;
    if (!isSession(parsed)) return null;
    await persistSession(parsed);
    window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
    return parsed;
  } catch { return null; }
}

export async function persistSession(session: PersistedSession): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await configureStorage();
    await SecureStorage.set(SESSION_KEY, session as unknown as Record<string, unknown>, false, false, KeychainAccess.afterFirstUnlockThisDeviceOnly);
  } else {
    window.localStorage?.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export async function setSession(token: string, user: MobileUser, refreshToken?: string | null): Promise<void> {
  await persistSession({ token, refreshToken: refreshToken || null, user });
  mutable.token = token;
  mutable.refreshToken = refreshToken || null;
  mutable.user = user;
  mutable.status = 'authenticated';
  mutable.message = '';
}

export function restoreSession(session: PersistedSession) {
  mutable.token = session.token;
  mutable.refreshToken = session.refreshToken || null;
  mutable.user = session.user;
}

export function setAuthStatus(status: AuthStatus, message = '') {
  mutable.status = status;
  mutable.message = message;
}

export async function clearSession(status: AuthStatus = 'anonymous'): Promise<void> {
  mutable.token = null;
  mutable.refreshToken = null;
  mutable.user = null;
  mutable.status = status;
  mutable.message = status === 'expired' ? 'Please sign in again to continue.' : '';
  mutable.generation += 1;
  try {
    if (Capacitor.isNativePlatform()) {
      await configureStorage();
      await SecureStorage.remove(SESSION_KEY, false);
    } else {
      window.localStorage?.removeItem(SESSION_KEY);
    }
  } catch { /* memory state is still cleared */ }
  try { window.sessionStorage.removeItem(LEGACY_SESSION_KEY); } catch { /* unavailable */ }
}
