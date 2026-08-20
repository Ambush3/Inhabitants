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
    spot_closed: 'notify_condition',
    flag: 'notify_flag',
    image_removed: null,
    event_invite: 'notify_event_invite',
    crew_invite: null,
    crew_join: null,
    crew_spot_added: null,
    skated_with: 'notify_skated_with',
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
        let {
            spot_id,
            addressee_id,
            addressee_ids,
            event_type,
            actor_username,
            actor_id,
            reason,
            event_title,
            event_id,
            crew_id,
            crew_name,
            spot_name,
            feedback_post_id,
        } = await req.json();

        const authToken = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
        if (authToken !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
            const { data: { user }, error: authErr } = await supabase.auth.getUser(authToken);
            if (authErr || !user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
            }
            actor_id = user.id;
            const { data: prof } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .maybeSingle();
            actor_username = prof?.username ?? actor_username ?? 'Someone';
        }

        if (event_type === 'feedback_reply') {
            await supabase.from('notifications').insert({
                user_id: addressee_id,
                type: 'feedback_reply',
                actor_id: actor_id ?? null,
                actor_username: actor_username ?? null,
                feedback_post_id: feedback_post_id ?? null,
            });
            const { data: tokenRow } = await supabase
                .from('push_tokens')
                .select('token')
                .eq('user_id', addressee_id)
                .maybeSingle();
            if (!tokenRow) return new Response(JSON.stringify({ inserted: true }), { status: 200 });
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify({
                    to: tokenRow.token,
                    title: '💬 Reply to your feedback',
                    body: `${actor_username} replied to your feedback`,
                    sound: 'default',
                    data: { url: 'inhabitants://?openFeedback=1' },
                }),
            });
            const result = await response.json();
            return new Response(JSON.stringify(result), { status: 200 });
        }

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
                            ? `inhabitants://friend_accepted?actorId=${actor_id ?? ''}`
                            : 'inhabitants://friend_request',
                    },
                }),
            });

            const result = await response.json();
            return new Response(JSON.stringify(result), { status: 200 });
        }

        if (event_type === 'crew_invite') {
            await supabase.from('notifications').insert({
                user_id: addressee_id,
                type: 'crew_invite',
                actor_id: actor_id ?? null,
                actor_username: actor_username ?? null,
                crew_id: crew_id ?? null,
                crew_name: crew_name ?? null,
            });
            const { data: tokenRow } = await supabase
                .from('push_tokens')
                .select('token')
                .eq('user_id', addressee_id)
                .maybeSingle();
            if (!tokenRow) return new Response(JSON.stringify({ inserted: true }), { status: 200 });
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify({
                    to: tokenRow.token,
                    title: '👥 Crew Invite',
                    body: `${actor_username} invited you to "${crew_name}"`,
                    sound: 'default',
                    data: { url: 'inhabitants://?openCrewInvites=1' },
                }),
            });
            const result = await response.json();
            return new Response(JSON.stringify(result), { status: 200 });
        }

        if (event_type === 'crew_join' || event_type === 'crew_spot_added') {
            const recipients: string[] = Array.isArray(addressee_ids) ? addressee_ids : [];
            if (recipients.length === 0)
                return new Response(JSON.stringify({ noop: true }), { status: 200 });
            const rows = recipients.map((rid) => ({
                user_id: rid,
                type: event_type,
                actor_id: actor_id ?? null,
                actor_username: actor_username ?? null,
                crew_id: crew_id ?? null,
                crew_name: crew_name ?? null,
                spot_id: event_type === 'crew_spot_added' ? spot_id ?? null : null,
                spot_name: event_type === 'crew_spot_added' ? spot_name ?? null : null,
            }));
            await supabase.from('notifications').insert(rows);

            const { data: tokenRows } = await supabase
                .from('push_tokens')
                .select('user_id, token')
                .in('user_id', recipients);
            const { data: actorTokenRows } = actor_id
                ? await supabase.from('push_tokens').select('token').eq('user_id', actor_id)
                : { data: [] };
            const actorTokens = new Set(
                (actorTokenRows ?? []).map((r: any) => r.token).filter(Boolean)
            );
            const tokens = (tokenRows ?? [])
                .map((r: any) => r.token)
                .filter((t: string) => t && !actorTokens.has(t));
            if (tokens.length === 0)
                return new Response(JSON.stringify({ inserted: true }), { status: 200 });
            const title =
                event_type === 'crew_join' ? '👥 New Crew Member' : '📍 New Crew Spot';
            const body =
                event_type === 'crew_join'
                    ? `${actor_username} joined "${crew_name}"`
                    : `${actor_username} added "${spot_name}" to "${crew_name}"`;
            const messages = tokens.map((t: string) => ({
                to: t,
                title,
                body,
                sound: 'default',
                data: { url: `inhabitants://?openCrewId=${crew_id ?? ''}` },
            }));
            let result: unknown = { sent: 0 };
            for (let i = 0; i < messages.length; i += 100) {
                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'Accept-Encoding': 'gzip, deflate',
                    },
                    body: JSON.stringify(messages.slice(i, i + 100)),
                });
                result = await response.json();
            }
            return new Response(JSON.stringify(result), { status: 200 });
        }

        if (event_type === 'event_invite') {
            if (!(await isAllowed(addressee_id, event_type))) {
                return new Response(JSON.stringify({ muted: true }), { status: 200 });
            }

            const { data: tokenRow } = await supabase
                .from('push_tokens')
                .select('token')
                .eq('user_id', addressee_id)
                .single();

            if (!tokenRow) return new Response('No push token', { status: 200 });

            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify({
                    to: tokenRow.token,
                    title: '📅 Event Invite',
                    body: `${actor_username} invited you to "${event_title}"`,
                    sound: 'default',
                    data: {
                        url: `inhabitants://events`,
                    },
                }),
            });

            const result = await response.json();
            return new Response(JSON.stringify(result), { status: 200 });
        }

        if (event_type === 'skated_with') {
            const recipients: string[] = Array.isArray(addressee_ids) ? addressee_ids : [];
            if (recipients.length === 0)
                return new Response(JSON.stringify({ noop: true }), { status: 200 });

            const { data: taggedSpot } = await supabase
                .from('spots')
                .select('name, lat, lng')
                .eq('id', spot_id)
                .maybeSingle();
            const taggedSpotName = taggedSpot?.name ?? spot_name ?? 'a spot';

            const allowed: string[] = [];
            for (const rid of recipients) {
                if (await isAllowed(rid, 'skated_with')) allowed.push(rid);
            }
            if (allowed.length === 0)
                return new Response(JSON.stringify({ muted: true }), { status: 200 });

            await supabase.from('notifications').insert(
                allowed.map((rid) => ({
                    user_id: rid,
                    type: 'skated_with',
                    actor_id: actor_id ?? null,
                    actor_username: actor_username ?? null,
                    spot_id: spot_id ?? null,
                    spot_name: taggedSpotName,
                }))
            );

            const { data: tokenRows } = await supabase
                .from('push_tokens')
                .select('user_id, token')
                .in('user_id', allowed);
            const tokens = (tokenRows ?? [])
                .map((r: any) => r.token)
                .filter((t: string) => !!t);
            if (tokens.length === 0)
                return new Response(JSON.stringify({ inserted: true }), { status: 200 });

            const messages = tokens.map((t: string) => ({
                to: t,
                title: '🛹 Skated Together',
                body: `${actor_username} tagged you at "${taggedSpotName}"`,
                sound: 'default',
                data: {
                    url: `inhabitants://?deepLinkSpotId=${spot_id}&deepLinkLat=${taggedSpot?.lat}&deepLinkLng=${taggedSpot?.lng}`,
                },
            }));
            let taggedResult: unknown = { sent: 0 };
            for (let i = 0; i < messages.length; i += 100) {
                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'Accept-Encoding': 'gzip, deflate',
                    },
                    body: JSON.stringify(messages.slice(i, i + 100)),
                });
                taggedResult = await response.json();
            }
            return new Response(JSON.stringify(taggedResult), { status: 200 });
        }

        if (event_type === 'spot_closed') {
            const { data: closedSpot } = await supabase
                .from('spots')
                .select('user_id, name, lat, lng')
                .eq('id', spot_id)
                .single();
            if (!closedSpot) return new Response('Spot not found', { status: 404 });

            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
            const { data: recentClosed } = await supabase
                .from('notifications')
                .select('id')
                .eq('spot_id', spot_id)
                .eq('type', 'spot_closed')
                .gte('created_at', twelveHoursAgo)
                .limit(1);
            if (recentClosed && recentClosed.length > 0) {
                return new Response(JSON.stringify({ debounced: true }), { status: 200 });
            }

            const [{ data: favs }, { data: wish }, { data: colSpots }] = await Promise.all([
                supabase.from('favorites').select('user_id').eq('spot_id', spot_id),
                supabase.from('wishlists').select('user_id').eq('spot_id', spot_id),
                supabase.from('collection_spots').select('collection_id').eq('spot_id', spot_id),
            ]);

            let listOwners: string[] = [];
            const colIds = [...new Set((colSpots ?? []).map((r: any) => r.collection_id))];
            if (colIds.length > 0) {
                const { data: cols } = await supabase
                    .from('collections')
                    .select('user_id')
                    .in('id', colIds);
                listOwners = (cols ?? []).map((r: any) => r.user_id);
            }

            const recipientSet = new Set<string>([
                closedSpot.user_id,
                ...(favs ?? []).map((r: any) => r.user_id),
                ...(wish ?? []).map((r: any) => r.user_id),
                ...listOwners,
            ]);
            recipientSet.delete(actor_id);
            let recipients = [...recipientSet].filter(Boolean);

            const gated: string[] = [];
            for (const rid of recipients) {
                if (await isAllowed(rid, 'spot_closed')) gated.push(rid);
            }
            recipients = gated;
            if (recipients.length === 0) return new Response(JSON.stringify({ noop: true }), { status: 200 });

            const rows = recipients.map((rid) => ({
                user_id: rid,
                type: 'spot_closed',
                actor_id: actor_id ?? null,
                actor_username: actor_username ?? null,
                spot_id,
                spot_name: closedSpot.name,
            }));
            await supabase.from('notifications').insert(rows);

            const { data: tokenRows } = await supabase
                .from('push_tokens')
                .select('token')
                .in('user_id', recipients);
            const tokens = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);
            if (tokens.length > 0) {
                const messages = tokens.map((t: string) => ({
                    to: t,
                    title: '🚧 Spot Closed',
                    body: `${actor_username} reported "${closedSpot.name}" as closed or under construction`,
                    sound: 'default',
                    data: {
                        url: `inhabitants://?deepLinkSpotId=${spot_id}&deepLinkLat=${closedSpot.lat}&deepLinkLng=${closedSpot.lng}`,
                    },
                }));
                for (let i = 0; i < messages.length; i += 100) {
                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'Accept-Encoding': 'gzip, deflate',
                        },
                        body: JSON.stringify(messages.slice(i, i + 100)),
                    });
                }
            }
            return new Response(JSON.stringify({ inserted: recipients.length }), { status: 200 });
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
                title: '🔖 New Bookmark',
                body: `${actor_username} bookmarked your spot "${spot.name}"`,
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
                    url: `inhabitants://?deepLinkSpotId=${spot_id}&deepLinkLat=${spot.lat}&deepLinkLng=${spot.lng}`,
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
