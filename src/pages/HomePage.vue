<template>
  <ion-page>
    <ion-header class="ion-no-border home-header"><ion-toolbar><ion-title><span class="home-brand"><span><img src="/gohmotech-logo.png" alt=""></span><b>GoHMoTech</b></span></ion-title><ion-button class="header-alert-button" slot="end" fill="clear" aria-label="Open farm alerts" router-link="/app/alerts"><ion-icon :icon="notificationsOutline" /><i v-if="data?.alerts.length" aria-hidden="true"></i></ion-button></ion-toolbar></ion-header>
    <ion-content>
      <NetworkBanner />
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content pulling-text="SYNC FARM" refreshing-text="Synchronizing farm…" /></ion-refresher>
      <main class="page-wrap home-dashboard">
        <section class="farm-command-hero" :class="{ degraded: data && !data.system.online }">
          <div class="hero-grid-pattern" aria-hidden="true"></div>
          <div class="hero-topline"><div><p class="hero-kicker">SMART FARM COMMAND</p><time>{{ currentDate }} · {{ currentTime }}</time></div><span class="hero-live-chip" :class="data?.system.online ? 'online' : 'offline'"><i></i>{{ data?.system.online ? 'LIVE' : 'OFFLINE' }}</span></div>
          <div class="hero-copy"><p>Good {{ greeting }}, {{ firstName }}</p><h1>Your farm is speaking.<br><span>Here is what it says.</span></h1></div>
          <button class="system-health-panel" type="button" @click="openHealth">
            <span class="health-icon" :class="{ healthy: farmHealthy }"><ion-icon :icon="farmHealthy ? shieldCheckmarkOutline : alertCircleOutline" /></span>
            <div><small>SYSTEM STATUS · TAP FOR DETAILS</small><strong>{{ systemStatus }}</strong><em>{{ data ? `Synced ${relativeTime(data.generated_at)}` : 'Checking every farm signal…' }}</em></div>
            <ion-icon :icon="chevronForwardOutline" />
          </button>
          <div class="hero-stat-grid"><div><span><ion-icon :icon="hardwareChipOutline" /></span><strong>{{ data?.system.iot_online ?? '—' }}<small>/{{ data?.system.iot_total ?? '—' }}</small></strong><p>IoT online</p></div><div><span><ion-icon :icon="videocamOutline" /></span><strong>{{ data?.system.cameras_online ?? '—' }}<small>/{{ data?.system.cameras_total ?? '—' }}</small></strong><p>Cameras</p></div><div><span><ion-icon :icon="pawOutline" /></span><strong>{{ data?.goats.registered ?? '—' }}</strong><p>Farm goats</p></div></div>
        </section>

        <StatePanel v-if="loading && !data" loading title="Checking the goat house" message="Retrieving current farm conditions." />
        <StatePanel v-else-if="error && !data" tone="danger" title="Cannot connect to GoHMoTech server" :message="error" :retry="load" />

        <template v-else-if="data">
          <section class="dashboard-section living-environment">
            <div class="rich-section-heading"><div><p class="eyebrow">LIVE ENVIRONMENT</p><h2>One sensor surface</h2></div><span><i></i>{{ changedMetric ? 'Value changed' : 'Updating' }}</span></div>
            <div class="environment-console" :class="{ changed: changedMetric === selectedEnvironment }">
              <div class="environment-selector" role="tablist" aria-label="Environmental readings">
                <button v-for="metric in environmentMetrics" :key="metric.key" type="button" role="tab" :aria-selected="selectedEnvironment === metric.key" :class="{ active: selectedEnvironment === metric.key }" @click="selectEnvironment(metric.key)"><ion-icon :icon="metric.icon" />{{ metric.label }}</button>
              </div>
              <div class="environment-reading">
                <div class="environment-value"><small>{{ activeEnvironment.kicker }}</small><strong :key="`${activeEnvironment.key}-${activeEnvironment.value}`">{{ activeEnvironment.display }}</strong><span v-if="activeDelta">{{ activeDelta > 0 ? '+' : '' }}{{ activeDelta.toFixed(1) }}{{ activeEnvironment.suffix }}</span></div>
                <div class="environment-visual" :style="{ '--level': `${activeEnvironment.level}%` }"><div class="sensor-track"><i></i><b></b></div><div><span>LOW</span><span>LIVE RANGE</span><span>HIGH</span></div></div>
                <footer><span><i></i>{{ activeEnvironment.status }}</span><small>Updated {{ relativeTime(data.environment.updated_at) }}</small></footer>
              </div>
              <div class="environment-context"><span><ion-icon :icon="waterOutline" /><small>HUMIDITY</small><strong>{{ value(data.environment.humidity, '%') }}</strong></span><span><ion-icon :icon="sunnyOutline" /><small>LIGHT</small><strong>{{ value(data.environment.light_level, '%') }}</strong></span><router-link to="/automation"><ion-icon :icon="nutritionOutline" /><small>FEED</small><strong>{{ value(data.feed.percentage, '%') }}</strong></router-link></div>
            </div>
          </section>

          <section class="dashboard-section farm-map-section">
            <div class="rich-section-heading"><div><p class="eyebrow">CONNECTED FARM</p><h2>System relationship map</h2></div><span>{{ operationalCount }}/5 signals</span></div>
            <div class="farm-system-map">
              <svg viewBox="0 0 340 250" aria-hidden="true"><path d="M170 125 L67 49 M170 125 L274 49 M170 125 L62 202 M170 125 L279 202" /><path class="signal-flow" d="M170 125 L67 49 M170 125 L274 49 M170 125 L62 202 M170 125 L279 202" /></svg>
              <router-link class="map-node map-controller" to="/automation" @click="lightImpact"><span :class="{ online: data.system.controller_online }"><ion-icon :icon="hardwareChipOutline" /></span><b>CONTROLLER</b><small>{{ data.system.controller_online ? 'ONLINE' : 'OFFLINE' }}</small></router-link>
              <router-link class="map-node map-camera" to="/app/live" @click="lightImpact"><span :class="{ online: data.system.cameras_online > 0 }"><ion-icon :icon="videocamOutline" /></span><b>CAMERAS</b><small>{{ data.system.cameras_online }}/{{ data.system.cameras_total }} ONLINE</small></router-link>
              <router-link class="map-node map-iot" to="/automation" @click="lightImpact"><span :class="{ online: data.system.iot_online > 0 }"><ion-icon :icon="wifiOutline" /></span><b>IOT NETWORK</b><small>{{ data.system.iot_online }}/{{ data.system.iot_total }} ONLINE</small></router-link>
              <router-link class="map-node map-feed" to="/automation" @click="lightImpact"><span :class="{ online: !data.feed.is_low }"><ion-icon :icon="nutritionOutline" /></span><b>FEEDER</b><small>{{ data.feed.is_low ? 'LOW SUPPLY' : 'READY' }}</small></router-link>
              <button class="map-core" type="button" @click="openHealth"><i></i><img src="/gohmotech-logo.png" alt=""><strong>FARM CORE</strong><small>{{ data.system.online ? 'CONNECTED' : 'INTERRUPTED' }}</small></button>
            </div>
          </section>

          <section class="dashboard-section"><div class="rich-section-heading"><div><p class="eyebrow">CONTEXTUAL CONTROL</p><h2>Goat house operations</h2></div><router-link to="/automation">All controls</router-link></div><div class="operation-grid"><router-link class="operation-tile door" to="/automation"><span><ion-icon :icon="enterOutline" /></span><div><small>Goat house door</small><strong>{{ titleCase(data.automation.door?.state || 'unknown') }}</strong></div><ion-icon :icon="chevronForwardOutline" /></router-link><router-link class="operation-tile light" to="/automation"><span><ion-icon :icon="bulbOutline" /></span><div><small>Lighting</small><strong>{{ titleCase(data.automation.light?.state || 'unknown') }}</strong></div><ion-icon :icon="chevronForwardOutline" /></router-link><router-link class="operation-tile camera" to="/app/live"><span><ion-icon :icon="cameraOutline" /></span><div><small>Live monitoring</small><strong>{{ data.system.cameras_online }} online</strong></div><ion-icon :icon="chevronForwardOutline" /></router-link><router-link class="operation-tile security" to="/security"><span><ion-icon :icon="shieldCheckmarkOutline" /></span><div><small>Security</small><strong>{{ criticalAlerts ? `${criticalAlerts} priority alerts` : 'All clear' }}</strong></div><ion-icon :icon="chevronForwardOutline" /></router-link></div></section>

          <section v-if="data.alerts.length" class="dashboard-section alert-section"><div class="rich-section-heading"><div><p class="eyebrow">NEEDS ATTENTION</p><h2>Priority alerts</h2></div><router-link to="/app/alerts">View all</router-link></div><router-link v-for="alert in data.alerts.slice(0, 3)" :key="alert.id" class="dashboard-alert" to="/app/alerts"><span :class="alert.severity"><ion-icon :icon="alertCircleOutline" /></span><div><strong>{{ alert.title }}</strong><small>{{ titleCase(alert.severity) }} · {{ relativeTime(alert.created_at) }}</small></div><ion-icon :icon="chevronForwardOutline" /></router-link></section>
          <section v-else class="dashboard-section farm-clear-state"><span><ion-icon :icon="shieldCheckmarkOutline" /></span><div><small>NO ACTIVE ALERTS</small><strong>All monitored systems are clear.</strong><p>Last system check {{ relativeTime(data.generated_at) }}</p></div><router-link to="/app/alerts">View activity</router-link></section>
        </template>
      </main>
    </ion-content>

    <ion-modal :is-open="healthOpen" :initial-breakpoint="0.68" :breakpoints="[0, 0.68, 0.9]" handle-behavior="cycle" @didDismiss="healthOpen = false">
      <ion-content class="health-sheet-content"><section class="health-sheet"><header><div><small>GOHMO SYSTEM HEALTH</small><h2>{{ operationalCount }}/5 signals operational</h2></div><span :class="{ healthy: farmHealthy }"><i></i>{{ farmHealthy ? 'ALL CLEAR' : 'CHECK SYSTEM' }}</span></header><div class="health-list"><article v-for="item in healthItems" :key="item.label"><span :class="{ online: item.online }"><ion-icon :icon="item.icon" /></span><div><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></div><b :class="{ online: item.online }">{{ item.online ? 'ONLINE' : item.offlineLabel }}</b></article></div><footer><ion-icon :icon="informationCircleOutline" />Values reflect the latest dashboard response. No device state is simulated.</footer></section></ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { IonButton, IonContent, IonHeader, IonIcon, IonModal, IonPage, IonRefresher, IonRefresherContent, IonTitle, IonToolbar } from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { alertCircleOutline, bulbOutline, cameraOutline, chevronForwardOutline, enterOutline, hardwareChipOutline, informationCircleOutline, notificationsOutline, nutritionOutline, pawOutline, shieldCheckmarkOutline, sunnyOutline, thermometerOutline, videocamOutline, waterOutline, wifiOutline } from 'ionicons/icons';
