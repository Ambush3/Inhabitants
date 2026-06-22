import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useFeedbackComments } from '@/src/hooks/useFeedbackComments';
import { FeedbackPost } from '@/src/hooks/useFeedback';

const CATEGORY_LABEL: Record<string, string> = {
  feature: 'Feature',
  bug: 'Bug',
  enhancement: 'Enhancement',
  other: 'Other',
};

type Props = {
  visible: boolean;
  post: FeedbackPost | null;
  currentUserId: string | null;
  onClose: () => void;
  onVote: (value: -1 | 1) => void;
  onReport: (reason: string) => void;
};

export function FeedbackPostModal({ visible, post, currentUserId, onClose, onVote, onReport }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { comments, loading, loadComments, addComment, deleteComment, reportComment } =
    useFeedbackComments();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible && post) loadComments(post.id);
  }, [visible, post?.id]);

  if (!post) return null;

  async function handleSend() {
    if (!post || !input.trim() || sending) return;
    setSending(true);
    const err = await addComment(post.id, input);
    setSending(false);
    if (err) {
      Alert.alert('Cannot post', err);
      return;
    }
    setInput('');
  }

  function confirmReportComment(commentId: string) {
    Alert.alert('Report comment?', 'Flag this comment for review.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: async () => {
          await reportComment(commentId, 'reported by user');
          Alert.alert('Thanks', 'Comment reported.');
        },
      },
    ]);
  }

  function confirmDeleteComment(commentId: string) {
    if (!post) return;
    Alert.alert('Delete comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteComment(commentId, post.id),
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* header */}
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderColor: c.border,
            backgroundColor: c.headerBg,
          }}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={c.text} />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Post</Text>
          <Pressable onPress={() => onReport('reported by user')} hitSlop={10}>
            <Ionicons name="flag-outline" size={20} color={c.subtext} />
          </Pressable>
        </View>

        {/* pinned topic */}
        <View
          style={{
            flexDirection: 'row',
            padding: 16,
            gap: 12,
            borderBottomWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
          }}>
          <View style={{ alignItems: 'center', width: 44 }}>
            <Pressable onPress={() => onVote(1)} hitSlop={8}>
              <Ionicons
                name="caret-up"
                size={26}
                color={post.my_vote === 1 ? c.buttonBg : c.subtext}
              />
            </Pressable>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{post.score}</Text>
            <Pressable onPress={() => onVote(-1)} hitSlop={8}>
              <Ionicons
                name="caret-down"
                size={26}
                color={post.my_vote === -1 ? c.danger : c.subtext}
              />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View
                style={{
                  backgroundColor: c.border,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}>
                <Text style={{ color: c.subtext, fontSize: 11, fontWeight: '600' }}>
                  {CATEGORY_LABEL[post.category]}
                </Text>
              </View>
              <Text style={{ color: c.subtext, fontSize: 12 }}>
                {post.profiles?.username ?? 'Unknown'}
              </Text>
            </View>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 17, marginBottom: 6 }}>
              {post.title}
            </Text>
            <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{post.body}</Text>
          </View>
        </View>

        {/* comments */}
        {loading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <ActivityIndicator color={c.subtext} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              { padding: 16, gap: 16 },
              comments.length === 0 && { flexGrow: 1, justifyContent: 'center' },
            ]}
            ListEmptyComponent={
              <Text style={{ color: c.subtext, fontSize: 14, textAlign: 'center' }}>
                No comments yet. Start the discussion!
              </Text>
            }
            renderItem={({ item }) => {
              const isAdmin = !!item.profiles?.is_admin;
              return (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {item.profiles?.avatar_url ? (
                  <Image
                    source={{ uri: item.profiles.avatar_url }}
                    style={{ width: 32, height: 32, borderRadius: 16 }}
                  />
                ) : (
                  <View
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.border }}
                  />
                )}
                <View
                  style={{
                    flex: 1,
                    ...(isAdmin
                      ? {
                          backgroundColor: 'rgba(0,122,255,0.10)',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: 'rgba(0,122,255,0.25)',
                          padding: 8,
                        }
                      : {}),
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={{
                        color: isAdmin ? '#007AFF' : c.text,
                        fontWeight: '700',
                        fontSize: 13,
                      }}>
                      {item.profiles?.username ?? 'Unknown'}
                    </Text>
                    {isAdmin ? (
                      <View
                        style={{
                          backgroundColor: '#007AFF',
                          borderRadius: 5,
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                        }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>TEAM</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: c.text, fontSize: 14, marginTop: 2 }}>{item.content}</Text>
                </View>
                <Pressable
                  onPress={() =>
                    item.user_id === currentUserId
                      ? confirmDeleteComment(item.id)
                      : confirmReportComment(item.id)
                  }
                  hitSlop={8}>
                  <Ionicons
                    name={item.user_id === currentUserId ? 'trash-outline' : 'flag-outline'}
                    size={16}
                    color={c.subtext}
                  />
                </Pressable>
              </View>
              );
            }}
          />
        )}

        {/* input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 16,
            borderTopWidth: 1,
            borderColor: c.border,
            paddingBottom: insets.bottom + 16,
            backgroundColor: c.headerBg,
          }}>
          <TextInput
            value={input}
            onChangeText={(t) => setInput(t.slice(0, 1000))}
            placeholder="Add a comment..."
            placeholderTextColor={c.placeholder}
            multiline
            style={{
              flex: 1,
              color: c.text,
              backgroundColor: c.surface,
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 10,
              maxHeight: 100,
            }}
          />
          <Pressable onPress={handleSend} disabled={!input.trim() || sending} hitSlop={8}>
            <Ionicons
              name="send"
              size={22}
              color={input.trim() && !sending ? c.buttonBg : c.subtext}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
