import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Spot } from '@/src/types';

export function useFavorites() {
    const [favorites, setFavorites] = useState<Spot[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    async function loadFavorites() {
        setLoading(true);
        const { data, error } = await supabase
            .from('favorites')
            .select('spot_id, spots(*)')
            .order('created_at', { ascending: false });

        setLoading(false);
        if (error) return;

        const spots = (data ?? []).map((f: any) => f.spots as Spot);
        setFavorites(spots);
        setFavoriteIds(new Set(spots.map(s => s.id)));
    }

    async function toggleFavorite(spotId: string): Promise<void> {
        if (favoriteIds.has(spotId)) {
            await supabase.from('favorites').delete().eq('spot_id', spotId);
            setFavoriteIds(prev => { const next = new Set(prev); next.delete(spotId); return next; });
            setFavorites(prev => prev.filter(s => s.id !== spotId));
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            await supabase.from('favorites').insert({ spot_id: spotId, user_id: user.id });
            setFavoriteIds(prev => new Set(prev).add(spotId));
            await loadFavorites();
        }
    }

    function isFavorite(spotId: string): boolean {
        return favoriteIds.has(spotId);
    }

    return { favorites, loading, loadFavorites, toggleFavorite, isFavorite };
}