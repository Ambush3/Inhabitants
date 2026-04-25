import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export type FriendshipStatus =
    | 'none'
    | 'pending_sent'
    | 'pending_received'
    | 'accepted';

export type Friend = {
    id: string;
    username: string;
    avatar_url: string | null;
};

export function useFriendships() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [pendingReceived, setPendingReceived] = useState<Friend[]>([]);
    const [pendingSent, setPendingSent] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(false);

    async function getFriendshipStatus(
        otherUserId: string
    ): Promise<FriendshipStatus> {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return 'none';

        const { data } = await supabase
            .from('friendships')
            .select('*')
            .or(
                `and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`
            )
            .single();

        if (!data) return 'none';
        if (data.status === 'accepted') return 'accepted';
        if (data.requester_id === user.id) return 'pending_sent';
        return 'pending_received';
    }

    async function sendFriendRequest(otherUserId: string) {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('friendships').insert({
            requester_id: user.id,
            addressee_id: otherUserId,
        });
    }

    async function acceptFriendRequest(otherUserId: string) {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('requester_id', otherUserId)
            .eq('addressee_id', user.id);
    }

    async function removeFriend(otherUserId: string) {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
            .from('friendships')
            .delete()
            .or(
                `and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`
            );
    }

    async function loadFriends() {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setLoading(true);

        const { data } = await supabase
            .from('friendships')
            .select(
                'requester_id, addressee_id, status, profiles!friendships_requester_id_fkey(id, username, avatar_url), profiles!friendships_addressee_id_fkey(id, username, avatar_url)'
            )
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
            .eq('status', 'accepted');

        const loaded: Friend[] = (data ?? []).map((f: any) => {
            const isRequester = f.requester_id === user.id;
            const profile = isRequester
                ? f['profiles!friendships_addressee_id_fkey']
                : f['profiles!friendships_requester_id_fkey'];
            return {
                id: profile.id,
                username: profile.username,
                avatar_url: profile.avatar_url,
            };
        });

        setFriends(loaded);
        setLoading(false);
    }

    async function loadPendingRequests() {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('friendships')
            .select('requester_id')
            .eq('addressee_id', user.id)
            .eq('status', 'pending');

        if (!data || data.length === 0) {
            setPendingReceived([]);
            return;
        }

        const requesterIds = data.map((f: any) => f.requester_id);

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', requesterIds);

        const loaded: Friend[] = (profiles ?? []).map((p: any) => ({
            id: p.id,
            username: p.username,
            avatar_url: p.avatar_url,
        }));

        setPendingReceived(loaded);
    }

    return {
        friends,
        pendingReceived,
        pendingSent,
        loading,
        getFriendshipStatus,
        sendFriendRequest,
        acceptFriendRequest,
        removeFriend,
        loadFriends,
        loadPendingRequests,
    };
}
