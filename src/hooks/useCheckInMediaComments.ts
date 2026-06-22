import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { moderateText } from '@/src/libs/moderator/textModerator';

export type CheckInMediaComment = {
  id: string;
  media_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  };
};

export function useCheckInMediaComments() {
  const [comments, setComments] = useState<CheckInMediaComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  async function loadComments(mediaId: string) {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('check_in_media_comments')
        .select('*, profiles(username, avatar_url)')
        .eq('media_id', mediaId)
        .order('created_at', { ascending: false });
      setComments((data ?? []) as CheckInMediaComment[]);
      setCommentCount((data ?? []).length);
    } finally {
      setLoading(false);
    }
  }

  async function addComment(mediaId: string, content: string): Promise<string | null> {
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
      .from('check_in_media_comments')
      .insert({ media_id: mediaId, user_id: user.id, content: trimmed });
    if (error) return error.message;
    await loadComments(mediaId);
    return null;
  }

  async function updateComment(commentId: string, mediaId: string, content: string): Promise<string | null> {
    const trimmed = content.trim();
    if (!trimmed) return 'Comment cannot be empty';
    const modResult = moderateText(trimmed);
    if (!modResult.allowed) return 'Comment contains inappropriate content';
    const { error } = await supabase
      .from('check_in_media_comments')
      .update({ content: trimmed })
      .eq('id', commentId);
    if (error) return error.message;
    await loadComments(mediaId);
    return null;
  }

  async function deleteComment(commentId: string, mediaId: string): Promise<string | null> {
    const { error } = await supabase.from('check_in_media_comments').delete().eq('id', commentId);
    if (error) return error.message;
    await loadComments(mediaId);
    return null;
  }

  async function flagComment(commentId: string, reason: string): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';
    const { error } = await supabase
      .from('check_in_media_comment_flags')
      .insert({ comment_id: commentId, user_id: user.id, reason });
    if (error) return error.message;
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
    updateComment,
    deleteComment,
    flagComment,
    resetComments,
  };
}
