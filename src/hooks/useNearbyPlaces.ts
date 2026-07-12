import  { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Place } from '@/src/types';

export type NearbyResult = {
    status: 'ok' | 'empty' | 'timeout' | 'error';
    count: number;
};

const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

export function useNearbyPlaces() {
    const [places, setPlaces] = useState<Place[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [parksLoading, setParksLoading] = useState(false);
    const [shopsLoading, setShopsLoading] = useState(false);

    const abortRef = useRef<AbortController | null>(null);

    async function loadNearbySkateParks(lat: number, lng: number, radiusMeters = 8000, name?: string, onLoaded?: (places: Place[]) => void): Promise<NearbyResult> {
        return fetchPlaces(lat, lng, radiusMeters, 'skatepark', name, onLoaded);
    }

    async function loadNearbySkateShops(lat: number, lng: number, radiusMeters = 8000, name?: string, onLoaded?: (places: Place[]) => void): Promise<NearbyResult> {
        return fetchPlaces(lat, lng, radiusMeters, 'skateshop', name, onLoaded);
    }

    async function fetchPlaces(lat: number, lng: number, radiusMeters: number, type: 'skatepark' | 'skateshop', name?: string, onLoaded?: (places: Place[]) => void): Promise<NearbyResult> {
        const setLoading = type === 'skatepark' ? setParksLoading : setShopsLoading;
        setLoading(true);
        if (Platform.OS === 'web') {
            setError('Nearby search is native-only for now.');
            setLoading(false);
            return { status: 'error', count: 0 };
        }

        abortRef.current?.abort();
        setError(null);

        const controller = new AbortController();
        abortRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const nameFilter = name ? `["name"~"${name}",i]` : '';

        const query = type === 'skatepark' ? `
            [out:json][timeout:25];
            (
              nwr(around:${radiusMeters},${lat},${lng})["leisure"="skate_park"]${nameFilter};
              nwr(around:${radiusMeters},${lat},${lng})["leisure"="pitch"]["sport"="skateboard"]${nameFilter};
              nwr(around:${radiusMeters},${lat},${lng})["leisure"="pitch"]["sport"="skateboarding"]${nameFilter};
            );
            out center tags;
        `.trim() : `
            [out:json][timeout:25];
            (
              nwr(around:${radiusMeters},${lat},${lng})["shop"="skate"]${nameFilter};
              nwr(around:${radiusMeters},${lat},${lng})["shop"="sports"]["sport"="skateboard"]${nameFilter};
              nwr(around:${radiusMeters},${lat},${lng})["shop"="sports"]["sport"="skateboarding"]${nameFilter};
            );
            out center tags;
        `.trim();

        const emptyMessage = type === 'skatepark'
            ? 'No skate parks found nearby. Try zooming out and searching again.'
            : 'No skate shops found nearby. Try zooming out and searching again.';

        let lastError: string | null = null;
        let outcome: NearbyResult = { status: 'error', count: 0 };

        for (const endpoint of OVERPASS_ENDPOINTS) {
            if (controller.signal.aborted) break;
            try {
                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                    body: `data=${encodeURIComponent(query)}`,
                    signal: controller.signal,
                });

                if (!resp.ok) {
                    lastError = `Server error: HTTP ${resp.status}`;
                    continue;
                }

                const json = await resp.json();
                const normalized: Place[] = (json.elements ?? [])
                    .map((el: any) => {
                        const pLat = el.lat ?? el.center?.lat;
                        const pLng = el.lon ?? el.center?.lon;
                        if (typeof pLat !== 'number' || typeof pLng !== 'number') return null;
                        return {
                            id: `${el.type}-${el.id}`,
                            name: el.tags?.name ?? (type === 'skateshop' ? 'Skate Shop' : 'Skate Park'),
                            type: (el.tags?.shop === 'skate' || el.tags?.shop === 'sports') ? 'skateshop' : 'skatepark',
                            lat: pLat,
                            lng: pLng,
                            tags: el.tags ?? {},
                        } as Place;
                    })
                    .filter((p: Place | null): p is Place => p !== null);

                setError(normalized.length === 0 ? emptyMessage : null);
                if (onLoaded) {
                    onLoaded(normalized)
                } else {
                    setPlaces(normalized)
                }
                lastError = null;
                outcome = { status: normalized.length === 0 ? 'empty' : 'ok', count: normalized.length };
                break;

            } catch (e: any) {
                if (e?.name === 'AbortError') {
                    lastError = 'Search timed out. Try again.';
                    outcome = { status: 'timeout', count: 0 };
                    break;
                }
                lastError = e?.message ?? 'Failed to load nearby places.';
                outcome = { status: 'error', count: 0 };
            }
        }

        if (lastError) {
            try {
                const googleResults = type === 'skatepark'
                    ? await fetchFromGooglePlaces(lat, lng, radiusMeters, type)
                    : [];
                if (googleResults.length > 0) {
                    setError(null);
                    if (onLoaded) {
                        onLoaded(googleResults);
                    } else {
                        setPlaces(googleResults);
                    }
                    outcome = { status: 'ok', count: googleResults.length };
                } else {
                    setError(lastError);
                }
            } catch {
                setError(lastError);
            }
        }

        clearTimeout(timeoutId);
        if (abortRef.current === controller) {
            abortRef.current = null;
            setLoading(false);
        }
        return outcome;
    }

    // Fetch from Google Places API as a fallback if Overpass API fails
    async function fetchFromGooglePlaces(lat: number, lng: number, radiusMeters: number, type: 'skatepark' | 'skateshop'): Promise<Place[]> {
        console.log('fetching from google places', lat, lng, radiusMeters);
        const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
        if (!key) return [];

        const keyword = type === 'skatepark' ? 'skate park' : 'skateboard shop';
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&keyword=${encodeURIComponent(keyword)}&key=${key}`;

        const resp = await fetch(url);
        if (!resp.ok) return [];

        const json = await resp.json();

        const skateKeywords = type === 'skatepark'
            ? ['skate', 'skateboard', 'skatepark', 'skate park']
            : ['skate', 'skateboard', 'skate shop'];

        return (json.results ?? [])
            .filter((el: any) => {
                const name = (el.name ?? '').toLowerCase();
                return skateKeywords.some(k => name.includes(k));
            })
            .map((el: any) => ({
                id: `google-${el.place_id}`,
                name: el.name,
                type,
                lat: el.geometry.location.lat,
                lng: el.geometry.location.lng,
                tags: {},
            } as Place));
    }

    async function fetchPlaceById(placeId: string): Promise<Place | null> {
        const [type, id] = placeId.split('-') as ['node' | 'way' | 'relation', string];

        const query = `
        [out:json][timeout:15];
        ${type}(${id});
        out center tags;
    `.trim();

        for (const endpoint of OVERPASS_ENDPOINTS) {
            try {
                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                    body: `data=${encodeURIComponent(query)}`,
                });
                if (!resp.ok) continue;

                const json = await resp.json();
                const el = json.elements?.[0];
                if (!el) return null;

                const pLat = el.lat ?? el.center?.lat;
                const pLng = el.lon ?? el.center?.lon;
                if (typeof pLat !== 'number' || typeof pLng !== 'number') return null;

                return {
                    id: placeId,
                    name: el.tags?.name ?? 'Skate Location',
                    type: (el.tags?.shop === 'skate' || el.tags?.shop === 'sports') ? 'skateshop' : 'skatepark',
                    lat: pLat,
                    lng: pLng,
                    tags: el.tags ?? {},
                } as Place;
            } catch {
                continue;
            }
        }
        return null;
    }

    return { places, setPlaces, parksLoading, shopsLoading, error, loadNearbySkateParks, loadNearbySkateShops, fetchPlaceById };
}