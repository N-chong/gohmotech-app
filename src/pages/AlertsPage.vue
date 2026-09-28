<template>
  <ion-page class="alerts-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Alerts</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <NetworkBanner :last-updated-at="lastUpdatedAt" :retry="retryConnection" :busy="loading" />
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content pulling-text="SYNC FARM" refreshing-text="Synchronizing alerts…" /></ion-refresher>
      <main class="page-wrap alerts-shell">
        <section class="alerts-hero">
          <div><p class="eyebrow">FARM NOTIFICATIONS</p><h1>Stay ahead of every signal.</h1><p>{{ unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'} need attention.` : 'You are all caught up.' }}</p></div>
          <span><strong>{{ unreadCount }}</strong><small>UNREAD</small></span>
        </section>

        <div class="alert-filter-row" aria-label="Alert categories">
          <button v-for="item in filters" :key="item" type="button" :class="{ active: filter === item }" @click="selectFilter(item)">{{ titleCase(item) }}<span>{{ filterCount(item) }}</span></button>
        </div>

        <StatePanel v-if="loading && !alerts.length" loading title="Loading alerts" message="Checking recent farm events." />
        <StatePanel v-else-if="error && !alerts.length" tone="danger" title="Unable to retrieve alerts" :message="error" :retry="reset" />
        <div v-if="error && alerts.length" class="stale-data-notice" role="status"><ion-icon :icon="warningOutline" /><div><strong>Showing previously loaded alerts</strong><small>{{ error }}</small></div><button type="button" @click="retryConnection">Retry</button></div>
        <section v-if="!loading && (!error || alerts.length) && !visible.length" class="alerts-empty-state">
          <span><ion-icon :icon="checkmarkCircleOutline" /></span>
          <div><strong>No {{ filter === 'all' ? 'active' : filter }} alerts</strong><p>Everything looks good in this notification category.</p></div>
          <button v-if="filter !== 'all'" type="button" @click="selectFilter('all')">Show all activity</button>
        </section>

        <section v-else-if="visible.length" class="rich-alert-list">
          <article v-for="item in visible" :key="item.id" :class="[severityClass(item), { unread: !item.is_read, expanded: expandedAlertId === item.id }]">
            <button class="alert-summary" type="button" :aria-expanded="expandedAlertId === item.id" @click="toggleAlert(item)">
              <span class="alert-icon"><ion-icon :icon="severityIcon(item)" /></span>
              <div class="alert-content">
                <div><span>{{ item.type_display }}</span><time>{{ relativeTime(item.created_at) }}</time></div>
                <h2>{{ item.title }}</h2>
                <p>{{ item.description }}</p>
                <small v-if="item.source"><ion-icon :icon="radioOutline" />{{ item.source }}</small>
              </div>
              <span v-if="!item.is_read" class="unread-marker">NEW</span>
              <ion-icon class="alert-chevron" :icon="chevronDownOutline" />
            </button>

            <div v-if="expandedAlertId === item.id" class="alert-expanded-details">
              <div class="alert-category-label"><ion-icon :icon="severityIcon(item)" />{{ titleCase(category(item)) }} notification</div>
              <p>{{ item.description }}</p>
              <dl>
                <div><dt>Recorded</dt><dd>{{ exactTime(item.created_at) }}</dd></div>
                <div v-if="item.source"><dt>Source</dt><dd>{{ item.source }}</dd></div>
                <div><dt>State</dt><dd>{{ item.is_resolved ? 'Resolved' : 'Active' }}</dd></div>
                <div><dt>Attention</dt><dd>{{ item.is_read ? 'Reviewed' : 'Unread' }}</dd></div>
              </dl>
              <button v-if="!item.is_read" type="button" class="mark-read-action" :disabled="markingId === item.id" @click.stop="markRead(item)">{{ markingId === item.id ? 'UPDATING…' : 'MARK AS REVIEWED' }}</button>
            </div>
          </article>
        </section>
        <div v-if="loadMoreError" class="pagination-retry" role="alert"><span>{{ loadMoreError }}</span><button type="button" @click="loadMore">TRY AGAIN</button></div>
      </main>
      <ion-infinite-scroll :disabled="!hasMore || Boolean(loadMoreError)" threshold="140px" @ionInfinite="loadNext"><ion-infinite-scroll-content loading-spinner="crescent" loading-text="Loading more alerts…" /></ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonPage, IonRefresher, IonRefresherContent, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewDidLeave } from '@ionic/vue';
import { alertCircleOutline, checkmarkCircleOutline, chevronDownOutline, informationCircleOutline, radioOutline, warningOutline } from 'ionicons/icons';
import NetworkBanner from '@/components/NetworkBanner.vue';
import StatePanel from '@/components/StatePanel.vue';
import { usePaginatedResource } from '@/composables/usePaginatedResource';
import { alertService } from '@/services/alert.service';
import type { Notification } from '@/types/api';
import { relativeTime, titleCase } from '@/utils/format';

const filters = ['all', 'critical', 'warning', 'information'];
const filter = ref('all');
const expandedAlertId = ref<number>();
const markingId = ref<number>();
let markController: AbortController | undefined;
const { items: alerts, loading, error, loadMoreError, lastUpdatedAt, hasLoaded, hasMore, activate, deactivate, reset, refresh: refreshPage, loadMore } = usePaginatedResource<Notification>({
  fetchPage: (page, signal) => alertService.list(page, signal),
  getKey: (item) => item.id,
  initialErrorMessage: 'Farm notifications could not be retrieved.',
  moreErrorMessage: 'More notifications could not be loaded. Previously loaded alerts are still available.',
});
const category = (item: Notification) => ['critical', 'high'].includes(item.severity) ? 'critical' : ['medium', 'low'].includes(item.severity) ? 'warning' : 'information';
const visible = computed(() => alerts.value.filter((item) => filter.value === 'all' || category(item) === filter.value));
const unreadCount = computed(() => alerts.value.filter((item) => !item.is_read).length);
const filterCount = (name: string) => name === 'all' ? alerts.value.length : alerts.value.filter((item) => category(item) === name).length;
const severityClass = (item: Notification) => category(item);
const severityIcon = (item: Notification) => category(item) === 'critical' ? alertCircleOutline : category(item) === 'warning' ? warningOutline : informationCircleOutline;
const exactTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function selectFilter(value: string) {
  if (filter.value === value) return;
  filter.value = value;
  expandedAlertId.value = undefined;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  void reset();
}

function toggleAlert(item: Notification) {
  expandedAlertId.value = expandedAlertId.value === item.id ? undefined : item.id;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

async function markRead(item: Notification) {
  if (item.is_read || markingId.value) return;
  markingId.value = item.id;
  const controller = new AbortController();
  markController = controller;
  try {
    const updated = await alertService.markRead(item.id, controller.signal);
    if (!controller.signal.aborted) {
      Object.assign(item, updated);
      void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
    }
  } catch {
    // Keep the expanded alert usable if the acknowledgement request fails.
  } finally {
    if (markController === controller) { markController = undefined; markingId.value = undefined; }
  }
}

async function refresh(event: CustomEvent) {
  await refreshPage();
  (event.target as HTMLIonRefresherElement).complete();
}
async function retryConnection() { await (alerts.value.length ? refreshPage() : reset()); }
async function loadNext(event: CustomEvent) { await loadMore(); await (event.target as HTMLIonInfiniteScrollElement).complete(); }
function startPage() { activate(); if (!hasLoaded.value) void reset(); }
function stopPage() {
  deactivate();
  markController?.abort();
  markController = undefined;
  markingId.value = undefined;
}
onIonViewDidEnter(startPage); onIonViewDidLeave(stopPage); onBeforeUnmount(stopPage);
</script>
