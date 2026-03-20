import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, Modal, TextInput, Pressable, ScrollView,
    KeyboardAvoidingView, Platform, Linking, StyleSheet,
    ActionSheetIOS, Share, Image, FlatList, Dimensions
} from 'react-native';
import { Stars } from '@/src/components/Stars';
import { Spot, Review } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/src/context/ThemeContext';
import {CONDITION_META, SpotCondition} from "@/src/hooks/useSpotConditions";


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
    onTogglePrivacy: () => void;
    creatorUsername?: string;
    activeConditions: SpotCondition[];
    myConditions: SpotCondition[];
    onToggleCondition: (condition: SpotCondition) => void;
    isWishlisted: boolean;
    onToggleWishlist: () => void;
};

export function SpotDetailsModal({
                                     visible, spot, reviews, avgRating, newRating, newComment,
                                     onChangeRating, onChangeComment, onSubmitReview, onClose, onDelete,
                                     currentUserId, existingReviewId, isFavorite, onToggleFavorite,
                                     onDeleteReview, images, imagesLoading, onDeleteImage, onUploadImages,
                                     onTogglePrivacy, creatorUsername, activeConditions, myConditions, onToggleCondition,
                                     isWishlisted, onToggleWishlist
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

    const reviewFormRef = useRef<View>(null)
    const reviewFormY = useRef(0)

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
    });

    function handleDirections() {
        if (!spot) return;
        ActionSheetIOS.showActionSheetWithOptions(
            {
                options: ['Cancel', 'Open in Apple Maps', 'Open in Google Maps'],
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
                }
            }
        );
    }

    async function handleShare() {
        if (!spot) return;
        await Share.share({
            message: `Check out this skate spot: ${spot.name}\nhttps://maps.apple.com/?q=${spot.lat},${spot.lng}`,
        });
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
        return 'Leave a comment...';
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
        result.assets.forEach(asset =>
            setPendingImages(prev => prev.includes(asset.uri) ? prev : [...prev, asset.uri])
        );
    }

    async function handleUploadPending() {
        if (!pendingImages.length) return;
        await onUploadImages(pendingImages);
        setPendingImages([]);
    }

    const isOwner = spot?.user_id === currentUserId;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, justifyContent: 'flex-end' }}
            >
                <Pressable
                    style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onPress={onClose}
                />

                <View style={[styles.sheet, { backgroundColor: c.surface }]}>
                    {/* Drag Handle */}
                    <View style={styles.dragHandleContainer}>
                        <View style={[styles.dragHandle, { backgroundColor: c.border }]} />
                    </View>

                    <ScrollView
                        ref={scrollRef}
                        keyboardShouldPersistTaps="handled"
                        scrollEnabled={scrollEnabled}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 32 }}
                    >
                        {/* Header */}
                        <View style={{ marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={[styles.spotName, { color: c.text }]} numberOfLines={2} ellipsizeMode="tail">
                                        {spot?.name ?? 'Spot'}
                                    </Text>
                                    {creatorUsername ? (
                                        <Text style={[styles.creatorText, { color: c.subtext }]}>
                                            @{creatorUsername}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', gap: 4 }}>
                                <Pressable onPress={handleShare} style={[styles.iconBtn, { alignItems: 'center' }]}>
                                    <Ionicons name="share-outline" size={20} color={c.subtext} />
                                    <Text style={{ fontSize: 9, color: c.subtext, marginTop: 2 }}>Share</Text>
                                </Pressable>
                                <Pressable onPress={handleDirections} style={[styles.iconBtn, { alignItems: 'center' }]}>
                                    <Ionicons name="navigate-outline" size={20} color="#007AFF" />
                                    <Text style={{ fontSize: 9, color: '#007AFF', marginTop: 2 }}>Directions</Text>
                                </Pressable>
                                <Pressable onPress={onToggleFavorite} style={[styles.iconBtn, { alignItems: 'center' }]}>
                                    <Ionicons
                                        name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                                        size={20}
                                        color={isFavorite ? '#FF3B30' : c.subtext}
                                    />
                                    <Text style={{ fontSize: 9, color: isFavorite ? '#FF3B30' : c.subtext, marginTop: 2 }}>Save</Text>
                                </Pressable>
                                <Pressable onPress={onToggleWishlist} style={[styles.iconBtn, { alignItems: 'center' }]}>
                                    <Ionicons
                                        name={isWishlisted ? 'star' : 'star-outline'}
                                        size={20}
                                        color={isWishlisted ? '#FF9500' : c.subtext}
                                    />
                                    <Text style={{ fontSize: 9, color: isWishlisted ? '#FF9500' : c.subtext, marginTop: 2 }}>Wishlist</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Rating Summary Bar */}
                        {reviews.length > 0 ? (
                            <View style={[styles.ratingBar, { backgroundColor: c.tagBg }]}>
                                <Text style={[styles.ratingScore, { color: c.text }]}>
                                    {avgRating.toFixed(1)}
                                </Text>
                                <Text style={{ fontSize: 16, color: '#F5A623', letterSpacing: 2 }}>
                                    {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
                                </Text>
                                <Text style={[styles.ratingCount, { color: c.subtext }]}>
                                    {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        ) : null}

                        {/* Images */}
                        {isOwner ? (
                            <FlatList
                                data={[...images, ...pendingImages, 'add']}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item}
                                style={styles.imageList}
                                renderItem={({ item }) => {
                                    if (item === 'add') {
                                        if (images.length + pendingImages.length >= 5) return null;
                                        return (
                                            <Pressable
                                                onPress={handlePickImages}
                                                style={[styles.addImageBtn, { borderColor: c.inputBorder }]}
                                            >
                                                <Ionicons name="camera-outline" size={22} color={c.subtext} />
                                                <Text style={[styles.addImageText, { color: c.subtext }]}>Add</Text>
                                            </Pressable>
                                        );
                                    }
                                    const isPending = pendingImages.includes(item);
                                    return (
                                        <View style={{ marginRight: 8, position: 'relative' }}>
                                            <Pressable onPress={() => !isPending && setSelectedImageIndex(images.indexOf(item))}>
                                                <Image
                                                    source={{ uri: item }}
                                                    style={[styles.thumbnail, { opacity: isPending ? 0.5 : 1 }]}
                                                    resizeMode="cover"
                                                />
                                            </Pressable>
                                            <Pressable
                                                onPress={() => isPending
                                                    ? setPendingImages(prev => prev.filter(u => u !== item))
                                                    : onDeleteImage(item)
                                                }
                                                style={styles.deleteImageBtn}
                                            >
                                                <Ionicons name="close" size={12} color="white" />
                                            </Pressable>
                                            {isPending ? (
                                                <View style={styles.pendingBadge}>
                                                    <Text style={styles.pendingText}>Pending</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                }}
                            />
                        ) : images.length > 0 ? (
                            <FlatList
                                data={images}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(url) => url}
                                style={styles.imageList}
                                renderItem={({ item: url }) => (
                                    <Pressable onPress={() => setSelectedImageIndex(images.indexOf(url))} style={{ marginRight: 8 }}>
                                        <Image source={{ uri: url }} style={styles.thumbnail} resizeMode="cover" />
                                    </Pressable>
                                )}
                            />
                        ) : null}

                        {pendingImages.length > 0 && isOwner ? (
                            <Pressable
                                onPress={handleUploadPending}
                                style={[styles.uploadBtn, { backgroundColor: c.buttonBg }]}
                            >
                                <Ionicons name="cloud-upload-outline" size={16} color={c.background} />
                                <Text style={[styles.uploadBtnText, { color: c.background }]}>
                                    Upload {pendingImages.length} photo{pendingImages.length > 1 ? 's' : ''}
                                </Text>
                            </Pressable>
                        ) : null}

                        {/* Description */}
                        {spot?.description ? (
                            <Text style={[styles.description, { color: c.text }]}>{spot.description}</Text>
                        ) : null}

                        {/* Tags */}
                        {spot?.tags && spot.tags.length > 0 ? (
                            <View style={styles.tagsRow}>
                                {spot.tags.map(tag => (
                                    <View key={tag} style={[styles.tag, { backgroundColor: c.tagBg }]}>
                                        <Text style={[styles.tagText, { color: c.subtext }]}>#{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        {spot?.spot_type === 'spot' ? (
                            <>
                                {activeConditions.length > 0 ? (
                                    <>
                                        <View style={[styles.divider, { backgroundColor: c.border, marginVertical: 8 }]} />
                                        <Text style={{ fontSize: 11, color: c.subtext, marginBottom: 0, fontWeight: '600', letterSpacing: 0.5 }}>
                                            CURRENT CONDITION
                                        </Text>
                                        <View style={styles.tagsRow}>
                                            {activeConditions.map((condition) => {
                                                const meta = CONDITION_META[condition];
                                                const isMine = myConditions.includes(condition);
                                                return (
                                                    <Pressable
                                                        key={condition}
                                                        onPress={() => onToggleCondition(condition)}
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 4,
                                                            borderRadius: 20,
                                                            backgroundColor: meta.bg,
                                                            borderWidth: isMine ? 1.5 : 0,
                                                            borderColor: isMine ? meta.color : 'transparent',
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 11 }}>{meta.icon}</Text>
                                                        <Text style={{ fontSize: 11, color: meta.color, fontWeight: isMine ? '700' : '500' }}>
                                                            {meta.label}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    </>
                                ) : null}

                                <View style={{ marginTop: 6, marginBottom: 4 }}>
                                    <Text style={{ fontSize: 11, color: c.subtext, marginBottom: 0, fontWeight: '600', letterSpacing: 0.5 }}>
                                        REPORT CONDITION
                                    </Text>
                                    <View style={styles.tagsRow}>
                                        {(Object.keys(CONDITION_META) as SpotCondition[]).map((condition) => {
                                            const meta = CONDITION_META[condition];
                                            const isMine = myConditions.includes(condition);
                                            return (
                                                <Pressable
                                                    key={condition}
                                                    onPress={() => onToggleCondition(condition)}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 4,
                                                        borderRadius: 20,
                                                        backgroundColor: isMine ? meta.bg : c.tagBg,
                                                        borderWidth: 1,
                                                        borderColor: isMine ? meta.color : c.border,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 11 }}>{meta.icon}</Text>
                                                    <Text style={{ fontSize: 11, color: isMine ? meta.color : c.subtext, fontWeight: isMine ? '700' : '400' }}>
                                                        {meta.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            </>
                        ) : null}

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: c.border }]} />

                        {/* Review Form */}
                        <View style={styles.section} ref={reviewFormRef} onLayout={(e) => {
                            reviewFormY.current = e.nativeEvent.layout.y
                        }}>
                            <Text style={[styles.sectionTitle, { color: c.text }]}>
                                {existingReviewId ? 'Your Review' : 'Leave a Review'}
                            </Text>
                            <Stars value={newRating} onChange={onChangeRating} />
                            <TextInput
                                ref={commentInputRef}
                                value={newComment}
                                onChangeText={onChangeComment}
                                placeholder={getRatingHint(newRating)}
                                placeholderTextColor={c.placeholder}
                                autoCorrect
                                multiline
                                returnKeyType="done"
                                submitBehavior="blurAndSubmit"
                                onSubmitEditing={onSubmitReview}
                                autoCapitalize="sentences"
                                onFocus={() => {
                                    setTimeout(() => {
                                        scrollRef.current?.scrollTo({ y: reviewFormY.current - 16, animated: true })
                                    }, 300)
                                }}
                                style={[styles.reviewInput, { borderColor: c.inputBorder, color: c.text, backgroundColor: c.surface }]}
                            />
                            <Pressable
                                onPress={onSubmitReview}
                                style={[styles.submitBtn, { backgroundColor: c.buttonBg }]}
                            >
                                <Text style={[styles.submitBtnText, { color: c.background }]}>
                                    {existingReviewId ? 'Update Review' : 'Submit Review'}
                                </Text>
                            </Pressable>
                        </View>

                        {/* Divider */}
                        {reviews.length > 0 ? (
                            <View style={[styles.divider, { backgroundColor: c.border }]} />
                        ) : null}

                        {/* Reviews List */}
                        {reviews.length > 0 ? (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: c.text }]}>Reviews</Text>
                                {reviews.map((r) => (
                                    <View key={r.id} style={[styles.reviewCard, { backgroundColor: c.tagBg }]}>
                                        <View style={styles.reviewHeader}>
                                            <Text style={{ fontSize: 14, color: '#F5A623', letterSpacing: 1 }}>
                                                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                                            </Text>
                                            <Text style={[styles.reviewDate, { color: c.subtext }]}>
                                                {new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </Text>
                                        </View>
                                        {r.comment || r.text ? (
                                            <Text style={[styles.reviewComment, { color: c.text }]}>
                                                {r.comment ?? r.text}
                                            </Text>
                                        ) : null}
                                        <View style={styles.reviewFooter}>
                                            {r.username ? (
                                                <Text style={[styles.reviewUsername, { color: c.subtext }]}>@{r.username}</Text>
                                            ) : null}
                                            {r.user_id === currentUserId ? (
                                                <View style={styles.reviewActions}>
                                                    <Pressable onPress={() => {
                                                        setTimeout(() => {
                                                            scrollRef.current?.scrollTo({ y: reviewFormY.current - 16, animated: true })
                                                            commentInputRef.current?.focus()
                                                        }, 100)
                                                    }}>
                                                        <Text style={styles.editText}>Edit</Text>
                                                    </Pressable>
                                                    <Pressable onPress={() => onDeleteReview(r.id)}>
                                                        <Text style={[styles.deleteText, { color: c.danger }]}>Delete</Text>
                                                    </Pressable>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        {/* Footer Actions */}
                        <View style={[styles.footerActions, { borderTopColor: c.border }]}>
                            <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: c.border }]}>
                                <Text style={[styles.closeBtnText, { color: c.text }]}>Close</Text>
                            </Pressable>
                            {spot && isOwner ? (
                                <Pressable onPress={() => onDelete(spot)} style={[styles.deleteSpotBtn, { borderColor: c.danger }]}>
                                    <Ionicons name="trash-outline" size={15} color={c.danger} />
                                    <Text style={[styles.deleteSpotText, { color: c.danger }]}>Delete</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            {/* Fullscreen Image Viewer */}
            <Modal
                visible={selectedImageIndex !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImageIndex(null)}
            >
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
                                <Image source={{ uri: url }} style={{ width, height: '80%' }} resizeMode="contain" />
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
                        <View style={styles.dotRow}>
                            {images.map((_, i) => (
                                <View
                                    key={i}
                                    style={[styles.dot, { backgroundColor: i === currentIndex ? 'white' : 'rgba(255,255,255,0.35)' }]}
                                />
                            ))}
                        </View>
                    ) : null}
                </View>
            </Modal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '65%',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 6,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 8,
    },
    spotName: {
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 26,
    },
    creatorText: {
        fontSize: 12,
        marginTop: 3,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingTop: 2,
        flexShrink: 0
    },
    iconBtn: {
        padding: 8,
        borderRadius: 20,
    },
    ratingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
    },
    ratingScore: {
        fontSize: 16,
        fontWeight: '700',
    },
    ratingCount: {
        fontSize: 12,
        marginLeft: 'auto',
    },
    imageList: {
        marginVertical: 10,
    },
    thumbnail: {
        width: 110,
        height: 82,
        borderRadius: 10,
    },
    addImageBtn: {
        width: 110,
        height: 82,
        borderRadius: 10,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        gap: 4,
    },
    addImageText: {
        fontSize: 11,
        fontWeight: '500',
    },
    deleteImageBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        padding: 4,
    },
    pendingBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    pendingText: {
        color: 'white',
        fontSize: 9,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 10,
        padding: 11,
        marginTop: 4,
        marginBottom: 8,
    },
    uploadBtnText: {
        fontWeight: '600',
        fontSize: 14,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginTop: 4,
        marginBottom: 8,
        opacity: 0.85,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
        marginBottom: 4,
    },
    tag: {
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    tagText: {
        fontSize: 12,
    },
    divider: {
        height: 1,
        marginVertical: 16,
        opacity: 0.6,
    },
    section: {
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12,
        letterSpacing: 0.3,
    },
    reviewInput: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        height: 80,
        marginTop: 10,
        fontSize: 14,
        textAlignVertical: 'top',
    },
    submitBtn: {
        borderRadius: 10,
        padding: 13,
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnText: {
        fontWeight: '700',
        fontSize: 15,
    },
    reviewCard: {
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    reviewDate: {
        fontSize: 11,
    },
    reviewComment: {
        fontSize: 14,
        lineHeight: 19,
        marginBottom: 6,
    },
    reviewFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
    },
    reviewUsername: {
        fontSize: 12,
    },
    reviewActions: {
        flexDirection: 'row',
        gap: 12,
    },
    editText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '500',
    },
    deleteText: {
        fontSize: 12,
        fontWeight: '500',
    },
    footerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        gap: 10,
    },
    closeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },
    closeBtnText: {
        fontWeight: '600',
        fontSize: 15,
    },
    deleteSpotBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },
    deleteSpotText: {
        fontWeight: '600',
        fontSize: 15,
    },
    dotRow: {
        position: 'absolute',
        bottom: 40,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
})