import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useCrews, Crew } from '@/src/hooks/useCrews';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectCrew: (crewId: string) => void;
  onCreatePress: () => void;
  initialTab?: 'mine' | 'discover' | 'invites';
};

type Tab = 'mine' | 'discover' | 'invites';

export function CrewsModal({ visible, onClose, onSelectCrew, onCreatePress, initialTab }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const {
    myCrews,
    publicCrews,
    pendingInvites,
    loadingMine,
    loadingPublic,
    loadingInvites,
    loadMyCrews,
    loadPublicCrews,
    loadPendingInvites,
    acceptInvite,
    declineInvite,
  } = useCrews();

  const [tab, setTab] = useState<Tab>(initialTab ?? 'mine');

  useEffect(() => {
    if (visible && initialTab) setTab(initialTab);
  }, [visible, initialTab]);
  const [discoverQuery, setDiscoverQuery] = useState('');

  const refresh = useCallback(async () => {
    await Promise.all([loadMyCrews(), loadPendingInvites()]);
  }, [loadMyCrews, loadPendingInvites]);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  useEffect(() => {
    if (visible && tab === 'discover') loadPublicCrews(discoverQuery);
  }, [visible, tab, discoverQuery, loadPublicCrews]);

  async function handleAccept(inviteId: string) {
    const err = await acceptInvite(inviteId);
    if (err) Alert.alert('Error', err);
  }
  async function handleDecline(inviteId: string) {
    const err = await declineInvite(inviteId);
    if (err) Alert.alert('Error', err);
  }

  function renderCrewRow(crew: Crew) {
    return (
      <Pressable
        key={crew.id}
        onPress={() => onSelectCrew(crew.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderColor: c.border,
          gap: 12,
        }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.border,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {crew.avatar_url ? (
            <Image
              source={{ uri: crew.avatar_url }}
              style={{ width: 44, height: 44, borderRadius: 22 }}
            />
          ) : (
            <Ionicons name="people" size={22} color={c.subtext} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{crew.name}</Text>
          <Text style={{ color: c.subtext, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {crew.member_count ?? 0} members · {crew.spot_count ?? 0} spots
            {crew.is_public ? ' · Public' : ' · Private'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.subtext} />
      </Pressable>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
          <Text style={{ fontWeight: '700', fontSize: 17, color: c.text }}>Crews</Text>
          <Pressable onPress={onCreatePress} hitSlop={10}>
            <Ionicons name="add" size={26} color={c.text} />
          </Pressable>
        </View>

        {/* tabs */}
        <View
          style={{
            flexDirection: 'row',
            margin: 16,
            backgroundColor: c.surface,
            borderRadius: 8,
            padding: 4,
          }}>
          {(['mine', 'discover', 'invites'] as const).map((t) => {
            const active = tab === t;
            const badge = t === 'invites' ? pendingInvites.length : 0;
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
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 4,
                }}>
                <Text
                  style={{
                    fontWeight: '600',
                    color: active ? c.background : c.text,
                    textTransform: 'capitalize',
                  }}>
                  {t}
                </Text>
                {badge > 0 ? (
                  <View
                    style={{
                      backgroundColor: active ? c.background : c.danger,
                      borderRadius: 10,
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 5,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Text
                      style={{
                        color: active ? c.buttonBg : 'white',
                        fontSize: 11,
                        fontWeight: '700',
                      }}>
                      {badge}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {tab === 'mine' ? (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={loadingMine} onRefresh={loadMyCrews} tintColor={c.text} />
            }>
            {myCrews.length === 0 ? (
              <View style={{ padding: 16, alignItems: 'center', gap: 12 }}>
                <Text style={{ color: c.subtext, textAlign: 'center' }}>
                  You aren't in any crews yet.
                </Text>
                <Pressable
                  onPress={onCreatePress}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: c.buttonBg,
                  }}>
                  <Text style={{ color: c.background, fontWeight: '700' }}>Create Crew</Text>
                </Pressable>
              </View>
            ) : (
              myCrews.map(renderCrewRow)
            )}
          </ScrollView>
        ) : null}

        {tab === 'discover' ? (
          <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <TextInput
                value={discoverQuery}
                onChangeText={setDiscoverQuery}
                placeholder="Search public crews"
                placeholderTextColor={c.subtext}
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 14,
                  color: c.text,
                  backgroundColor: c.surface,
                }}
              />
            </View>
            <ScrollView
              refreshControl={
                <RefreshControl
                  refreshing={loadingPublic}
                  onRefresh={() => loadPublicCrews(discoverQuery)}
                  tintColor={c.text}
                />
              }>
              {publicCrews.length === 0 ? (
                <Text style={{ color: c.subtext, padding: 16, textAlign: 'center' }}>
                  No crews found.
                </Text>
              ) : (
                publicCrews.map(renderCrewRow)
              )}
            </ScrollView>
          </View>
        ) : null}

        {tab === 'invites' ? (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={loadingInvites}
                onRefresh={loadPendingInvites}
                tintColor={c.text}
              />
            }>
            {pendingInvites.length === 0 ? (
              <Text style={{ color: c.subtext, padding: 16, textAlign: 'center' }}>
                No pending invites.
              </Text>
            ) : (
              pendingInvites.map((inv) => (
                <View
                  key={inv.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    gap: 10,
                  }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: c.border,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    {inv.crew?.avatar_url ? (
                      <Image
                        source={{ uri: inv.crew.avatar_url }}
                        style={{ width: 40, height: 40, borderRadius: 20 }}
                      />
                    ) : (
                      <Ionicons name="people" size={20} color={c.subtext} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '700' }}>
                      {inv.crew?.name ?? 'Crew'}
                    </Text>
                    {inv.inviter_username ? (
                      <Text style={{ color: c.subtext, fontSize: 12, marginTop: 2 }}>
                        Invited by @{inv.inviter_username}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => handleAccept(inv.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: c.buttonBg,
                    }}>
                    <Text style={{ color: c.background, fontWeight: '700' }}>Accept</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDecline(inv.id)} hitSlop={8}>
                    <Ionicons name="close" size={22} color={c.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}
