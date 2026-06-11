import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { moderateText } from '@/src/libs/moderator/textModerator';

export type FeedbackCategory = 'feature' | 'bug' | 'enhancement' | 'other';
export type FeedbackSort = 'top' | 'new';

export type FeedbackPost = {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  category: FeedbackCategory;
  score: number;
  created_at: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
  comment_count: number;
  my_vote: number; // -1, 0, or 1
};

async function checkBan(userId: string): Promise<string | null> {
  const { data: ban } = await supabase
    .from('banned_users')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (!ban) return null;
  if (ban.ban_type === 'permanent') return 'You are permanently banned from posting.';
  if (ban.ban_type === 'comments' && ban.banned_until && new Date(ban.banned_until) > new Date()) {
    return `You are banned from posting until ${new Date(ban.banned_until).toLocaleDateString()}.`;
  }
  return null;
}

export function useFeedback() {
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadPosts(sort: FeedbackSort = 'new', category?: FeedbackCategory) {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let query = supabase.from('feedback_posts').select('*');
      if (category) query = query.eq('category', category);
      query =
        sort === 'top'
          ? query.order('score', { ascending: false }).order('created_at', { ascending: false })
          : query.order('created_at', { ascending: false });

      const { data } = await query.limit(200);
      const rows = (data ?? []) as any[];
      const postIds = rows.map((r) => r.id);
      const authorIds = Array.from(
        new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x))
      );

      // profiles, my votes, comment counts — fetched separately (no PostgREST embeds)
      const [profilesRes, votesRes, commentRowsRes] = await Promise.all([
        authorIds.length > 0
          ? supabase.from('profiles').select('id, username, avatar_url').in('id', authorIds)
          : Promise.resolve({ data: [] as any[] }),
        user && postIds.length > 0
          ? supabase
              .from('feedback_votes')
              .select('post_id, value')
              .eq('user_id', user.id)
              .in('post_id', postIds)
          : Promise.resolve({ data: [] as any[] }),
        postIds.length > 0
          ? supabase.from('feedback_comments').select('post_id').in('post_id', postIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = new Map<string, { username: string | null; avatar_url: string | null }>();
      (profilesRes.data ?? []).forEach((p: any) =>
        profileMap.set(p.id, { username: p.username, avatar_url: p.avatar_url })
      );

      const myVotes = new Map<string, number>();
      (votesRes.data ?? []).forEach((v: any) => myVotes.set(v.post_id, v.value));

      const commentCounts = new Map<string, number>();
      (commentRowsRes.data ?? []).forEach((cr: any) =>
        commentCounts.set(cr.post_id, (commentCounts.get(cr.post_id) ?? 0) + 1)
      );

      setPosts(
        rows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          title: r.title,
          body: r.body,
          category: r.category,
          score: r.score,
          created_at: r.created_at,
          profiles: r.user_id ? profileMap.get(r.user_id) ?? null : null,
          comment_count: commentCounts.get(r.id) ?? 0,
          my_vote: myVotes.get(r.id) ?? 0,
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  async function createPost(
    title: string,
    body: string,
    category: FeedbackCategory
  ): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';

    const banMsg = await checkBan(user.id);
    if (banMsg) return banMsg;

    const t = title.trim();
    const b = body.trim();
    if (t.length < 3) return 'Title is too short';
    if (!b) return 'Description cannot be empty';
    if (!moderateText(t).allowed || !moderateText(b).allowed) {
      return 'Post contains inappropriate content';
    }

    const { error } = await supabase
      .from('feedback_posts')
      .insert({ user_id: user.id, title: t, body: b, category });
    if (error) return error.message;
    return null;
  }

  // Optimistically toggle a vote, then persist. value is -1 or 1.
  async function vote(postId: string, value: -1 | 1): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const current = posts.find((p) => p.id === postId)?.my_vote ?? 0;
    const nextVote = current === value ? 0 : value;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, my_vote: nextVote, score: p.score - current + nextVote } : p
      )
    );

    if (nextVote === 0) {
      await supabase.from('feedback_votes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase
        .from('feedback_votes')
        .upsert({ post_id: postId, user_id: user.id, value: nextVote }, { onConflict: 'post_id,user_id' });
    }
  }

  async function deletePost(postId: string): Promise<string | null> {
    const { error } = await supabase.from('feedback_posts').delete().eq('id', postId);
    if (error) return error.message;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    return null;
  }

  async function reportPost(postId: string, reason: string): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';
    const { error } = await supabase
      .from('feedback_reports')
      .insert({ reporter_id: user.id, post_id: postId, reason });
    if (error) return error.message;
    return null;
  }

  return { posts, loading, loadPosts, createPost, vote, deletePost, reportPost };
}
