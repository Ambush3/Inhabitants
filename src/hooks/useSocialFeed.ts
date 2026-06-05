import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Spot } from '@/src/types';

export type FeedActor = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export type FeedItem =
  | {
    kind: 'spot_created';
    id: string;
    created_at: string;
    spot: Spot;
    actor: FeedActor;
  }
  | {
    kind: 'review_left';
    id: string;
    created_at: string;
    spot: Spot;
    actor: FeedActor;
    rating: number;
    comment: string | null;
  }
  | {
    kind: 'check_in';
    id: string;
    created_at: string;
    spot: Spot;
    actor: FeedActor;
  }
  | {
    kind: 'crew_spot_added';
    id: string;
    created_at: string;
    spot: Spot;
    actor: FeedActor;
    crew_id: string;
    crew_name: string;
  };

export function useSocialFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadFeed(friendIds: string[]) {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const myId = user?.id ?? null;

    // crew context
    let myCrewIds: string[] = [];
    let crewMateIds: string[] = [];
    const crewNameById: Record<string, string> = {};
    if (myId) {
      const { data: memberRows } = await supabase
        .from('crew_members')
        .select('crew_id')
        .eq('user_id', myId);
      myCrewIds = (memberRows ?? []).map((r: any) => r.crew_id);
      if (myCrewIds.length > 0) {
        const [crewsRes, mateRes] = await Promise.all([
          supabase.from('crews').select('id, name').in('id', myCrewIds),
          supabase.from('crew_members').select('user_id').in('crew_id', myCrewIds),
        ]);
        (crewsRes.data ?? []).forEach((c: any) => {
          crewNameById[c.id] = c.name;
        });
        const mateSet = new Set<string>();
        (mateRes.data ?? []).forEach((r: any) => {
          if (r.user_id && r.user_id !== myId) mateSet.add(r.user_id);
        });
        crewMateIds = Array.from(mateSet);
      }
    }

    const actorIds = Array.from(new Set([...friendIds, ...crewMateIds]));

    if (actorIds.length === 0 && myCrewIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const [spotsRes, reviewsRes, checkInsRes, crewSpotsRes] = await Promise.all([
      actorIds.length > 0
        ? supabase
          .from('spots')
          .select('*')
          .in('user_id', actorIds)
          .eq('is_flagged', false)
          .order('created_at', { ascending: false })
          .limit(25)
        : Promise.resolve({ data: [] as any[] }),
      actorIds.length > 0
        ? supabase
          .from('reviews')
          .select(
            'id, rating, comment, created_at, user_id, spot_id, spots(id, name, description, lat, lng, created_at, user_id, tags, is_private, friends_only, spot_type, flag_count, is_verified, is_flagged)'
          )
          .in('user_id', actorIds)
          .order('created_at', { ascending: false })
          .limit(25)
        : Promise.resolve({ data: [] as any[] }),
      actorIds.length > 0
        ? supabase
          .from('check_ins')
          .select(
            'id, checked_in_at, user_id, spot_id, spots(id, name, description, lat, lng, created_at, user_id, tags, is_private, friends_only, spot_type, flag_count, is_verified, is_flagged)'
          )
          .in('user_id', actorIds)
          .eq('is_private', false)
          .order('checked_in_at', { ascending: false })
          .limit(25)
        : Promise.resolve({ data: [] as any[] }),
      myCrewIds.length > 0
        ? supabase
          .from('crew_spots')
          .select(
            'crew_id, added_by, added_at, spot:spots(id, name, description, lat, lng, created_at, user_id, tags, is_private, friends_only, spot_type, flag_count, is_verified, is_flagged)'
          )
          .in('crew_id', myCrewIds)
          .order('added_at', { ascending: false })
          .limit(25)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const spotRows = (spotsRes.data ?? []) as Spot[];
    const reviewRows = (reviewsRes.data ?? []) as any[];
    const checkInRows = (checkInsRes.data ?? []) as any[];
    const crewSpotRows = (crewSpotsRes.data ?? []) as any[];

    const allActorIds = Array.from(
      new Set([
        ...spotRows.map((s) => s.user_id).filter((x): x is string => !!x),
        ...reviewRows.map((r) => r.user_id).filter((x): x is string => !!x),
        ...checkInRows.map((c) => c.user_id).filter((x): x is string => !!x),
        ...crewSpotRows.map((r) => r.added_by).filter((x): x is string => !!x),
      ])
    );

    const { data: profiles } = allActorIds.length > 0
      ? await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', allActorIds)
      : { data: [] };

    const profileMap = new Map<string, FeedActor>();
    (profiles ?? []).forEach((p: any) => {
      profileMap.set(p.id, {
        id: p.id,
        username: p.username,
        avatar_url: p.avatar_url,
      });
    });

    const spotItems: FeedItem[] = spotRows
      .filter((s) => s.user_id && profileMap.has(s.user_id))
      .map((s) => ({
        kind: 'spot_created',
        id: `spot-${s.id}`,
        created_at: s.created_at,
        spot: s,
        actor: profileMap.get(s.user_id!)!,
      }));

    const reviewItems: FeedItem[] = reviewRows
      .filter((r) => r.spots && !r.spots.is_flagged && profileMap.has(r.user_id))
      .map((r) => ({
        kind: 'review_left',
        id: `review-${r.id}`,
        created_at: r.created_at,
        spot: r.spots as Spot,
        actor: profileMap.get(r.user_id)!,
        rating: r.rating,
        comment: r.comment,
      }));

    const checkInItems: FeedItem[] = checkInRows
      .filter((c) => c.spots && !c.spots.is_flagged && profileMap.has(c.user_id))
      .map((c) => ({
        kind: 'check_in',
        id: `checkin-${c.id}`,
        created_at: c.checked_in_at,
        spot: c.spots as Spot,
        actor: profileMap.get(c.user_id)!,
      }));

    const crewSpotItems: FeedItem[] = crewSpotRows
      .filter(
        (r) =>
          r.spot &&
          !r.spot.is_flagged &&
          r.added_by &&
          r.added_by !== myId &&
          profileMap.has(r.added_by)
      )
      .map((r) => ({
        kind: 'crew_spot_added',
        id: `crewspot-${r.crew_id}-${r.spot.id}`,
        created_at: r.added_at,
        spot: r.spot as Spot,
        actor: profileMap.get(r.added_by)!,
        crew_id: r.crew_id,
        crew_name: crewNameById[r.crew_id] ?? 'Crew',
      }));

    const merged = [...spotItems, ...reviewItems, ...checkInItems, ...crewSpotItems].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
    setItems(merged.slice(0, 80));
    setLoading(false);
  }

  return { items, loading, loadFeed };
}
