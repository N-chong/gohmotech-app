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
              <article><span class="green"><ion-icon :icon="pawOutline" /></span><small>REGISTERED GOATS</small><strong>{{ reportSummary?.herd.total ?? dashboard?.goats.registered ?? '—' }}</strong><p>Farm inventory</p></article>
              <article><span class="cyan"><ion-icon :icon="radioOutline" /></span><small>BLE DETECTED</small><strong>{{ trackedCount }}</strong><p>Latest receiver scan</p></article>
              <article><span class="gold"><ion-icon :icon="shieldOutline" /></span><small>DETECTIONS</small><strong>{{ reportSummary?.security.total ?? '—' }}</strong><p>{{ reportRangeLabel }}</p></article>
            </div>
            <article class="report-environment-panel">
              <header><div><p class="eyebrow">ENVIRONMENT NOW</p><h2>Goat-house conditions</h2></div><span>{{ dashboard?.environment.updated_at ? relativeTime(dashboard.environment.updated_at) : 'No update' }}</span></header>
              <div class="environment-readouts"><div><ion-icon :icon="thermometerOutline" /><span><small>TEMPERATURE</small><strong>{{ valueWithUnit(dashboard?.environment.temperature, '°C') }}</strong></span></div><div><ion-icon :icon="waterOutline" /><span><small>HUMIDITY</small><strong>{{ valueWithUnit(dashboard?.environment.humidity, '%') }}</strong></span></div><div><ion-icon :icon="sunnyOutline" /><span><small>LIGHT</small><strong>{{ valueWithUnit(dashboard?.environment.light_level, '') }}</strong></span></div></div>
            </article>
          </section>

          <section v-else-if="activeTab === 'environment'" class="report-view">
            <div class="report-section-heading"><div><p class="eyebrow">30-MINUTE SENSOR SUMMARIES</p><h2>Environmental history</h2></div><span>{{ history?.device?.name || 'No sensor' }}</span></div>
            <div class="history-range-rail" aria-label="History range"><button type="button" :class="{ active: historyHours === 24 }" @click="setHistoryHours(24)">24 HOURS</button><button type="button" :class="{ active: historyHours === 168 }" @click="setHistoryHours(168)">7 DAYS</button></div>
            <div class="history-metric-rail" role="tablist" aria-label="Environmental metric"><button v-for="metric in historyMetrics" :key="metric.key" type="button" role="tab" :aria-selected="selectedHistoryMetric === metric.key" :class="{ active: selectedHistoryMetric === metric.key }" @click="selectHistoryMetric(metric.key)"><ion-icon :icon="metric.icon" />{{ metric.label }}</button></div>
            <StatePanel v-if="historyLoading" loading title="Loading sensor history" :message="'Retrieving completed 30-minute summaries for the last ' + (historyHours === 24 ? '24 hours.' : '7 days.')" />
            <StatePanel v-else-if="historyError" tone="danger" title="History unavailable" :message="historyError" :retry="loadHistory" />
            <StatePanel v-else-if="!historyRows.length" title="No completed summaries" message="Historical points appear after the server finishes its first 30-minute aggregation period." />
            <article v-else class="environment-history-card">
              <header><div><span :class="selectedHistoryMetric"><ion-icon :icon="selectedHistoryMeta.icon" /></span><div><small>{{ selectedHistoryMeta.label.toUpperCase() }}</small><h3>{{ historyRangeLabel }}</h3></div></div><b>{{ historyRows.length }} PERIODS</b></header>
              <div class="history-stat-grid"><div><small>AVERAGE</small><strong>{{ formatHistoryValue(historyStats.average) }}</strong></div><div><small>MINIMUM</small><strong>{{ formatHistoryValue(historyStats.minimum) }}</strong></div><div><small>MAXIMUM</small><strong>{{ formatHistoryValue(historyStats.maximum) }}</strong></div></div>
              <div class="environment-history-chart">
                <div class="chart-grid" aria-hidden="true"></div>
                <svg viewBox="0 0 320 140" role="img" :aria-label="selectedHistoryMeta.label + ' averages over ' + historyRangeLabel">
                  <defs><linearGradient id="environmentHistoryArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#20b98a" stop-opacity=".38"/><stop offset="1" stop-color="#20b98a" stop-opacity=".02"/></linearGradient></defs>
                  <line x1="10" y1="16" x2="310" y2="16" /><line x1="10" y1="69" x2="310" y2="69" /><line x1="10" y1="122" x2="310" y2="122" />
                  <polygon :points="historyAreaPoints" fill="url(#environmentHistoryArea)" />
                  <polyline :points="historyChartPoints" />
                </svg>
                <div class="history-axis"><span>{{ historyStartLabel }}</span><small>{{ historyStats.samples }} real samples</small><span>{{ historyEndLabel }}</span></div>
              </div>
              <footer><span><i></i>{{ history?.device?.device_id }}</span><small>Generated {{ relativeTime(history?.generated_at || null) }}</small></footer>
            </article>
          </section>
          <section v-else-if="activeTab === 'herd'" class="report-view">
            <div class="report-section-heading"><div><p class="eyebrow">HERD DISTRIBUTION</p><h2>Complete farm inventory</h2></div><span>{{ reportSummary?.herd.total ?? 0 }} profiles</span></div>
            <article class="distribution-panel">
              <div v-for="row in genderRows" :key="row.label" class="distribution-row"><span><b>{{ row.label }}</b><small>{{ row.value }} goats</small></span><div><i :style="{ width: `${row.percent}%` }"></i></div><strong>{{ row.percent }}%</strong></div>
              <p v-if="!genderRows.length">No goat profiles are currently registered.</p>
            </article>
            <article class="tracking-report-panel"><header><span><ion-icon :icon="radioOutline" /></span><div><p class="eyebrow">BLE COVERAGE</p><h2>Receiver visibility</h2></div></header><div><span><strong>{{ proximityCount('near') }}</strong><small>NEAR</small></span><span><strong>{{ proximityCount('far') }}</strong><small>FAR</small></span><span><strong>{{ notDetectedCount }}</strong><small>NOT DETECTED</small></span></div><router-link to="/app/tracking">OPEN TRACKING RADAR <ion-icon :icon="chevronForwardOutline" /></router-link></article>
          </section>

          <section v-else class="report-view">
            <div class="report-section-heading"><div><p class="eyebrow">SECURITY QUALITY</p><h2>Detection review summary</h2></div><span>{{ reportSummary?.security.total ?? 0 }} events</span></div><div class="history-range-rail" aria-label="Security reporting range"><button type="button" :disabled="reportLoading" :class="{ active: reportHours === 24 }" @click="setReportHours(24)">24 HOURS</button><button type="button" :disabled="reportLoading" :class="{ active: reportHours === 168 }" @click="setReportHours(168)">7 DAYS</button></div>
            <article class="security-report-focus"><div class="confidence-orb" :style="{ '--confidence': `${(averageConfidence ?? 0) * 3.6}deg` }"><strong>{{ averageConfidence ?? '—' }}</strong><small>% AVG</small></div><div><h2>Detection confidence</h2><p>Average across every event in {{ reportRangeLabel.toLowerCase() }}.</p><span>{{ reviewedDetections }} reviewed · {{ pendingDetections }} pending</span></div></article>
            <div class="security-report-list"><article v-for="item in detections?.results.slice(0, 4)" :key="item.id"><span><ion-icon :icon="scanOutline" /></span><div><strong>{{ item.detection_type_display }}</strong><small>{{ item.source_display }} · {{ relativeTime(item.detected_at) }}</small></div><b>{{ Math.round(item.confidence * 100) }}%</b></article><p v-if="!detections?.results.length">No security detection records are available.</p></div>
            <router-link class="report-deep-link" to="/app/security">VIEW SECURITY TIMELINE <ion-icon :icon="chevronForwardOutline" /></router-link>
          </section>

          <section class="report-scope-note"><ion-icon :icon="layersOutline" /><div><strong>Server-verified reporting</strong><p>Herd and security totals are aggregated across complete server records. Environmental history uses completed 30-minute summaries.</p></div></section>
        </template>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonTitle, IonToolbar } from '@ionic/vue';
