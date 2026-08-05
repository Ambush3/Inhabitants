import  { useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/libs/supabase';
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

const CACHE_PREFIX = 'nearby_cache_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = { ts: number; places: Place[] };

function tileCacheKey(lat: number, lng: number, radiusMeters: number, type: string): string {
    const round = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
    return `${CACHE_PREFIX}:${type}:${round(lat)}:${round(lng)}:${radiusMeters}`;
}

async function readTileCache(key: string): Promise<Place[] | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;
        const entry = JSON.parse(raw) as CacheEntry;
        const ttl = entry.places.length === 0 ? EMPTY_TTL_MS : CACHE_TTL_MS;
        if (Date.now() - entry.ts > ttl) {
            AsyncStorage.removeItem(key).catch(() => {});
            return null;
        }
        return entry.places;
    } catch {
        return null;
    }
}

async function writeTileCache(key: string, places: Place[]): Promise<void> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), places } as CacheEntry));
    } catch {
    }
}

export function useNearbyPlaces() {
    const [places, setPlaces] = useState<Place[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [parksLoading, setParksLoading] = useState(false);
    const [shopsLoading, setShopsLoading] = useState(false);

    const abortRef = useRef<Record<string, AbortController | null>>({});

    async function loadNearbySkateParks(lat: number, lng: number, radiusMeters = 8000, name?: string, onLoaded?: (places: Place[]) => void): Promise<NearbyResult> {
        return fetchPlaces(lat, lng, radiusMeters, 'skatepark', name, onLoaded);
    }

    async function loadNearbySkateShops(lat: number, lng: number, radiusMeters = 8000, name?: string, onLoaded?: (places: Place[]) => void): Promise<NearbyResult> {
        return fetchPlaces(lat, lng, radiusMeters, 'skateshop', name, onLoaded);
    }

    async function deliverPlaces(places: Place[], onLoaded?: (places: Place[]) => void): Promise<void> {
        let merged = places;
        if (places.length > 0) {
            const ids = places.map((p) => p.id);
            const { data } = await supabase
                .from('place_overrides')
                .select('place_id, name')
                .in('place_id', ids);
            const nameById = new Map(
                (data ?? [])
                    .filter((o: { place_id: string; name: string | null }) => o.name)
                    .map((o: { place_id: string; name: string }) => [o.place_id, o.name])
            );
            if (nameById.size > 0) {
                merged = places.map((p) => (nameById.has(p.id) ? { ...p, name: nameById.get(p.id)! } : p));
            }
        }
        if (onLoaded) onLoaded(merged); else setPlaces(merged);
    }

    async function fetchPlaces(lat: number, lng: number, radiusMeters: number, type: 'skatepark' | 'skateshop', name?: string, onLoaded?: (places: Place[]) => void): Promise<NearbyResult> {
        const setLoading = type === 'skatepark' ? setParksLoading : setShopsLoading;
        setLoading(true);
        if (Platform.OS === 'web') {
            setError('Nearby search is native-only for now.');
            setLoading(false);
            return { status: 'error', count: 0 };
        }

        const emptyMessage = type === 'skatepark'
            ? 'No skate parks found nearby. Try zooming out and searching again.'
            : 'No skate shops found nearby. Try zooming out and searching again.';

        abortRef.current[type]?.abort();
        abortRef.current[type] = null;
        setError(null);

        const cacheKey = !name ? tileCacheKey(lat, lng, radiusMeters, type) : null;
        if (cacheKey) {
            const cached = await readTileCache(cacheKey);
            if (cached) {
                setError(cached.length === 0 ? emptyMessage : null);
                await deliverPlaces(cached, onLoaded);
                setLoading(false);
                return { status: cached.length === 0 ? 'empty' : 'ok', count: cached.length };
            }
        }

        try {
            const { data, error: fnError } = await supabase.functions.invoke('nearby-places', {
                body: { lat, lng, radiusMeters, type, name },
            });
            if (!fnError && data && Array.isArray(data.places)) {
                const proxyPlaces = data.places as Place[];
                setError(proxyPlaces.length === 0 ? emptyMessage : null);
                if (cacheKey) writeTileCache(cacheKey, proxyPlaces);
                await deliverPlaces(proxyPlaces, onLoaded);
                setLoading(false);
                return { status: proxyPlaces.length === 0 ? 'empty' : 'ok', count: proxyPlaces.length };
            }
        } catch {
        }

        const controller = new AbortController();
        abortRef.current[type] = controller;
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
                if (cacheKey) writeTileCache(cacheKey, normalized);
                await deliverPlaces(normalized, onLoaded);
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
            setError(lastError);
        }

        clearTimeout(timeoutId);
        if (abortRef.current[type] === controller) {
            abortRef.current[type] = null;
            setLoading(false);
        }
        return outcome;
    }

    async function fetchPlaceById(placeId: string): Promise<Place | null> {
        const [type, id] = placeId.split('-') as ['node' | 'way' | 'relation', string];

        const { data: ov } = await supabase
            .from('place_overrides')
            .select('name')
            .eq('place_id', placeId)
            .maybeSingle();
        const overrideName = ov?.name ?? null;

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
                    name: overrideName ?? el.tags?.name ?? 'Skate Location',
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