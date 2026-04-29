import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export type NotificationPrefs = {
    notify_review: boolean;
    notify_favorite: boolean;
    notify_wishlist: boolean;
    notify_condition: boolean;
    notify_flag: boolean;
    notify_friend_request: boolean;
    notify_friend_accepted: boolean;
};

const DEFAULTS: NotificationPrefs = {
    notify_review: true,
    notify_favorite: true,
    notify_wishlist: true,
    notify_condition: true,
    notify_flag: true,
    notify_friend_request: true,
    notify_friend_accepted: true,
};

export function useNotificationPreferences() {
    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
    const [loading, setLoading] = useState(false);

    async function loadPrefs() {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setLoading(true);
        const { data } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
        if (data) {
            setPrefs({
                notify_review: data.notify_review,
                notify_favorite: data.notify_favorite,
                notify_wishlist: data.notify_wishlist,
                notify_condition: data.notify_condition,
                notify_flag: data.notify_flag,
                notify_friend_request: data.notify_friend_request,
                notify_friend_accepted: data.notify_friend_accepted,
            });
        } else {
            setPrefs(DEFAULTS);
        }
        setLoading(false);
    }

    async function updatePref(key: keyof NotificationPrefs, value: boolean) {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setPrefs((prev) => ({ ...prev, [key]: value }));
        await supabase.from('notification_preferences').upsert(
            {
                user_id: user.id,
                [key]: value,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
        );
    }

    return { prefs, loading, loadPrefs, updatePref };
}