import NetworkBanner from '@/components/NetworkBanner.vue';
import StatePanel from '@/components/StatePanel.vue';
import { dashboardService } from '@/services/dashboard.service';
import { authState } from '@/stores/auth.store';
import type { DashboardData } from '@/types/api';
import { relativeTime, titleCase } from '@/utils/format';
import { FarmSocket } from '@/services/websocket.service';

type EnvironmentKey = 'temperature' | 'humidity' | 'light';
const data = ref<DashboardData>(); const loading = ref(true); const error = ref(''); const now = ref(new Date());
const selectedEnvironment = ref<EnvironmentKey>('temperature'); const changedMetric = ref<EnvironmentKey | null>(null); const deltas = ref<Record<EnvironmentKey, number | null>>({ temperature: null, humidity: null, light: null });
const healthOpen = ref(false); let socket: FarmSocket | undefined; let clockTimer: number | undefined; let changeTimer: number | undefined;
const firstName = computed(() => authState.user?.display_name.split(' ')[0] || 'Owner');
const greeting = computed(() => { const hour = now.value.getHours(); return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'; });
const currentDate = computed(() => new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(now.value));
const currentTime = computed(() => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now.value));
const criticalAlerts = computed(() => data.value?.alerts.filter((item) => ['critical', 'high'].includes(item.severity)).length || 0);
const farmHealthy = computed(() => Boolean(data.value?.system.online && !criticalAlerts.value));
const systemStatus = computed(() => !data.value ? 'Running diagnostics' : !data.value.system.online ? 'Farm connection interrupted' : criticalAlerts.value ? 'Farm needs attention' : 'Farm operating normally');
const value = (item: number | null, suffix: string) => item == null ? '—' : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(item)}${suffix}`;
const environmentMetrics = computed(() => [
  { key: 'temperature' as const, label: 'Temperature', icon: thermometerOutline },
  { key: 'humidity' as const, label: 'Humidity', icon: waterOutline },
  { key: 'light' as const, label: 'Light', icon: sunnyOutline },
]);
const activeEnvironment = computed(() => {
  const environment = data.value!.environment;
  const configs = {
    temperature: { value: environment.temperature, suffix: '°C', max: 45, kicker: 'AMBIENT TEMPERATURE', status: 'LIVE SENSOR READING' },
    humidity: { value: environment.humidity, suffix: '%', max: 100, kicker: 'RELATIVE HUMIDITY', status: 'LIVE MOISTURE READING' },
    light: { value: environment.light_level, suffix: '%', max: 100, kicker: 'AMBIENT LIGHT', status: 'LIVE LIGHT READING' },
  };
  const config = configs[selectedEnvironment.value];
  return { key: selectedEnvironment.value, ...config, display: value(config.value, config.suffix), level: Math.max(0, Math.min(100, ((config.value || 0) / config.max) * 100)) };
});
const activeDelta = computed(() => deltas.value[selectedEnvironment.value]);
const healthItems = computed(() => data.value ? [
  { label: 'Farm server', detail: `Dashboard ${relativeTime(data.value.generated_at)}`, online: data.value.system.online, offlineLabel: 'OFFLINE', icon: wifiOutline },
  { label: 'Main controller', detail: data.value.system.controller_last_seen ? `Seen ${relativeTime(data.value.system.controller_last_seen)}` : 'No recent heartbeat', online: data.value.system.controller_online, offlineLabel: 'OFFLINE', icon: hardwareChipOutline },
  { label: 'IoT network', detail: `${data.value.system.iot_online}/${data.value.system.iot_total} devices online`, online: data.value.system.iot_total > 0 && data.value.system.iot_online === data.value.system.iot_total, offlineLabel: 'PARTIAL', icon: wifiOutline },
  { label: 'Camera network', detail: `${data.value.system.cameras_online}/${data.value.system.cameras_total} cameras online`, online: data.value.system.cameras_total > 0 && data.value.system.cameras_online === data.value.system.cameras_total, offlineLabel: 'PARTIAL', icon: videocamOutline },
  { label: 'Feed reserve', detail: value(data.value.feed.percentage, '%'), online: !data.value.feed.is_low, offlineLabel: 'LOW', icon: nutritionOutline },
] : []);
const operationalCount = computed(() => healthItems.value.filter((item) => item.online).length);
function lightImpact() { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
function selectEnvironment(metric: EnvironmentKey) { selectedEnvironment.value = metric; lightImpact(); }
function openHealth() { healthOpen.value = true; lightImpact(); }
function captureChanges(previous: DashboardData | undefined, next: DashboardData) {
  if (!previous) return;
  const pairs: Array<[EnvironmentKey, number | null, number | null]> = [['temperature', previous.environment.temperature, next.environment.temperature], ['humidity', previous.environment.humidity, next.environment.humidity], ['light', previous.environment.light_level, next.environment.light_level]];
  const changed = pairs.find(([, before, after]) => before != null && after != null && before !== after);
  if (!changed) return;
  deltas.value[changed[0]] = Number((Number(changed[2]) - Number(changed[1])).toFixed(1));
  changedMetric.value = changed[0]; selectedEnvironment.value = changed[0];
  if (changeTimer) window.clearTimeout(changeTimer);
  changeTimer = window.setTimeout(() => { changedMetric.value = null; deltas.value[changed[0]] = null; }, 2400);
}
async function load() { loading.value = true; error.value = ''; try { const next = await dashboardService.get(); captureChanges(data.value, next); data.value = next; } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Unable to retrieve farm status.'; } finally { loading.value = false; } }
async function refresh(event: CustomEvent) { await load(); (event.target as HTMLIonRefresherElement).complete(); }
onMounted(() => { void load(); clockTimer = window.setInterval(() => { now.value = new Date(); }, 30000); socket = new FarmSocket('sensors', () => void load()); void socket.connect().catch(() => undefined); });
onBeforeUnmount(() => { socket?.close(); if (clockTimer) window.clearInterval(clockTimer); if (changeTimer) window.clearTimeout(changeTimer); });
</script>
