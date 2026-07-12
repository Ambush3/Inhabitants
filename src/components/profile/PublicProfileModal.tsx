import React, { useEffect, useState } from 'react';
import { showAlert, AlertHost } from '@/src/components/ui/ThemedAlert';
import { View, Text, Modal, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/libs/supabase';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast, ToastHost } from '@/src/context/ToastContext';
import { Spot } from '@/src/types';
import { useFriendships, FriendshipStatus } from '@/src/hooks/social/useFriendships';
import { sendFriendRequestNotification } from '@/src/libs/sendPushNotification';
import { useCheckInMedia } from '@/src/hooks/useCheckInMedia';
import { SessionMediaStrip } from '@/src/components/SessionMediaStrip';
import { SessionMediaViewerModal, ViewerMedia } from '@/src/components/SessionMediaViewerModal';

type PublicReview = {
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
  userId: string | null;
  onSelectSpot: (spot: Spot) => void;
  allSpots: Spot[];
  onFriendshipChange?: () => void;
};

export function PublicProfileModal({
  visible,
  onClose,
  userId,
  onSelectSpot,
  allSpots,
  onFriendshipChange,
}: Props) {
  const { theme } = useTheme();
  const toast = useToast();
  const c = theme.colors;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [joinDate, setJoinDate] = useState<string | null>(null);
  const [publicSpots, setPublicSpots] = useState<Spot[]>([]);
  const [publicReviews, setPublicReviews] = useState<PublicReview[]>([]);
  const [activeTab, setActiveTab] = useState<'spots' | 'reviews'>('spots');
  const [loading, setLoading] = useState(false);

  const { getFriendshipStatus, sendFriendRequest, acceptFriendRequest, removeFriend } = useFriendships();
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const [badge, setBadge] = useState<'local' | 'regular' | 'ambassador' | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [viewerMedia, setViewerMedia] = useState<ViewerMedia | null>(null);
  const sessionMedia = useCheckInMedia();

  function startCooldown() {
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
  }

  function getFriendButtonLabel(): string {
    if (friendshipStatus === 'accepted') return 'Friends';
    if (friendshipStatus === 'pending_sent') return 'Request Sent';
    if (friendshipStatus === 'pending_received') return 'Accept Request';
    return 'Add Friend';
  }

  useEffect(() => {
    if (!visible || !userId) return;
    async function load() {
      setLoading(true);
      const [profileRes, spotsRes, reviewsRes, status] = await Promise.all([
        supabase
          .from('profiles')
          .select('avatar_url, username, created_at, first_name, last_name, badge')
          .eq('id', userId)
          .single(),
        supabase
          .from('spots')
          .select('*')
          .eq('user_id', userId!)
          .eq('is_private', false)
          .eq('spot_type', 'spot')
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('id, spot_id, rating, comment, created_at, spots(name)')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false }),
        getFriendshipStatus(userId!),
      ]);
      setAvatarUrl(profileRes.data?.avatar_url ?? null);
      setUsername(profileRes.data?.username ?? null);
      setFirstName(profileRes.data?.first_name ?? null);
      setLastName(profileRes.data?.last_name ?? null);
      setBadge(profileRes.data?.badge ?? null);
      setJoinDate(profileRes.data?.created_at ?? null);
      setPublicSpots((spotsRes.data as Spot[]) ?? []);
      setPublicReviews(
        (reviewsRes.data ?? []).map((r: any) => ({
          id: r.id,
          spot_id: r.spot_id,
          spot_name: r.spots?.name ?? 'Unknown spot',
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
        }))
      );
      setFriendshipStatus(status);
      setLoading(false);
    }
    load();
    sessionMedia.loadMediaForUser(userId!);
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, [visible, userId]);

  useEffect(() => {
    if (!visible) setBadge(null);
  }, [visible]);

  const avgRating =
    publicReviews.length === 0 ? null : publicReviews.reduce((sum, r) => sum + r.rating, 0) / publicReviews.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible ? <AlertHost /> : null}
      {visible ? <ToastHost /> : null}
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
          <View style={{ width: 32 }} />
        </View>

        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: c.subtext }}>Loading...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 28,
              }}>
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
                  Joined{' '}
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
                      badge === 'ambassador'
                        ? '#FF9500'
                        : badge === 'regular'
                          ? c.accent
                          : '#34C759'
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
                            ? c.accent
                            : '#34C759',
                    }}>
                    {badge.toUpperCase()}
                  </Text>
                </View>
              ) : null}

              <Pressable
                disabled={friendshipLoading || cooldown}
                onPress={async () => {
                  if (friendshipLoading || cooldown) return;
                  if (friendshipStatus === 'pending_sent') {
                    showAlert('Cancel friend request?', undefined, [
                      {
                        text: 'Keep',
                        style: 'cancel',
                      },
                      {
                        text: 'Cancel Request',
                        style: 'destructive',
                        onPress: async () => {
                          setFriendshipLoading(true);
                          await removeFriend(userId!);
                          setFriendshipStatus('none');
                          setFriendshipLoading(false);
                          startCooldown();
                          onFriendshipChange?.();
                        },
                      },
                    ]);
                    return;
                  }
                  if (friendshipStatus === 'accepted') {
                    showAlert(
                      'Remove friend?',
                      username ? `Remove @${username} as a friend?` : undefined,
                      [
                        {
                          text: 'Keep',
                          style: 'cancel',
                        },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: async () => {
                            setFriendshipLoading(true);
                            await removeFriend(userId!);
                            setFriendshipStatus('none');
                            setFriendshipLoading(false);
                            startCooldown();
                            onFriendshipChange?.();
                          },
                        },
                      ]
                    );
                    return;
                  }
                  if (friendshipStatus === 'none') {
                    showAlert(
                      'Add friend?',
                      username ? `Send @${username} a friend request?` : undefined,
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                        {
                          text: 'Add Friend',
                          onPress: async () => {
                            setFriendshipLoading(true);
                            await sendFriendRequest(userId!);
                            setFriendshipStatus('pending_sent');
                            const {
                              data: { user },
                            } = await supabase.auth.getUser();
                            if (user) {
                              const { data: profile } = await supabase
                                .from('profiles')
                                .select('username')
                                .eq('id', user.id)
                                .single();
                              await sendFriendRequestNotification(
                                userId!,
                                profile?.username ?? 'Someone'
                              );
                            }
                            setFriendshipLoading(false);
                            startCooldown();
                            onFriendshipChange?.();
                          },
                        },
                      ]
                    );
                    return;
                  }
                  setFriendshipLoading(true);
                  if (friendshipStatus === 'pending_received') {
                    await acceptFriendRequest(userId!);
                    setFriendshipStatus('accepted');
                  }
                  setFriendshipLoading(false);
                  startCooldown();
                  onFriendshipChange?.();
                }}
                style={{
                  marginTop: 14,
                  paddingHorizontal: 24,
                  paddingVertical: 8,
                  borderRadius: 20,
                  alignSelf: 'center',
                  backgroundColor:
                    friendshipStatus === 'accepted'
                      ? c.tagBg
                      : friendshipStatus === 'pending_sent'
                        ? c.tagBg
                        : c.accent,
                  borderWidth: friendshipStatus === 'accepted' ? 1 : 0,
                  borderColor: c.border,
                }}>
                <Text
                  style={{
                    fontWeight: '600',
                    fontSize: 14,
                    color:
                      friendshipStatus === 'accepted' || friendshipStatus === 'pending_sent'
                        ? c.text
                        : 'white',
                  }}>
                  {friendshipLoading ? '...' : getFriendButtonLabel()}
                </Text>
              </Pressable>
            </View>

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
                  {publicSpots.length}
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
                  {publicReviews.length}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: c.subtext,
                    marginTop: 2,
                  }}>
                  Ratings
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
                  {avgRating ? avgRating.toFixed(1) : '—'}
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

            {sessionMedia.media.length > 0 ? (
              <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
                <SessionMediaStrip
                  media={sessionMedia.media}
                  title="Sessions"
                  onPressMedia={(m) =>
                    setViewerMedia({ id: m.id, url: m.url, media_type: m.media_type })
                  }
                />
              </View>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                marginHorizontal: 16,
                marginBottom: 16,
                borderRadius: 8,
                backgroundColor: c.tagBg,
                padding: 4,
              }}>
              {(['spots', 'reviews'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 6,
                    alignItems: 'center',
                    backgroundColor: activeTab === tab ? c.surface : 'transparent',
                  }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: activeTab === tab ? c.text : c.subtext,
                    }}>
                    {tab === 'spots' ? 'Spots' : 'Ratings'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
              {activeTab === 'spots' ? (
                publicSpots.length === 0 ? (
                  <Text
                    style={{
                      color: c.subtext,
                      fontSize: 14,
                      textAlign: 'center',
                      marginTop: 24,
                    }}>
                    No public spots yet.
                  </Text>
                ) : (
                  publicSpots.map((s) => (
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
                      <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                    </Pressable>
                  ))
                )
              ) : publicReviews.length === 0 ? (
                <Text
                  style={{
                    color: c.subtext,
                    fontSize: 14,
                    textAlign: 'center',
                    marginTop: 24,
                  }}>
                  No ratings yet.
                </Text>
              ) : (
                publicReviews.map((r) => (
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
              )}
            </View>
          </ScrollView>
        )}

        <SessionMediaViewerModal
          visible={viewerMedia !== null}
          onClose={() => setViewerMedia(null)}
          mediaList={sessionMedia.media.map((m) => ({
            id: m.id,
            url: m.url,
            media_type: m.media_type,
            thumbnail_url: m.thumbnail_url,
          }))}
          initialIndex={Math.max(
            0,
            sessionMedia.media.findIndex((m) => m.id === viewerMedia?.id)
          )}
          currentUserId={myId}
        />
      </SafeAreaView>
    </Modal>
  );
}
