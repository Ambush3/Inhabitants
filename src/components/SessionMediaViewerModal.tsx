import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '@/src/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useCheckInMediaComments, CheckInMediaComment } from '@/src/hooks/useCheckInMediaComments';
import { useCheckInMediaLikes } from '@/src/hooks/useCheckInMediaLikes';

export type ViewerMedia = {
  id: string;
  url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  mediaList: ViewerMedia[];
  initialIndex?: number;
  currentUserId: string | null;
  onViewProfile?: (userId: string) => void;
};

const FLAG_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Other'];

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CommentRow({ item, currentUserId, c, mediaId, deleteComment, updateComment, flagComment, onViewProfile }: any) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const isOwn = item.user_id === currentUserId;

  async function handleSave() {
    if (!editText.trim()) return;
    setSaving(true);
    await updateComment(item.id, mediaId, editText.trim());
    setSaving(false);
    setEditing(false);
  }

  function handleFlag() {
    Alert.alert('Flag comment', 'Why are you reporting this?', [
      ...FLAG_REASONS.map((reason) => ({
        text: reason,
        onPress: () => flagComment(item.id, reason),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
      {item.profiles?.avatar_url ? (
        <Image source={{ uri: item.profiles.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16 }} />
      ) : (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.border }} />
      )}
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={() => {
            if (onViewProfile && !isOwn) onViewProfile(item.user_id);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text style={{ fontWeight: '600', fontSize: 13, color: !isOwn ? c.accent : c.text }}>
            {item.profiles?.username ?? 'Unknown'}
          </Text>
          <Text style={{ fontSize: 11, color: c.subtext }}>{timeAgo(item.created_at)}</Text>
        </Pressable>
        {editing ? (
          <View style={{ gap: 6 }}>
            <TextInput
              value={editText}
              onChangeText={(t) => setEditText(t.slice(0, 280))}
              multiline
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: c.inputBorder,
                borderRadius: 8,
                padding: 8,
                fontSize: 14,
                color: c.text,
                backgroundColor: c.surface,
                maxHeight: 80,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={handleSave} disabled={saving || !editText.trim()} style={{ opacity: saving || !editText.trim() ? 0.4 : 1 }}>
                <Text style={{ fontSize: 12, color: c.accent, fontWeight: '700' }}>{saving ? 'Saving...' : 'Save'}</Text>
              </Pressable>
              <Pressable onPress={() => { setEditing(false); setEditText(item.content); }}>
                <Text style={{ fontSize: 12, color: c.subtext, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              isOwn ? setEditing(true) : handleFlag();
            }}
            delayLongPress={400}>
            <Text style={{ fontSize: 14, color: c.text }}>{item.content}</Text>
            {item.updated_at && item.updated_at !== item.created_at ? (
              <Text style={{ fontSize: 10, color: c.subtext, marginTop: 2 }}>edited</Text>
            ) : null}
          </Pressable>
        )}
      </View>
      {isOwn && !editing ? (
        <Pressable onPress={() => deleteComment(item.id, mediaId)}>
          <Ionicons name="trash-outline" size={16} color={c.subtext} />
        </Pressable>
      ) : null}
    </View>
  );
}

function VideoPlayerView({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="contain"
      nativeControls
    />
  );
}

export function SessionMediaViewerModal({
  visible,
  onClose,
  mediaList,
  initialIndex = 0,
  currentUserId,
  onViewProfile,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { comments, loading, loadComments, addComment, updateComment, deleteComment, flagComment, resetComments } =
    useCheckInMediaComments();
  const { count: likeCount, liked, loadLikes, toggleLike, reset: resetLikes } = useCheckInMediaLikes();
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [activeAspect, setActiveAspect] = useState(1.4); // width / height
  const listRef = useRef<FlatList>(null);
  const pagerRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get('window').width;

  const active = mediaList[activeIndex] ?? null;

  // Measure the on-screen media's aspect ratio so we can size the image to it
  // (no big letterbox gap between the image and the action bar).
  useEffect(() => {
    const uri = active?.media_type === 'video' ? active?.thumbnail_url : active?.url;
    if (!uri) return;
    RNImage.getSize(
      uri,
      (w, h) => h > 0 && setActiveAspect(w / h),
      () => setActiveAspect(1.4)
    );
  }, [active?.id]);

  // Reset to the tapped item each time the viewer opens.
  useEffect(() => {
    if (visible) setActiveIndex(initialIndex);
  }, [visible, initialIndex]);

  useEffect(() => {
    if (visible && active) {
      loadComments(active.id);
      loadLikes(active.id);
    }
  }, [visible, active?.id]);

  useEffect(() => {
    if (!visible) {
      resetComments();
      resetLikes();
      setInput('');
    }
  }, [visible]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  async function handleSubmit() {
    if (!active || !input.trim() || submitting) return;
    setSubmitting(true);
    const err = await addComment(active.id, input.trim());
    setSubmitting(false);
    if (err) {
      Alert.alert('Could not post', err);
      return;
    }
    setInput('');
  }

  const renderComment = useCallback(
    ({ item }: { item: CheckInMediaComment }) => (
      <CommentRow
        item={item}
        currentUserId={currentUserId}
        c={c}
        mediaId={active?.id}
        deleteComment={deleteComment}
        updateComment={updateComment}
        flagComment={flagComment}
        onViewProfile={onViewProfile}
      />
    ),
    [currentUserId, c, active?.id, deleteComment, updateComment, flagComment, onViewProfile]
  );

  const commentsMaxHeight = Math.round(Dimensions.get('window').height * 0.3);
  const mediaMaxHeight = Math.round(Dimensions.get('window').height * 0.6);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: '#000',
          }}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>

        {/* Media + like — vertically centered as a block */}
        <View style={{ flex: 1, justifyContent: 'center', overflow: 'hidden', backgroundColor: '#000' }}>
          <View
            style={{
              width: '100%',
              height: Math.min(screenWidth / activeAspect, mediaMaxHeight),
              flexShrink: 1,
            }}>
            <FlatList
              ref={pagerRef}
              data={mediaList}
              keyExtractor={(m) => m.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              style={{ flex: 1 }}
              renderItem={({ item, index }) => (
                <View style={{ width: screenWidth, height: '100%', backgroundColor: '#000' }}>
                  {item.media_type === 'video' ? (
                    index === activeIndex ? (
                      <VideoPlayerView uri={item.url} />
                    ) : (
                      <Image
                        source={{ uri: item.thumbnail_url ?? item.url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                      />
                    )
                  ) : (
                    <Image
                      source={{ uri: item.url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="contain"
                    />
                  )}
                </View>
              )}
            />
            {mediaList.length > 1 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  alignSelf: 'center',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                  {activeIndex + 1} / {mediaList.length}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Like bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}>
            <Pressable
              onPress={() => active && toggleLike(active.id)}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
                size={22}
                color={liked ? '#fff' : 'rgba(255,255,255,0.6)'}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: liked ? '800' : '500',
                  color: liked ? '#fff' : 'rgba(255,255,255,0.6)',
                }}>
                {likeCount}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Comments — capped so it never dominates */}
        {loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator color={c.subtext} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <Text style={{ color: c.subtext, fontSize: 14, textAlign: 'center', paddingVertical: 8 }}>
                No comments yet. Be the first!
              </Text>
            }
            style={{ flexGrow: 0, flexShrink: 1, maxHeight: commentsMaxHeight }}
          />
        )}

        {/* Input — pinned at the bottom */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 16,
            borderTopWidth: 1,
            borderColor: c.border,
            paddingBottom: insets.bottom + 12,
          }}>
          <TextInput
            value={input}
            onChangeText={(t) => setInput(t.slice(0, 280))}
            placeholder="Add a comment..."
            placeholderTextColor={c.placeholder}
            multiline
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: c.inputBorder,
              borderRadius: 10,
              padding: 10,
              fontSize: 14,
              color: c.text,
              backgroundColor: c.surface,
              maxHeight: 80,
            }}
          />
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !input.trim()}
            style={{ opacity: submitting || !input.trim() ? 0.4 : 1 }}>
            <Ionicons name="send" size={24} color={c.accent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
