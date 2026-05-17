import React, { useEffect, useRef, useState } from 'react';
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
};

export function SpotCommentsModal({ visible, onClose, spotId, spotName, currentUserId, onCommentCountChange }: Props) {
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

  const flatListRef = useRef<FlatList>(null);

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

  async function handleSubmit() {
    if (!spotId || !input.trim() || cooldown) return;
    setSubmitting(true);
    await addComment(spotId, input.trim());
    setInput('');
    setSubmitting(false);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 15000);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
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

  function renderComment({ item }: { item: SpotComment }) {
    const isOwn = item.user_id === currentUserId;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
        {item.profiles?.avatar_url ? (
          <Image
            source={{ uri: item.profiles.avatar_url }}
            style={{ width: 32, height: 32, borderRadius: 16 }}
          />
        ) : (
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.border }} />
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={{ fontWeight: '600', fontSize: 13, color: c.text }}>
              {item.profiles?.username ?? 'Unknown'}
            </Text>
            <Text style={{ fontSize: 11, color: c.subtext }}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={{ fontSize: 14, color: c.text }}>{item.content}</Text>
        </View>
        {isOwn && (
          <Pressable onPress={() => deleteComment(item.id, item.spot_id)}>
            <Ionicons name="trash-outline" size={16} color={c.subtext} />
          </Pressable>
        )}
      </View>
    );
  }

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
                onChangeText={setInput}
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
                disabled={submitting || !input.trim() || cooldown}
                style={{ opacity: submitting || !input.trim() || cooldown ? 0.4 : 1 }}>
                <Ionicons name="send" size={24} color="#007AFF" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
