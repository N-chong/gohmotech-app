import { reactive } from 'vue';
import { notificationService } from '@/services/notification.service';

export const notificationState = reactive({
  unreadCount: 0,
  messageUnreadCount: 0,
  loaded: false,
});

let activeRequest: Promise<void> | undefined;

export function refreshNotificationSummary() {
  if (activeRequest) return activeRequest;
  activeRequest = notificationService.summary()
    .then((summary) => {
      notificationState.unreadCount = summary.unread_count;
      notificationState.messageUnreadCount = summary.message_unread_count;
      notificationState.loaded = true;
    })
    .catch(() => undefined)
    .finally(() => { activeRequest = undefined; });
  return activeRequest;
}

export function setNotificationUnreadCount(value: number) {
  notificationState.unreadCount = Math.max(0, value);
  notificationState.loaded = true;
}
