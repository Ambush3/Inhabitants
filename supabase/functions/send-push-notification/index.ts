// @ts-nocheck
// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    const { spot_id, event_type, actor_username, reason } = await req.json();
    console.log('received reason:', reason);

    const { data: spot } = await supabase
        .from('spots')
        .select('user_id, name, lat, lng')
        .eq('id', spot_id)
        .single();

    if (!spot) return new Response('Spot not found', { status: 404 });

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
        return new Response(JSON.stringify({ debounced: true }), { status: 200 });
      }

      await supabase
          .from('push_tokens')
          .update({ last_condition_notify: now.toISOString() })
          .eq('user_id', spot.user_id);
    }

    const messages: Record<string, { title: string; body: string }> = {
      review: {
        title: '⭐ New Review',
        body: `${actor_username} reviewed your spot "${spot.name}"`,
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
    };

    const message = messages[event_type];
    if (!message) return new Response('Unknown event type', { status: 400 });

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});