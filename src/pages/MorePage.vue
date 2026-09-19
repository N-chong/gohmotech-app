<template>
  <ion-page class="more-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>System hub</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content pulling-text="SYNC SYSTEM HUB" refreshing-text="Reading farm context…" /></ion-refresher>
      <main class="page-wrap more-shell">
        <section class="hub-profile">
          <div class="hub-pattern" aria-hidden="true"></div><div class="hub-avatar">{{ initials }}</div><div><p>FARM ACCOUNT</p><h1>{{ authState.user?.display_name }}</h1><span><i></i>{{ titleCase(authState.user?.role || '') }}</span></div><ion-icon :icon="shieldCheckmarkOutline" />
        </section>

        <section class="hub-live-strip" aria-label="Current farm summary">
          <div><span><ion-icon :icon="hardwareChipOutline" /></span><strong>{{ dashboard ? `${dashboard.system.iot_online}/${dashboard.system.iot_total}` : '—' }}</strong><small>DEVICES</small></div>
          <div><span><ion-icon :icon="radioOutline" /></span><strong>{{ detectedGoats }}</strong><small>TRACKED</small></div>
          <div><span><ion-icon :icon="notificationsOutline" /></span><strong>{{ unreadAlerts }}</strong><small>UNREAD</small></div>
        </section>
        <p v-if="contextError" class="hub-context-note"><ion-icon :icon="cloudOfflineOutline" />Live context is temporarily unavailable. Navigation remains ready.</p>

        <section class="hub-focus-action">
          <div><p class="eyebrow">QUICK CONTROL</p><h2>Farm operations</h2><span>Door, lighting, and feeding controls</span></div><router-link to="/automation" @click="tapImpact">OPEN CONTROLS <ion-icon :icon="chevronForwardOutline" /></router-link>
        </section>

        <section v-for="group in groups" :key="group.title" class="hub-group">
          <div class="rich-section-heading"><div><p class="eyebrow">{{ group.eyebrow }}</p><h2>{{ group.title }}</h2></div><span>{{ group.items.length }} tools</span></div>
          <div class="hub-grid"><router-link v-for="item in group.items" :key="item.path" :to="item.path" :class="item.color" @click="tapImpact"><span><ion-icon :icon="item.icon" /></span><div><strong>{{ item.title }}</strong><small>{{ item.copy }}</small><em v-if="item.context">{{ item.context }}</em></div><ion-icon :icon="chevronForwardOutline" /></router-link></div>
        </section>

        <section class="hub-group"><div class="rich-section-heading"><div><p class="eyebrow">SESSION</p><h2>Account controls</h2></div></div><button class="hub-signout" type="button" @click="logout"><span><ion-icon :icon="logOutOutline" /></span><div><strong>Sign out securely</strong><small>End this mobile session</small></div><ion-icon :icon="chevronForwardOutline" /></button></section>
        <div class="hub-footer"><span><ion-icon :icon="leafOutline" /></span><div><strong>GoHMoTech Mobile</strong><small>Connected smart-farm operating system</small></div></div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonTitle, IonToolbar } from '@ionic/vue';
import { barChartOutline, chevronForwardOutline, cloudOfflineOutline, hardwareChipOutline, leafOutline, lockClosedOutline, logOutOutline, mapOutline, notificationsOutline, optionsOutline, radioOutline, shieldCheckmarkOutline, storefrontOutline } from 'ionicons/icons';
import { authState } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { alertService } from '@/services/alert.service';
import { dashboardService } from '@/services/dashboard.service';
import { trackingService, type TrackingSnapshot } from '@/services/tracking.service';
import type { DashboardData, Notification } from '@/types/api';
import { titleCase } from '@/utils/format';

const router = useRouter();
const dashboard = ref<DashboardData>();
const tracking = ref<TrackingSnapshot>();
const alerts = ref<Notification[]>([]);
const contextError = ref(false);
const initials = computed(() => authState.user?.display_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'GF');
const detectedGoats = computed(() => tracking.value?.goats.filter((item) => item.status !== 'out_of_range').length ?? '—');
const unreadAlerts = computed(() => alerts.value.filter((item) => !item.is_read).length);
const groups = computed(() => [
  { eyebrow: 'FARM MANAGEMENT', title: 'Operate & understand', items: [
    { path: '/automation', title: 'Automation', copy: 'Door, lighting, and feeding', context: dashboard.value ? `Door ${titleCase(dashboard.value.automation.door?.state || 'unknown')} · Light ${titleCase(dashboard.value.automation.light?.state || 'unknown')}` : '', icon: optionsOutline, color: 'green' },
    { path: '/tracking', title: 'Goat tracking', copy: 'BLE proximity and last seen', context: tracking.value ? `${detectedGoats.value}/${tracking.value.goats.length} tags currently detected` : '', icon: mapOutline, color: 'blue' },
    { path: '/reports', title: 'Farm intelligence', copy: 'Current operational snapshot', context: dashboard.value ? `${dashboard.value.system.iot_online}/${dashboard.value.system.iot_total} IoT devices online` : '', icon: barChartOutline, color: 'cyan' },
  ] },
  { eyebrow: 'SECURITY', title: 'Monitor & protect', items: [
    { path: '/security', title: 'Security center', copy: 'Detections and event details', context: unreadAlerts.value ? `${unreadAlerts.value} unread alert${unreadAlerts.value === 1 ? '' : 's'}` : 'No unread notifications', icon: lockClosedOutline, color: 'navy' },
  ] },
  { eyebrow: 'MARKETPLACE', title: 'Trade & connect', items: [
    { path: '/marketplace', title: 'Marketplace', copy: 'Livestock commerce workspace', context: 'Mobile API integration pending', icon: storefrontOutline, color: 'gold' },
  ] },
]);

function tapImpact() { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
async function loadContext() {
  const results = await Promise.allSettled([dashboardService.get(), trackingService.get(), alertService.list()]);
  if (results[0].status === 'fulfilled') dashboard.value = results[0].value;
  if (results[1].status === 'fulfilled') tracking.value = results[1].value;
  if (results[2].status === 'fulfilled') alerts.value = results[2].value.results;
  contextError.value = results.some((item) => item.status === 'rejected');
}
async function refresh(event: CustomEvent) { await loadContext(); (event.target as HTMLIonRefresherElement).complete(); }
async function logout() { await authService.logout(); await router.replace('/login'); }
onMounted(loadContext);
</script>
