import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Spot } from '@/src/types';
import { Region } from 'react-native-maps';

type RatedSpot = Spot & { avg: number; count: number };

type RatedPlace = {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: string;
    spot_type: 'skatepark' | 'skateshop';
    avg: number;
    count: number;
    isPlace: true;
};

export type TopRatedItem = RatedSpot | RatedPlace;

export function useTopRated() {
    const [topRated, setTopRated] = useState<TopRatedItem[]>([]);
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
                .select('id,name,description,lat,lng,created_at,spot_type,tags,user_id,is_private')
                .gte('lat', latMin)
                .lte('lat', latMax)
                .gte('lng', lngMin)
                .lte('lng', lngMax)
                .limit(500);

            if (spotErr) throw spotErr;

            const spotsList = (spotsInBox ?? []) as Spot[];

            const { data: placesInBox, error: placesErr } = await supabase
                .from('places')
                .select('id,name,lat,lng,type')
                .gte('lat', latMin)
                .lte('lat', latMax)
                .gte('lng', lngMin)
                .lte('lng', lngMax);

            if (placesErr) throw placesErr;

            const placesList = placesInBox ?? [];

            const spotIds = spotsList.map(s => s.id);
            const placeIds = placesList.map(p => p.id);

            const [{ data: spotReviews }, { data: placeReviews }] = await Promise.all([
                spotIds.length > 0
                    ? supabase.from('reviews').select('spot_id,rating').in('spot_id', spotIds)
                    : Promise.resolve({ data: [] }),
                placeIds.length > 0
                    ? supabase.from('place_reviews').select('place_id,rating').in('place_id', placeIds)
                    : Promise.resolve({ data: [] }),
            ]);

            const spotAgg = new Map<string, { sum: number; count: number }>();
            for (const r of spotReviews ?? []) {
                const prev = spotAgg.get(r.spot_id) ?? { sum: 0, count: 0 };
                prev.sum += r.rating;
                prev.count += 1;
                spotAgg.set(r.spot_id, prev);
            }

            const placeAgg = new Map<string, { sum: number; count: number }>();
            for (const r of placeReviews ?? []) {
                const prev = placeAgg.get(r.place_id) ?? { sum: 0, count: 0 };
                prev.sum += r.rating;
                prev.count += 1;
                placeAgg.set(r.place_id, prev);
            }

            const rankedSpots: RatedSpot[] = spotsList
                .map(s => {
                    const a = spotAgg.get(s.id);
                    const count = a?.count ?? 0;
                    const avg = count ? a!.sum / count : 0;
                    return { ...s, avg, count };
                })
                .filter(x => x.count >= 1)
                .sort((a, b) => (b.avg - a.avg) || (b.count - a.count))
                .slice(0, limit);

            const rankedPlaces: RatedPlace[] = placesList
                .map(p => {
                    const a = placeAgg.get(p.id);
                    const count = a?.count ?? 0;
                    const avg = count ? a!.sum / count : 0;
                    return {
                        ...p,
                        spot_type: p.type as 'skatepark' | 'skateshop',
                        avg,
                        count,
                        isPlace: true as const,
                    };
                })
                .filter(x => x.count >= 1)
                .sort((a, b) => (b.avg - a.avg) || (b.count - a.count))
                .slice(0, limit);

            const combined = [...rankedSpots, ...rankedPlaces]
                .sort((a, b) => (b.avg - a.avg) || (b.count - a.count));

            setTopRated(combined);
            return combined[0] ?? null;
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load top rated spots.');
            return null;
        } finally {
            setTopLoading(false);
        }
    }

    function clearTopRated() {
        setTopRated([]);
    }

    return { topRated, topLoading, error, loadTopRatedSpotsInArea, clearTopRated };
}