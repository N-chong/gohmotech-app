<template>
  <ion-page class="automation-page">
    <ion-header class="ion-no-border automation-header"><ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/more" /></ion-buttons><ion-title>Automation</ion-title></ion-toolbar></ion-header>
    <ion-content><main class="page-wrap automation-shell">
      <section class="automation-hero"><div class="automation-circuit" aria-hidden="true"></div><span class="automation-hero-icon"><ion-icon :icon="flashOutline" /></span><div><p class="eyebrow">SMART CONTROL CENTER</p><h1>Physical systems.<br><span>Visible intent.</span></h1><p>{{ actuators.length }} configured device{{ actuators.length === 1 ? '' : 's' }} · {{ canManage ? 'Protected controls enabled' : 'Read-only access' }}</p></div></section>
      <section v-if="actuators.length" class="automation-status-rail" :class="deviceState.server.state"><div><i></i><span><small>SERVER LINK</small><strong>{{ deviceState.server.state.toUpperCase() }}</strong></span></div><div><small>CONTROLLERS</small><strong>{{ onlineCount }}/{{ actuators.length }} ONLINE</strong></div><div><small>ACCESS</small><strong>{{ canManage ? 'CONTROL' : 'VIEW' }}</strong></div></section>

      <StatePanel v-if="loading" loading title="Loading controls" message="Checking current actuator state." />
      <StatePanel v-else-if="error && !actuators.length" tone="danger" title="Unable to retrieve automation" :message="error" :retry="load" />
      <template v-else>
        <div v-if="!canManage" class="automation-access-note"><ion-icon :icon="lockClosedOutline" /><div><strong>View-only controls</strong><p>Your role can monitor device state. Commands require a Farm Owner or administrator.</p></div></div>
        <div v-if="error" class="automation-command-error" role="alert"><ion-icon :icon="alertCircleOutline" />{{ error }}</div>

        <section class="control-stack">
          <article v-for="item in actuators" :key="item.id" class="smart-control-card tactile-control-card" :class="[item.actuator_type, connectivity(item).state, { active: isActive(item), busy: busy === item.id }]">
            <div class="control-card-glow" aria-hidden="true"></div>
            <header><div><p class="eyebrow">{{ titleCase(item.actuator_type) }} CONTROL</p><h2>{{ item.device_name }}</h2></div><span class="device-state"><i></i>{{ connectivity(item).state.toUpperCase() }}</span></header>

            <div class="control-visual" :class="item.actuator_type" @click="openDetails(item)">
              <div v-if="item.actuator_type === 'door'" class="door-system-visual"><div class="door-frame"><span :class="{ opened: isActive(item) }"><i></i><i></i><i></i><i></i></span></div><div v-if="busy === item.id" class="door-motion" :class="pendingState"><ion-icon :icon="arrowForwardOutline" /><small>{{ pendingState === 'open' ? 'OPENING' : 'CLOSING' }}</small></div></div>
              <div v-else-if="item.actuator_type === 'light'" class="light-orb"><ion-icon :icon="bulbOutline" /><i></i><i></i><i></i></div>
              <div v-else class="feeder-silo"><div class="silo-cap"></div><div class="silo-body"><ion-icon :icon="nutritionOutline" /><span><i></i><i></i><i></i></span></div><small>CONNECTED FEEDER</small></div>
              <div class="visual-copy"><small>CURRENT STATE</small><strong>{{ connectivity(item).state === 'online' ? stateLabel(item) : 'Status unavailable' }}</strong><p>{{ deviceCopy(item) }}</p><button type="button" @click.stop="openDetails(item)">DEVICE DETAILS <ion-icon :icon="chevronForwardOutline" /></button></div>
            </div>

            <div class="control-telemetry"><div><span>MODE</span><strong>{{ connectivity(item).state === 'online' ? item.mode_display : 'Unavailable' }}</strong></div><div><span>{{ connectivity(item).state === 'online' ? 'LAST CHANGE' : 'LAST SEEN' }}</span><strong>{{ relativeTime(connectivity(item).state === 'online' ? item.last_changed_at : connectivity(item).lastSeen) }}</strong></div><div><span>DEVICE ID</span><strong>#{{ item.id }}</strong></div></div>

            <div v-if="item.actuator_type !== 'feeder'" class="physical-command-surface" :class="{ locked: !canManage || !canControl(item) }">
              <small>{{ controlReason(item) }}</small>
              <div><ion-button fill="clear" :disabled="!canManage || !canControl(item) || busy === item.id || item.current_state === offState(item)" @click="confirmControl(item, offState(item))"><ion-icon slot="start" :icon="item.actuator_type === 'door' ? lockClosedOutline : moonOutline" />{{ offLabel(item) }}</ion-button><span><i></i></span><ion-button fill="clear" :disabled="!canManage || !canControl(item) || busy === item.id || item.current_state === onState(item)" @click="confirmControl(item, onState(item))">{{ onLabel(item) }}<ion-icon slot="end" :icon="item.actuator_type === 'door' ? lockOpenOutline : sunnyOutline" /></ion-button></div>
            </div>
            <p v-if="!canControl(item)" class="control-unavailable"><ion-icon :icon="cloudOfflineOutline" />{{ unavailableCopy(item) }}</p>
          </article>
        </section>
        <StatePanel v-if="!actuators.length" title="No actuators configured" message="Configure door, lighting, or feeding controllers on the server first." />
      </template>
    </main></ion-content>

    <ion-modal :is-open="Boolean(detailItem)" :initial-breakpoint="0.54" :breakpoints="[0, 0.54, 0.78]" handle-behavior="cycle" @didDismiss="detailItem = undefined">
      <ion-content class="device-detail-sheet-content"><section v-if="detailItem" class="device-detail-sheet"><header><span :class="[detailItem.actuator_type, { active: isActive(detailItem) }]"><ion-icon :icon="deviceIcon(detailItem)" /></span><div><small>CONNECTED {{ detailItem.actuator_type.toUpperCase() }}</small><h2>{{ detailItem.device_name }}</h2><p>{{ stateLabel(detailItem) }}</p></div></header><div class="device-detail-grid"><div><small>CURRENT STATE</small><strong>{{ detailItem.current_state_display || titleCase(detailItem.current_state) }}</strong></div><div><small>CONTROL MODE</small><strong>{{ detailItem.mode_display }}</strong></div><div><small>LAST CHANGE</small><strong>{{ relativeTime(detailItem.last_changed_at) }}</strong></div><div><small>ACTUATOR ID</small><strong>#{{ detailItem.id }}</strong></div></div><div v-if="detailItem.actuator_type === 'light' && detailItem.mode.toLowerCase().includes('auto')" class="automation-explanation"><ion-icon :icon="sparklesOutline" /><div><strong>Automatic lighting mode</strong><p>The connected controller determines lighting from its configured automation rules. No sensor value is simulated here.</p></div></div><div v-else-if="detailItem.actuator_type === 'feeder'" class="automation-explanation"><ion-icon :icon="informationCircleOutline" /><div><strong>Feed telemetry unavailable</strong><p>This endpoint currently reports device state, mode, and last change only. Fill estimates will appear when supported by the backend.</p></div></div></section></ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { alertController, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonPage, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewDidLeave, toastController } from '@ionic/vue';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { alertCircleOutline, arrowForwardOutline, bulbOutline, chevronForwardOutline, cloudOfflineOutline, flashOutline, informationCircleOutline, lockClosedOutline, lockOpenOutline, moonOutline, nutritionOutline, sunnyOutline, sparklesOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import StatePanel from '@/components/StatePanel.vue';
