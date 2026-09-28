<template>
  <div class="network-banner" :class="effectiveState" role="status" aria-live="polite">
    <span><ion-icon :icon="statusIcon" /></span>
    <div><strong>{{ statusTitle }}</strong><small>{{ statusDetail }}</small></div>
    <button v-if="canRetry" type="button" :disabled="busy" @click="invokeRetry">{{ busy ? 'SYNCING…' : 'RETRY' }}</button>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import { cloudDoneOutline, cloudOfflineOutline, helpCircleOutline, syncOutline } from 'ionicons/icons';
import { useNetworkStatus } from '@/composables/useNetworkStatus';
import { deviceState, type ConnectivityState } from '@/stores/device.store';
import { relativeTime } from '@/utils/format';

const props = defineProps<{ lastUpdatedAt?: string | null; retry?: () => void; busy?: boolean }>();
const { online } = useNetworkStatus();
const effectiveState = computed<ConnectivityState>(() => {
  if (props.busy) return 'connecting';
  if (!online.value) return 'offline';
  return deviceState.server.state;
});
const statusTitle = computed(() => ({
  online: 'Farm server online',
  connecting: 'Synchronizing farm data',
  offline: 'Farm server offline',
  unknown: 'Connection status unknown',
  error: 'Farm server unavailable',
})[effectiveState.value]);
const statusDetail = computed(() => {
  if (effectiveState.value === 'online') return props.lastUpdatedAt ? `Last updated ${relativeTime(props.lastUpdatedAt)}` : 'Connected to GoHMoTech';
  if (effectiveState.value === 'connecting') return props.lastUpdatedAt ? `Refreshing data last updated ${relativeTime(props.lastUpdatedAt)}` : 'Checking the GoHMoTech connection';
  if (props.lastUpdatedAt) return `Showing last loaded data from ${relativeTime(props.lastUpdatedAt)}`;
  return effectiveState.value === 'unknown' ? 'The server has not confirmed its status yet' : 'Live updates and automation controls are unavailable';
});
const statusIcon = computed(() => effectiveState.value === 'online' ? cloudDoneOutline : effectiveState.value === 'connecting' ? syncOutline : effectiveState.value === 'unknown' ? helpCircleOutline : cloudOfflineOutline);
const canRetry = computed(() => Boolean(props.retry) && effectiveState.value !== 'online');
function invokeRetry() { props.retry?.(); }
</script>
