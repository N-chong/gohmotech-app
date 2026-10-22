<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <QuickActionsSheet v-if="showFarmTabs" />
      <ion-tab-bar v-if="showFarmTabs" slot="bottom" class="farm-tab-bar">
        <ion-tab-button tab="home" href="/app/home" aria-label="Home dashboard" @click="tabImpact"><span class="tab-icon-shell"><ion-icon :icon="homeOutline" /></span><ion-label>Home</ion-label></ion-tab-button>
        <ion-tab-button tab="live" href="/app/live" aria-label="Live monitoring" @click="tabImpact"><span class="tab-icon-shell"><ion-icon :icon="videocamOutline" /></span><ion-label>Live</ion-label></ion-tab-button>
        <ion-tab-button tab="goats" href="/app/goats" aria-label="Goat inventory" @click="tabImpact"><span class="tab-icon-shell"><ion-icon :icon="pawOutline" /></span><ion-label>Goats</ion-label></ion-tab-button>
        <ion-tab-button tab="alerts" href="/app/alerts" aria-label="Notifications" @click="tabImpact"><span class="tab-icon-shell"><ion-icon :icon="notificationsOutline" /><b v-if="notificationState.unreadCount" class="tab-notification-badge">{{ badgeText }}</b></span><ion-label>Inbox</ion-label></ion-tab-button>
        <ion-tab-button tab="more" href="/app/more" aria-label="More farm tools" @click="tabImpact"><span class="tab-icon-shell"><ion-icon :icon="gridOutline" /></span><ion-label>More</ion-label></ion-tab-button>
      </ion-tab-bar>
      <router-link v-if="showFloatingBell" class="global-notification-button" to="/app/alerts" aria-label="Open notifications"><ion-icon :icon="notificationsOutline" /><span v-if="notificationState.unreadCount">{{ badgeText }}</span></router-link>
    </ion-tabs>
  </ion-page>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { IonIcon, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useRoute } from 'vue-router';
import { authState } from '@/stores/auth.store';
import { notificationState, refreshNotificationSummary } from '@/stores/notification.store';
import { gridOutline, homeOutline, notificationsOutline, pawOutline, videocamOutline } from 'ionicons/icons';
import QuickActionsSheet from '@/components/QuickActionsSheet.vue';

const route = useRoute();
const showFarmTabs = computed(() => !route.meta.hideTabs && authState.user?.permissions.farm_access === true);
const showFloatingBell = computed(() => route.meta.hideTabs && route.path !== '/app/alerts' && authState.user?.permissions.farm_access === true);
const badgeText = computed(() => notificationState.unreadCount > 99 ? '99+' : String(notificationState.unreadCount));
let summaryTimer: ReturnType<typeof setInterval> | undefined;
function updateNotifications() { if (authState.user?.permissions.farm_access) void refreshNotificationSummary(); }
function tabImpact() { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
watch(() => route.fullPath, updateNotifications);
onMounted(() => { updateNotifications(); summaryTimer = setInterval(updateNotifications, 30000); });
onBeforeUnmount(() => { if (summaryTimer) clearInterval(summaryTimer); });
</script>
