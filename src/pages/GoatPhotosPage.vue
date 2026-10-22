<template>
  <ion-page class="goat-photos-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><AppBackButton :fallback="profilePath" /></ion-buttons><ion-title>Goat photos</ion-title></ion-toolbar></ion-header>
    <ion-content><main class="page-wrap goat-photos-shell">
      <section class="goat-photos-hero"><p class="eyebrow">VISUAL IDENTITY</p><h1>Standard reference photos.</h1><p>Clear, consistent angles improve visual identification and keep the livestock record useful.</p></section>
      <StatePanel v-if="loading" loading title="Loading photo record" message="Retrieving the goat gallery and production photo rules." />
      <StatePanel v-else-if="loadError" tone="danger" title="Photos unavailable" :message="loadError" :retry="load" />
      <template v-else-if="goat && options">
        <p v-if="error" class="goat-record-error" role="alert"><ion-icon :icon="warningOutline" />{{ error }}</p>
        <section class="goat-photo-guidance"><ion-icon :icon="informationCircleOutline" /><p>JPG, PNG, or WebP · maximum 5 MB · at least 480 × 360. The server rejects photos that are too dark, bright, or blurry.</p></section>
        <section class="goat-photo-grid">
          <article v-for="angle in options.image_angles" :key="angle.value" :class="{ complete: Boolean(photoFor(angle.value)) }">
            <div class="goat-photo-preview">
              <AuthImage v-if="photoFor(angle.value)" :src="photoFor(angle.value)?.image_url || null" :alt="angle.label + ' of ' + (goat.name || goat.goat_id)" />
              <span v-else><ion-icon :icon="cameraOutline" /><small>PHOTO NEEDED</small></span>
              <b v-if="photoFor(angle.value)?.is_primary">FALLBACK</b>
            </div>
            <div class="goat-photo-copy"><header><div><small>{{ angle.optional ? 'OPTIONAL ANGLE' : 'STANDARD ANGLE' }}</small><h2>{{ angle.label }}</h2></div><ion-icon v-if="photoFor(angle.value)" :icon="checkmarkCircle" /></header><p>{{ angle.guidance }}</p>
              <div class="goat-photo-actions">
                <label :class="{ disabled: Boolean(busy) }"><ion-icon :icon="cloudUploadOutline" />{{ busy === 'upload-' + angle.value ? 'UPLOADING…' : photoFor(angle.value) ? 'REPLACE' : 'ADD PHOTO' }}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" :disabled="Boolean(busy)" @change="upload(angle.value, $event)" /></label>
                <button v-if="photoFor(angle.value) && !photoFor(angle.value)?.is_primary" type="button" :disabled="Boolean(busy)" @click="photoAction(photoFor(angle.value)!.id, 'set_primary')"><ion-icon :icon="starOutline" />FALLBACK</button>
                <button v-if="photoFor(angle.value)" type="button" class="danger" :disabled="Boolean(busy)" @click="photoAction(photoFor(angle.value)!.id, 'delete')"><ion-icon :icon="trashOutline" />DELETE</button>
              </div>
            </div>
          </article>
        </section>
        <aside class="goat-photo-note"><strong>Cover priority</strong><p>The inventory uses Front first, then Left, then the selected fallback photo. Selecting a fallback does not override an available Front or Left reference.</p></aside>
      </template>
    </main></ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, alertController, onIonViewDidEnter, toastController } from '@ionic/vue';
import { cameraOutline, checkmarkCircle, cloudUploadOutline, informationCircleOutline, starOutline, trashOutline, warningOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import AuthImage from '@/components/AuthImage.vue';
import StatePanel from '@/components/StatePanel.vue';
import { goatService, type GoatOptions } from '@/services/goat.service';
import type { GoatDetail } from '@/types/api';

const route = useRoute();
const goatId = computed(() => String(route.params.goatId || ''));
const profilePath = computed(() => '/app/goats/' + encodeURIComponent(goatId.value));
const goat = ref<GoatDetail>();
const options = ref<GoatOptions>();
const loading = ref(true);
const loadError = ref('');
const error = ref('');
const busy = ref('');
const photoFor = (angle: string) => goat.value?.images.find((photo) => photo.angle === angle);

async function load() {
  loading.value = true; loadError.value = ''; error.value = '';
  try {
    const [record, choices] = await Promise.all([goatService.detail(goatId.value), goatService.options()]);
    goat.value = record; options.value = choices;
  } catch {
    loadError.value = 'The goat photo record could not be retrieved.';
  } finally {
    loading.value = false;
  }
}

async function upload(angle: string, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || busy.value) return;
  busy.value = 'upload-' + angle; error.value = '';
  try {
    goat.value = await goatService.uploadPhoto(goatId.value, angle, file);
    const toast = await toastController.create({ message: 'Reference photo saved.', duration: 1700, position: 'top', color: 'success' });
    await toast.present();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'The photo could not be uploaded.';
  } finally {
    busy.value = '';
  }
}

async function photoAction(imageId: number, action: 'set_primary' | 'delete') {
  if (busy.value) return;
  if (action === 'delete') {
    const alert = await alertController.create({
      header: 'Delete this reference photo?',
      message: 'The image file will be removed from this goat record. This cannot be undone.',
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Delete', role: 'destructive' }],
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    if (result.role !== 'destructive') return;
  }
  busy.value = 'photo-' + imageId; error.value = '';
  try {
    goat.value = await goatService.photoAction(goatId.value, imageId, action);
    const toast = await toastController.create({ message: action === 'delete' ? 'Reference photo deleted.' : 'Fallback photo updated.', duration: 1700, position: 'top', color: 'success' });
    await toast.present();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'The photo could not be updated.';
  } finally {
    busy.value = '';
  }
}

onIonViewDidEnter(load);
</script>