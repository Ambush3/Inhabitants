import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export type SpotComment = {
  id: string;
  spot_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  };
};

export function useSpotComments() {
  const [comments, setComments] = useState<SpotComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  async function loadComments(spotId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spot_comments')
        .select('*, profiles(username, avatar_url)')
        .eq('spot_id', spotId)
        .order('created_at', { ascending: false });
      setComments(data ?? []);
      setCommentCount((data ?? []).length);
    } finally {
      setLoading(false);
    }
  }

  async function addComment(spotId: string, content: string): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';
    const trimmed = content.trim();
    if (!trimmed) return 'Comment cannot be empty';
    const { error } = await supabase
      .from('spot_comments')
      .insert({ spot_id: spotId, user_id: user.id, content: trimmed });
    if (error) return error.message;
    await loadComments(spotId);
    return null;
  }

  async function deleteComment(commentId: string, spotId: string): Promise<string | null> {
    const { error } = await supabase.from('spot_comments').delete().eq('id', commentId);
    if (error) return error.message;
    await loadComments(spotId);
    return null;
  }

  function resetComments() {
    setComments([]);
  }

  return {
    comments,
    commentCount,
    loading,
    loadComments,
    addComment,
    deleteComment,
    resetComments,
  };
}
