<template>
  <ion-page class="market-thread-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/marketplace/inbox" /></ion-buttons><ion-title>{{ conversation?.buyer.display_name || 'Conversation' }}</ion-title><ion-buttons slot="end"><button v-if="conversation" class="market-thread-status" type="button" @click="toggleStatus">{{ conversation.status === 'open' ? 'CLOSE' : 'REOPEN' }}</button></ion-buttons></ion-toolbar></ion-header>
    <ion-content><main class="page-wrap market-thread-shell">
      <StatePanel v-if="loading" loading title="Loading conversation" message="Retrieving private buyer messages." />
      <StatePanel v-else-if="error && !conversation" tone="danger" title="Conversation unavailable" :message="error" :retry="load" />
      <template v-else-if="conversation">
        <section class="market-thread-about"><div><small>{{ conversation.goat.goat_id }}</small><h1>{{ conversation.goat.name || conversation.goat.breed_display }}</h1><p>Private conversation with {{ conversation.buyer.display_name }}</p></div><router-link :to="'/app/marketplace/' + conversation.listing_id">VIEW LISTING</router-link></section>
        <div v-if="error" class="automation-command-error">{{ error }}</div>
        <section class="market-message-list">
          <article v-for="message in conversation.messages" :key="message.id" :class="{ mine: message.is_mine }"><div><strong>{{ message.is_mine ? 'You' : message.sender.display_name }}</strong><p v-if="message.body">{{ message.body }}</p><AuthImage v-if="message.image_url" :src="message.image_url" alt="Private inquiry attachment" /><time>{{ dateTime(message.created_at) }}</time></div></article>
          <StatePanel v-if="!conversation.messages.length" title="No messages yet" message="Send a reply to begin the conversation." />
        </section>
        <section v-if="conversation.active_reservation" class="market-thread-reservation"><div><small>ACTIVE RESERVATION</small><strong>{{ conversation.active_reservation.status_display }}</strong><p>{{ money(conversation.active_reservation.agreed_price) }} · {{ conversation.active_reservation.pickup_status_display }}</p></div><router-link to="/app/marketplace/inbox">MANAGE</router-link></section>
      </template>
    </main></ion-content>
    <footer v-if="conversation" class="market-message-composer">
      <form @submit.prevent="send">
        <label class="market-message-attach" :class="{ disabled: !conversation.can_message || sending }" aria-label="Attach a private image"><ion-icon :icon="attachOutline" /><input type="file" accept="image/jpeg,image/png,image/webp" :disabled="!conversation.can_message || sending" @change="selectAttachment" /></label>
        <div class="market-message-input"><span v-if="attachment">{{ attachment.name }}<button type="button" aria-label="Remove attachment" @click="attachment = undefined">×</button></span><textarea v-model="draft" rows="1" maxlength="2000" :disabled="!conversation.can_message || sending" :placeholder="conversation.can_message ? 'Write a reply or attach a photo…' : 'Conversation is closed'" /></div>
        <button type="submit" :disabled="(!draft.trim() && !attachment) || !conversation.can_message || sending">{{ sending ? '…' : 'SEND' }}</button>
      </form>
    </footer>
  </ion-page>
</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import { alertController, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewDidLeave } from '@ionic/vue';
import { attachOutline } from 'ionicons/icons';
import AppBackButton from '@/components/AppBackButton.vue'; import AuthImage from '@/components/AuthImage.vue'; import StatePanel from '@/components/StatePanel.vue';
import { marketplaceService, type MarketplaceConversationDetail } from '@/services/marketplace.service';
const route = useRoute(); const conversation = ref<MarketplaceConversationDetail>(); const loading = ref(true); const error = ref(''); const draft = ref(''); const attachment = ref<File>(); const sending = ref(false); let controller: AbortController | undefined; let active = false;
const id = () => Number(route.params.conversationId); const money = (value: string) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(value)); const dateTime = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
async function load() { controller?.abort(); controller = new AbortController(); loading.value = true; error.value = ''; try { const data = await marketplaceService.sellerConversation(id(), controller.signal); if (active && !controller.signal.aborted) conversation.value = data; } catch (reason) { if (active && !controller.signal.aborted) error.value = reason instanceof Error ? reason.message : 'Unable to load this conversation.'; } finally { if (active && !controller.signal.aborted) loading.value = false; } }
function selectAttachment(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (file && file.size > 5 * 1024 * 1024) { attachment.value = undefined; error.value = 'The image must be 5 MB or smaller.'; return; } attachment.value = file; error.value = ''; }
async function send() { const body = draft.value.trim(); if ((!body && !attachment.value) || sending.value) return; sending.value = true; error.value = ''; try { await marketplaceService.sendSellerMessage(id(), body, attachment.value); draft.value = ''; attachment.value = undefined; await load(); await nextTick(); } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Unable to send the reply.'; } finally { sending.value = false; } }
async function toggleStatus() { if (!conversation.value) return; const action = conversation.value.status === 'open' ? 'close' : 'reopen'; const verb = action === 'close' ? 'Close' : 'Reopen'; const alert = await alertController.create({ header: verb + ' conversation?', buttons: [{ text: 'Cancel', role: 'cancel' }, { text: verb, role: 'confirm' }] }); await alert.present(); if ((await alert.onDidDismiss()).role !== 'confirm') return; try { await marketplaceService.conversationStatus(id(), action); await load(); } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Unable to update the conversation.'; } }
function start() { active = true; void load(); } function stop() { active = false; controller?.abort(); controller = undefined; }
onIonViewDidEnter(start); onIonViewDidLeave(stop); onBeforeUnmount(stop);
</script>