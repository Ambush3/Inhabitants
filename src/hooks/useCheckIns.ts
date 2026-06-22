import { useState, useCallback } from 'react';
import { supabase } from '@/src/libs/supabase';

export type CheckIn = {
  id: string;
  user_id: string;
  spot_id: string;
  checked_in_at: string;
  is_private: boolean;
};

export type SpotVisitorSummary = {
  spot_id: string;
  unique_skater_count: number;
};

export type PassportMedia = {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  media_type: 'image' | 'video';
};

export type PassportVisit = {
  id: string;
  checked_in_at: string;
  is_private: boolean;
  media: PassportMedia[];
};

export type PassportEntry = {
  spot_id: string;
  spot_name: string;
  spot_lat: number;
  spot_lng: number;
  visit_count: number;
  last_visited_at: string;
  visits: PassportVisit[];
};

const FEED_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function useCheckIns() {
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [passportEntries, setPassportEntries] = useState<PassportEntry[]>([]);
  const [passportLoading, setPassportLoading] = useState(false);
  const [visitorCounts, setVisitorCounts] = useState<Record<string, number>>({});

  async function getCurrentUserId(): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  }

  const checkIn = useCallback(
    async (
      spotId: string,
      isPrivate = false
    ): Promise<{ success: boolean; error?: string; alreadyCheckedIn?: boolean; checkInId?: string }> => {
      const userId = await getCurrentUserId();
      if (!userId) return { success: false, error: 'Not authenticated' };

      const { data: profile } = await supabase
        .from('profiles')
        .select('public_check_ins')
        .eq('id', userId)
        .single();
      const effectivePrivate = !(profile?.public_check_ins ?? true);

      setCheckingIn(true);
      try {
        const twentyFourHoursAgo = new Date(Date.now() - FEED_COOLDOWN_MS).toISOString();
        const { data: recent } = await supabase
          .from('check_ins')
          .select('id, checked_in_at')
          .eq('user_id', userId)
          .eq('spot_id', spotId)
          .gte('checked_in_at', twentyFourHoursAgo)
          .limit(1)
          .maybeSingle();

        const { data, error } = await supabase
          .from('check_ins')
          .insert({ user_id: userId, spot_id: spotId, is_private: effectivePrivate })
          .select()
          .single();

        if (error) return { success: false, error: error.message };

        const withinCooldown = !!recent;

        if (!withinCooldown && !isPrivate) {
          await supabase.from('feed_items').insert({
            user_id: userId,
            type: 'check_in',
            spot_id: spotId,
            check_in_id: data.id,
          });
        }
        return { success: true, alreadyCheckedIn: withinCooldown, checkInId: data.id };
      } catch (e: any) {
        return { success: false, error: e.message };
      } finally {
        setCheckingIn(false);
      }
    },
    []
  );

  const getVisitorCount = useCallback(async (spotId: string): Promise<number> => {
    const { count } = await supabase
      .from('check_ins')
      .select('user_id', { count: 'exact', head: false })
      .eq('spot_id', spotId)
      .eq('is_private', false);

    const { data } = await supabase
      .from('check_ins')
      .select('user_id')
      .eq('spot_id', spotId)
      .eq('is_private', false);

    if (!data) return 0;
    const unique = new Set(data.map((r) => r.user_id)).size;
    setVisitorCounts((prev) => ({ ...prev, [spotId]: unique }));
    return unique;
  }, []);

  const getMyCheckInsForSpot = useCallback(async (spotId: string): Promise<CheckIn[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('spot_id', spotId)
      .order('checked_in_at', { ascending: false });

    return data ?? [];
  }, []);

  const loadPassport = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    setPassportLoading(true);
    try {
      const { data } = await supabase
        .from('check_ins')
        .select(
          `
          id,
          spot_id,
          checked_in_at,
          is_private,
          spots (
            id,
            name,
            lat,
            lng
          ),
          check_in_media (
            id,
            url,
            thumbnail_url,
            media_type
          )
        `
        )
        .eq('user_id', userId)
        .order('checked_in_at', { ascending: false });

      if (!data) return;

      const grouped = new Map<string, PassportEntry>();
      for (const row of data) {
        const spot = row.spots as any;
        if (!spot) continue;

        const existing = grouped.get(row.spot_id);
        const visit: PassportVisit = {
          id: row.id,
          checked_in_at: row.checked_in_at,
          is_private: row.is_private,
          media: ((row.check_in_media as any) ?? []) as PassportMedia[],
        };

        if (existing) {
          existing.visit_count += 1;
          existing.visits.push(visit);
        } else {
          grouped.set(row.spot_id, {
            spot_id: row.spot_id,
            spot_name: spot.name,
            spot_lat: spot.lat,
            spot_lng: spot.lng,
            visit_count: 1,
            last_visited_at: row.checked_in_at,
            visits: [visit],
          });
        }
      }

      setPassportEntries(Array.from(grouped.values()));
    } finally {
      setPassportLoading(false);
    }
  }, []);

  const togglePrivacy = useCallback(async (checkInId: string, isPrivate: boolean): Promise<boolean> => {
    const { error } = await supabase.from('check_ins').update({ is_private: isPrivate }).eq('id', checkInId);

    if (!error) {
      setPassportEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          visits: entry.visits.map((v) => (v.id === checkInId ? { ...v, is_private: isPrivate } : v)),
        }))
      );
    }
    return !error;
  }, []);

  const deleteCheckIn = useCallback(async (checkInId: string): Promise<boolean> => {
    const { error } = await supabase.from('check_ins').delete().eq('id', checkInId);

    if (!error) {
      setPassportEntries((prev) =>
        prev
          .map((entry) => ({
            ...entry,
            visit_count: entry.visits.filter((v) => v.id !== checkInId).length,
            visits: entry.visits.filter((v) => v.id !== checkInId),
          }))
          .filter((entry) => entry.visit_count > 0)
      );
    }
    return !error;
  }, []);

  const hasCheckedInWithinCooldown = useCallback(async (spotId: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const twentyFourHoursAgo = new Date(Date.now() - FEED_COOLDOWN_MS).toISOString();
    const { data } = await supabase
      .from('check_ins')
      .select('id')
      .eq('user_id', userId)
      .eq('spot_id', spotId)
      .gte('checked_in_at', twentyFourHoursAgo)
      .limit(1)
      .maybeSingle();

    return !!data;
  }, []);

  return {
    loading,
    checkingIn,
    passportEntries,
    passportLoading,
    visitorCounts,
    checkIn,
    getVisitorCount,
    getMyCheckInsForSpot,
    loadPassport,
    togglePrivacy,
    deleteCheckIn,
    hasCheckedInWithinCooldown,
  };
}
