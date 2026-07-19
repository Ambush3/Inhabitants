import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Place } from '@/src/types';

export function usePlaceReviews() {
    const [avgRating, setAvgRating] = useState<number | null>(null);
    const [reviewCount, setReviewCount] = useState(0);
    const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function loadPlaceReviews(placeId: string, userId: string) {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('place_reviews')
                .select('id, rating, user_id')
                .eq('place_id', placeId);

            const reviews = data ?? [];
            setReviewCount(reviews.length);

            if (reviews.length > 0) {
                const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
                setAvgRating(sum / reviews.length);
            } else {
                setAvgRating(null);
            }

            const mine = reviews.find(r => r.user_id === userId);
            setExistingReviewId(mine?.id ?? null);

            return reviews;
        } finally {
            setLoading(false);
        }
    }

    async function submitPlaceReview(placeId: string, userId: string, rating: number, place: Place) {
        await supabase
            .from('places')
            .upsert({
                id: place.id,
                name: place.name,
                lat: place.lat,
                lng: place.lng,
                type: place.type,
            }, { onConflict: 'id', ignoreDuplicates: true });

        const { data, error } = await supabase
            .from('place_reviews')
            .upsert({ place_id: placeId, user_id: userId, rating }, { onConflict: 'user_id,place_id' })
            .select('id')
            .single();

        if (error) return error.message;
        setExistingReviewId(data?.id ?? null);
        await loadPlaceReviews(placeId, userId);
        return null;
    }

    async function deletePlaceReview(placeId: string, userId: string) {
        await supabase
            .from('place_reviews')
            .delete()
            .eq('place_id', placeId)
            .eq('user_id', userId);

        setExistingReviewId(null);
        await loadPlaceReviews(placeId, userId);
    }

    function resetPlaceReviews() {
        setAvgRating(null);
        setReviewCount(0);
        setExistingReviewId(null);
    }

    return {
        avgRating,
        reviewCount,
        existingReviewId,
        loading,
        loadPlaceReviews,
        submitPlaceReview,
        deletePlaceReview,
        resetPlaceReviews,
    };
}