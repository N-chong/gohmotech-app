<template>
  <ion-page class="reports-page">
    <ion-header class="ion-no-border reports-header"><ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/more" /></ion-buttons><ion-title>Farm intelligence</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content pulling-text="SYNC FARM DATA" refreshing-text="Building current snapshot…" /></ion-refresher>
      <main class="page-wrap reports-shell">
        <section class="intelligence-hero">
          <div class="intelligence-grid" aria-hidden="true"></div>
          <header><span><ion-icon :icon="analyticsOutline" /></span><div><p>OPERATIONAL SNAPSHOT</p><strong>{{ generatedLabel }}</strong></div><b><i></i>LIVE DATA</b></header>
          <div class="intelligence-score"><div class="score-ring" :style="{ '--score': `${systemPercent * 3.6}deg` }"><span><strong>{{ systemPercent }}</strong><small>%</small></span></div><div><p class="eyebrow">IOT AVAILABILITY</p><h1>{{ systemStatus }}</h1><small>Calculated from the current device snapshot—not historical estimates.</small></div></div>
        </section>

        <StatePanel v-if="loading" loading title="Building farm snapshot" message="Combining dashboard, herd, tracking, and security data." />
        <StatePanel v-else-if="error && !hasData" tone="danger" title="Reports unavailable" :message="error" :retry="load" />
        <template v-else>
          <nav class="report-view-rail" aria-label="Report views"><button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="selectTab(tab.id)"><ion-icon :icon="tab.icon" />{{ tab.label }}</button></nav>
          <p v-if="error" class="partial-data-note"><ion-icon :icon="informationCircleOutline" />Some sources could not be synchronized. Available values are still shown.</p>

          <section v-if="activeTab === 'overview'" class="report-view">
            <div class="report-kpi-grid">
              <article><span class="blue"><ion-icon :icon="hardwareChipOutline" /></span><small>IOT DEVICES</small><strong>{{ dashboard ? `${dashboard.system.iot_online}/${dashboard.system.iot_total}` : '—' }}</strong><p>Currently online</p></article>
              <article><span class="green"><ion-icon :icon="pawOutline" /></span><small>REGISTERED GOATS</small><strong>{{ dashboard?.goats.registered ?? goats?.count ?? '—' }}</strong><p>Farm inventory</p></article>
              <article><span class="cyan"><ion-icon :icon="radioOutline" /></span><small>BLE DETECTED</small><strong>{{ trackedCount }}</strong><p>Latest receiver scan</p></article>
              <article><span class="gold"><ion-icon :icon="shieldOutline" /></span><small>DETECTIONS</small><strong>{{ detections?.count ?? '—' }}</strong><p>Available event records</p></article>
            </div>
            <article class="report-environment-panel">
              <header><div><p class="eyebrow">ENVIRONMENT NOW</p><h2>Goat-house conditions</h2></div><span>{{ dashboard?.environment.updated_at ? relativeTime(dashboard.environment.updated_at) : 'No update' }}</span></header>
              <div class="environment-readouts"><div><ion-icon :icon="thermometerOutline" /><span><small>TEMPERATURE</small><strong>{{ valueWithUnit(dashboard?.environment.temperature, '°C') }}</strong></span></div><div><ion-icon :icon="waterOutline" /><span><small>HUMIDITY</small><strong>{{ valueWithUnit(dashboard?.environment.humidity, '%') }}</strong></span></div><div><ion-icon :icon="sunnyOutline" /><span><small>LIGHT</small><strong>{{ valueWithUnit(dashboard?.environment.light_level, '') }}</strong></span></div></div>
            </article>
          </section>

          <section v-else-if="activeTab === 'herd'" class="report-view">
            <div class="report-section-heading"><div><p class="eyebrow">HERD DISTRIBUTION</p><h2>Loaded inventory records</h2></div><span>{{ goats?.results.length || 0 }} profiles</span></div>
            <article class="distribution-panel">
              <div v-for="row in genderRows" :key="row.label" class="distribution-row"><span><b>{{ row.label }}</b><small>{{ row.value }} goats</small></span><div><i :style="{ width: `${row.percent}%` }"></i></div><strong>{{ row.percent }}%</strong></div>
              <p v-if="!genderRows.length">No goat profiles were returned in the current inventory page.</p>
            </article>
            <article class="tracking-report-panel"><header><span><ion-icon :icon="radioOutline" /></span><div><p class="eyebrow">BLE COVERAGE</p><h2>Receiver visibility</h2></div></header><div><span><strong>{{ proximityCount('near') }}</strong><small>NEAR</small></span><span><strong>{{ proximityCount('far') }}</strong><small>FAR</small></span><span><strong>{{ notDetectedCount }}</strong><small>NOT DETECTED</small></span></div><router-link to="/tracking">OPEN TRACKING RADAR <ion-icon :icon="chevronForwardOutline" /></router-link></article>
          </section>

          <section v-else class="report-view">
            <div class="report-section-heading"><div><p class="eyebrow">SECURITY QUALITY</p><h2>Detection review snapshot</h2></div><span>{{ detections?.results.length || 0 }} loaded</span></div>
            <article class="security-report-focus"><div class="confidence-orb" :style="{ '--confidence': `${averageConfidence * 3.6}deg` }"><strong>{{ averageConfidence }}</strong><small>% AVG</small></div><div><h2>Detection confidence</h2><p>Average across the currently loaded security events.</p><span>{{ reviewedDetections }} reviewed · {{ pendingDetections }} pending</span></div></article>
            <div class="security-report-list"><article v-for="item in detections?.results.slice(0, 4)" :key="item.id"><span><ion-icon :icon="scanOutline" /></span><div><strong>{{ item.detection_type_display }}</strong><small>{{ item.source_display }} · {{ relativeTime(item.detected_at) }}</small></div><b>{{ Math.round(item.confidence * 100) }}%</b></article><p v-if="!detections?.results.length">No security detection records are available.</p></div>
            <router-link class="report-deep-link" to="/security">VIEW SECURITY TIMELINE <ion-icon :icon="chevronForwardOutline" /></router-link>
          </section>

          <section class="report-scope-note"><ion-icon :icon="layersOutline" /><div><strong>Current-state reporting</strong><p>Historical curves and date comparisons remain hidden until the backend provides real time-series data.</p></div></section>
        </template>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonTitle, IonToolbar } from '@ionic/vue';
