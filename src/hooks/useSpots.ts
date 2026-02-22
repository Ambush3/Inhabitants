import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Spot } from '@/src/types';

export function useSpots() {
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function reload() {
        setError(null);
        setLoading(true);

        const { data, error } = await supabase
            .from('spots')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }
        setSpots((data ?? []) as Spot[]);
    }

    async function createSpotAt(
        lat: number,
        lng: number,
        name: string,
        description?: string,
        initialRating?: number
    ) {
        setError(null);

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Name is required');
            return;
        }

        const { data: spotData, error: spotErr } = await supabase
            .from('spots')
            .insert({
                name: trimmedName,
                description: (description ?? '').trim() || null,
                lat,
                lng,
            })
            .select()
            .single();

        if (spotErr) {
            setError(spotErr.message);
            return;
        }

        const spot = spotData as Spot;

        if ((initialRating ?? 0) > 0) {
            const { error: reviewErr } = await supabase.from('reviews').insert({
                spot_id: spot.id,
                rating: initialRating,
            });

            if (reviewErr) {
                setError(reviewErr.message);
            }
        }

        setSpots((prev) => [spot, ...prev]);
    }

    async function deleteSpotById(id: string, onDeleted?: () => void) {
        setError(null);

        const { error } = await supabase.from('spots').delete().eq('id', id);

        if (error) {
            setError(error.message);
            return;
        }

        setSpots((prev) => prev.filter((s) => s.id !== id));
        onDeleted?.();
    }

    return { spots, loading, error, setError, reload, createSpotAt, deleteSpotById };
}