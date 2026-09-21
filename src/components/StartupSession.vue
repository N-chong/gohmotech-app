<template>
  <main class="session-startup" :class="{ offline: authState.status === 'offline', expired: authState.status === 'expired' }">
    <div class="session-startup-mark"><img src="/gohmotech-logo.png" alt=""><i></i></div>
    <p>GOHMO<span>TECH</span></p>
    <template v-if="authState.status === 'offline'">
      <h1>Offline Mode</h1>
      <p>Unable to connect to the farm server.<br>Some information may be unavailable.</p>
      <button type="button" :disabled="retrying" @click="$emit('retry')">{{ retrying ? 'Connecting…' : 'Try Again' }}</button>
    </template>
    <template v-else-if="authState.status === 'expired'">
      <h1>Session Expired</h1>
      <p>Please sign in again to continue.</p>
    </template>
    <template v-else>
      <h1>Restoring Session…</h1>
      <p>Connecting to your farm.</p>
      <span class="session-startup-loader" aria-label="Connecting"></span>
    </template>
  </main>
</template>

<script setup lang="ts">
import { authState } from '@/stores/auth.store';
defineProps<{ retrying?: boolean }>();
defineEmits<{ retry: [] }>();
</script>
