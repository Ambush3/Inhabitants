import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export type SpotCondition =
    | 'good_session'
    | 'needs_wax'
    | 'security'
    | 'wet'
    | 'rough_surface'
    | 'crowded';

export type ConditionReport = {
    id: string;
    spot_id: string;
    user_id: string;
    condition: SpotCondition;
    created_at: string;
};

export const CONDITION_META: Record<
    SpotCondition,
    { label: string; icon: string; color: string; bg: string }
> = {
    good_session: {
        label: 'Good Session',
        icon: '✓',
        color: '#1a7a1a',
        bg: '#C8F5C8',
    },
    needs_wax: {
        label: 'Needs Wax',
        icon: '🧈',
        color: '#B8860B',
        bg: '#FFF9C4',
    },
    security: {
        label: 'Security',
        icon: '👮',
        color: '#cc0000',
        bg: '#FFE0E0',
    },
    wet: { label: 'Wet', icon: '💧', color: '#0055cc', bg: '#DDEEFF' },
    rough_surface: {
        label: 'Rough Surface',
        icon: '⚠',
        color: '#cc5500',
        bg: '#FFF0E0',
    },
    crowded: { label: 'Crowded', icon: '👥', color: '#7700cc', bg: '#F0E0FF' },
};

export function useSpotConditions() {
    const [conditions, setConditions] = useState<ConditionReport[]>([]);
    const [myConditions, setMyConditions] = useState<SpotCondition[]>([]);

    async function loadConditions(spotId: string) {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('spot_conditions')
            .select('*')
            .eq('spot_id', spotId)
            .gte('created_at', cutoff);

        if (error) return;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        setConditions(data ?? []);
        setMyConditions(
            (data ?? [])
                .filter((r: ConditionReport) => r.user_id === user?.id)
                .map((r: ConditionReport) => r.condition)
        );
    }

    async function toggleCondition(spotId: string, condition: SpotCondition) {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const isActive = conditions.some((r) => r.condition === condition);
        const isMine = myConditions.includes(condition);

        if (isActive) {
            if (isMine) {
                await supabase
                    .from('spot_conditions')
                    .delete()
                    .eq('spot_id', spotId)
                    .eq('user_id', user.id)
                    .eq('condition', condition);

                setMyConditions((prev) => prev.filter((c) => c !== condition));
            } else {
                const existing = conditions.find(
                    (r) => r.condition === condition
                );
                if (existing) {
                    await supabase
                        .from('spot_conditions')
                        .delete()
                        .eq('id', existing.id);
                }
            }
            setConditions((prev) =>
                prev.filter((r) => r.condition !== condition)
            );
        } else {
            const { data } = await supabase
                .from('spot_conditions')
                .upsert(
                    { spot_id: spotId, user_id: user.id, condition },
                    { onConflict: 'spot_id,user_id,condition' }
                )
                .select()
                .single();

            if (data) {
                setMyConditions((prev) => [...prev, condition]);
                setConditions((prev) => [...prev, data]);
            }
        }
    }

    function resetConditions() {
        setConditions([]);
        setMyConditions([]);
    }

    const activeConditions = [
        ...new Set(conditions.map((r) => r.condition)),
    ] as SpotCondition[];

    return {
        conditions,
        myConditions,
        activeConditions,
        loadConditions,
        toggleCondition,
        resetConditions,
    };
}
