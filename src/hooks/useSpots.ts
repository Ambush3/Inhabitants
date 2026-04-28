import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Spot } from '@/src/types';
import { moderateText } from '@/src/libs/moderator/textModerator';

export type SpotVisibility = 'public' | 'friends' | 'private';

export function spotVisibility(s: {
    is_private: boolean;
    friends_only: boolean;
}): SpotVisibility {
    if (s.is_private) return 'private';
    if (s.friends_only) return 'friends';
    return 'public';
}

function visibilityFlags(v: SpotVisibility) {
    return {
        is_private: v === 'private',
        friends_only: v === 'friends',
    };
}

export function nextVisibility(v: SpotVisibility): SpotVisibility {
    if (v === 'public') return 'friends';
    if (v === 'friends') return 'private';
    return 'public';
}

export function useSpots() {
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchResults, setSearchResults] = useState<Spot[]>([]);
    const [searching, setSearching] = useState(false);

    const [mySpots, setMySpots] = useState<Spot[]>([]);
    const [mySpotsLoading, setMySpotsLoading] = useState(false);

    async function loadMySpots() {
        setMySpotsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setMySpotsLoading(false); return; }

        const { data, error } = await supabase
            .from('spots')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        setMySpotsLoading(false);
        if (error) return;
        setMySpots((data ?? []) as Spot[]);
    }

    async function reload() {
        setError(null);
        setLoading(true);

        const { data, error } = await supabase
            .from('spots')
            .select('*')
            .eq('is_flagged', false)
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
        initialRating?: number,
        tags: string[] = [],
        visibility: SpotVisibility = 'public',
        spotType: 'spot' | 'skatepark' | 'skateshop' = 'spot'
    ): Promise<Spot | undefined> {
        setError(null);

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Name is required');
            return;
        }

        const nameCheck = moderateText(trimmedName);
        if (!nameCheck.allowed) {
            setError(nameCheck.reason ?? 'Inappropriate content.');
            return;
        }

        if (description) {
            const descCheck = moderateText(description.trim());
            if (!descCheck.allowed) {
                setError(descCheck.reason ?? 'Inappropriate content.');
                return;
            }
        }

        for (const tag of tags) {
            const tagCheck = moderateText(tag);
            if (!tagCheck.allowed) {
                setError('One or more tags contain inappropriate content.');
                return;
            }
        }

        const flags = visibilityFlags(visibility);
        const { data: spotData, error: spotErr } = await supabase
            .from('spots')
            .insert({
                name: trimmedName,
                description: (description ?? '').trim() || null,
                lat,
                lng,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                tags,
                is_private: flags.is_private,
                friends_only: flags.friends_only,
                spot_type: spotType,
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
                user_id: (await supabase.auth.getUser()).data.user?.id,
            });

            if (reviewErr) {
                setError(reviewErr.message);
            }
        }

        setSpots((prev) => [spot, ...prev]);
        return spot;
    }

    async function setSpotVisibility(spot: Spot, visibility: SpotVisibility) {
        const flags = visibilityFlags(visibility);
        const { error } = await supabase
            .from('spots')
            .update(flags)
            .eq('id', spot.id);

        if (error) {
            setError(error.message);
            return;
        }

        setSpots((prev) =>
            prev.map((s) => (s.id === spot.id ? { ...s, ...flags } : s))
        );
        setMySpots((prev) =>
            prev.map((s) => (s.id === spot.id ? { ...s, ...flags } : s))
        );
    }

    async function deleteSpotById(id: string, onDeleted?: () => void) {
        setError(null);

        const { error } = await supabase.from('spots').delete().eq('id', id);

        if (error) {
            setError(error.message);
            return;
        }

        setSpots((prev) => prev.filter((s) => s.id !== id));
        setMySpots((prev) => prev.filter((s) => s.id !== id));
        onDeleted?.();
    }

    async function searchByTag(tag: string) {
        setSearching(true);
        
        const trimmed = tag.trim().toLowerCase();
        
        const results = spots.filter(s =>
            s.tags?.includes(trimmed) &&
            !s.is_flagged &&
            !s.is_private
        );
        
        setSearchResults(results);
        
        setSearching(false);
    }

    function clearSearch() {
        setSearchResults([]);
    }

    return { spots, mySpots, mySpotsLoading, loading, error, setError, reload, loadMySpots, createSpotAt, deleteSpotById, searchResults, searching, searchByTag, clearSearch, setSpotVisibility };
}