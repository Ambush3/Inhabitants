import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, TextInput, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Place, Spot } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { useTheme } from '@/src/context/ThemeContext';
import { AnimatedSpotCard } from '@/src/components/AnimatedSpotCard';
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TopRatedItem } from '@/src/hooks/useTopRated';
import { AppNotification } from '@/src/hooks/useNotifications';
import { FeedItem } from '@/src/hooks/useSocialFeed';
import { SkateEvent } from '@/src/hooks/useEvents';
import { TrickLog } from '@/src/hooks/useTrickLog';

import { supabase } from '@/src/libs/supabase';

type PlaceFavorite = {
  place_id: string;
  place_name: string;
  place_type: string;
  lat: number;
  lng: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  topLoading: boolean;
  topRated: TopRatedItem[];
  onLoadSkateparks: () => void;
  onLoadTopRated: () => void;
  onSelectSpot: (spot: Spot) => void;
  onDeleteSpot: (id: Spot) => void;
  onSignOut: () => void;
  onSearch: (tag: string) => void;
  onClearSearch: () => void;
  difficultyFilter: Set<'beginner' | 'intermediate' | 'advanced'>;
  onToggleDifficultyFilter: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  hasSearchResults: boolean;
  searchResults: Spot[];
  favorites: Spot[];
  favLoading: boolean;
  onLoadSkateShops: () => void;
  parksLoading: boolean;
  shopsLoading: boolean;
  placeFavorites: PlaceFavorite[];
  placeFavLoading: boolean;
  onSelectPlace: (place: Place) => void;
  onOpenSettings: () => void;
  onOpenCrews?: () => void;
  mySpots: Spot[];
  mySpotsLoading: boolean;
  onCycleSpotVisibility: (spot: Spot) => void;
  onOpenProfile: () => void;
  pendingFriendRequestsCount: number;
  activityNotifications: AppNotification[];
  onSelectNotification: (notification: AppNotification) => void;
  onMarkAllNotificationsRead: () => void;
  feedItems: FeedItem[];
  feedLoading: boolean;
  onSelectFeedSpot: (spot: Spot) => void;
  events: SkateEvent[];
  myEvents: SkateEvent[];
  eventsLoading: boolean;
  onCreateEvent: () => void;
  onSelectEvent: (event: SkateEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onRefreshEvents: () => void;
  invitedEventIds: Set<string>;
  unreadInviteCount: number;
  onClearUnreadInvites: () => void;
  initialEventFilter?: 'all' | 'public' | 'friends' | 'invited';
  eventRsvpCounts: Record<string, { going: number; maybe: number }>;
  unreadRsvpCount: number;
  onClearUnreadRsvps: () => void;
  onQuickAddFromPhoto: () => void;
  session: Session | null;
};

type Tab = 'explore' | 'myspots' | 'favorites' | 'feed' | 'events';

export function ExplorePanel({
  visible,
  onClose,
  parksLoading,
  shopsLoading,
  topLoading,
  topRated,
  onLoadSkateparks,
  onLoadSkateShops,
  onLoadTopRated,
  onSelectSpot,
  onSignOut,
  onSearch,
  onClearSearch,
  difficultyFilter,
  onToggleDifficultyFilter,
  hasSearchResults,
  searchResults,
  favorites,
  favLoading,
  placeFavorites,
  placeFavLoading,
  onSelectPlace,
  onDeleteSpot,
  onOpenSettings,
  onOpenCrews,
  mySpots,
  mySpotsLoading,
  onCycleSpotVisibility,
  onOpenProfile,
  pendingFriendRequestsCount,
  activityNotifications,
  onSelectNotification,
  onMarkAllNotificationsRead,
  feedItems,
  feedLoading,
  onSelectFeedSpot,
  events,
  myEvents,
  eventsLoading,
  onCreateEvent,
  onSelectEvent,
  onDeleteEvent,
  onRefreshEvents,
  invitedEventIds,
  unreadInviteCount,
  onClearUnreadInvites,
  initialEventFilter,
  eventRsvpCounts,
  unreadRsvpCount,
  onClearUnreadRsvps,
  onQuickAddFromPhoto,
  session,
}: Props) {
  function notificationLabel(n: AppNotification): string {
    const actor = n.actor_username ? `@${n.actor_username}` : 'Someone';
    const spot = n.spot_name ?? 'your spot';
    const crew = n.crew_name ?? 'your crew';
    switch (n.type) {
      case 'review':
        return `${actor} rated "${spot}"`;
      case 'favorite':
        return `${actor} bookmarked "${spot}"`;
      case 'wishlist':
        return `${actor} wishlisted "${spot}"`;
      case 'condition':
        return `${actor} reported a condition at "${spot}"`;
      case 'flag':
        return `"${spot}" was flagged`;
      case 'image_removed':
        return `An image on "${spot}" was removed`;
      case 'crew_invite':
        return `${actor} invited you to "${crew}"`;
      case 'crew_join':
        return `${actor} joined "${crew}"`;
      case 'crew_spot_added':
        return `${actor} added "${spot}" to "${crew}"`;
      default:
        return `Activity on "${spot}"`;
    }
  }

  function timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  const insets = useSafeAreaInsets();
  const { theme, darkMode } = useTheme();
  const c = theme.colors;

  const MINE_FILTER_THRESHOLD = 6;
  const [mySpotsSearch, setMySpotsSearch] = useState('');
  const [mySpotsVisibility, setMySpotsVisibility] = useState<'all' | 'public' | 'friends' | 'private'>('all');

  const [activeTab, setActiveTab] = useState<Tab>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [parkFavoritesOpen, setParkFavoritesOpen] = useState(false);
  const [shopFavoritesOpen, setShopFavoritesOpen] = useState(false);

  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);

  const [topRatedSearched, setTopRatedSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const [eventFilter, setEventFilter] = useState<'all' | 'public' | 'friends' | 'invited'>(
    initialEventFilter ?? 'all'
  );

  const swipeableRefs = useRef<Map<string, SwipeableMethods>>(new Map());
  const openRowsRef = useRef<Set<string>>(new Set());

  function handleRowPress(id: string, fallback: () => void) {
    if (openRowsRef.current.has(id)) {
      swipeableRefs.current.get(id)?.close();
      return;
    }
    fallback();
  }

  function setSwipeableRef(id: string) {
    return (ref: SwipeableMethods | null) => {
      if (ref) swipeableRefs.current.set(id, ref);
      else swipeableRefs.current.delete(id);
    };
  }

  async function loadSearchHistory() {
    const raw = await AsyncStorage.getItem('spotSearchHistory');
    setSearchHistory(raw ? JSON.parse(raw) : []);
  }

  async function saveToHistory(query: string) {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    const updated = [trimmed, ...searchHistory.filter((h) => h !== trimmed)].slice(0, 5);
    setSearchHistory(updated);
    await AsyncStorage.setItem('spotSearchHistory', JSON.stringify(updated));
  }

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('avatar_url, username').eq('id', user.id).single();
      setMyAvatarUrl(data?.avatar_url ?? null);
      setMyUsername(data?.username ?? null);
    }
    if (visible) {
      loadProfile();
      loadSearchHistory();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) setTopRatedSearched(false);
  }, [visible]);

  useEffect(() => {
    if (activeTab === 'events' && visible) {
      onRefreshEvents();
      onClearUnreadInvites?.();
      onClearUnreadRsvps?.();
    }
  }, [activeTab, visible]);

  useEffect(() => {
    if (initialEventFilter) {
      setEventFilter(initialEventFilter);
      setActiveTab('events');
    }
  }, [initialEventFilter]);

  function handleSearch() {
    if (!searchQuery.trim()) return;
    onSearch(searchQuery.trim());
  }

  function handleClear() {
    setSearchQuery('');
    onClearSearch();
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'explore', label: 'Explore', icon: 'compass-outline' },
    { key: 'myspots', label: 'Mine', icon: 'pin-outline' },
    { key: 'favorites', label: 'Saved', icon: 'bookmark-outline' },
    { key: 'feed', label: 'Feed', icon: 'people-outline' },
    { key: 'events', label: 'Events', icon: 'calendar-outline' },
  ];

  const favParks = [...placeFavorites.filter((f) => f.place_type === 'skatepark')];
  const favParkSpots = favorites.filter((s) => s.spot_type === 'skatepark');

  const favShops = [...placeFavorites.filter((f) => f.place_type === 'skateshop')];
  const favShopSpots = favorites.filter((s) => s.spot_type === 'skateshop');

  const myActualSpots = mySpots.filter((s) => s.spot_type === 'spot');

  const displayMySpots = myActualSpots.filter((s) => {
    if (mySpotsVisibility === 'public' && (s.is_private || s.friends_only)) return false;
    if (mySpotsVisibility === 'friends' && !s.friends_only) return false;
    if (mySpotsVisibility === 'private' && !s.is_private) return false;
    if (mySpotsSearch.trim()) {
      const q = mySpotsSearch.trim().toLowerCase();
      const nameMatch = s.name?.toLowerCase().includes(q);
      const tagMatch = s.tags?.some((t) => t.toLowerCase().includes(q));
      if (!nameMatch && !tagMatch) return false;
    }
    return true;
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={onClose}>
        <Pressable
          style={{
            paddingTop: insets.top,
            width: 280,
            height: '100%',
            backgroundColor: c.panelBg,
            flexDirection: 'column',
          }}
          onPress={() => { }}>
          {/* Tab Bar */}
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 8,
              paddingTop: 12,
            }}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingBottom: 10,
                  borderBottomWidth: 2,
                  borderColor: activeTab === tab.key ? '#007AFF' : 'transparent',
                }}>
                <View style={{ position: 'relative' }}>
                  <Ionicons
                    name={tab.icon as any}
                    size={18}
                    color={activeTab === tab.key ? '#007AFF' : c.subtext}
                  />
                  {tab.key === 'events' && unreadInviteCount + unreadRsvpCount > 0 ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        minWidth: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: c.danger,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 3,
                      }}>
                      <Text style={{ color: 'white', fontSize: 8, fontWeight: '700' }}>
                        {unreadInviteCount + unreadRsvpCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    marginTop: 3,
                    color: activeTab === tab.key ? '#007AFF' : c.subtext,
                    fontWeight: activeTab === tab.key ? '600' : '400',
                  }}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}>
            {/* EXPLORE TAB */}
            {activeTab === 'explore' ? (
              <View>
                {pendingFriendRequestsCount > 0 ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: c.subtext,
                        marginBottom: 8,
                        letterSpacing: 0.8,
                      }}>
                      NOTIFICATIONS
                    </Text>
                    <Pressable
                      onPress={onOpenProfile}
                      style={{
                        backgroundColor: c.tagBg,
                        borderRadius: 8,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                      <Ionicons name="person-add-outline" size={20} color={c.text} />
                      <Text
                        style={{
                          flex: 1,
                          color: c.text,
                          fontWeight: '600',
                          fontSize: 13,
                        }}>
                        Pending Friend Requests
                      </Text>
                      <View
                        style={{
                          minWidth: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: c.danger,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 6,
                        }}>
                        <Text
                          style={{
                            color: 'white',
                            fontSize: 12,
                            fontWeight: '700',
                          }}>
                          {pendingFriendRequestsCount}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={c.subtext} />
                    </Pressable>
                  </View>
                ) : null}

                {activityNotifications.some((n) => !n.read) ? (
                  <View style={{ marginBottom: 16 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: c.subtext,
                          letterSpacing: 0.8,
                        }}>
                        ACTIVITY
                      </Text>
                      <Pressable onPress={onMarkAllNotificationsRead}>
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#007AFF',
                            fontWeight: '600',
                          }}>
                          Mark all read
                        </Text>
                      </Pressable>
                    </View>
                    {activityNotifications
                      .filter((n) => !n.read)
                      .slice(0, 20)
                      .map((n) => (
                        <Pressable
                          key={n.id}
                          onPress={() => onSelectNotification(n)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            paddingVertical: 10,
                            paddingHorizontal: 10,
                            borderRadius: 8,
                            backgroundColor: n.read ? 'transparent' : c.tagBg,
                            marginBottom: 4,
                          }}>
                          {!n.read ? (
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: '#007AFF',
                              }}
                            />
                          ) : (
                            <View
                              style={{
                                width: 8,
                              }}
                            />
                          )}
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                color: c.text,
                                fontWeight: n.read ? '400' : '600',
                              }}
                              numberOfLines={2}>
                              {notificationLabel(n)}
                            </Text>
                            <Text
                              style={{
                                fontSize: 11,
                                color: c.subtext,
                                marginTop: 2,
                              }}>
                              {timeAgo(n.created_at)}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                  </View>
                ) : null}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: c.subtext,
                    marginBottom: 8,
                    letterSpacing: 0.8,
                  }}>
                  SEARCH SPOTS
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    marginBottom: 16,
                  }}>
                  <View
                    style={{
                      flex: 1,
                      position: 'relative',
                      justifyContent: 'center',
                    }}>
                    <TextInput
                      value={searchQuery}
                      onChangeText={(text) => {
                        setSearchQuery(text);
                        if (text.trim().length > 0) {
                          onSearch(text.trim());
                        } else {
                          onClearSearch();
                        }
                      }}
                      placeholder="Search by name or tag..."
                      placeholderTextColor={c.placeholder}
                      autoCapitalize="none"
                      style={{
                        borderWidth: 1,
                        borderColor: c.inputBorder,
                        borderRadius: 8,
                        paddingVertical: 10,
                        paddingLeft: 10,
                        paddingRight: searchQuery ? 34 : 10,
                        color: c.text,
                        backgroundColor: c.surface,
                        fontSize: 13,
                      }}
                    />
                    {searchQuery.length > 0 ? (
                      <Pressable
                        onPress={() => {
                          setSearchQuery('');
                          onClearSearch();
                        }}
                        hitSlop={8}
                        style={{
                          position: 'absolute',
                          right: 8,
                          padding: 4,
                        }}>
                        <Ionicons name="close-circle" size={18} color={c.subtext} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                  {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
                    const isActive = difficultyFilter.has(level);
                    const labels = {
                      beginner: 'Beginner',
                      intermediate: 'Intermediate',
                      advanced: 'Advanced',
                    };
                    return (
                      <Pressable
                        key={level}
                        onPress={() => onToggleDifficultyFilter(level)}
                        style={{
                          flex: 1,
                          paddingVertical: 5,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: isActive ? '#FF3B30' : c.inputBorder,
                          backgroundColor: isActive ? '#FF3B30' : c.surface,
                          alignItems: 'center',
                        }}>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '600',
                            color: isActive ? 'white' : c.subtext,
                          }}>
                          {labels[level]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {searchQuery.trim().length > 0 && searchResults.length === 0 ? (
                  <Text
                    style={{
                      color: c.subtext,
                      fontSize: 13,
                      opacity: 0.6,
                      marginBottom: 16,
                    }}>
                    No spots found. Try a different name or tag.
                  </Text>
                ) : searchResults.length > 0 ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontWeight: '600',
                        marginBottom: 8,
                        color: c.text,
                      }}>
                      Results ({searchResults.length})
                    </Text>
                    {searchResults.map((s, index) => (
                      <AnimatedSpotCard key={s.id} index={index}>
                        <Pressable
                          key={s.id}
                          style={{
                            paddingVertical: 10,
                            borderBottomWidth: 1,
                            borderColor: c.border,
                          }}
                          onPress={() => {
                            saveToHistory(searchQuery);
                            onSelectSpot(s);
                          }}>
                          <Text
                            style={{
                              fontWeight: '600',
                              color: c.text,
                            }}>
                            {s.name}
                          </Text>
                          {s.tags.length > 0 ? (
                            <Text
                              style={{
                                opacity: 0.6,
                                fontSize: 12,
                                marginTop: 2,
                                color: c.text,
                              }}>
                              {s.tags.map((t) => `#${t}`).join(' ')}
                            </Text>
                          ) : null}
                        </Pressable>
                      </AnimatedSpotCard>
                    ))}
                  </View>
                ) : null}

                {searchQuery.length === 0 && searchHistory.length > 0 ? (
                  <View style={{ marginBottom: 16 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: c.subtext,
                          letterSpacing: 0.8,
                        }}>
                        RECENT SEARCHES
                      </Text>
                      <Pressable
                        onPress={async () => {
                          setSearchHistory([]);
                          await AsyncStorage.removeItem('spotSearchHistory');
                        }}>
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#007AFF',
                            fontWeight: '600',
                          }}>
                          Clear
                        </Text>
                      </Pressable>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}>
                      {searchHistory.map((h) => (
                        <Pressable
                          key={h}
                          onPress={() => {
                            setSearchQuery(h);
                            onSearch(h);
                          }}
                          style={{
                            backgroundColor: c.tagBg,
                            borderRadius: 20,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}>
                          <Ionicons name="time-outline" size={12} color={c.subtext} />
                          <Text
                            style={{
                              fontSize: 13,
                              color: c.text,
                            }}>
                            {h}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: c.subtext,
                    marginBottom: 8,
                    letterSpacing: 0.8,
                  }}>
                  NEARBY
                </Text>
                <Pressable
                  onPress={onLoadSkateparks}
                  disabled={parksLoading}
                  style={{
                    backgroundColor: c.tagBg,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 56,
                    opacity: parksLoading ? 0.6 : 1,
                    marginBottom: 10,
                  }}>
                  <View
                    style={{
                      width: 32,
                      alignItems: 'center',
                    }}>
                    <Image
                      source={require('@/assets/pin-images/skatepark-ramp.png')}
                      style={{ width: 25, height: 30 }}
                      tintColor={c.text}
                    />
                  </View>
                  <Text
                    style={{
                      color: c.text,
                      fontWeight: '600',
                    }}>
                    {parksLoading ? 'Searching...' : 'Local Skate Parks'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onLoadSkateShops}
                  disabled={shopsLoading}
                  style={{
                    backgroundColor: c.tagBg,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 56,
                    opacity: shopsLoading ? 0.6 : 1,
                    marginBottom: 10,
                  }}>
                  <View
                    style={{
                      width: 32,
                      alignItems: 'center',
                    }}>
                    <Image
                      source={require('@/assets/pin-images/skate-shop.png')}
                      style={{ width: 24, height: 24 }}
                      tintColor={c.text}
                    />
                  </View>
                  <Text
                    style={{
                      color: c.text,
                      fontWeight: '600',
                    }}>
                    {shopsLoading ? 'Searching...' : 'Local Skate Shops'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setTopRatedSearched(true);
                    onLoadTopRated();
                  }}
                  disabled={topLoading}
                  style={{
                    backgroundColor: c.tagBg,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: topLoading ? 0.6 : 1,
                    marginBottom: 10,
                  }}>
                  <View
                    style={{
                      width: 32,
                      alignItems: 'center',
                    }}>
                    <Image
                      source={require('@/assets/pin-images/top-rated.png')}
                      style={{ width: 26, height: 32 }}
                      tintColor={c.text}
                    />
                  </View>
                  <Text
                    style={{
                      color: c.text,
                      fontWeight: '600',
                    }}>
                    {topLoading ? 'Searching...' : 'Top Rated Nearby'}
                  </Text>
                </Pressable>

                {!topLoading && topRatedSearched && topRated.length === 0 ? (
                  <Text
                    style={{
                      color: c.subtext,
                      fontSize: 13,
                      opacity: 0.6,
                      marginTop: 8,
                    }}>
                    No top rated spots found nearby.
                  </Text>
                ) : null}

                {topRated.length > 0 ? (
                  <View style={{ marginBottom: 16 }}>
                    {topRated.filter((s) => s.spot_type === 'spot').length === 0 ? (
                      <Text
                        style={{
                          color: c.subtext,
                          fontSize: 13,
                          opacity: 0.6,
                        }}>
                        No top rated spots nearby.
                      </Text>
                    ) : (
                      topRated
                        .filter((s) => s.spot_type === 'spot')
                        .map((s, index) => (
                          <AnimatedSpotCard key={s.id} index={index}>
                            <Pressable
                              style={{
                                paddingVertical: 10,
                                borderBottomWidth: 1,
                                borderColor: c.border,
                              }}
                              onPress={() => {
                                if ('isPlace' in s && s.isPlace) {
                                  onSelectPlace({
                                    id: s.id,
                                    name: s.name,
                                    lat: s.lat,
                                    lng: s.lng,
                                    type: s.type as 'skatepark' | 'skateshop',
                                    tags: {},
                                  });
                                } else {
                                  onSelectSpot(s as Spot);
                                }
                              }}>
                              <Text
                                style={{
                                  fontWeight: '600',
                                  color: c.text,
                                }}>
                                {s.name}
                              </Text>
                              <Text
                                style={{
                                  opacity: 0.7,
                                  fontSize: 12,
                                  color: c.text,
                                }}>
                                {s.avg.toFixed(1)} ★ ({s.count})
                              </Text>
                            </Pressable>
                          </AnimatedSpotCard>
                        ))
                    )}
                  </View>
                ) : null}
              </View>
            ) : null}
            {activeTab === 'myspots' ? (
              <View>
                {onOpenCrews ? (
                  <Pressable
                    onPress={onOpenCrews}
                    style={{
                      backgroundColor: c.tagBg,
                      borderRadius: 8,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 16,
                    }}>
                    <Ionicons name="people" size={20} color={c.text} />
                    <Text style={{ flex: 1, color: c.text, fontWeight: '600', fontSize: 13 }}>
                      My Crews
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={c.subtext} />
                  </Pressable>
                ) : null}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                  }}>
                  <Text style={{ fontSize: 16 }}>📍</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: c.subtext,
                      letterSpacing: 0.8,
                    }}>
                    MY SPOTS ({myActualSpots.length})
                  </Text>
                </View>
                {myActualSpots.length > MINE_FILTER_THRESHOLD ? (
                  <View style={{ marginTop: 8, marginBottom: 8, gap: 8 }}>
                    <TextInput
                      value={mySpotsSearch}
                      onChangeText={setMySpotsSearch}
                      placeholder="Search spots or tags"
                      placeholderTextColor={c.subtext}
                      style={{
                        borderWidth: 1,
                        borderColor: c.inputBorder,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        fontSize: 13,
                        color: c.text,
                        backgroundColor: c.surface,
                      }}
                    />
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(['all', 'public', 'friends', 'private'] as const).map((v) => {
                        const isActive = mySpotsVisibility === v;
                        return (
                          <Pressable
                            key={v}
                            onPress={() => setMySpotsVisibility(v)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: isActive ? c.buttonBg : c.inputBorder,
                              backgroundColor: isActive ? c.buttonBg : c.surface,
                            }}>
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: isActive ? c.background : c.subtext,
                                textTransform: 'capitalize',
                              }}>
                              {v}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
                {mySpotsLoading ? (
                  <Text
                    style={{
                      color: c.subtext,
                      fontSize: 13,
                    }}>
                    Loading...
                  </Text>
                ) : myActualSpots.length === 0 ? (
                  <Text
                    style={{
                      color: c.subtext,
                      fontSize: 13,
                      opacity: 0.6,
                    }}>
                    You haven&apos;t created any spots yet.
                  </Text>
                ) : displayMySpots.length === 0 ? (
                  <Text
                    style={{
                      color: c.subtext,
                      fontSize: 13,
                      opacity: 0.6,
                    }}>
                    No spots match your filters.
                  </Text>
                ) : (
                  displayMySpots.map((s, index) => (
                    <AnimatedSpotCard key={s.id} index={index}>
                      <Swipeable
                        ref={setSwipeableRef(s.id) as any}
                        renderLeftActions={() => (
                          <Pressable
                            onPress={() => {
                              const ref = swipeableRefs.current.get(s.id);
                              ref?.close();
                              setTimeout(() => onDeleteSpot(s), 500);
                            }}
                            style={{
                              justifyContent: 'center',
                              alignItems: 'center',
                              width: 75,
                              backgroundColor: c.danger,
                              borderTopLeftRadius: 8,
                              borderBottomLeftRadius: 8,
                              marginVertical: 2,
                              gap: 4,
                            }}>
                            <Ionicons name="trash-outline" size={18} color="white" />
                            <Text
                              style={{
                                color: 'white',
                                fontSize: 11,
                                fontWeight: '700',
                                letterSpacing: 0.3,
                              }}>
                              Delete
                            </Text>
                          </Pressable>
                        )}
                        onSwipeableOpen={(direction) => {
                          openRowsRef.current.add(s.id);
                        }}
                        onSwipeableClose={() => {
                          openRowsRef.current.delete(s.id);
                        }}
                        renderRightActions={() => (
                          <Pressable
                            onPress={() => {
                              swipeableRefs.current.get(s.id)?.close();
                              onCycleSpotVisibility(s);
                            }}
                            style={{
                              justifyContent: 'center',
                              alignItems: 'center',
                              width: 75,
                              backgroundColor: '#5856D6',
                              borderTopRightRadius: 8,
                              borderBottomRightRadius: 8,
                              marginVertical: 2,
                              gap: 4,
                            }}>
                            <Ionicons name="eye-outline" size={18} color="white" />
                            <Text
                              style={{
                                color: 'white',
                                fontSize: 11,
                                fontWeight: '700',
                                letterSpacing: 0.3,
                              }}>
                              Visibility
                            </Text>
                          </Pressable>
                        )}>
                        <Pressable
                          onPress={() => handleRowPress(s.id, () => onSelectSpot(s))}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderColor: c.border,
                            gap: 10,
                            backgroundColor: c.panelBg,
                          }}>
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
                                  opacity: 0.6,
                                  fontSize: 12,
                                  marginTop: 2,
                                  color: c.text,
                                }}>
                                {s.tags.map((t) => `#${t}`).join(' ')}
                              </Text>
                            ) : null}
                          </View>
                          {s.is_private ? (
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                              <Ionicons name="lock-closed" size={14} color={c.danger} />
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: c.danger,
                                  fontWeight: '600',
                                }}>
                                Private
                              </Text>
                            </View>
                          ) : s.friends_only ? (
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                              <Ionicons name="people" size={14} color="#5856D6" />
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: '#5856D6',
                                  fontWeight: '600',
                                }}>
                                Friends
                              </Text>
                            </View>
                          ) : null}
                        </Pressable>
                      </Swipeable>
                    </AnimatedSpotCard>
                  ))
                )}

                <View
                  style={{
                    height: 1,
                    backgroundColor: c.border,
                    marginTop: 16,
                    marginBottom: 16,
                  }}
                />

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: c.subtext,
                    marginBottom: 8,
                    letterSpacing: 0.8,
                  }}>
                  ADD A SPOT
                </Text>

                <Pressable
                  onPress={() => {
                    onClose();
                    onQuickAddFromPhoto();
                  }}
                  style={{
                    backgroundColor: c.tagBg,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 56,
                  }}>
                  <View style={{ width: 32, alignItems: 'center' }}>
                    <Ionicons name="camera-outline" size={24} color={c.text} />
                  </View>
                  <Text style={{ color: c.text, fontWeight: '600' }}>Quick Add from Photo</Text>
                </Pressable>
              </View>
            ) : null}

            {/* FAVORITES TAB */}
            {activeTab === 'favorites' ? (
              <View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: c.subtext,
                    marginBottom: 12,
                    letterSpacing: 0.8,
                  }}>
                  FAVORITES
                </Text>

                <Pressable
                  onPress={() => setFavoritesOpen((prev) => !prev)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    marginBottom: 4,
                  }}>
                  <Text
                    style={{
                      fontWeight: '700',
                      color: c.text,
                    }}>
                    {favLoading
                      ? 'Loading...'
                      : `Spots (${favorites.filter((s) => s.spot_type === 'spot').length})`}
                  </Text>
                  <Ionicons
                    name={favoritesOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={c.subtext}
                  />
                </Pressable>
                {favoritesOpen ? (
                  favorites.filter((s) => s != null && s.spot_type === 'spot').length > 0 ? (
                    favorites
                      .filter((s) => s != null && s.spot_type === 'spot')
                      .map((s, index) => (
                        <AnimatedSpotCard key={s.id} index={index}>
                          <Pressable
                            style={{
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderColor: c.border,
                              paddingLeft: 12,
                            }}
                            onPress={() => {
                              setFavoritesOpen(false);
                              onSelectSpot(s);
                            }}>
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
                                  opacity: 0.6,
                                  fontSize: 12,
                                  marginTop: 2,
                                  color: c.text,
                                }}>
                                {s.tags.map((t) => `#${t}`).join(' ')}
                              </Text>
                            ) : null}
                          </Pressable>
                        </AnimatedSpotCard>
                      ))
                  ) : (
                    <Text
                      style={{
                        opacity: 0.5,
                        fontSize: 13,
                        padding: 12,
                        color: c.text,
                      }}>
                      No favorites yet
                    </Text>
                  )
                ) : null}

                <Pressable
                  onPress={() => setParkFavoritesOpen((prev) => !prev)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    marginBottom: 4,
                    marginTop: 8,
                  }}>
                  <Text
                    style={{
                      fontWeight: '700',
                      color: c.text,
                    }}>
                    {placeFavLoading
                      ? 'Loading...'
                      : `Parks (${favParks.length + favParkSpots.length})`}
                  </Text>
                  <Ionicons
                    name={parkFavoritesOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={c.subtext}
                  />
                </Pressable>
                {parkFavoritesOpen ? (
                  favParks.length + favParkSpots.length > 0 ? (
                    <>
                      {favParkSpots.map((s, index) => (
                        <AnimatedSpotCard key={s.id} index={index}>
                          <Pressable
                            style={{
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderColor: c.border,
                              paddingLeft: 12,
                            }}
                            onPress={() => {
                              setParkFavoritesOpen(false);
                              onSelectSpot(s);
                            }}>
                            <Text
                              style={{
                                fontWeight: '600',
                                color: c.text,
                              }}>
                              {s.name}
                            </Text>
                          </Pressable>
                        </AnimatedSpotCard>
                      ))}
                      {favParks.map((f, index) => (
                        <AnimatedSpotCard key={f.place_id} index={index}>
                          <Pressable
                            style={{
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderColor: c.border,
                              paddingLeft: 12,
                            }}
                            onPress={() => {
                              setParkFavoritesOpen(false);
                              onSelectPlace({
                                id: f.place_id,
                                name: f.place_name,
                                type: f.place_type as 'skatepark' | 'skateshop',
                                lat: f.lat,
                                lng: f.lng,
                                tags: {},
                              });
                            }}>
                            <Text
                              style={{
                                fontWeight: '600',
                                color: c.text,
                              }}>
                              {f.place_name}
                            </Text>
                          </Pressable>
                        </AnimatedSpotCard>
                      ))}
                    </>
                  ) : (
                    <Text
                      style={{
                        opacity: 0.5,
                        fontSize: 13,
                        padding: 12,
                        color: c.text,
                      }}>
                      No favorites yet
                    </Text>
                  )
                ) : null}

                <Pressable
                  onPress={() => setShopFavoritesOpen((prev) => !prev)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    marginBottom: 4,
                    marginTop: 8,
                  }}>
                  <Text
                    style={{
                      fontWeight: '700',
                      color: c.text,
                    }}>
                    {placeFavLoading
                      ? 'Loading...'
                      : `Shops (${favShops.length + favShopSpots.length})`}
                  </Text>
                  <Ionicons
                    name={shopFavoritesOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={c.subtext}
                  />
                </Pressable>
                {shopFavoritesOpen ? (
                  favShops.length + favShopSpots.length > 0 ? (
                    <>
                      {favShopSpots.map((s, index) => (
                        <AnimatedSpotCard key={s.id} index={index}>
                          <Pressable
                            style={{
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderColor: c.border,
                              paddingLeft: 12,
                            }}
                            onPress={() => {
                              setShopFavoritesOpen(false);
                              onSelectSpot(s);
                            }}>
                            <Text
                              style={{
                                fontWeight: '600',
                                color: c.text,
                              }}>
                              {s.name}
                            </Text>
                          </Pressable>
                        </AnimatedSpotCard>
                      ))}
                      {favShops.map((f, index) => (
                        <AnimatedSpotCard key={f.place_id} index={index}>
                          <Pressable
                            style={{
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderColor: c.border,
                              paddingLeft: 12,
                            }}
                            onPress={() => {
                              setShopFavoritesOpen(false);
                              onSelectPlace({
                                id: f.place_id,
                                name: f.place_name,
                                type: f.place_type as 'skatepark' | 'skateshop',
                                lat: f.lat,
                                lng: f.lng,
                                tags: {},
                              });
                            }}>
                            <Text
                              style={{
                                fontWeight: '600',
                                color: c.text,
                              }}>
                              {f.place_name}
                            </Text>
                          </Pressable>
                        </AnimatedSpotCard>
                      ))}
                    </>
                  ) : (
                    <Text
                      style={{
                        opacity: 0.5,
                        fontSize: 13,
                        padding: 12,
                        color: c.text,
                      }}>
                      No favorites yet
                    </Text>
                  )
                ) : null}
              </View>
            ) : null}
            {activeTab === 'feed' ? (
              <View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: c.subtext,
                    marginBottom: 12,
                    letterSpacing: 0.8,
                  }}>
                  FRIEND ACTIVITY
                </Text>
                {feedLoading ? (
                  <Text
                    style={{
                      color: c.subtext,
                      fontSize: 13,
                    }}>
                    Loading...
                  </Text>
                ) : feedItems.length === 0 ? (
                  <Text
                    style={{
                      color: c.subtext,
                      fontSize: 13,
                      opacity: 0.6,
                    }}>
                    No friend activity yet. Add friends to see what they create and review.
                  </Text>
                ) : (
                  feedItems.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => onSelectFeedSpot(item.spot)}
                      style={{
                        flexDirection: 'row',
                        gap: 10,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderColor: c.border,
                      }}>
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
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: c.text }}>
                          <Text style={{ fontWeight: '700' }}>
                            @{item.actor.username ?? 'someone'}
                          </Text>
                          {item.kind === 'spot_created'
                            ? 'created'
                            : item.kind === 'check_in'
                              ? 'checked in at'
                              : item.kind === 'crew_spot_added'
                                ? 'added'
                                : 'rated'}{' '}
                          <Text style={{ fontWeight: '600' }}>{`"${item.spot.name}"`}</Text>
                          {item.kind === 'crew_spot_added' ? (
                            <Text>
                              {' '}
                              to{' '}
                              <Text style={{ fontWeight: '600' }}>{item.crew_name}</Text>
                            </Text>
                          ) : null}
                        </Text>
                        {item.kind === 'review_left' ? (
                          <Text
                            style={{
                              fontSize: 13,
                              color: '#F5A623',
                              letterSpacing: 1,
                              marginTop: 2,
                            }}>
                            {'★'.repeat(item.rating)}
                            {'☆'.repeat(5 - item.rating)}
                          </Text>
                        ) : null}
                        {item.kind === 'review_left' && item.comment ? (
                          <Text
                            style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}
                            numberOfLines={2}>
                            {item.comment}
                          </Text>
                        ) : null}
                        {item.kind === 'check_in' ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 3,
                            }}>
                            <Ionicons name="location-outline" size={11} color="#34C759" />
                            <Text
                              style={{
                                fontSize: 11,
                                color: '#34C759',
                                fontWeight: '600',
                              }}>
                              Checked in
                            </Text>
                          </View>
                        ) : null}
                        <Text
                          style={{
                            fontSize: 11,
                            color: c.subtext,
                            marginTop: 4,
                          }}>
                          {timeAgo(item.created_at)}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}
            {activeTab === 'events' ? (
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: c.subtext,
                      letterSpacing: 0.8,
                    }}>
                    UPCOMING EVENTS
                  </Text>
                  <Pressable
                    onPress={onCreateEvent}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#007AFF',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}>
                    <Ionicons name="add" size={14} color="white" />
                    <Text style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>
                      New Event
                    </Text>
                  </Pressable>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    gap: 6,
                    marginBottom: 12,
                  }}>
                  {(['all', 'public', 'friends', 'invited'] as const).map((filter) => {
                    const labels = {
                      all: 'All',
                      public: 'Public',
                      friends: 'Friends',
                      invited: 'Invited',
                    };
                    const isActive = eventFilter === filter;
                    return (
                      <Pressable
                        key={filter}
                        onPress={() => setEventFilter(filter)}
                        style={{
                          flex: 1,
                          paddingVertical: 5,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: isActive ? '#007AFF' : c.inputBorder,
                          backgroundColor: isActive ? '#007AFF' : c.surface,
                          alignItems: 'center',
                        }}>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '600',
                            color: isActive ? 'white' : c.subtext,
                          }}>
                          {labels[filter]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {eventsLoading ? (
                  <Text style={{ color: c.subtext, fontSize: 13 }}>Loading...</Text>
                ) : (
                  (() => {
                    const filtered = events.filter((event) => {
                      const isOwn = myEvents.some((e) => e.id === event.id);
                      if (eventFilter === 'public') return event.visibility === 'public';
                      if (eventFilter === 'friends') return event.visibility === 'friends';
                      if (eventFilter === 'invited')
                        return (
                          invitedEventIds.has(event.id) ||
                          (isOwn && event.visibility === 'invite')
                        );
                      return true;
                    });
                    if (filtered.length === 0)
                      return (
                        <Text style={{ color: c.subtext, fontSize: 13, opacity: 0.6 }}>
                          No events found.
                        </Text>
                      );
                    return filtered.map((event) => {
                      const isOwn = myEvents.some((e) => e.id === event.id);
                      const eventDate = new Date(event.event_date);
                      return (
                        <Pressable
                          key={event.id}
                          onPress={() => onSelectEvent(event)}
                          onLongPress={() => {
                            if (!isOwn) return;
                            Alert.alert('Delete Event', `Delete "${event.title}"?`, [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => onDeleteEvent(event.id),
                              },
                            ]);
                          }}
                          style={{
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderColor: c.border,
                            gap: 4,
                          }}>
                          <View
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={{
                                flex: 1,
                                fontWeight: '700',
                                fontSize: 14,
                                color: c.text,
                              }}>
                              {event.title}
                            </Text>
                            {isOwn ? (
                              <View
                                style={{
                                  backgroundColor: 'rgba(0,122,255,0.12)',
                                  borderRadius: 6,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                }}>
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: '#007AFF',
                                    fontWeight: '700',
                                  }}>
                                  MINE
                                </Text>
                              </View>
                            ) : null}
                            {invitedEventIds.has(event.id) && !isOwn ? (
                              <View
                                style={{
                                  backgroundColor: 'rgba(88,86,214,0.12)',
                                  borderRadius: 6,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                }}>
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: '#5856D6',
                                    fontWeight: '700',
                                  }}>
                                  INVITED
                                </Text>
                              </View>
                            ) : null}
                            {event.visibility === 'friends' ? (
                              <View
                                style={{
                                  backgroundColor: 'rgba(52,199,89,0.12)',
                                  borderRadius: 6,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                }}>
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: '#34C759',
                                    fontWeight: '700',
                                  }}>
                                  FRIENDS
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <View
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="calendar-outline" size={11} color={c.subtext} />
                            <Text style={{ fontSize: 12, color: c.subtext }}>
                              {eventDate.toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                              {' · '}
                              {eventDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                          <View
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="location-outline" size={11} color={c.subtext} />
                            <Text
                              style={{ fontSize: 12, color: c.subtext }}
                              numberOfLines={1}>
                              {event.location_name}
                            </Text>
                          </View>
                          {(eventRsvpCounts[event.id]?.going ?? 0) > 0 ||
                            (eventRsvpCounts[event.id]?.maybe ?? 0) > 0 ? (
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                marginTop: 2,
                              }}>
                              {(eventRsvpCounts[event.id]?.going ?? 0) > 0 ? (
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: '#34C759',
                                    fontWeight: '600',
                                  }}>
                                  {eventRsvpCounts[event.id].going} going
                                </Text>
                              ) : null}
                              {(eventRsvpCounts[event.id]?.maybe ?? 0) > 0 ? (
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: '#FF9500',
                                    fontWeight: '600',
                                  }}>
                                  {eventRsvpCounts[event.id].maybe} maybe
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
                          {event.creator?.username ? (
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                              <Ionicons
                                name="person-outline"
                                size={11}
                                color={c.subtext}
                              />
                              <Text style={{ fontSize: 12, color: c.subtext }}>
                                @{event.creator.username}
                              </Text>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    });
                  })()
                )}
              </View>
            ) : null}
          </ScrollView>

          {/* Footer */}

          <View
            style={{
              borderTopWidth: 1,
              borderColor: c.border,
              padding: 16,
            }}>
            <Pressable
              onPress={() => {
                if (session) {
                  onOpenProfile();
                } else {
                  onClose();
                  router.push('/auth');
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}>
              {session && myAvatarUrl ? (
                <Image
                  source={{ uri: myAvatarUrl }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: c.tagBg,
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
              <View style={{ marginLeft: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>
                  {session ? (myUsername ? `@${myUsername}` : '') : 'Guest'}
                </Text>
                <Text style={{ fontSize: 12, color: '#007AFF', marginTop: 2 }}>
                  {session ? 'View Profile' : 'Sign in to create an account'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                if (session) {
                  onSignOut();
                } else {
                  onClose();
                  router.push('/auth');
                }
              }}
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: c.tagBg,
                alignItems: 'center',
              }}>
              <Text style={{ color: session ? c.danger : '#007AFF', fontWeight: '600' }}>
                {session ? 'Sign out' : 'Sign In'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
