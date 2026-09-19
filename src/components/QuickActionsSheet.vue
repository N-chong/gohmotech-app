<template>
  <button class="farm-quick-trigger" type="button" aria-label="Open GoHMoTech quick actions" @click="openSheet">
    <ion-icon :icon="addOutline" />
    <span>QUICK</span>
  </button>
  <ion-modal :is-open="open" :initial-breakpoint="0.54" :breakpoints="[0, 0.54, 0.82]" handle-behavior="cycle" @didDismiss="open = false">
    <ion-content class="quick-sheet-content">
      <section class="quick-sheet">
        <header><div><small>GOHMO COMMAND LAYER</small><h2>Quick actions</h2></div><span><i></i>FARM CONNECTED</span></header>
        <div class="quick-action-grid">
          <button v-for="action in actions" :key="action.path" type="button" :class="action.tone" @click="navigate(action.path)">
            <span><ion-icon :icon="action.icon" /></span><strong>{{ action.label }}</strong><small>{{ action.copy }}</small><ion-icon :icon="arrowForwardOutline" />
          </button>
        </div>
        <p><ion-icon :icon="shieldCheckmarkOutline" /> Commands are completed inside their protected control screen.</p>
      </section>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonIcon, IonModal } from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { addOutline, arrowForwardOutline, mapOutline, notificationsOutline, optionsOutline, pawOutline, shieldCheckmarkOutline, videocamOutline } from 'ionicons/icons';
import { authState } from '@/stores/auth.store';

const open = ref(false);
const router = useRouter();
const actions = computed(() => [
  ...(authState.user?.permissions.manage_farm ? [{ label: 'Farm controls', copy: 'Door, light & feeding', path: '/app/automation', icon: optionsOutline, tone: 'green' }] : []),
  { label: 'Live cameras', copy: 'Open monitoring', path: '/app/live', icon: videocamOutline, tone: 'blue' },
  { label: 'Find a goat', copy: 'BLE proximity', path: '/app/tracking', icon: mapOutline, tone: 'cyan' },
  { label: 'Goat inventory', copy: 'Profiles & weight', path: '/app/goats', icon: pawOutline, tone: 'forest' },
  { label: 'View alerts', copy: 'Review activity', path: '/app/alerts', icon: notificationsOutline, tone: 'gold' },
]);
function impact() { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
function openSheet() { impact(); open.value = true; }
async function navigate(path: string) { impact(); open.value = false; await router.push(path); }
</script>
