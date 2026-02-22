import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Place } from '@/src/types';

export function useNearbyPlaces() {
    const [places, setPlaces] = useState<Place[]>([]);
    const [placesLoading, setPlacesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const abortRef = useRef<AbortController | null>(null);

    async function loadNearbySkateParks(lat: number, lng: number, radiusMeters = 8000) {
        if (Platform.OS === 'web') {
            setError('Nearby search is native-only for now.');
            return;
        }

        abortRef.current?.abort();

        setError(null);
        setPlacesLoading(true);

        const controller = new AbortController();
        abortRef.current = controller;

        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const query = `
                [out:json][timeout:25];
                (
                  nwr(around:${radiusMeters},${lat},${lng})["leisure"="skate_park"];
                  nwr(around:${radiusMeters},${lat},${lng})["shop"="skate"];
                  nwr(around:${radiusMeters},${lat},${lng})["leisure"="pitch"]["sport"="skateboard"];
                  nwr(around:${radiusMeters},${lat},${lng})["leisure"="pitch"]["sport"="skateboarding"];
                );
                out center tags;
            `.trim();

            const resp = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal,
            });

            if (!resp.ok) throw new Error(`Overpass error: HTTP ${resp.status}`);

            const json = await resp.json();

            const normalized: Place[] = (json.elements ?? [])
                .map((el: any) => {
                    const pLat = el.lat ?? el.center?.lat;
                    const pLng = el.lon ?? el.center?.lon;
                    if (typeof pLat !== 'number' || typeof pLng !== 'number') return null;
                    return {
                        id: `${el.type}-${el.id}`,
                        name: el.tags?.name ?? (el.tags?.leisure === 'skate_park' ? 'Skate park' : 'Skatepark'),
                        lat: pLat,
                        lng: pLng,
                        tags: el.tags ?? {},
                    } as Place;
                })
                .filter((p: Place | null): p is Place => p !== null);

            setPlaces(normalized);
        } catch (e: any) {
            setError(
                e?.name === 'AbortError'
                    ? 'Search timed out. Try again.'
                    : (e?.message ?? 'Failed to load nearby places.')
            );
        } finally {
            clearTimeout(timeoutId);
            if (abortRef.current === controller) {
                abortRef.current = null;
                setPlacesLoading(false);
            }
        }
    }

    return { places, placesLoading, error, loadNearbySkateParks };
}