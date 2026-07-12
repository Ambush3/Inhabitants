import React, { useEffect, useRef, useState } from 'react';
import { showAlert } from '@/src/components/ui/ThemedAlert';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast } from '@/src/context/ToastContext';
import { useEventComments, EventComment } from '@/src/hooks/useEventComments';

type Props = {
  visible: boolean;
  onClose: () => void;
  eventId: string | null;
  eventTitle: string | null;
  currentUserId: string | null;
  onCommentCountChange?: (count: number) => void;
  onViewProfile?: (userId: string) => void;
};

export function EventCommentsModal({
  visible,
  onClose,
  eventId,
  eventTitle,
  currentUserId,
  onCommentCountChange,
  onViewProfile,
}: Props) {
  const { theme } = useTheme();
  const toast = useToast();
  const c = theme.colors;
  const { comments, loading, loadComments, addComment, deleteComment, clearComments } = useEventComments();
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && eventId) {
      loadComments(eventId);
    } else {
      clearComments();
      setInput('');
    }
  }, [visible, eventId]);

  useEffect(() => {
    if (comments.length > 0) {
      onCommentCountChange?.(comments.length);
    }
  }, [comments.length]);

  function timeAgo(iso: string): string {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  async function handleSubmit() {
    if (!eventId || !currentUserId || !input.trim()) return;
    setSubmitting(true);
    const err = await addComment(eventId, input, currentUserId);
    setSubmitting(false);
    if (err) {
      toast.error(err);
      return;
    }
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function handleDelete(comment: EventComment) {
    showAlert('Delete comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteComment(comment.id),
      },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{
            ...require('react-native').StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '75%',
            paddingBottom: 16,
          }}>
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderColor: c.border,
            }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>
              {eventTitle ?? 'Comments'}
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={c.subtext} />
            </Pressable>
          </View>
          {loading ? (
            <Text style={{ color: c.subtext, fontSize: 13, padding: 16 }}>Loading...</Text>
          ) : comments.length === 0 ? (
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
              <Text style={{ color: c.subtext, fontSize: 13, opacity: 0.6, textAlign: 'center' }}>
                No comments yet. Be the first!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 16 }}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {item.profile?.avatar_url ? (
                    <Image
                      source={{ uri: item.profile.avatar_url }}
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
                  <View style={{ flex: 1 }}>
                    <Pressable
                      onPress={() => {
                        if (item.user_id !== currentUserId) {
                          onViewProfile?.(item.user_id);
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 2,
                      }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: item.user_id !== currentUserId ? c.accent : c.text,
                        }}>
                        @{item.profile?.username ?? 'unknown'}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.subtext }}>
                        {timeAgo(item.created_at)}
                      </Text>
                    </Pressable>
                    <Text style={{ fontSize: 14, color: c.text, lineHeight: 20 }}>
                      {item.content}
                    </Text>
                  </View>
                  {item.user_id === currentUserId ? (
                    <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={c.subtext} />
                    </Pressable>
                  ) : null}
                </View>
              )}
            />
          )}
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              paddingHorizontal: 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderColor: c.border,
            }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Add a comment..."
              placeholderTextColor={c.placeholder}
              multiline
              maxLength={500}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: c.inputBorder,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 14,
                color: c.text,
                backgroundColor: c.surface,
                maxHeight: 100,
              }}
            />
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || !input.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: input.trim() ? c.accent : c.tagBg,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-end',
              }}>
              <Ionicons name="send" size={18} color={input.trim() ? 'white' : c.subtext} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
