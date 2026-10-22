<template>
  <ion-page class="feeding-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/more" /></ion-buttons><ion-title>Feeding</ion-title></ion-toolbar></ion-header>
    <ion-content><NetworkBanner :last-updated-at="lastUpdatedAt" :retry="load" :busy="loading" /><main class="page-wrap feeding-shell">
      <section class="feeding-hero" :class="{ low: primaryLevel?.is_low }">
        <div><p class="eyebrow">FEEDING OPERATIONS</p><h1>Feed supply<br><span>and schedules.</span></h1><p>{{ canManage ? 'Protected controls enabled' : 'Monitoring access' }}</p></div>
        <div class="feed-gauge" :style="{ '--fill': `${levelPercent}%` }"><span><strong>{{ Math.round(levelPercent) }}%</strong><small>FULL</small></span></div>
      </section>

      <StatePanel v-if="loading" loading title="Loading feeding system" message="Reading feeder level, schedules, and history." />
      <StatePanel v-else-if="error && !primaryLevel" tone="danger" title="Feeding data unavailable" :message="error" :retry="load" />
      <template v-else>
        <div v-if="!canManage" class="automation-access-note"><ion-icon :icon="lockClosedOutline" /><div><strong>View-only feeding access</strong><p>Farm Owners and administrators can dispense feed or change schedules.</p></div></div>
        <div v-if="error" class="automation-command-error" role="alert"><ion-icon :icon="alertCircleOutline" />{{ error }}</div>

        <section class="feeding-level-card">
          <header><div><small>{{ primaryLevel?.feeder_name || 'FEEDER' }}</small><h2>{{ primaryLevel?.is_low ? 'Low feed level' : 'Supply available' }}</h2></div><span :class="connectivityState"><i></i>{{ connectivityState.toUpperCase() }}</span></header>
          <div class="feeding-level-metrics"><div><small>REMAINING</small><strong>{{ kilograms(primaryLevel?.current_level_grams) }} kg</strong></div><div><small>CAPACITY</small><strong>{{ kilograms(primaryLevel?.capacity_grams) }} kg</strong></div><div><small>UPDATED</small><strong>{{ relativeTime(primaryLevel?.updated_at) }}</strong></div></div>
          <p v-if="primaryLevel?.is_low" class="feeding-warning"><ion-icon :icon="warningOutline" />Below the configured {{ kilograms(primaryLevel.low_level_threshold) }} kg threshold.</p>
          <button v-if="canManage" type="button" class="feeding-secondary-action" :disabled="Boolean(busy) || !primaryLevel" @click="confirmRefill"><ion-icon :icon="refreshOutline" />MARK AS REFILLED</button>
        </section>

        <section class="feeding-command-card">
          <div><p class="eyebrow">MANUAL DISPENSE</p><h2>Send one feed request</h2><p>The request remains pending until the feeder controller confirms execution.</p></div>
          <label><span>AMOUNT (GRAMS)</span><input v-model.number="manualAmount" type="number" min="1" max="10000" inputmode="numeric" /></label>
          <button type="button" :disabled="!canManage || !feederOnline || Boolean(busy) || !primaryLevel" @click="confirmManualFeed"><ion-icon :icon="nutritionOutline" />{{ busy === 'feed' ? 'SENDING…' : 'DISPENSE FEED' }}</button>
          <small v-if="!feederOnline"><ion-icon :icon="cloudOfflineOutline" />Feeder controller must be online before a command can be created.</small>
        </section>

        <section class="feeding-auto-card">
          <div><span><ion-icon :icon="timerOutline" /></span><div><small>AUTOMATED FEEDING</small><strong>{{ config?.is_enabled ? 'Enabled' : 'Paused' }}</strong><p>Master switch for active feeding schedules.</p></div></div>
          <ion-toggle :checked="config?.is_enabled" :disabled="!canManage || Boolean(busy)" aria-label="Toggle automated feeding" @ionChange="confirmAutomationToggle" />
        </section>

        <section class="feeding-section">
          <div class="rich-section-heading"><div><p class="eyebrow">SCHEDULE</p><h2>Feeding times</h2></div><button v-if="canManage && primaryLevel" type="button" @click="startNewSchedule"><ion-icon :icon="addOutline" /> ADD</button></div>
          <form v-if="editing" class="feeding-schedule-form" @submit.prevent="saveSchedule">
            <header><strong>{{ editing.id ? 'Edit schedule' : 'New schedule' }}</strong><button type="button" @click="editing = undefined">CANCEL</button></header>
            <div class="feeding-form-grid"><label><span>TIME</span><input v-model="editing.time" required type="time" /></label><label><span>AMOUNT (G)</span><input v-model.number="editing.amount" required type="number" min="1" max="10000" /></label></div>
            <div class="feeding-day-picker"><button v-for="day in days" :key="day.value" type="button" :class="{ active: editing.days.includes(day.value) }" @click="toggleDay(day.value)">{{ day.short }}</button></div>
            <button class="feeding-save" type="submit" :disabled="Boolean(busy) || !editing.days.length">{{ busy === 'schedule' ? 'SAVING…' : 'SAVE SCHEDULE' }}</button>
          </form>
          <div v-if="schedules.length" class="feeding-schedule-list">
            <article v-for="schedule in schedules" :key="schedule.id" :class="{ paused: !schedule.is_active }"><span><strong>{{ displayTime(schedule.schedule_time) }}</strong><small>{{ schedule.amount_grams }} g</small></span><div><strong>{{ schedule.feeder_name }}</strong><small>{{ displayDays(schedule.days_of_week) }}</small></div><div v-if="canManage" class="feeding-row-actions"><button type="button" @click="editSchedule(schedule)"><ion-icon :icon="createOutline" /></button><button type="button" @click="toggleSchedule(schedule)"><ion-icon :icon="schedule.is_active ? pauseOutline : playOutline" /></button><button type="button" class="danger" @click="removeSchedule(schedule)"><ion-icon :icon="trashOutline" /></button></div><em v-else>{{ schedule.is_active ? 'ACTIVE' : 'PAUSED' }}</em></article>
          </div>
          <StatePanel v-else title="No feeding schedules" message="Create a schedule after a feeder has been configured." />
        </section>

        <section class="feeding-section feeding-history">
          <div class="rich-section-heading"><div><p class="eyebrow">HISTORY</p><h2>Recent feed events</h2></div><span>{{ logs.length }} events</span></div>
          <div v-if="logs.length" class="feeding-log-list"><article v-for="log in logs" :key="log.id"><span :class="log.status"><ion-icon :icon="log.status === 'success' ? checkmarkOutline : log.status === 'failed' ? closeOutline : timeOutline" /></span><div><strong>{{ log.amount_dispensed }} g · {{ titleCase(log.feeding_mode) }}</strong><p>{{ titleCase(log.trigger_reason) }}</p><small>{{ log.feeder_name }} · {{ relativeTime(log.timestamp) }}</small></div><em :class="log.status">{{ log.status.toUpperCase() }}</em></article></div>
          <StatePanel v-else title="No feed history" message="Dispense events will appear here." />
        </section>
      </template>
    </main></ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { alertController, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToggle, IonToolbar, onIonViewDidEnter, onIonViewDidLeave, toastController } from '@ionic/vue';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { addOutline, alertCircleOutline, checkmarkOutline, cloudOfflineOutline, closeOutline, createOutline, lockClosedOutline, nutritionOutline, pauseOutline, playOutline, refreshOutline, timeOutline, timerOutline, trashOutline, warningOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import NetworkBanner from '@/components/NetworkBanner.vue';
import StatePanel from '@/components/StatePanel.vue';
import { automationService, type Actuator } from '@/services/automation.service';
import { feedingService, type FeedLevel, type FeedLog, type FeedSchedule, type FeedingConfig } from '@/services/feeding.service';
import { actuatorConnectivity, canControlActuator } from '@/stores/device.store';
import { authState } from '@/stores/auth.store';
import { relativeTime, titleCase } from '@/utils/format';

const config = ref<FeedingConfig>(); const levels = ref<FeedLevel[]>([]); const schedules = ref<FeedSchedule[]>([]); const logs = ref<FeedLog[]>([]); const actuators = ref<Actuator[]>([]);
const loading = ref(true); const error = ref(''); const busy = ref<string>(); const manualAmount = ref(500); const lastUpdatedAt = ref<string | null>(null); const editing = ref<{ id?: number; time: string; amount: number; days: number[]; active: boolean }>();
let controller: AbortController | undefined; let active = false;
const days = [{ value: 0, short: 'S', name: 'Sun' }, { value: 1, short: 'M', name: 'Mon' }, { value: 2, short: 'T', name: 'Tue' }, { value: 3, short: 'W', name: 'Wed' }, { value: 4, short: 'T', name: 'Thu' }, { value: 5, short: 'F', name: 'Fri' }, { value: 6, short: 'S', name: 'Sat' }];
const canManage = computed(() => Boolean(authState.user?.permissions.manage_farm));
const primaryLevel = computed(() => levels.value[0]);
const feederActuator = computed(() => actuators.value.find((item) => item.actuator_type === 'feeder' && (!primaryLevel.value || item.device === primaryLevel.value.feeder)) || actuators.value.find((item) => item.actuator_type === 'feeder'));
const feederOnline = computed(() => Boolean(feederActuator.value && canControlActuator(feederActuator.value)));
const connectivityState = computed(() => feederActuator.value ? actuatorConnectivity(feederActuator.value).state : 'unknown');
const levelPercent = computed(() => Math.max(0, Math.min(100, Number(primaryLevel.value?.percentage_full ?? primaryLevel.value?.percentage ?? 0))));
const kilograms = (grams?: number) => ((grams || 0) / 1000).toFixed(1);
const displayTime = (value: string) => { const [hour, minute] = value.split(':').map(Number); const date = new Date(); date.setHours(hour, minute); return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
const displayDays = (values: number[]) => values.length === 7 ? 'Every day' : values.map((value) => days.find((day) => day.value === value)?.name).filter(Boolean).join(', ');
const reasonMessage = (reason: unknown) => reason instanceof Error ? reason.message : 'The feeding request could not be completed.';

async function load() {
  controller?.abort(); controller = new AbortController(); loading.value = true; error.value = '';
  try {
    const [snapshot, actuatorResponse] = await Promise.all([feedingService.snapshot(controller.signal), automationService.list(controller.signal)]);
    if (!active || controller.signal.aborted) return;
    config.value = snapshot.config; levels.value = snapshot.levels; schedules.value = snapshot.schedules; logs.value = snapshot.logs; actuators.value = actuatorResponse.results; lastUpdatedAt.value = new Date().toISOString();
  } catch (reason) { if (active && !controller.signal.aborted) error.value = reasonMessage(reason); }
  finally { if (controller && !controller.signal.aborted) loading.value = false; }
}
async function refreshAfterMutation(message: string) { await load(); const toast = await toastController.create({ message, duration: 1900, position: 'top', color: 'success' }); await toast.present(); }
async function confirmManualFeed() {
  if (!primaryLevel.value || !feederOnline.value || manualAmount.value < 1) return;
  const alert = await alertController.create({ header: `Dispense ${manualAmount.value} g?`, message: 'This sends a physical command to the online feeder. The event remains pending until device confirmation.', buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Send command', role: 'confirm' }] });
  await alert.present(); if ((await alert.onDidDismiss()).role !== 'confirm') return;
  busy.value = 'feed'; error.value = '';
  try { await feedingService.manualFeed(primaryLevel.value.feeder, manualAmount.value); void Haptics.notification({ type: NotificationType.Success }); await refreshAfterMutation('Feed request sent. Awaiting controller confirmation.'); }
  catch (reason) { error.value = reasonMessage(reason); void Haptics.notification({ type: NotificationType.Warning }); }
  finally { busy.value = undefined; }
}
async function confirmRefill() {
  if (!primaryLevel.value) return;
  const alert = await alertController.create({ header: 'Mark feeder as full?', message: `Set the recorded supply to ${kilograms(primaryLevel.value.capacity_grams)} kg. Only continue after physically refilling it.`, buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Mark full', role: 'confirm' }] });
  await alert.present(); if ((await alert.onDidDismiss()).role !== 'confirm') return;
  busy.value = 'refill'; try { await feedingService.refill(primaryLevel.value.id, primaryLevel.value.capacity_grams); await refreshAfterMutation('Feeder marked as refilled.'); } catch (reason) { error.value = reasonMessage(reason); } finally { busy.value = undefined; }
}
async function confirmAutomationToggle(event: CustomEvent) {
  const toggle = event.target as HTMLIonToggleElement; toggle.checked = Boolean(config.value?.is_enabled);
  if (!canManage.value) return;
  const next = !config.value?.is_enabled; const alert = await alertController.create({ header: `${next ? 'Enable' : 'Pause'} automated feeding?`, message: next ? 'Active schedules may dispense feed at their configured times.' : 'Scheduled dispensing will be paused until automation is enabled again.', buttons: [{ text: 'Cancel', role: 'cancel' }, { text: next ? 'Enable' : 'Pause', role: 'confirm' }] });
  await alert.present(); if ((await alert.onDidDismiss()).role !== 'confirm') return;
  busy.value = 'automation'; try { const result = await feedingService.toggleAutomation(); if (config.value) config.value.is_enabled = result.is_enabled; await refreshAfterMutation(result.message); } catch (reason) { error.value = reasonMessage(reason); } finally { busy.value = undefined; }
}
function startNewSchedule() { editing.value = { time: '07:00', amount: 500, days: [0, 1, 2, 3, 4, 5, 6], active: true }; }
function editSchedule(item: FeedSchedule) { editing.value = { id: item.id, time: item.schedule_time.slice(0, 5), amount: item.amount_grams, days: [...item.days_of_week], active: item.is_active }; }
function toggleDay(day: number) { if (!editing.value) return; editing.value.days = editing.value.days.includes(day) ? editing.value.days.filter((item) => item !== day) : [...editing.value.days, day].sort(); }
async function saveSchedule() {
  if (!editing.value || !primaryLevel.value || !editing.value.days.length || editing.value.amount < 1) return;
  busy.value = 'schedule'; const payload = { feeder: primaryLevel.value.feeder, schedule_time: editing.value.time, amount_grams: editing.value.amount, days_of_week: editing.value.days, is_active: editing.value.active };
  try { if (editing.value.id) await feedingService.updateSchedule(editing.value.id, payload); else await feedingService.createSchedule(payload); editing.value = undefined; await refreshAfterMutation('Feeding schedule saved.'); } catch (reason) { error.value = reasonMessage(reason); } finally { busy.value = undefined; }
}
async function toggleSchedule(item: FeedSchedule) { busy.value = `toggle-${item.id}`; try { await feedingService.toggleSchedule(item.id); await refreshAfterMutation(`Schedule ${item.is_active ? 'paused' : 'activated'}.`); } catch (reason) { error.value = reasonMessage(reason); } finally { busy.value = undefined; } }
async function removeSchedule(item: FeedSchedule) {
  const alert = await alertController.create({ header: 'Delete feeding schedule?', message: `${displayTime(item.schedule_time)} · ${item.amount_grams} g will be permanently removed.`, buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Delete', role: 'destructive' }] }); await alert.present(); if ((await alert.onDidDismiss()).role !== 'destructive') return;
  busy.value = `delete-${item.id}`; try { await feedingService.removeSchedule(item.id); await refreshAfterMutation('Feeding schedule deleted.'); } catch (reason) { error.value = reasonMessage(reason); } finally { busy.value = undefined; }
}
function start() { active = true; void load(); }
function stop() { active = false; controller?.abort(); controller = undefined; loading.value = false; busy.value = undefined; }
onIonViewDidEnter(start); onIonViewDidLeave(stop); onBeforeUnmount(stop);
</script>