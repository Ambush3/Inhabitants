// @ts-nocheck
// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const PREF_COLUMN_BY_TYPE: Record<string, string | null> = {
    friend_request: 'notify_friend_request',
    friend_accepted: 'notify_friend_accepted',
    review: 'notify_review',
    favorite: 'notify_favorite',
    wishlist: 'notify_wishlist',
    condition: 'notify_condition',
    flag: 'notify_flag',
    image_removed: null,
};

async function isAllowed(userId: string, eventType: string): Promise<boolean> {
    const col = PREF_COLUMN_BY_TYPE[eventType];
    if (!col) return true;
    const { data } = await supabase.from('notification_preferences').select(col).eq('user_id', userId).maybeSingle();
    if (!data) return true;
    return data[col] !== false;
}

Deno.serve(async (req) => {
    try {
        const { spot_id, addressee_id, event_type, actor_username, actor_id, reason } = await req.json();

        if (event_type === 'friend_request' || event_type === 'friend_accepted') {
            if (!(await isAllowed(addressee_id, event_type))) {
                return new Response(JSON.stringify({ muted: true }), {
                    status: 200,
                });
            }

            const { data: tokenRow } = await supabase
                .from('push_tokens')
                .select('token, last_friend_request_notify')
                .eq('user_id', addressee_id)
                .single();

            if (!tokenRow) return new Response('No push token', { status: 200 });

            const isAccepted = event_type === 'friend_accepted';

            const now = new Date();
            const last = tokenRow.last_friend_request_notify ? new Date(tokenRow.last_friend_request_notify) : null;
            if (last && now.getTime() - last.getTime() < 60000) {
                return new Response(JSON.stringify({ debounced: true }), {
                    status: 200,
                });
            }
            await supabase
                .from('push_tokens')
                .update({ last_friend_request_notify: now.toISOString() })
                .eq('user_id', addressee_id);

            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify({
                    to: tokenRow.token,
                    title: isAccepted ? 'Friend Request Accepted' : 'Friend Request',
                    body: isAccepted
                        ? `${actor_username} accepted your friend request`
                        : `${actor_username} sent you a friend request`,
                    sound: 'default',
                    data: {
                        url: isAccepted
                            ? `skatespotapp:///friend_accepted?actorId=${actor_id ?? ''}`
                            : 'skatespotapp:///friend_request',
                    },
                }),
            });

            const result = await response.json();
            return new Response(JSON.stringify(result), { status: 200 });
        }

        const { data: spot } = await supabase
            .from('spots')
            .select('user_id, name, lat, lng')
            .eq('id', spot_id)
            .single();

        if (!spot) return new Response('Spot not found', { status: 404 });

        if (!(await isAllowed(spot.user_id, event_type))) {
            return new Response(JSON.stringify({ muted: true }), {
                status: 200,
            });
        }

        const { data: tokenRow } = await supabase
            .from('push_tokens')
            .select('token, last_condition_notify')
            .eq('user_id', spot.user_id)
            .single();

        if (!tokenRow) return new Response('No push token', { status: 200 });

        if (event_type === 'condition') {
            const now = new Date();
            const last = tokenRow.last_condition_notify ? new Date(tokenRow.last_condition_notify) : null;

            if (last && now.getTime() - last.getTime() < 10000) {
                return new Response(JSON.stringify({ debounced: true }), {
                    status: 200,
                });
            }

            await supabase
                .from('push_tokens')
                .update({ last_condition_notify: now.toISOString() })
                .eq('user_id', spot.user_id);
        }

        const messages: Record<string, { title: string; body: string }> = {
            review: {
                title: '⭐ New Review',
                body: `${actor_username} rated your spot "${spot.name}"`,
            },
            favorite: {
                title: '🔖 New Save',
                body: `${actor_username} saved your spot "${spot.name}"`,
            },
            wishlist: {
                title: '⭐ New Wishlist',
                body: `${actor_username} wishlisted your spot "${spot.name}"`,
            },
            condition: {
                title: '📍 New Condition',
                body: `${actor_username} reported a condition at "${spot.name}"`,
            },
            flag: {
                title: '🚩 Spot Flagged',
                body: `Your spot "${spot.name}" was flagged${reason ? `: ${reason}` : ''}`,
            },
            image_removed: {
                title: '🚫 Image Removed',
                body: `An image on your spot "${spot.name}" was removed for violating community guidelines.`,
            },
        };

        const message = messages[event_type];
        if (!message) return new Response('Unknown event type', { status: 400 });

        await supabase.from('notifications').insert({
            user_id: spot.user_id,
            type: event_type,
            actor_id: actor_id ?? null,
            actor_username: actor_username ?? null,
            spot_id,
            spot_name: spot.name,
        });

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
            },
            body: JSON.stringify({
                to: tokenRow.token,
                title: message.title,
                body: message.body,
                sound: 'default',
                data: {
                    url: `skatespotapp:///?deepLinkSpotId=${spot_id}&deepLinkLat=${spot.lat}&deepLinkLng=${spot.lng}`,
                },
            }),
        });

        const result = await response.json();
        return new Response(JSON.stringify(result), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
        });
    }
});
