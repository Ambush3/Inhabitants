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
      };

export function useSocialFeed() {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(false);

    async function loadFeed(friendIds: string[]) {
        if (friendIds.length === 0) {
            setItems([]);
            return;
        }
        setLoading(true);

        const [spotsRes, reviewsRes] = await Promise.all([
            supabase
                .from('spots')
                .select('*')
                .in('user_id', friendIds)
                .eq('is_flagged', false)
                .order('created_at', { ascending: false })
                .limit(25),
            supabase
                .from('reviews')
                .select(
                    'id, rating, comment, created_at, user_id, spot_id, spots(id, name, description, lat, lng, created_at, user_id, tags, is_private, friends_only, spot_type, flag_count, is_verified, is_flagged)'
                )
                .in('user_id', friendIds)
                .order('created_at', { ascending: false })
                .limit(25),
        ]);

        const spotRows = (spotsRes.data ?? []) as Spot[];
        const reviewRows = (reviewsRes.data ?? []) as any[];

        const actorIds = Array.from(
            new Set([
                ...spotRows
                    .map((s) => s.user_id)
                    .filter((x): x is string => !!x),
                ...reviewRows
                    .map((r) => r.user_id)
                    .filter((x): x is string => !!x),
            ])
        );

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', actorIds);

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
            .filter(
                (r) =>
                    r.spots &&
                    !r.spots.is_flagged &&
                    profileMap.has(r.user_id)
            )
            .map((r) => ({
                kind: 'review_left',
                id: `review-${r.id}`,
                created_at: r.created_at,
                spot: r.spots as Spot,
                actor: profileMap.get(r.user_id)!,
                rating: r.rating,
                comment: r.comment,
            }));

        const merged = [...spotItems, ...reviewItems].sort((a, b) =>
            b.created_at.localeCompare(a.created_at)
        );
        setItems(merged.slice(0, 50));
        setLoading(false);
    }

    return { items, loading, loadFeed };
}
