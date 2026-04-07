import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export function useReviewFlags(userId: string | null) {
    const [flaggedReviewIds, setFlaggedReviewIds] = useState<string[]>([]);

    async function loadReviewFlags() {
        if (!userId) return;
        const { data } = await supabase
            .from('review_flags')
            .select('review_id')
            .eq('user_id', userId);
        if (data) setFlaggedReviewIds(data.map(f => f.review_id));
    }

    async function toggleReviewFlag(reviewId: string, reason?: string): Promise<void> {
        if (!userId) return;
        const isFlagged = flaggedReviewIds.includes(reviewId);

        if (isFlagged) {
            await supabase
                .from('review_flags')
                .delete()
                .eq('review_id', reviewId)
                .eq('user_id', userId);
            setFlaggedReviewIds(prev => prev.filter(id => id !== reviewId));
        } else {
            await supabase
                .from('review_flags')
                .insert({ review_id: reviewId, user_id: userId, reason });
            setFlaggedReviewIds(prev => [...prev, reviewId]);
        }
    }

    function isReviewFlaggedByMe(reviewId: string): boolean {
        return flaggedReviewIds.includes(reviewId);
    }

    return { flaggedReviewIds, loadReviewFlags, toggleReviewFlag, isReviewFlaggedByMe };
}