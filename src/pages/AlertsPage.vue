<template>
  <ion-page class="alerts-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Notifications</ion-title><ion-buttons slot="end"><button v-if="unreadCount" class="notification-read-all" type="button" :disabled="markingAll" @click="markAllRead">{{ markingAll ? 'UPDATING…' : 'READ ALL' }}</button></ion-buttons></ion-toolbar></ion-header>
    <ion-content>
      <NetworkBanner :last-updated-at="lastUpdatedAt" :retry="refresh" :busy="loading" />
      <ion-refresher slot="fixed" @ionRefresh="pullRefresh"><ion-refresher-content pulling-text="SYNC INBOX" refreshing-text="Synchronizing notifications…" /></ion-refresher>
      <main class="page-wrap alerts-shell">
        <section class="alerts-hero notification-hero">
          <div><p class="eyebrow">OWNER NOTIFICATION CENTER</p><h1>Alerts and marketplace activity.</h1><p>{{ unreadCount ? unreadCount + ' unread notification' + (unreadCount === 1 ? '' : 's') + ' need attention.' : 'You are all caught up.' }}</p></div>
          <span><strong>{{ unreadCount }}</strong><small>UNREAD</small></span>
        </section>

        <div class="notification-filter-row" aria-label="Notification categories">
          <button v-for="option in filters" :key="option.value" type="button" :class="{ active: filter === option.value }" @click="selectFilter(option.value)">{{ option.label }}<span>{{ filterCount(option.value) }}</span></button>
        </div>

        <StatePanel v-if="loading && !items.length" loading title="Loading notifications" message="Checking farm alerts and marketplace activity." />
        <StatePanel v-else-if="error && !items.length" tone="danger" title="Notifications unavailable" :message="error" :retry="refresh" />
        <div v-if="error && items.length" class="stale-data-notice" role="status"><ion-icon :icon="warningOutline" /><div><strong>Showing previously loaded notifications</strong><small>{{ error }}</small></div><button type="button" @click="refresh">Retry</button></div>

        <section v-if="!loading && !items.length && !error" class="alerts-empty-state">
          <span><ion-icon :icon="checkmarkCircleOutline" /></span>
          <div><strong>No notifications here</strong><p>There is no activity in this category.</p></div>
          <button v-if="filter !== 'all'" type="button" @click="selectFilter('all')">Show everything</button>
        </section>

        <section v-else class="unified-notification-list">
          <article v-for="item in items" :key="item.key" :class="[item.severity, { unread: !item.is_read }]">
            <span class="unified-notification-icon"><ion-icon :icon="itemIcon(item)" /></span>
            <div class="unified-notification-copy">
              <header><span>{{ item.type_display }}</span><time>{{ relativeTime(item.created_at) }}</time></header>
              <h2>{{ item.title }}</h2>
              <p>{{ item.message || 'Open the related activity for more information.' }}</p>
              <small><ion-icon :icon="item.source_kind === 'farm' ? radioOutline : storefrontOutline" />{{ item.source_label }}</small>
              <div class="unified-notification-actions">
                <button v-if="!item.is_read" type="button" :disabled="markingKey === item.key" @click="markRead(item)">{{ markingKey === item.key ? 'UPDATING…' : 'MARK READ' }}</button>
                <button class="primary" type="button" @click="openNotification(item)">OPEN</button>
              </div>
            </div>
            <i v-if="!item.is_read" aria-label="Unread"></i>
          </article>
        </section>

        <div v-if="loadMoreError" class="pagination-retry" role="alert"><span>{{ loadMoreError }}</span><button type="button" @click="loadMore">TRY AGAIN</button></div>
      </main>
      <ion-infinite-scroll :disabled="!hasMore || Boolean(loadMoreError)" threshold="140px" @ionInfinite="loadNext"><ion-infinite-scroll-content loading-spinner="crescent" loading-text="Loading more notifications…" /></ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonPage, IonRefresher, IonRefresherContent, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewDidLeave, toastController } from '@ionic/vue';
import { alertCircleOutline, checkmarkCircleOutline, chatbubblesOutline, informationCircleOutline, radioOutline, storefrontOutline, warningOutline } from 'ionicons/icons';
import NetworkBanner from '@/components/NetworkBanner.vue';
import StatePanel from '@/components/StatePanel.vue';
import { notificationService, type NotificationFacets, type UnifiedNotification, type UnifiedNotificationFilter } from '@/services/notification.service';
import { setNotificationUnreadCount } from '@/stores/notification.store';
import { relativeTime } from '@/utils/format';

