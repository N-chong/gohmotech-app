<template>
  <div class="farm-network-scene" :class="`server-${serverState}`">
    <div class="network-orbit orbit-one" aria-hidden="true"></div>
    <div class="network-orbit orbit-two" aria-hidden="true"></div>
    <svg class="network-links" viewBox="0 0 320 190" role="img" aria-label="Connected smart farm systems">
      <path d="M160 95 L55 42 M160 95 L266 43 M160 95 L58 153 M160 95 L263 151" />
      <path class="network-signal-path" d="M160 95 L55 42 M160 95 L266 43 M160 95 L58 153 M160 95 L263 151" />
    </svg>
    <button class="network-node node-camera" type="button" @click="select('vision')">
      <span><ion-icon :icon="videocamOutline" /></span><b>VISION</b><small>MONITORING</small>
    </button>
    <button class="network-node node-ble" type="button" @click="select('tracking')">
      <span><ion-icon :icon="bluetoothOutline" /></span><b>BLE</b><small>TRACKING</small>
    </button>
    <button class="network-node node-control" type="button" @click="select('control')">
      <span><ion-icon :icon="hardwareChipOutline" /></span><b>CONTROL</b><small>AUTOMATION</small>
    </button>
    <button class="network-node node-security" type="button" @click="select('security')">
      <span><ion-icon :icon="shieldCheckmarkOutline" /></span><b>SECURITY</b><small>DETECTION</small>
    </button>
    <div class="farm-core" :class="{ active: serverState === 'available' }">
      <i aria-hidden="true"></i>
      <img src="/gohmotech-logo.png" alt="">
      <strong>FARM<br>CORE</strong>
    </div>
    <div class="scene-caption"><span>{{ selectedCopy }}</span><small>Tap a node to inspect the access network</small></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonIcon } from '@ionic/vue';
import { bluetoothOutline, hardwareChipOutline, shieldCheckmarkOutline, videocamOutline } from 'ionicons/icons';

defineProps<{ serverState: 'checking' | 'available' | 'unavailable' }>();
const emit = defineEmits<{ interaction: [] }>();
const selected = ref<'core' | 'vision' | 'tracking' | 'control' | 'security'>('core');
const copy: Record<typeof selected.value, string> = {
  core: 'ONE CONNECTED FARM', vision: 'LIVE FARM VISION', tracking: 'LIVESTOCK PROXIMITY',
  control: 'RESPONSIVE IOT CONTROL', security: 'INTELLIGENT FARM SECURITY',
};
const selectedCopy = computed(() => copy[selected.value]);
function select(value: typeof selected.value) { selected.value = value; emit('interaction'); }
</script>