import { automationService, DeviceUnavailableError, type Actuator } from '@/services/automation.service';
import { dashboardService } from '@/services/dashboard.service';
import { FarmSocket } from '@/services/websocket.service';
import { RefreshScheduler } from '@/services/refresh-scheduler';
import { actuatorConnectivity, applyDashboardStatus, canControlActuator, deviceState } from '@/stores/device.store';
import { relativeTime, titleCase } from '@/utils/format';
import { authState } from '@/stores/auth.store';

const actuators = ref<Actuator[]>([]); const loading = ref(true); const error = ref(''); const busy = ref<number>(); const pendingState = ref(''); const detailItem = ref<Actuator>();
const canManage = computed(() => Boolean(authState.user?.permissions.manage_farm));
const onlineCount = computed(() => actuators.value.filter(canControlActuator).length);
const connectivity = (item: Actuator) => actuatorConnectivity(item);
const canControl = (item: Actuator) => canControlActuator(item);
const unavailableCopy = (item: Actuator) => deviceState.server.state !== 'online' ? 'Connection to GoHMoTech server lost. Automation is unavailable.' : `${connectivity(item).label} ${connectivity(item).state}. Try again after it reconnects.`;
const controlReason = (item: Actuator) => !canManage.value ? 'CONTROL LOCKED FOR THIS ROLE' : canControl(item) ? 'SELECT A PROTECTED COMMAND' : unavailableCopy(item).toUpperCase();
const onState = (item: Actuator) => item.actuator_type === 'door' ? 'open' : 'on';
const offState = (item: Actuator) => item.actuator_type === 'door' ? 'closed' : 'off';
const onLabel = (item: Actuator) => item.actuator_type === 'door' ? 'Open door' : 'Turn on';
const offLabel = (item: Actuator) => item.actuator_type === 'door' ? 'Close door' : 'Turn off';
const isActive = (item: Actuator) => item.current_state === onState(item);
const deviceIcon = (item: Actuator) => item.actuator_type === 'door' ? lockOpenOutline : item.actuator_type === 'light' ? bulbOutline : nutritionOutline;
function stateLabel(item: Actuator) { if (busy.value === item.id) return item.actuator_type === 'door' ? (pendingState.value === 'open' ? 'Opening…' : 'Closing…') : (pendingState.value === 'on' ? 'Turning on…' : 'Turning off…'); return item.current_state_display || titleCase(item.current_state); }
function deviceCopy(item: Actuator) { if (!canControl(item)) return unavailableCopy(item); if (busy.value === item.id) return 'Command acknowledged. Waiting for the controller response.'; if (item.actuator_type === 'door') return isActive(item) ? 'Entry access is currently open.' : 'The goat house is secured.'; if (item.actuator_type === 'light') return isActive(item) ? 'Farm lighting is illuminating the area.' : item.mode.toLowerCase().includes('auto') ? 'Automatic lighting rules remain active.' : 'Lighting is currently conserving power.'; return 'State and mode are synchronized with the feeder controller.'; }
function openDetails(item: Actuator) { detailItem.value = item; void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
async function load() { loading.value = true; error.value = ''; try { const [list, dashboard] = await Promise.all([automationService.list(), dashboardService.get()]); actuators.value = list.results; applyDashboardStatus(dashboard); } catch { error.value = 'The automation controller could not be reached. Controls are unavailable until connectivity is confirmed.'; } finally { loading.value = false; } }
async function refreshStates() { try { const [list, dashboard] = await Promise.all([automationService.list(), dashboardService.get()]); actuators.value = list.results; applyDashboardStatus(dashboard); } catch { /* retain the last confirmed state but controls fail closed through server status */ } }
async function confirmControl(item: Actuator, state: string) {
  if (!canControl(item)) { error.value = unavailableCopy(item); return; }
  const action = state === 'open' ? 'Open' : state === 'closed' ? 'Close' : state === 'on' ? 'Turn on' : 'Turn off';
  const alert = await alertController.create({ header: `${action} ${item.device_name}?`, message: `Current state: ${item.current_state_display || titleCase(item.current_state)}. The command will be sent to the existing GoHMoTech controller.`, buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Confirm command', role: 'confirm' }] });
  await alert.present(); const result = await alert.onDidDismiss(); if (result.role !== 'confirm') return;
  busy.value = item.id; pendingState.value = state; error.value = ''; void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
  try {
    const response = await automationService.control(item, state);
    item.current_state = response.current_state; item.current_state_display = titleCase(response.current_state);
    await refreshStates();
    void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
    const toast = await toastController.create({ message: response.message || `${item.device_name} updated.`, duration: 1800, position: 'top', color: 'success' }); await toast.present();
  } catch (reason) {
    error.value = reason instanceof DeviceUnavailableError ? `${connectivity(item).label} went offline before the command could be completed. The ${item.actuator_type} state is unknown.` : `The ${item.actuator_type} command timed out or failed. Its state could not be confirmed.`;
    void Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
  } finally { busy.value = undefined; pendingState.value = ''; }
}
const refreshScheduler = new RefreshScheduler(refreshStates, 3_000);
const socket = new FarmSocket('sensors', () => refreshScheduler.notify());
function startPage() { void load(); void refreshScheduler.start(false); void socket.connect().catch(() => undefined); }
function stopPage() { refreshScheduler.stop(); socket.close(); busy.value = undefined; pendingState.value = ''; }
onIonViewDidEnter(startPage); onIonViewDidLeave(stopPage); onBeforeUnmount(stopPage);
</script>
