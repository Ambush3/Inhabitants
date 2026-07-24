import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { moderateText } from '@/src/libs/moderator/textModerator';

export type Collection = {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    visibility: 'public' | 'friends' | 'private';
    created_at: string;
    spot_count?: number;
};

export function useCollections() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(false);

    async function loadCollections() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('collections')
                .select('*, collection_spots(count)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });
            const mapped = (data ?? []).map((c: any) => ({
                ...c,
                spot_count: c.collection_spots?.[0]?.count ?? 0,
            }));
            setCollections(mapped);
        } finally {
            setLoading(false);
        }
    }

    async function createCollection(name: string, description?: string, visibility: 'public' | 'friends' | 'private' = 'private'): Promise<string | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 'Not logged in';
        const nameCheck = moderateText(name.trim());
        if (!nameCheck.allowed) return nameCheck.reason ?? 'Inappropriate content.';
        if (description?.trim()) {
            const descCheck = moderateText(description.trim());
            if (!descCheck.allowed) return descCheck.reason ?? 'Inappropriate content.';
        }
        const { error } = await supabase
            .from('collections')
            .insert({ user_id: user.id, name: name.trim(), description: description?.trim() ?? null, visibility });
        if (error) return error.message;
        await loadCollections();
        return null;
    }

    async function deleteCollection(collectionId: string): Promise<string | null> {
        const { error } = await supabase
            .from('collections')
            .delete()
            .eq('id', collectionId);
        if (error) return error.message;
        await loadCollections();
        return null;
    }

    async function addSpotToCollection(collectionId: string, spotId: string): Promise<string | null> {
        const { error } = await supabase
            .from('collection_spots')
            .insert({ collection_id: collectionId, spot_id: spotId });
        if (error) return error.message;
        await loadCollections();
        return null;
    }

    async function removeSpotFromCollection(collectionId: string, spotId: string): Promise<string | null> {
        const { error } = await supabase
            .from('collection_spots')
            .delete()
            .eq('collection_id', collectionId)
            .eq('spot_id', spotId);
        if (error) return error.message;
        await loadCollections();
        return null;
    }

    async function getSpotCollectionIds(spotId: string): Promise<string[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await supabase
            .from('collection_spots')
            .select('collection_id, collections!inner(user_id)')
            .eq('spot_id', spotId)
            .eq('collections.user_id', user.id);
        return (data ?? []).map((r: any) => r.collection_id);
    }

    async function loadCollectionSpots(collectionId: string) {
        const { data } = await supabase
            .from('collection_spots')
            .select('spot_id, spots(*)')
            .eq('collection_id', collectionId);
        return (data ?? []).map((r: any) => r.spots).filter(Boolean);
    }

    return {
        collections,
        loading,
        loadCollections,
        createCollection,
        deleteCollection,
        addSpotToCollection,
        removeSpotFromCollection,
        getSpotCollectionIds,
        loadCollectionSpots,
    };
}