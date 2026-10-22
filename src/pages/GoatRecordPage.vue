<template>
  <ion-page class="goat-record-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><AppBackButton :fallback="isEdit ? `/app/goats/${encodedOriginalId}` : '/app/goats'" /></ion-buttons><ion-title>{{ isEdit ? 'Edit livestock' : 'Register livestock' }}</ion-title></ion-toolbar></ion-header>
    <ion-content><main class="page-wrap goat-record-shell">
      <section class="goat-record-hero"><div><p class="eyebrow">SMART FARM INVENTORY</p><h1>{{ isEdit ? 'Update the living record.' : 'Register a farm goat.' }}</h1><p>Identification and care details use the same validation as the production site.</p></div></section>
      <StatePanel v-if="loading" loading title="Preparing livestock record" message="Loading verified field choices." />
      <StatePanel v-else-if="loadError" tone="danger" title="Record unavailable" :message="loadError" :retry="load" />
      <form v-else class="goat-record-form" @submit.prevent="save">
        <p v-if="error" class="goat-record-error" role="alert"><ion-icon :icon="warningOutline" />{{ error }}</p>
        <section><header><small>IDENTIFICATION</small><h2>Livestock identity</h2></header><div class="goat-record-grid">
          <label><span>Goat ID *</span><input v-model.trim="form.goat_id" required maxlength="50" placeholder="e.g. G001" /><small v-if="fieldError('goat_id')">{{ fieldError('goat_id') }}</small></label>
          <label><span>Name</span><input v-model.trim="form.name" maxlength="100" placeholder="Optional name" /><small v-if="fieldError('name')">{{ fieldError('name') }}</small></label>
          <label><span>Tag number</span><input v-model.trim="form.tag_number" maxlength="50" placeholder="Ear tag or RFID" /><small v-if="fieldError('tag_number')">{{ fieldError('tag_number') }}</small></label>
          <label><span>Breed *</span><select v-model="form.breed" required><option v-for="item in options?.breeds" :key="item.value" :value="item.value">{{ item.label }}</option></select><small v-if="fieldError('breed')">{{ fieldError('breed') }}</small></label>
          <label><span>Sex *</span><select v-model="form.gender" required><option v-for="item in options?.genders" :key="item.value" :value="item.value">{{ item.label }}</option></select><small v-if="fieldError('gender')">{{ fieldError('gender') }}</small></label>
          <label><span>Date of birth</span><input v-model="form.date_of_birth" type="date" /><small v-if="fieldError('date_of_birth')">{{ fieldError('date_of_birth') }}</small></label>
          <label v-if="!isEdit"><span>Initial weight (kg)</span><input v-model="form.weight_kg" type="number" min="0" step="0.1" inputmode="decimal" /><small v-if="fieldError('weight_kg')">{{ fieldError('weight_kg') }}</small></label>
          <label class="wide"><span>Color and markings</span><input v-model.trim="form.color_markings" maxlength="255" placeholder="Coat color and identifying marks" /><small v-if="fieldError('color_markings')">{{ fieldError('color_markings') }}</small></label>
        </div></section>
        <section><header><small>CARE RECORD</small><h2>Health and vaccination</h2></header><div class="goat-record-grid">
          <label><span>Health status</span><select v-model="form.health_status"><option v-for="item in options?.health_statuses" :key="item.value" :value="item.value">{{ item.label }}</option></select><small v-if="fieldError('health_status')">{{ fieldError('health_status') }}</small></label>
          <label><span>Vaccination status</span><select v-model="form.vaccination_status"><option v-for="item in options?.vaccination_statuses" :key="item.value" :value="item.value">{{ item.label }}</option></select><small v-if="fieldError('vaccination_status')">{{ fieldError('vaccination_status') }}</small></label>
          <label><span>Vaccine name</span><input v-model.trim="form.vaccine_name" maxlength="150" placeholder="e.g. CDT" /><small v-if="fieldError('vaccine_name')">{{ fieldError('vaccine_name') }}</small></label>
          <label><span>Vaccination date</span><input v-model="form.vaccination_date" type="date" /><small v-if="fieldError('vaccination_date')">{{ fieldError('vaccination_date') }}</small></label>
          <label><span>Next due date</span><input v-model="form.next_due_date" type="date" /><small v-if="fieldError('next_due_date')">{{ fieldError('next_due_date') }}</small></label>
          <label class="wide"><span>Health notes</span><textarea v-model.trim="form.health_notes" rows="3" placeholder="Health observations"></textarea><small v-if="fieldError('health_notes')">{{ fieldError('health_notes') }}</small></label>
          <label class="wide"><span>General notes</span><textarea v-model.trim="form.notes" rows="3" placeholder="Owner notes"></textarea><small v-if="fieldError('notes')">{{ fieldError('notes') }}</small></label>
        </div></section>
        <aside><ion-icon :icon="informationCircleOutline" /><p>{{ isEdit ? 'Confirmed weight history, photos, BLE identity, and inventory status are managed by their dedicated workflows.' : 'Photos and BLE tracker assignment can be added through their dedicated workflows after registration.' }}</p></aside>
        <button class="goat-record-save" type="submit" :disabled="saving">{{ saving ? 'SAVING…' : isEdit ? 'SAVE LIVESTOCK RECORD' : 'REGISTER GOAT' }}</button>
      </form>
    </main></ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, onIonViewDidEnter, toastController } from '@ionic/vue';
