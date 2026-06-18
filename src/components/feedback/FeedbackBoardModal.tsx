import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/libs/supabase';
import { Session } from '@supabase/supabase-js';
import { useTheme } from '@/src/context/ThemeContext';
import { useFeedback, FeedbackPost, FeedbackSort, FeedbackCategory } from '@/src/hooks/useFeedback';
import { FeedbackPostModal } from './FeedbackPostModal';

const CATEGORIES: { key: FeedbackCategory; label: string }[] = [
  { key: 'feature', label: 'Feature' },
  { key: 'bug', label: 'Bug' },
  { key: 'other', label: 'Other' },
];
const CATEGORY_LABEL: Record<string, string> = {
  feature: 'Feature',
  bug: 'Bug',
  enhancement: 'Enhancement',
  other: 'Other',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  session: Session | null;
};

export function FeedbackBoardModal({ visible, onClose, session }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { posts, loading, loadPosts, createPost, vote, deletePost, reportPost } = useFeedback();

  const [sort, setSort] = useState<FeedbackSort>('new');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState<FeedbackCategory>('feature');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
      loadPosts(sort);
    }
  }, [visible, sort]);

  const selectedPost = posts.find((p) => p.id === selectedId) ?? null;

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    const err = await createPost(newTitle, newBody, newCategory);
    setSubmitting(false);
    if (err) {
      Alert.alert('Cannot post', err);
      return;
    }
    setNewTitle('');
    setNewBody('');
    setNewCategory('feature');
    setComposeOpen(false);
    loadPosts(sort);
  }

  function confirmDeletePost(postId: string) {
    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePost(postId) },
    ]);
  }

  function requireAuth(action: () => void) {
    if (!session) {
      Alert.alert('Sign in required', 'Create a free account to vote, post, or report feedback.', [
        { text: 'OK' },
      ]);
      return;
    }
    action();
  }

  function renderPost({ item }: { item: FeedbackPost }) {
    return (
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: c.surface,
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
        }}>
        {/* vote column */}
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            paddingVertical: 12,
            backgroundColor: c.headerBg,
          }}>
          <Pressable onPress={() => requireAuth(() => vote(item.id, 1))} hitSlop={6}>
            <Ionicons name="caret-up" size={24} color={item.my_vote === 1 ? c.buttonBg : c.subtext} />
          </Pressable>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{item.score}</Text>
          <Pressable onPress={() => requireAuth(() => vote(item.id, -1))} hitSlop={6}>
            <Ionicons name="caret-down" size={24} color={item.my_vote === -1 ? c.danger : c.subtext} />
          </Pressable>
        </View>

        {/* body (tap to open) */}
        <Pressable onPress={() => setSelectedId(item.id)} style={{ flex: 1, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View
              style={{
                backgroundColor: c.border,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}>
              <Text style={{ color: c.subtext, fontSize: 11, fontWeight: '600' }}>
                {CATEGORY_LABEL[item.category]}
              </Text>
            </View>
            <Text style={{ color: c.subtext, fontSize: 12 }} numberOfLines={1}>
              {item.profiles?.username ?? 'Unknown'}
            </Text>
          </View>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ color: c.subtext, fontSize: 13, marginTop: 2 }} numberOfLines={2}>
            {item.body}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="chatbubble-outline" size={14} color={c.subtext} />
              <Text style={{ color: c.subtext, fontSize: 12 }}>{item.comment_count}</Text>
            </View>
            {item.user_id === currentUserId ? (
              <Pressable onPress={() => confirmDeletePost(item.id)} hitSlop={6}>
                <Ionicons name="trash-outline" size={15} color={c.subtext} />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background }}>
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
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Feedback</Text>
          <Pressable onPress={() => setComposeOpen(true)} hitSlop={10}>
            <Ionicons name="add-circle-outline" size={26} color={c.buttonBg} />
          </Pressable>
        </View>

        {/* sort tabs */}
        <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
          {(['new', 'top'] as FeedbackSort[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSort(s)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: sort === s ? c.buttonBg : c.surface,
                borderWidth: 1,
                borderColor: sort === s ? c.buttonBg : c.border,
              }}>
              <Text
                style={{
                  color: sort === s ? c.background : c.text,
                  fontWeight: '600',
                  fontSize: 13,
                }}>
                {s === 'new' ? 'New' : 'Top'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <ActivityIndicator color={c.subtext} />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            contentContainerStyle={[
              { paddingVertical: 8 },
              posts.length === 0 && { flexGrow: 1, justifyContent: 'center' },
            ]}
            ListEmptyComponent={
              <Text style={{ color: c.subtext, fontSize: 14, textAlign: 'center', padding: 24 }}>
                No feedback yet. Tap + to share an idea, bug, or request.
              </Text>
            }
          />
        )}
      </View>

      {/* detail */}
      <FeedbackPostModal
        visible={selectedId !== null}
        post={selectedPost}
        currentUserId={currentUserId}
        onClose={() => setSelectedId(null)}
        onVote={(value) => requireAuth(() => selectedPost && vote(selectedPost.id, value))}
        onReport={async (reason) => {
          requireAuth(async () => {
            if (!selectedPost) return;
            await reportPost(selectedPost.id, reason);
            Alert.alert('Thanks', 'Post reported.');
          });
        }}
      />

      {/* compose */}
      <Modal visible={composeOpen} animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: c.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            <Pressable onPress={() => setComposeOpen(false)} hitSlop={10}>
              <Text style={{ color: c.subtext, fontSize: 16 }}>Cancel</Text>
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>New Post</Text>
            <Pressable onPress={handleSubmit} disabled={submitting} hitSlop={10}>
              <Text style={{ color: c.buttonBg, fontSize: 16, fontWeight: '700' }}>
                {submitting ? '...' : 'Post'}
              </Text>
            </Pressable>
          </View>

          <View style={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  onPress={() => setNewCategory(cat.key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 16,
                    backgroundColor: newCategory === cat.key ? c.buttonBg : c.surface,
                    borderWidth: 1,
                    borderColor: newCategory === cat.key ? c.buttonBg : c.border,
                  }}>
                  <Text
                    style={{
                      color: newCategory === cat.key ? c.background : c.text,
                      fontWeight: '600',
                      fontSize: 13,
                    }}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={newTitle}
              onChangeText={(t) => setNewTitle(t.slice(0, 120))}
              placeholder="Title"
              placeholderTextColor={c.placeholder}
              style={{
                color: c.text,
                backgroundColor: c.surface,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                fontWeight: '600',
                borderWidth: 1,
                borderColor: c.border,
              }}
            />
            <TextInput
              value={newBody}
              onChangeText={(t) => setNewBody(t.slice(0, 2000))}
              placeholder="Describe your idea, bug, or request..."
              placeholderTextColor={c.placeholder}
              multiline
              style={{
                color: c.text,
                backgroundColor: c.surface,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                minHeight: 140,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: c.border,
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}
