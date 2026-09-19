<template>
  <ion-page class="goat-profile-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/goats" /></ion-buttons><ion-title>Goat profile</ion-title></ion-toolbar></ion-header>
    <ion-content><main class="page-wrap profile-shell">
      <StatePanel v-if="loading" loading title="Loading profile" message="Retrieving goat details." />
      <StatePanel v-else-if="error" tone="danger" title="Unable to load goat" :message="error" :retry="load" />
      <template v-else-if="goat">
        <section class="inspectable-profile-hero" @pointerdown="galleryPointerStart" @pointerup="galleryPointerEnd">
          <AuthImage :key="activeImage?.key || 'empty'" :src="activeImage?.src || goat.cover_image_url" :alt="`${goat.name || goat.goat_id} ${activeImage?.label || 'profile'}`" />
          <div class="profile-hero-shade"></div>
          <div class="profile-angle-label"><small>VISUAL IDENTITY</small><strong>{{ activeImage?.label || 'Primary photo' }}</strong></div>
          <div class="profile-identity"><span>{{ goat.goat_id }}</span><h1>{{ goat.name || 'Unnamed goat' }}</h1><p>{{ goat.breed_display }} · {{ goat.gender_display }} · {{ goat.age }}</p></div>
          <span class="profile-status" :class="goat.status"><i></i>{{ titleCase(goat.status) }}</span>
          <div v-if="gallery.length > 1" class="profile-gallery-controls"><button type="button" aria-label="Previous goat angle" @click.stop="changeImage(-1)"><ion-icon :icon="chevronBackOutline" /></button><span><i v-for="(image, index) in gallery" :key="image.key" :class="{ active: index === activeImageIndex }"></i></span><button type="button" aria-label="Next goat angle" @click.stop="changeImage(1)"><ion-icon :icon="chevronForwardOutline" /></button></div>
        </section>
        <div v-if="gallery.length > 1" class="angle-selector" role="tablist" aria-label="Goat image angles"><button v-for="(image, index) in gallery" :key="image.key" type="button" role="tab" :aria-selected="index === activeImageIndex" :class="{ active: index === activeImageIndex }" @click="selectImage(index)">{{ image.label }}</button></div>

        <section class="profile-snapshot"><div><span><ion-icon :icon="scaleOutline" /></span><small>LATEST WEIGHT</small><strong>{{ latestWeight }} kg</strong></div><div><span><ion-icon :icon="heartOutline" /></span><small>HEALTH</small><strong>{{ titleCase(goat.health_status) }}</strong></div><div><span><ion-icon :icon="radioOutline" /></span><small>LAST DETECTED</small><strong>{{ relativeTime(goat.last_seen) }}</strong></div></section>

        <section class="profile-action-rail"><button type="button" @click="openTracking"><span><ion-icon :icon="navigateCircleOutline" /></span><div><small>BLE PROXIMITY</small><strong>Find this goat</strong></div><ion-icon :icon="chevronForwardOutline" /></button><div><small>PROFILE UPDATED</small><strong>{{ relativeTime(goat.last_updated) }}</strong></div></section>

        <section class="profile-section weight-insight"><div class="rich-section-heading"><div><p class="eyebrow">WEIGHT INTELLIGENCE</p><h2>Recorded growth</h2></div><span v-if="weightDelta" :class="numericWeightDelta >= 0 ? 'positive' : 'negative'">{{ weightDelta }} kg</span></div>
          <div v-if="goat.weight_history.length" class="precision-weight-card">
            <header><div><small>LATEST CONFIRMED WEIGHT</small><strong>{{ latestWeight }}<em> KG</em></strong><p>{{ formattedDate(goat.weight_history[0].measured_at) }} · {{ goat.weight_history[0].source_display }}</p></div><span :class="numericWeightDelta >= 0 ? 'up' : 'down'"><ion-icon :icon="numericWeightDelta >= 0 ? trendingUpOutline : trendingDownOutline" />{{ weightNarrative }}</span></header>
            <div class="weight-chart-surface"><div class="chart-grid" aria-hidden="true"></div><svg viewBox="0 0 300 110" role="img" aria-label="Recorded goat weight history"><defs><linearGradient id="weightAreaInteractive" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#19c889" stop-opacity=".36"/><stop offset="1" stop-color="#19c889" stop-opacity="0"/></linearGradient></defs><polygon :points="`${weightPoints} 300,110 0,110`" fill="url(#weightAreaInteractive)"/><polyline :points="weightPoints" fill="none" stroke="#19c889" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><div><span>{{ weightRange.min }} kg</span><small>{{ weights.length }} measurement{{ weights.length === 1 ? '' : 's' }}</small><span>{{ weightRange.max }} kg</span></div></div>
            <div class="weight-history-list"><div v-for="item in goat.weight_history.slice(0, 5)" :key="item.id"><span><i></i>{{ formattedDate(item.measured_at) }}</span><strong>{{ item.weight_kg }} kg</strong><small>{{ item.source_display }}</small></div></div>
          </div>
          <StatePanel v-else title="No weight history" message="Confirmed measurements will appear here. No live scale endpoint is currently available." />
        </section>

        <section class="profile-section goat-activity-section"><div class="rich-section-heading"><div><p class="eyebrow">CONNECTED HISTORY</p><h2>Goat activity</h2></div><span>{{ activity.length }} events</span></div><div class="shared-farm-timeline"><article v-for="item in activity" :key="item.key"><time>{{ formattedTime(item.time) }}</time><span :class="item.tone"><ion-icon :icon="item.icon" /></span><div><strong>{{ item.title }}</strong><p>{{ item.copy }}</p><small>{{ relativeTime(item.time) }}</small></div></article></div></section>

        <section class="profile-section identity-panel livestock-record"><div class="rich-section-heading"><div><p class="eyebrow">LIVESTOCK RECORD</p><h2>Identification & care</h2></div></div><dl><div><dt>Tag number</dt><dd>{{ goat.tag_number || 'Not set' }}</dd></div><div><dt>Color & markings</dt><dd>{{ goat.color_markings || 'Not recorded' }}</dd></div><div><dt>Vaccination</dt><dd>{{ goat.vaccination_status_display }}</dd></div><div><dt>Vaccine</dt><dd>{{ goat.vaccine_name || 'Not recorded' }}</dd></div><div><dt>Next due</dt><dd>{{ goat.next_due_date ? formattedDate(goat.next_due_date) : 'Not scheduled' }}</dd></div><div><dt>Date added</dt><dd>{{ formattedDate(goat.date_added) }}</dd></div></dl><div v-if="goat.health_notes || goat.notes" class="livestock-notes"><ion-icon :icon="documentTextOutline" /><div><strong>Recorded notes</strong><p>{{ goat.health_notes || goat.notes }}</p></div></div></section>
      </template>
    </main></ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { calendarOutline, chevronBackOutline, chevronForwardOutline, documentTextOutline, heartOutline, navigateCircleOutline, radioOutline, scaleOutline, trendingDownOutline, trendingUpOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import AuthImage from '@/components/AuthImage.vue';
import StatePanel from '@/components/StatePanel.vue';
import { goatService } from '@/services/goat.service';
import type { GoatDetail } from '@/types/api';
import { relativeTime, titleCase } from '@/utils/format';

const route = useRoute(); const router = useRouter(); const goat = ref<GoatDetail>(); const loading = ref(true); const error = ref(''); const activeImageIndex = ref(0); const pointerX = ref(0);
const gallery = computed(() => { if (!goat.value) return []; const images = goat.value.images.map((image) => ({ key: String(image.id), src: image.image_url, label: image.angle_display || 'Photo' })); if (!images.length && goat.value.cover_image_url) images.push({ key: 'cover', src: goat.value.cover_image_url, label: 'Primary' }); return images; });
const activeImage = computed(() => gallery.value[activeImageIndex.value]);
const weights = computed(() => (goat.value?.weight_history || []).map((item) => Number(item.weight_kg)).reverse());
const latestWeight = computed(() => goat.value?.weight_history[0]?.weight_kg || goat.value?.latest_weight?.weight_kg || goat.value?.weight_kg || '—');
const numericWeightDelta = computed(() => { const list = weights.value; return list.length < 2 ? 0 : list[list.length - 1] - list[list.length - 2]; });
const weightDelta = computed(() => weights.value.length < 2 ? '' : `${numericWeightDelta.value >= 0 ? '+' : ''}${numericWeightDelta.value.toFixed(1)}`);
const weightNarrative = computed(() => weights.value.length < 2 ? 'FIRST RECORD' : `${numericWeightDelta.value >= 0 ? '+' : ''}${numericWeightDelta.value.toFixed(1)} KG VS PREVIOUS`);
const weightRange = computed(() => ({ min: weights.value.length ? Math.min(...weights.value).toFixed(1) : '—', max: weights.value.length ? Math.max(...weights.value).toFixed(1) : '—' }));
const weightPoints = computed(() => { const list = weights.value.slice(-8); if (!list.length) return ''; const min = Math.min(...list), max = Math.max(...list), range = max - min || 1; return list.map((value, index) => `${list.length === 1 ? 150 : (index / (list.length - 1)) * 300},${92 - ((value - min) / range) * 72}`).join(' '); });
const activity = computed(() => { if (!goat.value) return []; const rows = goat.value.weight_history.slice(0, 4).map((item) => ({ key: `weight-${item.id}`, time: item.measured_at, title: `${item.weight_kg} kg recorded`, copy: item.source_display, icon: scaleOutline, tone: 'green' })); if (goat.value.last_seen) rows.push({ key: 'detected', time: goat.value.last_seen, title: 'Goat detected', copy: 'Latest recorded farm detection', icon: radioOutline, tone: 'blue' }); rows.push({ key: 'added', time: goat.value.date_added, title: 'Profile created', copy: 'Added to the GoHMoTech livestock record', icon: calendarOutline, tone: 'navy' }); return rows.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6); });
function impact() { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
function selectImage(index: number) { activeImageIndex.value = index; impact(); }
function changeImage(direction: number) { if (!gallery.value.length) return; activeImageIndex.value = (activeImageIndex.value + direction + gallery.value.length) % gallery.value.length; impact(); }
function galleryPointerStart(event: PointerEvent) { pointerX.value = event.clientX; }
function galleryPointerEnd(event: PointerEvent) { const distance = event.clientX - pointerX.value; if (Math.abs(distance) > 50) changeImage(distance < 0 ? 1 : -1); }
function formattedDate(value: string) { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
function formattedTime(value: string) { return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
async function openTracking() { impact(); await router.push('/tracking'); }
async function load() { loading.value = true; error.value = ''; try { goat.value = await goatService.detail(String(route.params.goatId)); activeImageIndex.value = 0; } catch { error.value = 'The goat profile could not be retrieved.'; } finally { loading.value = false; } }
onMounted(load);
</script>