import { informationCircleOutline, warningOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import StatePanel from '@/components/StatePanel.vue';
import { ApiError } from '@/services/api';
import { goatService, type GoatOptions, type GoatRecordInput } from '@/services/goat.service';

const route = useRoute();
const router = useRouter();
const originalId = computed(() => String(route.params.goatId || ''));
const encodedOriginalId = computed(() => encodeURIComponent(originalId.value));
const isEdit = computed(() => Boolean(originalId.value));
const options = ref<GoatOptions>();
const loading = ref(true);
const saving = ref(false);
const loadError = ref('');
const error = ref('');
const errors = ref<Record<string, string[]>>({});
const blank = (): GoatRecordInput => ({ goat_id: '', name: '', tag_number: '', breed: 'native', gender: 'female', date_of_birth: '', weight_kg: '', color_markings: '', health_status: 'healthy', health_notes: '', vaccination_status: 'unknown', vaccine_name: '', vaccination_date: '', next_due_date: '', notes: '' });
const form = ref<GoatRecordInput>(blank());
const fieldError = (field: string) => errors.value[field]?.[0] || '';

async function load() {
  loading.value = true; loadError.value = ''; error.value = ''; errors.value = {};
  try {
    const [choiceData, goat] = await Promise.all([goatService.options(), isEdit.value ? goatService.detail(originalId.value) : Promise.resolve(undefined)]);
    options.value = choiceData;
    if (goat) form.value = { goat_id: goat.goat_id, name: goat.name || '', tag_number: goat.tag_number || '', breed: goat.breed, gender: goat.gender, date_of_birth: goat.date_of_birth || '', color_markings: goat.color_markings || '', health_status: goat.health_status, health_notes: goat.health_notes || '', vaccination_status: goat.vaccination_status, vaccine_name: goat.vaccine_name || '', vaccination_date: goat.vaccination_date || '', next_due_date: goat.next_due_date || '', notes: goat.notes || '' };
    else form.value = blank();
  } catch { loadError.value = 'The livestock form could not be prepared.'; }
  finally { loading.value = false; }
}
async function save() {
  if (saving.value) return;
  saving.value = true; error.value = ''; errors.value = {};
  try {
    const saved = isEdit.value ? await goatService.update(originalId.value, form.value) : await goatService.create(form.value);
    const toast = await toastController.create({ message: isEdit.value ? 'Livestock record updated.' : 'Goat registered.', duration: 1700, position: 'top', color: 'success' });
    await toast.present();
    await router.replace(`/app/goats/${encodeURIComponent(saved.goat_id)}`);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'The livestock record could not be saved.';
    if (reason instanceof ApiError) errors.value = (reason.payload as { errors?: Record<string, string[]> } | undefined)?.errors || {};
  } finally { saving.value = false; }
}
onIonViewDidEnter(load);
</script>