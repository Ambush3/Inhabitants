import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast } from '@/src/context/ToastContext';
import { useCheckInMedia } from '@/src/hooks/useCheckInMedia';
import { SessionMediaViewerModal, ViewerMedia } from '@/src/components/SessionMediaViewerModal';

type Props = {
  userId: string | null;
  onViewProfile?: (userId: string) => void;
};

export function MyMediaGrid({ userId, onViewProfile }: Props) {
  const { theme } = useTheme();
  const toast = useToast();
  const c = theme.colors;
  const media = useCheckInMedia();
  const [viewerMedia, setViewerMedia] = useState<ViewerMedia | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) media.loadMediaForUser(userId);
  }, [userId]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function deleteSelected() {
    const toDelete = media.media.filter((m) => selectedIds.has(m.id));
    for (const m of toDelete) await media.deleteMedia(m);
    exitSelect();
  }

  if (media.media.length === 0) {
    return (
      <Text style={{ color: c.subtext, fontSize: 14, textAlign: 'center', marginTop: 24 }}>
        {"You haven't added any photos or videos yet."}
      </Text>
    );
  }

  return (
    <>
      {selectMode ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}>
          <Pressable onPress={exitSelect}>
            <Text style={{ fontSize: 14, color: c.accent, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontSize: 13, color: c.subtext }}>{selectedIds.size} selected</Text>
          <Pressable
            disabled={selectedIds.size === 0}
            onPress={() =>
              Alert.alert(
                `Delete ${selectedIds.size} item${selectedIds.size === 1 ? '' : 's'}?`,
                'This removes them everywhere.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: deleteSelected },
                ]
              )
            }
            style={{ opacity: selectedIds.size === 0 ? 0.4 : 1 }}>
            <Text style={{ fontSize: 14, color: c.danger, fontWeight: '700' }}>Delete</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={{ fontSize: 12, color: c.subtext, marginBottom: 12 }}>
          Tap to view · hold to select multiple
        </Text>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {media.media.map((m) => {
          const selected = selectedIds.has(m.id);
          const uri = m.media_type === 'video' ? m.thumbnail_url ?? m.url : m.url;
          return (
            <View key={m.id} style={{ position: 'relative' }}>
              <Pressable
                onPress={() => {
                  if (selectMode) toggleSelected(m.id);
                  else setViewerMedia({ id: m.id, url: m.url, media_type: m.media_type });
                }}
                onLongPress={() => {
                  if (!selectMode) setSelectMode(true);
                  toggleSelected(m.id);
                }}
                delayLongPress={300}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 10,
                  overflow: 'hidden',
                  backgroundColor: c.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: selectMode && !selected ? 0.5 : 1,
                }}>
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
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
              </Pressable>
              {selectMode ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    borderRadius: 12,
                    backgroundColor: selected ? c.accent : 'rgba(0,0,0,0.45)',
                  }}>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color="#fff"
                  />
                </View>
              ) : (
                <Pressable
                  onPress={() =>
                    Alert.alert('Delete this?', 'This removes it everywhere.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => media.deleteMedia(m) },
                    ])
                  }
                  hitSlop={6}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    borderRadius: 12,
                    padding: 4,
                  }}>
                  <Ionicons name="trash-outline" size={15} color="#fff" />
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <SessionMediaViewerModal
        visible={viewerMedia !== null}
        onClose={() => setViewerMedia(null)}
        mediaList={media.media.map((m) => ({
          id: m.id,
          url: m.url,
          media_type: m.media_type,
          thumbnail_url: m.thumbnail_url,
        }))}
        initialIndex={Math.max(0, media.media.findIndex((m) => m.id === viewerMedia?.id))}
        currentUserId={userId}
        onViewProfile={onViewProfile}
      />
    </>
  );
}
