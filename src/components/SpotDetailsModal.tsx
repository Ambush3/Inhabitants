import React, {useEffect, useRef, useState} from 'react';
import { View, Text, Button, Modal, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Linking, StyleSheet, ActionSheetIOS, Share, Image, FlatList, Dimensions } from 'react-native';
import { Stars } from '@/src/components/Stars';
import { Spot, Review } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/src/context/ThemeContext';

type Props = {
    visible: boolean;
    spot: Spot | null;
    reviews: Review[];
    avgRating: number;
    newRating: number;
    newComment: string;
    onChangeRating: (v: number) => void;
    onChangeComment: (v: string) => void;
    onSubmitReview: () => void;
    onClose: () => void;
    onDelete: (spot: Spot) => void;
    currentUserId: string | null;
    existingReviewId: string | null;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onDeleteReview: (reviewId: string) => void;
    images: string[];
    imagesLoading: boolean;
    onDeleteImage: (url: string) => void;
    onUploadImages: (uris: string[]) => Promise<void>;
};

export function SpotDetailsModal({
                                     visible, spot, reviews, avgRating, newRating, newComment,
                                     onChangeRating, onChangeComment, onSubmitReview, onClose, onDelete, currentUserId, existingReviewId,
                                     isFavorite, onToggleFavorite, onDeleteReview, images, imagesLoading, onDeleteImage, onUploadImages
                                 }: Props) {

    const { width } = Dimensions.get('window');
    const { theme } = useTheme();
    const c = theme.colors;

    const scrollRef = useRef<ScrollView>(null);
    const commentInputRef = useRef<TextInput>(null);
    const [scrollEnabled, setScrollEnabled] = useState(false);
    const [pendingImages, setPendingImages] = useState<string[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
    });

    function handleDirections() {
        if (!spot) return;
        ActionSheetIOS.showActionSheetWithOptions(
            {
                options: ['Cancel', 'Open in Apple Maps', 'Open in Google Maps', 'Share Spot'],
                cancelButtonIndex: 0,
            },
            async (buttonIndex) => {
                if (buttonIndex === 1) {
                    await Linking.openURL(`maps://app?daddr=${spot.lat},${spot.lng}`);
                } else if (buttonIndex === 2) {
                    const url = `comgooglemaps://?daddr=${spot.lat},${spot.lng}&directionsmode=driving`;
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                        await Linking.openURL(url);
                    } else {
                        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`);
                    }
                } else if (buttonIndex === 3) {
                    await Share.share({
                        message: `Check out this skate spot: ${spot.name}\nhttps://maps.apple.com/?q=${spot.lat},${spot.lng}`,
                    });
                }
            }
        );
    }

    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => setScrollEnabled(true), 350);
            return () => clearTimeout(timer);
        } else {
            setScrollEnabled(false);
        }
    }, [visible]);

    function getRatingHint(rating: number): string {
        if (rating === 1) return 'What made this spot difficult or disappointing?';
        if (rating === 2) return 'What could be improved?';
        if (rating === 3) return 'What was average about it?';
        if (rating === 4) return 'What did you enjoy about it?';
        if (rating === 5) return 'What made this spot great?';
        return 'Optional comment';
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
        result.assets.forEach(asset => setPendingImages(prev => prev.includes(asset.uri) ? prev : [...prev, asset.uri]));
    }

    async function handleUploadPending() {
        if (!pendingImages.length) return;
        await onUploadImages(pendingImages);
        setPendingImages([]);
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Pressable
                    style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }}
                    onPress={onClose}
                />
                <View style={{ backgroundColor: c.surface, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' }}>
                    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" scrollEnabled={scrollEnabled}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: 18, fontWeight: '600', flex: 1, color: c.text }}>{spot?.name ?? 'Spot'}</Text>
                            <Pressable onPress={handleDirections} style={{ padding: 4 }}>
                                <Ionicons name="share-outline" size={24} color="#007AFF" />
                            </Pressable>
                            <Pressable onPress={onToggleFavorite} style={{ padding: 4 }}>
                                <Ionicons
                                    name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                                    size={24}
                                    color={isFavorite ? 'red' : c.subtext}
                                />
                            </Pressable>
                        </View>

                        {spot?.user_id === currentUserId ? (
                            <FlatList
                                data={[...images, ...pendingImages, 'add']}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item}
                                style={{ marginTop: 12, marginBottom: 4 }}
                                renderItem={({ item }) => {
                                    if (item === 'add') {
                                        if (images.length + pendingImages.length >= 5) return null;
                                        return (
                                            <Pressable
                                                onPress={handlePickImages}
                                                style={{ width: 120, height: 90, borderRadius: 8, borderWidth: 1, borderColor: c.inputBorder, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}
                                            >
                                                <Text style={{ fontSize: 28, color: c.subtext }}>+</Text>
                                            </Pressable>
                                        );
                                    }
                                    const isPending = pendingImages.includes(item);
                                    return (
                                        <View style={{ marginRight: 8, position: 'relative' }}>
                                            <Pressable onPress={() => !isPending && setSelectedImageIndex(images.indexOf(item))}>
                                                <Image
                                                    source={{ uri: item }}
                                                    style={{ width: 120, height: 90, borderRadius: 8, opacity: isPending ? 0.5 : 1 }}
                                                    resizeMode="cover"
                                                />
                                            </Pressable>
                                            <Pressable
                                                onPress={() => isPending
                                                    ? setPendingImages(prev => prev.filter(u => u !== item))
                                                    : onDeleteImage(item)
                                                }
                                                style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 }}
                                            >
                                                <Ionicons name="close" size={14} color="white" />
                                            </Pressable>
                                            {isPending ? (
                                                <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
                                                    <Text style={{ color: 'white', fontSize: 9 }}>Pending</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                }}
                            />
                        ) : (
                            images.length > 0 ? (
                                <FlatList
                                    data={images}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(url) => url}
                                    style={{ marginTop: 12, marginBottom: 4 }}
                                    renderItem={({ item: url }) => (
                                        <Pressable onPress={() => setSelectedImageIndex(images.indexOf(url))} style={{ marginRight: 8 }}>
                                            <Image
                                                source={{ uri: url }}
                                                style={{ width: 120, height: 90, borderRadius: 8 }}
                                                resizeMode="cover"
                                            />
                                        </Pressable>
                                    )}
                                />
                            ) : null
                        )}

                        {pendingImages.length > 0 && spot?.user_id === currentUserId ? (
                            <Pressable
                                onPress={handleUploadPending}
                                style={{ backgroundColor: c.buttonBg, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8, marginBottom: 4 }}
                            >
                                <Text style={{ color: c.background, fontWeight: '600' }}>Upload {pendingImages.length} photo{pendingImages.length > 1 ? 's' : ''}</Text>
                            </Pressable>
                        ) : null}

                        {imagesLoading ? (
                            <Text style={{ opacity: 0.4, fontSize: 12, marginTop: 8, color: c.text }}>Loading images...</Text>
                        ) : null}

                        {spot?.description ? (
                            <Text style={{ marginTop: 6, color: c.text }}>{spot.description}</Text>
                        ) : null}

                        {spot?.tags && spot.tags.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                {spot.tags.map(tag => (
                                    <View key={tag} style={{ backgroundColor: c.tagBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                                        <Text style={{ fontSize: 12, opacity: 0.7, color: c.text }}>#{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        <View style={{ marginTop: 12 }}>
                            <Text style={{ marginBottom: 6, fontWeight: '600', color: c.text }}>Rating ({reviews.length})</Text>
                            <Text style={{ marginTop: 6, opacity: 0.7, color: c.text }}>
                                {reviews.length === 0 ? 'No reviews yet' : avgRating.toFixed(1) + ' / 5'}
                            </Text>
                        </View>

                        <View style={{ marginTop: 16 }}>
                            <Text style={{ fontWeight: '600', marginBottom: 6, color: c.text }}>
                                {existingReviewId ? 'Your review' : 'Add a review'}
                            </Text>
                            <Stars value={newRating} onChange={onChangeRating} />
                            <TextInput
                                ref={commentInputRef}
                                value={newComment}
                                onChangeText={onChangeComment}
                                placeholder={getRatingHint(newRating)}
                                placeholderTextColor={c.placeholder}
                                autoCorrect={true}
                                multiline
                                returnKeyType="done"
                                submitBehavior="blurAndSubmit"
                                onSubmitEditing={onSubmitReview}
                                style={{ borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, padding: 10, height: 80, marginTop: 10, color: c.text, backgroundColor: c.surface }}
                                autoCapitalize="sentences"
                            />
                            <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                                <Button
                                    title={existingReviewId ? 'Update review' : 'Submit review'}
                                    onPress={onSubmitReview}
                                />
                            </View>
                        </View>

                        <View style={{ marginTop: 16 }}>
                            <Text style={{ fontWeight: '600', marginBottom: 8, color: c.text }}>Reviews</Text>
                            {reviews.map((r) => (
                                <View key={r.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border }}>
                                    <Text style={{ color: c.text }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                                    {r.comment || r.text ? (
                                        <Text style={{ marginTop: 4, color: c.text }}>{r.comment ?? r.text}</Text>
                                    ) : null}
                                    <Text style={{ marginTop: 4, opacity: 0.6, fontSize: 12, color: c.text }}>
                                        {new Date(r.created_at).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    {r.user_id === currentUserId ? (
                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                                            <Pressable onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}>
                                                <Text style={{ fontSize: 12, color: '#007AFF' }}>Edit</Text>
                                            </Pressable>
                                            <Pressable onPress={() => onDeleteReview(r.id)}>
                                                <Text style={{ fontSize: 12, color: c.danger }}>Delete</Text>
                                            </Pressable>
                                        </View>
                                    ) : null}
                                </View>
                            ))}
                        </View>

                        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Button title="Close" onPress={onClose} />
                            {spot && spot.user_id === currentUserId ? (
                                <Button title="Delete spot" onPress={() => onDelete(spot)} color={c.danger} />
                            ) : null}
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            <Modal visible={selectedImageIndex !== null} transparent animationType="fade" onRequestClose={() => setSelectedImageIndex(null)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
                    <FlatList
                        data={images}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={selectedImageIndex ?? 0}
                        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                        keyExtractor={(url) => url}
                        renderItem={({ item: url }) => (
                            <View style={{ width, justifyContent: 'center', alignItems: 'center' }}>
                                <Image
                                    source={{ uri: url }}
                                    style={{ width, height: '80%' }}
                                    resizeMode="contain"
                                />
                            </View>
                        )}
                        onViewableItemsChanged={onViewableItemsChanged.current}
                        viewabilityConfig={viewabilityConfig.current}
                    />
                    <Pressable
                        onPress={() => setSelectedImageIndex(null)}
                        style={{ position: 'absolute', top: 60, right: 20 }}
                    >
                        <Ionicons name="close-circle" size={36} color="white" />
                    </Pressable>
                    {images.length > 1 ? (
                        <View style={{ position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                            {images.map((_, i) => (
                                <View
                                    key={i}
                                    style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === currentIndex ? 'white' : 'rgba(255,255,255,0.4)' }}
                                />
                            ))}
                        </View>
                    ) : null}
                </View>
            </Modal>
        </Modal>
    );
}