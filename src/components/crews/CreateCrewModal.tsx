import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast, ToastHost } from '@/src/context/ToastContext';
import { Crew } from '@/src/hooks/useCrews';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (args: { name: string; description?: string; isPublic: boolean; imageUri?: string }) => Promise<string | null>;
  editCrew?: Crew | null;
};

export function CreateCrewModal({ visible, onClose, onSubmit, editCrew }: Props) {
  const { theme } = useTheme();
  const toast = useToast();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(editCrew?.name ?? '');
      setDescription(editCrew?.description ?? '');
      setIsPublic(editCrew?.is_public ?? true);
      setImageUri(null);
    }
  }, [visible, editCrew]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.info('Allow photo access to set an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled) return;
    setImageUri(result.assets[0].uri);
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error('Crew name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 50) {
      toast.error('Crew name must be 50 characters or fewer.');
      return;
    }
    setSaving(true);
    const err = await onSubmit({
      name: trimmed,
      description: description.trim() || undefined,
      isPublic,
      imageUri: imageUri ?? undefined,
    });
    setSaving(false);
    if (err) {
      toast.error(err);
      return;
    }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
          }}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ color: c.subtext, fontSize: 16 }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontWeight: '700', fontSize: 17, color: c.text }}>
            {editCrew ? 'Edit Crew' : 'New Crew'}
          </Text>
          <Pressable onPress={handleSubmit} disabled={saving} hitSlop={10}>
            <Text
              style={{
                color: saving ? c.subtext : c.buttonBg,
                fontSize: 16,
                fontWeight: '700',
              }}>
              {saving ? 'Saving...' : editCrew ? 'Save' : 'Create'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Pressable onPress={pickImage}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: 96, height: 96 }} />
                ) : editCrew?.avatar_url ? (
                  <Image
                    source={{ uri: editCrew.avatar_url }}
                    style={{ width: 96, height: 96 }}
                  />
                ) : (
                  <Ionicons name="camera-outline" size={32} color={c.subtext} />
                )}
              </View>
            </Pressable>
            <Text style={{ color: c.subtext, fontSize: 12, marginTop: 6 }}>
              Tap to {imageUri || editCrew?.avatar_url ? 'change' : 'add'} photo
            </Text>
          </View>

          <View>
            <Text style={{ color: c.subtext, fontSize: 12, marginBottom: 6 }}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sunset Skate Crew"
              placeholderTextColor={c.subtext}
              maxLength={50}
              style={{
                borderWidth: 1,
                borderColor: c.inputBorder,
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
                color: c.text,
                backgroundColor: c.surface,
              }}
            />
          </View>

          <View>
            <Text style={{ color: c.subtext, fontSize: 12, marginBottom: 6 }}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder=""
              placeholderTextColor={c.subtext}
              multiline
              maxLength={500}
              style={{
                borderWidth: 1,
                borderColor: c.inputBorder,
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
                color: c.text,
                backgroundColor: c.surface,
                minHeight: 100,
                textAlignVertical: 'top',
              }}
            />
          </View>

          <View>
            <Text style={{ color: c.subtext, fontSize: 12, marginBottom: 6 }}>VISIBILITY</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setIsPublic(true)}
                style={{
                  flex: 1,
                  borderWidth: 1.5,
                  borderColor: isPublic ? c.buttonBg : c.inputBorder,
                  backgroundColor: isPublic ? c.buttonBg : c.surface,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                  gap: 4,
                }}>
                <Ionicons name="globe-outline" size={20} color={isPublic ? c.background : c.text} />
                <Text
                  style={{
                    fontWeight: '600',
                    color: isPublic ? c.background : c.text,
                  }}>
                  Public
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: isPublic ? c.background : c.subtext,
                    textAlign: 'center',
                  }}>
                  Anyone can find + join
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIsPublic(false)}
                style={{
                  flex: 1,
                  borderWidth: 1.5,
                  borderColor: !isPublic ? c.buttonBg : c.inputBorder,
                  backgroundColor: !isPublic ? c.buttonBg : c.surface,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                  gap: 4,
                }}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={!isPublic ? c.background : c.text}
                />
                <Text
                  style={{
                    fontWeight: '600',
                    color: !isPublic ? c.background : c.text,
                  }}>
                  Private
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: !isPublic ? c.background : c.subtext,
                    textAlign: 'center',
                  }}>
                  Invite-only
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {visible ? <ToastHost /> : null}
    </Modal>
  );
}
