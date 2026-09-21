import { apiRequest, ApiError } from './api';
import { actuatorConnectivity, applyActuatorStatus, canControlActuator } from '@/stores/device.store';

export interface Actuator {
  id: number;
  device_name: string;
  actuator_type: 'door' | 'light' | 'feeder';
  current_state: string;
  current_state_display: string;
  mode: string;
  mode_display: string;
  last_changed_at: string;
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

export class DeviceUnavailableError extends Error {
  readonly status = 409;
  readonly code = 'DEVICE_OFFLINE';
  constructor(public actuator: Actuator) { super(`${actuatorConnectivity(actuator).label} is ${actuatorConnectivity(actuator).state}.`); }
}

export const automationService = {
  async list() {
    const response = await apiRequest<{ count: number; results: Actuator[] }>('/iot/api/actuators/');
    applyActuatorStatus(response.results);
    return response;
  },
  async control(item: Actuator, state: string) {
    if (!canControlActuator(item)) throw new DeviceUnavailableError(item);
    const response = await apiRequest<{ message: string; current_state: string; result: string; device_online: boolean }>(`/iot/api/actuators/${item.id}/control/`, { method: 'POST', body: JSON.stringify({ state }) });
    if (response.device_online === false) {
      applyActuatorStatus([{ ...item, device_online: false }]);
      throw new DeviceUnavailableError(item);
    }
    if (['failed', 'error', 'timeout'].includes(String(response.result).toLowerCase())) throw new ApiError(409, response.message || 'The controller did not complete the command.', response);
    return response;
  },
};
