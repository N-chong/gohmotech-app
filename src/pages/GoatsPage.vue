<template>
  <ion-page class="inventory-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Goat inventory</ion-title></ion-toolbar></ion-header>
    <ion-content><ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content pulling-text="SYNC HERD" refreshing-text="Updating livestock…" /></ion-refresher><main class="page-wrap inventory-shell">
      <section class="inventory-hero"><div><p class="eyebrow">LIVESTOCK INTELLIGENCE</p><h1>Every goat.<br><span>One living record.</span></h1><p>Photography, health, weight, and recent detection in one herd surface.</p></div><span><strong>{{ total }}</strong><small>REGISTERED</small></span></section>
      <section class="herd-context-rail"><div><small>VISIBLE</small><strong>{{ visible.length }}</strong></div><div><small>WITH DETECTION</small><strong>{{ recentlySeen }}</strong></div><div><small>NEEDS ATTENTION</small><strong>{{ attentionCount }}</strong></div></section>

      <div class="inventory-search" :class="{ focused: searchFocused }"><ion-searchbar v-model="search" :debounce="350" placeholder="Search ID, name, or tag" @ionInput="load" @ionFocus="searchFocused = true" @ionBlur="searchFocused = false" /></div>
      <div class="inventory-filters" aria-label="Filter goat inventory"><button v-for="item in filters" :key="item.value" type="button" :class="{ active: filter === item.value }" @click="setFilter(item.value)"><ion-icon :icon="item.icon" />{{ item.label }}<span>{{ filterCount(item.value) }}</span></button></div>

      <StatePanel v-if="loading" loading title="Loading goats" message="Retrieving the farm inventory." />
      <StatePanel v-else-if="error" tone="danger" title="Unable to retrieve goat inventory" :message="error" :retry="load" />
      <section v-else-if="!visible.length" class="interactive-herd-empty"><span><ion-icon :icon="searchOutline" /></span><div><small>NO GOATS FOUND</small><h2>No livestock matches this view.</h2><p>Clear the active search or return to the complete herd.</p></div><button type="button" @click="clearFilters">SHOW ALL GOATS</button></section>

      <section v-else class="premium-goat-grid">
        <article v-for="goat in visible" :key="goat.id" class="premium-goat-card tactile-goat-card" tabindex="0" @pointerdown="startLongPress(goat)" @pointerup="finishPress(goat)" @pointercancel="cancelLongPress" @pointerleave="cancelLongPress" @keydown.enter="openProfile(goat)">
          <div class="goat-photo-wrap"><AuthImage :src="goat.cover_image_url" :alt="goat.name || goat.goat_id" /><div class="photo-shade"></div><span class="goat-status" :class="goat.status"><i></i>{{ titleCase(goat.status) }}</span><small>{{ goat.goat_id }}</small><span class="hold-hint"><ion-icon :icon="fingerPrintOutline" />HOLD FOR ACTIONS</span></div>
          <div class="premium-goat-body"><div><div><p>{{ goat.breed_display }}</p><h2>{{ goat.name || 'Unnamed goat' }}</h2></div><span class="goat-open-icon"><ion-icon :icon="chevronForwardOutline" /></span></div><p class="goat-meta"><ion-icon :icon="goat.gender === 'male' ? maleOutline : femaleOutline" />{{ goat.gender_display }} <span>·</span> {{ goat.age }}</p><div class="goat-stat-row"><span><small>LATEST WEIGHT</small><strong>{{ goat.latest_weight?.weight_kg || goat.weight_kg || '—' }}<em> kg</em></strong></span><span><small>HEALTH</small><strong>{{ titleCase(goat.health_status) }}</strong></span></div><div class="detection-foot" :class="{ stale: !goat.last_seen }"><ion-icon :icon="radioOutline" />{{ goat.last_seen ? `Detected ${relativeTime(goat.last_seen)}` : 'No recent detection' }}</div></div>
        </article>
      </section>
    </main></ion-content>

    <ion-modal :is-open="Boolean(selectedGoat)" :initial-breakpoint="0.52" :breakpoints="[0, 0.52, 0.76]" handle-behavior="cycle" @didDismiss="selectedGoat = undefined">
      <ion-content class="goat-action-sheet-content"><section v-if="selectedGoat" class="goat-action-sheet"><header><AuthImage :src="selectedGoat.cover_image_url" :alt="selectedGoat.name || selectedGoat.goat_id" /><div><small>{{ selectedGoat.goat_id }}</small><h2>{{ selectedGoat.name || 'Unnamed goat' }}</h2><p>{{ selectedGoat.breed_display }} · {{ selectedGoat.gender_display }}</p></div><span :class="selectedGoat.status"><i></i>{{ titleCase(selectedGoat.status) }}</span></header><div class="goat-action-facts"><div><small>WEIGHT</small><strong>{{ selectedGoat.latest_weight?.weight_kg || selectedGoat.weight_kg || '—' }} kg</strong></div><div><small>HEALTH</small><strong>{{ titleCase(selectedGoat.health_status) }}</strong></div><div><small>LAST SEEN</small><strong>{{ relativeTime(selectedGoat.last_seen) }}</strong></div></div><button type="button" @click="openProfile(selectedGoat)"><span><ion-icon :icon="personOutline" /></span><div><strong>Open full profile</strong><small>Images, weight, health, and history</small></div><ion-icon :icon="chevronForwardOutline" /></button><button type="button" @click="openTracking"><span><ion-icon :icon="navigateCircleOutline" /></span><div><strong>Open BLE tracking</strong><small>Find this goat in the receiver view</small></div><ion-icon :icon="chevronForwardOutline" /></button><p><ion-icon :icon="informationCircleOutline" />Only actions supported by the current mobile API are shown.</p></section></ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonHeader, IonIcon, IonModal, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { chevronForwardOutline, femaleOutline, fingerPrintOutline, informationCircleOutline, listOutline, maleOutline, navigateCircleOutline, personOutline, radioOutline, searchOutline, warningOutline } from 'ionicons/icons';
