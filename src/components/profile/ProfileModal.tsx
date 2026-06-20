import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/libs/supabase';
import { useTheme } from '@/src/context/ThemeContext';
import { Spot } from '@/src/types';
import { useFriendships, Friend } from '@/src/hooks/social/useFriendships';
import { useCollections, Collection } from '@/src/hooks/useCollections';
import { useCheckIns, PassportEntry } from '@/src/hooks/useCheckIns';
import { TrickLog } from '@/src/hooks/useTrickLog';
import { sendFriendAcceptedNotification } from '@/src/libs/sendPushNotification';
import { useInvite } from '@/src/hooks/useInvite';
import { moderateText } from '@/src/libs/moderator/textModerator';
import { useStreak } from '@/src/hooks/useStreak';
import { SkateActivityGraph } from '@/src/components/SkateActivityGraph';

type MyReview = {
  id: string;
  spot_id: string;
  spot_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  mySpots: Spot[];
  myReviews: MyReview[];
  onLoadMyReviews: () => Promise<void>;
  onSelectSpot: (spot: Spot) => void;
  allSpots: Spot[];
  onSignOut: () => void;
  onViewProfile?: (userId: string) => void;
  trickLogs: TrickLog[];
  trickLogsLoading: boolean;
  onDeleteTrickLog: (id: string) => Promise<string | null>;
};

type Tab = 'spots' | 'reviews' | 'friends' | 'collections' | 'passport';

