import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import {
  formatLiveSessionDuration,
  isLiveSessionPaused,
  LiveSession,
  LiveSessionStop,
} from '@/src/hooks/useLiveSession';

type SessionStop = Omit<LiveSessionStop, 'addedAt'>;

function distanceBetween(a: SessionStop, b: SessionStop): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function LiveSessionModal({
  visible,
  onClose,
  activeSession,
  lastCompleted,
  availableStops,
  initialStop,
  onStart,
  onAddStop,
  onRemoveStop,
  onPause,
  onResume,
  onAddMedia,
  onEnd,
  onClearCompleted,
}: {
  visible: boolean;
  onClose: () => void;
  activeSession: LiveSession | null;
  lastCompleted: LiveSession | null;
  availableStops: SessionStop[];
  initialStop?: SessionStop;
  onStart: (title: string, firstStop?: SessionStop) => void;
  onAddStop: (stop: SessionStop) => void;
  onRemoveStop: (stopId: string) => void;
  onPause: () => void;
  onResume: () => void;
  onAddMedia?: (stop: SessionStop) => void;
  onEnd: () => void;
  onClearCompleted: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [title, setTitle] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (visible && !activeSession && !lastCompleted) setTitle('');
  }, [visible, activeSession, lastCompleted]);

  useEffect(() => {
    setNow(Date.now());
    if (!visible || !activeSession || isLiveSessionPaused(activeSession)) return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [visible, activeSession]);

  const stopIds = useMemo(() => new Set(activeSession?.stops.map((stop) => stop.id) ?? []), [activeSession]);
  const choices = availableStops.filter((stop) => !stopIds.has(stop.id));
  const completedDistance = useMemo(
    () => lastCompleted?.stops.slice(1).reduce((total, stop, index) => total + distanceBetween(lastCompleted.stops[index], stop), 0) ?? 0,
    [lastCompleted]
  );

  async function shareRecap() {
    if (!lastCompleted) return;
    try {
      await Share.share({
        message: `${lastCompleted.title}\n${formatLiveSessionDuration(lastCompleted)} · ${lastCompleted.stops.length} stop${lastCompleted.stops.length === 1 ? '' : 's'}${completedDistance > 0 ? ` · ${completedDistance.toFixed(1)} mi` : ''}\n${lastCompleted.stops.map((stop) => stop.name).join(' → ') || 'No stops recorded'}`,
      });
    } catch {
      // Sharing can be dismissed without requiring an error message.
    }
  }

  function Header({ label }: { label: string }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 18 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: c.text }}>{label}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={24} color={c.subtext} />
        </Pressable>
      </View>
    );
  }

  function StopRow({ stop, remove }: { stop: SessionStop; remove?: boolean }) {
    const stopIndex = activeSession?.stops.findIndex((item) => item.id === stop.id) ?? -1;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{stopIndex >= 0 ? stopIndex + 1 : '+'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: '700' }} numberOfLines={1}>{stop.name}</Text>
          <Text style={{ color: c.subtext, fontSize: 12 }}>{stop.type === 'skateshop' ? 'Skate shop' : stop.type === 'skatepark' ? 'Skate park' : 'Skate spot'}</Text>
        </View>
        {remove ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {onAddMedia ? (
              <Pressable onPress={() => onAddMedia(stop)} hitSlop={8}>
                <Ionicons name="camera-outline" size={20} color={c.accent} />
              </Pressable>
            ) : null}
            <Pressable onPress={() => onRemoveStop(stop.id)} hitSlop={8}>
              <Ionicons name="close-circle-outline" size={21} color={c.subtext} />
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', backgroundColor: c.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 20, paddingBottom: 28 }}>
          {!activeSession && !lastCompleted ? (
            <>
              <Header label="Start a live session" />
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
                <Text style={{ color: c.subtext, lineHeight: 20, marginBottom: 16 }}>
                  Track the spots you skate today and turn the session into a recap when you’re done.
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Session name (optional)"
                  placeholderTextColor={c.placeholder}
                  style={{ color: c.text, backgroundColor: c.tagBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14 }}
                />
                {initialStop ? (
                  <View style={{ backgroundColor: c.tagBg, borderRadius: 12, padding: 12, marginBottom: 16 }}>
                    <Text style={{ color: c.subtext, fontSize: 12, marginBottom: 4 }}>Start at</Text>
                    <Text style={{ color: c.text, fontWeight: '700' }}>{initialStop.name}</Text>
                  </View>
                ) : null}
                <Pressable onPress={() => onStart(title, initialStop)} style={{ backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Start session</Text>
                </Pressable>
              </ScrollView>
            </>
          ) : lastCompleted ? (
            <>
              <Header label="Session recap" />
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4 }}>
                <View style={{ backgroundColor: c.tagBg, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#35B86B' }} />
                    <Text style={{ color: '#35B86B', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>SESSION COMPLETE</Text>
                  </View>
                  <Text style={{ color: c.text, fontSize: 24, fontWeight: '800' }}>{lastCompleted.title}</Text>
                  <Text style={{ color: c.subtext, marginTop: 5 }}>
                    {new Date(lastCompleted.startedAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                  {[
                    ['timer-outline', formatLiveSessionDuration(lastCompleted)],
                    ['location-outline', `${lastCompleted.stops.length} stop${lastCompleted.stops.length === 1 ? '' : 's'}`],
                    ['navigate-outline', completedDistance > 0 ? `${completedDistance.toFixed(1)} mi` : '—'],
                  ].map(([icon, value]) => (
                    <View key={value} style={{ flex: 1, backgroundColor: c.tagBg, borderRadius: 13, paddingVertical: 12, alignItems: 'center' }}>
                      <Ionicons name={icon as any} size={19} color={c.accent} />
                      <Text style={{ color: c.text, fontWeight: '800', fontSize: 12, marginTop: 5 }}>{value}</Text>
                    </View>
                  ))}
                </View>
                <Text style={{ color: c.subtext, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 }}>YOUR ROUTE</Text>
                <View style={{ backgroundColor: c.tagBg, borderRadius: 16, paddingHorizontal: 14 }}>
                  {lastCompleted.stops.length === 0 ? (
                    <Text style={{ color: c.subtext, paddingVertical: 16 }}>No stops recorded.</Text>
                  ) : lastCompleted.stops.map((stop, index) => (
                    <View key={`${stop.type}:${stop.id}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: index === lastCompleted.stops.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
                      <View style={{ width: 29, height: 29, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginRight: 11 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontWeight: '700' }} numberOfLines={1}>{stop.name}</Text>
                        <Text style={{ color: c.subtext, fontSize: 12, marginTop: 2 }}>{stop.type === 'skateshop' ? 'Skate shop' : stop.type === 'skatepark' ? 'Skate park' : 'Skate spot'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <Pressable onPress={shareRecap} style={{ borderWidth: 1, borderColor: c.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 18 }}>
                  <Ionicons name="share-outline" size={18} color={c.accent} />
                  <Text style={{ color: c.accent, fontWeight: '800' }}>Share recap</Text>
                </Pressable>
                <Pressable onPress={() => { onClearCompleted(); onClose(); }} style={{ backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
                </Pressable>
              </ScrollView>
            </>
          ) : (
            <>
              <Header label="Live session" />
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: isLiveSessionPaused(activeSession!) ? c.subtext : '#35B86B' }} />
                  <Text style={{ color: c.text, fontWeight: '800' }}>{activeSession?.title}</Text>
                </View>
                <Text style={{ color: c.subtext, marginBottom: 10 }}>
                  {isLiveSessionPaused(activeSession!) ? 'Paused · ' : ''}{formatLiveSessionDuration(activeSession!, now)} · {activeSession!.stops.length} stop{activeSession!.stops.length === 1 ? '' : 's'}
                </Text>
                <Pressable
                  onPress={isLiveSessionPaused(activeSession!) ? onResume : onPause}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: c.tagBg, borderRadius: 11, paddingVertical: 11, marginBottom: 8 }}>
                  <Ionicons name={isLiveSessionPaused(activeSession!) ? 'play' : 'pause'} size={17} color={c.accent} />
                  <Text style={{ color: c.accent, fontWeight: '800' }}>{isLiveSessionPaused(activeSession!) ? 'Resume session' : 'Pause session'}</Text>
                </Pressable>
                {activeSession!.stops.length === 0 ? <Text style={{ color: c.subtext, paddingVertical: 16 }}>Add the first spot to your session.</Text> : activeSession!.stops.map((stop) => <StopRow key={`${stop.type}:${stop.id}`} stop={stop} remove />)}
                <Text style={{ color: c.subtext, fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 7 }}>CHECK IN TO ADD</Text>
                <Text style={{ color: c.subtext, fontSize: 12, marginBottom: 5 }}>Choose a spot, park, or shop to check in and add it to this session.</Text>
                {choices.slice(0, 12).map((stop) => (
                  <Pressable key={`${stop.type}:${stop.id}`} onPress={() => onAddStop(stop)}><StopRow stop={stop} /></Pressable>
                ))}
                {choices.length === 0 ? <Text style={{ color: c.subtext, paddingVertical: 12 }}>Open a spot on the map to add it here.</Text> : null}
                <Pressable onPress={onEnd} style={{ borderWidth: 1, borderColor: c.danger, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 20 }}>
                  <Text style={{ color: c.danger, fontWeight: '800' }}>End session</Text>
                </Pressable>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
