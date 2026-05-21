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
import { sendFriendAcceptedNotification } from '@/src/libs/sendPushNotification';
import { moderateText } from '@/src/libs/moderator/textModerator';

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
};

type Tab = 'spots' | 'reviews' | 'friends' | 'collections';

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
  }, [visible]);

  const myActualSpots = mySpots.filter((s) => s.spot_type === 'spot');

  const avgRatingGiven =
    myReviews.length === 0 ? null : myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
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
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 16,
              fontWeight: '700',
              color: c.text,
            }}>
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
            <Text
              style={{
                fontSize: 14,
                color: '#007AFF',
                fontWeight: '600',
              }}>
              Edit
            </Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  marginBottom: 12,
                }}
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
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: c.text,
                  marginBottom: 2,
                }}>
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
                Joined
                {new Date(joinDate).toLocaleDateString([], {
                  month: 'long',
                  year: 'numeric',
                })}
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

          {pendingReceived.length > 0 ? (
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 16,
                borderRadius: 12,
                backgroundColor: c.tagBg,
                padding: 12,
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: c.text,
                  marginBottom: 10,
                }}>
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
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                      }}
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
                  <Text
                    style={{
                      flex: 1,
                      fontWeight: '600',
                      color: c.text,
                    }}>
                    @{f.username}
                  </Text>
                  <Pressable
                    onPress={async () => {
                      await acceptFriendRequest(f.id);
                      loadPendingRequests();
                      loadFriends();
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (username && user) {
                        sendFriendAcceptedNotification(f.id, username, user.id);
                      }
                    }}
                    style={{
                      backgroundColor: '#007AFF',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}>
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: '600',
                        fontSize: 13,
                      }}>
                      Accept
                    </Text>
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
                    <Text
                      style={{
                        color: c.subtext,
                        fontWeight: '600',
                        fontSize: 13,
                      }}>
                      Decline
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

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
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: c.text,
                }}>
                {myActualSpots.length}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: c.subtext,
                  marginTop: 2,
                }}>
                Spots
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 16,
                borderRightWidth: 1,
                borderColor: c.border,
              }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: c.text,
                }}>
                {myReviews.length}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: c.subtext,
                  marginTop: 2,
                }}>
                Reviews
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 16,
              }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: c.text,
                }}>
                {avgRatingGiven ? avgRatingGiven.toFixed(1) : '—'}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: c.subtext,
                  marginTop: 2,
                }}>
                Avg Rating
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              marginBottom: 16,
              borderRadius: 8,
              backgroundColor: c.tagBg,
              padding: 4,
            }}>
            {(['spots', 'reviews', 'collections', 'friends'] as Tab[]).map((tab) => (
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
                    fontSize: 11,
                    fontWeight: '600',
                    color: activeTab === tab ? c.text : c.subtext,
                  }}>
                  {tab === 'spots'
                    ? 'Spots'
                    : tab === 'reviews'
                      ? 'Reviews'
                      : tab === 'friends'
                        ? `Friends (${friends.length})`
                        : 'Collections'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
            {activeTab === 'spots' ? (
              myActualSpots.length === 0 ? (
                <Text
                  style={{
                    color: c.subtext,
                    fontSize: 14,
                    textAlign: 'center',
                    marginTop: 24,
                  }}>
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
                      <Text
                        style={{
                          fontWeight: '600',
                          color: c.text,
                        }}>
                        {s.name}
                      </Text>
                      {s.tags?.length > 0 ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: c.subtext,
                            marginTop: 2,
                          }}>
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
            ) : activeTab === 'reviews' ? (
              myReviews.length === 0 ? (
                <Text
                  style={{
                    color: c.subtext,
                    fontSize: 14,
                    textAlign: 'center',
                    marginTop: 24,
                  }}>
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
                    style={{
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                    }}>
                    <Text
                      style={{
                        fontWeight: '700',
                        color: c.text,
                        marginBottom: 4,
                      }}>
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
                    <Text
                      style={{
                        fontSize: 11,
                        color: c.subtext,
                      }}>
                      {new Date(r.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </Pressable>
                ))
              )
            ) : activeTab === 'friends' ? (
              <>
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
                    <Text
                      style={{
                        color: c.subtext,
                        fontSize: 13,
                      }}>
                      Searching...
                    </Text>
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
                            source={{
                              uri: u.avatar_url,
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                            }}
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
                        <Text
                          style={{
                            flex: 1,
                            fontWeight: '600',
                            color: c.text,
                          }}>
                          @{u.username}
                        </Text>
                        {friends.some((f) => f.id === u.id) ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}>
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
                    style={{
                      color: c.subtext,
                      fontSize: 14,
                      textAlign: 'center',
                      marginTop: 24,
                    }}>
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
                          <Text
                            style={{
                              color: '#007AFF',
                              fontWeight: '600',
                              fontSize: 14,
                            }}>
                            Cancel
                          </Text>
                        </Pressable>
                        <Text
                          style={{
                            color: c.text,
                            fontWeight: '600',
                            fontSize: 14,
                          }}>
                          {selectedFriendIds.size} selected
                        </Text>
                        <Pressable
                          disabled={selectedFriendIds.size === 0 || bulkRemoving}
                          onPress={() => {
                            Alert.alert(
                              `Remove ${selectedFriendIds.size} friend${selectedFriendIds.size === 1 ? '' : 's'}?`,
                              undefined,
                              [
                                {
                                  text: 'Cancel',
                                  style: 'cancel',
                                },
                                {
                                  text: 'Remove',
                                  style: 'destructive',
                                  onPress: bulkRemoveSelected,
                                },
                              ]
                            );
                          }}>
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
                            if (!selectionMode) {
                              setSelectionMode(true);
                            }
                            toggleFriendSelected(f.id);
                          }}
                          onPress={() => {
                            if (selectionMode) {
                              toggleFriendSelected(f.id);
                            } else {
                              onViewProfile?.(f.id);
                            }
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
                              source={{
                                uri: f.avatar_url,
                              }}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                              }}
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
                          <Text
                            style={{
                              flex: 1,
                              fontWeight: '600',
                              color: c.text,
                            }}>
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
            ) : activeTab === 'collections' ? (
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
                      <Text style={{ color: c.subtext, textAlign: 'center', marginTop: 24 }}>
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
                          <Ionicons name="location-outline" size={16} color={c.subtext} />
                          <Text style={{ flex: 1, fontWeight: '600', color: c.text }}>
                            {s.name}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color={c.subtext} />
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
                    style={{ color: c.subtext, fontSize: 14, textAlign: 'center', marginTop: 24 }}>
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
                        <Text style={{ fontWeight: '600', fontSize: 14, color: c.text }}>
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
            ) : null}

            <Pressable
              onPress={onSignOut}
              style={{
                marginHorizontal: 16,
                marginTop: 24,
                padding: 13,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: c.danger,
                alignItems: 'center',
              }}>
              <Text
                style={{
                  color: c.danger,
                  fontWeight: '600',
                  fontSize: 15,
                }}>
                Sign Out
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

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
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                color: c.text,
                marginBottom: 20,
              }}>
              Edit Profile
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: c.subtext,
                marginBottom: 6,
              }}>
              Username
            </Text>
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

            <Text
              style={{
                fontSize: 13,
                color: c.subtext,
                marginBottom: 6,
              }}>
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

            <Text
              style={{
                fontSize: 13,
                color: c.subtext,
                marginBottom: 6,
              }}>
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
              <Text
                style={{
                  color: 'white',
                  fontWeight: '700',
                  fontSize: 15,
                }}>
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
              <Text
                style={{
                  color: c.text,
                  fontWeight: '600',
                  fontSize: 15,
                }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}
