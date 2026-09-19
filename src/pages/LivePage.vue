<template>
  <ion-page class="surveillance-page">
    <ion-header class="ion-no-border surveillance-header"><ion-toolbar><ion-title>Live monitoring</ion-title><span slot="end" class="surveillance-clock">{{ currentTime }}</span></ion-toolbar></ion-header>
    <ion-content><NetworkBanner /><main class="page-wrap surveillance-shell">
      <section class="surveillance-intro"><div><p class="eyebrow">FARM SURVEILLANCE</p><h1>Eyes on the goat house.</h1><p>Swipe between secure, ticketed camera streams.</p></div><span class="camera-count"><b>{{ activeCount }}</b><small>ONLINE</small></span></section>

      <div v-if="cameras.length > 1" class="tactile-camera-rail" aria-label="Camera switcher" role="tablist">
        <button v-for="(camera, index) in cameras" :key="camera.id" type="button" role="tab" :aria-selected="camera.id === selected?.id" :class="{ active: camera.id === selected?.id }" @click="select(camera)"><i :class="camera.status"></i><span><small>CAM {{ String(index + 1).padStart(2, '0') }}</small><strong>{{ camera.name }}</strong></span><b v-if="camera.id === selected?.id">{{ camera.status === 'active' ? 'LIVE' : 'OFFLINE' }}</b></button>
      </div>

      <StatePanel v-if="loading" loading title="Connecting to cameras" message="Requesting current camera status." />
      <StatePanel v-else-if="error && !selected" tone="danger" title="Camera unavailable" :message="error" :retry="load" />
      <template v-else-if="selected">
        <section class="pro-camera-stage camera-stage interactive-viewer" :class="{ offline: selected.status !== 'active', 'controls-visible': controlsVisible }" @pointerdown="pointerStart" @pointerup="pointerEnd" @click="revealControls" @dblclick="fullscreen">
          <img v-if="streamUrl" :src="streamUrl" :alt="`${selected.name} live feed`" @load="playing = true" @error="streamFailed">
          <div class="camera-stage-top"><span class="live-status" :class="{ active: playing }"><i></i>{{ playing ? 'LIVE' : 'STANDBY' }}</span><div><span v-if="playing"><ion-icon :icon="pulseOutline" /> 8 FPS</span><span><ion-icon :icon="timeOutline" /> {{ currentTime }}</span></div></div>
          <div v-if="!playing" class="camera-overlay"><span class="camera-connection-orb"><ion-spinner v-if="selected.status === 'active'" /><ion-icon v-else :icon="videocamOffOutline" /></span><strong>{{ selected.status === 'active' ? 'Establishing secure stream' : 'Signal lost' }}</strong><small>{{ selected.status === 'active' ? 'Requesting a temporary camera ticket…' : 'Last connection is available in camera details.' }}</small><ion-button v-if="selected.status !== 'active' || error" fill="outline" size="small" @click.stop="connect(selected)"><ion-icon slot="start" :icon="refreshOutline" />Reconnect</ion-button></div>
          <div v-if="playing" class="camera-focus-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <div v-if="playing && !controlsVisible" class="viewer-gesture-hint"><ion-icon :icon="swapHorizontalOutline" />SWIPE CAMERAS · TAP CONTROLS</div>
          <div class="viewer-controls" @click.stop>
            <button type="button" @click="openCameraInfo" aria-label="Open camera information"><ion-icon :icon="informationCircleOutline" /><span>INFO</span></button>
            <router-link to="/app/security" aria-label="View recent detections"><ion-icon :icon="scanOutline" /><span>EVENTS</span></router-link>
            <button type="button" @click="fullscreen" aria-label="Open camera fullscreen"><ion-icon :icon="expandOutline" /><span>EXPAND</span></button>
            <button type="button" @click="connect(selected)" aria-label="Reconnect camera"><ion-icon :icon="refreshOutline" /><span>RECONNECT</span></button>
          </div>
          <button class="camera-stage-bottom camera-name-control" type="button" @click.stop="openCameraInfo"><div><strong>{{ selected.name }}</strong><small>{{ selected.location || 'Location not assigned' }}</small></div><span>{{ titleCase(selected.status) }}</span></button>
        </section>

        <div class="camera-position-dots" aria-label="Selected camera"><button v-for="camera in cameras" :key="camera.id" type="button" :class="{ active: camera.id === selected.id }" :aria-label="`Select ${camera.name}`" @click="select(camera)"></button></div>
        <div class="camera-signal-row"><span class="signal-chip" :class="{ connected: selected.status === 'active' }"><ion-icon :icon="wifiOutline" />{{ selected.status === 'active' ? 'CONNECTED' : 'OFFLINE' }}</span><span class="signal-chip connected"><ion-icon :icon="shieldCheckmarkOutline" />SECURE TICKET</span><span class="signal-chip"><ion-icon :icon="videocamOutline" />MJPEG · 640PX</span></div>
        <section v-if="error" class="camera-error-panel"><ion-icon :icon="alertCircleOutline" /><div><strong>Stream interrupted</strong><p>The secure camera stream is unavailable. Reconnect or check the camera system.</p></div></section>
        <section class="camera-context-strip"><div><small>SELECTED CAMERA</small><strong>{{ selected.camera_id }}</strong></div><div><small>LAST CONNECTED</small><strong>{{ selected.last_connected ? relativeTime(selected.last_connected) : 'No timestamp' }}</strong></div><button type="button" @click="openCameraInfo">DETAILS <ion-icon :icon="chevronForwardOutline" /></button></section>
      </template>
      <StatePanel v-else title="No cameras configured" message="Add an active camera in the GoHMoTech web administration." />
    </main></ion-content>

    <ion-modal :is-open="cameraInfoOpen" :initial-breakpoint="0.58" :breakpoints="[0, 0.58, 0.82]" handle-behavior="cycle" @didDismiss="cameraInfoOpen = false">
      <ion-content class="camera-info-sheet-content"><section v-if="selected" class="camera-info-sheet"><header><span :class="{ online: selected.status === 'active' }"><ion-icon :icon="videocamOutline" /></span><div><small>CAMERA INFORMATION</small><h2>{{ selected.name }}</h2><p>{{ selected.location || 'Location not assigned' }}</p></div><b>{{ titleCase(selected.status) }}</b></header><div class="camera-detail-grid"><div><small>CAMERA ID</small><strong>{{ selected.camera_id }}</strong></div><div><small>TYPE</small><strong>{{ titleCase(selected.camera_type) }}</strong></div><div><small>LAST CONNECTED</small><strong>{{ selected.last_connected ? relativeTime(selected.last_connected) : 'No timestamp' }}</strong></div><div><small>STREAM PROFILE</small><strong>640px · 8 FPS</strong></div></div><router-link class="camera-detection-link" to="/app/security" @click="cameraInfoOpen = false"><span><ion-icon :icon="scanOutline" /></span><div><strong>Review detection history</strong><small>Open the intelligent security timeline</small></div><ion-icon :icon="chevronForwardOutline" /></router-link><p><ion-icon :icon="shieldCheckmarkOutline" />A new temporary ticket is requested whenever this stream connects.</p></section></ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { IonButton, IonContent, IonHeader, IonIcon, IonModal, IonPage, IonSpinner, IonTitle, IonToolbar } from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { alertCircleOutline, chevronForwardOutline, expandOutline, informationCircleOutline, pulseOutline, refreshOutline, scanOutline, shieldCheckmarkOutline, swapHorizontalOutline, timeOutline, videocamOffOutline, videocamOutline, wifiOutline } from 'ionicons/icons';
