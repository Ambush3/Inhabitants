import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Spot } from '@/src/types';
import { moderateText } from '@/src/libs/moderator/textModerator';
import { haversineMeters } from '@/src/libs/distance';

const DUPLICATE_RADIUS_METERS = 40;
const DAILY_SPOT_LIMIT = 10;

function normalizeSpotName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s\-_.]+/g, '');
}

export type SpotVisibility = 'public' | 'friends' | 'private';

export function spotVisibility(s: { is_private: boolean; friends_only: boolean }): SpotVisibility {
  if (s.is_private) return 'private';
  if (s.friends_only) return 'friends';
  return 'public';
}

function visibilityFlags(v: SpotVisibility) {
  return {
    is_private: v === 'private',
    friends_only: v === 'friends',
  };
}

export function nextVisibility(v: SpotVisibility): SpotVisibility {
  if (v === 'public') return 'friends';
  if (v === 'friends') return 'private';
  return 'public';
}

export function useSpots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<Spot[]>([]);
  const [searching, setSearching] = useState(false);

  const [mySpots, setMySpots] = useState<Spot[]>([]);
  const [mySpotsLoading, setMySpotsLoading] = useState(false);

  async function loadMySpots() {
    setMySpotsLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMySpotsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setMySpotsLoading(false);
    if (error) return;
    setMySpots((data ?? []) as Spot[]);
  }

  async function reload() {
    setError(null);
    setLoading(true);

    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })
      .limit(500);

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSpots((data ?? []) as Spot[]);
  }

  async function createSpotAt(
    lat: number,
    lng: number,
    name: string,
    description?: string,
    initialRating?: number,
    tags: string[] = [],
    visibility: SpotVisibility = 'public',
    spotType: 'spot' | 'skatepark' | 'skateshop' = 'spot'
  ): Promise<Spot | undefined> {
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Not logged in');
      return;
    }

    const { data: ban } = await supabase.from('banned_users').select('*').eq('user_id', user.id).single();

    if (ban) {
      if (ban.ban_type === 'permanent') {
        setError('You are permanently banned from creating spots.');
        return;
      }
      if (
        (ban.ban_type === 'spots' || ban.ban_type === 'permanent') &&
        ban.banned_until &&
        new Date(ban.banned_until) > new Date()
      ) {
        const until = new Date(ban.banned_until).toLocaleDateString();
        setError(`You are banned from creating spots until ${until}.`);
        return;
      }
    }

    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('spots')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', sinceIso);
    if ((recentCount ?? 0) >= DAILY_SPOT_LIMIT) {
      setError(`You've reached the daily limit of ${DAILY_SPOT_LIMIT} new spots. Try again tomorrow.`);
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    const nameCheck = moderateText(trimmedName);
    if (!nameCheck.allowed) {
      setError(nameCheck.reason ?? 'Inappropriate content.');
      return;
    }

    if (description) {
      const descCheck = moderateText(description.trim());
      if (!descCheck.allowed) {
        setError(descCheck.reason ?? 'Inappropriate content.');
        return;
      }
    }

    for (const tag of tags) {
      const tagCheck = moderateText(tag);
      if (!tagCheck.allowed) {
        setError('One or more tags contain inappropriate content.');
        return;
      }
    }

    const flags = visibilityFlags(visibility);
    const { data: spotData, error: spotErr } = await supabase
      .from('spots')
      .insert({
        name: trimmedName,
        description: (description ?? '').trim() || null,
        lat,
        lng,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        tags,
        is_private: flags.is_private,
        friends_only: flags.friends_only,
        spot_type: spotType,
      })
      .select()
      .single();

    if (spotErr) {
      setError(spotErr.message);
      return;
    }

    const spot = spotData as Spot;

    if ((initialRating ?? 0) > 0) {
      const { error: reviewErr } = await supabase.from('reviews').insert({
        spot_id: spot.id,
        rating: initialRating,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (reviewErr) {
        setError(reviewErr.message);
      }
    }

    setSpots((prev) => [spot, ...prev]);
    return spot;
  }

  async function setSpotVisibility(spot: Spot, visibility: SpotVisibility) {
    const flags = visibilityFlags(visibility);
    const { error } = await supabase.from('spots').update(flags).eq('id', spot.id);

    if (error) {
      setError(error.message);
      return;
    }

    setSpots((prev) => prev.map((s) => (s.id === spot.id ? { ...s, ...flags } : s)));
    setMySpots((prev) => prev.map((s) => (s.id === spot.id ? { ...s, ...flags } : s)));
  }

  async function deleteSpotById(id: string, onDeleted?: () => void) {
    setError(null);

    const { error } = await supabase.from('spots').delete().eq('id', id);

    if (error) {
      setError(error.message);
      return;
    }

    setSpots((prev) => prev.filter((s) => s.id !== id));
    setMySpots((prev) => prev.filter((s) => s.id !== id));
    onDeleted?.();
  }

  async function searchByTag(query: string) {
    setSearching(true);
    const trimmed = query.trim().toLowerCase();
    const normalized = trimmed.replace(/[\s-]+/g, '');
    const results = spots.filter((s) => {
      if (!s.tags || s.is_flagged || s.is_private) return false;
      const nameMatch = s.name.toLowerCase().includes(trimmed);
      const tagMatch = s.tags.some((t) => {
        const normalizedTag = t.replace(/[\s-]+/g, '');
        return normalizedTag === normalized || t === trimmed;
      });
      return nameMatch || tagMatch;
    });
    setSearchResults(results);
    setSearching(false);
  }

  function clearSearch() {
    setSearchResults([]);
  }

  function removeFromSearchResults(id: string) {
    setSearchResults((prev) => prev.filter((s) => s.id !== id));
  }

  async function updateSpot(
    spotId: string,
    name: string,
    description: string,
    tags: string[],
    skipStateUpdate = false
  ): Promise<string | null> {
    const trimmedName = name.trim();
    if (!trimmedName) return 'Name is required';

    const nameCheck = moderateText(trimmedName);
    if (!nameCheck.allowed) return nameCheck.reason ?? 'Inappropriate content.';

    if (description) {
      const descCheck = moderateText(description.trim());
      if (!descCheck.allowed) return descCheck.reason ?? 'Inappropriate content.';
    }

    for (const tag of tags) {
      const tagCheck = moderateText(tag);
      if (!tagCheck.allowed) return 'One or more tags contain inappropriate content.';
    }

    const { error } = await supabase
      .from('spots')
      .update({
        name: trimmedName,
        description: description.trim() || null,
        tags,
      })
      .eq('id', spotId);

    if (error) return error.message;

    if (!skipStateUpdate) {
      setSpots((prev) =>
        prev.map((s) =>
          s.id === spotId ? { ...s, name: trimmedName, description: description.trim() || null, tags } : s
        )
      );
      setMySpots((prev) =>
        prev.map((s) =>
          s.id === spotId ? { ...s, name: trimmedName, description: description.trim() || null, tags } : s
        )
      );
    }
    return null;
  }
  function patchSpotLocal(id: string, fields: Partial<Spot>) {
    setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));
    setMySpots((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  }

  async function findNearbyDuplicate(
    lat: number,
    lng: number,
    name: string,
    opts?: { excludeId?: string; publicOnly?: boolean }
  ): Promise<Spot | null> {
    const target = normalizeSpotName(name);
    if (!target) return null;

    const delta = 0.0007;
    const { data } = await supabase
      .from('spots')
      .select('*')
      .eq('is_flagged', false)
      .gte('lat', lat - delta)
      .lte('lat', lat + delta)
      .gte('lng', lng - delta)
      .lte('lng', lng + delta);

    for (const s of (data ?? []) as Spot[]) {
      if (opts?.excludeId && s.id === opts.excludeId) continue;
      if (opts?.publicOnly && (s.is_private || s.friends_only)) continue;
      if (s.lat == null || s.lng == null) continue;
      if (haversineMeters(lat, lng, s.lat, s.lng) > DUPLICATE_RADIUS_METERS) continue;
      const existing = normalizeSpotName(s.name);
      if (!existing) continue;
      if (existing === target || existing.includes(target) || target.includes(existing)) {
        return s;
      }
    }
    return null;
  }

  return {
    spots,
    mySpots,
    patchSpotLocal,
    mySpotsLoading,
    loading,
    error,
    setError,
    reload,
    loadMySpots,
    createSpotAt,
    findNearbyDuplicate,
    deleteSpotById,
    searchResults,
    searching,
    searchByTag,
    clearSearch,
    setSpotVisibility,
    updateSpot,
    removeFromSearchResults,
  };
}
