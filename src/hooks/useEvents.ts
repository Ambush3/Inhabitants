import { useState, useRef } from 'react';
import { supabase } from '@/src/libs/supabase';
import { sendEventInviteNotification } from '@/src/libs/sendPushNotification';
import { moderateText } from '@/src/libs/moderator/textModerator';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type EventVisibility = 'public' | 'friends' | 'invite';

export type SkateEvent = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  location_name: string;
  lat: number;
  lng: number;
  spot_id: string | null;
  event_date: string;
  visibility: EventVisibility;
  cancelled: boolean;
  created_at: string;
  creator?: {
    username: string | null;
    avatar_url: string | null;
  };
  invite_count?: number;
  comment_count?: number;
};

export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export type EventRsvp = {
  user_id: string;
  status: RsvpStatus;
  username: string | null;
  avatar_url: string | null;
};

export function useEvents() {
  const [events, setEvents] = useState<SkateEvent[]>([]);
  const [myEvents, setMyEvents] = useState<SkateEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitedEventIds, setInvitedEventIds] = useState<Set<string>>(new Set());
  const [unreadInviteCount, setUnreadInviteCount] = useState(0);
  const [unreadRsvpCount, setUnreadRsvpCount] = useState(0);
  const [eventRsvpCounts, setEventRsvpCounts] = useState<Record<string, { going: number; maybe: number }>>({});

  const prevInvitedIdsRef = useRef<Set<string>>(new Set());

  function clearUnreadRsvpCount() {
    setUnreadRsvpCount(0);
  }

  function subscribeToRsvpChanges(userId: string, myEventIds: string[]) {
    if (myEventIds.length === 0) return () => { };
    const channel = supabase
      .channel(`rsvp-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_rsvps',
        },
        (payload: any) => {
          if (myEventIds.includes(payload.new.event_id) && payload.new.user_id !== userId) {
            setUnreadRsvpCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }

  function clearUnreadInviteCount() {
    setUnreadInviteCount(0);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      AsyncStorage.setItem(`seenInvites:${user.id}`, JSON.stringify([...prevInvitedIdsRef.current]));
    });
  }

  async function loadInvitedEventIds() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('event_invites').select('event_id').eq('user_id', user.id);
    const newIds = new Set((data ?? []).map((r: any) => r.event_id));

    const seenRaw = await AsyncStorage.getItem(`seenInvites:${user.id}`);
    const seenIds = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);

    const newCount = [...newIds].filter((id) => !seenIds.has(id)).length;
    if (newCount > 0) setUnreadInviteCount(newCount);

    prevInvitedIdsRef.current = newIds;
    setInvitedEventIds(newIds);
  }

  async function loadPublicEvents() {
    setLoading(true);
    try {
      const now = new Date();
      now.setHours(now.getHours() - 2);
      const { data, error } = await supabase
        .from('events')
        .select('*, creator:profiles!events_creator_id_fkey(username, avatar_url)')
        .eq('cancelled', false)
        .gte('event_date', now.toISOString())
        .order('event_date', { ascending: true });
      setEvents(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyEvents() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('events')
      .select('*, creator:profiles!events_creator_id_fkey(username, avatar_url)')
      .eq('creator_id', user.id)
      .eq('cancelled', false)
      .gte('event_date', now)
      .order('event_date', { ascending: true });
    setMyEvents(data ?? []);
  }

  async function createEvent(
    title: string,
    description: string,
    locationName: string,
    lat: number,
    lng: number,
    eventDate: Date,
    visibility: EventVisibility,
    spotId?: string | null,
    inviteUserIds?: string[]
  ): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';
    if (!title.trim()) return 'Title is required';
    if (!locationName.trim()) return 'Location is required';

    const titleCheck = moderateText(title.trim());
    if (!titleCheck.allowed) return titleCheck.reason ?? 'Inappropriate content in title.';

    if (description.trim()) {
      const descCheck = moderateText(description.trim());
      if (!descCheck.allowed) return descCheck.reason ?? 'Inappropriate content in description.';
    }

    const locationCheck = moderateText(locationName.trim());
    if (!locationCheck.allowed) return locationCheck.reason ?? 'Inappropriate content in location name.';

    const { error } = await supabase.from('events').insert({
      creator_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      location_name: locationName.trim(),
      lat,
      lng,
      spot_id: spotId ?? null,
      event_date: eventDate.toISOString(),
      visibility,
    });

    if (error) return error.message;

    if (inviteUserIds && inviteUserIds.length > 0) {
      const { data: latestEvent } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestEvent) {
        await supabase.from('event_invites').insert(
          inviteUserIds.map((uid) => ({
            event_id: latestEvent.id,
            user_id: uid,
          }))
        );

        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

        const username = profile?.username ?? 'Someone';
        await Promise.all(
          inviteUserIds.map((uid) => sendEventInviteNotification(uid, username, title.trim(), latestEvent.id))
        );
      }
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await loadMyEvents();
    await loadPublicEvents();
    return null;
  }

  async function updateEvent(
    eventId: string,
    title: string,
    description: string,
    locationName: string,
    eventDate: Date,
    visibility: EventVisibility
  ): Promise<string | null> {
    const titleCheck = moderateText(title.trim());
    if (!titleCheck.allowed) return titleCheck.reason ?? 'Inappropriate content in title.';

    if (description.trim()) {
      const descCheck = moderateText(description.trim());
      if (!descCheck.allowed) return descCheck.reason ?? 'Inappropriate content in description.';
    }

    const locationCheck = moderateText(locationName.trim());
    if (!locationCheck.allowed) return locationCheck.reason ?? 'Inappropriate content in location name.';
    const { error } = await supabase
      .from('events')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        location_name: locationName.trim(),
        event_date: eventDate.toISOString(),
        visibility,
      })
      .eq('id', eventId);
    if (error) return error.message;
    await loadMyEvents();
    await loadPublicEvents();
    return null;
  }

  async function cancelEvent(eventId: string): Promise<string | null> {
    const { error } = await supabase.from('events').update({ cancelled: true }).eq('id', eventId);
    if (error) return error.message;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setMyEvents((prev) => prev.filter((e) => e.id !== eventId));
    return null;
  }
  async function getEventInvites(
    eventId: string
  ): Promise<{ id: string; username: string | null; avatar_url: string | null }[]> {
    const { data } = await supabase
      .from('event_invites')
      .select('user_id, profiles(username, avatar_url)')
      .eq('event_id', eventId);
    return (data ?? []).map((r: any) => ({
      id: r.user_id,
      username: r.profiles?.username ?? null,
      avatar_url: r.profiles?.avatar_url ?? null,
    }));
  }

  async function addInvite(eventId: string, userId: string): Promise<string | null> {
    const { error } = await supabase.from('event_invites').insert({ event_id: eventId, user_id: userId });
    if (error) return error.message;
    return null;
  }

  async function removeInvite(eventId: string, userId: string): Promise<string | null> {
    const { error } = await supabase.from('event_invites').delete().eq('event_id', eventId).eq('user_id', userId);
    if (error) return error.message;
    return null;
  }

  async function loadEventRsvps(eventId: string): Promise<EventRsvp[]> {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('user_id, status, profiles!event_rsvps_user_id_fkey(username, avatar_url)')
      .eq('event_id', eventId);
    console.log('loadEventRsvps data:', data, 'error:', error);
    return (data ?? []).map((r: any) => ({
      user_id: r.user_id,
      status: r.status,
      username: r.profiles?.username ?? null,
      avatar_url: r.profiles?.avatar_url ?? null,
    }));
  }

  async function upsertRsvp(eventId: string, status: RsvpStatus): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';
    const { error } = await supabase.from('event_rsvps').upsert(
      {
        event_id: eventId,
        user_id: user.id,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,user_id' }
    );
    if (error) return error.message;
    return null;
  }

  async function deleteRsvp(eventId: string): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';
    const { error } = await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', user.id);
    if (error) return error.message;
    return null;
  }

  async function loadRsvpCounts(eventIds: string[]) {
    if (eventIds.length === 0) return;
    const { data } = await supabase
      .from('event_rsvps')
      .select('event_id, status')
      .in('event_id', eventIds)
      .in('status', ['going', 'maybe']);
    const counts: Record<string, { going: number; maybe: number }> = {};
    (data ?? []).forEach((r: any) => {
      if (!counts[r.event_id]) counts[r.event_id] = { going: 0, maybe: 0 };
      if (r.status === 'going') counts[r.event_id].going++;
      if (r.status === 'maybe') counts[r.event_id].maybe++;
    });
    setEventRsvpCounts(counts);
  }

  return {
    events,
    myEvents,
    invitedEventIds,
    loading,
    loadPublicEvents,
    loadMyEvents,
    loadInvitedEventIds,
    createEvent,
    updateEvent,
    cancelEvent,
    getEventInvites,
    addInvite,
    removeInvite,
    clearUnreadInviteCount,
    clearUnreadRsvpCount,
    unreadRsvpCount,
    subscribeToRsvpChanges,
    unreadInviteCount,
    loadEventRsvps,
    upsertRsvp,
    deleteRsvp,
    eventRsvpCounts,
    loadRsvpCounts,
  };
}
