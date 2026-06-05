import { useCallback, useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Spot } from '@/src/types';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import {
  sendCrewInviteNotification,
  sendCrewJoinNotification,
  sendCrewSpotAddedNotification,
} from '@/src/libs/sendPushNotification';

export type CrewRole = 'owner' | 'admin' | 'member';

export type Crew = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  is_public: boolean;
  created_at: string;
  member_count?: number;
  spot_count?: number;
  my_role?: CrewRole | null;
};

export type CrewMember = {
  crew_id: string;
  user_id: string;
  role: CrewRole;
  joined_at: string;
  username?: string;
  avatar_url?: string | null;
};

export type CrewInvite = {
  id: string;
  crew_id: string;
  inviter_id: string | null;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  responded_at: string | null;
  crew?: Pick<Crew, 'id' | 'name' | 'avatar_url'>;
  inviter_username?: string;
};

export function useCrews() {
  const [myCrews, setMyCrews] = useState<Crew[]>([]);
  const [publicCrews, setPublicCrews] = useState<Crew[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CrewInvite[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);

  async function getUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  }

  async function getMyProfile(): Promise<{ id: string; username: string } | null> {
    const userId = await getUserId();
    if (!userId) return null;
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    return { id: userId, username: data?.username ?? 'someone' };
  }

  async function getCrewMembersExcept(crewId: string, excludeUserId: string): Promise<string[]> {
    const { data } = await supabase
      .from('crew_members')
      .select('user_id')
      .eq('crew_id', crewId);
    return (data ?? [])
      .map((r: any) => r.user_id)
      .filter((id: string) => id && id !== excludeUserId);
  }

  async function getCrewName(crewId: string): Promise<string> {
    const { data } = await supabase.from('crews').select('name').eq('id', crewId).maybeSingle();
    return data?.name ?? 'Crew';
  }

  const loadMyCrews = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;
    setLoadingMine(true);
    try {
      const { data: memberRows } = await supabase
        .from('crew_members')
        .select('crew_id, role')
        .eq('user_id', userId);
      const ids = (memberRows ?? []).map((r: any) => r.crew_id);
      if (ids.length === 0) {
        setMyCrews([]);
        return;
      }
      const { data: crewRows } = await supabase
        .from('crews')
        .select('*, crew_members(count), crew_spots(count)')
        .in('id', ids);
      const roleByCrew: Record<string, CrewRole> = {};
      (memberRows ?? []).forEach((r: any) => (roleByCrew[r.crew_id] = r.role));
      const mapped: Crew[] = (crewRows ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        avatar_url: c.avatar_url,
        created_by: c.created_by,
        is_public: c.is_public,
        created_at: c.created_at,
        member_count: c.crew_members?.[0]?.count ?? 0,
        spot_count: c.crew_spots?.[0]?.count ?? 0,
        my_role: roleByCrew[c.id] ?? null,
      }));
      mapped.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
      setMyCrews(mapped);
    } finally {
      setLoadingMine(false);
    }
  }, []);

  const loadPublicCrews = useCallback(async (query?: string) => {
    setLoadingPublic(true);
    try {
      let q = supabase
        .from('crews')
        .select('*, crew_members(count), crew_spots(count)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (query?.trim()) {
        q = q.ilike('name', `%${query.trim()}%`);
      }
      const { data } = await q;
      const mapped: Crew[] = (data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        avatar_url: c.avatar_url,
        created_by: c.created_by,
        is_public: c.is_public,
        created_at: c.created_at,
        member_count: c.crew_members?.[0]?.count ?? 0,
        spot_count: c.crew_spots?.[0]?.count ?? 0,
      }));
      setPublicCrews(mapped);
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  const loadPendingInvites = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;
    setLoadingInvites(true);
    try {
      const { data } = await supabase
        .from('crew_invites')
        .select('*, crew:crews(id, name, avatar_url)')
        .eq('invitee_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      const inviterIds = Array.from(
        new Set((data ?? []).map((r: any) => r.inviter_id).filter(Boolean))
      );
      let usernameById: Record<string, string> = {};
      if (inviterIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', inviterIds);
        usernameById = Object.fromEntries(
          (profs ?? []).map((p: any) => [p.id, p.username])
        );
      }
      setPendingInvites(
        (data ?? []).map((r: any) => ({
          ...r,
          inviter_username: r.inviter_id ? usernameById[r.inviter_id] : undefined,
        }))
      );
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  const loadCrew = useCallback(async (crewId: string): Promise<Crew | null> => {
    const userId = await getUserId();
    const { data } = await supabase
      .from('crews')
      .select('*, crew_members(count), crew_spots(count)')
      .eq('id', crewId)
      .single();
    if (!data) return null;
    let myRole: CrewRole | null = null;
    if (userId) {
      const { data: m } = await supabase
        .from('crew_members')
        .select('role')
        .eq('crew_id', crewId)
        .eq('user_id', userId)
        .maybeSingle();
      myRole = (m?.role as CrewRole) ?? null;
    }
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      avatar_url: data.avatar_url,
      created_by: data.created_by,
      is_public: data.is_public,
      created_at: data.created_at,
      member_count: data.crew_members?.[0]?.count ?? 0,
      spot_count: data.crew_spots?.[0]?.count ?? 0,
      my_role: myRole,
    };
  }, []);

  const loadCrewMembers = useCallback(async (crewId: string): Promise<CrewMember[]> => {
    const { data } = await supabase
      .from('crew_members')
      .select('*')
      .eq('crew_id', crewId);
    const ids = (data ?? []).map((m: any) => m.user_id);
    if (ids.length === 0) return [];
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', ids);
    const byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    return (data ?? []).map((m: any) => ({
      ...m,
      username: byId[m.user_id]?.username,
      avatar_url: byId[m.user_id]?.avatar_url ?? null,
    }));
  }, []);

  const loadCrewSpots = useCallback(
    async (crewId: string): Promise<Array<Spot & { crew_added_by: string | null }>> => {
      const { data } = await supabase
        .from('crew_spots')
        .select('added_by, spot:spots(*)')
        .eq('crew_id', crewId);
      return (data ?? [])
        .filter((r: any) => r.spot)
        .map((r: any) => ({ ...r.spot, crew_added_by: r.added_by ?? null }));
    },
    []
  );

  async function createCrew(args: {
    name: string;
    description?: string;
    isPublic: boolean;
    avatarUrl?: string | null;
  }): Promise<{ id: string | null; error: string | null }> {
    const userId = await getUserId();
    if (!userId) return { id: null, error: 'Not logged in' };
    const { data, error } = await supabase
      .from('crews')
      .insert({
        name: args.name.trim(),
        description: args.description?.trim() || null,
        is_public: args.isPublic,
        avatar_url: args.avatarUrl ?? null,
        created_by: userId,
      })
      .select('id')
      .single();
    if (error || !data) return { id: null, error: error?.message ?? 'Failed' };
    const { error: memErr } = await supabase
      .from('crew_members')
      .insert({ crew_id: data.id, user_id: userId, role: 'owner' });
    if (memErr) return { id: null, error: memErr.message };
    await loadMyCrews();
    return { id: data.id, error: null };
  }

  async function updateCrew(
    crewId: string,
    patch: Partial<Pick<Crew, 'name' | 'description' | 'is_public' | 'avatar_url'>>
  ): Promise<string | null> {
    const { error } = await supabase.from('crews').update(patch).eq('id', crewId);
    if (error) return error.message;
    await loadMyCrews();
    return null;
  }

  async function deleteCrew(crewId: string): Promise<string | null> {
    const { error } = await supabase.from('crews').delete().eq('id', crewId);
    if (error) return error.message;
    setMyCrews((prev) => prev.filter((c) => c.id !== crewId));
    return null;
  }

  async function inviteUser(crewId: string, inviteeId: string): Promise<string | null> {
    const me = await getMyProfile();
    if (!me) return 'Not logged in';
    const { data: existing } = await supabase
      .from('crew_invites')
      .select('id')
      .eq('crew_id', crewId)
      .eq('invitee_id', inviteeId)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing) return 'Already invited (pending)';
    const { error } = await supabase
      .from('crew_invites')
      .insert({ crew_id: crewId, inviter_id: me.id, invitee_id: inviteeId });
    if (error) return error.message;
    const crewName = await getCrewName(crewId);
    sendCrewInviteNotification(inviteeId, me.username, me.id, crewId, crewName).catch(() => {});
    return null;
  }

  async function acceptInvite(inviteId: string): Promise<string | null> {
    const me = await getMyProfile();
    if (!me) return 'Not logged in';
    const { data: inv } = await supabase
      .from('crew_invites')
      .select('crew_id, invitee_id, status')
      .eq('id', inviteId)
      .single();
    if (!inv || inv.invitee_id !== me.id) return 'Invite not found';
    if (inv.status !== 'pending') return 'Invite already responded';
    const { data: existingMember } = await supabase
      .from('crew_members')
      .select('user_id')
      .eq('crew_id', inv.crew_id)
      .eq('user_id', me.id)
      .maybeSingle();
    if (!existingMember) {
      const { error: memErr } = await supabase
        .from('crew_members')
        .insert({ crew_id: inv.crew_id, user_id: me.id, role: 'member' });
      if (memErr) return memErr.message;
    }
    const { error: updErr } = await supabase
      .from('crew_invites')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', inviteId);
    if (updErr) {
      if (updErr.message?.toLowerCase().includes('duplicate')) {
        await supabase.from('crew_invites').delete().eq('id', inviteId);
      } else {
        return updErr.message;
      }
    }
    const [memberIds, crewName] = await Promise.all([
      getCrewMembersExcept(inv.crew_id, me.id),
      getCrewName(inv.crew_id),
    ]);
    sendCrewJoinNotification(memberIds, me.username, me.id, inv.crew_id, crewName).catch(() => {});
    await loadPendingInvites();
    await loadMyCrews();
    return null;
  }

  async function declineInvite(inviteId: string): Promise<string | null> {
    const { error } = await supabase
      .from('crew_invites')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', inviteId);
    if (error) {
      if (error.message?.toLowerCase().includes('duplicate')) {
        await supabase.from('crew_invites').delete().eq('id', inviteId);
      } else {
        return error.message;
      }
    }
    await loadPendingInvites();
    return null;
  }

  async function cancelInvite(inviteId: string): Promise<string | null> {
    const { error } = await supabase
      .from('crew_invites')
      .update({ status: 'cancelled', responded_at: new Date().toISOString() })
      .eq('id', inviteId);
    return error?.message ?? null;
  }

  async function joinPublicCrew(crewId: string): Promise<string | null> {
    const me = await getMyProfile();
    if (!me) return 'Not logged in';
    const { error } = await supabase
      .from('crew_members')
      .insert({ crew_id: crewId, user_id: me.id, role: 'member' });
    if (error) return error.message;
    const [memberIds, crewName] = await Promise.all([
      getCrewMembersExcept(crewId, me.id),
      getCrewName(crewId),
    ]);
    sendCrewJoinNotification(memberIds, me.username, me.id, crewId, crewName).catch(() => {});
    await loadMyCrews();
    return null;
  }

  async function leaveCrew(crewId: string): Promise<string | null> {
    const userId = await getUserId();
    if (!userId) return 'Not logged in';
    const { error } = await supabase
      .from('crew_members')
      .delete()
      .eq('crew_id', crewId)
      .eq('user_id', userId);
    if (error) return error.message;
    setMyCrews((prev) => prev.filter((c) => c.id !== crewId));
    return null;
  }

  async function removeMember(crewId: string, userId: string): Promise<string | null> {
    const { error } = await supabase
      .from('crew_members')
      .delete()
      .eq('crew_id', crewId)
      .eq('user_id', userId);
    return error?.message ?? null;
  }

  async function changeRole(
    crewId: string,
    userId: string,
    role: CrewRole
  ): Promise<string | null> {
    const { error } = await supabase
      .from('crew_members')
      .update({ role })
      .eq('crew_id', crewId)
      .eq('user_id', userId);
    return error?.message ?? null;
  }

  async function addSpotToCrew(crewId: string, spotId: string): Promise<string | null> {
    const me = await getMyProfile();
    if (!me) return 'Not logged in';
    const { error } = await supabase
      .from('crew_spots')
      .insert({ crew_id: crewId, spot_id: spotId, added_by: me.id });
    if (error) return error.message;
    const [memberIds, crewName, spotRes] = await Promise.all([
      getCrewMembersExcept(crewId, me.id),
      getCrewName(crewId),
      supabase.from('spots').select('name').eq('id', spotId).maybeSingle(),
    ]);
    const spotName = spotRes.data?.name ?? 'a spot';
    sendCrewSpotAddedNotification(
      memberIds,
      me.username,
      me.id,
      crewId,
      crewName,
      spotId,
      spotName
    ).catch(() => {});
    return null;
  }

  async function uploadCrewAvatar(crewId: string, uri: string): Promise<{ url: string | null; error: string | null }> {
    try {
      const compressed = await manipulateAsync(
        uri,
        [{ resize: { width: 400 } }],
        { compress: 0.8, format: SaveFormat.JPEG, base64: true }
      );
      if (!compressed.base64) return { url: null, error: 'Compress failed' };
      const filename = `${crewId}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('crew-avatars')
        .upload(filename, decode(compressed.base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadErr) return { url: null, error: uploadErr.message };
      const { data: urlData } = supabase.storage.from('crew-avatars').getPublicUrl(filename);
      const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      return { url: freshUrl, error: null };
    } catch (e: any) {
      return { url: null, error: e?.message ?? 'Upload failed' };
    }
  }

  async function removeSpotFromCrew(crewId: string, spotId: string): Promise<string | null> {
    const { error } = await supabase
      .from('crew_spots')
      .delete()
      .eq('crew_id', crewId)
      .eq('spot_id', spotId);
    return error?.message ?? null;
  }

  return {
    myCrews,
    publicCrews,
    pendingInvites,
    loadingMine,
    loadingPublic,
    loadingInvites,
    loadMyCrews,
    loadPublicCrews,
    loadPendingInvites,
    loadCrew,
    loadCrewMembers,
    loadCrewSpots,
    createCrew,
    updateCrew,
    deleteCrew,
    inviteUser,
    acceptInvite,
    declineInvite,
    cancelInvite,
    joinPublicCrew,
    leaveCrew,
    removeMember,
    changeRole,
    addSpotToCrew,
    removeSpotFromCrew,
    uploadCrewAvatar,
  };
}
