<template>
  <ion-page class="market-inbox-page">
    <ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><AppBackButton fallback="/app/marketplace/manage" /></ion-buttons><ion-title>Marketplace inbox</ion-title></ion-toolbar></ion-header>
    <ion-content><NetworkBanner :last-updated-at="lastUpdatedAt" :retry="load" :busy="loading" /><main class="page-wrap market-inbox-shell">
      <section class="market-inbox-hero"><div><p class="eyebrow">SELLER WORKSPACE</p><h1>Inquiries and reservations</h1><p>Reply to buyers and safely move each sale through pickup.</p></div><span v-if="unreadCount">{{ unreadCount }} UNREAD</span></section>
      <div class="market-inbox-tabs"><button type="button" :class="{ active: tab === 'messages' }" @click="tab = 'messages'">MESSAGES <span>{{ conversations.length }}</span></button><button type="button" :class="{ active: tab === 'reservations' }" @click="tab = 'reservations'">RESERVATIONS <span>{{ reservations.length }}</span></button></div>
      <StatePanel v-if="loading" loading title="Loading seller inbox" message="Checking inquiries and reservations." />
      <StatePanel v-else-if="error" tone="danger" title="Seller inbox unavailable" :message="error" :retry="load" />
      <template v-else>
        <section v-if="tab === 'messages'" class="market-inbox-list">
          <router-link v-for="conversation in conversations" :key="conversation.id" :to="`/app/marketplace/conversations/${conversation.id}`" class="market-conversation-card">
            <div class="market-inbox-avatar">{{ initials(conversation.buyer.display_name) }}</div><div><header><strong>{{ conversation.buyer.display_name }}</strong><time>{{ relativeTime(conversation.updated_at) }}</time></header><h2>{{ conversation.goat.name || conversation.goat.goat_id }}</h2><p>{{ conversation.latest_message?.body || 'Inquiry opened' }}</p><small :class="conversation.status">{{ conversation.status }}</small></div><b v-if="conversation.unread_count">{{ conversation.unread_count }}</b>
          </router-link>
          <StatePanel v-if="!conversations.length" title="No buyer inquiries" message="New buyer messages will appear here." />
        </section>
        <section v-else class="market-reservation-list">
          <article v-for="reservation in reservations" :key="reservation.id" class="market-reservation-card">
            <header><div><small>{{ reservation.goat.goat_id }}</small><h2>{{ reservation.goat.name || reservation.goat.breed_display }}</h2><p>Buyer: {{ reservation.buyer.display_name }}</p></div><span :class="reservation.status">{{ reservation.status_display }}</span></header>
            <dl><div><dt>Price</dt><dd>{{ money(reservation.agreed_price) }}</dd></div><div><dt>Pickup</dt><dd>{{ reservation.pickup_datetime ? dateTime(reservation.pickup_datetime) : reservation.pickup_status_display }}</dd></div></dl>
            <p v-if="reservation.pickup_location" class="market-private-location">Pickup: {{ reservation.pickup_location }}</p>
            <div v-if="reservation.available_actions.length" class="market-reservation-actions">
              <button v-if="hasAction(reservation, 'accept')" class="primary" type="button" @click="act(reservation, 'accept')">ACCEPT</button>
              <button v-if="hasAction(reservation, 'reject')" type="button" @click="act(reservation, 'reject')">REJECT</button>
              <button v-if="hasAction(reservation, 'confirm_pickup')" class="primary" type="button" @click="act(reservation, 'confirm_pickup')">CONFIRM PICKUP</button>
              <button v-if="hasAction(reservation, 'suggest_pickup')" type="button" @click="suggestPickup(reservation)">SUGGEST TIME</button>
              <button v-if="hasAction(reservation, 'complete')" class="primary" type="button" @click="act(reservation, 'complete')">COMPLETE SALE</button>
              <button v-if="hasAction(reservation, 'cancel')" class="danger" type="button" @click="act(reservation, 'cancel')">CANCEL</button>
            </div>
            <router-link class="market-open-thread" :to="`/app/marketplace/conversations/${reservation.conversation_id}`">OPEN CONVERSATION</router-link>
          </article>
          <StatePanel v-if="!reservations.length" title="No reservations" message="Buyer reservation requests will appear here." />
        </section>
      </template>
    </main></ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { alertController, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewDidLeave, toastController } from '@ionic/vue';