import { analyticsOutline, chevronForwardOutline, hardwareChipOutline, informationCircleOutline, layersOutline, pawOutline, radioOutline, scanOutline, shieldOutline, sunnyOutline, thermometerOutline, waterOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import StatePanel from '@/components/StatePanel.vue';
import { dashboardService } from '@/services/dashboard.service';
import { goatService } from '@/services/goat.service';
import { securityService, type Detection } from '@/services/security.service';
import { trackingService, type TrackingSnapshot } from '@/services/tracking.service';
import type { ApiPage, DashboardData, Goat } from '@/types/api';
import { relativeTime, titleCase } from '@/utils/format';

const dashboard = ref<DashboardData>();
const goats = ref<ApiPage<Goat>>();
const detections = ref<ApiPage<Detection>>();
const tracking = ref<TrackingSnapshot>();
const loading = ref(true);
const error = ref('');
const activeTab = ref('overview');
const tabs = [
  { id: 'overview', label: 'Overview', icon: analyticsOutline },
  { id: 'herd', label: 'Herd', icon: pawOutline },
  { id: 'security', label: 'Security', icon: shieldOutline },
];
const hasData = computed(() => Boolean(dashboard.value || goats.value || detections.value || tracking.value));
const systemPercent = computed(() => dashboard.value?.system.iot_total ? Math.round((dashboard.value.system.iot_online / dashboard.value.system.iot_total) * 100) : 0);
const systemStatus = computed(() => systemPercent.value >= 90 ? 'IoT systems strong' : systemPercent.value >= 60 ? 'Some devices need attention' : dashboard.value ? 'IoT connectivity requires review' : 'Awaiting system data');
const generatedLabel = computed(() => dashboard.value?.generated_at ? `Updated ${relativeTime(dashboard.value.generated_at)}` : 'Awaiting synchronization');
const trackedRows = computed(() => tracking.value?.goats || []);
const trackedCount = computed(() => trackedRows.value.filter((item) => item.status !== 'out_of_range').length);
const notDetectedCount = computed(() => trackedRows.value.filter((item) => item.status === 'out_of_range').length);
const genderRows = computed(() => {
  const rows = new Map<string, number>();
  for (const goat of goats.value?.results || []) rows.set(goat.gender_display || titleCase(goat.gender || 'unknown'), (rows.get(goat.gender_display || titleCase(goat.gender || 'unknown')) || 0) + 1);
  const total = goats.value?.results.length || 0;
  return [...rows.entries()].map(([label, value]) => ({ label, value, percent: total ? Math.round((value / total) * 100) : 0 }));
});
const reviewedDetections = computed(() => detections.value?.results.filter((item) => item.review_state === 'reviewed').length || 0);
const pendingDetections = computed(() => (detections.value?.results.length || 0) - reviewedDetections.value);
const averageConfidence = computed(() => {
  const rows = detections.value?.results || [];
  return rows.length ? Math.round(rows.reduce((sum, item) => sum + item.confidence, 0) / rows.length * 100) : 0;
});
const valueWithUnit = (value: number | null | undefined, unit: string) => value === null || value === undefined ? '—' : `${value}${unit}`;
const proximityCount = (value: string) => trackedRows.value.filter((item) => item.proximity.toLowerCase().includes(value)).length;

function selectTab(tab: string) {
  activeTab.value = tab;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

async function load() {
  loading.value = true;
  error.value = '';
  const results = await Promise.allSettled([dashboardService.get(), goatService.list(), securityService.list(), trackingService.get()]);
  if (results[0].status === 'fulfilled') dashboard.value = results[0].value;
  if (results[1].status === 'fulfilled') goats.value = results[1].value;
  if (results[2].status === 'fulfilled') detections.value = results[2].value;
  if (results[3].status === 'fulfilled') tracking.value = results[3].value;
  if (results.some((item) => item.status === 'rejected')) error.value = 'One or more live data sources could not be synchronized.';
  loading.value = false;
}
async function refresh(event: CustomEvent) { await load(); (event.target as HTMLIonRefresherElement).complete(); }
onMounted(load);
</script>
