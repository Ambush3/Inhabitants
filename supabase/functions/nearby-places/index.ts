// @ts-nocheck
// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const OVERPASS_ENDPOINTS = [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const USER_AGENT = 'InhabitantsApp/1.0 (skatespot discovery; contact: aaronbush3@gmail.com)';
const OVERPASS_BUDGET_MS = 18000;
const OVERPASS_ENDPOINT_TIMEOUT_MS = 9000;
const GOOGLE_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const GOOGLE_CACHE_TTL_MS = 30 * 60 * 1000;
const EMPTY_TTL_MS = 60 * 60 * 1000;

function round(n: number): string {
    return (Math.round(n * 100) / 100).toFixed(2);
}

function boundingBox(lat: number, lng: number, radiusMeters: number): string {
    const latDelta = radiusMeters / 111320;
    const lngDelta = radiusMeters / (111320 * Math.max(0.01, Math.cos(lat * Math.PI / 180)));
    return `${lat - latDelta},${lng - lngDelta},${lat + latDelta},${lng + lngDelta}`;
}

function buildQuery(lat: number, lng: number, radiusMeters: number, type: string, name?: string): string {
    const nameFilter = name ? `["name"~"${name}",i]` : '';
    const bbox = boundingBox(lat, lng, radiusMeters);
    if (type === 'skatepark') {
        return `
            [out:json][timeout:15];
            (
              nwr["leisure"="skate_park"]${nameFilter}(${bbox});
              nwr["leisure"="pitch"]["sport"="skateboard"]${nameFilter}(${bbox});
              nwr["leisure"="pitch"]["sport"="skateboarding"]${nameFilter}(${bbox});
            );
            out center tags;
        `.trim();
    }
    return `
        [out:json][timeout:15];
        (
          nwr["shop"="skate"]${nameFilter}(${bbox});
          nwr["shop"="sports"]["sport"="skateboard"]${nameFilter}(${bbox});
          nwr["shop"="sports"]["sport"="skateboarding"]${nameFilter}(${bbox});
        );
        out center tags;
    `.trim();
}

function normalizeOverpass(json: any, type: string): any[] {
    return (json.elements ?? [])
        .map((el: any) => {
            const pLat = el.lat ?? el.center?.lat;
            const pLng = el.lon ?? el.center?.lon;
            if (typeof pLat !== 'number' || typeof pLng !== 'number') return null;
            return {
                id: `${el.type}-${el.id}`,
                name: el.tags?.name ?? (type === 'skateshop' ? 'Skate Shop' : 'Skate Park'),
                type,
                lat: pLat,
                lng: pLng,
                tags: el.tags ?? {},
                hours: el.tags?.opening_hours ?? null,
            };
        })
        .filter((p: any) => p !== null);
}

async function queryOverpass(lat: number, lng: number, radiusMeters: number, type: string, name?: string): Promise<{ places: any[]; partial: boolean }> {
    const query = buildQuery(lat, lng, radiusMeters, type, name);
    const deadline = Date.now() + OVERPASS_BUDGET_MS;
    let lastError: Error | null = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) break;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), Math.min(remainingMs, OVERPASS_ENDPOINT_TIMEOUT_MS));
        try {
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'User-Agent': USER_AGENT,
                },
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal,
            });
            if (!resp.ok) {
                lastError = new Error(`Overpass HTTP ${resp.status}`);
                continue;
            }
            const json = await resp.json();
            if (!Array.isArray(json?.elements) || (json.remark && json.elements.length === 0)) {
                throw new Error(json?.remark ?? 'Invalid Overpass response');
            }
            return { places: normalizeOverpass(json, type), partial: Boolean(json.remark) };
        } catch (e) {
            lastError = e as Error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
    throw lastError ?? new Error('Overpass failed');
}

async function queryGoogle(lat: number, lng: number, radiusMeters: number, type: string): Promise<any[]> {
    const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!key) throw new Error('Google Places is not configured');
    const keyword = type === 'skatepark' ? 'skate park' : 'skateboard shop';
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&keyword=${encodeURIComponent(keyword)}&key=${key}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);
    let resp: Response;
    let json: any;
    try {
        resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw new Error(`Google Places HTTP ${resp.status}`);
        json = await resp.json();
    } finally {
        clearTimeout(timeoutId);
    }
    if (json.status === 'ZERO_RESULTS') return [];
    if (json.status !== 'OK' || !Array.isArray(json.results)) {
        throw new Error(`Google Places failed: ${json.status ?? 'invalid response'}`);
    }
    return json.results
        .filter((el: any) => {
            const nm = (el.name ?? '').toLowerCase();
            const parkName = /\b(skate\s*park|skatepark|diy\s*skate|pump\s*track)\b/.test(nm);
            const shopName = /\b(shop|store)\b/.test(nm);
            if (type === 'skateshop') {
                return !parkName && !el.types?.includes('park') &&
                    (shopName || /\bskateboards?\b/.test(nm) || /\bskate\b/.test(nm));
            }
            return !shopName && !el.types?.some((placeType: string) => placeType === 'store' || placeType.endsWith('_store')) &&
                (parkName || /\bskate(board|boarding)?\b/.test(nm));
        })
        .map((el: any) => ({
            id: `google-${el.place_id}`,
            name: el.name,
            type,
            lat: el.geometry.location.lat,
            lng: el.geometry.location.lng,
            tags: {},
            hours: null,
        }));
}

