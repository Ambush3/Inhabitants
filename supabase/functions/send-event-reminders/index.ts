// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async () => {
  try {
    const now = new Date();

    const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const window1hStart = new Date(now.getTime() + 50 * 60 * 1000);
    const window1hEnd = new Date(now.getTime() + 70 * 60 * 1000);

    const { data: events24h } = await supabase
      .from('events')
      .select('id, title, location_name, event_date')
      .eq('cancelled', false)
      .gte('event_date', window24hStart.toISOString())
      .lte('event_date', window24hEnd.toISOString());

    const { data: events1h } = await supabase
      .from('events')
      .select('id, title, location_name, event_date')
      .eq('cancelled', false)
      .gte('event_date', window1hStart.toISOString())
      .lte('event_date', window1hEnd.toISOString());

    const allEvents = [
      ...(events24h ?? []).map((e: any) => ({ ...e, reminderType: '24h' })),
      ...(events1h ?? []).map((e: any) => ({ ...e, reminderType: '1h' })),
    ];

    let sent = 0;

    for (const event of allEvents) {
      const { data: rsvps } = await supabase
        .from('event_rsvps')
        .select('user_id')
        .eq('event_id', event.id)
        .eq('status', 'going');

      if (!rsvps || rsvps.length === 0) continue;

      for (const rsvp of rsvps) {
        const { data: prefRow } = await supabase
          .from('notification_preferences')
          .select('notify_event_reminder')
          .eq('user_id', rsvp.user_id)
          .maybeSingle();

        if (prefRow?.notify_event_reminder === false) continue;

        const { data: tokenRow } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', rsvp.user_id)
          .single();

        if (!tokenRow?.token) continue;

        const timeLabel = event.reminderType === '24h' ? 'tomorrow' : 'in 1 hour';
        const eventDate = new Date(event.event_date);
        const timeStr = eventDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify({
            to: tokenRow.token,
            title: '🛹 Event Reminder',
            body: `"${event.title}" is ${timeLabel} at ${timeStr} — ${event.location_name}`,
            sound: 'default',
            data: {
              url: 'skatespotapp:///events',
            },
          }),
        });

        sent++;
      }
    }

    return new Response(JSON.stringify({ sent, events: allEvents.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
