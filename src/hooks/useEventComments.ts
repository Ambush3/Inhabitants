import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { moderateText } from '@/src/libs/moderator/textModerator';

export type EventComment = {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
};

export function useEventComments() {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadComments(eventId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('event_comments')
      .select('*, profile:profiles(username, avatar_url)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    setComments((data ?? []) as EventComment[]);
    setLoading(false);
  }

  async function addComment(eventId: string, content: string, userId: string): Promise<string | null> {
    const trimmed = content.trim();
    if (!trimmed) return 'Comment cannot be empty';

    const check = moderateText(trimmed);
    if (!check.allowed) return check.reason ?? 'Inappropriate content.';

    const { data, error } = await supabase
      .from('event_comments')
      .insert({ event_id: eventId, user_id: userId, content: trimmed })
      .select('*, profile:profiles(username, avatar_url)')
      .single();

    if (error) return error.message;
    setComments((prev) => [...prev, data as EventComment]);
    return null;
  }

  async function deleteComment(commentId: string): Promise<string | null> {
    const { error } = await supabase.from('event_comments').delete().eq('id', commentId);
    if (error) return error.message;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    return null;
  }

  function clearComments() {
    setComments([]);
  }

  return { comments, loading, loadComments, addComment, deleteComment, clearComments };
}
