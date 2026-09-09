import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { LiveSession, LiveSessionStop } from '@/src/hooks/useLiveSession';
import { CrownIcon } from '@/src/components/icons/CrownIcon';

type SessionStop = Omit<LiveSessionStop, 'addedAt'>;

function elapsedLabel(startedAt: string, endedAt?: string): string {
  const elapsedMs = Math.max(0, new Date(endedAt ?? Date.now()).getTime() - new Date(startedAt).getTime());
  const minutes = Math.max(0, Math.round(elapsedMs / 60000));
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return elapsedMs > 0 && minutes === 0 ? '<1m' : `${minutes}m`;
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
  onAddMedia,
  isPro = false,
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
  onAddMedia?: (stop: SessionStop) => void;
  isPro?: boolean;
  onEnd: () => void;
  onClearCompleted: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (visible && !activeSession && !lastCompleted) setTitle('');
  }, [visible, activeSession, lastCompleted]);

  const stopIds = useMemo(() => new Set(activeSession?.stops.map((stop) => stop.id) ?? []), [activeSession]);
  const choices = availableStops.filter((stop) => !stopIds.has(stop.id));

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
                {isPro ? <Ionicons name="camera-outline" size={20} color={c.accent} /> : <CrownIcon size={21} />}
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
              <Header label="Session complete" />
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={{ color: c.text, fontSize: 20, fontWeight: '800', marginBottom: 5 }}>{lastCompleted.title}</Text>
                <Text style={{ color: c.subtext, marginBottom: 18 }}>{elapsedLabel(lastCompleted.startedAt, new Date().toISOString())} · {lastCompleted.stops.length} spot{lastCompleted.stops.length === 1 ? '' : 's'}</Text>
                {lastCompleted.stops.map((stop) => <StopRow key={stop.id} stop={stop} />)}
                <Pressable onPress={() => { onClearCompleted(); onClose(); }} style={{ backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Header label="Live session" />
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#35B86B' }} />
                  <Text style={{ color: c.text, fontWeight: '800' }}>{activeSession?.title}</Text>
                </View>
                <Text style={{ color: c.subtext, marginBottom: 18 }}>{elapsedLabel(activeSession!.startedAt)} · {activeSession!.stops.length} stop{activeSession!.stops.length === 1 ? '' : 's'}</Text>
                {activeSession!.stops.length === 0 ? <Text style={{ color: c.subtext, paddingVertical: 16 }}>Add the first spot to your session.</Text> : activeSession!.stops.map((stop) => <StopRow key={stop.id} stop={stop} remove />)}
                <Text style={{ color: c.subtext, fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 7 }}>CHECK IN TO ADD</Text>
                <Text style={{ color: c.subtext, fontSize: 12, marginBottom: 5 }}>Choose a spot, park, or shop to check in and add it to this session.</Text>
                {choices.slice(0, 12).map((stop) => (
                  <Pressable key={stop.id} onPress={() => onAddStop(stop)}><StopRow stop={stop} /></Pressable>
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
