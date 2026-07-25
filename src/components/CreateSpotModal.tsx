import React, { useState, useRef, useEffect } from 'react';
import { AlertHost } from '@/src/components/ui/ThemedAlert';
import { ToastHost } from '@/src/context/ToastContext';
import {
  View,
  Text,
  Button,
  Modal,
  TextInput as RNTextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { Stars } from '@/src/components/Stars';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SpotVisibility } from '@/src/hooks/useSpots';

type Props = {
  visible: boolean;
  pendingCoord: { lat: number; lng: number } | null;
  spotName: string;
  spotDesc: string;
  spotRating: number;
  spotTags: string[];
  pendingImages: string[];
  onChangeName: (v: string) => void;
  onChangeDesc: (v: string) => void;
  onChangeRating: (v: number) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onAddImage: (uri: string) => void;
  onRemoveImage: (uri: string) => void;
  onCancel: () => void;
  onCreate: () => void;
  isVetted?: boolean;
  visibility: SpotVisibility;
  onChangeVisibility: (v: SpotVisibility) => void;
  spotComment: string;
  onChangeComment: (v: string) => void;
  spotType: 'spot' | 'skatepark' | 'skateshop';
  onChangeSpotType: (v: 'spot' | 'skatepark' | 'skateshop') => void;
};

