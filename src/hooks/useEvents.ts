import { useState, useRef } from 'react';
import { supabase } from '@/src/libs/supabase';
import { sendEventInviteNotification } from '@/src/libs/sendPushNotification';
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
};

export function useEvents() {
  const [events, setEvents] = useState<SkateEvent[]>([]);
  const [myEvents, setMyEvents] = useState<SkateEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitedEventIds, setInvitedEventIds] = useState<Set<string>>(new Set());
  const [unreadInviteCount, setUnreadInviteCount] = useState(0);

  const prevInvitedIdsRef = useRef<Set<string>>(new Set());

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

  function clearUnreadInviteCount() {
    setUnreadInviteCount(0);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      AsyncStorage.setItem(`seenInvites:${user.id}`, JSON.stringify([...prevInvitedIdsRef.current]));
    });
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
    unreadInviteCount,
  };
}
