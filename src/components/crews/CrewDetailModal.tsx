import React, { useState, useEffect, useCallback } from 'react';
import { showAlert, AlertHost } from '@/src/components/ui/ThemedAlert';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast, ToastHost } from '@/src/context/ToastContext';
import { Crew, CrewMember, useCrews } from '@/src/hooks/useCrews';
import { Spot } from '@/src/types';
import { supabase } from '@/src/libs/supabase';

type Props = {
  visible: boolean;
  onClose: () => void;
  crewId: string | null;
  onEdit?: (crew: Crew) => void;
  onSelectSpot?: (spot: Spot) => void;
  onSelectMember?: (userId: string) => void;
};

type UserSearchResult = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export function CrewDetailModal({ visible, onClose, crewId, onEdit, onSelectSpot, onSelectMember }: Props) {
  const toast = useToast();
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const {
    loadCrew,
    loadCrewMembers,
    loadCrewSpots,
    inviteUser,
    leaveCrew,
    deleteCrew,
    removeMember,
    changeRole,
    joinPublicCrew,
    removeSpotFromCrew,
  } = useCrews();

  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [spots, setSpots] = useState<Array<Spot & { crew_added_by: string | null }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<'members' | 'spots'>('members');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<UserSearchResult[]>([]);

  const refresh = useCallback(async () => {
    if (!crewId) return;
    const [cr, mems, sps, userRes] = await Promise.all([
      loadCrew(crewId),
      loadCrewMembers(crewId),
      loadCrewSpots(crewId),
      supabase.auth.getUser(),
    ]);
    setCrew(cr);
    setMembers(mems);
    setSpots(sps);
    setCurrentUserId(userRes.data.user?.id ?? null);
  }, [crewId, loadCrew, loadCrewMembers, loadCrewSpots]);

  useEffect(() => {
    if (visible && crewId) {
      refresh();
    } else if (!visible) {
      setCrew(null);
      setMembers([]);
      setSpots([]);
      setInviteOpen(false);
      setInviteQuery('');
      setInviteResults([]);
      setTab('members');
    }
  }, [visible, crewId, refresh]);

  useEffect(() => {
    if (!inviteOpen) return;
    const q = inviteQuery.trim();
    if (q.length < 2) {
      setInviteResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const memberIds = new Set(members.map((m) => m.user_id));
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${q}%`)
        .limit(20);
      if (cancelled) return;
      setInviteResults(
        (data ?? []).filter((p: any) => !memberIds.has(p.id)) as UserSearchResult[]
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteOpen, inviteQuery, members]);

  const isAdmin = crew?.my_role === 'owner' || crew?.my_role === 'admin';
  const isOwner = crew?.my_role === 'owner';
  const isMember = !!crew?.my_role;

  async function handleLeave() {
    if (!crew) return;
    showAlert('Leave crew?', `Leave "${crew.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          const err = await leaveCrew(crew.id);
          if (err) toast.error(err);
          else onClose();
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!crew) return;
    showAlert('Delete crew?', `Permanently delete "${crew.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const err = await deleteCrew(crew.id);
          if (err) toast.error(err);
          else onClose();
        },
      },
    ]);
  }

  async function handleJoin() {
    if (!crew) return;
    const err = await joinPublicCrew(crew.id);
    if (err) toast.error(err);
    else await refresh();
  }

  async function handleInvite(userId: string) {
    if (!crew) return;
    const err = await inviteUser(crew.id, userId);
    if (err) {
      toast.error(err);
      return;
    }
    setInviteResults((prev) => prev.filter((u) => u.id !== userId));
    toast.success('Invite sent');
  }

  async function handleRemoveMember(userId: string) {
    if (!crew) return;
    showAlert('Remove member?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const err = await removeMember(crew.id, userId);
          if (err) toast.error(err);
          else await refresh();
        },
      },
    ]);
  }

  async function handlePromote(userId: string, role: 'admin' | 'member') {
    if (!crew) return;
    const err = await changeRole(crew.id, userId, role);
    if (err) toast.error(err);
    else await refresh();
  }

  async function handleRemoveSpot(spotId: string) {
    if (!crew) return;
    const err = await removeSpotFromCrew(crew.id, spotId);
    if (err) toast.error(err);
    else await refresh();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible ? <AlertHost /> : null}
      {visible ? <ToastHost /> : null}
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderColor: c.border,
          }}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={c.text} />
          </Pressable>
          <Text style={{ fontWeight: '700', fontSize: 17, color: c.text }} numberOfLines={1}>
            {crew?.name ?? 'Crew'}
          </Text>
          {isAdmin ? (
            <Pressable onPress={() => crew && onEdit?.(crew)} hitSlop={10}>
              <Ionicons name="create-outline" size={22} color={c.text} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* header */}
          <View style={{ padding: 16, alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: c.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              {crew?.avatar_url ? (
                <Image
                  source={{ uri: crew.avatar_url }}
                  style={{ width: 80, height: 80, borderRadius: 40 }}
                />
              ) : (
                <Ionicons name="people" size={36} color={c.subtext} />
              )}
            </View>
            {crew?.description ? (
              <Text style={{ color: c.text, textAlign: 'center', paddingHorizontal: 12 }}>
                {crew.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Text style={{ color: c.subtext, fontSize: 13 }}>
                {crew?.member_count ?? 0} members
              </Text>
              <Text style={{ color: c.subtext, fontSize: 13 }}>·</Text>
              <Text style={{ color: c.subtext, fontSize: 13 }}>
                {crew?.spot_count ?? 0} spots
              </Text>
              <Text style={{ color: c.subtext, fontSize: 13 }}>·</Text>
              <Text style={{ color: c.subtext, fontSize: 13 }}>
                {crew?.is_public ? 'Public' : 'Private'}
              </Text>
            </View>

            {/* action row */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {!isMember && crew?.is_public ? (
                <Pressable
                  onPress={handleJoin}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: c.buttonBg,
                  }}>
                  <Text style={{ color: c.background, fontWeight: '700' }}>Join Crew</Text>
                </Pressable>
              ) : null}
              {isMember ? (
                <Pressable
                  onPress={() => setInviteOpen(true)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: c.buttonBg,
                  }}>
                  <Text style={{ color: c.buttonBg, fontWeight: '700' }}>Invite</Text>
                </Pressable>
              ) : null}
              {isMember && !isOwner ? (
                <Pressable
                  onPress={handleLeave}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: c.danger,
                  }}>
                  <Text style={{ color: c.danger, fontWeight: '700' }}>Leave</Text>
                </Pressable>
              ) : null}
              {isOwner ? (
                <Pressable
                  onPress={handleDelete}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: c.danger,
                  }}>
                  <Text style={{ color: c.danger, fontWeight: '700' }}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* tab switch */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              backgroundColor: c.surface,
              borderRadius: 8,
              padding: 4,
            }}>
            {(['members', 'spots'] as const).map((t) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 6,
                    backgroundColor: active ? c.buttonBg : 'transparent',
                    alignItems: 'center',
                  }}>
                  <Text
                    style={{
                      fontWeight: '600',
                      color: active ? c.background : c.text,
                      textTransform: 'capitalize',
                    }}>
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'members' ? (
            <View style={{ paddingHorizontal: 16, marginTop: 12, gap: 8 }}>
              {members.map((m) => (
                <View
                  key={m.user_id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                  }}>
                  <Pressable
                    onPress={() => onSelectMember?.(m.user_id)}
                    disabled={!onSelectMember}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {m.avatar_url ? (
                      <Image
                        source={{ uri: m.avatar_url }}
                        style={{ width: 36, height: 36, borderRadius: 18 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: c.border,
                        }}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontWeight: '600' }}>
                        {m.username ?? 'Unknown'}
                      </Text>
                      <Text style={{ color: c.subtext, fontSize: 12, textTransform: 'capitalize' }}>
                        {m.role}
                      </Text>
                    </View>
                  </Pressable>
                  {isOwner && m.role !== 'owner' ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() =>
                          handlePromote(m.user_id, m.role === 'admin' ? 'member' : 'admin')
                        }
                        hitSlop={8}>
                        <Text style={{ color: c.buttonBg, fontSize: 12, fontWeight: '600' }}>
                          {m.role === 'admin' ? 'Demote' : 'Promote'}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => handleRemoveMember(m.user_id)} hitSlop={8}>
                        <Ionicons name="person-remove-outline" size={20} color={c.danger} />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, marginTop: 12, gap: 8 }}>
              {spots.length === 0 ? (
                <Text style={{ color: c.subtext, paddingVertical: 12 }}>No shared spots yet.</Text>
              ) : (
                spots.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => onSelectSpot?.(s)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                      gap: 10,
                    }}>
                    <Ionicons name="location" size={20} color={c.buttonBg} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontWeight: '600' }}>{s.name}</Text>
                      {s.tags?.length > 0 ? (
                        <Text style={{ color: c.subtext, fontSize: 12, marginTop: 2 }}>
                          {s.tags.map((t) => `#${t}`).join(' ')}
                        </Text>
                      ) : null}
                    </View>
                    {isAdmin || s.crew_added_by === currentUserId ? (
                      <Pressable onPress={() => handleRemoveSpot(s.id)} hitSlop={8}>
                        <Ionicons name="close-circle" size={22} color={c.danger} />
                      </Pressable>
                    ) : null}
                  </Pressable>
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* invite drawer */}
        <Modal visible={inviteOpen} animationType="slide" onRequestClose={() => setInviteOpen(false)}>
          <View style={{ flex: 1, backgroundColor: c.background }}>
            <View
              style={{
                paddingTop: insets.top + 8,
                paddingBottom: 12,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomWidth: 1,
                borderColor: c.border,
              }}>
              <Pressable onPress={() => setInviteOpen(false)} hitSlop={10}>
                <Text style={{ color: c.subtext, fontSize: 16 }}>Done</Text>
              </Pressable>
              <Text style={{ fontWeight: '700', fontSize: 17, color: c.text }}>Invite to Crew</Text>
              <View style={{ width: 30 }} />
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              <TextInput
                value={inviteQuery}
                onChangeText={setInviteQuery}
                placeholder="Search username"
                placeholderTextColor={c.subtext}
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 15,
                  color: c.text,
                  backgroundColor: c.surface,
                }}
              />
              <ScrollView style={{ marginTop: 8 }}>
                {inviteResults.map((u) => (
                  <View
                    key={u.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                      gap: 10,
                    }}>
                    {u.avatar_url ? (
                      <Image
                        source={{ uri: u.avatar_url }}
                        style={{ width: 36, height: 36, borderRadius: 18 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: c.border,
                        }}
                      />
                    )}
                    <Text style={{ flex: 1, color: c.text, fontWeight: '600' }}>{u.username}</Text>
                    <Pressable
                      onPress={() => handleInvite(u.id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: c.buttonBg,
                      }}>
                      <Text style={{ color: c.background, fontWeight: '600' }}>Invite</Text>
                    </Pressable>
                  </View>
                ))}
                {inviteQuery.trim().length >= 2 && inviteResults.length === 0 ? (
                  <Text style={{ color: c.subtext, paddingVertical: 12 }}>No matches.</Text>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
