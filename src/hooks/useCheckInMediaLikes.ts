import { useState, useCallback } from 'react';
import { supabase } from '@/src/libs/supabase';

export function useCheckInMediaLikes() {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadLikes = useCallback(async (mediaId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { count: total } = await supabase
      .from('check_in_media_likes')
      .select('user_id', { count: 'exact', head: true })
      .eq('media_id', mediaId);
    setCount(total ?? 0);

    if (user) {
      const { data } = await supabase
        .from('check_in_media_likes')
        .select('media_id')
        .eq('media_id', mediaId)
        .eq('user_id', user.id)
        .maybeSingle();
      setLiked(!!data);
    } else {
      setLiked(false);
    }
  }, []);

  const toggleLike = useCallback(
    async (mediaId: string) => {
      if (busy) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setBusy(true);
      // optimistic
      const wasLiked = liked;
      setLiked(!wasLiked);
      setCount((c) => c + (wasLiked ? -1 : 1));

      if (wasLiked) {
        const { error } = await supabase
          .from('check_in_media_likes')
          .delete()
          .eq('media_id', mediaId)
          .eq('user_id', user.id);
        if (error) {
          setLiked(true);
          setCount((c) => c + 1);
        }
      } else {
        const { error } = await supabase
          .from('check_in_media_likes')
          .insert({ media_id: mediaId, user_id: user.id });
        if (error) {
          setLiked(false);
          setCount((c) => c - 1);
        }
      }
      setBusy(false);
    },
    [busy, liked]
  );

  function reset() {
    setCount(0);
    setLiked(false);
  }

  return { count, liked, loadLikes, toggleLike, reset };
}
