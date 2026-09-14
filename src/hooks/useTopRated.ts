import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Spot } from '@/src/types';
import { Region } from 'react-native-maps';
import { haversineMeters } from '@/src/libs/distance';

type RatedSpot = Spot & { avg: number; count: number; distanceMeters: number };

type RatedPlace = {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: string;
    spot_type: 'skatepark' | 'skateshop';
    avg: number;
    count: number;
    distanceMeters: number;
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
                .select('id,name,description,lat,lng,created_at,spot_type,tags,user_id,is_private,friends_only')
                .gte('lat', latMin)
                .lte('lat', latMax)
                .gte('lng', lngMin)
                .lte('lng', lngMax)
                .limit(500);

            if (spotErr) throw spotErr;

            const spotsList = (spotsInBox ?? []) as Spot[];
            const center = { lat: region.latitude, lng: region.longitude };

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

            const { data: placeOverrides } = placeIds.length > 0
                ? await supabase.from('place_overrides').select('place_id, name').in('place_id', placeIds)
                : { data: [] };
            const overrideNameById = new Map(
                (placeOverrides ?? [])
                    .filter((o: { place_id: string; name: string | null }) => o.name)
                    .map((o: { place_id: string; name: string }) => [o.place_id, o.name])
            );

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
                    return {
                        ...s,
                        avg,
                        count,
                        distanceMeters: haversineMeters(center.lat, center.lng, s.lat, s.lng),
                    };
                })
                .filter((x) => !x.is_private && !x.friends_only)
                .filter(x => x.count >= 1)
                .sort((a, b) => (b.avg - a.avg) || (b.count - a.count) || (a.distanceMeters - b.distanceMeters))
                .slice(0, limit);

            const rankedPlaces: RatedPlace[] = placesList
                .map(p => {
                    const a = placeAgg.get(p.id);
                    const count = a?.count ?? 0;
                    const avg = count ? a!.sum / count : 0;
                    return {
                        ...p,
                        name: overrideNameById.get(p.id) ?? p.name,
                        spot_type: p.type as 'skatepark' | 'skateshop',
                        avg,
                        count,
                        distanceMeters: haversineMeters(center.lat, center.lng, p.lat, p.lng),
                        isPlace: true as const,
                    };
                })
                .filter(x => x.count >= 1)
                .sort((a, b) => (b.avg - a.avg) || (b.count - a.count) || (a.distanceMeters - b.distanceMeters))
                .slice(0, limit);

            const rated = [...rankedSpots, ...rankedPlaces]
                .sort((a, b) => (b.avg - a.avg) || (b.count - a.count) || (a.distanceMeters - b.distanceMeters))
                .slice(0, limit);

            const ratedIds = new Set(rated.map((item) => item.id));
            const unrated = [
                ...spotsList
                    .filter((spot) => !spot.is_private && !spot.friends_only && !ratedIds.has(spot.id))
                    .map((spot) => ({
                        ...spot,
                        avg: 0,
                        count: 0,
                        distanceMeters: haversineMeters(center.lat, center.lng, spot.lat, spot.lng),
                    })),
                ...placesList
                    .filter((place) => !ratedIds.has(place.id))
                    .map((place) => ({
                        ...place,
                        name: overrideNameById.get(place.id) ?? place.name,
                        spot_type: place.type as 'skatepark' | 'skateshop',
                        avg: 0,
                        count: 0,
                        distanceMeters: haversineMeters(center.lat, center.lng, place.lat, place.lng),
                        isPlace: true as const,
                    })),
            ]
                .sort((a, b) => a.distanceMeters - b.distanceMeters)
                .slice(0, Math.max(0, limit - rated.length));

            const combined = [...rated, ...unrated];

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
