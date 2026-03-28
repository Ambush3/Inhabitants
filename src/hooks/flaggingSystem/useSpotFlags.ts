import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export function useSpotFlags(userId: string | null) {
    const [flaggedSpotIds, setFlaggedSpotIds] = useState<string[]>([]);

    async function loadFlags() {
        if (!userId) return;
        const { data } = await supabase
            .from('spot_flags')
            .select('spot_id')
            .eq('user_id', userId);
        if (data) setFlaggedSpotIds(data.map(f => f.spot_id));
    }

    async function toggleFlag(spotId: string, spotOwnerId?: string, actorUsername?: string): Promise<void> {
        if (!userId) return;
        const isFlagged = flaggedSpotIds.includes(spotId);

        if (isFlagged) {
            await supabase
                .from('spot_flags')
                .delete()
                .eq('spot_id', spotId)
                .eq('user_id', userId);
            setFlaggedSpotIds(prev => prev.filter(id => id !== spotId));
        } else {
            await supabase
                .from('spot_flags')
                .insert({ spot_id: spotId, user_id: userId });
            setFlaggedSpotIds(prev => [...prev, spotId]);

            // send notification to user that their spot has been flagged
            if (spotOwnerId && spotOwnerId !== userId && actorUsername) {
                await supabase.functions.invoke('send-push-notification', {
                    body: {
                        spot_id: spotId,
                        event_type: 'flag',
                        actor_username: actorUsername,
                    },
                });
            }
        }
    }

    function isFlaggedByMe(spotId: string): boolean {
        return flaggedSpotIds.includes(spotId);
    }

    return { flaggedSpotIds, loadFlags, toggleFlag, isFlaggedByMe };
}