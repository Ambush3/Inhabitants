import React from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { CheckInMedia } from '@/src/hooks/useCheckInMedia';

type Props = {
  media: CheckInMedia[];
  title?: string;
  size?: number;
  showUploader?: boolean;
  grid?: boolean;
  headerRight?: React.ReactNode;
  onPressMedia: (m: CheckInMedia) => void;
};

export function SessionMediaStrip({
  media,
  title,
  size = 96,
  showUploader = false,
  grid = false,
  headerRight,
  onPressMedia,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  if (!media.length) return null;

  const tile = (m: CheckInMedia, tileSize: number) => (
    <Pressable
      key={m.id}
      onPress={() => onPressMedia(m)}
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: c.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Image
        source={{ uri: m.media_type === 'video' ? m.thumbnail_url ?? m.url : m.url }}
        style={{ width: '100%', height: '100%' }}
      />
      {m.media_type === 'video' ? (
        <View
          style={{
            position: 'absolute',
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: 16,
            padding: 4,
          }}>
          <Ionicons name="play" size={18} color="#fff" />
        </View>
      ) : null}
      {showUploader && m.profiles?.username ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            paddingHorizontal: 6,
            paddingVertical: 3,
          }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
            @{m.profiles.username}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <View style={{ gap: 8 }}>
      {title || headerRight ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {title ? (
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>
              {title} · {media.length}
            </Text>
          ) : (
            <View />
          )}
          {headerRight}
        </View>
      ) : null}

      {grid ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {media.map((m) => tile(m, size))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {media.map((m) => tile(m, size))}
        </ScrollView>
      )}
    </View>
  );
}
