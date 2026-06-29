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
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import * as Haptics from 'expo-haptics';
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

function CommentRow({
  item,
  currentUserId,
  deleteComment,
  updateComment,
  flagComment,
  c,
  onViewProfile,
  friendIds,
}: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [otherText, setOtherText] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [flagged, setFlagged] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const isOwn = item.user_id === currentUserId;

  async function handleSave() {
    if (!editText.trim()) return;
    setSaving(true);
    await updateComment(item.id, item.spot_id, editText.trim());
    setSaving(false);
    setEditing(false);
  }

  async function handleFlag() {
    const reason = flagReason === 'Other' ? otherText.trim() : flagReason;
    if (!reason) return;
    setFlagging(true);
    await flagComment(item.id, reason);
    setFlagging(false);
    setFlagged(true);
    setFlagModalOpen(false);
    setFlagReason('');
    setOtherText('');
  }

  const FLAG_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Other'];

  return (
    <Animated.View
      style={{ opacity: fadeAnim, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
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
              color: item.user_id !== currentUserId ? c.accent : c.text,
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
              <Text style={{ fontSize: 9, color: c.accent, fontWeight: '700' }}>FRIEND</Text>
            </View>
          ) : null}
          {item.user_id === currentUserId ? (
            <View
              style={{
                backgroundColor: 'rgba(88,86,214,0.12)',
                borderRadius: 6,
                paddingHorizontal: 5,
                paddingVertical: 2,
              }}>
              <Text style={{ fontSize: 9, color: '#5856D6', fontWeight: '700' }}>YOU</Text>
            </View>
          ) : null}
          <Text style={{ fontSize: 11, color: c.subtext }}>{timeAgo(item.created_at)}</Text>
        </Pressable>
        {editing ? (
          <View style={{ gap: 6 }}>
            <TextInput
              value={editText}
              onChangeText={(t) => setEditText(t.slice(0, 280))}
              multiline
              autoFocus
              autoCorrect={true}
              spellCheck={true}
              autoCapitalize="sentences"
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
              <Pressable
                onPress={handleSave}
                disabled={saving || !editText.trim()}
                style={{ opacity: saving || !editText.trim() ? 0.4 : 1 }}>
                <Text style={{ fontSize: 12, color: c.accent, fontWeight: '700' }}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setEditing(false);
                  setEditText(item.content);
                }}>
                <Text style={{ fontSize: 12, color: c.subtext, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              isOwn ? setEditing(true) : setFlagModalOpen(true);
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
        <Pressable onPress={() => deleteComment(item.id, item.spot_id)}>
          <Ionicons name="trash-outline" size={16} color={c.subtext} />
        </Pressable>
      ) : null}

      <Modal
        visible={flagModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFlagModalOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setFlagModalOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Pressable
              style={{
                backgroundColor: c.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                gap: 10,
              }}
              onPress={() => { }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: c.text, marginBottom: 4 }}>
                Flag Comment
              </Text>
              {FLAG_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setFlagReason(reason)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                  }}>
                  <Ionicons
                    name={flagReason === reason ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={flagReason === reason ? c.accent : c.subtext}
                  />
                  <Text style={{ fontSize: 14, color: c.text }}>{reason}</Text>
                </Pressable>
              ))}
              {flagReason === 'Other' ? (
                <TextInput
                  value={otherText}
                  onChangeText={setOtherText}
                  placeholder="Describe the issue..."
                  placeholderTextColor={c.placeholder}
                  multiline
                  autoFocus
                  autoCapitalize="sentences"
                  style={{
                    borderWidth: 1,
                    borderColor: c.inputBorder,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: c.text,
                    backgroundColor: c.surface,
                    maxHeight: 80,
                    marginTop: 4,
                  }}
                />
              ) : null}
              <Pressable
                onPress={handleFlag}
                disabled={flagging || !flagReason || (flagReason === 'Other' && !otherText.trim())}
                style={{
                  backgroundColor: '#FF3B30',
                  borderRadius: 10,
                  padding: 13,
                  alignItems: 'center',
                  marginTop: 8,
                  opacity:
                    flagging || !flagReason || (flagReason === 'Other' && !otherText.trim())
                      ? 0.4
                      : 1,
                }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                  {flagging ? 'Submitting...' : 'Submit Flag'}
                </Text>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
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
    updateComment,
    deleteComment,
    flagComment,
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
          flagComment={flagComment}
          updateComment={updateComment}
          c={c}
          onViewProfile={onViewProfile}
          friendIds={friendIds}
        />
      );
    },
    [currentUserId, deleteComment, updateComment, flagComment, c]
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
                contentContainerStyle={[
                  { padding: 16, paddingBottom: 8 },
                  comments.length === 0 && { flexGrow: 1, justifyContent: 'center' },
                ]}
                ListEmptyComponent={
                  <Text style={{ color: c.subtext, fontSize: 14, textAlign: 'center' }}>
                    No comments yet. Be the first!
                  </Text>
                }
                style={comments.length === 0 ? { height: 200 } : { maxHeight: 300 }}
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
                autoCorrect={true}
                spellCheck={true}
                autoCapitalize="sentences"
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
                    <Ionicons name="send" size={24} color={c.accent} />
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
