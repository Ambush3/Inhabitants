import { useState, useCallback } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Place } from '@/src/types';

const MIN_GAP_MS = 8 * 60 * 60 * 1000;
const NORMAL_AFTER_MS = 24 * 60 * 60 * 1000;

export type PlaceCheckInResult =
  | { ok: true }
  | { ok: false; reason: 'auth' | 'cooldown' | 'error' };

export type PlaceCheckInState = 'available' | 'confirm' | 'recent';

export type ParkVisitEntry = {
  place_id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  type: 'skatepark' | 'skateshop';
  visit_count: number;
  last_visit: string;
};

export function usePlaceCheckIns() {
  const [lastCheckInAt, setLastCheckInAt] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [parkEntries, setParkEntries] = useState<ParkVisitEntry[]>([]);
  const [parkEntriesLoading, setParkEntriesLoading] = useState(false);

  const loadParkEntries = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      setParkEntries([]);
      return;
    }
    setParkEntriesLoading(true);
    try {
      const { data: checkIns } = await supabase
        .from('place_check_ins')
        .select('place_id, checked_in_at')
        .eq('user_id', uid)
        .order('checked_in_at', { ascending: false });

      const rows = checkIns ?? [];
      if (rows.length === 0) {
        setParkEntries([]);
        return;
      }

      const ids = [...new Set(rows.map((r) => r.place_id))];
      const [placeResult, overrideResult] = await Promise.all([
        supabase.from('places').select('id, name, lat, lng, type').in('id', ids),
        supabase.from('place_overrides').select('place_id, name').in('place_id', ids),
      ]);
      const placeById = new Map((placeResult.data ?? []).map((p) => [p.id, p]));
      const overrideNameById = new Map(
        (overrideResult.data ?? [])
          .filter((o: { place_id: string; name: string | null }) => o.name)
          .map((o: { place_id: string; name: string }) => [o.place_id, o.name])
      );

      const byPlace = new Map<string, ParkVisitEntry>();
      for (const r of rows) {
        const existing = byPlace.get(r.place_id);
        if (existing) {
          existing.visit_count += 1;
          continue;
        }
        const place = placeById.get(r.place_id);
        byPlace.set(r.place_id, {
          place_id: r.place_id,
          name: overrideNameById.get(r.place_id) ?? place?.name ?? 'Skate Park',
          lat: place?.lat ?? null,
          lng: place?.lng ?? null,
          type: (place?.type as 'skatepark' | 'skateshop') ?? 'skatepark',
          visit_count: 1,
          last_visit: r.checked_in_at,
        });
      }

      setParkEntries(
        [...byPlace.values()].sort(
          (a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime()
        )
      );
    } finally {
      setParkEntriesLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      setLastCheckInAt(new Map());
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('place_check_ins')
      .select('place_id, checked_in_at')
      .eq('user_id', uid);
    const map = new Map<string, number>();
    for (const r of data ?? []) {
      const t = new Date(r.checked_in_at).getTime();
      const prev = map.get(r.place_id);
      if (prev == null || t > prev) map.set(r.place_id, t);
    }
    setLastCheckInAt(map);
    setLoading(false);
  }, []);

  const getPlaceCheckInState = useCallback(
    (placeId: string): PlaceCheckInState => {
      const last = lastCheckInAt.get(placeId);
      if (last == null) return 'available';
      const elapsed = Date.now() - last;
      if (elapsed < MIN_GAP_MS) return 'recent';
      if (elapsed < NORMAL_AFTER_MS) return 'confirm';
      return 'available';
    },
    [lastCheckInAt]
  );

  const checkInPlace = useCallback(
    async (place: Place, isPrivate?: boolean): Promise<PlaceCheckInResult> => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return { ok: false, reason: 'auth' };

      setCheckingIn(true);
      try {
        const last = lastCheckInAt.get(place.id);
        if (last != null && Date.now() - last < MIN_GAP_MS) {
          return { ok: false, reason: 'cooldown' };
        }

        let priv = isPrivate;
        if (priv === undefined) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('public_check_ins')
            .eq('id', uid)
            .maybeSingle();
          priv = prof ? !prof.public_check_ins : false;
        }

        await supabase.from('places').upsert(
          { id: place.id, name: place.name, lat: place.lat, lng: place.lng, type: place.type },
          { onConflict: 'id', ignoreDuplicates: true }
        );

        const { error } = await supabase
          .from('place_check_ins')
          .insert({ user_id: uid, place_id: place.id, is_private: priv });
        if (error) return { ok: false, reason: 'error' };

        setLastCheckInAt((prev) => new Map(prev).set(place.id, Date.now()));
        return { ok: true };
      } finally {
        setCheckingIn(false);
      }
    },
    [lastCheckInAt]
  );

  return {
    parksSkated: lastCheckInAt.size,
    loading,
    checkingIn,
    load,
    checkInPlace,
    getPlaceCheckInState,
    parkEntries,
    parkEntriesLoading,
    loadParkEntries,
  };
}