function mergeParks(osm: any[], google: any[]): any[] {
    const merged = [...osm];
    for (const place of google) {
        const duplicate = osm.some((known) => {
            const latMeters = (known.lat - place.lat) * 111320;
            const lngMeters = (known.lng - place.lng) * 111320 * Math.cos(place.lat * Math.PI / 180);
            return Math.hypot(latMeters, lngMeters) < 100;
        });
        if (!duplicate) merged.push(place);
    }
    return merged;
}

Deno.serve(async (req) => {
    try {
        const { lat, lng, radiusMeters = 20000, type, name } = await req.json();
        if (typeof lat !== 'number' || typeof lng !== 'number' || (type !== 'skatepark' && type !== 'skateshop')) {
            return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: JSON_HEADERS });
        }

        const tileKey = `v5:${type}:${round(lat)}:${round(lng)}:${radiusMeters}`;
        const useCache = !name;

        if (useCache) {
            const { data: cached } = await supabase
                .from('place_cache')
                .select('places, updated_at')
                .eq('tile_key', tileKey)
                .eq('type', type)
                .maybeSingle();
            if (cached) {
                const age = Date.now() - new Date(cached.updated_at).getTime();
                const ttl = (cached.places?.length ?? 0) === 0 ? EMPTY_TTL_MS
                    : cached.places.some((place: any) => place.id?.startsWith('google-')) ? GOOGLE_CACHE_TTL_MS
                    : CACHE_TTL_MS;
                if (age < ttl) {
                    return new Response(JSON.stringify({ places: cached.places, source: 'cache' }), { status: 200, headers: JSON_HEADERS });
                }
            }
        }

        let places: any[] = [];
        let source = 'overpass';
        let fallbackReason: string | undefined;
        const googleParks = !name && type === 'skatepark'
            ? queryGoogle(lat, lng, radiusMeters, type)
                .then((places) => ({ places, error: null }))
                .catch((err) => ({ places: [] as any[], error: String(err) }))
            : null;
        try {
            const result = await queryOverpass(lat, lng, radiusMeters, type, name);
            places = result.places;
            if (result.partial) source = 'overpass_partial';
            if (googleParks) {
                const googlePlaces = (await googleParks).places;
                places = mergeParks(places, googlePlaces);
                if (googlePlaces.length > 0) source = result.places.length > 0 ? 'mixed' : 'google';
            } else if (!name && places.length === 0) {
                try {
                    const googlePlaces = await queryGoogle(lat, lng, radiusMeters, type);
                    if (googlePlaces.length > 0) {
                        places = googlePlaces;
                        source = 'google';
                    }
                } catch { /* An empty Overpass result is still a valid response. */ }
            }
        } catch (err) {
            fallbackReason = String(err);
            console.warn(`Overpass ${type} lookup failed: ${fallbackReason}`);
            if (name) {
                return new Response(
                    JSON.stringify({ places: [], source: 'error', error: fallbackReason }),
                    { status: 502, headers: JSON_HEADERS }
                );
            }
            try {
                if (googleParks) {
                    const googleResult = await googleParks;
                    if (googleResult.error) throw new Error(googleResult.error);
                    places = googleResult.places;
                } else {
                    places = await queryGoogle(lat, lng, radiusMeters, type);
                }
                source = 'google';
            } catch (err) {
                return new Response(
                    JSON.stringify({ places: [], source: 'error', error: String(err) }),
                    { status: 502, headers: JSON_HEADERS }
                );
            }
        }

        if (useCache && (source === 'overpass' || source === 'mixed' || (source === 'google' && places.length > 0))) {
            await supabase
                .from('place_cache')
                .upsert(
                    { tile_key: tileKey, type, places, updated_at: new Date().toISOString() },
                    { onConflict: 'tile_key,type' }
                );
        }

        return new Response(JSON.stringify({ places, source, fallbackReason }), { status: 200, headers: JSON_HEADERS });
    } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: JSON_HEADERS });
    }
});