import AppBackButton from '@/components/AppBackButton.vue';
import NetworkBanner from '@/components/NetworkBanner.vue';
import StatePanel from '@/components/StatePanel.vue';
import { marketplaceService, type MarketplaceConversation, type MarketplaceReservation, type MarketplaceReservationAction } from '@/services/marketplace.service';
import { relativeTime } from '@/utils/format';

const conversations = ref<MarketplaceConversation[]>([]); const reservations = ref<MarketplaceReservation[]>([]); const unreadCount = ref(0); const loading = ref(true); const error = ref(''); const tab = ref<'messages' | 'reservations'>('messages'); const lastUpdatedAt = ref<string | null>(null); let controller: AbortController | undefined; let active = false;
const hasAction = (item: MarketplaceReservation, action: MarketplaceReservationAction) => item.available_actions.includes(action);
const initials = (value: string) => value.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const money = (value: string) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(value));
const dateTime = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const reasonMessage = (reason: unknown) => reason instanceof Error ? reason.message : 'The marketplace request could not be completed.';
async function load() { controller?.abort(); controller = new AbortController(); loading.value = true; error.value = ''; try { const [inbox, reservationData] = await Promise.all([marketplaceService.sellerConversations(controller.signal), marketplaceService.sellerReservations(controller.signal)]); if (!active || controller.signal.aborted) return; conversations.value = inbox.conversations; reservations.value = reservationData.reservations; unreadCount.value = inbox.unread_count; lastUpdatedAt.value = new Date().toISOString(); } catch (reason) { if (active && !controller.signal.aborted) error.value = reasonMessage(reason); } finally { if (active && !controller.signal.aborted) loading.value = false; } }
async function confirmAction(header: string, message: string, confirm: string) { const alert = await alertController.create({ header, message, buttons: [{ text: 'Back', role: 'cancel' }, { text: confirm, role: 'confirm' }] }); await alert.present(); return (await alert.onDidDismiss()).role === 'confirm'; }
async function act(item: MarketplaceReservation, action: MarketplaceReservationAction) { const labels: Record<string, string> = { accept: 'Accept reservation', reject: 'Reject reservation', cancel: 'Cancel reservation', confirm_pickup: 'Confirm pickup', complete: 'Complete sale' }; if (!await confirmAction(labels[action] || 'Update reservation', `Apply this action for ${item.goat.name || item.goat.goat_id}?`, 'Continue')) return; try { await marketplaceService.reservationAction(item.id, action); await load(); const toast = await toastController.create({ message: 'Reservation updated.', duration: 1600, position: 'top', color: 'success' }); await toast.present(); } catch (reason) { error.value = reasonMessage(reason); } }
async function suggestPickup(item: MarketplaceReservation) { const alert = await alertController.create({ header: 'Suggest pickup', inputs: [{ name: 'pickup_datetime', type: 'datetime-local' }, { name: 'pickup_location', type: 'text', placeholder: 'Private pickup location' }, { name: 'pickup_notes', type: 'textarea', placeholder: 'Pickup notes' }], buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Send', role: 'confirm' }] }); await alert.present(); const result = await alert.onDidDismiss(); if (result.role !== 'confirm' || !result.data?.values?.pickup_datetime) return; try { const values = result.data.values; await marketplaceService.reservationAction(item.id, 'suggest_pickup', { ...values, pickup_datetime: new Date(values.pickup_datetime).toISOString() }); await load(); } catch (reason) { error.value = reasonMessage(reason); } }
function start() { active = true; void load(); } function stop() { active = false; controller?.abort(); controller = undefined; }
onIonViewDidEnter(start); onIonViewDidLeave(stop); onBeforeUnmount(stop);
</script>
