<template>
  <ion-tabs>
    <ion-router-outlet />
    <QuickActionsSheet />
    <ion-tab-bar slot="bottom" class="farm-tab-bar">
      <ion-tab-button tab="home" href="/app/home" aria-label="Home dashboard" @click="tabImpact"><span class="tab-icon-shell"><ion-icon :icon="homeOutline" /></span><ion-label>Home</ion-label></ion-tab-button>
      <ion-tab-button tab="live" href="/app/live" aria-label="Live monitoring" @click="tabImpact"><span class="tab-icon-shell"><ion-icon :icon="videocamOutline" /></span><ion-label>Live</ion-label></ion-tab-button>
      <ion-tab-button tab="goats" href="/app/goats" aria-label="Goat inventory" @click="tabImpact"><span class="tab-icon-shell"><ion-icon :icon="pawOutline" /></span><ion-label>Goats</ion-label></ion-tab-button>
      <ion-tab-button tab="alerts" href="/app/alerts" aria-label="Farm alerts" @click="tabImpact"><span class="tab-icon-shell"><ion-icon :icon="notificationsOutline" /></span><ion-label>Alerts</ion-label></ion-tab-button>
      <ion-tab-button tab="more" href="/app/more" aria-label="More farm tools" @click="tabImpact"><span class="tab-icon-shell"><ion-icon :icon="gridOutline" /></span><ion-label>More</ion-label></ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>
</template>
<script setup lang="ts">
import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { gridOutline, homeOutline, notificationsOutline, pawOutline, videocamOutline } from 'ionicons/icons';
import QuickActionsSheet from '@/components/QuickActionsSheet.vue';
function tabImpact() { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined); }
</script>
