import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Spot } from '@/src/types';

export function useWishlist() {
    const [wishlist, setWishlist] = useState<Spot[]>([]);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    async function loadWishlist() {
        setWishlistLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setWishlistLoading(false); return; }

        const { data } = await supabase
            .from('wishlists')
            .select('spot_id, spots(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        setWishlist((data ?? []).map((r: any) => r.spots).filter(Boolean));
        setWishlistLoading(false);
    }

    async function toggleWishlist(spotId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const isWished = wishlist.some(s => s.id === spotId);

        if (isWished) {
            await supabase
                .from('wishlists')
                .delete()
                .eq('user_id', user.id)
                .eq('spot_id', spotId);
            setWishlist(prev => prev.filter(s => s.id !== spotId));
        } else {
            await supabase
                .from('wishlists')
                .insert({ user_id: user.id, spot_id: spotId });
            await loadWishlist();
        }
    }

    function isWishlisted(spotId: string) {
        return wishlist.some(s => s.id === spotId);
    }

    return { wishlist, wishlistLoading, loadWishlist, toggleWishlist, isWishlisted };
}