import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    Pressable,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Linking,
    StyleSheet,
    ActionSheetIOS,
    Share,
    Image,
    FlatList,
    Dimensions,
    Alert,
    PanResponder,
    Animated,
} from 'react-native';
import { Stars } from '@/src/components/Stars';
import { Spot, Review } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTheme } from '@/src/context/ThemeContext';
import { CONDITION_META, SpotCondition } from '@/src/hooks/useSpotConditions';

const geocodeCache = new Map<string, string>();

function haversineMiles(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 3958.8;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(miles: number): string {
    if (miles < 0.1) return '<0.1 mi';
    if (miles < 10) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles).toLocaleString('en-US')} mi`;
}

function SkeletonBar({
    width,
    height = 14,
    style,
}: {
    width: number | string;
    height?: number;
    style?: any;
}) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius: 6,
                    backgroundColor: '#888',
                    opacity,
                },
                style,
            ]}
        />
    );
}

type Props = {
    visible: boolean;
    spot: Spot | null;
    isFlaggedByMe: boolean;
    flagCount: number;
    onToggleFlag: (reason?: string) => void;
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
    creatorUsername?: string;
    creatorAvatarUrl?: string;
    activeConditions: SpotCondition[];
    myConditions: SpotCondition[];
    onToggleCondition: (condition: SpotCondition) => void;
    isWishlisted: boolean;
    onToggleWishlist: () => void;
    isReviewFlaggedByMe: (reviewId: string) => boolean;
    onToggleReviewFlag: (
        reviewId: string,
        reason?: string
    ) => void | Promise<void>;
    detailsLoading: boolean;
    onViewProfile?: (userId: string) => void;
    onConditionDone?: () => void;
    userLocation?: { latitude: number; longitude: number } | null;
};

export function SpotDetailsModal({
    visible,
    spot,
    isFlaggedByMe,
    flagCount,
    onToggleFlag,
    reviews,
    avgRating,
    newRating,
    newComment,
    onChangeRating,
    onChangeComment,
    onSubmitReview,
    onClose,
    onDelete,
    currentUserId,
    existingReviewId,
    isFavorite,
    onToggleFavorite,
    onDeleteReview,
    images,
    imagesLoading,
    onDeleteImage,
    onUploadImages,
    creatorUsername,
    creatorAvatarUrl,
    activeConditions,
    myConditions,
    onToggleCondition,
    isWishlisted,
    onToggleWishlist,
    isReviewFlaggedByMe,
    onToggleReviewFlag,
    detailsLoading,
    onViewProfile,
    onConditionDone,
    userLocation,
}: Props) {
    const { width } = Dimensions.get('window');
    const { theme } = useTheme();
    const c = theme.colors;

    const scrollRef = useRef<ScrollView>(null);
    const commentInputRef = useRef<TextInput>(null);
    const [scrollEnabled, setScrollEnabled] = useState(false);
    const [pendingImages, setPendingImages] = useState<string[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
        null
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

    const [showConditionPicker, setShowConditionPicker] = useState(false);
    const [spotAddress, setSpotAddress] = useState<string | null>(null);

    useEffect(() => {
        if (!spot || !visible) {
            setSpotAddress(null);
            return;
        }
        const key = `${spot.lat.toFixed(5)},${spot.lng.toFixed(5)}`;
        const cached = geocodeCache.get(key);
        if (cached !== undefined) {
            setSpotAddress(cached);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const results = await Location.reverseGeocodeAsync({
                    latitude: spot.lat,
                    longitude: spot.lng,
                });
                if (cancelled) return;
                const r = results[0];
                let label = '';
                if (r) {
                    const city = r.city || r.subregion || r.district || '';
                    const region = r.region || r.country || '';
                    label = [city, region].filter(Boolean).join(', ');
                }
                geocodeCache.set(key, label);
                setSpotAddress(label || null);
            } catch {
                if (!cancelled) setSpotAddress(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [spot?.id, visible]);

    const distanceMiles =
        spot && userLocation
            ? haversineMiles(
                  userLocation.latitude,
                  userLocation.longitude,
                  spot.lat,
                  spot.lng
              )
            : null;

    const reviewFormRef = useRef<View>(null);
    const reviewFormY = useRef(0);

    const conditionsChangedRef = useRef(false);

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0)
            setCurrentIndex(viewableItems[0].index ?? 0);
    });

    const translateY = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
                gestureState.dy > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) {
                    Animated.timing(translateY, {
                        toValue: 800,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        translateY.setValue(0);
                        setSelectedImageIndex(null);
                    });
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    function handleDirections() {
        if (!spot) return;
        ActionSheetIOS.showActionSheetWithOptions(
            {
                options: [
                    'Cancel',
                    'Open in Apple Maps',
                    'Open in Google Maps',
                ],
                cancelButtonIndex: 0,
            },
            async (buttonIndex) => {
                if (buttonIndex === 1) {
                    await Linking.openURL(
                        `maps://app?daddr=${spot.lat},${spot.lng}`
                    );
                } else if (buttonIndex === 2) {
                    const url = `comgooglemaps://?daddr=${spot.lat},${spot.lng}&directionsmode=driving`;
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                        await Linking.openURL(url);
                    } else {
                        await Linking.openURL(
                            `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`
                        );
                    }
                }
            }
        );
    }

    async function handleShare() {
        if (!spot) return;

        if (spot.spot_type === 'spot') {
            await Share.share({
                message: `Check out this skate spot: ${spot.name}\nhttps://maps.apple.com/?q=${spot.lat},${spot.lng}`,
            });
        } else {
            const encodedName = encodeURIComponent(spot.name);
            await Share.share({
                message: `Check out ${spot.name}\nhttps://maps.apple.com/?q=${encodedName}&ll=${spot.lat},${spot.lng}`,
            });
        }
    }

    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => setScrollEnabled(true), 350);
            return () => clearTimeout(timer);
        } else {
            setScrollEnabled(false);
            setShowConditionPicker(false);
        }
    }, [visible]);

    function getRatingHint(rating: number): string {
        if (rating === 1)
            return 'What made this spot difficult or disappointing?';
        if (rating === 2) return 'What could be improved?';
        if (rating === 3) return 'What was average about it?';
        if (rating === 4) return 'What did you enjoy about it?';
        if (rating === 5) return 'What made this spot great?';
        return 'Leave a comment...';
    }

    function handleFlag() {
        if (isFlaggedByMe) {
            onToggleFlag(undefined);
            return;
        }
        ActionSheetIOS.showActionSheetWithOptions(
            {
                title: 'Why are you flagging this spot?',
                options: [
                    'Cancel',
                    'Incorrect location',
                    "Doesn't exist",
                    'Inappropriate name',
                    'Spam',
                    'Other',
                ],
                cancelButtonIndex: 0,
            },
            (buttonIndex) => {
                if (buttonIndex === 0) return;
                const reasons = [
                    'Incorrect location',
                    "Doesn't exist",
                    'Inappropriate name',
                    'Spam',
                    'Other',
                ];
                onToggleFlag(reasons[buttonIndex - 1]);
            }
        );
    }

    async function handlePickImages() {
        const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
            selectionLimit: 5,
        });
        if (result.canceled) return;
        result.assets.forEach((asset) =>
            setPendingImages((prev) =>
                prev.includes(asset.uri) ? prev : [...prev, asset.uri]
            )
        );
    }

    async function handleUploadPending() {
        if (!pendingImages.length) return;
        await onUploadImages(pendingImages);
        setPendingImages([]);
    }

    const isOwner = spot?.user_id === currentUserId;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, justifyContent: 'flex-end' }}
            >
                <Pressable
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                    }}
                    onPress={onClose}
                />

                <View style={[styles.sheet, { backgroundColor: c.surface }]}>
                    {/* Drag Handle */}
                    <View style={styles.dragHandleContainer}>
                        <View
                            style={[
                                styles.dragHandle,
                                { backgroundColor: c.border },
                            ]}
                        />
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
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    marginBottom: 4,
                                }}
                            >
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                flex: 1,
                                                marginRight: 8,
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.spotName,
                                                    {
                                                        color: c.text,
                                                        flexShrink: 1,
                                                    },
                                                ]}
                                                numberOfLines={2}
                                                ellipsizeMode="tail"
                                            >
                                                {spot?.name ?? 'Spot'}
                                            </Text>
                                            {spot?.is_verified ? (
                                                <Pressable
                                                    onPress={() =>
                                                        Alert.alert(
                                                            'Verified Spot',
                                                            'This spot has been reviewed by 3 or more skaters.'
                                                        )
                                                    }
                                                >
                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={18}
                                                        color="#007AFF"
                                                        style={{
                                                            marginLeft: 6,
                                                            marginTop: 4,
                                                        }}
                                                    />
                                                </Pressable>
                                            ) : null}
                                        </View>
                                        {!isOwner ? (
                                            <Pressable
                                                onPress={handleFlag}
                                                style={{ paddingTop: 4 }}
                                            >
                                                <Ionicons
                                                    name={
                                                        isFlaggedByMe
                                                            ? 'flag'
                                                            : 'flag-outline'
                                                    }
                                                    size={18}
                                                    color={
                                                        isFlaggedByMe
                                                            ? '#FF3B30'
                                                            : c.subtext
                                                    }
                                                />
                                            </Pressable>
                                        ) : flagCount > 0 ? (
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 3,
                                                    paddingTop: 4,
                                                }}
                                            >
                                                <Ionicons
                                                    name="flag"
                                                    size={14}
                                                    color="#FF3B30"
                                                />
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        color: '#FF3B30',
                                                        fontWeight: '600',
                                                    }}
                                                >
                                                    {flagCount}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    {spotAddress || distanceMiles !== null ? (
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4,
                                                marginTop: 2,
                                                marginBottom: 5,
                                            }}
                                        >
                                            <Ionicons
                                                name="location-outline"
                                                size={12}
                                                color={c.subtext}
                                            />
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: c.subtext,
                                                    flexShrink: 1,
                                                }}
                                                numberOfLines={1}
                                            >
                                                {spotAddress ? (
                                                    <Text
                                                        style={{
                                                            color: c.text,
                                                            fontWeight: '600',
                                                        }}
                                                    >
                                                        {spotAddress}
                                                    </Text>
                                                ) : null}
                                                {spotAddress &&
                                                distanceMiles !== null
                                                    ? ' · '
                                                    : ''}
                                                {distanceMiles !== null
                                                    ? `${formatDistance(distanceMiles)} away`
                                                    : ''}
                                            </Text>
                                        </View>
                                    ) : null}
                                    {creatorUsername ? (
                                        <Pressable
                                            onPress={() => {
                                                if (
                                                    onViewProfile &&
                                                    spot?.user_id &&
                                                    spot.user_id !==
                                                        currentUserId
                                                ) {
                                                    onViewProfile(spot.user_id);
                                                }
                                            }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 6,
                                                marginTop: 3,
                                                alignSelf: 'flex-start',
                                            }}
                                        >
                                            {creatorAvatarUrl ? (
                                                <Image
                                                    source={{
                                                        uri: creatorAvatarUrl,
                                                    }}
                                                    style={{
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: 10,
                                                    }}
                                                />
                                            ) : (
                                                <View
                                                    style={{
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: 10,
                                                        backgroundColor:
                                                            c.tagBg,
                                                        alignItems: 'center',
                                                        justifyContent:
                                                            'center',
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="person-outline"
                                                        size={11}
                                                        color={c.subtext}
                                                    />
                                                </View>
                                            )}
                                            <Text
                                                style={[
                                                    styles.creatorText,
                                                    { color: '#007AFF' },
                                                ]}
                                            >
                                                @{creatorUsername}
                                            </Text>
                                        </Pressable>
                                    ) : null}
                                    {spot?.tags && spot.tags.length > 0 ? (
                                        <View
                                            style={[
                                                styles.tagsRow,
                                                {
                                                    marginTop: 10,
                                                    marginBottom: 0,
                                                },
                                            ]}
                                        >
                                            {spot.tags.map((tag) => (
                                                <View
                                                    key={tag}
                                                    style={[
                                                        styles.tag,
                                                        {
                                                            backgroundColor:
                                                                c.tagBg,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.tagText,
                                                            {
                                                                color: c.subtext,
                                                            },
                                                        ]}
                                                    >
                                                        #{tag}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: 8,
                                    marginTop: 12,
                                    marginBottom: 4,
                                }}
                            >
                                <Pressable
                                    onPress={handleShare}
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        backgroundColor: c.tagBg,
                                        borderRadius: 20,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <Ionicons
                                        name="share-outline"
                                        size={16}
                                        color={c.text}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            fontWeight: '600',
                                            color: c.text,
                                        }}
                                    >
                                        Share
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleDirections}
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        backgroundColor: 'rgba(0,122,255,0.12)',
                                        borderRadius: 20,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <Ionicons
                                        name="navigate-outline"
                                        size={16}
                                        color="#007AFF"
                                    />
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            fontWeight: '600',
                                            color: '#007AFF',
                                        }}
                                    >
                                        Directions
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={onToggleFavorite}
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        backgroundColor: isFavorite
                                            ? 'rgba(255,59,48,0.12)'
                                            : c.tagBg,
                                        borderRadius: 20,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <Ionicons
                                        name={
                                            isFavorite
                                                ? 'bookmark'
                                                : 'bookmark-outline'
                                        }
                                        size={16}
                                        color={isFavorite ? '#FF3B30' : c.text}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            fontWeight: '600',
                                            color: isFavorite
                                                ? '#FF3B30'
                                                : c.text,
                                        }}
                                    >
                                        Save
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={onToggleWishlist}
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        backgroundColor: isWishlisted
                                            ? 'rgba(255,149,0,0.12)'
                                            : c.tagBg,
                                        borderRadius: 20,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <Ionicons
                                        name={
                                            isWishlisted
                                                ? 'star'
                                                : 'star-outline'
                                        }
                                        size={16}
                                        color={
                                            isWishlisted ? '#FF9500' : c.text
                                        }
                                    />
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            fontWeight: '600',
                                            color: isWishlisted
                                                ? '#FF9500'
                                                : c.text,
                                        }}
                                    >
                                        Wishlist
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Rating Summary Bar */}
                        {detailsLoading ? (
                            <View
                                style={[
                                    styles.ratingBar,
                                    { backgroundColor: c.tagBg },
                                ]}
                            >
                                <SkeletonBar width={30} height={16} />
                                <SkeletonBar width={80} height={14} />
                                <SkeletonBar
                                    width={60}
                                    height={12}
                                    style={{ marginLeft: 'auto' }}
                                />
                            </View>
                        ) : reviews.length > 0 ? (
                            <View
                                style={[
                                    styles.ratingBar,
                                    { backgroundColor: c.tagBg },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.ratingScore,
                                        { color: c.text },
                                    ]}
                                >
                                    {avgRating.toFixed(1)}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 16,
                                        color: '#F5A623',
                                        letterSpacing: 2,
                                    }}
                                >
                                    {'★'.repeat(Math.round(avgRating))}
                                    {'☆'.repeat(5 - Math.round(avgRating))}
                                </Text>
                                <Text
                                    style={[
                                        styles.ratingCount,
                                        { color: c.subtext },
                                    ]}
                                >
                                    {reviews.length} review
                                    {reviews.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        ) : null}

                        {/* Images */}
                        {detailsLoading ? (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: 8,
                                    marginVertical: 10,
                                }}
                            >
                                <SkeletonBar
                                    width={110}
                                    height={82}
                                    style={{ borderRadius: 10 }}
                                />
                                <SkeletonBar
                                    width={110}
                                    height={82}
                                    style={{ borderRadius: 10 }}
                                />
                            </View>
                        ) : isOwner ? (
                            <FlatList
                                data={[...images, ...pendingImages, 'add']}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item}
                                style={styles.imageList}
                                renderItem={({ item }) => {
                                    if (item === 'add') {
                                        if (
                                            images.length +
                                                pendingImages.length >=
                                            5
                                        )
                                            return null;
                                        return (
                                            <Pressable
                                                onPress={handlePickImages}
                                                style={[
                                                    styles.addImageBtn,
                                                    {
                                                        borderColor:
                                                            c.inputBorder,
                                                    },
                                                ]}
                                            >
                                                <Ionicons
                                                    name="camera-outline"
                                                    size={22}
                                                    color={c.subtext}
                                                />
                                                <Text
                                                    style={[
                                                        styles.addImageText,
                                                        { color: c.subtext },
                                                    ]}
                                                >
                                                    Add
                                                </Text>
                                            </Pressable>
                                        );
                                    }
                                    const isPending =
                                        pendingImages.includes(item);
                                    return (
                                        <View
                                            style={{
                                                marginRight: 8,
                                                position: 'relative',
                                            }}
                                        >
                                            <Pressable
                                                onPress={() =>
                                                    !isPending &&
                                                    setSelectedImageIndex(
                                                        images.indexOf(item)
                                                    )
                                                }
                                            >
                                                <Image
                                                    source={{ uri: item }}
                                                    style={[
                                                        styles.thumbnail,
                                                        {
                                                            opacity: isPending
                                                                ? 0.5
                                                                : 1,
                                                        },
                                                    ]}
                                                    resizeMode="cover"
                                                />
                                            </Pressable>
                                            <Pressable
                                                onPress={() =>
                                                    isPending
                                                        ? setPendingImages(
                                                              (prev) =>
                                                                  prev.filter(
                                                                      (u) =>
                                                                          u !==
                                                                          item
                                                                  )
                                                          )
                                                        : onDeleteImage(item)
                                                }
                                                style={styles.deleteImageBtn}
                                            >
                                                <Ionicons
                                                    name="close"
                                                    size={12}
                                                    color="white"
                                                />
                                            </Pressable>
                                            {isPending ? (
                                                <View
                                                    style={styles.pendingBadge}
                                                >
                                                    <Text
                                                        style={
                                                            styles.pendingText
                                                        }
                                                    >
                                                        Pending
                                                    </Text>
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
                                    <Pressable
                                        onPress={() =>
                                            setSelectedImageIndex(
                                                images.indexOf(url)
                                            )
                                        }
                                        style={{ marginRight: 8 }}
                                    >
                                        <Image
                                            source={{ uri: url }}
                                            style={styles.thumbnail}
                                            resizeMode="cover"
                                        />
                                    </Pressable>
                                )}
                            />
                        ) : null}

                        {pendingImages.length > 0 && isOwner ? (
                            <Pressable
                                onPress={handleUploadPending}
                                style={[
                                    styles.uploadBtn,
                                    { backgroundColor: c.buttonBg },
                                ]}
                            >
                                <Ionicons
                                    name="cloud-upload-outline"
                                    size={16}
                                    color={c.background}
                                />
                                <Text
                                    style={[
                                        styles.uploadBtnText,
                                        { color: c.background },
                                    ]}
                                >
                                    Upload {pendingImages.length} photo
                                    {pendingImages.length > 1 ? 's' : ''}
                                </Text>
                            </Pressable>
                        ) : null}

                        {spot?.spot_type === 'spot' ? (
                            <View style={{ marginTop: 8, marginBottom: 4 }}>
                                <View
                                    style={[
                                        styles.divider,
                                        { backgroundColor: c.border },
                                    ]}
                                />
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: '700',
                                            color: c.text,
                                        }}
                                    >
                                        Current Conditions
                                    </Text>
                                    <Pressable
                                        onPress={async () => {
                                            if (showConditionPicker) {
                                                if (
                                                    conditionsChangedRef.current
                                                ) {
                                                    onConditionDone?.();
                                                }
                                                conditionsChangedRef.current = false;
                                                setShowConditionPicker(false);
                                            } else {
                                                setShowConditionPicker(true);
                                            }
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                            paddingHorizontal: 10,
                                            paddingVertical: 5,
                                            borderRadius: 12,
                                            backgroundColor: showConditionPicker
                                                ? c.border
                                                : c.tagBg,
                                        }}
                                    >
                                        <Ionicons
                                            name={
                                                showConditionPicker
                                                    ? 'close'
                                                    : 'add'
                                            }
                                            size={14}
                                            color={c.subtext}
                                        />
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: c.subtext,
                                                fontWeight: '500',
                                            }}
                                        >
                                            {showConditionPicker
                                                ? 'Done'
                                                : myConditions.length > 0
                                                  ? 'Update'
                                                  : 'Report'}
                                        </Text>
                                    </Pressable>
                                </View>

                                {activeConditions.length === 0 &&
                                !showConditionPicker ? (
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: c.subtext,
                                        }}
                                    >
                                        No conditions reported yet.
                                    </Text>
                                ) : null}

                                {activeConditions.length > 0 &&
                                !showConditionPicker ? (
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            gap: 6,
                                        }}
                                    >
                                        {activeConditions.map((condition) => {
                                            const meta =
                                                CONDITION_META[condition];
                                            const isMine =
                                                myConditions.includes(
                                                    condition
                                                );
                                            return (
                                                <View
                                                    key={condition}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 6,
                                                        borderRadius: 20,
                                                        backgroundColor:
                                                            meta.bg,
                                                        borderWidth: isMine
                                                            ? 1.5
                                                            : 0,
                                                        borderColor: isMine
                                                            ? meta.color
                                                            : 'transparent',
                                                    }}
                                                >
                                                    <Text
                                                        style={{ fontSize: 12 }}
                                                    >
                                                        {meta.icon}
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            color: meta.color,
                                                            fontWeight: '700',
                                                        }}
                                                    >
                                                        {meta.label}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null}

                                {showConditionPicker ? (
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            gap: 6,
                                        }}
                                    >
                                        {(
                                            Object.keys(
                                                CONDITION_META
                                            ) as SpotCondition[]
                                        ).map((condition) => {
                                            const meta =
                                                CONDITION_META[condition];
                                            const isActive =
                                                activeConditions.includes(
                                                    condition
                                                );
                                            const isMine =
                                                myConditions.includes(
                                                    condition
                                                );
                                            return (
                                                <Pressable
                                                    key={condition}
                                                    onPress={() =>
                                                        onToggleCondition(
                                                            condition
                                                        )
                                                    }
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 6,
                                                        borderRadius: 20,
                                                        backgroundColor:
                                                            isActive
                                                                ? meta.bg
                                                                : c.tagBg,
                                                        borderWidth: 1,
                                                        borderColor: isMine
                                                            ? meta.color
                                                            : 'transparent',
                                                    }}
                                                >
                                                    <Text
                                                        style={{ fontSize: 12 }}
                                                    >
                                                        {meta.icon}
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            color: isActive
                                                                ? meta.color
                                                                : c.subtext,
                                                            fontWeight: isActive
                                                                ? '700'
                                                                : '400',
                                                        }}
                                                    >
                                                        {meta.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </View>
                        ) : null}

                        {/* Review Form - only show if no existing review */}
                        {!existingReviewId ? (
                            <View style={{ marginTop: 8, marginBottom: 4 }}>
                                <View
                                    style={[
                                        styles.divider,
                                        { backgroundColor: c.border },
                                    ]}
                                />
                                <View
                                    style={styles.section}
                                    ref={reviewFormRef}
                                    onLayout={(e) => {
                                        reviewFormY.current =
                                            e.nativeEvent.layout.y;
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.sectionTitle,
                                            { color: c.text },
                                        ]}
                                    >
                                        Leave a Review
                                    </Text>
                                    <Stars
                                        value={newRating}
                                        onChange={onChangeRating}
                                    />
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
                                                scrollRef.current?.scrollTo({
                                                    y: reviewFormY.current - 16,
                                                    animated: true,
                                                });
                                            }, 300);
                                        }}
                                        style={[
                                            styles.reviewInput,
                                            {
                                                borderColor: c.inputBorder,
                                                color: c.text,
                                                backgroundColor: c.surface,
                                            },
                                        ]}
                                    />
                                    <Pressable
                                        onPress={onSubmitReview}
                                        style={[
                                            styles.submitBtn,
                                            {
                                                backgroundColor: c.tagBg,
                                                borderWidth: 1,
                                                borderColor: c.border,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.submitBtnText,
                                                { color: c.text },
                                            ]}
                                        >
                                            Submit Review
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : null}

                        {/* Divider */}
                        {reviews.length > 0 ? (
                            <View
                                style={[
                                    styles.divider,
                                    {
                                        backgroundColor: c.border,
                                        marginTop: 24,
                                    },
                                ]}
                            />
                        ) : null}

                        {detailsLoading ? (
                            <View style={{ gap: 8, marginTop: 8 }}>
                                <SkeletonBar
                                    width="100%"
                                    height={60}
                                    style={{ borderRadius: 10 }}
                                />
                                <SkeletonBar
                                    width="100%"
                                    height={60}
                                    style={{ borderRadius: 10 }}
                                />
                            </View>
                        ) : reviews.length > 0 ? (
                            <View style={styles.section}>
                                <Text
                                    style={[
                                        styles.sectionTitle,
                                        { color: c.text },
                                    ]}
                                >
                                    Reviews
                                </Text>
                                {reviews.map((r) => (
                                    <View
                                        key={r.id}
                                        style={[
                                            styles.reviewCard,
                                            { backgroundColor: c.tagBg },
                                        ]}
                                    >
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: 6,
                                            }}
                                        >
                                            <Pressable
                                                onPress={() => {
                                                    if (
                                                        onViewProfile &&
                                                        r.user_id &&
                                                        r.user_id !==
                                                            currentUserId
                                                    ) {
                                                        onViewProfile(
                                                            r.user_id
                                                        );
                                                    }
                                                }}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                {r.avatar_url ? (
                                                    <Image
                                                        source={{
                                                            uri: r.avatar_url,
                                                        }}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 14,
                                                        }}
                                                    />
                                                ) : (
                                                    <View
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 14,
                                                            backgroundColor:
                                                                c.tagBg,
                                                            alignItems:
                                                                'center',
                                                            justifyContent:
                                                                'center',
                                                        }}
                                                    >
                                                        <Ionicons
                                                            name="person-outline"
                                                            size={14}
                                                            color={c.subtext}
                                                        />
                                                    </View>
                                                )}
                                                {r.username ? (
                                                    <Text
                                                        style={[
                                                            styles.reviewUsername,
                                                            {
                                                                color:
                                                                    r.user_id !==
                                                                    currentUserId
                                                                        ? '#007AFF'
                                                                        : c.subtext,
                                                                fontWeight:
                                                                    '600',
                                                            },
                                                        ]}
                                                    >
                                                        @{r.username}
                                                    </Text>
                                                ) : null}
                                            </Pressable>
                                            <Text
                                                style={[
                                                    styles.reviewDate,
                                                    { color: c.subtext },
                                                ]}
                                            >
                                                {new Date(
                                                    r.created_at
                                                ).toLocaleDateString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </Text>
                                        </View>

                                        {editingReviewId === r.id ? (
                                            <View>
                                                <Stars
                                                    value={newRating}
                                                    onChange={onChangeRating}
                                                />
                                                <TextInput
                                                    ref={commentInputRef}
                                                    value={newComment}
                                                    onChangeText={
                                                        onChangeComment
                                                    }
                                                    placeholder={getRatingHint(
                                                        newRating
                                                    )}
                                                    placeholderTextColor={
                                                        c.placeholder
                                                    }
                                                    autoCorrect
                                                    multiline
                                                    autoFocus
                                                    returnKeyType="done"
                                                    submitBehavior="blurAndSubmit"
                                                    autoCapitalize="sentences"
                                                    style={[
                                                        styles.reviewInput,
                                                        {
                                                            borderColor:
                                                                c.inputBorder,
                                                            color: c.text,
                                                            backgroundColor:
                                                                c.surface,
                                                            marginTop: 8,
                                                        },
                                                    ]}
                                                />
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        gap: 8,
                                                        marginTop: 8,
                                                    }}
                                                >
                                                    <Pressable
                                                        onPress={() =>
                                                            setEditingReviewId(
                                                                null
                                                            )
                                                        }
                                                        style={{
                                                            flex: 1,
                                                            padding: 10,
                                                            borderRadius: 8,
                                                            borderWidth: 1,
                                                            borderColor:
                                                                c.border,
                                                            alignItems:
                                                                'center',
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: c.subtext,
                                                                fontWeight:
                                                                    '600',
                                                            }}
                                                        >
                                                            Cancel
                                                        </Text>
                                                    </Pressable>
                                                    <Pressable
                                                        onPress={() => {
                                                            onSubmitReview();
                                                            setEditingReviewId(
                                                                null
                                                            );
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            padding: 10,
                                                            borderRadius: 8,
                                                            backgroundColor:
                                                                c.tagBg,
                                                            borderWidth: 1,
                                                            borderColor:
                                                                c.border,
                                                            alignItems:
                                                                'center',
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: c.text,
                                                                fontWeight:
                                                                    '600',
                                                            }}
                                                        >
                                                            Save
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            </View>
                                        ) : (
                                            <>
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        color: '#F5A623',
                                                        letterSpacing: 1,
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    {'★'.repeat(r.rating)}
                                                    {'☆'.repeat(5 - r.rating)}
                                                </Text>
                                                {r.comment || r.text ? (
                                                    <Text
                                                        style={[
                                                            styles.reviewComment,
                                                            { color: c.text },
                                                        ]}
                                                    >
                                                        {r.comment ?? r.text}
                                                    </Text>
                                                ) : null}
                                                {r.user_id === currentUserId ? (
                                                    <View
                                                        style={[
                                                            styles.reviewActions,
                                                            { marginTop: 6 },
                                                        ]}
                                                    >
                                                        <Pressable
                                                            onPress={() => {
                                                                setEditingReviewId(
                                                                    r.id
                                                                );
                                                                onChangeRating(
                                                                    r.rating
                                                                );
                                                                onChangeComment(
                                                                    r.comment ??
                                                                        r.text ??
                                                                        ''
                                                                );
                                                                setTimeout(
                                                                    () => {
                                                                        scrollRef.current?.scrollTo(
                                                                            {
                                                                                y:
                                                                                    reviewFormY.current -
                                                                                    16,
                                                                                animated: true,
                                                                            }
                                                                        );
                                                                    },
                                                                    100
                                                                );
                                                            }}
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.editText
                                                                }
                                                            >
                                                                Edit
                                                            </Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={() =>
                                                                onDeleteReview(
                                                                    r.id
                                                                )
                                                            }
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.deleteText,
                                                                    {
                                                                        color: c.danger,
                                                                    },
                                                                ]}
                                                            >
                                                                Delete
                                                            </Text>
                                                        </Pressable>
                                                    </View>
                                                ) : (
                                                    <Pressable
                                                        onPress={() => {
                                                            if (
                                                                isReviewFlaggedByMe(
                                                                    r.id
                                                                )
                                                            ) {
                                                                onToggleReviewFlag(
                                                                    r.id,
                                                                    undefined
                                                                );
                                                                return;
                                                            }
                                                            ActionSheetIOS.showActionSheetWithOptions(
                                                                {
                                                                    title: 'Why are you flagging this review?',
                                                                    options: [
                                                                        'Cancel',
                                                                        'Inappropriate content',
                                                                        'Spam',
                                                                        'Harassment',
                                                                        'Other',
                                                                    ],
                                                                    cancelButtonIndex: 0,
                                                                },
                                                                (
                                                                    buttonIndex
                                                                ) => {
                                                                    if (
                                                                        buttonIndex ===
                                                                        0
                                                                    )
                                                                        return;
                                                                    const reasons =
                                                                        [
                                                                            'Inappropriate content',
                                                                            'Spam',
                                                                            'Harassment',
                                                                            'Other',
                                                                        ];
                                                                    onToggleReviewFlag(
                                                                        r.id,
                                                                        reasons[
                                                                            buttonIndex -
                                                                                1
                                                                        ]
                                                                    );
                                                                }
                                                            );
                                                        }}
                                                        style={{
                                                            marginTop: 6,
                                                            alignSelf:
                                                                'flex-start',
                                                        }}
                                                    >
                                                        <Ionicons
                                                            name={
                                                                isReviewFlaggedByMe(
                                                                    r.id
                                                                )
                                                                    ? 'flag'
                                                                    : 'flag-outline'
                                                            }
                                                            size={14}
                                                            color={
                                                                isReviewFlaggedByMe(
                                                                    r.id
                                                                )
                                                                    ? '#FF3B30'
                                                                    : c.subtext
                                                            }
                                                        />
                                                    </Pressable>
                                                )}
                                            </>
                                        )}
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        {/* Footer Actions */}
                        <View
                            style={[
                                styles.footerActions,
                                { borderTopColor: c.border },
                            ]}
                        >
                            <Pressable
                                onPress={onClose}
                                style={[
                                    styles.closeBtn,
                                    { borderColor: c.border },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.closeBtnText,
                                        { color: c.text },
                                    ]}
                                >
                                    Close
                                </Text>
                            </Pressable>
                            {spot && isOwner ? (
                                <Pressable
                                    onPress={() => onDelete(spot)}
                                    style={[
                                        styles.deleteSpotBtn,
                                        { borderColor: c.danger },
                                    ]}
                                >
                                    <Ionicons
                                        name="trash-outline"
                                        size={15}
                                        color={c.danger}
                                    />
                                    <Text
                                        style={[
                                            styles.deleteSpotText,
                                            { color: c.danger },
                                        ]}
                                    >
                                        Delete
                                    </Text>
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
                <Animated.View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.95)',
                        transform: [{ translateY }],
                    }}
                    {...panResponder.panHandlers}
                >
                    <FlatList
                        data={images}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={selectedImageIndex ?? 0}
                        getItemLayout={(_, index) => ({
                            length: width,
                            offset: width * index,
                            index,
                        })}
                        keyExtractor={(url) => url}
                        renderItem={({ item: url }) => (
                            <View
                                style={{
                                    width,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
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
                        <View style={styles.dotRow}>
                            {images.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        {
                                            backgroundColor:
                                                i === currentIndex
                                                    ? 'white'
                                                    : 'rgba(255,255,255,0.35)',
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    ) : null}
                </Animated.View>
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
        flexShrink: 0,
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
});
