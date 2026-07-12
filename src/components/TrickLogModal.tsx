import React, { useState, useEffect } from 'react';
import { showAlert } from '@/src/components/ui/ThemedAlert';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast } from '@/src/context/ToastContext';
import { TrickLog } from '@/src/hooks/useTrickLog';

type Props = {
  visible: boolean;
  spotName: string;
  spotId: string;
  spotTrickLogs: TrickLog[];
  onClose: () => void;
  onLogTrick: (trickName: string, loggedAt: Date) => Promise<string | null>;
  onDeleteTrickLog: (id: string) => Promise<string | null>;
};

export function TrickLogModal({
  visible,
  spotName,
  spotId,
  spotTrickLogs,
  onClose,
  onLogTrick,
  onDeleteTrickLog,
}: Props) {
  const { theme } = useTheme();
  const toast = useToast();
  const c = theme.colors;

  const [trickName, setTrickName] = useState('');
  const [loggedAt, setLoggedAt] = useState(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTrickName('');
      setLoggedAt(new Date());
    }
  }, [visible]);

  async function handleSubmit() {
    if (!trickName.trim()) return;
    setSaving(true);
    const err = await onLogTrick(trickName.trim(), loggedAt);
    setSaving(false);
    if (err) {
      toast.error(err);
      return;
    }
    setTrickName('');
    setLoggedAt(new Date());
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return (
      d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' · ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  }

  function confirmDelete(id: string) {
    showAlert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDeleteTrickLog(id),
      },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '75%',
            padding: 16,
          }}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="journal-outline" size={20} color={c.subtext} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, flex: 1 }}>Trick Log</Text>
            <Text style={{ fontSize: 13, color: c.subtext }} numberOfLines={1}>
              {spotName}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TextInput
              value={trickName}
              onChangeText={setTrickName}
              placeholder="What did you land?"
              placeholderTextColor={c.placeholder}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: c.inputBorder,
                borderRadius: 10,
                padding: 10,
                fontSize: 15,
                color: c.text,
                backgroundColor: c.surface,
              }}
            />
            <Pressable
              onPress={handleSubmit}
              disabled={saving || !trickName.trim()}
              style={{
                backgroundColor: trickName.trim() ? c.accent : c.tagBg,
                borderRadius: 10,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: saving ? 0.6 : 1,
              }}>
              <Text
                style={{
                  color: trickName.trim() ? 'white' : c.subtext,
                  fontWeight: '700',
                  fontSize: 14,
                }}>
                {saving ? '...' : 'Log'}
              </Text>
            </Pressable>
          </View>

          {spotTrickLogs.length > 0 ? (
            <>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: c.subtext,
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}>
                LOGGED HERE ({spotTrickLogs.length})
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {spotTrickLogs.map((log) => (
                  <View
                    key={log.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                      gap: 10,
                    }}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: c.text, fontSize: 14 }}>
                        {log.trick_name}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.subtext, marginTop: 2 }}>
                        {formatDate(log.logged_at)}
                      </Text>
                    </View>
                    <Pressable onPress={() => confirmDelete(log.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={c.subtext} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <Text
              style={{
                fontSize: 13,
                color: c.subtext,
                opacity: 0.6,
                textAlign: 'center',
                paddingVertical: 16,
              }}>
              No tricks logged here yet.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
