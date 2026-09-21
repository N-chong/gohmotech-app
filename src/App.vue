<template>
  <ion-app>
    <StartupSession v-if="showStartup" :retrying="retrying" @retry="retry" />
    <ion-router-outlet v-else :key="authState.generation" />
  </ion-app>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { useRouter } from 'vue-router';
import StartupSession from '@/components/StartupSession.vue';
import { authState } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';

const router = useRouter();
const retrying = ref(false);
const showStartup = computed(() => ['bootstrapping', 'offline'].includes(authState.status));

async function routeForStatus() {
  if (authState.status === 'authenticated' && router.currentRoute.value.name === 'login') await router.replace('/app/home');
  if (authState.status === 'anonymous' || authState.status === 'expired') await router.replace({ name: 'login', query: authState.status === 'expired' ? { expired: '1' } : {} });
}

async function retry() {
  retrying.value = true;
  try { await authService.bootstrap(true); await routeForStatus(); }
  finally { retrying.value = false; }
}
function online() { if (authState.status === 'offline') void retry(); }

watch(() => authState.status, () => void routeForStatus());
onMounted(async () => { window.addEventListener('online', online); await authService.bootstrap(); await routeForStatus(); });
onBeforeUnmount(() => window.removeEventListener('online', online));
</script>