const router = useRouter();
const filters: Array<{ value: UnifiedNotificationFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'alerts', label: 'Farm alerts' },
  { value: 'messages', label: 'Messages' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'marketplace', label: 'Marketplace' },
];
const items = ref<UnifiedNotification[]>([]);
const filter = ref<UnifiedNotificationFilter>('all');
const loading = ref(true);
const error = ref('');
const loadMoreError = ref('');
const unreadCount = ref(0);
const facets = ref<NotificationFacets>();
const page = ref(1);
const hasMore = ref(false);
const lastUpdatedAt = ref<string | null>(null);
const markingKey = ref('');
const markingAll = ref(false);
let controller: AbortController | undefined;
let active = false;

const itemIcon = (item: UnifiedNotification) => item.category === 'messages' ? chatbubblesOutline : item.source_kind === 'marketplace' ? storefrontOutline : item.severity === 'critical' ? alertCircleOutline : item.severity === 'warning' ? warningOutline : informationCircleOutline;
const reasonMessage = (reason: unknown) => reason instanceof Error ? reason.message : 'Notifications could not be retrieved.';
const filterCount = (value: UnifiedNotificationFilter) => facets.value?.[value] ?? (filter.value === value ? items.value.length : 0);

async function load(reset = true) {
  if (reset) {
    controller?.abort();
    controller = new AbortController();
    loading.value = true;
    error.value = '';
    loadMoreError.value = '';
    page.value = 1;
  }
  const requestController = controller || new AbortController();
  controller = requestController;
  try {
    const data = await notificationService.list(filter.value, page.value, requestController.signal);
    if (!active || requestController.signal.aborted) return;
    items.value = reset ? data.results : [...items.value, ...data.results.filter((item) => !items.value.some((existing) => existing.key === item.key))];
    unreadCount.value = data.unread_count;
    facets.value = data.facets;
    setNotificationUnreadCount(data.unread_count);
    hasMore.value = Boolean(data.next);
    lastUpdatedAt.value = new Date().toISOString();
  } catch (reason) {
    if (!active || requestController.signal.aborted) return;
    if (reset) error.value = reasonMessage(reason);
    else loadMoreError.value = reasonMessage(reason);
  } finally {
    if (active && !requestController.signal.aborted) loading.value = false;
  }
}

async function selectFilter(value: UnifiedNotificationFilter) {
  if (filter.value === value) return;
  filter.value = value;
  items.value = [];
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  await load(true);
}

async function markRead(item: UnifiedNotification) {
  if (item.is_read || markingKey.value) return;
  markingKey.value = item.key;
  try {
    await notificationService.markRead(item);
    item.is_read = true;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
    setNotificationUnreadCount(unreadCount.value);
  } finally {
    markingKey.value = '';
  }
}

async function openNotification(item: UnifiedNotification) {
  try { await markRead(item); } catch { /* Opening the authorized target remains useful. */ }
  if (item.target) await router.push(item.target);
}

async function markAllRead() {
  if (markingAll.value) return;
  markingAll.value = true;
  try {
    const result = await notificationService.markAllRead();
    items.value.forEach((item) => { item.is_read = true; });
    unreadCount.value = 0;
    setNotificationUnreadCount(0);
    const toast = await toastController.create({ message: String(result.marked_read) + ' notifications marked as read.', duration: 1700, position: 'top', color: 'success' });
    await toast.present();
  } finally {
    markingAll.value = false;
  }
}

async function refresh() { await load(true); }
async function pullRefresh(event: CustomEvent) { await refresh(); await (event.target as HTMLIonRefresherElement).complete(); }
async function loadMore() { if (!hasMore.value || loading.value) return; page.value += 1; loadMoreError.value = ''; await load(false); }
async function loadNext(event: CustomEvent) { await loadMore(); await (event.target as HTMLIonInfiniteScrollElement).complete(); }
function start() { active = true; void load(true); }
function stop() { active = false; controller?.abort(); controller = undefined; }
onIonViewDidEnter(start); onIonViewDidLeave(stop); onBeforeUnmount(stop);
</script>
