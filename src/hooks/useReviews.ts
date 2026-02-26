import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Review } from '@/src/types';

export function useReviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [newRating, setNewRating] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

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

        const loaded = (data ?? []) as Review[];
        setReviews(loaded);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const existing = loaded.find(r => r.user_id === user.id);
            if (existing) {
                setExistingReviewId(existing.id);
                setNewRating(existing.rating);
                setNewComment(existing.comment ?? existing.text ?? '');
            } else {
                setExistingReviewId(null);
                setNewRating(0);
                setNewComment('');
            }
        }
    }

    async function submitReview(spotId: string): Promise<string | null> {
        if (newRating <= 0) return 'Please choose a rating.';

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 'You must be logged in to review.';

        if (existingReviewId) {
            const { error, data } = await supabase
                .from('reviews')
                .update({ rating: newRating, comment: newComment || null })
                .eq('id', existingReviewId)
                .select();

            console.log('update result:', JSON.stringify(data), JSON.stringify(error));
            if (error) return error.message;
        } else {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    spot_id: spotId,
                    rating: newRating,
                    comment: newComment || null,
                    user_id: user.id,
                });

            if (error) return error.message;
        }

        await loadReviews(spotId);
        return null;
    }

    function resetReviews() {
        setReviews([]);
        setNewRating(0);
        setNewComment('');
        setExistingReviewId(null);
    }

    return { reviews, avgRating, newRating, setNewRating, newComment, setNewComment, loadReviews, submitReview, resetReviews, existingReviewId };
}