<template>
  <ion-page class="market-manage-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/marketplace" /></ion-buttons><ion-title>Manage listings</ion-title></ion-toolbar></ion-header>
    <ion-content><NetworkBanner :last-updated-at="lastUpdatedAt" :retry="load" :busy="loading" /><main class="page-wrap market-manage-shell">
      <section class="market-manage-hero"><div><p class="eyebrow">OWNER WORKSPACE</p><h1>Publish livestock<br><span>with farm truth.</span></h1><p>Draft, review, and publish eligible Smart Farm goats.</p></div><div class="market-manage-hero-actions"><router-link to="/app/marketplace/inbox"><ion-icon :icon="chatbubblesOutline" />SELLER INBOX</router-link><button v-if="eligibleGoats.length" type="button" @click="startCreate"><ion-icon :icon="addOutline" />NEW LISTING</button></div></section>
      <StatePanel v-if="loading && !listings.length" loading title="Loading seller workspace" message="Checking managed listings and eligible goats." />
      <StatePanel v-else-if="error && !listings.length" tone="danger" title="Seller workspace unavailable" :message="error" :retry="load" />
      <div v-if="error && listings.length" class="automation-command-error"><ion-icon :icon="alertCircleOutline" />{{ error }}</div>

      <form v-if="editing" class="market-listing-form" @submit.prevent="saveListing">
        <header><div><small>{{ editing.id ? 'EDIT LISTING' : 'NEW DRAFT' }}</small><h2>{{ editing.id ? editing.goatLabel : 'Select livestock' }}</h2></div><button type="button" @click="editing = undefined">CANCEL</button></header>
        <label v-if="!editing.id"><span>ELIGIBLE GOAT</span><select v-model.number="editing.goatId" required><option :value="0" disabled>Select a goat</option><option v-for="goat in eligibleGoats" :key="goat.id" :value="goat.id">{{ goat.goat_id }} · {{ goat.name || goat.breed_display }}</option></select></label>
        <label><span>PRICE (PHP)</span><input v-model="editing.price" required type="number" min="0.01" step="0.01" inputmode="decimal" /></label>
        <label><span>SALES DESCRIPTION</span><textarea v-model="editing.description" required rows="5" maxlength="5000" placeholder="Describe the goat and sale conditions." /></label>
        <button class="market-form-save" type="submit" :disabled="Boolean(busy)">{{ busy === 'save' ? 'SAVING…' : editing.id ? 'SAVE CHANGES' : 'CREATE DRAFT' }}</button>
      </form>

      <section class="market-managed-section"><div class="rich-section-heading"><div><p class="eyebrow">YOUR INVENTORY</p><h2>Marketplace listings</h2></div><span>{{ listings.length }} LISTINGS</span></div>
        <div v-if="listings.length" class="market-managed-list"><article v-for="listing in listings" :key="listing.id">
          <AuthImage :src="listing.cover_image_url" :alt="listing.goat.name || listing.goat.goat_id" />
          <div><span :class="listing.status"><i></i>{{ listing.status_display }}</span><h3>{{ listing.goat.name || listing.goat.goat_id }}</h3><p>{{ listing.goat.breed_display }} · {{ money(listing.price) }}</p><small>Updated {{ relativeTime(listing.updated_at) }}</small><small>{{ listing.images.length }} / 10 PHOTOS</small></div>
          <div class="market-managed-actions">
            <button type="button" :disabled="['reserved', 'sold'].includes(listing.status)" @click="startEdit(listing)"><ion-icon :icon="createOutline" />EDIT</button>
            <label class="market-photo-upload" :class="{ disabled: ['reserved', 'sold'].includes(listing.status) || busy === 'photos-' + listing.id }"><ion-icon :icon="imagesOutline" />{{ busy === 'photos-' + listing.id ? 'UPLOADING…' : 'ADD PHOTOS' }}<input type="file" accept="image/jpeg,image/png,image/webp" multiple :disabled="['reserved', 'sold'].includes(listing.status) || Boolean(busy)" @change="uploadPhotos(listing, $event)" /></label>
            <button v-if="listing.status === 'draft'" type="button" class="publish" @click="changePublication(listing, 'publish')"><ion-icon :icon="cloudUploadOutline" />PUBLISH</button>
            <button v-else-if="listing.status === 'available'" type="button" @click="changePublication(listing, 'unpublish')"><ion-icon :icon="cloudOfflineOutline" />UNPUBLISH</button>
            <router-link :to="'/app/marketplace/' + listing.id"><ion-icon :icon="eyeOutline" />VIEW</router-link>
          </div>
          <div v-if="listing.images.length" class="market-photo-manager">
            <div v-for="photo in listing.images" :key="photo.id" :class="{ primary: photo.is_primary }"><AuthImage :src="photo.image_url" :alt="photo.angle_display || 'Listing photo'" /><span v-if="photo.is_primary">COVER</span><div><button v-if="!photo.is_primary" type="button" :disabled="Boolean(busy)" aria-label="Use as listing cover" @click="photoAction(listing, photo.id, 'set_primary')"><ion-icon :icon="starOutline" /></button><button v-if="photo.can_delete" type="button" class="danger" :disabled="Boolean(busy)" aria-label="Delete owner-uploaded photo" @click="photoAction(listing, photo.id, 'delete')"><ion-icon :icon="trashOutline" /></button></div></div>
          </div>
        </article></div>
        <StatePanel v-else title="No marketplace listings" message="Create a draft from an eligible active goat." />
      </section>
      <section v-if="!eligibleGoats.length && !loading" class="market-manager-note"><ion-icon :icon="informationCircleOutline" /><div><strong>No unlisted goats available</strong><p>Every eligible active Smart Farm goat already has a listing, or the inventory needs an active goat first.</p></div></section>
    </main></ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { alertController, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewDidLeave, toastController } from '@ionic/vue';
