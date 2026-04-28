import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export type AppNotification = {
    id: string;
    type: string;
    actor_id: string | null;
    actor_username: string | null;
    spot_id: string | null;
    spot_name: string | null;
    read: boolean;
    created_at: string;
};

export function useNotifications() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);

    const unreadCount = notifications.filter((n) => !n.read).length;

    async function loadNotifications() {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setLoading(true);
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);
        setNotifications((data ?? []) as AppNotification[]);
        setLoading(false);
    }

    async function markAsRead(id: string) {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);
    }

    async function markAllAsRead() {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false);
    }

    return {
        notifications,
        unreadCount,
        loading,
        loadNotifications,
        markAsRead,
        markAllAsRead,
    };
}
