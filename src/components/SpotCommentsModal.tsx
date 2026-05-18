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
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useSpotComments, SpotComment } from '@/src/hooks/useSpotComments';

type Props = {
  visible: boolean;
  onClose: () => void;
  spotId: string | null;
  spotName: string | null;
  currentUserId: string | null;
  onCommentCountChange?: (count: number) => void;
  onViewProfile?: (userId: string) => void;
  friendIds?: Set<string>;
};

function CommentRow({ item, currentUserId, deleteComment, c, onViewProfile, friendIds }: any) {
  const isOwn = item.user_id === currentUserId;
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 10,
      }}>
      {item.profiles?.avatar_url ? (
        <Image source={{ uri: item.profiles.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16 }} />
      ) : (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.border }} />
      )}
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={() => {
            if (onViewProfile && item.user_id !== currentUserId) {
              onViewProfile(item.user_id);
            }
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text
            style={{
              fontWeight: '600',
              fontSize: 13,
              color: item.user_id !== currentUserId ? '#007AFF' : c.text,
            }}>
            {item.profiles?.username ?? 'Unknown'}
          </Text>
          {friendIds?.has(item.user_id) ? (
            <View
              style={{
                backgroundColor: 'rgba(0,122,255,0.12)',
                borderRadius: 6,
                paddingHorizontal: 5,
                paddingVertical: 2,
              }}>
              <Text style={{ fontSize: 9, color: '#007AFF', fontWeight: '700' }}>FRIEND</Text>
            </View>
          ) : null}
          <Text style={{ fontSize: 11, color: c.subtext }}>{timeAgo(item.created_at)}</Text>
        </Pressable>
        <Text style={{ fontSize: 14, color: c.text }}>{item.content}</Text>
      </View>
      {isOwn && (
        <Pressable onPress={() => deleteComment(item.id, item.spot_id)}>
          <Ionicons name="trash-outline" size={16} color={c.subtext} />
        </Pressable>
      )}
    </Animated.View>
  );
}

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SpotCommentsModal({
  visible,
  onClose,
  spotId,
  spotName,
  currentUserId,
  onCommentCountChange,
  onViewProfile,
  friendIds,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const {
    comments,
    commentCount: liveCount,
    loading,
    loadComments,
    addComment,
    deleteComment,
    resetComments,
  } = useSpotComments();
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && spotId) {
      loadComments(spotId);
    }
  }, [visible, spotId]);

  useEffect(() => {
    if (!visible) {
      resetComments();
      setInput('');
    }
  }, [visible]);

  useEffect(() => {
    onCommentCountChange?.(liveCount);
  }, [liveCount]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  async function handleSubmit() {
    if (!spotId || !input.trim() || cooldown) return;
    setSubmitting(true);
    await addComment(spotId, input.trim());
    setInput('');
    setSubmitting(false);
    setCooldown(true);
    setCooldownSeconds(15);
    const interval = setInterval(() => {
      setCooldownSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setCooldown(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  const renderComment = useCallback(
    ({ item }: { item: SpotComment }) => {
      return (
        <CommentRow
          item={item}
          currentUserId={currentUserId}
          deleteComment={deleteComment}
          c={c}
          onViewProfile={onViewProfile}
          friendIds={friendIds}
        />
      );
    },
    [currentUserId, deleteComment, c]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={onClose}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: 500,
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
              <Ionicons
                name="chatbubbles-outline"
                size={20}
                color={c.subtext}
                style={{ marginRight: 8 }}
              />
              <Text style={{ flex: 1, fontWeight: '700', fontSize: 16, color: c.text }} numberOfLines={1}>
                {spotName ?? 'Comments'}
              </Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color={c.text} />
              </Pressable>
            </View>

            {loading ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator color={c.subtext} />
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={renderComment}
                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                ListEmptyComponent={
                  <Text
                    style={{ color: c.subtext, fontSize: 14, textAlign: 'center', marginTop: 24 }}>
                    No comments yet. Be the first!
                  </Text>
                }
                style={{ maxHeight: 300 }}
              />
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 16,
                borderTopWidth: 1,
                borderColor: c.border,
                paddingBottom: insets.bottom + 16,
              }}>
              <TextInput
                value={input}
                onChangeText={(text) => setInput(text.slice(0, 280))}
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
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 32 }}>
                {cooldown ? (
                  <Text style={{ fontSize: 11, color: c.subtext, fontWeight: '600' }}>
                    {cooldownSeconds}s
                  </Text>
                ) : (
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting || !input.trim()}
                    style={{ opacity: submitting || !input.trim() ? 0.4 : 1 }}>
                    <Ionicons name="send" size={24} color="#007AFF" />
                  </Pressable>
                )}
              </View>
            </View>
            {input.length > 200 ? (
              <Text
                style={{
                  fontSize: 11,
                  color: input.length >= 280 ? '#FF3B30' : c.subtext,
                  textAlign: 'right',
                  paddingRight: 16,
                  paddingBottom: 4,
                }}>
                {280 - input.length}
              </Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
