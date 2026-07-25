import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useToast, ToastHost } from '@/src/context/ToastContext';
import { useCollections, Collection } from '@/src/hooks/useCollections';

type Props = {
    visible: boolean;
    onClose: () => void;
    spotId: string | null;
};

export function CollectionsModal({ visible, onClose, spotId }: Props) {
    const { theme } = useTheme();
    const toast = useToast();
    const c = theme.colors;
    const insets = useSafeAreaInsets();
    const {
        collections,
        loading,
        loadCollections,
        createCollection,
        addSpotToCollection,
        removeSpotFromCollection,
        getSpotCollectionIds,
    } = useCollections();

    const [spotCollectionIds, setSpotCollectionIds] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible && spotId) {
            loadCollections();
            getSpotCollectionIds(spotId).then(setSpotCollectionIds);
        }
    }, [visible, spotId]);

    async function handleToggle(collection: Collection) {
        if (!spotId) return;
        const isIn = spotCollectionIds.includes(collection.id);
        if (isIn) {
            await removeSpotFromCollection(collection.id, spotId);
            setSpotCollectionIds((prev) => prev.filter((id) => id !== collection.id));
        } else {
            await addSpotToCollection(collection.id, spotId);
            setSpotCollectionIds((prev) => [...prev, collection.id]);
        }
    }

    async function handleCreate() {
        if (!newName.trim()) return;
        setSubmitting(true);
        const err = await createCollection(newName.trim());
        if (err) toast.error(err);
        setNewName('');
        setCreating(false);
        setSubmitting(false);
    }

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Pressable
                    style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }}
                    onPress={onClose}
                />
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={{
                        backgroundColor: c.surface,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        maxHeight: 500,
                        paddingBottom: insets.bottom,
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 16,
                            borderBottomWidth: 1,
                            borderColor: c.border,
                        }}>
                            <Ionicons name="folder-outline" size={20} color={c.subtext} style={{ marginRight: 8 }} />
                            <Text style={{ flex: 1, fontWeight: '700', fontSize: 16, color: c.text }}>
                                Collections
                            </Text>
                            <Pressable onPress={() => setCreating(true)}>
                                <Ionicons name="add" size={24} color={c.accent} />
                            </Pressable>
                            <Pressable onPress={onClose} style={{ marginLeft: 12 }}>
                                <Ionicons name="close" size={24} color={c.text} />
                            </Pressable>
                        </View>

                        {creating ? (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                padding: 16,
                                borderBottomWidth: 1,
                                borderColor: c.border,
                            }}>
                                <TextInput
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholder="Collection name..."
                                    placeholderTextColor={c.placeholder}
                                    autoCapitalize="words"
                                    autoFocus
                                    style={{
                                        flex: 1,
                                        borderWidth: 1,
                                        borderColor: c.inputBorder,
                                        borderRadius: 10,
                                        padding: 10,
                                        fontSize: 14,
                                        color: c.text,
                                        backgroundColor: c.surface,
                                    }}
                                />
                                <Pressable
                                    onPress={handleCreate}
                                    disabled={submitting || !newName.trim()}
                                    style={{ opacity: submitting || !newName.trim() ? 0.4 : 1 }}>
                                    <Ionicons name="checkmark-circle" size={28} color={c.accent} />
                                </Pressable>
                                <Pressable onPress={() => { setCreating(false); setNewName(''); }}>
                                    <Ionicons name="close-circle" size={28} color={c.subtext} />
                                </Pressable>
                            </View>
                        ) : null}

                        {loading ? (
                            <View style={{ padding: 32, alignItems: 'center' }}>
                                <ActivityIndicator color={c.subtext} />
                            </View>
                        ) : (
                            <FlatList
                                data={collections}
                                keyExtractor={(item) => item.id}
                                style={{ maxHeight: 350 }}
                                contentContainerStyle={{ padding: 8 }}
                                ListEmptyComponent={
                                    <Text style={{ color: c.subtext, fontSize: 14, textAlign: 'center', marginTop: 24 }}>
                                        No collections yet. Tap + to create one.
                                    </Text>
                                }
                                renderItem={({ item }) => {
                                    const isIn = spotCollectionIds.includes(item.id);
                                    return (
                                        <Pressable
                                            onPress={() => handleToggle(item)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 12,
                                                borderRadius: 12,
                                                backgroundColor: isIn ? 'rgba(0,122,255,0.08)' : 'transparent',
                                                marginBottom: 4,
                                            }}>
                                            <View style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 10,
                                                backgroundColor: isIn ? 'rgba(0,122,255,0.15)' : c.tagBg,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: 12,
                                            }}>
                                                <Ionicons
                                                    name={item.name === 'Wishlist' ? 'star' : 'folder'}
                                                    size={18}
                                                    color={isIn ? c.accent : c.subtext}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontWeight: '600', fontSize: 14, color: isIn ? c.accent : c.text }}>
                                                    {item.name}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: c.subtext }}>
                                                    {item.spot_count} {item.spot_count === 1 ? 'spot' : 'spots'}
                                                </Text>
                                            </View>
                                            {isIn ? (
                                                <Ionicons name="checkmark-circle" size={22} color={c.accent} />
                                            ) : (
                                                <Ionicons name="add-circle-outline" size={22} color={c.subtext} />
                                            )}
                                        </Pressable>
                                    );
                                }}
                            />
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
            {visible ? <ToastHost /> : null}
        </Modal>
    );
}