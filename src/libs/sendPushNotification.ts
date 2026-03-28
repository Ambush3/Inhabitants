import { supabase } from '@/src/libs/supabase';

export async function sendPushNotification(
    spotId: string,
    eventType: 'review' | 'favorite' | 'wishlist' | 'condition',
    actorUsername: string
) {
    await supabase.functions.invoke('send-push-notification', {
        body: {
            spot_id: spotId,
            event_type: eventType,
            actor_username: actorUsername,
        },
    });
}