import { addOutline, alertCircleOutline, chatbubblesOutline, cloudOfflineOutline, cloudUploadOutline, createOutline, eyeOutline, imagesOutline, informationCircleOutline, starOutline, trashOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import AuthImage from '@/components/AuthImage.vue';
import NetworkBanner from '@/components/NetworkBanner.vue';
import StatePanel from '@/components/StatePanel.vue';
import { marketplaceService, type MarketplaceEligibleGoat, type MarketplaceListingDetail } from '@/services/marketplace.service';
import { relativeTime } from '@/utils/format';

const listings = ref<MarketplaceListingDetail[]>([]); const eligibleGoats = ref<MarketplaceEligibleGoat[]>([]); const loading = ref(true); const error = ref(''); const busy = ref(''); const lastUpdatedAt = ref<string | null>(null); const editing = ref<{ id?: number; goatId: number; goatLabel: string; price: string; description: string }>(); let controller: AbortController | undefined; let active = false;
function money(value: string) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(value)); }
function message(reason: unknown) { return reason instanceof Error ? reason.message : 'The listing operation could not be completed.'; }
async function load() { controller?.abort(); controller = new AbortController(); loading.value = true; error.value = ''; try { const data = await marketplaceService.management(controller.signal); if (!active || controller.signal.aborted) return; listings.value = data.listings; eligibleGoats.value = data.eligible_goats; lastUpdatedAt.value = new Date().toISOString(); } catch (reason) { if (active && !controller.signal.aborted) error.value = message(reason); } finally { if (active && !controller.signal.aborted) loading.value = false; } }
function startCreate() { editing.value = { goatId: 0, goatLabel: '', price: '', description: '' }; }
function startEdit(listing: MarketplaceListingDetail) { editing.value = { id: listing.id, goatId: listing.goat.id, goatLabel: listing.goat.name || listing.goat.goat_id, price: listing.price, description: listing.sales_description }; }
async function success(copy: string) { editing.value = undefined; await load(); const toast = await toastController.create({ message: copy, duration: 1800, position: 'top', color: 'success' }); await toast.present(); }
async function saveListing() { if (!editing.value || (!editing.value.id && !editing.value.goatId)) return; busy.value = 'save'; error.value = ''; const payload = { goat_id: editing.value.goatId, price: editing.value.price, sales_description: editing.value.description }; try { if (editing.value.id) await marketplaceService.updateListing(editing.value.id, payload); else await marketplaceService.createListing(payload); await success(editing.value?.id ? 'Listing updated.' : 'Draft listing created.'); } catch (reason) { error.value = message(reason); } finally { busy.value = ''; } }
async function changePublication(listing: MarketplaceListingDetail, action: 'publish' | 'unpublish') { const alert = await alertController.create({ header: `${action === 'publish' ? 'Publish' : 'Unpublish'} ${listing.goat.name || listing.goat.goat_id}?`, message: action === 'publish' ? 'The listing will become visible in the trusted public catalog.' : 'The listing will return to draft and disappear from the public catalog.', buttons: [{ text: 'Cancel', role: 'cancel' }, { text: action === 'publish' ? 'Publish' : 'Unpublish', role: 'confirm' }] }); await alert.present(); if ((await alert.onDidDismiss()).role !== 'confirm') return; busy.value = action; error.value = ''; try { await marketplaceService.publication(listing.id, action); await success(`Listing ${action === 'publish' ? 'published' : 'unpublished'}.`); } catch (reason) { error.value = message(reason); } finally { busy.value = ''; } }
async function uploadPhotos(listing: MarketplaceListingDetail, event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = '';
  if (!files.length) return;
  busy.value = 'photos-' + listing.id;
  error.value = '';
  try {
    await marketplaceService.uploadPhotos(listing.id, files);
    await load();
    const countLabel = files.length + ' photo' + (files.length === 1 ? '' : 's') + ' added.';
    const toast = await toastController.create({ message: countLabel, duration: 1800, position: 'top', color: 'success' });
    await toast.present();
  } catch (reason) {
    error.value = message(reason);
  } finally {
    busy.value = '';
  }
}
async function photoAction(listing: MarketplaceListingDetail, imageId: number, action: 'set_primary' | 'delete') {
  if (action === 'delete') {
    const alert = await alertController.create({ header: 'Delete this photo?', message: 'This removes the owner-uploaded photo from the goat record and listing.', buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Delete', role: 'destructive' }] });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'destructive') return;
  }
  busy.value = 'photo-' + imageId;
  error.value = '';
  try {
    await marketplaceService.photoAction(listing.id, imageId, action);
    await load();
    const toast = await toastController.create({ message: action === 'delete' ? 'Photo deleted.' : 'Listing cover updated.', duration: 1800, position: 'top', color: 'success' });
    await toast.present();
  } catch (reason) {
    error.value = message(reason);
  } finally {
    busy.value = '';
  }
}function start() { active = true; void load(); }
function stop() { active = false; controller?.abort(); controller = undefined; }
onIonViewDidEnter(start); onIonViewDidLeave(stop); onBeforeUnmount(stop);
</script>