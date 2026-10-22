<template>
  <ion-page class="market-detail-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/marketplace" /></ion-buttons><ion-title>Listing details</ion-title></ion-toolbar></ion-header>
    <ion-content><main class="page-wrap market-detail-shell">
      <StatePanel v-if="loading" loading title="Loading listing" message="Retrieving livestock and seller details." />
      <StatePanel v-else-if="error" tone="danger" title="Listing unavailable" :message="error" :retry="load" />
      <template v-else-if="listing">
        <section class="market-detail-gallery" @pointerdown="pointerStart" @pointerup="pointerEnd">
          <AuthImage :key="activeImage?.id || 'cover'" :src="activeImage?.image_url || listing.cover_image_url" :alt="listing.goat.name || listing.goat.goat_id" />
          <div class="market-photo-shade"></div><span class="market-detail-status" :class="listing.status"><i></i>{{ listing.status_display }}</span><span v-if="listing.is_featured" class="market-detail-featured"><ion-icon :icon="sparklesOutline" />FEATURED</span>
          <div v-if="gallery.length > 1" class="market-gallery-controls"><button type="button" aria-label="Previous image" @click.stop="changeImage(-1)"><ion-icon :icon="chevronBackOutline" /></button><span>{{ activeImageIndex + 1 }} / {{ gallery.length }}</span><button type="button" aria-label="Next image" @click.stop="changeImage(1)"><ion-icon :icon="chevronForwardOutline" /></button></div>
        </section>
        <div v-if="gallery.length > 1" class="market-thumbnail-rail"><button v-for="(image, index) in gallery" :key="image.id" type="button" :class="{ active: index === activeImageIndex }" @click="selectImage(index)"><AuthImage :src="image.image_url" :alt="image.angle_display || 'Listing photo'" /></button></div>

        <section class="market-detail-summary"><div class="market-detail-tag">{{ listing.goat.tag_number || listing.goat.goat_id }}</div><div class="market-detail-price">{{ money(listing.price) }}</div><h1>{{ listing.goat.name || `${listing.goat.breed_display} goat` }}</h1><p>{{ listing.sales_description }}</p><div class="market-detail-specs"><div><ion-icon :icon="bookmarkOutline" /><small>BREED</small><strong>{{ listing.goat.breed_display }}</strong></div><div><ion-icon :icon="maleFemaleOutline" /><small>GENDER</small><strong>{{ listing.goat.gender_display }}</strong></div><div><ion-icon :icon="scaleOutline" /><small>WEIGHT</small><strong>{{ listing.goat.weight_kg ?? '—' }} kg</strong></div><div><ion-icon :icon="calendarOutline" /><small>AGE</small><strong>{{ listing.goat.age }}</strong></div></div></section>

        <section class="market-seller-card"><span><ion-icon :icon="shieldCheckmarkOutline" /></span><div><small>{{ listing.seller.badge }}</small><h2>{{ listing.seller.farm_name }}</h2><p><ion-icon :icon="locationOutline" />{{ listing.seller.location || 'Public location not provided' }}</p></div><em>VERIFIED</em></section>
        <section class="market-pickup-note"><ion-icon :icon="carOutline" /><div><strong>Farm pickup only</strong><p>Inspect the goat and complete payment manually during pickup. No online payment or shipping is involved.</p></div></section>
        <router-link v-if="listing.can_manage" class="market-manager-note" to="/app/marketplace/manage"><ion-icon :icon="informationCircleOutline" /><div><strong>Manage this listing</strong><p>Edit pricing, description, and publication from the protected owner workspace.</p></div></router-link>

        <section class="market-record-section"><div class="rich-section-heading"><div><p class="eyebrow">LIVESTOCK RECORD</p><h2>Health and identity</h2></div></div><dl><div><dt>Health status</dt><dd>{{ listing.goat.health_status_display }}</dd></div><div><dt>Date of birth</dt><dd>{{ date(listing.livestock_details.date_of_birth) }}</dd></div><div><dt>Color / markings</dt><dd>{{ listing.livestock_details.color_markings || 'Not recorded' }}</dd></div><div v-if="listing.livestock_details.health_notes"><dt>Health notes</dt><dd>{{ listing.livestock_details.health_notes }}</dd></div></dl></section>
        <section class="market-record-section"><div class="rich-section-heading"><div><p class="eyebrow">VACCINATION</p><h2>Recorded protection</h2></div></div><dl><div><dt>Status</dt><dd>{{ listing.livestock_details.vaccination_status_display }}</dd></div><div><dt>Latest vaccine</dt><dd>{{ listing.livestock_details.vaccine_name || 'Not recorded' }}</dd></div><div><dt>Vaccination date</dt><dd>{{ date(listing.livestock_details.vaccination_date) }}</dd></div><div><dt>Next due</dt><dd>{{ date(listing.livestock_details.next_due_date) }}</dd></div></dl></section>
      </template>
    </main></ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewDidLeave } from '@ionic/vue';
import { bookmarkOutline, calendarOutline, carOutline, chevronBackOutline, chevronForwardOutline, informationCircleOutline, locationOutline, maleFemaleOutline, scaleOutline, shieldCheckmarkOutline, sparklesOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import AuthImage from '@/components/AuthImage.vue';
import StatePanel from '@/components/StatePanel.vue';
import { marketplaceService, type MarketplaceListingDetail } from '@/services/marketplace.service';

const route = useRoute(); const listing = ref<MarketplaceListingDetail>(); const loading = ref(true); const error = ref(''); const activeImageIndex = ref(0); const pointerX = ref(0); let controller: AbortController | undefined; let active = false;
const gallery = computed(() => listing.value?.images || []); const activeImage = computed(() => gallery.value[activeImageIndex.value]);
function impact() { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
function money(value: string) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value)); }
function date(value: string | null) { return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded'; }
function selectImage(index: number) { activeImageIndex.value = index; impact(); }
function changeImage(direction: number) { if (!gallery.value.length) return; activeImageIndex.value = (activeImageIndex.value + direction + gallery.value.length) % gallery.value.length; impact(); }
function pointerStart(event: PointerEvent) { pointerX.value = event.clientX; }
function pointerEnd(event: PointerEvent) { const distance = event.clientX - pointerX.value; if (Math.abs(distance) > 50) changeImage(distance < 0 ? 1 : -1); }
async function load() { controller?.abort(); controller = new AbortController(); loading.value = true; error.value = ''; try { const value = await marketplaceService.detail(Number(route.params.listingId), controller.signal); if (active && !controller.signal.aborted) { listing.value = value; activeImageIndex.value = 0; } } catch { if (active && !controller.signal.aborted) error.value = 'This listing could not be retrieved or is no longer visible.'; } finally { if (active && !controller.signal.aborted) loading.value = false; } }
function start() { active = true; void load(); }
function stop() { active = false; controller?.abort(); controller = undefined; }
onIonViewDidEnter(start); onIonViewDidLeave(stop); onBeforeUnmount(stop);
</script>