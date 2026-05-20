import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { moderateText } from '@/src/libs/moderator/textModerator';

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

    const { data: ban } = await supabase.from('banned_users').select('*').eq('user_id', user.id).single();

    if (ban) {
      if (ban.ban_type === 'permanent') return 'You are permanently banned from commenting.';
      if (ban.ban_type === 'comments' && ban.banned_until && new Date(ban.banned_until) > new Date()) {
        const until = new Date(ban.banned_until).toLocaleDateString();
        return `You are banned from commenting until ${until}.`;
      }
    }

    const trimmed = content.trim();
    if (!trimmed) return 'Comment cannot be empty';
    const modResult = moderateText(trimmed);
    if (!modResult.allowed) return 'Comment contains inappropriate content';
    const { error } = await supabase
      .from('spot_comments')
      .insert({ spot_id: spotId, user_id: user.id, content: trimmed });
    if (error) return error.message;
    await loadComments(spotId);
    return null;
  }
  async function updateComment(commentId: string, spotId: string, content: string): Promise<string | null> {
    const trimmed = content.trim();
    if (!trimmed) return 'Comment cannot be empty';
    const modResult = moderateText(trimmed);
    if (!modResult.allowed) return 'Comment contains inappropriate content';
    const { error } = await supabase.from('spot_comments').update({ content: trimmed }).eq('id', commentId);
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

  async function flagComment(commentId: string, reason: string): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';
    const { error } = await supabase
      .from('comment_flags')
      .insert({ comment_id: commentId, user_id: user.id, reason });
    if (error) return error.message;
    return null;
  }

  async function isCommentFlaggedByMe(commentId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from('comment_flags')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single();
    return !!data;
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
    updateComment,
    flagComment,
    isCommentFlaggedByMe,
  };
}
