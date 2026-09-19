<template>
  <ion-page class="tracking-page">
    <ion-header class="ion-no-border tracking-header"><ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/more" /></ion-buttons><ion-title>Goat tracking</ion-title></ion-toolbar></ion-header>
    <ion-content><ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content pulling-text="SCAN RECEIVERS" refreshing-text="Reading BLE signals…" /></ion-refresher><main class="page-wrap tracking-shell">
      <section class="tracking-intro"><div><p class="eyebrow">BLE PROXIMITY</p><h1>Herd signal radar.</h1><p>Receiver-based presence without pretending to provide GPS location.</p></div><span><ion-icon :icon="bluetoothOutline" /></span></section>
      <StatePanel v-if="loading" loading title="Locating tagged goats" message="Reading the latest BLE receiver observations." />
      <StatePanel v-else-if="error" tone="danger" title="Tracking unavailable" :message="error" :retry="load" />
      <template v-else-if="snapshot">
        <section class="proximity-radar-section interactive-radar"><div class="radar-heading"><span><i></i>LIVE RECEIVER VIEW</span><small>{{ snapshot.generated_at ? `Updated ${relativeTime(snapshot.generated_at)}` : 'Near / Far categories' }}</small></div>
          <div class="ble-radar"><div class="radar-sweep"></div><i class="ring one"></i><i class="ring two"></i><i class="ring three"></i><button class="radar-center" type="button" aria-label="BLE receiver center" @click="selectedTracker = undefined"><ion-icon :icon="radioOutline" /><small>RECEIVER</small></button><button v-for="(item, index) in radarItems" :key="item.beacon.id" type="button" class="radar-goat" :class="[item.status, { selected: selectedTracker?.beacon.id === item.beacon.id }]" :style="radarStyle(item.status, index, radarItems.length)" :aria-label="`${item.goat.name || item.goat.goat_id}, ${item.proximity_display}`" @click="selectTracker(item)"><b>{{ item.goat.name?.slice(0, 1) || 'G' }}</b><small>{{ item.proximity_display }}</small></button></div>
          <div class="radar-legend"><span><i class="near"></i>Near</span><span><i class="far"></i>Far</span><span><i class="lost"></i>Not detected</span></div>
          <article v-if="selectedTracker" class="selected-tracker-panel"><button type="button" aria-label="Dismiss selected tracker" @click="selectedTracker = undefined"><ion-icon :icon="closeOutline" /></button><div class="selected-tracker-title"><span><ion-icon :icon="radioOutline" /><i></i></span><div><small>{{ selectedTracker.goat.goat_id }}</small><h2>{{ selectedTracker.goat.name || 'Unnamed goat' }}</h2><p>{{ selectedTracker.proximity_display }} · {{ selectedTracker.status_display }}</p></div></div><div class="selected-tracker-data"><div><small>RECEIVER</small><strong>{{ selectedTracker.receiver?.name || 'Not detected' }}</strong></div><div><small>LOCATION</small><strong>{{ selectedTracker.receiver?.location || 'Unavailable' }}</strong></div><div><small>SIGNAL</small><strong>{{ selectedTracker.current_rssi !== null ? `${selectedTracker.current_rssi} dBm` : 'No reading' }}</strong></div><div><small>LAST SEEN</small><strong>{{ relativeTime(selectedTracker.last_seen) }}</strong></div></div><router-link :to="`/app/goats/${encodeURIComponent(selectedTracker.goat.goat_id)}`">OPEN GOAT PROFILE <ion-icon :icon="chevronForwardOutline" /></router-link></article>
        </section>

        <section class="tracking-summary"><div v-for="(summaryValue, key) in snapshot.summary" :key="key"><strong>{{ summaryValue }}</strong><small>{{ titleCase(String(key)) }}</small></div></section>
        <section class="tracking-cards"><div class="rich-section-heading"><div><p class="eyebrow">TAGGED HERD</p><h2>Signal details</h2></div><span>{{ snapshot.goats.length }} tags</span></div><article v-for="item in snapshot.goats" :key="item.beacon.id" :class="[item.status, { selected: selectedTracker?.beacon.id === item.beacon.id }]" role="button" tabindex="0" @click="selectTracker(item)" @keydown.enter="selectTracker(item)"><span class="tracker-beacon"><ion-icon :icon="radioOutline" /><i></i></span><div class="tracker-main"><small>{{ item.goat.goat_id }}</small><h3>{{ item.goat.name || 'Unnamed goat' }}</h3><p>{{ item.receiver?.location || 'No receiver' }} · {{ item.proximity_display }}</p><time>Last seen {{ relativeTime(item.last_seen) }}</time></div><div class="tracker-data"><b>{{ item.status_display }}</b><span v-if="item.current_rssi !== null">{{ item.current_rssi }} dBm</span><span v-if="item.beacon.battery_level !== null"><ion-icon :icon="batteryHalfOutline" />{{ item.beacon.battery_level }}%</span></div></article><section v-if="!snapshot.goats.length" class="tracking-empty"><ion-icon :icon="bluetoothOutline" /><div><strong>No tagged goats detected</strong><p>The BLE snapshot contains no assigned livestock trackers.</p></div></section></section>
      </template>
    </main></ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonTitle, IonToolbar } from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { batteryHalfOutline, bluetoothOutline, chevronForwardOutline, closeOutline, radioOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import StatePanel from '@/components/StatePanel.vue';
import { trackingService, type TrackingRow, type TrackingSnapshot } from '@/services/tracking.service';
import { relativeTime, titleCase } from '@/utils/format';

const snapshot = ref<TrackingSnapshot>(); const loading = ref(true); const error = ref(''); const selectedTracker = ref<TrackingRow>();
const radarItems = computed(() => (snapshot.value?.goats || []).slice(0, 6));
const radarStyle = (status: string, index: number, total: number) => ({ '--angle': `${(index / Math.max(total, 1)) * 360}deg`, '--distance': status === 'out_of_range' ? '104px' : status.includes('far') ? '78px' : '52px' });
function selectTracker(item: TrackingRow) { selectedTracker.value = item; void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
async function load() { loading.value = true; error.value = ''; try { snapshot.value = await trackingService.get(); if (selectedTracker.value) selectedTracker.value = snapshot.value.goats.find((item) => item.beacon.id === selectedTracker.value?.beacon.id); } catch { error.value = 'The BLE tracking snapshot could not be retrieved.'; } finally { loading.value = false; } }
async function refresh(event: CustomEvent) { await load(); (event.target as HTMLIonRefresherElement).complete(); }
onMounted(load);
</script>
