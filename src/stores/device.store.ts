import { reactive, readonly } from 'vue';
import type { DashboardData } from '@/types/api';

export type ConnectivityState = 'online' | 'connecting' | 'offline' | 'unknown' | 'error';
export type ControllerRole = 'main' | 'feeder' | 'unknown';
export interface DeviceConnectivity { state: ConnectivityState; lastSeen: string | null; label: string }
export interface ConnectivityActuator {
  id: number;
  actuator_type: 'door' | 'light' | 'feeder';
  device_online?: boolean | null;
  controller_online?: boolean | null;
  connectivity_state?: string | null;
  device_status?: string | null;
  controller_type?: string | null;
  controller_role?: string | null;
  device_last_seen?: string | null;
  controller_last_seen?: string | null;
  last_seen?: string | null;
}

interface DeviceState {
  server: DeviceConnectivity;
  main: DeviceConnectivity;
  feeder: DeviceConnectivity;
  actuators: Record<number, DeviceConnectivity>;
}

const blank = (label: string): DeviceConnectivity => ({ state: 'unknown', lastSeen: null, label });
const mutable = reactive<DeviceState>({ server: blank('GoHMoTech server'), main: blank('Main controller'), feeder: blank('Feeder controller'), actuators: {} });
export const deviceState = readonly(mutable);

function normalizeState(value: unknown): ConnectivityState {
  if (typeof value === 'boolean') return value ? 'online' : 'offline';
  const normalized = String(value || '').toLowerCase();
  if (['online', 'connected', 'active', 'ready'].includes(normalized)) return 'online';
  if (['connecting', 'reconnecting'].includes(normalized)) return 'connecting';
  if (['offline', 'disconnected', 'inactive'].includes(normalized)) return 'offline';
  if (['error', 'failed', 'fault'].includes(normalized)) return 'error';
  return 'unknown';
}

export function markServerOnline() { mutable.server.state = 'online'; mutable.server.lastSeen = new Date().toISOString(); }
export function markServerOffline() { mutable.server.state = 'offline'; }
export function markServerConnecting() { mutable.server.state = navigator.onLine ? 'connecting' : 'offline'; }

export function controllerRole(item: ConnectivityActuator): ControllerRole {
  const declared = String(item.controller_role || item.controller_type || '').toLowerCase();
  if (declared.includes('feed')) return 'feeder';
  if (declared.includes('main')) return 'main';
  if (item.actuator_type === 'door' || item.actuator_type === 'light') return 'main';
  if (item.actuator_type === 'feeder') return 'feeder';
  return 'unknown';
}

export function applyDashboardStatus(data: DashboardData) {
  markServerOnline();
  mutable.main.state = data.system.controller_online ? 'online' : 'offline';
  mutable.main.lastSeen = data.system.controller_last_seen;
  const system = data.system as DashboardData['system'] & { feeder_controller_online?: boolean | null; feeder_controller_last_seen?: string | null };
  if (typeof system.feeder_controller_online === 'boolean') {
    mutable.feeder.state = system.feeder_controller_online ? 'online' : 'offline';
    mutable.feeder.lastSeen = system.feeder_controller_last_seen || null;
  }
}

export function applyActuatorStatus(items: ConnectivityActuator[]) {
  for (const item of items) {
    const role = controllerRole(item);
    const explicit = item.device_online ?? item.controller_online;
    const state = explicit == null ? normalizeState(item.connectivity_state || item.device_status) : normalizeState(explicit);
    const controller = role === 'main' ? mutable.main : role === 'feeder' ? mutable.feeder : undefined;
    const lastSeen = item.device_last_seen || item.controller_last_seen || item.last_seen || controller?.lastSeen || null;
    mutable.actuators[item.id] = { state, lastSeen, label: role === 'feeder' ? 'Feeder controller' : role === 'main' ? 'Main controller' : 'Device controller' };
    if (controller && state !== 'unknown') { controller.state = state; controller.lastSeen = lastSeen; }
  }
}

export function actuatorConnectivity(item: ConnectivityActuator): DeviceConnectivity {
  if (mutable.server.state !== 'online') return { state: 'offline', lastSeen: mutable.server.lastSeen, label: 'GoHMoTech server' };
  const controller = controllerRole(item) === 'main' ? mutable.main : controllerRole(item) === 'feeder' ? mutable.feeder : blank('Device controller');
  const actuator = mutable.actuators[item.id];
  return !actuator || actuator.state === 'unknown' ? { ...controller, lastSeen: actuator?.lastSeen || controller.lastSeen } : actuator;
}

export function canControlActuator(item: ConnectivityActuator): boolean {
  return mutable.server.state === 'online' && actuatorConnectivity(item).state === 'online';
}

export function clearDeviceState() {
  mutable.server = blank('GoHMoTech server'); mutable.main = blank('Main controller'); mutable.feeder = blank('Feeder controller'); mutable.actuators = {};
}
