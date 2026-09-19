import { reactive, readonly } from 'vue';
import type { MobileUser } from '@/types/api';

interface AuthState { token: string | null; user: MobileUser | null }
const SESSION_KEY = 'gohmotech.mobile.session';
function restoredSession(): AuthState {
  try {
    const saved = window.sessionStorage.getItem(SESSION_KEY);
    if (!saved) return { token: null, user: null };
    const parsed = JSON.parse(saved) as Partial<AuthState>;
    return typeof parsed.token === 'string' && parsed.user ? { token: parsed.token, user: parsed.user as MobileUser } : { token: null, user: null };
  } catch { return { token: null, user: null }; }
}
const mutable = reactive<AuthState>(restoredSession());
export const authState = readonly(mutable);
export function setSession(token: string, user: MobileUser) { mutable.token = token; mutable.user = user; try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, user })); } catch { /* in-memory session remains available */ } }
export function clearSession() { mutable.token = null; mutable.user = null; try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* storage may be unavailable */ } }