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

export async function sendSpotClosedNotification(
  spotId: string,
  actorUsername: string,
  actorId?: string
) {
  await supabase.functions.invoke('send-push-notification', {
    body: {
      spot_id: spotId,
      event_type: 'spot_closed',
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

export async function sendCrewInviteNotification(
  inviteeId: string,
  actorUsername: string,
  actorId: string,
  crewId: string,
  crewName: string
) {
  await supabase.functions.invoke('send-push-notification', {
    body: {
      addressee_id: inviteeId,
      event_type: 'crew_invite',
      actor_username: actorUsername,
      actor_id: actorId,
      crew_id: crewId,
      crew_name: crewName,
    },
  });
}

export async function sendCrewJoinNotification(
  addresseeIds: string[],
  actorUsername: string,
  actorId: string,
  crewId: string,
  crewName: string
) {
  if (addresseeIds.length === 0) return;
  await supabase.functions.invoke('send-push-notification', {
    body: {
      addressee_ids: addresseeIds,
      event_type: 'crew_join',
      actor_username: actorUsername,
      actor_id: actorId,
      crew_id: crewId,
      crew_name: crewName,
    },
  });
}

export async function sendCrewSpotAddedNotification(
  addresseeIds: string[],
  actorUsername: string,
  actorId: string,
  crewId: string,
  crewName: string,
  spotId: string,
  spotName: string
) {
  if (addresseeIds.length === 0) return;
  await supabase.functions.invoke('send-push-notification', {
    body: {
      addressee_ids: addresseeIds,
      event_type: 'crew_spot_added',
      actor_username: actorUsername,
      actor_id: actorId,
      crew_id: crewId,
      crew_name: crewName,
      spot_id: spotId,
      spot_name: spotName,
    },
  });
}

export async function sendSkatedWithNotification(
  target: { spotId?: string; placeName?: string },
  addresseeIds: string[],
  actorUsername: string,
  actorId: string
) {
  if (addresseeIds.length === 0) return;
  await supabase.functions.invoke('send-push-notification', {
    body: {
      spot_id: target.spotId ?? null,
      spot_name: target.placeName ?? null,
      addressee_ids: addresseeIds,
      event_type: 'skated_with',
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

