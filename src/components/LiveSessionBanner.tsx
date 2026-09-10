import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { LiveSession } from '@/src/hooks/useLiveSession';

function elapsedLabel(startedAt: string): string {
  const elapsedMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
  const minutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function LiveSessionBanner({
  session,
  onPress,
  style,
}: {
  session: LiveSession;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [elapsed, setElapsed] = useState(() => elapsedLabel(session.startedAt));

  useEffect(() => {
    setElapsed(elapsedLabel(session.startedAt));
    const timer = setInterval(() => setElapsed(elapsedLabel(session.startedAt)), 30000);
    return () => clearInterval(timer);
  }, [session.startedAt]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open live session ${session.title}`}
      style={({ pressed }) => [{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.tagBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.accent,
        paddingHorizontal: 9,
        paddingVertical: 5,
        opacity: pressed ? 0.85 : 1,
        maxWidth: 190,
      }, style, { opacity: pressed ? 0.85 : 1 }] }>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#35B86B', marginRight: 7 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 11, fontWeight: '800' }} numberOfLines={1}>
          {session.title}
        </Text>
        <Text style={{ color: c.subtext, fontSize: 10, marginTop: 1 }}>
          {elapsed} · {session.stops.length} stop{session.stops.length === 1 ? '' : 's'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={c.accent} />
    </Pressable>
  );
}
