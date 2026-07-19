import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { moderateText } from '@/src/libs/moderator/textModerator';

export type PlaceOverride = {
    id: string;
    place_id: string;
    name: string | null;
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
        const normalized = {
            name: fields.name?.trim() || null,
            phone: fields.phone?.trim() || null,
            website: fields.website?.trim() || null,
            hours: fields.hours?.trim() || null,
            address: fields.address?.trim() || null,
        };

        for (const value of [normalized.name, normalized.address, normalized.hours]) {
            if (value) {
                const check = moderateText(value);
                if (!check.allowed) return check.reason ?? 'Inappropriate content.';
            }
        }

        if (Object.values(normalized).every((v) => v === null)) {
            const { error } = await supabase
                .from('place_overrides')
                .delete()
                .eq('place_id', placeId);
            if (error) return error.message;
            setOverride(null);
            return null;
        }

        const { data, error } = await supabase
            .from('place_overrides')
            .upsert({
                place_id: placeId,
                updated_by: userId,
                updated_at: new Date().toISOString(),
                ...normalized,
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