<template>
  <ion-back-button
    class="app-back-button"
    :default-href="fallback"
    :aria-label="label"
    :icon="chevronBackOutline"
    text=""
  />
</template>
<script setup lang="ts">
import { IonBackButton } from '@ionic/vue';
import { chevronBackOutline } from 'ionicons/icons';

withDefaults(defineProps<{ fallback: string; label?: string }>(), {
  label: 'Go back',
});
</script>