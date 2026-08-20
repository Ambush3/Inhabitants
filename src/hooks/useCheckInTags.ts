import { useCallback, useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { sendSkatedWithNotification } from '@/src/libs/sendPushNotification';

export type TaggedSkater = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export const MAX_TAGS_PER_CHECK_IN = 10;

export type CheckInKind = 'spot' | 'place';

const TAG_TABLE: Record<CheckInKind, { table: string; fk: string }> = {
  spot: { table: 'check_in_tags', fk: 'check_in_id' },
  place: { table: 'place_check_in_tags', fk: 'place_check_in_id' },
};

export function useCheckInTags(kind: CheckInKind = 'spot') {
  const [tagging, setTagging] = useState(false);
  const { table, fk } = TAG_TABLE[kind];

  const setTags = useCallback(
    async (
      checkInId: string,
      target: { spotId?: string; placeName?: string },
      nextUserIds: string[]
    ): Promise<{ success: boolean; error?: string }> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data: existingRows } = await supabase
        .from(table)
        .select('tagged_user_id')
        .eq(fk, checkInId);

      const existing = new Set((existingRows ?? []).map((r: any) => r.tagged_user_id));
      const next = new Set(nextUserIds.slice(0, MAX_TAGS_PER_CHECK_IN));

      const added = [...next].filter((id) => !existing.has(id));
      const removed = [...existing].filter((id) => !next.has(id));

      setTagging(true);
      try {
        if (removed.length > 0) {
          const { error } = await supabase
            .from(table)
            .delete()
            .eq(fk, checkInId)
            .in('tagged_user_id', removed);
          if (error) return { success: false, error: error.message };
        }

        if (added.length > 0) {
          const { error } = await supabase.from(table).insert(
            added.map((id) => ({
              [fk]: checkInId,
              tagged_user_id: id,
              tagged_by: user.id,
            }))
          );
          if (error) return { success: false, error: error.message };

          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle();

          await sendSkatedWithNotification(
            { spotId: target.spotId, placeName: target.placeName },
            added,
            profile?.username ?? 'Someone',
            user.id
          );
        }

        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      } finally {
        setTagging(false);
      }
    },
    [table, fk]
  );

  const getTagsForCheckIns = useCallback(
    async (checkInIds: string[]): Promise<Record<string, TaggedSkater[]>> => {
      if (checkInIds.length === 0) return {};

      const { data } = await supabase
        .from(table)
        .select(`${fk}, tagged_user_id`)
        .in(fk, checkInIds);
      if (!data || data.length === 0) return {};

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', Array.from(new Set(data.map((r: any) => r.tagged_user_id))));
      const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      const result: Record<string, TaggedSkater[]> = {};
      for (const row of data as any[]) {
        const profile = byId.get(row.tagged_user_id);
        if (!profile) continue;
        (result[row[fk]] ??= []).push({
          id: profile.id,
          username: profile.username,
          avatar_url: profile.avatar_url ?? null,
        });
      }
      return result;
    },
    [table, fk]
  );

  const removeTag = useCallback(
    async (checkInId: string, taggedUserId: string): Promise<boolean> => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(fk, checkInId)
        .eq('tagged_user_id', taggedUserId);
      return !error;
    },
    [table, fk]
  );

  return { tagging, setTags, getTagsForCheckIns, removeTag };
}