export function ProfileModal({
  visible,
  onClose,
  mySpots,
  myReviews,
  onLoadMyReviews,
  onSelectSpot,
  allSpots,
  onSignOut,
  onViewProfile,
  trickLogs,
  trickLogsLoading,
  onDeleteTrickLog,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [activeTab, setActiveTab] = useState<Tab>('spots');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [joinDate, setJoinDate] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<
    { id: string; username: string; avatar_url: string | null }[]
  >([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [bulkRemoving, setBulkRemoving] = useState(false);

  const {
    collections,
    loading: collectionsLoading,
    loadCollections,
    loadCollectionSpots,
    deleteCollection,
  } = useCollections();
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionSpots, setCollectionSpots] = useState<Spot[]>([]);
  const [collectionSpotsLoading, setCollectionSpotsLoading] = useState(false);

  const [badge, setBadge] = useState<'local' | 'regular' | 'ambassador' | null>(null);

  const { loadPendingRequests, acceptFriendRequest, removeFriend, pendingReceived, loadFriends, friends } =
    useFriendships();

  const { loadPassport, passportEntries, passportLoading, togglePrivacy, deleteCheckIn } = useCheckIns();
  const { activityData, loading: streakLoading, loadStreak } = useStreak();

  const [expandedPassportSpot, setExpandedPassportSpot] = useState<string | null>(null);

  const [contactsOpen, setContactsOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [listsSubTab, setListsSubTab] = useState<'collections' | 'journal'>('collections');

  const { shareInviteLink, inviteViaContacts, sendSMSInvite } = useInvite();

  function toggleFriendSelected(id: string) {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function searchUsers(query: string) {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    setUserSearchLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', user?.id ?? '')
      .limit(10);
    setUserSearchResults(data ?? []);
    setUserSearchLoading(false);
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelectedFriendIds(new Set());
  }

  async function bulkRemoveSelected() {
    if (selectedFriendIds.size === 0) return;
    setBulkRemoving(true);
    await Promise.all(Array.from(selectedFriendIds).map((id) => removeFriend(id)));
    await loadFriends();
    setBulkRemoving(false);
    exitSelection();
  }

  useEffect(() => {
    if (!visible) exitSelection();
    loadCollections();
  }, [visible]);

  useEffect(() => {
    if (activeTab !== 'friends') {
      exitSelection();
      setUserSearchQuery('');
      setUserSearchResults([]);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!visible) return;
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username, created_at, first_name, last_name, badge')
        .eq('id', user.id)
        .single();
      setAvatarUrl(data?.avatar_url ?? null);
      setUsername(data?.username ?? null);
      setFirstName(data?.first_name ?? null);
      setLastName(data?.last_name ?? null);
      setJoinDate(data?.created_at ?? null);
      setBadge(data?.badge ?? null);
    }
    loadProfile();
    onLoadMyReviews();
    loadPendingRequests();
    loadFriends();
    loadPassport();
    loadStreak();
  }, [visible]);

  const myActualSpots = mySpots.filter((s) => s.spot_type === 'spot');
  const avgRatingGiven =
    myReviews.length === 0 ? null : myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: c.border,
          }}>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color={c.text} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: c.text }}>
            Profile
          </Text>
          <Pressable
            onPress={() => {
              setEditUsername(username ?? '');
              setEditFirstName(firstName ?? '');
              setEditLastName(lastName ?? '');
              setEditOpen(true);
            }}
            style={{ padding: 4 }}>
            <Text style={{ fontSize: 14, color: '#007AFF', fontWeight: '600' }}>Edit</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ── Avatar + name ── */}
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 90, height: 90, borderRadius: 45, marginBottom: 12 }}
              />
            ) : (
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: c.tagBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}>
                <Ionicons name="person-outline" size={40} color={c.subtext} />
              </View>
            )}
            {firstName || lastName ? (
              <Text style={{ fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 2 }}>
                {[firstName, lastName].filter(Boolean).join(' ')}
              </Text>
            ) : null}
            {username ? (
              <Text
                style={{
                  fontSize: firstName || lastName ? 14 : 22,
                  fontWeight: firstName || lastName ? '500' : '700',
                  color: firstName || lastName ? c.subtext : c.text,
                  marginBottom: 4,
                }}>
                @{username}
              </Text>
            ) : null}
            {joinDate ? (
              <Text style={{ fontSize: 13, color: c.subtext }}>
                Joined {new Date(joinDate).toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </Text>
            ) : null}
            {badge ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor:
                    badge === 'ambassador'
                      ? 'rgba(255,149,0,0.12)'
                      : badge === 'regular'
                        ? 'rgba(0,122,255,0.12)'
                        : 'rgba(52,199,89,0.12)',
                }}>
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={
                    badge === 'ambassador' ? '#FF9500' : badge === 'regular' ? '#007AFF' : '#34C759'
                  }
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color:
                      badge === 'ambassador'
                        ? '#FF9500'
                        : badge === 'regular'
                          ? '#007AFF'
                          : '#34C759',
                  }}>
                  {badge.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Pending friend requests ── */}
          {pendingReceived.length > 0 ? (
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 16,
                borderRadius: 12,
                backgroundColor: c.tagBg,
                padding: 12,
              }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 10 }}>
                Friend Requests ({pendingReceived.length})
              </Text>
              {pendingReceived.map((f) => (
                <View
                  key={f.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    gap: 10,
                  }}>
                  {f.avatar_url ? (
                    <Image
                      source={{ uri: f.avatar_url }}
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: c.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Ionicons name="person-outline" size={18} color={c.subtext} />
                    </View>
                  )}
                  <Text style={{ flex: 1, fontWeight: '600', color: c.text }}>@{f.username}</Text>
                  <Pressable
                    onPress={async () => {
                      await acceptFriendRequest(f.id);
                      loadPendingRequests();
                      loadFriends();
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (username && user)
                        sendFriendAcceptedNotification(f.id, username, user.id);
                    }}
                    style={{
                      backgroundColor: '#007AFF',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}>
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Accept</Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      await removeFriend(f.id);
                      loadPendingRequests();
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}>
                    <Text style={{ color: c.subtext, fontWeight: '600', fontSize: 13 }}>
                      Decline
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── Stats row ── */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              marginBottom: 24,
              borderRadius: 12,
              backgroundColor: c.tagBg,
              overflow: 'hidden',
            }}>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 16,
                borderRightWidth: 1,
                borderColor: c.border,
              }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>
                {myActualSpots.length}
              </Text>
              <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>Spots</Text>
            </View>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 16,
                borderRightWidth: 1,
                borderColor: c.border,
              }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>{myReviews.length}</Text>
              <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>Reviews</Text>
            </View>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 16,
                borderRightWidth: 1,
                borderColor: c.border,
              }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>
                {passportEntries.length}
              </Text>
              <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>Visited</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>
                {avgRatingGiven ? avgRatingGiven.toFixed(1) : '—'}
              </Text>
              <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>Avg Rating</Text>
            </View>
          </View>

          {/* ── Tab row ── */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              marginBottom: 16,
              borderRadius: 8,
              backgroundColor: c.tagBg,
              padding: 4,
            }}>
            {(['spots', 'reviews', 'collections', 'friends', 'passport'] as Tab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setSelectedCollection(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 6,
                  alignItems: 'center',
                  backgroundColor: activeTab === tab ? c.surface : 'transparent',
                }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: activeTab === tab ? c.text : c.subtext,
                  }}>
                  {tab === 'spots'
                    ? 'Spots'
                    : tab === 'reviews'
                      ? 'Reviews'
                      : tab === 'friends'
                        ? `Friends (${friends.length})`
                        : tab === 'collections'
                          ? 'Lists'
                          : 'Passport'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Tab content ── */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
            {/* Spots */}
            {activeTab === 'spots' ? (
              myActualSpots.length === 0 ? (
                <Text style={{ color: c.subtext, fontSize: 14, textAlign: 'center', marginTop: 24 }}>
                  {"You haven't created any spots yet."}
                </Text>
              ) : (
                myActualSpots.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      onSelectSpot(s);
                      onClose();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                      gap: 10,
                    }}>
                    <Ionicons name="location-outline" size={16} color={c.subtext} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                      {s.tags?.length > 0 ? (
                        <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>
                          {s.tags.map((t) => `#${t}`).join(' ')}
                        </Text>
                      ) : null}
                    </View>
                    {s.is_private ? (
                      <Ionicons name="lock-closed" size={14} color={c.danger} />
                    ) : null}
                    <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                  </Pressable>
                ))
              )
            ) : /* Reviews */
              activeTab === 'reviews' ? (
                myReviews.length === 0 ? (
                  <Text style={{ color: c.subtext, fontSize: 14, textAlign: 'center', marginTop: 24 }}>
                    {"You haven't left any reviews yet."}
                  </Text>
                ) : (
                  myReviews.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => {
                        const spot = allSpots.find((s) => s.id === r.spot_id);
                        if (spot) {
                          onSelectSpot(spot);
                          onClose();
                        }
                      }}
                      style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: c.border }}>
                      <Text style={{ fontWeight: '700', color: c.text, marginBottom: 4 }}>
                        {r.spot_name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: '#F5A623',
                          letterSpacing: 1,
                          marginBottom: 4,
                        }}>
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(5 - r.rating)}
                      </Text>
                      {r.comment ? (
                        <Text
                          style={{
                            fontSize: 14,
                            color: c.text,
                            lineHeight: 20,
                            marginBottom: 4,
                          }}>
                          {r.comment}
                        </Text>
                      ) : null}
                      <Text style={{ fontSize: 11, color: c.subtext }}>
                        {new Date(r.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </Pressable>
                  ))
                )
              ) : /* Friends */
                activeTab === 'friends' ? (
                  <>
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 10 }}>
                        Invite Friends
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                          onPress={shareInviteLink}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            backgroundColor: c.tagBg,
                            borderRadius: 10,
                            padding: 11,
                          }}>
                          <Ionicons name="share-outline" size={16} color={c.text} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>
                            Share Link
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={async () => {
                            setContactsLoading(true);
                            const result = await inviteViaContacts();
                            setContacts(result ?? []);
                            setContactsLoading(false);
                            setContactsOpen(true);
                          }}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            backgroundColor: 'rgba(0,122,255,0.12)',
                            borderRadius: 10,
                            padding: 11,
                          }}>
                          <Ionicons name="people-outline" size={16} color="#007AFF" />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#007AFF' }}>
                            {contactsLoading ? 'Loading...' : 'Invite Contacts'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={{ marginBottom: 16 }}>
                      <TextInput
                        value={userSearchQuery}
                        onChangeText={(text) => {
                          setUserSearchQuery(text);
                          searchUsers(text);
                        }}
                        placeholder="Search users by username..."
                        placeholderTextColor={c.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={{
                          borderWidth: 1,
                          borderColor: c.inputBorder,
                          borderRadius: 10,
                          padding: 12,
                          fontSize: 14,
                          color: c.text,
                          backgroundColor: c.surface,
                          marginBottom: 8,
                        }}
                      />
                      {userSearchLoading ? (
                        <Text style={{ color: c.subtext, fontSize: 13 }}>Searching...</Text>
                      ) : userSearchResults.length > 0 ? (
                        userSearchResults.map((u) => (
                          <Pressable
                            key={u.id}
                            onPress={() => {
                              setUserSearchQuery('');
                              setUserSearchResults([]);
                              onViewProfile?.(u.id);
                            }}
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
                                  backgroundColor: c.tagBg,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                <Ionicons name="person-outline" size={18} color={c.subtext} />
                              </View>
                            )}
                            <Text style={{ flex: 1, fontWeight: '600', color: c.text }}>
                              @{u.username}
                            </Text>
                            {friends.some((f) => f.id === u.id) ? (
                              <View
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: '#34C759',
                                    fontWeight: '600',
                                  }}>
                                  Friends
                                </Text>
                              </View>
                            ) : (
                              <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                            )}
                          </Pressable>
                        ))
                      ) : null}
                    </View>
                    {friends.length === 0 ? (
                      <Text
                        style={{ color: c.subtext, fontSize: 14, textAlign: 'center', marginTop: 24 }}>
                        No friends yet. Find skaters and add them!
                      </Text>
                    ) : (
                      <>
                        {selectionMode ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingVertical: 8,
                              paddingHorizontal: 4,
                              marginBottom: 4,
                              borderBottomWidth: 1,
                              borderColor: c.border,
                            }}>
                            <Pressable onPress={exitSelection} disabled={bulkRemoving}>
                              <Text style={{ color: '#007AFF', fontWeight: '600', fontSize: 14 }}>
                                Cancel
                              </Text>
                            </Pressable>
                            <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }}>
                              {selectedFriendIds.size} selected
                            </Text>
                            <Pressable
                              disabled={selectedFriendIds.size === 0 || bulkRemoving}
                              onPress={() =>
                                Alert.alert(
                                  `Remove ${selectedFriendIds.size} friend${selectedFriendIds.size === 1 ? '' : 's'}?`,
                                  undefined,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Remove',
                                      style: 'destructive',
                                      onPress: bulkRemoveSelected,
                                    },
                                  ]
                                )
                              }>
                              <Ionicons
                                name="trash-outline"
                                size={22}
                                color={
                                  selectedFriendIds.size === 0 || bulkRemoving
                                    ? c.subtext
                                    : c.danger
                                }
                              />
                            </Pressable>
                          </View>
                        ) : null}
                        {friends.map((f) => {
                          const selected = selectedFriendIds.has(f.id);
                          return (
                            <Pressable
                              key={f.id}
                              onLongPress={() => {
                                if (!selectionMode) setSelectionMode(true);
                                toggleFriendSelected(f.id);
                              }}
                              onPress={() => {
                                if (selectionMode) toggleFriendSelected(f.id);
                                else onViewProfile?.(f.id);
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 12,
                                borderBottomWidth: 1,
                                borderColor: c.border,
                                gap: 10,
                                backgroundColor: selected ? c.tagBg : 'transparent',
                              }}>
                              {f.avatar_url ? (
                                <Image
                                  source={{ uri: f.avatar_url }}
                                  style={{ width: 40, height: 40, borderRadius: 20 }}
                                />
                              ) : (
                                <View
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: c.tagBg,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}>
                                  <Ionicons
                                    name="person-outline"
                                    size={20}
                                    color={c.subtext}
                                  />
                                </View>
                              )}
                              <Text style={{ flex: 1, fontWeight: '600', color: c.text }}>
                                @{f.username}
                              </Text>
                              {selectionMode ? (
                                <Ionicons
                                  name={selected ? 'checkbox' : 'square-outline'}
                                  size={22}
                                  color={selected ? '#007AFF' : c.subtext}
                                />
                              ) : (
                                <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                              )}
                            </Pressable>
                          );
                        })}
                      </>
                    )}
                  </>
                ) : /* Collections */
                  activeTab === 'collections' ? (
                    <>
                      <View
                        style={{
                          flexDirection: 'row',
                          marginBottom: 16,
                          borderRadius: 8,
                          backgroundColor: c.tagBg,
                          padding: 4,
                        }}>
                        {(['collections', 'journal'] as const).map((sub) => (
                          <Pressable
                            key={sub}
                            onPress={() => {
                              setListsSubTab(sub);
                              setSelectedCollection(null);
                            }}
                            style={{
                              flex: 1,
                              paddingVertical: 8,
                              borderRadius: 6,
                              alignItems: 'center',
                              backgroundColor: listsSubTab === sub ? c.surface : 'transparent',
                            }}>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: listsSubTab === sub ? c.text : c.subtext,
                              }}>
                              {sub === 'collections' ? 'Collections' : 'Trick Journal'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      {listsSubTab === 'collections' ? (
                        <>
                          {selectedCollection ? (
                            <>
                              <Pressable
                                onPress={() => {
                                  setSelectedCollection(null);
                                  setCollectionSpots([]);
                                }}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                  marginBottom: 16,
                                }}>
                                <Ionicons name="chevron-back" size={18} color="#007AFF" />
                                <Text style={{ color: '#007AFF', fontWeight: '600', fontSize: 14 }}>
                                  Collections
                                </Text>
                              </Pressable>
                              <Text
                                style={{
                                  fontWeight: '700',
                                  fontSize: 16,
                                  color: c.text,
                                  marginBottom: 16,
                                }}>
                                {selectedCollection.name}
                              </Text>
                              {collectionSpotsLoading ? (
                                <Text
                                  style={{
                                    color: c.subtext,
                                    textAlign: 'center',
                                    marginTop: 24,
                                  }}>
                                  Loading...
                                </Text>
                              ) : collectionSpots.length === 0 ? (
                                <Text
                                  style={{
                                    color: c.subtext,
                                    fontSize: 14,
                                    textAlign: 'center',
                                    marginTop: 24,
                                  }}>
                                  No spots in this collection yet.
                                </Text>
                              ) : (
                                collectionSpots.map((s) => (
                                  <Pressable
                                    key={s.id}
                                    onPress={() => {
                                      onSelectSpot(s);
                                      onClose();
                                    }}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      paddingVertical: 12,
                                      borderBottomWidth: 1,
                                      borderColor: c.border,
                                      gap: 10,
                                    }}>
                                    <Ionicons
                                      name="location-outline"
                                      size={16}
                                      color={c.subtext}
                                    />
                                    <Text style={{ flex: 1, fontWeight: '600', color: c.text }}>
                                      {s.name}
                                    </Text>
                                    <Ionicons
                                      name="chevron-forward"
                                      size={16}
                                      color={c.subtext}
                                    />
                                  </Pressable>
                                ))
                              )}
                            </>
                          ) : collectionsLoading ? (
                            <Text style={{ color: c.subtext, textAlign: 'center', marginTop: 24 }}>
                              Loading...
                            </Text>
                          ) : collections.length === 0 ? (
                            <Text
                              style={{
                                color: c.subtext,
                                fontSize: 14,
                                textAlign: 'center',
                                marginTop: 24,
                              }}>
                              No collections yet. Add spots to collections from the spot details page.
                            </Text>
                          ) : (
                            collections.map((col) => (
                              <Pressable
                                key={col.id}
                                onPress={async () => {
                                  setSelectedCollection(col);
                                  setCollectionSpotsLoading(true);
                                  const spots = await loadCollectionSpots(col.id);
                                  setCollectionSpots(spots);
                                  setCollectionSpotsLoading(false);
                                }}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  paddingVertical: 14,
                                  borderBottomWidth: 1,
                                  borderColor: c.border,
                                  gap: 12,
                                }}>
                                <View
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    backgroundColor: c.tagBg,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}>
                                  <Ionicons
                                    name={col.name === 'Wishlist' ? 'star' : 'folder'}
                                    size={20}
                                    color={c.subtext}
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text
                                    style={{ fontWeight: '600', fontSize: 14, color: c.text }}>
                                    {col.name}
                                  </Text>
                                  <Text style={{ fontSize: 12, color: c.subtext }}>
                                    {col.spot_count} {col.spot_count === 1 ? 'spot' : 'spots'}
                                  </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                              </Pressable>
                            ))
                          )}
                        </>
                      ) : (
                        <>
                          {trickLogsLoading ? (
                            <Text style={{ color: c.subtext, textAlign: 'center', marginTop: 24 }}>
                              Loading...
                            </Text>
                          ) : trickLogs.length === 0 ? (
                            <Text
                              style={{
                                color: c.subtext,
                                fontSize: 14,
                                textAlign: 'center',
                                marginTop: 24,
                              }}>
                              No tricks logged yet. Open a spot, tap Lists → Log a Trick.
                            </Text>
                          ) : (
                            (() => {
                              const grouped = trickLogs.reduce<
                                Record<string, { spotName: string; logs: TrickLog[] }>
                              >((acc, log) => {
                                const spotName = log.spot?.name ?? 'Unknown Spot';
                                if (!acc[log.spot_id]) acc[log.spot_id] = { spotName, logs: [] };
                                acc[log.spot_id].logs.push(log);
                                return acc;
                              }, {});
                              return Object.entries(grouped).map(([spotId, { spotName, logs }]) => (
                                <View key={spotId} style={{ marginBottom: 16 }}>
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 6,
                                      marginBottom: 6,
                                    }}>
                                    <Ionicons
                                      name="location-outline"
                                      size={13}
                                      color={c.subtext}
                                    />
                                    <Text
                                      style={{
                                        fontWeight: '700',
                                        color: c.text,
                                        fontSize: 13,
                                        flex: 1,
                                      }}>
                                      {spotName}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: c.subtext }}>
                                      {logs.length} trick{logs.length !== 1 ? 's' : ''}
                                    </Text>
                                  </View>
                                  {logs.map((log) => (
                                    <View
                                      key={log.id}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 8,
                                        borderBottomWidth: 1,
                                        borderColor: c.border,
                                        gap: 8,
                                      }}>
                                      <Ionicons
                                        name="checkmark-circle"
                                        size={14}
                                        color="#34C759"
                                      />
                                      <View style={{ flex: 1 }}>
                                        <Text
                                          style={{
                                            fontWeight: '600',
                                            color: c.text,
                                            fontSize: 13,
                                          }}>
                                          {log.trick_name}
                                        </Text>
                                        <Text
                                          style={{
                                            fontSize: 11,
                                            color: c.subtext,
                                            marginTop: 1,
                                          }}>
                                          {new Date(log.logged_at).toLocaleDateString(
                                            [],
                                            {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric',
                                            }
                                          )}
                                        </Text>
                                      </View>
                                      <Pressable
                                        onPress={() =>
                                          Alert.alert(
                                            'Delete entry?',
                                            'This cannot be undone.',
                                            [
                                              { text: 'Cancel', style: 'cancel' },
                                              {
                                                text: 'Delete',
                                                style: 'destructive',
                                                onPress: () =>
                                                  onDeleteTrickLog(log.id),
                                              },
                                            ]
                                          )
                                        }
                                        hitSlop={8}>
                                        <Ionicons
                                          name="trash-outline"
                                          size={15}
                                          color={c.subtext}
                                        />
                                      </Pressable>
                                    </View>
                                  ))}
                                </View>
                              ));
                            })()
                          )}
                        </>
                      )}
                    </>
                  ) : /* Passport */
                    activeTab === 'passport' ? (
                      <>
                        <SkateActivityGraph activityData={activityData} loading={streakLoading} />
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                          <View
                            style={{
                              flex: 1,
                              backgroundColor: c.tagBg,
                              borderRadius: 10,
                              padding: 12,
                              alignItems: 'center',
                            }}>
                            <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>
                              {passportEntries.length}
                            </Text>
                            <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>
                              Spots Visited
                            </Text>
                          </View>
                          <View
                            style={{
                              flex: 1,
                              backgroundColor: c.tagBg,
                              borderRadius: 10,
                              padding: 12,
                              alignItems: 'center',
                            }}>
                            <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>
                              {passportEntries.reduce((sum, e) => sum + e.visit_count, 0)}
                            </Text>
                            <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>
                              Total Check-ins
                            </Text>
                          </View>
                        </View>

                        {passportLoading ? (
                          <Text style={{ color: c.subtext, textAlign: 'center', marginTop: 24 }}>
                            Loading...
                          </Text>
                        ) : passportEntries.length === 0 ? (
                          <Text
                            style={{ color: c.subtext, fontSize: 14, textAlign: 'center', marginTop: 24 }}>
                            No check-ins yet. Hit a spot and check in!
                          </Text>
                        ) : (
                          passportEntries.map((entry) => {
                            const expanded = expandedPassportSpot === entry.spot_id;
                            return (
                              <Pressable
                                key={entry.spot_id}
                                onPress={() => setExpandedPassportSpot(expanded ? null : entry.spot_id)}
                                style={{
                                  borderBottomWidth: 1,
                                  borderColor: c.border,
                                  paddingVertical: 14,
                                }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                  <View
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: 10,
                                      backgroundColor: 'rgba(52,199,89,0.12)',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}>
                                    <Ionicons name="location-outline" size={18} color="#34C759" />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{ fontWeight: '700', color: c.text, fontSize: 14 }}>
                                      {entry.spot_name}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>
                                      {entry.visit_count}{' '}
                                      {entry.visit_count === 1 ? 'visit' : 'visits'} · Last{' '}
                                      {new Date(entry.last_visited_at).toLocaleDateString([], {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </Text>
                                  </View>
                                  <Ionicons
                                    name={expanded ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={c.subtext}
                                  />
                                </View>

                                {expanded ? (
                                  <View style={{ marginTop: 12, gap: 8 }}>
                                    {entry.visits.map((v) => (
                                      <View
                                        key={v.id}
                                        style={{
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          paddingLeft: 50,
                                          gap: 8,
                                        }}>
                                        <Ionicons
                                          name={
                                            v.is_private
                                              ? 'lock-closed-outline'
                                              : 'earth-outline'
                                          }
                                          size={13}
                                          color={c.subtext}
                                        />
                                        <Text
                                          style={{ fontSize: 13, color: c.subtext, flex: 1 }}>
                                          {new Date(v.checked_in_at).toLocaleDateString([], {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </Text>
                                        <Pressable
                                          onPress={() => togglePrivacy(v.id, !v.is_private)}>
                                          <Text style={{ fontSize: 12, color: '#007AFF' }}>
                                            {v.is_private ? 'Make public' : 'Make private'}
                                          </Text>
                                        </Pressable>
                                        <Pressable
                                          onPress={() =>
                                            Alert.alert('Delete check-in?', undefined, [
                                              { text: 'Cancel', style: 'cancel' },
                                              {
                                                text: 'Delete',
                                                style: 'destructive',
                                                onPress: () => deleteCheckIn(v.id),
                                              },
                                            ])
                                          }>
                                          <Ionicons
                                            name="trash-outline"
                                            size={14}
                                            color={c.danger}
                                          />
                                        </Pressable>
                                      </View>
                                    ))}
                                  </View>
                                ) : null}
                              </Pressable>
                            );
                          })
                        )}
                      </>
                    ) : null}

            {/* ── Sign out ── always visible regardless of tab ── */}
            <Pressable
              onPress={onSignOut}
              style={{
                marginTop: 24,
                padding: 13,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: c.danger,
                alignItems: 'center',
              }}>
              <Text style={{ color: c.danger, fontWeight: '600', fontSize: 15 }}>Sign Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ── Edit profile modal ── */}
      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setEditOpen(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : 'height'}>
          <View
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
            }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 20 }}>
              Edit Profile
            </Text>

            <Text style={{ fontSize: 13, color: c.subtext, marginBottom: 6 }}>Username</Text>
            <TextInput
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder={username ?? 'Username'}
              placeholderTextColor={c.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: c.inputBorder,
                borderRadius: 10,
                padding: 12,
                fontSize: 15,
                color: c.text,
                backgroundColor: c.surface,
                marginBottom: 14,
              }}
            />

            <Text style={{ fontSize: 13, color: c.subtext, marginBottom: 6 }}>
              First Name <Text style={{ opacity: 0.5 }}>(optional)</Text>
            </Text>
            <TextInput
              value={editFirstName}
              onChangeText={setEditFirstName}
              placeholder="First name"
              placeholderTextColor={c.placeholder}
              autoCapitalize="words"
              style={{
                borderWidth: 1,
                borderColor: c.inputBorder,
                borderRadius: 10,
                padding: 12,
                fontSize: 15,
                color: c.text,
                backgroundColor: c.surface,
                marginBottom: 14,
              }}
            />

            <Text style={{ fontSize: 13, color: c.subtext, marginBottom: 6 }}>
              Last Name <Text style={{ opacity: 0.5 }}>(optional)</Text>
            </Text>
            <TextInput
              value={editLastName}
              onChangeText={setEditLastName}
              placeholder="Last name"
              placeholderTextColor={c.placeholder}
              autoCapitalize="words"
              style={{
                borderWidth: 1,
                borderColor: c.inputBorder,
                borderRadius: 10,
                padding: 12,
                fontSize: 15,
                color: c.text,
                backgroundColor: c.surface,
                marginBottom: 20,
              }}
            />

            <Pressable
              onPress={async () => {
                const trimmedUsername = editUsername.trim();
                const trimmedFirst = editFirstName.trim();
                const trimmedLast = editLastName.trim();
                if (!trimmedUsername) return;
                const usernameCheck = moderateText(trimmedUsername);
                if (!usernameCheck.allowed) {
                  Alert.alert('Username not allowed', usernameCheck.reason);
                  return;
                }
                if (trimmedFirst) {
                  const fnCheck = moderateText(trimmedFirst);
                  if (!fnCheck.allowed) {
                    Alert.alert('First name not allowed', fnCheck.reason);
                    return;
                  }
                }
                if (trimmedLast) {
                  const lnCheck = moderateText(trimmedLast);
                  if (!lnCheck.allowed) {
                    Alert.alert('Last name not allowed', lnCheck.reason);
                    return;
                  }
                }
                setEditLoading(true);
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                  const { error } = await supabase
                    .from('profiles')
                    .update({
                      username: trimmedUsername,
                      first_name: trimmedFirst || null,
                      last_name: trimmedLast || null,
                    })
                    .eq('id', user.id);
                  if (error) {
                    setEditLoading(false);
                    Alert.alert(
                      'Could not save profile',
                      /disallowed content/i.test(error.message)
                        ? 'Your profile contains inappropriate content and cannot be saved.'
                        : error.message
                    );
                    return;
                  }
                  setUsername(trimmedUsername);
                  setFirstName(trimmedFirst || null);
                  setLastName(trimmedLast || null);
                }
                setEditLoading(false);
                setEditOpen(false);
              }}
              style={{
                backgroundColor: '#007AFF',
                borderRadius: 10,
                padding: 13,
                alignItems: 'center',
                marginBottom: 12,
              }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                {editLoading ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setEditOpen(false)}
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 10,
                padding: 13,
                alignItems: 'center',
              }}>
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={contactsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setContactsOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setContactsOpen(false)}>
          <Pressable
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: '75%',
            }}
            onPress={() => { }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>Invite Contacts</Text>
              <Pressable
                onPress={() => {
                  setContactsOpen(false);
                  setSelectedPhones([]);
                }}>
                <Ionicons name="close" size={22} color={c.subtext} />
              </Pressable>
            </View>

            {contacts.length === 0 ? (
              <Text style={{ color: c.subtext, textAlign: 'center', marginTop: 24 }}>
                No contacts found.
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {contacts.map((contact) => {
                  const phone = contact.phoneNumbers?.[0]?.number ?? '';
                  const selected = selectedPhones.includes(phone);
                  return (
                    <Pressable
                      key={contact.id}
                      onPress={() =>
                        setSelectedPhones((prev) =>
                          prev.includes(phone)
                            ? prev.filter((p) => p !== phone)
                            : [...prev, phone]
                        )
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderColor: c.border,
                        gap: 12,
                      }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: c.tagBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>
                          {(contact.name ?? '?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', color: c.text, fontSize: 14 }}>
                          {contact.name ?? 'Unknown'}
                        </Text>
                        <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>
                          {phone}
                        </Text>
                      </View>
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={selected ? '#007AFF' : c.subtext}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Pressable
              onPress={async () => {
                if (selectedPhones.length === 0) return;
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;
                await sendSMSInvite(selectedPhones, user.id);
                setContactsOpen(false);
                setSelectedPhones([]);
              }}
              disabled={selectedPhones.length === 0}
              style={{
                backgroundColor: '#007AFF',
                borderRadius: 10,
                padding: 13,
                alignItems: 'center',
                marginTop: 16,
                opacity: selectedPhones.length === 0 ? 0.4 : 1,
              }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                Send Invite
                {selectedPhones.length > 1
                  ? `s (${selectedPhones.length})`
                  : selectedPhones.length === 1
                    ? ' (1)'
                    : ''}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