import { analyticsOutline, chevronForwardOutline, hardwareChipOutline, informationCircleOutline, layersOutline, pawOutline, radioOutline, scanOutline, shieldOutline, statsChartOutline, sunnyOutline, thermometerOutline, waterOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import StatePanel from '@/components/StatePanel.vue';
import { dashboardService } from '@/services/dashboard.service';
import { environmentHistoryService, type EnvironmentHistory, type EnvironmentHistoryHours, type EnvironmentMetricKey } from '@/services/environment-history.service';
import { reportSummaryService, type ReportSummary, type ReportSummaryHours } from '@/services/report-summary.service';
import { securityService, type Detection } from '@/services/security.service';
import { trackingService, type TrackingSnapshot } from '@/services/tracking.service';
import type { ApiPage, DashboardData } from '@/types/api';
import { relativeTime } from '@/utils/format';

const dashboard = ref<DashboardData>();
const reportSummary = ref<ReportSummary>();
const detections = ref<ApiPage<Detection>>();
const tracking = ref<TrackingSnapshot>();
const history = ref<EnvironmentHistory>();
const loading = ref(true);
const error = ref('');
const historyLoading = ref(false);
const historyError = ref('');
const activeTab = ref('overview');
const historyHours = ref<EnvironmentHistoryHours>(24);
const reportHours = ref<ReportSummaryHours>(24);
const reportLoading = ref(false);
const selectedHistoryMetric = ref<EnvironmentMetricKey>('temperature');
let historyController: AbortController | undefined;

const historyMetrics = [
  { key: 'temperature' as const, label: 'Temperature', icon: thermometerOutline, fallbackUnit: '°C' },
  { key: 'humidity' as const, label: 'Humidity', icon: waterOutline, fallbackUnit: '%' },
  { key: 'light_level_percentage' as const, label: 'Light', icon: sunnyOutline, fallbackUnit: '%' },
];
const tabs = [
  { id: 'overview', label: 'Overview', icon: analyticsOutline },
  { id: 'environment', label: 'History', icon: statsChartOutline },
  { id: 'herd', label: 'Herd', icon: pawOutline },
  { id: 'security', label: 'Security', icon: shieldOutline },
];
const hasData = computed(() => Boolean(dashboard.value || reportSummary.value || detections.value || tracking.value || history.value));
const systemPercent = computed(() => dashboard.value?.system.iot_total ? Math.round((dashboard.value.system.iot_online / dashboard.value.system.iot_total) * 100) : 0);
const systemStatus = computed(() => systemPercent.value >= 90 ? 'IoT systems strong' : systemPercent.value >= 60 ? 'Some devices need attention' : dashboard.value ? 'IoT connectivity requires review' : 'Awaiting system data');
const generatedLabel = computed(() => dashboard.value?.generated_at ? `Updated ${relativeTime(dashboard.value.generated_at)}` : 'Awaiting synchronization');
const trackedRows = computed(() => tracking.value?.goats || []);
const trackedCount = computed(() => trackedRows.value.filter((item) => item.status !== 'out_of_range').length);
const notDetectedCount = computed(() => trackedRows.value.filter((item) => item.status === 'out_of_range').length);
const selectedHistoryMeta = computed(() => historyMetrics.find((item) => item.key === selectedHistoryMetric.value) || historyMetrics[0]);
const historyRows = computed(() => history.value?.series[selectedHistoryMetric.value] || []);
const historyRangeLabel = computed(() => historyHours.value === 24 ? 'Last 24 hours' : 'Last 7 days');
const reportRangeLabel = computed(() => reportHours.value === 24 ? 'Last 24 hours' : 'Last 7 days');
const historyStats = computed(() => {
  const rows = historyRows.value;
  const samples = rows.reduce((sum, item) => sum + item.sample_count, 0);
  const average = samples ? rows.reduce((sum, item) => sum + item.average * item.sample_count, 0) / samples : null;
  return {
    average,
    minimum: rows.length ? Math.min(...rows.map((item) => item.minimum)) : null,
    maximum: rows.length ? Math.max(...rows.map((item) => item.maximum)) : null,
    samples,
    unit: rows[0]?.unit || selectedHistoryMeta.value.fallbackUnit,
  };
});
const historyChartPoints = computed(() => {
  const rows = historyRows.value;
  if (!rows.length) return '';
  const minimum = Math.min(...rows.map((item) => item.minimum));
  const maximum = Math.max(...rows.map((item) => item.maximum));
  const span = maximum - minimum || 1;
  return rows.map((item, index) => {
    const x = rows.length === 1 ? 160 : 10 + (index / (rows.length - 1)) * 300;
    const y = 122 - ((item.average - minimum) / span) * 106;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
});
const historyAreaPoints = computed(() => historyChartPoints.value ? `${historyChartPoints.value} 310,122 10,122` : '');
const historyStartLabel = computed(() => formatHistoryDate(historyRows.value[0]?.period_start));
const historyEndLabel = computed(() => formatHistoryDate(historyRows.value.at(-1)?.period_end));
const genderRows = computed(() => (reportSummary.value?.herd.gender || []).map((row) => ({
  label: row.label,
  value: row.count,
  percent: Math.round(row.percent),
})));
const reviewedDetections = computed(() => reportSummary.value?.security.reviewed ?? 0);
const pendingDetections = computed(() => reportSummary.value?.security.unreviewed ?? 0);
const averageConfidence = computed(() => reportSummary.value?.security.average_confidence ?? null);
const valueWithUnit = (value: number | null | undefined, unit: string) => value === null || value === undefined ? '—' : `${value}${unit}`;
const proximityCount = (value: string) => trackedRows.value.filter((item) => item.proximity.toLowerCase().includes(value)).length;

function formatHistoryValue(value: number | null) {
  if (value === null) return '—';
  const digits = selectedHistoryMetric.value === 'temperature' ? 1 : 0;
  return `${value.toFixed(digits)}${historyStats.value.unit}`;
}
function formatHistoryDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, historyHours.value === 24
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric' }).format(new Date(value));
}
function selectTab(tab: string) {
  activeTab.value = tab;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}
function selectHistoryMetric(metric: EnvironmentMetricKey) {
  selectedHistoryMetric.value = metric;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}
async function setHistoryHours(hours: EnvironmentHistoryHours) {
  if (historyHours.value === hours || historyLoading.value) return;
  historyHours.value = hours;
  await loadHistory();
}
async function loadHistory() {
  historyController?.abort();
  const controller = new AbortController();
  historyController = controller;
  historyLoading.value = true;
  historyError.value = '';
  try {
    history.value = await environmentHistoryService.get(historyHours.value, controller.signal);
  } catch {
    if (!controller.signal.aborted) historyError.value = 'Completed environmental summaries could not be retrieved.';
  } finally {
    if (historyController === controller) {
      historyController = undefined;
      historyLoading.value = false;
    }
  }
}
async function setReportHours(hours: ReportSummaryHours) {
  if (reportHours.value === hours || reportLoading.value) return;
  reportHours.value = hours;
  reportLoading.value = true;
  try {
    reportSummary.value = await reportSummaryService.get(hours);
  } catch {
    error.value = 'The selected security summary could not be synchronized.';
  } finally {
    reportLoading.value = false;
  }
}
async function load() {
  loading.value = true;
  error.value = '';
  void loadHistory();
  const results = await Promise.allSettled([dashboardService.get(), reportSummaryService.get(reportHours.value), securityService.list(), trackingService.get()]);
  if (results[0].status === 'fulfilled') dashboard.value = results[0].value;
  if (results[1].status === 'fulfilled') reportSummary.value = results[1].value;
  if (results[2].status === 'fulfilled') detections.value = results[2].value;
  if (results[3].status === 'fulfilled') tracking.value = results[3].value;
  if (results.some((item) => item.status === 'rejected')) error.value = 'One or more live data sources could not be synchronized.';
  loading.value = false;
}
async function refresh(event: CustomEvent) { await load(); (event.target as HTMLIonRefresherElement).complete(); }
onMounted(load);
onBeforeUnmount(() => historyController?.abort());
</script>
