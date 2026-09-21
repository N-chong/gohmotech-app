<template><div v-if="!online" class="network-banner"><ion-icon :icon="cloudOfflineOutline" /> Connection to GoHMoTech server lost — automation controls are unavailable.</div></template>
<script setup lang="ts">
import { IonIcon } from '@ionic/vue'; import { cloudOfflineOutline } from 'ionicons/icons'; import { useNetworkStatus } from '@/composables/useNetworkStatus';
const { online } = useNetworkStatus();
</script>