export function CreateSpotModal({
  visible,
  pendingCoord,
  spotName,
  spotDesc,
  spotRating,
  spotTags,
  pendingImages,
  onChangeName,
  onChangeDesc,
  onChangeRating,
  onAddTag,
  onRemoveTag,
  onAddImage,
  onRemoveImage,
  onCancel,
  onCreate,
  isVetted,
  visibility,
  onChangeVisibility,
  spotComment,
  onChangeComment,
  spotType,
  onChangeSpotType,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [tagInput, setTagInput] = useState('');
  const descRef = useRef<RNTextInput>(null);
  const tagInputRef = useRef<RNTextInput>(null);

  const spotCommentRef = useRef<RNTextInput>(null);
  const commentFieldY = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  const namePlaceholder = {
    spot: 'e.g. Downtown ledges',
    skatepark: 'e.g. Riverside Skate Park',
    skateshop: 'e.g. Tactics Board Shop',
  }[spotType];

  const descPlaceholder = {
    spot: 'Surface, obstacles, best time to skate, etc.',
    skatepark: 'Ramps, bowls, street section, opening hours, etc.',
    skateshop: 'Brands carried, services offered, hours, etc.',
  }[spotType];

  const tagsPlaceholder = {
    spot: 'e.g. stairs, ledges, rails',
    skatepark: 'e.g. bowl, vert, street',
    skateshop: 'e.g. decks, shoes, repairs',
  }[spotType];

  const modalTitle = {
    spot: 'Create spot',
    skatepark: 'Add skate park',
    skateshop: 'Add skate shop',
  }[spotType];

  useEffect(() => {
    if (!visible) setTagInput('');
  }, [visible]);

  function handleAddTag() {
    const cleaned = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!cleaned) return;
    onAddTag(cleaned);
    setTagInput('');
    requestAnimationFrame(() => tagInputRef.current?.focus());
  }

  async function handlePickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: 5,
    });
    if (result.canceled) return;
    result.assets.forEach((asset) => onAddImage(asset.uri));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      {visible ? <AlertHost /> : null}
      {visible ? <ToastHost /> : null}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.3)',
            justifyContent: 'flex-end',
          }}
          onPress={onCancel}>
          <Pressable
            style={{
              backgroundColor: c.surface,
              padding: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '75%',
            }}
            onPress={() => { }}>
            <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: c.text,
                  }}>
                  {modalTitle}
                </Text>
                {spotType === 'spot' ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: c.tagBg,
                      borderRadius: 8,
                      padding: 2,
                    }}>
                    {(['public', 'friends', 'private'] as const).map((v) => {
                      const active = visibility === v;
                      const label =
                        v === 'public' ? 'Public' : v === 'friends' ? 'Friends' : 'Private';
                      const icon =
                        v === 'public'
                          ? 'globe-outline'
                          : v === 'friends'
                            ? 'people-outline'
                            : 'lock-closed';
                      return (
                        <Pressable
                          key={v}
                          onPress={() => onChangeVisibility(v)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: active ? c.surface : 'transparent',
                          }}>
                          <Ionicons
                            name={icon as any}
                            size={12}
                            color={active ? c.text : c.subtext}
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: active ? c.text : c.subtext,
                            }}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              {pendingCoord ? (
                <Text style={{ marginBottom: 12, color: c.subtext }}>
                  {pendingCoord.lat.toFixed(5)}, {pendingCoord.lng.toFixed(5)}
                </Text>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(255,149,0,0.12)',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 12,
                  }}>
                  <Ionicons name="warning-outline" size={16} color="#FF9500" />
                  <Text style={{ fontSize: 12, color: '#FF9500', flex: 1 }}>
                    No location set. Close this and long-press the map to drop a pin where the spot is.
                  </Text>
                </View>
              )}

              <Text style={{ marginBottom: 6, color: c.text }}>Name</Text>
              <TextInput
                value={spotName}
                onChangeText={(text) => {
                  if (text.length === 1) {
                    onChangeName(text.toUpperCase());
                  } else {
                    onChangeName(text);
                  }
                }}
                placeholder={namePlaceholder}
                placeholderTextColor={c.placeholder}
                autoFocus
                autoCorrect={true}
                spellCheck={true}
                returnKeyType="next"
                onSubmitEditing={() => descRef.current?.focus()}
                style={{
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 12,
                  color: c.text,
                  backgroundColor: c.surface,
                }}
                autoCapitalize="words"
              />

              <Text style={{ marginBottom: 6, color: c.text }}>Description (optional)</Text>
              <TextInput
                ref={descRef}
                value={spotDesc}
                onChangeText={onChangeDesc}
                placeholder={descPlaceholder}
                placeholderTextColor={c.placeholder}
                autoCorrect={true}
                autoCapitalize="sentences"
                spellCheck={true}
                multiline
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                style={{
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 10,
                  height: 60,
                  marginBottom: 12,
                  color: c.text,
                  backgroundColor: c.surface,
                }}
              />

              <Text style={{ marginBottom: 6, color: c.text }}>Tags (optional)</Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  marginBottom: 8,
                }}>
                <TextInput
                  ref={tagInputRef}
                  value={tagInput}
                  onChangeText={(text) => {
                    if (text.endsWith('\n')) {
                      handleAddTag();
                    } else {
                      setTagInput(text);
                    }
                  }}
                  placeholder={tagsPlaceholder}
                  placeholderTextColor={c.placeholder}
                  autoCapitalize="none"
                  multiline
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: c.inputBorder,
                    borderRadius: 8,
                    padding: 10,
                    color: c.text,
                    backgroundColor: c.surface,
                  }}
                />
                <Pressable
                  onPress={handleAddTag}
                  style={{
                    backgroundColor: c.buttonBg,
                    borderRadius: 8,
                    padding: 10,
                    justifyContent: 'center',
                  }}>
                  <Text
                    style={{
                      color: c.background,
                      fontWeight: '600',
                    }}>
                    Add
                  </Text>
                </Pressable>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 12,
                }}>
                {spotTags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => onRemoveTag(tag)}
                    style={{
                      backgroundColor: c.tagBg,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        color: c.text,
                      }}>
                      #{tag}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        opacity: 0.5,
                        color: c.text,
                      }}>
                      ✕
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={{ marginBottom: 6, color: c.text }}>Photos (optional)</Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 12,
                }}>
                {pendingImages.map((uri) => (
                  <View key={uri} style={{ position: 'relative' }}>
                    <Image
                      source={{ uri }}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                      }}
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => onRemoveImage(uri)}
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: 10,
                        padding: 2,
                      }}>
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 10,
                        }}>
                        ✕
                      </Text>
                    </Pressable>
                  </View>
                ))}
                {pendingImages.length < 5 ? (
                  <Pressable
                    onPress={handlePickImages}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: c.inputBorder,
                      borderStyle: 'dashed',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Text
                      style={{
                        fontSize: 28,
                        color: c.subtext,
                      }}>
                      +
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={{ marginBottom: 6, color: c.text }}>Rating (optional)</Text>
              <Stars value={spotRating} onChange={onChangeRating} />

              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  justifyContent: 'flex-end',
                  marginTop: 12,
                }}>
                <Button title="Cancel" onPress={onCancel} />
                <Button title="Create" onPress={onCreate} disabled={!pendingCoord} />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
