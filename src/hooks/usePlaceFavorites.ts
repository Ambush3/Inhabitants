import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Place } from '@/src/types';

type PlaceFavorite = {
    place_id: string;
    place_name: string;
    place_type: string;
    lat: number;
    lng: number;
};

export function usePlaceFavorites() {
    const [placeFavorites, setPlaceFavorites] = useState<PlaceFavorite[]>([]);
    const [placeFavoriteIds, setPlaceFavoriteIds] = useState<Set<string>>(new Set());
    const [placeFavLoading, setPlaceFavLoading] = useState(false);

    async function loadPlaceFavorites() {
        setPlaceFavLoading(true);
        const { data, error } = await supabase
            .from('place_favorites')
            .select('place_id, place_name, place_type, lat, lng')
            .order('created_at', { ascending: false });

        setPlaceFavLoading(false);
        if (error) return;

        let favs = data ?? [];
        const ids = favs.map((f: PlaceFavorite) => f.place_id);
        if (ids.length > 0) {
            const { data: overrides } = await supabase
                .from('place_overrides')
                .select('place_id, name')
                .in('place_id', ids);
            const nameById = new Map(
                (overrides ?? [])
                    .filter((o: { place_id: string; name: string | null }) => o.name)
                    .map((o: { place_id: string; name: string }) => [o.place_id, o.name])
            );
            favs = favs.map((f: PlaceFavorite) =>
                nameById.has(f.place_id) ? { ...f, place_name: nameById.get(f.place_id)! } : f
            );
        }
        setPlaceFavorites(favs);
        setPlaceFavoriteIds(new Set(favs.map((f: PlaceFavorite) => f.place_id)));
    }

    async function togglePlaceFavorite(place: Place): Promise<void> {
        if (placeFavoriteIds.has(place.id)) {
            await supabase.from('place_favorites').delete().eq('place_id', place.id);
            setPlaceFavoriteIds(prev => { const next = new Set(prev); next.delete(place.id); return next; });
            setPlaceFavorites(prev => prev.filter(f => f.place_id !== place.id));
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            await supabase.from('place_favorites').insert({
                place_id: place.id,
                place_name: place.name,
                place_type: place.type,
                lat: place.lat,
                lng: place.lng,
                user_id: user.id,
            });
            setPlaceFavoriteIds(prev => new Set(prev).add(place.id));
            await loadPlaceFavorites();
        }
    }

    function isPlaceFavorite(placeId: string): boolean {
        return placeFavoriteIds.has(placeId);
    }

    return { placeFavorites, placeFavLoading, loadPlaceFavorites, togglePlaceFavorite, isPlaceFavorite };
}