import NetworkBanner from '@/components/NetworkBanner.vue';
import StatePanel from '@/components/StatePanel.vue';
import { cameraService } from '@/services/camera.service';
import type { Camera } from '@/types/api';
import { relativeTime, titleCase } from '@/utils/format';

const cameras = ref<Camera[]>([]); const selected = ref<Camera>(); const streamUrl = ref(''); const loading = ref(true); const error = ref(''); const playing = ref(false); const now = ref(new Date());
const controlsVisible = ref(false); const cameraInfoOpen = ref(false); const pointerX = ref(0); let controlsTimer: number | undefined; let clockTimer: number | undefined;
const activeCount = computed(() => cameras.value.filter((camera) => camera.status === 'active').length);
const currentTime = computed(() => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(now.value));
function impact() { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
async function connect(camera: Camera) { playing.value = false; streamUrl.value = ''; error.value = ''; if (camera.status !== 'active') return; try { streamUrl.value = await cameraService.streamUrl(camera.id); } catch { error.value = 'The secure camera stream could not be started.'; } }
async function select(camera: Camera) { if (camera.id === selected.value?.id && streamUrl.value) return; selected.value = camera; controlsVisible.value = false; impact(); await connect(camera); }
async function switchCamera(direction: number) { if (cameras.value.length < 2 || !selected.value) return; const current = cameras.value.findIndex((camera) => camera.id === selected.value?.id); const target = (current + direction + cameras.value.length) % cameras.value.length; await select(cameras.value[target]); }
function pointerStart(event: PointerEvent) { pointerX.value = event.clientX; }
function pointerEnd(event: PointerEvent) { const distance = event.clientX - pointerX.value; if (Math.abs(distance) > 55) { void switchCamera(distance < 0 ? 1 : -1); pointerX.value = event.clientX; } }
function revealControls() { controlsVisible.value = !controlsVisible.value; impact(); if (controlsTimer) window.clearTimeout(controlsTimer); if (controlsVisible.value) controlsTimer = window.setTimeout(() => { controlsVisible.value = false; }, 5000); }
function openCameraInfo() { cameraInfoOpen.value = true; controlsVisible.value = false; impact(); }
async function load() { loading.value = true; error.value = ''; try { const result = await cameraService.list(); cameras.value = result.results; if (cameras.value.length) await select(cameras.value[0]); } catch { error.value = 'Unable to retrieve configured cameras.'; } finally { loading.value = false; } }
function streamFailed() { playing.value = false; error.value = 'The camera stream stopped.'; }
async function fullscreen() { impact(); const stage = document.querySelector('.interactive-viewer') as HTMLElement | null; await stage?.requestFullscreen?.(); }
onMounted(() => { void load(); clockTimer = window.setInterval(() => { now.value = new Date(); }, 1000); });
onBeforeUnmount(() => { if (clockTimer) window.clearInterval(clockTimer); if (controlsTimer) window.clearTimeout(controlsTimer); });
</script>
