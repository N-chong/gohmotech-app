<template>
  <ion-button class="app-back-button" fill="clear" :aria-label="label" @click="goBack">
    <ion-icon slot="icon-only" :icon="chevronBackOutline" aria-hidden="true" />
  </ion-button>
</template>

<script setup lang="ts">
import { IonButton, IonIcon, useIonRouter } from '@ionic/vue';
import { chevronBackOutline } from 'ionicons/icons';

const props = withDefaults(defineProps<{ fallback: string; label?: string }>(), {
  label: 'Go back',
});
const ionRouter = useIonRouter();

function goBack() {
  if (ionRouter.canGoBack()) {
    ionRouter.back();
    return;
  }
  ionRouter.navigate(props.fallback, 'back', 'replace');
}
</script>
