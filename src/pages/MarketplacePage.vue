<template>
  <ion-page class="market-page">
    <ion-header class="ion-no-border market-header">
      <ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/more" /></ion-buttons><ion-title>Marketplace</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="page-wrap market-shell">
        <section class="market-command-hero">
          <div class="market-field-lines" aria-hidden="true"></div>
          <header><span class="market-brand-icon"><ion-icon :icon="storefrontOutline" /></span><div><p>GOHMOTECH COMMERCE</p><strong>Trusted livestock exchange</strong></div><span class="market-api-state"><i></i>API PENDING</span></header>
          <h1>Farm intelligence<br><em>meets the market.</em></h1>
          <p>The marketplace exists on the GoHMoTech platform. Mobile listings will connect here once secure listing, inquiry, and reservation endpoints are exposed.</p>
          <div class="market-trust-row"><span><ion-icon :icon="shieldCheckmarkOutline" />Verified farms</span><span><ion-icon :icon="imagesOutline" />Real livestock</span><span><ion-icon :icon="lockClosedOutline" />Protected access</span></div>
        </section>

        <nav class="market-mode-rail" aria-label="Marketplace sections">
          <button v-for="mode in modes" :key="mode.id" type="button" :class="{ active: selectedMode === mode.id }" @click="selectMode(mode.id)"><ion-icon :icon="mode.icon" /><span>{{ mode.label }}</span></button>
        </nav>

        <section class="market-stage" aria-live="polite">
          <template v-if="selectedMode === 'browse'">
            <div class="market-stage-heading"><div><p class="eyebrow">LIVE CATALOG</p><h2>Listings connection</h2></div><span>NOT CONNECTED</span></div>
            <div class="market-signal-empty">
              <span class="market-signal-orbit"><i></i><ion-icon :icon="cloudOfflineOutline" /></span>
              <h3>Mobile catalog awaiting API access</h3>
              <p>No product cards are shown because the app cannot yet retrieve authenticated listings safely.</p>
              <button type="button" @click="detailsOpen = !detailsOpen">{{ detailsOpen ? 'Hide connection details' : 'Why is this unavailable?' }} <ion-icon :icon="chevronDownOutline" /></button>
            </div>
            <div v-if="detailsOpen" class="market-connection-details">
              <div><span>01</span><p><strong>Listing endpoint</strong><small>Required for photos, price, breed, availability, and seller data.</small></p><b>WAITING</b></div>
              <div><span>02</span><p><strong>Inquiry endpoint</strong><small>Required for authenticated buyer and seller conversations.</small></p><b>WAITING</b></div>
              <div><span>03</span><p><strong>Reservation endpoint</strong><small>Required for server-controlled transaction status.</small></p><b>WAITING</b></div>
            </div>
          </template>

          <template v-else-if="selectedMode === 'sell'">
            <div class="market-stage-heading"><div><p class="eyebrow">SELLER WORKSPACE</p><h2>Prepare your livestock</h2></div><span>FARM DATA READY</span></div>
            <div class="seller-prep-flow">
              <article v-for="(item, index) in sellerSteps" :key="item.title"><span>0{{ index + 1 }}</span><div><ion-icon :icon="item.icon" /><h3>{{ item.title }}</h3><p>{{ item.copy }}</p></div></article>
            </div>
            <router-link class="market-inventory-link" to="/app/goats"><span><ion-icon :icon="pawOutline" /></span><div><strong>Review goat inventory</strong><small>Confirm livestock profiles and photography</small></div><ion-icon :icon="chevronForwardOutline" /></router-link>
          </template>

          <template v-else>
            <div class="market-stage-heading"><div><p class="eyebrow">COMMERCE ACTIVITY</p><h2>Inquiries & reservations</h2></div><span>SECURE BY DESIGN</span></div>
            <div class="market-activity-empty"><span><ion-icon :icon="chatbubbleEllipsesOutline" /></span><div><h3>No mobile transaction feed yet</h3><p>Activity will appear only after the backend provides authenticated inquiry and reservation data.</p></div></div>
            <div class="market-guardrail"><ion-icon :icon="shieldCheckmarkOutline" /><p><strong>Your farm data stays protected.</strong><small>The app does not infer buyers, prices, messages, or transaction states.</small></p></div>
          </template>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { cameraOutline, chatbubbleEllipsesOutline, chevronDownOutline, chevronForwardOutline, cloudOfflineOutline, imagesOutline, lockClosedOutline, pawOutline, pricetagOutline, shieldCheckmarkOutline, storefrontOutline, walletOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue';

const selectedMode = ref('browse');
const detailsOpen = ref(false);
const modes = [
  { id: 'browse', label: 'Browse', icon: storefrontOutline },
  { id: 'sell', label: 'Sell', icon: pricetagOutline },
  { id: 'activity', label: 'Activity', icon: walletOutline },
];
const sellerSteps = [
  { title: 'Complete profile', copy: 'Keep breed, age, sex, weight, and health information current.', icon: pawOutline },
  { title: 'Capture angles', copy: 'Prepare clear front, left, right, and rear livestock photographs.', icon: cameraOutline },
  { title: 'Publish securely', copy: 'Listing controls activate only when the marketplace API is available.', icon: lockClosedOutline },
];

function selectMode(mode: string) {
  selectedMode.value = mode;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}
</script>
