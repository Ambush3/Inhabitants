import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Review } from '@/src/types';

export function useReviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [newRating, setNewRating] = useState(0);
    const [newComment, setNewComment] = useState('');

    const avgRating =
        reviews.length === 0
            ? 0
            : reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    async function loadReviews(spotId: string) {
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('spot_id', spotId)
            .order('created_at', { ascending: false });

        if (error) return error.message;
        setReviews((data ?? []) as Review[]);
    }

    async function submitReview(spotId: string): Promise<string | null> {
        if (newRating <= 0) return 'Please choose a rating.';

        const { error } = await supabase.from('reviews').insert({
            spot_id: spotId,
            rating: newRating,
        });

        if (error) return error.message;

        setNewRating(0);
        setNewComment('');
        await loadReviews(spotId);
        return null;
    }

    function resetReviews() {
        setReviews([]);
        setNewRating(0);
        setNewComment('');
    }

    return { reviews, avgRating, newRating, setNewRating, newComment, setNewComment, loadReviews, submitReview, resetReviews };
}