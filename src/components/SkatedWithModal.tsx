import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useFriendships } from '@/src/hooks/social/useFriendships';
import { MAX_TAGS_PER_CHECK_IN } from '@/src/hooks/useCheckInTags';

export function SkatedWithModal({
  visible,
  onClose,
  onConfirm,
  saving = false,
  initialSelected,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (userIds: string[]) => void;
  saving?: boolean;
  initialSelected?: string[];
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { friends, loading, loadFriends } = useFriendships();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const initialKey = (initialSelected ?? []).join(',');

  useEffect(() => {
    if (visible) {
      setSelected(initialSelected ?? []);
      setQuery('');
      loadFriends();
    }
  }, [visible, initialKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.username?.toLowerCase().includes(q));
  }, [friends, query]);

  const atLimit = selected.length >= MAX_TAGS_PER_CHECK_IN;
  const changed = [...selected].sort().join(',') !== [...(initialSelected ?? [])].sort().join(',');
  const isEditing = (initialSelected ?? []).length > 0;

  const confirmLabel = !changed
    ? isEditing
      ? 'Save'
      : 'Tag friends'
    : selected.length === 0
      ? 'Remove all tags'
      : isEditing
        ? `Save ${selected.length}`
        : `Tag ${selected.length}`;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : atLimit ? prev : [...prev, id]
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
          onPress={onClose}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '80%',
            backgroundColor: c.surface,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 18,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              marginBottom: 4,
            }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>Skated with</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={c.subtext} />
            </Pressable>
          </View>
          <Text style={{ paddingHorizontal: 20, fontSize: 13, color: c.subtext, marginBottom: 14 }}>
            Tag the friends who were there with you.
          </Text>

          {friends.length > 6 ? (
            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search friends"
                placeholderTextColor={c.subtext}
                autoCapitalize="none"
                style={{
                  backgroundColor: c.tagBg,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: c.text,
                }}
              />
            </View>
          ) : null}

          <ScrollView
            style={{ paddingHorizontal: 20 }}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled">
            {loading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={c.accent} />
            ) : filtered.length === 0 ? (
              <Text style={{ color: c.subtext, fontSize: 14, paddingVertical: 24, textAlign: 'center' }}>
                {friends.length === 0
                  ? 'Add friends to tag them on your check-ins.'
                  : 'No friends match that search.'}
              </Text>
            ) : (
              filtered.map((f) => {
                const active = selected.includes(f.id);
                const disabled = !active && atLimit;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => toggle(f.id)}
                    disabled={disabled}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 10,
                      opacity: disabled ? 0.4 : 1,
                    }}>
                    {f.avatar_url ? (
                      <Image
                        source={{ uri: f.avatar_url }}
                        style={{ width: 38, height: 38, borderRadius: 19 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: c.tagBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="person" size={18} color={c.subtext} />
                      </View>
                    )}
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: c.text }}>
                      @{f.username}
                    </Text>
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={active ? c.accent : c.subtext}
                    />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 28,
              borderTopWidth: 1,
              borderTopColor: c.tagBg,
            }}>
            <Pressable onPress={onClose} disabled={saving}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: c.subtext }}>
                {isEditing ? 'Cancel' : 'Skip'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(selected)}
              disabled={!changed || saving}
              style={{
                flex: 1,
                backgroundColor: !changed ? c.tagBg : c.accent,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              }}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: !changed ? c.subtext : '#fff',
                  }}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
