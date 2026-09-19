<template>
  <div class="access-field" :class="{ focused, populated: Boolean(modelValue), invalid }">
    <span class="access-field-index" aria-hidden="true">{{ fieldCode }}</span>
    <span class="access-field-node" aria-hidden="true"><i></i></span>

    <div class="access-field-channel">
      <label class="access-field-label" :for="fieldId">
        <span>{{ label }}</span>
        <small>{{ fieldStatus }}</small>
      </label>

      <div class="access-field-control">
        <ion-icon :icon="icon" aria-hidden="true" />
        <ion-input
          :id="fieldId"
          :value="modelValue"
          :type="revealed ? 'text' : type"
          :autocomplete="autocomplete"
          :placeholder="placeholder"
          :aria-label="label"
          @ionInput="$emit('update:modelValue', String($event.detail.value ?? ''))"
          @ionFocus="focusField"
          @ionBlur="focused = false"
        />
        <button
          v-if="type === 'password'"
          class="access-visibility"
          type="button"
          :aria-label="revealed ? 'Hide password' : 'Show password'"
          :aria-pressed="revealed"
          @click="toggleVisibility"
        >
          <ion-icon :icon="revealed ? eyeOffOutline : eyeOutline" />
          <span>{{ revealed ? 'HIDE KEY' : 'REVEAL KEY' }}</span>
        </button>
      </div>

      <i class="access-field-line" aria-hidden="true"><b></b></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonIcon, IonInput } from '@ionic/vue';
import type { AutocompleteTypes } from '@ionic/core';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';

const props = withDefaults(defineProps<{
  modelValue: string;
  label: string;
  icon: string;
  type?: 'text' | 'password';
  autocomplete?: AutocompleteTypes;
  placeholder?: string;
  invalid?: boolean;
}>(), {
  type: 'text',
  autocomplete: 'off',
  placeholder: '',
  invalid: false,
});

const emit = defineEmits<{ 'update:modelValue': [value: string]; interaction: [] }>();
const focused = ref(false);
const revealed = ref(false);
const fieldCode = computed(() => props.type === 'password' ? '02' : '01');
const fieldId = computed(() => props.type === 'password' ? 'farm-access-key' : 'farm-identity');
const fieldStatus = computed(() => props.invalid ? 'VERIFY INPUT' : focused.value ? 'ACTIVE CHANNEL' : props.modelValue ? 'SIGNAL CAPTURED' : 'AWAITING INPUT');

function focusField() {
  focused.value = true;
  emit('interaction');
}
function toggleVisibility() {
  revealed.value = !revealed.value;
  emit('interaction');
}
</script>
