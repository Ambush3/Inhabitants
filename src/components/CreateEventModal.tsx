import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '@/src/constants/darkMapStyle';
import { useMapProvider } from '@/src/context/MapProviderContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast } from '@/src/context/ToastContext';
import { EventVisibility, SkateEvent } from '@/src/hooks/useEvents';
import { useCrews } from '@/src/hooks/useCrews';
import { Spot } from '@/src/types';
import { supabase } from '@/src/libs/supabase';

type Friend = {
  id: string;
  username: string;
  avatar_url: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    locationName: string,
    lat: number,
    lng: number,
    eventDate: Date,
    visibility: EventVisibility,
    spotId?: string | null,
    inviteUserIds?: string[]
  ) => Promise<string | null>;
  pendingCoord?: { lat: number; lng: number } | null;
  spots: Spot[];
  editEvent?: SkateEvent | null;
};

export function CreateEventModal({ visible, onClose, onSubmit, pendingCoord, spots, editEvent }: Props) {
  const { theme, darkMode } = useTheme();
  const { mapProvider } = useMapProvider();
  const toast = useToast();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<EventVisibility>('public');
  const [saving, setSaving] = useState(false);

  const [eventDate, setEventDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<Friend[]>([]);

  const { myCrews, loadMyCrews } = useCrews();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedCrews, setSelectedCrews] = useState<Set<string>>(new Set());
  const crewMembersRef = useRef<Record<string, string[]>>({});

  const [spotPickerOpen, setSpotPickerOpen] = useState(false);
  const [spotSearch, setSpotSearch] = useState('');

  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPickerCoord, setMapPickerCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [mapPickerRegion, setMapPickerRegion] = useState<any>(null);
  const [geocoding, setGeocoding] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const inviteInputRef = useRef<any>(null);

  const filteredSpots = spots
    .filter((s) => s.spot_type === 'spot')
    .filter((s) => s.name.toLowerCase().includes(spotSearch.toLowerCase()));

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setLocationName('');
      setLat(null);
      setLng(null);
      setSelectedSpotId(null);
      setVisibility('public');
      setInvitedIds(new Set());
      setUserSearchQuery('');
      setUserSearchResults([]);
      setSpotSearch('');
      setSelectedCrews(new Set());
      crewMembersRef.current = {};

      const nextDefault = new Date();
      nextDefault.setHours(nextDefault.getHours() + 1, 0, 0, 0);
      setEventDate(nextDefault);
      return;
    }

    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description ?? '');
      setLocationName(editEvent.location_name);
      setLat(editEvent.lat);
      setLng(editEvent.lng);
      setSelectedSpotId(editEvent.spot_id);
      setVisibility(editEvent.visibility);
      const d = new Date(editEvent.event_date);
      setEventDate(d);
    } else if (pendingCoord) {
      setLat(pendingCoord.lat);
      setLng(pendingCoord.lng);
      setLocationName(`${pendingCoord.lat.toFixed(4)}, ${pendingCoord.lng.toFixed(4)}`);
    }

    loadFriends();
    loadMyCrews();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [visible, editEvent, pendingCoord]);

  async function toggleCrew(crewId: string) {
    if (!currentUserId) return;
    if (selectedCrews.has(crewId)) {
      const members = crewMembersRef.current[crewId] ?? [];
      setInvitedIds((prev) => {
        const next = new Set(prev);
        members.forEach((m) => next.delete(m));
        return next;
      });
      setSelectedCrews((prev) => {
        const next = new Set(prev);
        next.delete(crewId);
        return next;
      });
    } else {
      const { data } = await supabase
        .from('crew_members')
        .select('user_id')
        .eq('crew_id', crewId)
        .neq('user_id', currentUserId);
      const members: string[] = (data ?? []).map((r: { user_id: string }) => r.user_id);
      crewMembersRef.current[crewId] = members;
      setInvitedIds((prev) => {
        const next = new Set(prev);
        members.forEach((m) => next.add(m));
        return next;
      });
      setSelectedCrews((prev) => new Set(prev).add(crewId));
    }
  }

  async function loadFriends() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('friendships')
      .select(
        'requester_id, addressee_id, profiles!friendships_requester_id_fkey(username, avatar_url), profiles!friendships_addressee_id_fkey(username, avatar_url)'
      )
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    const friendList = (data ?? []).map((f: any) => {
      const isSelf = f.requester_id === user.id;
      const friendId = isSelf ? f.addressee_id : f.requester_id;
      const profile = isSelf
        ? f['profiles!friendships_addressee_id_fkey']
        : f['profiles!friendships_requester_id_fkey'];
      return {
        id: friendId,
        username: profile?.username ?? 'Unknown',
        avatar_url: profile?.avatar_url ?? null,
      };
    });
    setFriends(friendList);
  }

  async function searchUsers(query: string) {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', user?.id ?? '')
      .limit(8);
    setUserSearchResults(data ?? []);
  }

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const r = results[0];
      if (!r) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const parts = [r.name, r.street, r.city, r.region].filter(Boolean);
      return parts.slice(0, 2).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  function toggleInvite(userId: string) {
    setInvitedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!locationName.trim()) {
      toast.error('Location is required');
      return;
    }
    if (eventDate < new Date()) {
      toast.error('Event date must be in the future');
      return;
    }
    if (lat === null || lng === null) {
      toast.error('Location coordinates are required');
      return;
    }

    setSaving(true);
    const err = await onSubmit(
      title,
      description,
      locationName,
      lat,
      lng,
      eventDate,
      visibility,
      selectedSpotId,
      Array.from(invitedIds)
    );
    setSaving(false);
    if (err) toast.error(err);
    else onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '90%',
            paddingBottom: insets.bottom,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderColor: c.border,
            }}>
            <Ionicons name="calendar-outline" size={20} color={c.subtext} style={{ marginRight: 8 }} />
            <Text style={{ flex: 1, fontWeight: '700', fontSize: 16, color: c.text }}>
              {editEvent ? 'Edit Event' : 'Create Event'}
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={c.text} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ padding: 16, gap: 16 }}
            keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 13, color: c.subtext }}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Downtown Session"
              placeholderTextColor={c.placeholder}
              autoCapitalize="sentences"
              autoCorrect
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
            <Text style={{ fontSize: 13, color: c.subtext }}>Description (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's the plan?"
              placeholderTextColor={c.placeholder}
              autoCapitalize="sentences"
              autoCorrect
              multiline
              style={{
                borderWidth: 1,
                borderColor: c.inputBorder,
                borderRadius: 8,
                padding: 10,
                fontSize: 14,
                color: c.text,
                backgroundColor: c.surface,
                height: 60,
              }}
            />
            <Text style={{ fontSize: 13, color: c.subtext }}>Location</Text>
            <TextInput
              value={locationName}
              onChangeText={setLocationName}
              placeholder="Location name"
              placeholderTextColor={c.placeholder}
              autoCapitalize="sentences"
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={async () => {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') return;
                  setGeocoding(true);
                  try {
                    const pos = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.Balanced,
                    });
                    const { latitude, longitude } = pos.coords;
                    setLat(latitude);
                    setLng(longitude);
                    const name = await reverseGeocode(latitude, longitude);
                    setLocationName(name);
                  } finally {
                    setGeocoding(false);
                  }
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  backgroundColor: c.tagBg,
                }}>
                <Ionicons name="navigate-outline" size={14} color={c.subtext} />
                <Text style={{ fontSize: 13, color: c.text }}>
                  {geocoding ? 'Getting location...' : 'Use my location'}
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') return;
                  const pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                  });
                  setMapPickerRegion({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                  setMapPickerCoord({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setMapPickerOpen(true);
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  backgroundColor: c.tagBg,
                }}>
                <Ionicons name="map-outline" size={14} color={c.subtext} />
                <Text style={{ fontSize: 13, color: c.text }}>Pick on map</Text>
              </Pressable>
            </View>
            {lat !== null && lng !== null ? (
              <Text style={{ fontSize: 11, color: c.subtext }}>
                📍 {lat.toFixed(5)}, {lng.toFixed(5)}
              </Text>
            ) : null}
            <Pressable
              onPress={() => setSpotPickerOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 10,
                borderWidth: 1,
                borderColor: c.inputBorder,
                borderRadius: 8,
              }}>
              <Ionicons name="location-outline" size={16} color={c.subtext} />
              <Text style={{ flex: 1, fontSize: 14, color: selectedSpotId ? c.text : c.placeholder }}>
                {selectedSpotId
                  ? (spots.find((s) => s.id === selectedSpotId)?.name ?? 'Selected spot')
                  : 'Link to an existing spot (optional)'}
              </Text>
              {selectedSpotId ? (
                <Pressable onPress={() => setSelectedSpotId(null)}>
                  <Ionicons name="close-circle" size={18} color={c.subtext} />
                </Pressable>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={c.subtext} />
              )}
            </Pressable>
            <Text style={{ fontSize: 13, color: c.subtext }}>Date & Time</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 10,
                  backgroundColor: c.tagBg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}>
                <Ionicons name="calendar-outline" size={14} color={c.subtext} />
                <Text style={{ fontSize: 14, color: c.text }}>
                  {eventDate.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowTimePicker(true)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 10,
                  backgroundColor: c.tagBg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}>
                <Ionicons name="time-outline" size={14} color={c.subtext} />
                <Text style={{ fontSize: 14, color: c.text }}>
                  {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
            </View>
            {showDatePicker && (
              <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                <Pressable
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => setShowDatePicker(false)}>
                  <View
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: 16,
                      padding: 16,
                      width: '90%',
                    }}>
                    <DateTimePicker
                      value={eventDate}
                      mode="date"
                      display="inline"
                      themeVariant={darkMode ? 'dark' : 'light'}
                      minimumDate={new Date()}
                      style={{ height: 350, width: 288 }}
                      onChange={(_, selected) => {
                        if (selected) {
                          const updated = new Date(eventDate);
                          updated.setFullYear(
                            selected.getFullYear(),
                            selected.getMonth(),
                            selected.getDate()
                          );
                          setEventDate(updated);
                        }
                      }}
                    />
                    <Pressable
                      onPress={() => setShowDatePicker(false)}
                      style={{
                        backgroundColor: c.accent,
                        borderRadius: 8,
                        padding: 12,
                        alignItems: 'center',
                        marginTop: 8,
                      }}>
                      <Text style={{ color: 'white', fontWeight: '700' }}>Done</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Modal>
            )}
            {showTimePicker && (
              <Modal transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
                <Pressable
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => setShowTimePicker(false)}>
                  <View
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: 16,
                      padding: 16,
                      width: '90%',
                    }}>
                    <DateTimePicker
                      value={eventDate}
                      mode="time"
                      display="spinner"
                      themeVariant={darkMode ? 'dark' : 'light'}
                      style={{ height: 150, width: 288 }}
                      onChange={(_, selected) => {
                        if (selected) {
                          const updated = new Date(eventDate);
                          updated.setHours(selected.getHours(), selected.getMinutes());
                          setEventDate(updated);
                        }
                      }}
                    />
                    <Pressable
                      onPress={() => setShowTimePicker(false)}
                      style={{
                        backgroundColor: c.accent,
                        borderRadius: 8,
                        padding: 12,
                        alignItems: 'center',
                        marginTop: 8,
                      }}>
                      <Text style={{ color: 'white', fontWeight: '700' }}>Done</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Modal>
            )}
            <Text style={{ fontSize: 13, color: c.subtext }}>Visibility</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['public', 'friends', 'invite'] as EventVisibility[]).map((v) => (
                <Pressable
                  key={v}
                  onPress={() => {
                    setVisibility(v);
                    if (v !== 'invite') {
                      setInvitedIds(new Set());
                      setSelectedCrews(new Set());
                      crewMembersRef.current = {};
                    }
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1.5,
                    borderColor: visibility === v ? c.accent : c.inputBorder,
                    backgroundColor: visibility === v ? 'rgba(0,122,255,0.08)' : c.surface,
                    alignItems: 'center',
                  }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: visibility === v ? c.accent : c.subtext,
                    }}>
                    {v === 'public' ? 'Public' : v === 'friends' ? 'Friends' : 'Invite Only'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {visibility === 'invite' ? (
              <>
            {myCrews.length > 0 ? (
              <>
                <Text style={{ fontSize: 13, color: c.subtext }}>Invite a Crew</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {myCrews.map((crew) => {
                    const on = selectedCrews.has(crew.id);
                    return (
                      <Pressable
                        key={crew.id}
                        onPress={() => toggleCrew(crew.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: on ? c.accent : c.inputBorder,
                          backgroundColor: on ? 'rgba(0,122,255,0.10)' : c.surface,
                        }}>
                        <Ionicons
                          name={on ? 'checkmark-circle' : 'people-outline'}
                          size={16}
                          color={on ? c.accent : c.subtext}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: on ? c.accent : c.text,
                          }}>
                          {crew.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: c.subtext }}>
                          {crew.member_count}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
            <Text style={{ fontSize: 13, color: c.subtext }}>Invite People</Text>
            <TextInput
              ref={inviteInputRef}
              value={userSearchQuery}
              onChangeText={(text) => {
                setUserSearchQuery(text);
                searchUsers(text);
              }}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
              placeholder="Search users..."
              placeholderTextColor={c.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
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
            {userSearchResults.length > 0 ? (
              userSearchResults.map((u) => (
                <Pressable
                  key={u.id}
                  onPress={() => {
                    toggleInvite(u.id);
                    setUserSearchQuery('');
                    setUserSearchResults([]);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                  }}>
                  {u.avatar_url ? (
                    <Image
                      source={{ uri: u.avatar_url }}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: c.tagBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Ionicons name="person-outline" size={16} color={c.subtext} />
                    </View>
                  )}
                  <Text style={{ flex: 1, fontWeight: '600', color: c.text }}>@{u.username}</Text>
                  <Ionicons
                    name={invitedIds.has(u.id) ? 'checkmark-circle' : 'add-circle-outline'}
                    size={22}
                    color={invitedIds.has(u.id) ? c.accent : c.subtext}
                  />
                </Pressable>
              ))
            ) : friends.length > 0 ? (
              <>
                <Text style={{ fontSize: 12, color: c.subtext, marginTop: 4 }}>Your Friends</Text>
                {friends.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => toggleInvite(f.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                    }}>
                    {f.avatar_url ? (
                      <Image
                        source={{ uri: f.avatar_url }}
                        style={{ width: 32, height: 32, borderRadius: 16 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: c.tagBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="person-outline" size={16} color={c.subtext} />
                      </View>
                    )}
                    <Text style={{ flex: 1, fontWeight: '600', color: c.text }}>@{f.username}</Text>
                    <Ionicons
                      name={invitedIds.has(f.id) ? 'checkmark-circle' : 'add-circle-outline'}
                      size={22}
                      color={invitedIds.has(f.id) ? c.accent : c.subtext}
                    />
                  </Pressable>
                ))}
              </>
            ) : null}
            {invitedIds.size > 0 ? (
              <Text style={{ fontSize: 12, color: c.accent, fontWeight: '600' }}>
                {invitedIds.size} {invitedIds.size === 1 ? 'person' : 'people'} invited
              </Text>
            ) : null}
              </>
            ) : null}
            <Pressable
              onPress={handleSubmit}
              disabled={saving}
              style={{
                backgroundColor: c.accent,
                borderRadius: 10,
                padding: 13,
                alignItems: 'center',
                opacity: saving ? 0.6 : 1,
                marginTop: 8,
              }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                {saving ? 'Saving...' : editEvent ? 'Save Changes' : 'Create Event'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={mapPickerOpen} animationType="slide" onRequestClose={() => setMapPickerOpen(false)}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              paddingTop: insets.top + 8,
              backgroundColor: c.surface,
              borderBottomWidth: 1,
              borderColor: c.border,
            }}>
            <Pressable onPress={() => setMapPickerOpen(false)} style={{ marginRight: 12 }}>
              <Ionicons name="close" size={24} color={c.text} />
            </Pressable>
            <Text style={{ flex: 1, fontWeight: '700', fontSize: 16, color: c.text }}>Pick Location</Text>
            <Pressable
              onPress={async () => {
                if (!mapPickerCoord) return;
                setGeocoding(true);
                setMapPickerOpen(false);
                setLat(mapPickerCoord.lat);
                setLng(mapPickerCoord.lng);
                const name = await reverseGeocode(mapPickerCoord.lat, mapPickerCoord.lng);
                setLocationName(name);
                setGeocoding(false);
              }}
              style={{
                backgroundColor: c.accent,
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Confirm</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <MapView
              key={mapProvider}
              provider={mapProvider === 'google' ? PROVIDER_GOOGLE : undefined}
              customMapStyle={mapProvider === 'google' ? (darkMode ? DARK_MAP_STYLE : LIGHT_MAP_STYLE) : []}
              userInterfaceStyle={darkMode ? 'dark' : 'light'}
              style={{ flex: 1 }}
              region={mapPickerRegion}
              onRegionChangeComplete={(region) => {
                setMapPickerRegion(region);
                setMapPickerCoord({ lat: region.latitude, lng: region.longitude });
              }}
              showsUserLocation></MapView>
            <View
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginLeft: -12,
                marginTop: -24,
                pointerEvents: 'none',
              }}>
              <Ionicons name="location" size={36} color="#FF3B30" />
            </View>
          </View>
          <View
            style={{
              backgroundColor: c.surface,
              padding: 16,
              paddingBottom: insets.bottom + 8,
              borderTopWidth: 1,
              borderColor: c.border,
            }}>
            <Text style={{ fontSize: 13, color: c.subtext, textAlign: 'center' }}>
              Move the map to position the pin
            </Text>
          </View>
        </View>
      </Modal>
      <Modal
        visible={spotPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSpotPickerOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setSpotPickerOpen(false)}
        />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '60%',
            paddingBottom: insets.bottom,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderColor: c.border,
            }}>
            <Text style={{ flex: 1, fontWeight: '700', fontSize: 16, color: c.text }}>Pick a Spot</Text>
            <Pressable onPress={() => setSpotPickerOpen(false)}>
              <Ionicons name="close" size={24} color={c.text} />
            </Pressable>
          </View>
          <TextInput
            value={spotSearch}
            onChangeText={setSpotSearch}
            placeholder="Search spots..."
            placeholderTextColor={c.placeholder}
            autoCapitalize="none"
            style={{
              margin: 12,
              borderWidth: 1,
              borderColor: c.inputBorder,
              borderRadius: 8,
              padding: 10,
              fontSize: 14,
              color: c.text,
              backgroundColor: c.surface,
            }}
          />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {filteredSpots.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSelectedSpotId(s.id);
                  setLocationName(s.name);
                  setLat(s.lat);
                  setLng(s.lng);
                  setSpotPickerOpen(false);
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
                <Text style={{ flex: 1, fontWeight: '600', color: c.text }}>{s.name}</Text>
                {selectedSpotId === s.id ? (
                  <Ionicons name="checkmark-circle" size={20} color={c.accent} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </Modal>
  );
}
