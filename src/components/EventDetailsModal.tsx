import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/context/ThemeContext';

import { EventCommentsModal } from '@/src/components/EventCommentsModal';

import { SkateEvent, RsvpStatus, EventRsvp } from '@/src/hooks/useEvents';
import * as Haptics from 'expo-haptics';

type Props = {
  visible: boolean;
  event: SkateEvent | null;
  currentUserId: string | null;
  onClose: () => void;
  onCancelEvent: (eventId: string) => void;
  onViewSpotDetails: () => void;
  onLoadRsvps: (eventId: string) => Promise<EventRsvp[]>;
  onUpsertRsvp: (eventId: string, status: RsvpStatus) => Promise<string | null>;
  onDeleteRsvp: (eventId: string) => Promise<string | null>;
  onEditEvent: () => void;
};

export function EventDetailsModal({
  visible,
  event,
  currentUserId,
  onClose,
  onCancelEvent,
  onViewSpotDetails,
  onLoadRsvps,
  onUpsertRsvp,
  onDeleteRsvp,
  onEditEvent,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const [rsvps, setRsvps] = useState<EventRsvp[]>([]);
  const [myRsvp, setMyRsvp] = useState<RsvpStatus | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [loadingRsvps, setLoadingRsvps] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [liveCommentCount, setLiveCommentCount] = useState(event?.comment_count ?? 0);

  const isOwner = event?.creator_id === currentUserId;

  const goingCount = rsvps.filter((r) => r.status === 'going').length;
  const maybeCount = rsvps.filter((r) => r.status === 'maybe').length;
  const notGoingCount = rsvps.filter((r) => r.status === 'not_going').length;

  useEffect(() => {
    if (!visible || !event) {
      setRsvps([]);
      setMyRsvp(null);
      return;
    }
    loadRsvps();
  }, [visible, event?.id]);

  useEffect(() => {
    setLiveCommentCount(event?.comment_count ?? 0);
  }, [event?.id]);

  async function loadRsvps() {
    if (!event) return;
    setLoadingRsvps(true);
    const data = await onLoadRsvps(event.id);
    setRsvps(data);
    const mine = data.find((r) => r.user_id === currentUserId);
    setMyRsvp(mine?.status ?? null);
    setLoadingRsvps(false);
  }

  async function handleRsvp(status: RsvpStatus) {
    if (!event) return;
    setRsvpLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (myRsvp === status) {
      await onDeleteRsvp(event.id);
      setMyRsvp(null);
      setRsvps((prev) => prev.filter((r) => r.user_id !== currentUserId));
    } else {
      const err = await onUpsertRsvp(event.id, status);
      if (!err) {
        setMyRsvp(status);
        setRsvps((prev) => {
          const filtered = prev.filter((r) => r.user_id !== currentUserId);
          return [...filtered, { user_id: currentUserId!, status, username: null, avatar_url: null }];
        });
      }
    }
    setRsvpLoading(false);
  }

  if (!event) return null;

  const eventDate = new Date(event.event_date);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: c.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '80%',
          paddingBottom: insets.bottom,
        }}>
        <View
          style={{
            alignItems: 'center',
            paddingTop: 10,
            paddingBottom: 6,
          }}>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.border,
            }}
          />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>{event.title}</Text>
              {event.visibility === 'invite' ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 4,
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(88,86,214,0.12)',
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}>
                  <Text style={{ fontSize: 10, color: '#5856D6', fontWeight: '700' }}>
                    INVITE ONLY
                  </Text>
                </View>
              ) : event.visibility === 'friends' ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 4,
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(52,199,89,0.12)',
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}>
                  <Text style={{ fontSize: 10, color: '#34C759', fontWeight: '700' }}>
                    FRIENDS ONLY
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={c.text} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="calendar-outline" size={16} color={c.subtext} />
            <Text style={{ fontSize: 14, color: c.text }}>
              {eventDate.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="time-outline" size={16} color={c.subtext} />
            <Text style={{ fontSize: 14, color: c.text }}>
              {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="location-outline" size={16} color={c.subtext} />
            <Text style={{ fontSize: 14, color: c.text }}>{event.location_name}</Text>
          </View>
          {event.creator?.username ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="person-outline" size={16} color={c.subtext} />
              <Text style={{ fontSize: 14, color: '#007AFF' }}>@{event.creator.username}</Text>
            </View>
          ) : null}
          {event.description ? (
            <Text style={{ fontSize: 14, color: c.text, lineHeight: 20 }}>{event.description}</Text>
          ) : null}
          <View style={{ height: 1, backgroundColor: c.border, marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#34C759' }}>{goingCount}</Text>
              <Text style={{ fontSize: 11, color: c.subtext }}>Going</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#FF9500' }}>{maybeCount}</Text>
              <Text style={{ fontSize: 11, color: c.subtext }}>Maybe</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: c.danger }}>{notGoingCount}</Text>
              <Text style={{ fontSize: 11, color: c.subtext }}>Not Going</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setCommentsOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 12,
              borderRadius: 10,
              backgroundColor: c.tagBg,
              borderWidth: 1,
              borderColor: c.border,
            }}>
            <Ionicons name="chatbubbles-outline" size={16} color={c.text} />
            <Text style={{ fontWeight: '600', color: c.text }}>
              Comments{liveCommentCount > 0 ? ` (${liveCommentCount})` : ''}
            </Text>
          </Pressable>
          {!isOwner ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['going', 'maybe', 'not_going'] as RsvpStatus[]).map((status) => {
                const isSelected = myRsvp === status;
                const labels = { going: 'Going', maybe: 'Maybe', not_going: 'Not Going' };
                const colors = { going: '#34C759', maybe: '#FF9500', not_going: c.danger };
                const color = colors[status];
                return (
                  <Pressable
                    key={status}
                    onPress={() => handleRsvp(status)}
                    disabled={rsvpLoading}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: isSelected ? color : c.inputBorder,
                      backgroundColor: isSelected ? `${color}20` : c.surface,
                      alignItems: 'center',
                      opacity: rsvpLoading ? 0.6 : 1,
                    }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: isSelected ? color : c.subtext,
                      }}>
                      {labels[status]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {isOwner && rsvps.length > 0 ? (
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 8 }}>
                Attendees
              </Text>
              {rsvps.map((r) => (
                <View
                  key={r.user_id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    gap: 10,
                  }}>
                  {r.avatar_url ? (
                    <Image
                      source={{ uri: r.avatar_url }}
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
                  <Text style={{ flex: 1, fontWeight: '600', color: c.text }}>
                    @{r.username ?? 'Unknown'}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor:
                        r.status === 'going'
                          ? 'rgba(52,199,89,0.12)'
                          : r.status === 'maybe'
                            ? 'rgba(255,149,0,0.12)'
                            : 'rgba(255,59,48,0.12)',
                    }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color:
                          r.status === 'going'
                            ? '#34C759'
                            : r.status === 'maybe'
                              ? '#FF9500'
                              : c.danger,
                      }}>
                      {r.status === 'going'
                        ? 'GOING'
                        : r.status === 'maybe'
                          ? 'MAYBE'
                          : 'NOT GOING'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {event.spot_id ? (
            <Pressable
              onPress={onViewSpotDetails}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 12,
                borderRadius: 10,
                backgroundColor: c.tagBg,
                borderWidth: 1,
                borderColor: c.border,
              }}>
              <Ionicons name="location-outline" size={16} color={c.text} />
              <Text style={{ fontWeight: '600', color: c.text }}>View Spot Details</Text>
            </Pressable>
          ) : null}
          {isOwner ? (
            <Pressable
              onPress={onEditEvent}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#007AFF',
                marginTop: 8,
                marginBottom: 8,
              }}>
              <Ionicons name="pencil-outline" size={16} color="#007AFF" />
              <Text style={{ fontWeight: '600', color: '#007AFF' }}>Edit Event</Text>
            </Pressable>
          ) : null}

          {isOwner ? (
            <Pressable
              onPress={() => {
                Alert.alert('Cancel Event', `Cancel "${event.title}"?`, [
                  { text: 'Keep', style: 'cancel' },
                  {
                    text: 'Cancel Event',
                    style: 'destructive',
                    onPress: () => {
                      onCancelEvent(event.id);
                      onClose();
                    },
                  },
                ]);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: c.danger,
              }}>
              <Ionicons name="close-circle-outline" size={16} color={c.danger} />
              <Text style={{ fontWeight: '600', color: c.danger }}>Cancel Event</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
      <EventCommentsModal
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        eventId={event?.id ?? null}
        eventTitle={event?.title ?? null}
        currentUserId={currentUserId}
        onCommentCountChange={(count) => setLiveCommentCount(count)}
      />
    </Modal>
  );
}
