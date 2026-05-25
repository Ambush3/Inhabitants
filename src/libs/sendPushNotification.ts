import { supabase } from '@/src/libs/supabase';

export async function sendPushNotification(
  spotId: string,
  eventType: 'review' | 'favorite' | 'wishlist' | 'condition',
  actorUsername: string,
  actorId?: string
) {
  await supabase.functions.invoke('send-push-notification', {
    body: {
      spot_id: spotId,
      event_type: eventType,
      actor_username: actorUsername,
      actor_id: actorId,
    },
  });
}

export async function sendFriendRequestNotification(addresseeId: string, actorUsername: string) {
  await supabase.functions.invoke('send-push-notification', {
    body: {
      addressee_id: addresseeId,
      event_type: 'friend_request',
      actor_username: actorUsername,
    },
  });
}

export async function sendFriendAcceptedNotification(addresseeId: string, actorUsername: string, actorId: string) {
  await supabase.functions.invoke('send-push-notification', {
    body: {
      addressee_id: addresseeId,
      event_type: 'friend_accepted',
      actor_username: actorUsername,
      actor_id: actorId,
    },
  });
}

export async function sendEventInviteNotification(
  inviteeId: string,
  actorUsername: string,
  eventTitle: string,
  eventId: string
) {
  await supabase.functions.invoke('send-push-notification', {
    body: {
      addressee_id: inviteeId,
      event_type: 'event_invite',
      actor_username: actorUsername,
      event_title: eventTitle,
      event_id: eventId,
    },
  });
}

