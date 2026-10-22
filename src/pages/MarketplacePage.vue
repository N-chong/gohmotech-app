<template>
  <ion-page class="market-page">
    <ion-header class="ion-no-border market-header"><ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/more" /></ion-buttons><ion-title>Marketplace</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <NetworkBanner :last-updated-at="lastUpdatedAt" :retry="retryConnection" :busy="loading" />
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content pulling-text="SYNC MARKET" refreshing-text="Updating listings…" /></ion-refresher>
      <main class="page-wrap market-shell market-live-shell">
        <section class="market-command-hero market-live-hero">
          <div class="market-field-lines" aria-hidden="true"></div>
          <header><span class="market-brand-icon"><ion-icon :icon="storefrontOutline" /></span><div><p>GOHMOTECH COMMERCE</p><strong>Trusted livestock exchange</strong></div><span class="market-api-state live"><i></i>LIVE DATA</span></header>
          <h1>Farm intelligence<br><em>meets the market.</em></h1>
          <p>Browse real listings from GoHMoTech Smart Farm and approved community sellers.</p>
          <div class="market-trust-row"><span><ion-icon :icon="shieldCheckmarkOutline" />Verified farms</span><span><ion-icon :icon="imagesOutline" />Real livestock</span><span><ion-icon :icon="locationOutline" />Farm pickup</span></div>
        </section>

        <section class="market-catalog-tools">
          <ion-searchbar v-model="search" :debounce="350" placeholder="Search goat, breed, farm, or location" @ionInput="criteriaChanged" />
          <div class="market-filter-row"><button v-for="item in availabilityOptions" :key="item.value" type="button" :class="{ active: availability === item.value }" @click="setAvailability(item.value)">{{ item.label }}</button></div>
          <label class="market-sort"><span>SORT LISTINGS</span><ion-select v-model="sort" interface="popover" @ionChange="criteriaChanged"><ion-select-option value="newest">Newest first</ion-select-option><ion-select-option value="price_low">Lowest price</ion-select-option><ion-select-option value="price_high">Highest price</ion-select-option><ion-select-option value="weight_high">Highest weight</ion-select-option><ion-select-option value="updated">Recently updated</ion-select-option></ion-select></label>
        </section>

        <div class="market-result-heading"><div><p class="eyebrow">LIVE CATALOG</p><h2>Livestock listings</h2></div><router-link v-if="canManage" to="/app/marketplace/manage"><ion-icon :icon="settingsOutline" />MANAGE</router-link><span>{{ total }} RESULT{{ total === 1 ? '' : 'S' }}</span></div>
        <StatePanel v-if="loading && !listings.length" loading title="Loading marketplace" message="Retrieving trusted livestock listings." />
        <StatePanel v-else-if="error && !listings.length" tone="danger" title="Marketplace unavailable" :message="error" :retry="reset" />
        <div v-if="error && listings.length" class="stale-data-notice"><ion-icon :icon="warningOutline" /><div><strong>Showing previously loaded listings</strong><small>{{ error }}</small></div><button type="button" @click="retryConnection">Retry</button></div>
        <section v-if="!loading && !error && !listings.length" class="market-signal-empty"><span class="market-signal-orbit"><i></i><ion-icon :icon="searchOutline" /></span><h3>No listings match this view</h3><p>Try a different search or show all availability states.</p><button type="button" @click="clearCriteria">CLEAR FILTERS</button></section>

        <section v-else-if="listings.length" class="market-listing-grid">
          <article v-for="listing in listings" :key="listing.id" class="market-listing-card" tabindex="0" @click="openListing(listing.id)" @keydown.enter="openListing(listing.id)">
            <div class="market-listing-photo"><AuthImage :src="listing.cover_image_url" :alt="listing.goat.name || listing.goat.goat_id" /><div class="market-photo-shade"></div><span :class="listing.status"><i></i>{{ listing.status_display }}</span><em v-if="listing.is_featured"><ion-icon :icon="sparklesOutline" />FEATURED</em></div>
            <div class="market-listing-body"><div class="market-price-line"><strong>{{ money(listing.price) }}</strong><span>{{ listing.goat.weight_kg ?? '—' }} kg</span></div><small>{{ listing.goat.goat_id }} · {{ listing.goat.breed_display }}</small><h3>{{ listing.goat.name || `${listing.goat.breed_display} goat` }}</h3><p><ion-icon :icon="maleFemaleOutline" />{{ listing.goat.gender_display }} · {{ listing.goat.age }}</p><div class="market-seller-line"><span><ion-icon :icon="shieldCheckmarkOutline" /></span><div><strong>{{ listing.seller.farm_name }}</strong><small>{{ listing.seller.location || listing.seller.badge }}</small></div><ion-icon :icon="chevronForwardOutline" /></div></div>
          </article>
        </section>
        <div v-if="loadMoreError" class="pagination-retry"><span>{{ loadMoreError }}</span><button type="button" @click="loadMore">TRY AGAIN</button></div>
      </main>
      <ion-infinite-scroll :disabled="!hasMore || Boolean(loadMoreError)" threshold="140px" @ionInfinite="loadNext"><ion-infinite-scroll-content loading-spinner="crescent" loading-text="Loading more listings…" /></ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewDidLeave } from '@ionic/vue';
