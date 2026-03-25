import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export type SpotCondition = 'waxed' | 'good_session' | 'security' | 'wet' | 'cracked' | 'crowded';

export type ConditionReport = {
    id: string;
    spot_id: string;
    user_id: string;
    condition: SpotCondition;
    created_at: string;
};

export const CONDITION_META: Record<SpotCondition, { label: string; icon: string; color: string; bg: string }> = {
    waxed:        { label: 'Waxed',        icon: '🧈',  color: '#B8860B', bg: '#FFF9C4' },
    good_session: { label: 'Good Session', icon: '✓',   color: '#1a7a1a', bg: '#C8F5C8' },
    security:     { label: 'Security',     icon: '👮',  color: '#cc0000', bg: '#FFE0E0' },
    wet:          { label: 'Wet',          icon: '💧',  color: '#0055cc', bg: '#DDEEFF' },
    cracked:      { label: 'Cracked',      icon: '⚠',   color: '#cc5500', bg: '#FFF0E0' },
    crowded:      { label: 'Crowded',      icon: '👥',  color: '#7700cc', bg: '#F0E0FF' },
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

        const { data: { user } } = await supabase.auth.getUser();

        setConditions(data ?? []);
        setMyConditions(
            (data ?? [])
                .filter((r: ConditionReport) => r.user_id === user?.id)
                .map((r: ConditionReport) => r.condition)
        );
    }

    async function toggleCondition(spotId: string, condition: SpotCondition) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('toggleCondition:', condition, 'myConditions:', myConditions, 'includes:', myConditions.includes(condition));

        if (myConditions.includes(condition)) {
            await supabase
                .from('spot_conditions')
                .delete()
                .eq('spot_id', spotId)
                .eq('user_id', user.id)
                .eq('condition', condition);

            setMyConditions(prev => prev.filter(c => c !== condition));
            setConditions(prev => prev.filter(r => !(r.user_id === user.id && r.condition === condition)));
        } else {
            const { data, error } = await supabase
                .from('spot_conditions')
                .upsert(
                    { spot_id: spotId, user_id: user.id, condition },
                    { onConflict: 'spot_id,user_id,condition' }
                )
                .select()
                .single();

            console.log('insert result:', data, 'error:', error);

            if (data) {
                setMyConditions(prev => [...prev, condition]);
                setConditions(prev => [...prev, data]);
            }
        }
    }

    function resetConditions() {
        setConditions([]);
        setMyConditions([]);
    }

    const activeConditions = [...new Set(conditions.map(r => r.condition))] as SpotCondition[];

    return { conditions, myConditions, activeConditions, loadConditions, toggleCondition, resetConditions };
}