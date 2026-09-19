<template>
  <ion-page>
    <ion-content :fullscreen="true" :scroll-y="true" class="access-terminal-page">
      <main class="access-terminal" :class="[`phase-${phase}`, { 'keyboard-active': fieldActive }]">
        <div class="terminal-atmosphere" aria-hidden="true"><i v-for="index in 9" :key="index"></i></div>

        <header class="terminal-masthead">
          <a class="terminal-identity" href="#access-form" aria-label="GoHMoTech smart farm access">
            <span><img src="/gohmotech-logo.png" alt=""></span>
            <div><strong>GOHMO<span>TECH</span></strong><small>SMART FARM OPERATING SYSTEM</small></div>
          </a>
          <button class="server-indicator" type="button" :class="serverState" @click="checkServer">
            <i></i><span>{{ serverLabel }}</span><small>{{ serverState === 'checking' ? 'TESTING' : serverState === 'available' ? 'READY' : 'RETRY' }}</small>
          </button>
        </header>

        <section class="terminal-intro">
          <p>SECURE FARM ACCESS <span>01 / AUTH GATE</span></p>
          <h1>Your farm is<br><em>one signal away.</em></h1>
          <p>Enter the connected environment for livestock intelligence, automation, live vision, and security.</p>
        </section>

        <FarmNetworkScene :server-state="serverState" @interaction="lightImpact" />

        <section id="access-form" class="terminal-auth-zone">
          <div class="auth-zone-heading">
            <div><small>IDENTITY VERIFICATION</small><h2>Access farm system</h2></div>
            <span><ion-icon :icon="lockClosedOutline" />ENCRYPTED</span>
          </div>

          <form @submit.prevent="submit" @focusin="fieldActive = true" @focusout="fieldActive = false">
            <AuthAccessField v-model="username" label="USERNAME OR EMAIL" :icon="personOutline" autocomplete="username" placeholder="Farm account identity" :invalid="phase === 'denied'" @interaction="lightImpact" />
            <AuthAccessField v-model="password" label="ACCESS KEY" :icon="keyOutline" type="password" autocomplete="current-password" placeholder="Enter your password" :invalid="phase === 'denied'" @interaction="lightImpact" />

            <div v-if="phase === 'denied' || phase === 'offline'" class="access-message" :class="phase" role="alert">
              <ion-icon :icon="phase === 'offline' ? cloudOfflineOutline : alertCircleOutline" />
              <div><strong>{{ phase === 'offline' ? 'FARM SERVER UNREACHABLE' : 'ACCESS DENIED' }}</strong><p>{{ error }}</p></div>
              <button v-if="phase === 'offline'" type="button" @click="checkServer">TRY AGAIN</button>
            </div>

            <button class="terminal-enter" type="submit" :disabled="busy">
              <span class="enter-state"><small>{{ phaseStep }}</small><strong>{{ phaseLabel }}</strong></span>
              <span class="enter-motion" aria-hidden="true"><i></i><ion-icon :icon="phase === 'granted' ? checkmarkOutline : arrowForwardOutline" /></span>
            </button>
          </form>

          <div class="access-assistance">
            <button type="button" @click="showRecovery = !showRecovery">Trouble accessing your farm? <span>{{ showRecovery ? 'Close help' : 'Recovery options →' }}</span></button>
            <p v-if="showRecovery">Account recovery is managed by your GoHMoTech farm administrator. Your password is never stored on this device.</p>
          </div>
        </section>

        <footer class="terminal-footer"><span>SESSION-PROTECTED</span><i></i><span>GOHMO OS / MOBILE</span><i></i><span>{{ currentTime }}</span></footer>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonContent, IonIcon, IonPage } from '@ionic/vue';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { alertCircleOutline, arrowForwardOutline, checkmarkOutline, cloudOfflineOutline, keyOutline, lockClosedOutline, personOutline } from 'ionicons/icons';
import AuthAccessField from '@/components/AuthAccessField.vue';
import FarmNetworkScene from '@/components/FarmNetworkScene.vue';
import { authService } from '@/services/auth.service';
import { API_BASE, ApiError } from '@/services/api';

type AuthPhase = 'idle' | 'authenticating' | 'connecting' | 'granted' | 'denied' | 'offline';
type ServerState = 'checking' | 'available' | 'unavailable';
const username = ref('');
const password = ref('');
const phase = ref<AuthPhase>('idle');
const error = ref('');
const serverState = ref<ServerState>('checking');
const showRecovery = ref(false);
const fieldActive = ref(false);
const currentTime = ref('');
const router = useRouter();
const route = useRoute();
let clockTimer = 0;
let phaseTimer = 0;

const busy = computed(() => ['authenticating', 'connecting', 'granted'].includes(phase.value));
const serverLabel = computed(() => serverState.value === 'checking' ? 'CHECKING FARM LINK' : serverState.value === 'available' ? 'FARM LINK ONLINE' : 'FARM LINK UNAVAILABLE');
const phaseLabel = computed(() => ({ idle: 'ENTER FARM SYSTEM', authenticating: 'AUTHENTICATING', connecting: 'CONNECTING TO GOHMO', granted: 'ACCESS GRANTED', denied: 'TRY ACCESS AGAIN', offline: 'RECONNECT TO FARM' }[phase.value]));
const phaseStep = computed(() => ({ idle: 'SECURE ENTRY', authenticating: 'STEP 01 / VERIFY', connecting: 'STEP 02 / CONNECT', granted: 'IDENTITY CONFIRMED', denied: 'CREDENTIALS REJECTED', offline: 'CONNECTION REQUIRED' }[phase.value]));

function lightImpact() { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
function updateClock() { currentTime.value = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); }
async function checkServer() {
  if (!navigator.onLine) { serverState.value = 'unavailable'; return; }
  serverState.value = 'checking';
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`${API_BASE}/api/mobile/auth/login/`, { method: 'OPTIONS', signal: controller.signal, headers: { Accept: 'application/json' } });
    serverState.value = 'available';
  } catch { serverState.value = 'unavailable'; }
  finally { window.clearTimeout(timer); }
}
async function submit() {
  error.value = '';
  if (!username.value.trim() || !password.value) {
    phase.value = 'denied';
    error.value = 'Enter both your farm identity and access key.';
    void Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
    return;
  }
  phase.value = 'authenticating';
  lightImpact();
  phaseTimer = window.setTimeout(() => { if (phase.value === 'authenticating') phase.value = 'connecting'; }, 180);
  try {
    await authService.login(username.value.trim(), password.value);
    window.clearTimeout(phaseTimer);
    phase.value = 'granted';
    serverState.value = 'available';
    void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
    window.setTimeout(() => void router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/app/home'), 480);
  } catch (reason) {
    window.clearTimeout(phaseTimer);
    if (reason instanceof ApiError && reason.status === 0) {
      phase.value = 'offline';
      serverState.value = 'unavailable';
      error.value = 'We could not establish a secure connection. Check the farm link and try again.';
    } else {
      phase.value = 'denied';
      error.value = 'The username or password was not accepted. Check your details and try again.';
    }
    void Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
  }
}
function handleOffline() { serverState.value = 'unavailable'; }
function handleOnline() { void checkServer(); }
onMounted(() => {
  updateClock();
  clockTimer = window.setInterval(updateClock, 30000);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);
  void checkServer();
});
onBeforeUnmount(() => {
  window.clearInterval(clockTimer);
  window.clearTimeout(phaseTimer);
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('online', handleOnline);
});
</script>
