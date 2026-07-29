import { useState, useCallback } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Place } from '@/src/types';

const MIN_GAP_MS = 8 * 60 * 60 * 1000;
const NORMAL_AFTER_MS = 24 * 60 * 60 * 1000;

export type PlaceCheckInResult =
  | { ok: true }
  | { ok: false; reason: 'auth' | 'cooldown' | 'error' };

export type PlaceCheckInState = 'available' | 'confirm' | 'recent';

export function usePlaceCheckIns() {
  const [lastCheckInAt, setLastCheckInAt] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

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
  };
}