import { chevronForwardOutline, imagesOutline, locationOutline, maleFemaleOutline, searchOutline, settingsOutline, shieldCheckmarkOutline, sparklesOutline, storefrontOutline, warningOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';
import AuthImage from '@/components/AuthImage.vue';
import NetworkBanner from '@/components/NetworkBanner.vue';
import StatePanel from '@/components/StatePanel.vue';
import { usePaginatedResource } from '@/composables/usePaginatedResource';
import { marketplaceService, type MarketplaceListing } from '@/services/marketplace.service';
import { authState } from '@/stores/auth.store';

const router = useRouter(); const canManage = computed(() => Boolean(authState.user?.permissions.manage_farm)); const search = ref(''); const availability = ref(''); const sort = ref('newest');
const availabilityOptions = [{ value: '', label: 'All' }, { value: 'available', label: 'Available' }, { value: 'reserved', label: 'Reserved' }];
const { items: listings, count: total, loading, error, loadMoreError, lastUpdatedAt, hasLoaded, hasMore, activate, deactivate, reset, refresh: refreshPage, loadMore } = usePaginatedResource<MarketplaceListing>({
  fetchPage: (page, signal) => marketplaceService.list({ search: search.value, availability: availability.value, sort: sort.value }, page, signal),
  getKey: (listing) => listing.id,
  initialErrorMessage: 'The trusted marketplace catalog could not be retrieved.',
  moreErrorMessage: 'More listings could not be loaded. Previously loaded listings remain available.',
});
function money(value: string) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(value)); }
function impact() { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
function criteriaChanged() { void reset(); }
function setAvailability(value: string) { if (availability.value === value) return; availability.value = value; impact(); void reset(); }
function clearCriteria() { search.value = ''; availability.value = ''; sort.value = 'newest'; void reset(); }
async function openListing(id: number) { impact(); await router.push(`/app/marketplace/${id}`); }
async function refresh(event: CustomEvent) { await refreshPage(); (event.target as HTMLIonRefresherElement).complete(); }
async function retryConnection() { await (listings.value.length ? refreshPage() : reset()); }
async function loadNext(event: CustomEvent) { await loadMore(); await (event.target as HTMLIonInfiniteScrollElement).complete(); }
function startPage() { activate(); if (!hasLoaded.value) void reset(); }
function stopPage() { deactivate(); }
onIonViewDidEnter(startPage); onIonViewDidLeave(stopPage); onBeforeUnmount(stopPage);
</script>