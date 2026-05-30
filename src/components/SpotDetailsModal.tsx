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
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[{ width, height, borderRadius: 6, backgroundColor: '#888', opacity }, style]} />;
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
        const results = await Location.reverseGeocodeAsync({ latitude: spot.lat, longitude: spot.lng });
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

  const conditionsChangedRef = useRef(false);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  });

  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) {
          Animated.timing(translateY, { toValue: 800, duration: 200, useNativeDriver: true }).start(() => {
            translateY.setValue(0);
            setSelectedImageIndex(null);
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  function handleDirections() {
    if (!spot) return;
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Cancel', 'Open in Apple Maps', 'Open in Google Maps'], cancelButtonIndex: 0 },
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

  const badgeColor = creatorBadge === 'ambassador' ? '#FF9500' : creatorBadge === 'regular' ? '#007AFF' : '#34C759';
  const badgeBg =
    creatorBadge === 'ambassador'
      ? 'rgba(255,149,0,0.12)'
      : creatorBadge === 'regular'
        ? 'rgba(0,122,255,0.12)'
        : 'rgba(52,199,89,0.12)';

  const renderImageItem = useCallback(
    ({ item }: { item: string }) => {
      if (item === 'add') {
        if (images.length + pendingImages.length >= 5) return null;
        return (
          <Pressable
            onPress={handlePickImages}
            style={[styles.photoThumb, styles.photoAdd, { borderColor: c.inputBorder }]}>
            <Ionicons name="camera-outline" size={20} color={c.subtext} />
            <Text style={{ fontSize: 10, color: c.subtext, marginTop: 2 }}>Add photo</Text>
          </Pressable>
        );
      }
      const isPending = pendingImages.includes(item);
      return (
        <View style={{ marginRight: 8, position: 'relative' }}>
          <Pressable onPress={() => !isPending && setSelectedImageIndex(images.indexOf(item))}>
            <Image
              source={{ uri: item }}
              style={[styles.photoThumb, { opacity: isPending ? 0.5 : 1 }]}
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
        <Image source={{ uri: url }} style={styles.photoThumb} resizeMode="cover" />
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
          style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={onClose}
        />

        <View style={[styles.sheet, { backgroundColor: c.surface }]}>
          <View style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: c.border }]} />
          </View>

          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={scrollEnabled}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}>
            {spot && flagCount >= 3 ? (
              <View style={[styles.flagBanner, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                <Ionicons name="warning-outline" size={16} color={c.danger} />
                <Text style={{ fontSize: 13, color: c.danger, fontWeight: '600', flex: 1 }}>
                  This spot has been reported as no longer skateable
                </Text>
              </View>
            ) : null}

            {/* ── Spot identity ── */}
            <View style={{ marginBottom: 12 }}>
              <View style={styles.spotHeaderRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.spotNameRow}>
                    <Text
                      style={[styles.spotName, { color: c.text }]}
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
                          style={{ marginLeft: 6, marginTop: 3 }}
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
                        style={{ marginLeft: 8, marginTop: 3 }}>
                        <Ionicons name="pencil-outline" size={16} color={c.subtext} />
                      </Pressable>
                    ) : null}
                  </View>

                  {spotAddress || distanceMiles !== null ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={12} color={c.subtext} />
                      <Text style={{ fontSize: 12, color: c.subtext }} numberOfLines={1}>
                        {spotAddress ? (
                          <Text style={{ color: c.text, fontWeight: '600' }}>
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
                        if (onViewProfile && spot?.user_id && spot.user_id !== currentUserId)
                          onViewProfile(spot.user_id);
                      }}
                      style={styles.creatorRow}>
                      {creatorAvatarUrl ? (
                        <Image source={{ uri: creatorAvatarUrl }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, { backgroundColor: c.tagBg }]}>
                          <Ionicons name="person-outline" size={11} color={c.subtext} />
                        </View>
                      )}
                      <Text style={styles.creatorName}>@{creatorUsername}</Text>
                      {creatorBadge ? (
                        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                          <Ionicons name="shield-checkmark" size={10} color={badgeColor} />
                          <Text style={[styles.badgeText, { color: badgeColor }]}>
                            {creatorBadge.toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  ) : null}

                  {spot?.tags && spot.tags.length > 0 ? (
                    <View style={[styles.tagsRow, { marginTop: 10 }]}>
                      {spot.tags.map((tag) => (
                        <View key={tag} style={[styles.tag, { backgroundColor: c.tagBg }]}>
                          <Text style={[styles.tagText, { color: c.subtext }]}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                {/* Comment button lives top-right of header */}
                <Pressable onPress={() => setCommentsOpen(true)} style={styles.commentBtn}>
                  <Ionicons name="chatbubbles-outline" size={24} color={c.text} />
                  {liveCommentCount > 0 ? (
                    <View style={styles.commentBadge}>
                      <Text style={styles.commentBadgeText}>
                        {liveCommentCount > 99 ? '99+' : liveCommentCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </View>

            {/* ── Unified rating card ── */}
            {detailsLoading ? (
              <View style={[styles.ratingCard, { backgroundColor: c.tagBg }]}>
                <SkeletonBar width={30} height={16} />
                <SkeletonBar width={80} height={14} />
                <SkeletonBar width={60} height={12} style={{ marginLeft: 'auto' }} />
              </View>
            ) : (
              <View style={[styles.ratingCard, { backgroundColor: c.tagBg }]}>
                {/* Left: aggregate */}
                <View style={{ flex: 1 }}>
                  {reviews.length > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.ratingScore, { color: c.text }]}>
                        {avgRating.toFixed(1)}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#F5A623', letterSpacing: 1 }}>
                        {'★'.repeat(Math.round(avgRating))}
                        {'☆'.repeat(5 - Math.round(avgRating))}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.subtext }}>
                        {reviews.length} rating{reviews.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 13, color: c.subtext }}>No ratings yet</Text>
                  )}
                </View>

                {/* Right: your rating (spot type only) */}
                {spot?.spot_type === 'spot' ? (
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: c.subtext,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}>
                        {existingReviewId ? 'Your rating' : 'Rate'}
                      </Text>
                      {existingReviewId ? (
                        <Pressable onPress={() => onDeleteReview(existingReviewId)}>
                          <Text style={{ fontSize: 11, color: c.danger }}>Remove</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Pressable
                          key={star}
                          onPress={() => {
                            onChangeRating(star);
                            onSubmitReview(star);
                          }}>
                          <Ionicons
                            name={star <= newRating ? 'star' : 'star-outline'}
                            size={22}
                            color={star <= newRating ? '#F5A623' : c.subtext}
                          />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* ── Action toolbar ── */}
            <View style={styles.actionsToolbar}>
              <Pressable
                onPress={onToggleFavorite}
                style={[
                  styles.actionBtn,
                  { backgroundColor: isFavorite ? 'rgba(255,59,48,0.12)' : c.tagBg },
                ]}>
                <Ionicons
                  name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isFavorite ? '#FF3B30' : c.text}
                />
                <Text style={[styles.actionLabel, { color: isFavorite ? '#FF3B30' : c.subtext }]}>
                  Save
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCollectionsOpen(true)}
                style={[styles.actionBtn, { backgroundColor: c.tagBg }]}>
                <Ionicons name="folder-outline" size={20} color={c.text} />
                <Text style={[styles.actionLabel, { color: c.subtext }]}>Collections</Text>
              </Pressable>

              <Pressable onPress={handleShare} style={[styles.actionBtn, { backgroundColor: c.tagBg }]}>
                <Ionicons name="share-outline" size={20} color={c.text} />
                <Text style={[styles.actionLabel, { color: c.subtext }]}>Share</Text>
              </Pressable>

              <Pressable
                onPress={handleDirections}
                style={[styles.actionBtn, { backgroundColor: 'rgba(0,122,255,0.12)' }]}>
                <Ionicons name="navigate-outline" size={20} color="#007AFF" />
                <Text style={[styles.actionLabel, { color: '#007AFF' }]}>Directions</Text>
              </Pressable>
            </View>

            {/* ── Photos ── */}
            {visible ? (
              <View style={{ marginBottom: 14 }}>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>Photos</Text>
                  {isOwner && images.length + pendingImages.length < 5 ? (
                    <Pressable onPress={handlePickImages}>
                      <Text style={{ fontSize: 13, color: '#007AFF', fontWeight: '500' }}>
                        + Add
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {detailsLoading ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <SkeletonBar width={88} height={66} style={{ borderRadius: 10 }} />
                    <SkeletonBar width={88} height={66} style={{ borderRadius: 10 }} />
                  </View>
                ) : isOwner ? (
                  <FlatList
                    data={[...images, ...pendingImages, 'add']}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item}
                    renderItem={renderImageItem}
                  />
                ) : images.length > 0 ? (
                  <FlatList
                    data={images}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(url) => url}
                    renderItem={renderViewImageItem}
                  />
                ) : (
                  <Text style={{ fontSize: 12, color: c.subtext }}>No photos yet.</Text>
                )}

                {pendingImages.length > 0 && isOwner ? (
                  <Pressable
                    onPress={handleUploadPending}
                    style={[styles.uploadBtn, { backgroundColor: c.buttonBg }]}>
                    <Ionicons name="cloud-upload-outline" size={16} color={c.background} />
                    <Text style={[styles.uploadBtnText, { color: c.background }]}>
                      Upload {pendingImages.length} photo{pendingImages.length > 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* ── Conditions ── */}
            {spot?.spot_type === 'spot' ? (
              <View
                style={[
                  styles.conditionsCard,
                  { backgroundColor: 'rgba(52,199,89,0.06)', borderColor: 'rgba(52,199,89,0.12)' },
                ]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>Current Conditions</Text>
                  <Pressable
                    onPress={async () => {
                      if (showConditionPicker) {
                        if (conditionsChangedRef.current) onConditionDone?.();
                        conditionsChangedRef.current = false;
                        setShowConditionPicker(false);
                      } else {
                        setShowConditionPicker(true);
                      }
                    }}
                    style={[
                      styles.conditionToggleBtn,
                      { backgroundColor: showConditionPicker ? c.border : c.tagBg },
                    ]}>
                    <Ionicons
                      name={showConditionPicker ? 'close' : 'add'}
                      size={14}
                      color={c.subtext}
                    />
                    <Text style={{ fontSize: 12, color: c.subtext, fontWeight: '500' }}>
                      {showConditionPicker
                        ? 'Done'
                        : myConditions.length > 0
                          ? 'Update'
                          : 'Report'}
                    </Text>
                  </Pressable>
                </View>

                {activeConditions.length === 0 && !showConditionPicker ? (
                  <Text style={{ fontSize: 12, color: c.subtext, marginTop: 4 }}>
                    No conditions reported yet.
                  </Text>
                ) : null}

                {activeConditions.length > 0 && !showConditionPicker ? (
                  <View style={styles.chipsRow}>
                    {activeConditions.map((condition) => {
                      const meta = CONDITION_META[condition];
                      const isMine = myConditions.includes(condition);
                      return (
                        <View
                          key={condition}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: meta.bg,
                              borderWidth: isMine ? 1.5 : 0,
                              borderColor: isMine ? meta.color : 'transparent',
                            },
                          ]}>
                          <Text style={{ fontSize: 12 }}>{meta.icon}</Text>
                          <Text
                            style={{ fontSize: 12, color: meta.color, fontWeight: '700' }}>
                            {meta.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {showConditionPicker ? (
                  <View style={styles.chipsRow}>
                    {(Object.keys(CONDITION_META) as SpotCondition[]).map((condition) => {
                      const meta = CONDITION_META[condition];
                      const isActive = activeConditions.includes(condition);
                      const isMine = myConditions.includes(condition);
                      return (
                        <Pressable
                          key={condition}
                          onPress={() => {
                            conditionsChangedRef.current = true;
                            onToggleCondition(condition);
                          }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isActive ? meta.bg : c.tagBg,
                              borderWidth: 1,
                              borderColor: isMine ? meta.color : 'transparent',
                            },
                          ]}>
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

            {/* ── Footer actions ── */}
            <View style={[styles.footerActions, { borderTopColor: c.border }]}>
              {spot && isOwner ? (
                <Pressable
                  onPress={() => onDelete(spot)}
                  style={[
                    styles.footerBtn,
                    { borderColor: c.danger, backgroundColor: 'rgba(255,59,48,0.06)' },
                  ]}>
                  <Ionicons name="trash-outline" size={15} color={c.danger} />
                  <Text style={{ fontWeight: '600', fontSize: 15, color: c.danger }}>Delete</Text>
                </Pressable>
              ) : null}
              {!isOwner ? (
                <Pressable
                  onPress={handleFlag}
                  style={[styles.footerBtn, { borderColor: isFlaggedByMe ? '#FF3B30' : c.border }]}>
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
              <Pressable onPress={onClose} style={[styles.footerBtn, { borderColor: c.border }]}>
                <Text style={{ fontWeight: '600', fontSize: 15, color: c.text }}>Close</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ── Fullscreen image viewer ── */}
      <Modal
        visible={selectedImageIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageIndex(null)}>
        <Animated.View
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', transform: [{ translateY }] }}
          {...panResponder.panHandlers}>
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
                    { backgroundColor: i === currentIndex ? 'white' : 'rgba(255,255,255,0.35)' },
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
            onViewProfile?.(userId);
          }, 400);
        }}
      />

      {/* ── Flag modal ── */}
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
              {[
                'Incorrect location',
                "Doesn't exist",
                'Inappropriate name',
                'Spam',
                'Demolished',
                'Closed / Fenced Off',
                'Other',
              ].map((reason) => (
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
              ))}
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

      {/* ── Edit modal ── */}
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
                  if (err) Alert.alert('Error', err);
                  else setEditOpen(false);
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
  flagBanner: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  spotNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  spotName: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorName: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
  },
  commentBtn: {
    position: 'relative',
    padding: 4,
    paddingTop: 4,
    paddingRight: 8,
  },
  commentBadge: {
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
  },
  commentBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  ratingScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionsToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 14,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 14,
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  photoThumb: {
    width: 88,
    height: 66,
    borderRadius: 10,
    marginRight: 8,
  },
  photoAdd: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
    marginTop: 8,
  },
  uploadBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  conditionsCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  conditionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
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
