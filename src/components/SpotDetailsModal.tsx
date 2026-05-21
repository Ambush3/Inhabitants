import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import { Spot, Review } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTheme } from '@/src/context/ThemeContext';
import { CONDITION_META, SpotCondition } from '@/src/hooks/useSpotConditions';
import { SpotCommentsModal } from '@/src/components/SpotCommentsModal';
import { CollectionsModal } from '@/src/components/CollectionsModal';

const geocodeCache = new Map<string, string>();

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(miles: number): string {
  if (miles < 0.1) return '<0.1 mi';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles).toLocaleString('en-US')} mi`;
}

function SkeletonBar({ width, height = 14, style }: { width: number | string; height?: number; style?: any }) {
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
  commentCount: number;
  onChangeRating: (v: number) => void;
  onChangeComment: (v: string) => void;
  onSubmitReview: (overrideRating?: number) => void;
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
  onToggleReviewFlag: (reviewId: string, reason?: string) => void | Promise<void>;
  detailsLoading: boolean;
  onViewProfile?: (userId: string) => void;
  onConditionDone?: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
  spotId: string | null;
  friendIds?: Set<string>;
  onUpdateSpot: (spotId: string, name: string, description: string, tags: string[]) => Promise<string | null>;
  creatorBadge?: 'local' | 'regular' | 'ambassador' | null;
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
  commentCount,
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
  spotId,
  friendIds,
  onUpdateSpot,
  creatorBadge,
}: Props) {
  const { width } = Dimensions.get('window');
  const { theme } = useTheme();
  const c = theme.colors;

  const scrollRef = useRef<ScrollView>(null);
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const [spotAddress, setSpotAddress] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [liveCommentCount, setLiveCommentCount] = useState(commentCount);
  const [collectionsOpen, setCollectionsOpen] = useState(false);

  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [otherFlagText, setOtherFlagText] = useState('');
  const [flagging, setFlagging] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editSaving, setEditSaving] = useState(false);

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

  useEffect(() => {
    setLiveCommentCount(commentCount);
  }, [commentCount]);

  const distanceMiles =
    spot && userLocation ? haversineMiles(userLocation.latitude, userLocation.longitude, spot.lat, spot.lng) : null;

  const reviewFormRef = useRef<View>(null);
  const reviewFormY = useRef(0);

  const conditionsChangedRef = useRef(false);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  });

  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
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

  function handleFlag() {
    if (isFlaggedByMe) {
      onToggleFlag(undefined);
      return;
    }
    setFlagModalOpen(true);
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
    result.assets.forEach((asset) =>
      setPendingImages((prev) => (prev.includes(asset.uri) ? prev : [...prev, asset.uri]))
    );
  }

  async function handleUploadPending() {
    if (!pendingImages.length) return;
    await onUploadImages(pendingImages);
    setPendingImages([]);
  }

  const isOwner = spot?.user_id === currentUserId;

  const renderImageItem = useCallback(
    ({ item }: { item: string }) => {
      if (item === 'add') {
        if (images.length + pendingImages.length >= 5) return null;
        return (
          <Pressable onPress={handlePickImages} style={[styles.addImageBtn, { borderColor: c.inputBorder }]}>
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
            onPress={() =>
              isPending ? setPendingImages((prev) => prev.filter((u) => u !== item)) : onDeleteImage(item)
            }
            style={styles.deleteImageBtn}>
            <Ionicons name="close" size={12} color="white" />
          </Pressable>
          {isPending ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          ) : null}
        </View>
      );
    },
    [images, pendingImages, c]
  );

  const renderViewImageItem = useCallback(
    ({ item: url }: { item: string }) => (
      <Pressable onPress={() => setSelectedImageIndex(images.indexOf(url))} style={{ marginRight: 8 }}>
        <Image source={{ uri: url }} style={styles.thumbnail} resizeMode="cover" />
      </Pressable>
    ),
    [images]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}>
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
            <View style={[styles.dragHandle, { backgroundColor: c.border }]} />
          </View>

          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={scrollEnabled}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Header */}
            <View style={{ marginBottom: 10 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: 4,
                }}>
                <View style={{ flex: 1, minWidth: 0, overflow: 'visible' }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      overflow: 'visible',
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                        marginRight: 8,
                      }}>
                      <Text
                        style={[
                          styles.spotName,
                          {
                            color: c.text,
                            flexShrink: 1,
                          },
                        ]}
                        numberOfLines={2}
                        ellipsizeMode="tail">
                        {spot?.name ?? 'Spot'}
                      </Text>
                      {spot?.is_verified ? (
                        <Pressable
                          onPress={() =>
                            Alert.alert(
                              'Verified Spot',
                              'This spot has been rated by 3 or more skaters.'
                            )
                          }>
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
                      {isOwner ? (
                        <Pressable
                          onPress={() => {
                            setEditName(spot?.name ?? '');
                            setEditDesc(spot?.description ?? '');
                            setEditTags(spot?.tags ?? []);
                            setEditOpen(true);
                          }}
                          style={{ marginLeft: 8, marginTop: 4 }}>
                          <Ionicons name="pencil-outline" size={16} color={c.subtext} />
                        </Pressable>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => setCommentsOpen(true)}
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingTop: 4,
                        paddingRight: 8,
                        overflow: 'visible',
                      }}>
                      <Ionicons name="chatbubbles-outline" size={24} color={c.text} />
                      {liveCommentCount > 0 ? (
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 2,
                            minWidth: 16,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: '#007AFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 4,
                          }}>
                          <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>
                            {liveCommentCount > 99 ? '99+' : liveCommentCount}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  </View>
                  {spotAddress || distanceMiles !== null ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 2,
                        marginBottom: 5,
                      }}>
                      <Ionicons name="location-outline" size={12} color={c.subtext} />
                      <Text
                        style={{
                          fontSize: 12,
                          color: c.subtext,
                          flexShrink: 1,
                        }}
                        numberOfLines={1}>
                        {spotAddress ? (
                          <Text
                            style={{
                              color: c.text,
                              fontWeight: '600',
                            }}>
                            {spotAddress}
                          </Text>
                        ) : null}
                        {spotAddress && distanceMiles !== null ? ' · ' : ''}
                        {distanceMiles !== null ? `${formatDistance(distanceMiles)} away` : ''}
                      </Text>
                    </View>
                  ) : null}
                  {creatorUsername ? (
                    <Pressable
                      onPress={() => {
                        if (onViewProfile && spot?.user_id && spot.user_id !== currentUserId) {
                          onViewProfile(spot.user_id);
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 3,
                        alignSelf: 'flex-start',
                      }}>
                      {creatorAvatarUrl ? (
                        <Image
                          source={{ uri: creatorAvatarUrl }}
                          style={{ width: 20, height: 20, borderRadius: 10 }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: c.tagBg,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Ionicons name="person-outline" size={11} color={c.subtext} />
                        </View>
                      )}
                      <Text style={[styles.creatorText, { color: '#007AFF' }]}>
                        @{creatorUsername}
                      </Text>
                      {creatorBadge ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor:
                              creatorBadge === 'ambassador'
                                ? 'rgba(255,149,0,0.12)'
                                : creatorBadge === 'regular'
                                  ? 'rgba(0,122,255,0.12)'
                                  : 'rgba(52,199,89,0.12)',
                          }}>
                          <Ionicons
                            name="shield-checkmark"
                            size={10}
                            color={
                              creatorBadge === 'ambassador'
                                ? '#FF9500'
                                : creatorBadge === 'regular'
                                  ? '#007AFF'
                                  : '#34C759'
                            }
                          />
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '700',
                              color:
                                creatorBadge === 'ambassador'
                                  ? '#FF9500'
                                  : creatorBadge === 'regular'
                                    ? '#007AFF'
                                    : '#34C759',
                            }}>
                            {creatorBadge.toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
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
                      ]}>
                      {spot.tags.map((tag) => (
                        <View
                          key={tag}
                          style={[
                            styles.tag,
                            {
                              backgroundColor: c.tagBg,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.tagText,
                              {
                                color: c.subtext,
                              },
                            ]}>
                            #{tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
              {/* Row 1 - Save, Wishlist */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8 }}>
                <Pressable
                  onPress={onToggleFavorite}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: isFavorite ? 'rgba(255,59,48,0.12)' : c.tagBg,
                    borderRadius: 20,
                    paddingVertical: 10,
                  }}>
                  <Ionicons
                    name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                    size={16}
                    color={isFavorite ? '#FF3B30' : c.text}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: isFavorite ? '#FF3B30' : c.text,
                    }}>
                    Save
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCollectionsOpen(true)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: c.tagBg,
                    borderRadius: 20,
                    paddingVertical: 10,
                  }}>
                  <Ionicons name="folder-outline" size={16} color={c.text} />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: c.text }}>Collections</Text>
                </Pressable>
              </View>
              {/* Row 2 - Share, Directions */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
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
                  }}>
                  <Ionicons name="share-outline" size={16} color={c.text} />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: c.text }}>Share</Text>
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
                  }}>
                  <Ionicons name="navigate-outline" size={16} color="#007AFF" />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#007AFF' }}>
                    Directions
                  </Text>
                </Pressable>
              </View>
            </View>
            {/* Rating Summary Bar */}
            {detailsLoading ? (
              <View style={[styles.ratingBar, { backgroundColor: c.tagBg }]}>
                <SkeletonBar width={30} height={16} />
                <SkeletonBar width={80} height={14} />
                <SkeletonBar width={60} height={12} style={{ marginLeft: 'auto' }} />
              </View>
            ) : reviews.length > 0 ? (
              <View style={[styles.ratingBar, { backgroundColor: c.tagBg }]}>
                <Text style={[styles.ratingScore, { color: c.text }]}>{avgRating.toFixed(1)}</Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: '#F5A623',
                    letterSpacing: 2,
                  }}>
                  {'★'.repeat(Math.round(avgRating))}
                  {'☆'.repeat(5 - Math.round(avgRating))}
                </Text>
                <Text style={[styles.ratingCount, { color: c.subtext }]}>
                  {reviews.length} rating
                  {reviews.length !== 1 ? 's' : ''}
                </Text>
              </View>
            ) : null}
            {/* Rate this spot */}
            {spot?.spot_type === 'spot' ? (
              <View style={{ marginBottom: 16 }}>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>
                    {existingReviewId ? 'Your Rating' : 'Rate this spot'}
                  </Text>
                  {existingReviewId ? (
                    <Pressable onPress={() => onDeleteReview(existingReviewId)}>
                      <Text style={{ fontSize: 12, color: c.danger }}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => {
                        onChangeRating(star);
                        onSubmitReview(star);
                      }}>
                      <Ionicons
                        name={star <= newRating ? 'star' : 'star-outline'}
                        size={28}
                        color={star <= newRating ? '#F5A623' : c.subtext}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {/* Images */}
            {visible && detailsLoading ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  marginVertical: 10,
                }}>
                <SkeletonBar width={110} height={82} style={{ borderRadius: 10 }} />
                <SkeletonBar width={110} height={82} style={{ borderRadius: 10 }} />
              </View>
            ) : visible && isOwner ? (
              <FlatList
                data={[...images, ...pendingImages, 'add']}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                style={styles.imageList}
                renderItem={renderImageItem}
              />
            ) : visible && images.length > 0 ? (
              <FlatList
                data={images}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(url) => url}
                style={styles.imageList}
                renderItem={renderViewImageItem}
              />
            ) : null}
            {pendingImages.length > 0 && isOwner ? (
              <Pressable
                onPress={handleUploadPending}
                style={[styles.uploadBtn, { backgroundColor: c.buttonBg }]}>
                <Ionicons name="cloud-upload-outline" size={16} color={c.background} />
                <Text style={[styles.uploadBtnText, { color: c.background }]}>
                  Upload {pendingImages.length} photo
                  {pendingImages.length > 1 ? 's' : ''}
                </Text>
              </Pressable>
            ) : null}
            {spot?.spot_type === 'spot' ? (
              <View style={{ marginTop: 8, marginBottom: 4 }}>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: c.text,
                    }}>
                    Current Conditions
                  </Text>
                  <Pressable
                    onPress={async () => {
                      if (showConditionPicker) {
                        if (conditionsChangedRef.current) {
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
                      backgroundColor: showConditionPicker ? c.border : c.tagBg,
                    }}>
                    <Ionicons
                      name={showConditionPicker ? 'close' : 'add'}
                      size={14}
                      color={c.subtext}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: c.subtext,
                        fontWeight: '500',
                      }}>
                      {showConditionPicker
                        ? 'Done'
                        : myConditions.length > 0
                          ? 'Update'
                          : 'Report'}
                    </Text>
                  </Pressable>
                </View>

                {activeConditions.length === 0 && !showConditionPicker ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: c.subtext,
                    }}>
                    No conditions reported yet.
                  </Text>
                ) : null}

                {activeConditions.length > 0 && !showConditionPicker ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}>
                    {activeConditions.map((condition) => {
                      const meta = CONDITION_META[condition];
                      const isMine = myConditions.includes(condition);
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
                            backgroundColor: meta.bg,
                            borderWidth: isMine ? 1.5 : 0,
                            borderColor: isMine ? meta.color : 'transparent',
                          }}>
                          <Text style={{ fontSize: 12 }}>{meta.icon}</Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: meta.color,
                              fontWeight: '700',
                            }}>
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
                    }}>
                    {(Object.keys(CONDITION_META) as SpotCondition[]).map((condition) => {
                      const meta = CONDITION_META[condition];
                      const isActive = activeConditions.includes(condition);
                      const isMine = myConditions.includes(condition);
                      return (
                        <Pressable
                          key={condition}
                          onPress={() => onToggleCondition(condition)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 20,
                            backgroundColor: isActive ? meta.bg : c.tagBg,
                            borderWidth: 1,
                            borderColor: isMine ? meta.color : 'transparent',
                          }}>
                          <Text style={{ fontSize: 12 }}>{meta.icon}</Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: isActive ? meta.color : c.subtext,
                              fontWeight: isActive ? '700' : '400',
                            }}>
                            {meta.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}
            {/* Footer Actions */}
            <View style={[styles.footerActions, { borderTopColor: c.border }]}>
              {spot && isOwner ? (
                <Pressable
                  onPress={() => onDelete(spot)}
                  style={[styles.deleteSpotBtn, { borderColor: c.danger }]}>
                  <Ionicons name="trash-outline" size={15} color={c.danger} />
                  <Text style={[styles.deleteSpotText, { color: c.danger }]}>Delete</Text>
                </Pressable>
              ) : !isOwner ? (
                <Pressable
                  onPress={handleFlag}
                  style={[styles.closeBtn, { borderColor: isFlaggedByMe ? '#FF3B30' : c.border }]}>
                  <Ionicons
                    name={isFlaggedByMe ? 'flag' : 'flag-outline'}
                    size={15}
                    color={isFlaggedByMe ? '#FF3B30' : c.text}
                  />
                  <Text
                    style={{
                      fontWeight: '600',
                      fontSize: 15,
                      color: isFlaggedByMe ? '#FF3B30' : c.text,
                    }}>
                    {isFlaggedByMe ? 'Flagged' : 'Flag'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: c.border }]}>
                <Text style={[styles.closeBtnText, { color: c.text }]}>Close</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      {/* Fullscreen Image Viewer */}
      <Modal
        visible={selectedImageIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageIndex(null)}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.95)',
            transform: [{ translateY }],
          }}
          {...panResponder.panHandlers}>
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
                }}>
                <Image source={{ uri: url }} style={{ width, height: '80%' }} resizeMode="contain" />
              </View>
            )}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
          />
          <Pressable
            onPress={() => setSelectedImageIndex(null)}
            style={{ position: 'absolute', top: 60, right: 20 }}>
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
                      backgroundColor: i === currentIndex ? 'white' : 'rgba(255,255,255,0.35)',
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </Animated.View>
      </Modal>
      <CollectionsModal visible={collectionsOpen} onClose={() => setCollectionsOpen(false)} spotId={spotId} />
      <SpotCommentsModal
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        spotId={spotId}
        spotName={spot?.name ?? null}
        currentUserId={currentUserId}
        onCommentCountChange={(count) => setLiveCommentCount(count)}
        friendIds={friendIds}
        onViewProfile={(userId) => {
          setCommentsOpen(false);
          setTimeout(() => {
            onClose();
            setTimeout(() => {
              onViewProfile?.(userId);
            }, 350);
          }, 300);
        }}
      />
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
                Why are you flagging this spot?
              </Text>
              {['Incorrect location', "Doesn't exist", 'Inappropriate name', 'Spam', 'Other'].map(
                (reason) => (
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
                      color={flagReason === reason ? '#007AFF' : c.subtext}
                    />
                    <Text style={{ fontSize: 14, color: c.text }}>{reason}</Text>
                  </Pressable>
                )
              )}
              {flagReason === 'Other' ? (
                <TextInput
                  value={otherFlagText}
                  onChangeText={setOtherFlagText}
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
                onPress={async () => {
                  const reason = flagReason === 'Other' ? otherFlagText.trim() : flagReason;
                  if (!reason) return;
                  setFlagging(true);
                  await onToggleFlag(reason);
                  setFlagging(false);
                  setFlagModalOpen(false);
                  setFlagReason('');
                  setOtherFlagText('');
                }}
                disabled={flagging || !flagReason || (flagReason === 'Other' && !otherFlagText.trim())}
                style={{
                  backgroundColor: '#FF3B30',
                  borderRadius: 10,
                  padding: 13,
                  alignItems: 'center',
                  marginTop: 8,
                  opacity:
                    flagging || !flagReason || (flagReason === 'Other' && !otherFlagText.trim())
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
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setEditOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Pressable
              style={{
                backgroundColor: c.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                gap: 12,
              }}
              onPress={() => { }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: c.text }}>Edit Spot</Text>
              <Text style={{ fontSize: 13, color: c.subtext }}>Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                autoCapitalize="sentences"
                autoCorrect
                style={{
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 14,
                  color: c.text,
                  backgroundColor: c.surface,
                }}
              />
              <Text style={{ fontSize: 13, color: c.subtext }}>Description</Text>
              <TextInput
                value={editDesc}
                onChangeText={(text) => {
                  if (editDesc === '' && text.length === 1) {
                    setEditDesc(text.toUpperCase());
                    return;
                  }
                  if (text.length > editDesc.length) {
                    const lastChar = text[text.length - 1];
                    const prevChars = text.slice(0, -1).trimEnd();
                    if (
                      (lastChar !== ' ' && prevChars.endsWith('.')) ||
                      prevChars.endsWith('!') ||
                      prevChars.endsWith('?')
                    ) {
                      setEditDesc(text.slice(0, -1) + lastChar.toUpperCase());
                      return;
                    }
                  }
                  setEditDesc(text);
                }}
                autoCapitalize="sentences"
                autoCorrect
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: c.inputBorder,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 14,
                  color: c.text,
                  backgroundColor: c.surface,
                  height: 60,
                }}
              />
              <Text style={{ fontSize: 13, color: c.subtext }}>Tags</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={editTagInput}
                  onChangeText={setEditTagInput}
                  placeholder="Add a tag..."
                  placeholderTextColor={c.placeholder}
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: c.inputBorder,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: c.text,
                    backgroundColor: c.surface,
                  }}
                />
                <Pressable
                  onPress={() => {
                    const cleaned = editTagInput.trim().toLowerCase().replace(/\s+/g, '-');
                    if (!cleaned) return;
                    setEditTags((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
                    setEditTagInput('');
                  }}
                  style={{
                    backgroundColor: c.buttonBg,
                    borderRadius: 8,
                    padding: 10,
                    justifyContent: 'center',
                  }}>
                  <Text style={{ color: c.background, fontWeight: '600' }}>Add</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {editTags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => setEditTags((prev) => prev.filter((t) => t !== tag))}
                    style={{
                      backgroundColor: c.tagBg,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                    <Text style={{ fontSize: 13, color: c.text }}>#{tag}</Text>
                    <Text style={{ fontSize: 13, opacity: 0.5, color: c.text }}>✕</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={async () => {
                  setEditSaving(true);
                  const err = await onUpdateSpot(spot!.id, editName, editDesc, editTags);
                  setEditSaving(false);
                  if (err) {
                    Alert.alert('Error', err);
                  } else {
                    setEditOpen(false);
                  }
                }}
                disabled={editSaving || !editName.trim()}
                style={{
                  backgroundColor: '#007AFF',
                  borderRadius: 10,
                  padding: 13,
                  alignItems: 'center',
                  opacity: editSaving || !editName.trim() ? 0.4 : 1,
                }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
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
