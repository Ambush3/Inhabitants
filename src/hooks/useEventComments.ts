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
    const { data: commentData } = await supabase
      .from('event_comments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (!commentData) {
      setLoading(false);
      return;
    }

    const userIds = [...new Set(commentData.map((c) => c.user_id))];
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    const profileMap = new Map((profileData ?? []).map((p) => [p.id, p]));

    setComments(
      commentData.map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) ?? { username: null, avatar_url: null },
      }))
    );
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
      .select('*')
      .single();

    if (error) return error.message;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    setComments((prev) => [
      ...prev,
      {
        ...data,
        profile: profileData ?? { username: null, avatar_url: null },
      } as EventComment,
    ]);
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