import AuthImage from '@/components/AuthImage.vue';
import StatePanel from '@/components/StatePanel.vue';
import { goatService } from '@/services/goat.service';
import type { Goat } from '@/types/api';
import { relativeTime, titleCase } from '@/utils/format';

const router = useRouter(); const goats = ref<Goat[]>([]); const total = ref(0); const search = ref(''); const filter = ref('all'); const loading = ref(true); const error = ref(''); const searchFocused = ref(false); const selectedGoat = ref<Goat>();
const longPressed = ref(false); let pressTimer: number | undefined;
const filters = [{ value: 'all', label: 'All', icon: listOutline }, { value: 'male', label: 'Male', icon: maleOutline }, { value: 'female', label: 'Female', icon: femaleOutline }, { value: 'active', label: 'Active', icon: radioOutline }, { value: 'missing', label: 'Missing', icon: warningOutline }];
const visible = computed(() => goats.value.filter((goat) => filter.value === 'all' || (['male', 'female'].includes(filter.value) ? goat.gender === filter.value : goat.status === filter.value)));
const recentlySeen = computed(() => goats.value.filter((goat) => goat.last_seen).length);
const attentionCount = computed(() => goats.value.filter((goat) => goat.status === 'missing' || !['healthy', 'good', 'normal'].includes(goat.health_status.toLowerCase())).length);
function impact(style = ImpactStyle.Light) { void Haptics.impact({ style }).catch(() => undefined); }
function filterCount(value: string) { return goats.value.filter((goat) => value === 'all' || (['male', 'female'].includes(value) ? goat.gender === value : goat.status === value)).length; }
function setFilter(value: string) { filter.value = value; impact(); }
function clearFilters() { search.value = ''; filter.value = 'all'; void load(); }
function startLongPress(goat: Goat) { longPressed.value = false; pressTimer = window.setTimeout(() => { longPressed.value = true; selectedGoat.value = goat; impact(ImpactStyle.Medium); }, 560); }
function cancelLongPress() { if (pressTimer) window.clearTimeout(pressTimer); }
function finishPress(goat: Goat) { cancelLongPress(); if (!longPressed.value) openProfile(goat); window.setTimeout(() => { longPressed.value = false; }, 0); }
async function openProfile(goat: Goat) { cancelLongPress(); selectedGoat.value = undefined; impact(); await router.push(`/app/goats/${encodeURIComponent(goat.goat_id)}`); }
async function openTracking() { selectedGoat.value = undefined; impact(); await router.push('/app/tracking'); }
async function load() { loading.value = true; error.value = ''; try { const result = await goatService.list(search.value); goats.value = result.results; total.value = result.count; } catch { error.value = 'The livestock inventory could not be retrieved.'; } finally { loading.value = false; } }
async function refresh(event: CustomEvent) { await load(); (event.target as HTMLIonRefresherElement).complete(); }
onMounted(load); onBeforeUnmount(cancelLongPress);
</script>
