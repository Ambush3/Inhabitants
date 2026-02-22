import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Spot } from '@/src/types';
import { Region } from 'react-native-maps';

type RatedSpot = Spot & { avg: number; count: number };

export function useTopRated() {
    const [topRated, setTopRated] = useState<RatedSpot[]>([]);
    const [topLoading, setTopLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function loadTopRatedSpotsInArea(region: Region, limit = 10) {
        setError(null);
        setTopLoading(true);

        try {
            const latMin = region.latitude - region.latitudeDelta / 2;
            const latMax = region.latitude + region.latitudeDelta / 2;
            const lngMin = region.longitude - region.longitudeDelta / 2;
            const lngMax = region.longitude + region.longitudeDelta / 2;

            const { data: spotsInBox, error: spotErr } = await supabase
                .from('spots')
                .select('id,name,description,lat,lng,created_at')
                .gte('lat', latMin)
                .lte('lat', latMax)
                .gte('lng', lngMin)
                .lte('lng', lngMax)
                .limit(500);

            if (spotErr) throw spotErr;

            const spotsList = (spotsInBox ?? []) as Spot[];
            if (spotsList.length === 0) {
                setTopRated([]);
                return null;
            }

            const spotIds = spotsList.map(s => s.id);

            const { data: reviews, error: revErr } = await supabase
                .from('reviews')
                .select('spot_id,rating')
                .in('spot_id', spotIds);

            if (revErr) throw revErr;

            const agg = new Map<string, { sum: number; count: number }>();
            for (const r of reviews ?? []) {
                const prev = agg.get(r.spot_id) ?? { sum: 0, count: 0 };
                prev.sum += r.rating;
                prev.count += 1;
                agg.set(r.spot_id, prev);
            }

            const ranked = spotsList
                .map(s => {
                    const a = agg.get(s.id);
                    const count = a?.count ?? 0;
                    const avg = count ? a!.sum / count : 0;
                    return { ...s, avg, count };
                })
                .filter(x => x.count >= 1)
                .sort((a, b) => (b.avg - a.avg) || (b.count - a.count))
                .slice(0, limit);

            setTopRated(ranked);
            return ranked[0] ?? null;
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load top rated spots.');
            return null;
        } finally {
            setTopLoading(false);
        }
    }

    return { topRated, topLoading, error: error, loadTopRatedSpotsInArea };
}