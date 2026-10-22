import { apiRequest } from './api';
import type { ApiPage } from '@/types/api';

export interface MarketplaceGoat {
  id: number;
  goat_id: string;
  name: string;
  tag_number: string;
  breed: string;
  breed_display: string;
  gender: 'male' | 'female';
  gender_display: string;
  age: string;
  weight_kg: number | null;
  health_status: string;
  health_status_display: string;
}

export interface MarketplaceSeller {
  id: number | null;
  farm_name: string;
  location: string;
  badge: string;
  verified: boolean;
}

export interface MarketplaceListing {
  id: number;
  price: string;
  status: 'available' | 'reserved' | 'draft' | 'sold';
  status_display: string;
  is_featured: boolean;
  published_at: string | null;
  updated_at: string;
  goat: MarketplaceGoat;
  seller: MarketplaceSeller;
  cover_image_url: string | null;
  can_manage: boolean;
}

export interface MarketplaceListingDetail extends MarketplaceListing {
  sales_description: string;
  images: Array<{ id: number; image_url: string; angle: string | null; angle_display: string; image_type: string; is_primary: boolean; can_delete: boolean }>;
  livestock_details: {
    date_of_birth: string | null;
    color_markings: string;
    health_notes: string;
    vaccination_status: string;
    vaccination_status_display: string;
    vaccine_name: string;
    vaccination_date: string | null;
    next_due_date: string | null;
  };
}


export interface MarketplaceEligibleGoat {
  id: number;
  goat_id: string;
  name: string;
  breed_display: string;
  gender_display: string;
  age: string;
  weight_kg: number | null;
  cover_image_url: string | null;
}

export interface MarketplaceManagementSnapshot {
  listings: MarketplaceListingDetail[];
  eligible_goats: MarketplaceEligibleGoat[];
}

export interface MarketplaceListingInput {
  goat_id?: number;
  price: string;
  sales_description: string;
}
export interface MarketplaceParticipant { id: number; username: string; display_name: string }
export type MarketplaceReservationAction = 'accept' | 'reject' | 'cancel' | 'suggest_pickup' | 'request_pickup' | 'confirm_pickup' | 'complete';
export interface MarketplaceReservation {
  id: number; conversation_id: number; listing_id: number;
  goat: { goat_id: string; name: string; breed_display: string };
  buyer: MarketplaceParticipant; agreed_price: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'expired'; status_display: string;
  reserved_at: string; accepted_at: string | null; expires_at: string | null;
  rejection_reason: string; cancellation_reason: string;
  pickup_datetime: string | null; pickup_status: string; pickup_status_display: string;
  pickup_notes: string; pickup_location: string; completed_at: string | null;
  available_actions: MarketplaceReservationAction[];
}
export interface MarketplaceConversation {
  id: number; listing_id: number; goat: { goat_id: string; name: string; breed_display: string };
  buyer: MarketplaceParticipant; seller: MarketplaceParticipant; status: 'open' | 'closed'; updated_at: string; unread_count: number;
  latest_message: { body: string; created_at: string } | null; active_reservation: MarketplaceReservation | null;
}
export interface MarketplaceMessage {
  id: number; body: string; sender: MarketplaceParticipant; is_mine: boolean; is_read: boolean;
  created_at: string; image_url: string | null;
}
export interface MarketplaceConversationDetail extends MarketplaceConversation {
  messages: MarketplaceMessage[]; reservations: MarketplaceReservation[]; can_message: boolean;
}
export interface MarketplaceSellerInbox { unread_count: number; conversations: MarketplaceConversation[] }
export interface MarketplaceSellerReservations { reservations: MarketplaceReservation[] }


export interface MarketplaceCriteria {
  search?: string;
  availability?: string;
  breed?: string;
  gender?: string;
  sort?: string;
}

export const marketplaceService = {
  list(criteria: MarketplaceCriteria, page = 1, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page) });
    for (const [key, value] of Object.entries(criteria)) if (value) query.set(key, value);
    return apiRequest<ApiPage<MarketplaceListing>>(`/api/mobile/marketplace/listings/?${query.toString()}`, signal ? { signal } : {});
  },
  detail(id: number, signal?: AbortSignal) {
    return apiRequest<MarketplaceListingDetail>(`/api/mobile/marketplace/listings/${id}/`, signal ? { signal } : {});
  },
  management(signal?: AbortSignal) {
    return apiRequest<MarketplaceManagementSnapshot>('/api/mobile/marketplace/manage/', signal ? { signal } : {});
  },
  createListing(payload: MarketplaceListingInput) {
    return apiRequest<MarketplaceListingDetail>('/api/mobile/marketplace/manage/', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateListing(id: number, payload: MarketplaceListingInput) {
    return apiRequest<MarketplaceListingDetail>(`/api/mobile/marketplace/manage/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  publication(id: number, action: 'publish' | 'unpublish') {
    return apiRequest<MarketplaceListingDetail>(`/api/mobile/marketplace/manage/${id}/`, { method: 'POST', body: JSON.stringify({ action }) });
  },
  uploadPhotos(id: number, files: File[]) {
    const body = new FormData();
    for (const file of files) body.append('photos', file);
    return apiRequest<MarketplaceListingDetail>('/api/mobile/marketplace/manage/' + id + '/images/', { method: 'POST', body });
  },
  photoAction(id: number, imageId: number, action: 'set_primary' | 'delete') {
    return apiRequest<MarketplaceListingDetail>('/api/mobile/marketplace/manage/' + id + '/images/' + imageId + '/', {
      method: 'POST', body: JSON.stringify({ action }),
    });
  },
  sellerConversations(signal?: AbortSignal) {
    return apiRequest<MarketplaceSellerInbox>('/api/mobile/marketplace/seller/conversations/', signal ? { signal } : {});
  },
  sellerConversation(id: number, signal?: AbortSignal) {
    return apiRequest<MarketplaceConversationDetail>(`/api/mobile/marketplace/seller/conversations/${id}/`, signal ? { signal } : {});
  },
  sendSellerMessage(id: number, body: string, image?: File) {
    if (image) {
      const payload = new FormData();
      payload.append('action', 'message');
      payload.append('body', body);
      payload.append('image_attachment', image);
      return apiRequest<MarketplaceMessage>('/api/mobile/marketplace/seller/conversations/' + id + '/', { method: 'POST', body: payload });
    }
    return apiRequest<MarketplaceMessage>('/api/mobile/marketplace/seller/conversations/' + id + '/', { method: 'POST', body: JSON.stringify({ action: 'message', body }) });
  },
  conversationStatus(id: number, action: 'close' | 'reopen') {
    return apiRequest<MarketplaceConversation>(`/api/mobile/marketplace/seller/conversations/${id}/`, { method: 'POST', body: JSON.stringify({ action }) });
  },
  sellerReservations(signal?: AbortSignal) {
    return apiRequest<MarketplaceSellerReservations>('/api/mobile/marketplace/seller/reservations/', signal ? { signal } : {});
  },
  reservationAction(id: number, action: MarketplaceReservationAction, details: Record<string, string> = {}) {
    return apiRequest<MarketplaceReservation>(`/api/mobile/marketplace/seller/reservations/${id}/`, {
      method: 'POST', body: JSON.stringify({ action, ...details }),
    });
  },

};