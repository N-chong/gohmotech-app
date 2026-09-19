<template>
  <ion-page class="security-page">
    <ion-header class="ion-no-border security-header">
      <ion-toolbar>
        <ion-buttons slot="start"><AppBackButton fallback="/app/more" /></ion-buttons>
        <ion-title>Security center</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="refresh">
        <ion-refresher-content pulling-text="SYNC SECURITY" refreshing-text="Reviewing detections…" />
      </ion-refresher>
      <main class="page-wrap security-shell">
        <section class="security-hero">
          <div class="security-grid" aria-hidden="true"></div>
          <span class="security-shield"><ion-icon :icon="shieldCheckmarkOutline" /></span>
          <div>
            <p class="eyebrow">INTELLIGENT MONITORING</p>
            <h1>{{ events.length ? 'Farm activity monitored' : 'All clear' }}</h1>
            <p>{{ events.length ? `${events.length} recent detection event${events.length === 1 ? '' : 's'} available for review.` : 'No recent security detections require review.' }}</p>
          </div>
          <span class="security-live"><i></i>MONITORING</span>
        </section>

        <StatePanel v-if="loading" loading title="Loading security events" message="Retrieving recent detections." />
        <StatePanel v-else-if="error" tone="danger" title="Security events unavailable" :message="error" :retry="load" />
        <template v-else>
          <section class="security-kpis">
            <div><strong>{{ events.length }}</strong><small>Recent events</small></div>
            <div><strong>{{ highConfidence }}</strong><small>High confidence</small></div>
            <div><strong>{{ reviewedCount }}</strong><small>Reviewed</small></div>
          </section>

          <section class="security-timeline">
            <div class="rich-section-heading">
              <div><p class="eyebrow">EVENT TIMELINE</p><h2>Recent activity</h2></div>
              <span>{{ events.length }} events</span>
            </div>

            <article v-for="item in events" :key="item.id" class="security-event-card" :class="{ expanded: expandedEventId === item.id }">
              <button class="security-event-summary" type="button" :aria-expanded="expandedEventId === item.id" @click="toggleEvent(item.id)">
                <div class="security-event-image">
                  <AuthImage v-if="item.snapshot_url" :src="item.snapshot_url" :alt="item.detection_type_display" />
                  <ion-icon v-else :icon="personOutline" />
                  <span>{{ confidencePercent(item.confidence) }}%</span>
                </div>
                <div class="security-event-body">
                  <div><span class="event-type"><ion-icon :icon="scanOutline" />{{ item.detection_type_display }}</span><time>{{ relativeTime(item.detected_at) }}</time></div>
                  <h2>{{ item.source_display }}</h2>
                  <p><ion-icon :icon="cameraOutline" />{{ item.status_display }}</p>
                  <span class="review-badge" :class="item.review_state">{{ titleCase(item.review_state) }}</span>
                </div>
                <ion-icon class="security-expand-icon" :icon="chevronDownOutline" />
              </button>

              <div v-if="expandedEventId === item.id" class="security-event-details">
                <AuthImage v-if="item.snapshot_url" class="security-detail-snapshot" :src="item.snapshot_url" :alt="`${item.detection_type_display} detection snapshot`" />
                <div class="confidence-readout">
                  <div><span>DETECTION CONFIDENCE</span><strong>{{ confidencePercent(item.confidence) }}%</strong></div>
                  <div class="confidence-track"><i :style="{ width: `${confidencePercent(item.confidence)}%` }"></i></div>
                </div>
                <dl>
                  <div><dt>Detected</dt><dd>{{ exactTime(item.detected_at) }}</dd></div>
                  <div><dt>Source</dt><dd>{{ item.source_display }}</dd></div>
                  <div><dt>Status</dt><dd>{{ item.status_display }}</dd></div>
                  <div><dt>Review</dt><dd>{{ titleCase(item.review_state) }}</dd></div>
                </dl>
                <router-link to="/app/live">OPEN LIVE MONITORING <ion-icon :icon="chevronForwardOutline" /></router-link>
              </div>
            </article>

            <section v-if="!events.length" class="security-empty-state">
              <span><ion-icon :icon="shieldCheckmarkOutline" /></span>
              <div><strong>No recent detections</strong><p>All monitored areas are clear in the latest security history.</p></div>
              <router-link to="/app/live">View live cameras</router-link>
            </section>
          </section>
        </template>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonTitle, IonToolbar } from '@ionic/vue';
import { cameraOutline, chevronDownOutline, chevronForwardOutline, personOutline, scanOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import AuthImage from '@/components/AuthImage.vue';
import StatePanel from '@/components/StatePanel.vue';
import { securityService, type Detection } from '@/services/security.service';
import { relativeTime, titleCase } from '@/utils/format';

const events = ref<Detection[]>([]);
const loading = ref(true);
const error = ref('');
const expandedEventId = ref<number>();
const highConfidence = computed(() => events.value.filter((item) => item.confidence >= 0.8).length);
const reviewedCount = computed(() => events.value.filter((item) => item.review_state === 'reviewed').length);
const confidencePercent = (value: number) => Math.min(100, Math.max(0, Math.round(value * 100)));
const exactTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function toggleEvent(id: number) {
  expandedEventId.value = expandedEventId.value === id ? undefined : id;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    events.value = (await securityService.list()).results;
  } catch {
    error.value = 'Recent detection events could not be retrieved.';
  } finally {
    loading.value = false;
  }
}

async function refresh(event: CustomEvent) {
  await load();
  (event.target as HTMLIonRefresherElement).complete();
}

onMounted(load);
</script>
