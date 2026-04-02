import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export type PlaceOverride = {
    id: string;
    place_id: string;
    name: string;
    phone: string | null;
    website: string | null;
    hours: string | null;
    address: string | null;
    updated_by: string | null;
};

export function usePlaceOverrides() {
    const [override, setOverride] = useState<PlaceOverride | null>(null);
    const [isVetted, setIsVetted] = useState(false);
    const [loading, setLoading] = useState(false);

    async function loadOverride(placeId: string, userId: string) {
        setLoading(true);
        try {
            const [overrideResult, profileResult] = await Promise.all([
                supabase.from('place_overrides').select('*').eq('place_id', placeId).maybeSingle(),
                supabase.from('profiles').select('is_vetted').eq('id', userId).single(),
            ]);
            setOverride(overrideResult.data ?? null);
            setIsVetted(profileResult.data?.is_vetted ?? false);
        } finally {
            setLoading(false);
        }
    }

    async function saveOverride(placeId: string, userId: string, fields: {
        name?: string;
        phone?: string;
        website?: string;
        hours?: string;
        address?: string;
    }) {
        const { data, error } = await supabase
            .from('place_overrides')
            .upsert({
                place_id: placeId,
                updated_by: userId,
                updated_at: new Date().toISOString(),
                ...fields,
            }, { onConflict: 'place_id' })
            .select()
            .single();

        if (error) return error.message;
        setOverride(data);
        return null;
    }

    function resetOverride() {
        setOverride(null);
        setIsVetted(false);
    }

    return { override, isVetted, loading, loadOverride, saveOverride, resetOverride };
}