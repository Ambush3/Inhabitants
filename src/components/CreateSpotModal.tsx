import React, {useState, useRef, useEffect} from 'react';
import {
    View, Text, Button, Modal, TextInput as RNTextInput, Pressable,
    Platform, KeyboardAvoidingView, ScrollView, TextInput, Image
} from 'react-native';
import { Stars } from '@/src/components/Stars';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/src/context/ThemeContext';

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
};

export function CreateSpotModal({
                                    visible, pendingCoord, spotName, spotDesc, spotRating, spotTags, pendingImages,
                                    onChangeName, onChangeDesc, onChangeRating, onAddTag, onRemoveTag,
                                    onAddImage, onRemoveImage, onCancel, onCreate,
                                }: Props) {

    const { theme } = useTheme();
    const c = theme.colors;
    const [tagInput, setTagInput] = useState('');
    const descRef = useRef<RNTextInput>(null);
    const tagInputRef = useRef<RNTextInput>(null);

    useEffect(() => {
        if (!visible) setTagInput('');
    }, [visible]);

    function handleAddTag() {
        const cleaned = tagInput.trim().toLowerCase().replace(/\s+/g, '_');
        if (!cleaned) return;
        onAddTag(cleaned);
        setTagInput('');
        requestAnimationFrame(() => tagInputRef.current?.focus());
    }

    async function handlePickImages() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
            selectionLimit: 5,
        });
        if (result.canceled) return;
        result.assets.forEach(asset => onAddImage(asset.uri));
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
                    onPress={onCancel}
                >
                    <Pressable
                        style={{ backgroundColor: c.surface, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '75%' }}
                        onPress={() => {}}
                    >
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: c.text }}>Create spot</Text>

                            {pendingCoord ? (
                                <Text style={{ marginBottom: 12, color: c.subtext }}>
                                    {pendingCoord.lat.toFixed(5)}, {pendingCoord.lng.toFixed(5)}
                                </Text>
                            ) : null}

                            <Text style={{ marginBottom: 6, color: c.text }}>Name</Text>
                            <TextInput
                                value={spotName}
                                onChangeText={onChangeName}
                                placeholder="e.g. Downtown ledges"
                                placeholderTextColor={c.placeholder}
                                autoFocus
                                autoCorrect={true}
                                returnKeyType="next"
                                onSubmitEditing={() => descRef.current?.focus()}
                                style={{ borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, padding: 10, marginBottom: 12, color: c.text, backgroundColor: c.surface }}
                                autoCapitalize="sentences"
                            />

                            <Text style={{ marginBottom: 6, color: c.text }}>Description (optional)</Text>
                            <TextInput
                                ref={descRef}
                                value={spotDesc}
                                onChangeText={onChangeDesc}
                                placeholder="Surface, obstacles, best time to skate, etc."
                                placeholderTextColor={c.placeholder}
                                autoCorrect={true}
                                multiline
                                returnKeyType="done"
                                submitBehavior="blurAndSubmit"
                                style={{ borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, padding: 10, height: 60, marginBottom: 12, color: c.text, backgroundColor: c.surface }}
                                autoCapitalize="sentences"
                            />

                            <Text style={{ marginBottom: 6, color: c.text }}>Tags (optional)</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
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
                                    placeholder="e.g. stairs, ledges, rails"
                                    placeholderTextColor={c.placeholder}
                                    autoCapitalize="none"
                                    multiline
                                    style={{ flex: 1, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, padding: 10, color: c.text, backgroundColor: c.surface }}
                                />
                                <Pressable
                                    onPress={handleAddTag}
                                    style={{ backgroundColor: c.buttonBg, borderRadius: 8, padding: 10, justifyContent: 'center' }}
                                >
                                    <Text style={{ color: c.background, fontWeight: '600' }}>Add</Text>
                                </Pressable>
                            </View>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                {spotTags.map(tag => (
                                    <Pressable
                                        key={tag}
                                        onPress={() => onRemoveTag(tag)}
                                        style={{ backgroundColor: c.tagBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                    >
                                        <Text style={{ fontSize: 13, color: c.text }}>#{tag}</Text>
                                        <Text style={{ fontSize: 13, opacity: 0.5, color: c.text }}>✕</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={{ marginBottom: 6, color: c.text }}>Photos (optional)</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                {pendingImages.map(uri => (
                                    <View key={uri} style={{ position: 'relative' }}>
                                        <Image
                                            source={{ uri }}
                                            style={{ width: 80, height: 80, borderRadius: 8 }}
                                            resizeMode="cover"
                                        />
                                        <Pressable
                                            onPress={() => onRemoveImage(uri)}
                                            style={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 2 }}
                                        >
                                            <Text style={{ color: 'white', fontSize: 10 }}>✕</Text>
                                        </Pressable>
                                    </View>
                                ))}
                                {pendingImages.length < 5 ? (
                                    <Pressable
                                        onPress={handlePickImages}
                                        style={{ width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: c.inputBorder, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}
                                    >
                                        <Text style={{ fontSize: 28, color: c.subtext }}>+</Text>
                                    </Pressable>
                                ) : null}
                            </View>

                            <Text style={{ marginBottom: 6, color: c.text }}>Rating (optional)</Text>
                            <Stars value={spotRating} onChange={onChangeRating} />

                            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                                <Button title="Cancel" onPress={onCancel} />
                                <Button title="Create" onPress={onCreate} />
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
}