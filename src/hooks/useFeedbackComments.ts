import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { moderateText } from '@/src/libs/moderator/textModerator';

export type FeedbackComment = {
  id: string;
  post_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
};

export function useFeedbackComments() {
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadComments(postId: string) {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('feedback_comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      setComments((data ?? []) as FeedbackComment[]);
    } finally {
      setLoading(false);
    }
  }

  async function addComment(postId: string, content: string): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';

    const { data: ban } = await supabase
      .from('banned_users')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (ban) {
      if (ban.ban_type === 'permanent') return 'You are permanently banned from commenting.';
      if (ban.ban_type === 'comments' && ban.banned_until && new Date(ban.banned_until) > new Date()) {
        return `You are banned from commenting until ${new Date(ban.banned_until).toLocaleDateString()}.`;
      }
    }

    const trimmed = content.trim();
    if (!trimmed) return 'Comment cannot be empty';
    if (!moderateText(trimmed).allowed) return 'Comment contains inappropriate content';

    const { error } = await supabase
      .from('feedback_comments')
      .insert({ post_id: postId, user_id: user.id, content: trimmed });
    if (error) return error.message;
    await loadComments(postId);
    return null;
  }

  async function deleteComment(commentId: string, postId: string): Promise<string | null> {
    const { error } = await supabase.from('feedback_comments').delete().eq('id', commentId);
    if (error) return error.message;
    await loadComments(postId);
    return null;
  }

  async function reportComment(commentId: string, reason: string): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';
    const { error } = await supabase
      .from('feedback_reports')
      .insert({ reporter_id: user.id, comment_id: commentId, reason });
    if (error) return error.message;
    return null;
  }

  return { comments, loading, loadComments, addComment, deleteComment, reportComment };
}
