import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast } from '@/src/context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/src/libs/supabase';
import { formatLiveSessionDuration, LiveSession } from '@/src/hooks/useLiveSession';
import { ViewerMedia, SessionMediaViewerModal } from '@/src/components/SessionMediaViewerModal';
import { CrownIcon } from '@/src/components/icons/CrownIcon';
import { moderateText } from '@/src/libs/moderator/textModerator';

type SessionMedia = ViewerMedia & {
  spot_id: string | null;
  place_id: string | null;
  created_at: string;
  show_location?: boolean;
};

type SessionTrick = {
  id: string;
  trick_name: string;
  logged_at: string;
  spot_id: string;
  spot?: { name: string | null } | null;
};

type SessionParticipant = {
  user_id: string;
  status: string;
  username: string | null;
  avatar_url: string | null;
};

type SessionCondition = {
  spot_id: string;
  condition: string;
  created_at: string;
};

type Props = {
  visible: boolean;
  session: LiveSession | null;
  isPro: boolean;
  currentUserId: string | null;
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
  onOpenPro: () => void;
  onUpdateNotes: (session: LiveSession, notes: string) => Promise<boolean>;
};

function elapsedText(session: LiveSession): string {
  return formatLiveSessionDuration(session).replace('m', ' min');
}

function distanceBetween(a: LiveSession['stops'][number], b: LiveSession['stops'][number]): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatStopTime(addedAt: string): string {
  return new Date(addedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function LiveSessionDetailModal({ visible, session, isPro, currentUserId, onClose, onViewProfile, onOpenPro, onUpdateNotes }: Props) {
  const { theme } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<SessionMedia[]>([]);
  const [tricks, setTricks] = useState<SessionTrick[]>([]);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [conditions, setConditions] = useState<SessionCondition[]>([]);
  const [viewer, setViewer] = useState<{ list: ViewerMedia[]; index: number } | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [expandedStopKey, setExpandedStopKey] = useState<string | null>(null);

  useEffect(() => {
    if (visible && session) {
      setNotesDraft(session.notes ?? '');
      setEditingNotes(false);
      setExpandedStopKey(null);
    }
  }, [visible, session?.id]);

  useEffect(() => {
    if (!visible || !session?.serverId) {
      setMedia([]);
      setTricks([]);
      setParticipants([]);
      setConditions([]);
      return;
    }

    let cancelled = false;
    const serverId = session.serverId;
    const sessionStops = session.stops;
    setLoading(true);
    async function loadDetails() {
      const [mediaResult, trickResult, participantResult, conditionResult] = await Promise.all([
        supabase
          .from('check_in_media')
          .select('id, url, thumbnail_url, media_type, spot_id, place_id, show_location, created_at')
          .eq('live_session_id', serverId)
          .order('created_at', { ascending: true }),
        supabase
          .from('trick_logs')
          .select('id, trick_name, logged_at, spot_id, spot:spots(name)')
          .eq('live_session_id', serverId)
          .order('logged_at', { ascending: true }),
        supabase
          .from('live_session_participants')
          .select('user_id, status')
          .eq('session_id', serverId)
          .order('created_at', { ascending: true }),
        supabase
          .from('spot_conditions')
          .select('spot_id, condition, created_at')
          .in('spot_id', sessionStops.filter((stop) => stop.type === 'spot').map((stop) => stop.id))
          .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()),
      ]);

      if (cancelled) return;
      setMedia((mediaResult.data ?? []) as SessionMedia[]);
      setTricks(
        (trickResult.data ?? []).map((trick: any) => ({
          ...trick,
          spot: Array.isArray(trick.spot) ? trick.spot[0] ?? null : trick.spot,
        })) as SessionTrick[]
      );
      setConditions((conditionResult.data ?? []) as SessionCondition[]);

      const participantRows = (participantResult.data ?? []) as { user_id: string; status: string }[];
      if (participantRows.length > 0) {
        const ids = participantRows.map((row) => row.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', ids);
        const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
        setParticipants(
          participantRows.map((row) => ({
            ...row,
            username: profileById.get(row.user_id)?.username ?? null,
            avatar_url: profileById.get(row.user_id)?.avatar_url ?? null,
          }))
        );
      } else {
        setParticipants([]);
      }
      setLoading(false);
    }
    loadDetails().catch(() => {
      if (!cancelled) {
        setLoading(false);
        toast.error('Couldn’t load session details');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, session?.serverId]);

  const distance = useMemo(
    () => session?.stops.slice(1).reduce((total, stop, index) => total + distanceBetween(session.stops[index], stop), 0) ?? 0,
    [session]
  );
  const region = useMemo(() => {
    if (!session?.stops.length) return null;
    const lats = session.stops.map((stop) => stop.lat);
    const lngs = session.stops.map((stop) => stop.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.012) * 1.8,
      longitudeDelta: Math.max(maxLng - minLng, 0.012) * 1.8,
    };
  }, [session]);

  const activityForStop = (stop: LiveSession['stops'][number]) => {
    const stopMedia = media.filter((item) =>
      stop.type === 'spot' ? item.spot_id === stop.id : item.place_id === stop.id
    );
    const stopTricks = stop.type === 'spot' ? tricks.filter((trick) => trick.spot_id === stop.id) : [];
    const stopConditions = stop.type === 'spot' ? conditions.filter((condition) => condition.spot_id === stop.id) : [];
    return { stopMedia, stopTricks, stopConditions };
  };

  if (!session) return null;
  const proLocked = !isPro;
  const saveNotes = async () => {
    const trimmed = notesDraft.trim();
    if (trimmed.length > 1000) {
      toast.error('Keep notes under 1,000 characters');
      return;
    }
    const moderation = moderateText(trimmed);
    if (!moderation.allowed) {
      toast.error(moderation.reason ?? 'Notes contain inappropriate content');
      return;
    }
    setSavingNotes(true);
    const saved = await onUpdateNotes(session, trimmed);
    setSavingNotes(false);
    if (!saved) {
      toast.error('Couldn’t save session notes');
      return;
    }
    setEditingNotes(false);
    toast.success(trimmed ? 'Notes saved' : 'Notes removed');
  };
  const shareSession = async () => {
    try {
      await Share.share({
        message: `${session.title} · ${new Date(session.startedAt).toLocaleDateString()}\n${session.stops.length} stops · ${elapsedText(session)}${distance > 0 ? ` · ${distance.toFixed(1)} mi` : ''}\n${session.stops.map((stop) => stop.name).join(' → ')}${session.notes ? `\n\n${session.notes}` : ''}`,
      });
    } catch {
      toast.error('Couldn’t share this session');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Pressable onPress={onClose} hitSlop={10}><Ionicons name="chevron-back" size={27} color={c.text} /></Pressable>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>Session details</Text>
          <Pressable onPress={shareSession} hitSlop={10}><Ionicons name="share-outline" size={23} color={c.accent} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
          <Text style={{ color: c.text, fontSize: 25, fontWeight: '800' }}>{session.title}</Text>
          <Text style={{ color: c.subtext, marginTop: 5 }}>
            {new Date(session.startedAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>

          <View style={{ marginTop: 16, backgroundColor: c.tagBg, borderRadius: 16, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={18} color={c.accent} />
                <Text style={{ color: c.text, fontWeight: '800', marginLeft: 7 }}>Session notes</Text>
              </View>
              <Pressable onPress={() => { setNotesDraft(session.notes ?? ''); setEditingNotes((current) => !current); }} hitSlop={8}>
                <Text style={{ color: c.accent, fontWeight: '800' }}>{editingNotes ? 'Cancel' : 'Edit'}</Text>
              </Pressable>
            </View>
            {editingNotes ? (
              <>
                <TextInput
                  value={notesDraft}
                  onChangeText={setNotesDraft}
                  placeholder="What stood out about this session?"
                  placeholderTextColor={c.subtext}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                  style={{ color: c.text, backgroundColor: c.surface, borderRadius: 12, minHeight: 94, marginTop: 12, padding: 12, fontSize: 15 }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
                  <Text style={{ color: c.subtext, fontSize: 12 }}>{notesDraft.length}/1000</Text>
                  <Pressable onPress={saveNotes} disabled={savingNotes} style={{ backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, opacity: savingNotes ? 0.6 : 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>{savingNotes ? 'Saving…' : 'Save notes'}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable onPress={() => setEditingNotes(true)}>
                <Text style={{ color: session.notes ? c.text : c.subtext, marginTop: 10, lineHeight: 21 }}>
                  {session.notes || 'Add a note about this session…'}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {[
              ['timer-outline', elapsedText(session)],
              ['location-outline', `${session.stops.length} stop${session.stops.length === 1 ? '' : 's'}`],
              ['navigate-outline', distance > 0 ? `${distance.toFixed(1)} mi` : '—'],
            ].map(([icon, value]) => (
              <View key={value} style={{ flex: 1, backgroundColor: c.tagBg, borderRadius: 14, padding: 12, alignItems: 'center' }}>
                <Ionicons name={icon as any} size={19} color={c.accent} />
                <Text style={{ color: c.text, fontWeight: '800', marginTop: 6, fontSize: 13 }}>{value}</Text>
              </View>
            ))}
          </View>

          {region ? (
            <MapView initialRegion={region} mapType="standard" style={{ height: 190, borderRadius: 16, marginTop: 16 }} scrollEnabled={false} zoomEnabled={false}>
              <Polyline coordinates={session.stops.map((stop) => ({ latitude: stop.lat, longitude: stop.lng }))} strokeColor={c.accent} strokeWidth={4} />
              {session.stops.map((stop, index) => (
                <Marker key={`${stop.id}-${index}`} coordinate={{ latitude: stop.lat, longitude: stop.lng }} title={`${index + 1}. ${stop.name}`}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{index + 1}</Text>
                  </View>
                </Marker>
              ))}
            </MapView>
          ) : null}

          <SectionTitle icon="trail-sign-outline" title="Session timeline" c={c} />
          <View style={{ backgroundColor: c.tagBg, borderRadius: 16, paddingHorizontal: 14 }}>
            {session.stops.length === 0 ? <Text style={{ color: c.subtext, paddingVertical: 16 }}>No stops recorded.</Text> : session.stops.map((stop, index) => (
              <View key={`${stop.type}:${stop.id}:${index}`} style={{ borderBottomWidth: index === session.stops.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
                <Pressable
                  onPress={() => setExpandedStopKey((current) => current === `${stop.type}:${stop.id}` ? null : `${stop.type}:${stop.id}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginRight: 11 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{index + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '700' }}>{stop.name}</Text>
                    <Text style={{ color: c.subtext, fontSize: 12, marginTop: 3 }}>{formatStopTime(stop.addedAt)} · {stop.type === 'skateshop' ? 'Skate shop' : stop.type === 'skatepark' ? 'Skate park' : 'Skate spot'}</Text>
                  </View>
                  <Ionicons name={expandedStopKey === `${stop.type}:${stop.id}` ? 'chevron-up' : 'chevron-down'} size={19} color={c.subtext} />
                </Pressable>
                {expandedStopKey === `${stop.type}:${stop.id}` ? (() => {
                  const { stopMedia, stopTricks, stopConditions } = activityForStop(stop);
                  return (
                    <View style={{ paddingBottom: 14, paddingLeft: 39 }}>
                      {loading ? <ActivityIndicator color={c.accent} /> : (
                        <>
                          <Text style={{ color: c.subtext, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 7 }}>ACTIVITY</Text>
                          {stop.type === 'spot' && !proLocked && stopTricks.length > 0 ? (
                            <View style={{ marginBottom: 10 }}>
                              {stopTricks.map((trick) => <View key={trick.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}><Ionicons name="sparkles-outline" size={15} color={c.accent} /><Text style={{ color: c.text, fontSize: 13, fontWeight: '700', marginLeft: 7 }}>{trick.trick_name}</Text><Text style={{ color: c.subtext, fontSize: 11, marginLeft: 'auto' }}>{new Date(trick.logged_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text></View>)}
                            </View>
                          ) : null}
                          {stop.type === 'spot' && !proLocked && stopTricks.length === 0 ? <Text style={{ color: c.subtext, fontSize: 12, marginBottom: 10 }}>No tricks logged here.</Text> : null}
                          {stopMedia.length > 0 && !proLocked ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginBottom: 10 }}>
              {stopMedia.map((item, mediaIndex) => <Pressable key={item.id} onPress={() => setViewer({ list: stopMedia.map((mediaItem) => ({ ...mediaItem, locationName: mediaItem.show_location === false ? null : stop.name })), index: mediaIndex })}><Image source={{ uri: item.media_type === 'video' ? item.thumbnail_url ?? item.url : item.url }} style={{ width: 58, height: 58, borderRadius: 8 }} /><View style={{ position: 'absolute', right: 4, bottom: 4 }}>{item.media_type === 'video' ? <Ionicons name="play-circle" size={18} color="#fff" /> : null}</View></Pressable>)}
                            </ScrollView>
                          ) : null}
                          {stop.type === 'spot' && stopConditions.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 7 }}>{stopConditions.map((condition, conditionIndex) => <View key={`${condition.condition}-${conditionIndex}`} style={{ backgroundColor: c.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}><Text style={{ color: c.text, fontSize: 11, fontWeight: '700' }}>{condition.condition.replace(/_/g, ' ')}</Text></View>)}</View> : null}
                          {stop.type === 'spot' && stopConditions.length === 0 && stopTricks.length === 0 && stopMedia.length === 0 ? <Text style={{ color: c.subtext, fontSize: 12 }}>No activity recorded here.</Text> : null}
                          {proLocked && (stop.type === 'spot' || stopMedia.length > 0) ? <Text style={{ color: c.subtext, fontSize: 12 }}>Upgrade to see tricks and session media.</Text> : null}
                        </>
                      )}
                    </View>
                  );
                })() : null}
              </View>
            ))}
          </View>

          <SectionTitle icon="pulse-outline" title="Recent conditions" c={c} />
          {conditions.length === 0 ? <EmptySection text="No recent condition reports for these stops." c={c} /> : <View style={{ backgroundColor: c.tagBg, borderRadius: 16, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{conditions.map((condition, index) => <View key={`${condition.spot_id}-${condition.condition}-${index}`} style={{ backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }}><Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>{condition.condition.replace('_', ' ')}</Text></View>)}</View>}

          <SectionTitle icon="images-outline" title={`Media${media.length ? ` · ${media.length}` : ''}`} c={c} />
          {proLocked ? <ProPrompt text="Attach photos and clips to every session." onPress={onOpenPro} c={c} /> : loading ? <ActivityIndicator color={c.accent} /> : media.length === 0 ? <EmptySection text="No photos or clips attached yet." c={c} /> : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {media.map((item, index) => <Pressable key={item.id} onPress={() => setViewer({ list: media.map((mediaItem) => ({ ...mediaItem, locationName: mediaItem.show_location === false ? null : session.stops.find((stop) => stop.id === (mediaItem.spot_id ?? mediaItem.place_id))?.name ?? null })), index })}><Image source={{ uri: item.media_type === 'video' ? item.thumbnail_url ?? item.url : item.url }} style={{ width: (Dimensions.get('window').width - 32 - 8) / 3, aspectRatio: 1, borderRadius: 8 }} /><View style={{ position: 'absolute', right: 6, bottom: 6 }}>{item.media_type === 'video' ? <Ionicons name="play-circle" size={22} color="#fff" /> : null}</View></Pressable>)}
            </View>
          )}

          <SectionTitle icon="sparkles-outline" title={`Tricks${tricks.length ? ` · ${tricks.length}` : ''}`} c={c} />
          {proLocked ? <ProPrompt text="Keep a trick log for every session stop." onPress={onOpenPro} c={c} /> : loading ? <ActivityIndicator color={c.accent} /> : tricks.length === 0 ? <EmptySection text="No tricks logged for this session." c={c} /> : <View style={{ backgroundColor: c.tagBg, borderRadius: 16, padding: 14 }}>{tricks.map((trick, index) => <View key={trick.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: index === tricks.length - 1 ? 0 : 1, borderBottomColor: c.border }}><Ionicons name="flash-outline" size={18} color={c.accent} /><Text style={{ flex: 1, color: c.text, fontWeight: '700', marginLeft: 9 }}>{trick.trick_name}</Text><Text style={{ color: c.subtext, fontSize: 12 }}>{trick.spot?.name ?? 'Session'}</Text></View>)}</View>}

          <SectionTitle icon="people-outline" title={`Friends${participants.length ? ` · ${participants.length}` : ''}`} c={c} />
          {proLocked ? <ProPrompt text="See who joined your session." onPress={onOpenPro} c={c} /> : loading ? <ActivityIndicator color={c.accent} /> : participants.length === 0 ? <EmptySection text="No friends joined this session." c={c} /> : <View style={{ backgroundColor: c.tagBg, borderRadius: 16, padding: 14 }}>{participants.map((participant) => <Pressable key={participant.user_id} onPress={() => { onClose(); onViewProfile?.(participant.user_id); }} disabled={!onViewProfile} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}><Image source={participant.avatar_url ? { uri: participant.avatar_url } : undefined} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.border }} /><Text style={{ color: c.text, fontWeight: '700', marginLeft: 10 }}>{participant.username ?? 'Skater'}</Text><Text style={{ color: c.subtext, fontSize: 12, marginLeft: 'auto' }}>{participant.status === 'accepted' ? 'Joined' : participant.status}</Text></Pressable>)}</View>}
        </ScrollView>
      </View>
      <SessionMediaViewerModal visible={viewer !== null} onClose={() => setViewer(null)} mediaList={viewer?.list ?? []} initialIndex={viewer?.index ?? 0} currentUserId={currentUserId} />
    </Modal>
  );
}

function SectionTitle({ icon, title, c }: { icon: keyof typeof Ionicons.glyphMap; title: string; c: any }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 23, marginBottom: 9 }}><Ionicons name={icon} size={18} color={c.accent} /><Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginLeft: 7 }}>{title}</Text></View>;
}

function EmptySection({ text, c }: { text: string; c: any }) {
  return <View style={{ backgroundColor: c.tagBg, borderRadius: 16, padding: 16 }}><Text style={{ color: c.subtext }}>{text}</Text></View>;
}

function ProPrompt({ text, onPress, c }: { text: string; onPress: () => void; c: any }) {
  return <Pressable onPress={onPress} style={{ backgroundColor: c.tagBg, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}><CrownIcon size={20} /><Text style={{ color: c.subtext, flex: 1, marginLeft: 9, fontSize: 13 }}>{text}</Text><Text style={{ color: c.accent, fontWeight: '800', fontSize: 13 }}>Pro</Text></Pressable>;
}
