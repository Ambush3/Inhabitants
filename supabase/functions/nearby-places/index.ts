// @ts-nocheck
// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const USER_AGENT = 'InhabitantsApp/1.0 (skatespot discovery; contact: aaronbush3@gmail.com)';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;

function round(n: number): string {
    return (Math.round(n * 10) / 10).toFixed(1);
}

function buildQuery(lat: number, lng: number, radiusMeters: number, type: string, name?: string): string {
    const nameFilter = name ? `["name"~"${name}",i]` : '';
    if (type === 'skatepark') {
        return `
            [out:json][timeout:25];
            (
              nwr(around:${radiusMeters},${lat},${lng})["leisure"="skate_park"]${nameFilter};
              nwr(around:${radiusMeters},${lat},${lng})["leisure"="pitch"]["sport"="skateboard"]${nameFilter};
              nwr(around:${radiusMeters},${lat},${lng})["leisure"="pitch"]["sport"="skateboarding"]${nameFilter};
            );
            out center tags;
        `.trim();
    }
    return `
        [out:json][timeout:25];
        (
          nwr(around:${radiusMeters},${lat},${lng})["shop"="skate"]${nameFilter};
          nwr(around:${radiusMeters},${lat},${lng})["shop"="sports"]["sport"="skateboard"]${nameFilter};
          nwr(around:${radiusMeters},${lat},${lng})["shop"="sports"]["sport"="skateboarding"]${nameFilter};
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
                type: (el.tags?.shop === 'skate' || el.tags?.shop === 'sports') ? 'skateshop' : 'skatepark',
                lat: pLat,
                lng: pLng,
                tags: el.tags ?? {},
            };
        })
        .filter((p: any) => p !== null);
}

async function queryOverpass(lat: number, lng: number, radiusMeters: number, type: string, name?: string): Promise<any[]> {
    const query = buildQuery(lat, lng, radiusMeters, type, name);
    let lastError: Error | null = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'User-Agent': USER_AGENT,
                },
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!resp.ok) {
                lastError = new Error(`Overpass HTTP ${resp.status}`);
                continue;
            }
            const json = await resp.json();
            return normalizeOverpass(json, type);
        } catch (e) {
            lastError = e as Error;
        }
    }
    throw lastError ?? new Error('Overpass failed');
}

async function queryGoogle(lat: number, lng: number, radiusMeters: number, type: string): Promise<any[]> {
    const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
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
            const nm = (el.name ?? '').toLowerCase();
            return skateKeywords.some((k) => nm.includes(k));
        })
        .map((el: any) => ({
            id: `google-${el.place_id}`,
            name: el.name,
            type,
            lat: el.geometry.location.lat,
            lng: el.geometry.location.lng,
            tags: {},
        }));
}

Deno.serve(async (req) => {
    try {
        const { lat, lng, radiusMeters = 20000, type, name } = await req.json();
        if (typeof lat !== 'number' || typeof lng !== 'number' || (type !== 'skatepark' && type !== 'skateshop')) {
            return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: JSON_HEADERS });
        }

        const tileKey = `${round(lat)}:${round(lng)}:${radiusMeters}`;
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
                const ttl = (cached.places?.length ?? 0) === 0 ? EMPTY_TTL_MS : CACHE_TTL_MS;
                if (age < ttl) {
                    return new Response(JSON.stringify({ places: cached.places, source: 'cache' }), { status: 200, headers: JSON_HEADERS });
                }
            }
        }

        let places: any[] = [];
        let source = 'overpass';
        try {
            places = await queryOverpass(lat, lng, radiusMeters, type, name);
        } catch {
            if (type === 'skatepark') {
                places = await queryGoogle(lat, lng, radiusMeters, type);
                source = 'google';
            } else {
                places = [];
                source = 'error';
            }
        }

        if (useCache && source !== 'error') {
            await supabase
                .from('place_cache')
                .upsert(
                    { tile_key: tileKey, type, places, updated_at: new Date().toISOString() },
                    { onConflict: 'tile_key,type' }
                );
        }

        return new Response(JSON.stringify({ places, source }), { status: 200, headers: JSON_HEADERS });
    } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: JSON_HEADERS });
    }
});
