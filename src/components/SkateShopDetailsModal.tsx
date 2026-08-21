import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  StyleSheet,
  ActionSheetIOS,
  Share,
  Image,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Place } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '@/src/context/ThemeContext';
import { usePlaceReviews } from '@/src/hooks/usePlaceReviews';
import { usePlaceOverrides } from '@/src/hooks/usePlaceOverrides';
import { useAuth } from '@/src/hooks/useAuth';
import { usePro } from '@/src/context/ProContext';
import { showAlert, AlertHost } from '@/src/components/ui/ThemedAlert';
import { usePlaceCheckIns, type PlaceCheckInState } from '@/src/hooks/usePlaceCheckIns';
import { useCheckInTags, TaggedSkater } from '@/src/hooks/useCheckInTags';
import { SkatedWithModal } from '@/src/components/SkatedWithModal';
import { useCheckInMedia, PendingMedia } from '@/src/hooks/useCheckInMedia';
import { SessionMediaStrip } from '@/src/components/SessionMediaStrip';
import { SessionMediaViewerModal, ViewerMedia } from '@/src/components/SessionMediaViewerModal';
import { PaywallModal } from '@/src/components/PaywallModal';
import { FREE_MEDIA_PER_SPOT, MAX_VIDEO_DURATION_SEC } from '@/src/config/iap';
import * as ImagePicker from 'expo-image-picker';

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

type Props = {
  visible: boolean;
  place: Place | null;
  onClose: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
  checkInState?: PlaceCheckInState;
  checkingIn?: boolean;
  onCheckIn?: () => Promise<string | null>;
  onUndoCheckIn?: (checkInId: string) => Promise<boolean>;
};

export function SkateShopDetailsModal({ visible, place, onClose, onToggleFavorite, isFavorite, userLocation, checkInState = 'available', checkingIn = false, onCheckIn, onUndoCheckIn }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [placeAddress, setPlaceAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!place || !visible) {
      setPlaceAddress(null);
      return;
    }
    const key = `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`;
    const cached = geocodeCache.get(key);
    if (cached !== undefined) {
      setPlaceAddress(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: place.lat,
          longitude: place.lng,
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
        setPlaceAddress(label || null);
      } catch {
        if (!cancelled) setPlaceAddress(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [place?.id, visible]);

  const distanceMiles =
    place && userLocation
      ? haversineMiles(userLocation.latitude, userLocation.longitude, place.lat, place.lng)
      : null;
  const { session } = useAuth();
  const { isPro } = usePro();
  const placeMedia = useCheckInMedia();
  const [proPaywallOpen, setProPaywallOpen] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{ list: ViewerMedia[]; index: number } | null>(null);
  const isPark = place?.type === 'skatepark';

  const { setTags, getTagsForCheckIns, tagging } = useCheckInTags('place');
  const { getLastPlaceCheckIn } = usePlaceCheckIns();
  const [skatedWithCheckInId, setSkatedWithCheckInId] = useState<string | null>(null);
  const [myLastCheckInId, setMyLastCheckInId] = useState<string | null>(null);
  const [myTags, setMyTags] = useState<TaggedSkater[]>([]);

  async function loadMyTagsForPlace(placeId: string) {
    const lastId = await getLastPlaceCheckIn(placeId);
    setMyLastCheckInId(lastId);
    if (!lastId) {
      setMyTags([]);
      return;
    }
    const byCheckIn = await getTagsForCheckIns([lastId]);
    setMyTags(byCheckIn[lastId] ?? []);
  }

  useEffect(() => {
    if (visible && place && isPark) {
      placeMedia.loadMediaForPlace(place.id);
      loadMyTagsForPlace(place.id);
    }
    if (!visible) {
      placeMedia.clearMedia();
      setMediaViewer(null);
      setMyLastCheckInId(null);
      setMyTags([]);
    }
  }, [visible, place?.id, isPark]);

  async function pickAndUploadPlaceMedia() {
    if (!place) return;
    const mine = placeMedia.media.filter((m) => m.user_id === session?.user.id).length;
    const remaining = FREE_MEDIA_PER_SPOT - mine;
    if (!isPro && remaining <= 0) {
      setProPaywallOpen(true);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 1,
      videoMaxDuration: MAX_VIDEO_DURATION_SEC,
      selectionLimit: isPro ? 10 : remaining,
    });
    if (result.canceled) return;
    let assets: PendingMedia[] = result.assets.map((a) => ({
      uri: a.uri,
      type: a.type === 'video' ? 'video' : 'image',
    }));
    if (!isPro) assets = assets.slice(0, remaining);
    if (!assets.length) return;
    const res = await placeMedia.uploadMedia(null, null, assets, place.id);
    await placeMedia.loadMediaForPlace(place.id);
    if (res.error) showAlert('Upload failed', res.error, [{ text: 'OK' }]);
  }

  const {
    avgRating,
    reviewCount,
    existingReviewId,
    loadPlaceReviews,
    submitPlaceReview,
    deletePlaceReview,
    resetPlaceReviews,
  } = usePlaceReviews();
  const { override, isVetted, loadOverride, saveOverride, resetOverride } = usePlaceOverrides();

  const [pendingRating, setPendingRating] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && place && session?.user.id) {
      loadPlaceReviews(place.id, session.user.id).then((reviews) => {
        const mine = reviews?.find((r: any) => r.user_id === session.user.id);
        if (mine) setPendingRating(mine.rating);
      });
      loadOverride(place.id, session.user.id);
    }
    if (!visible) {
      resetPlaceReviews();
      resetOverride();
      setPendingRating(0);
      setEditOpen(false);
    }
  }, [visible, place?.id]);

  const tags = place?.tags ?? {};

  // Merge OSM data with community overrides — override takes priority
  const name = override?.name ?? tags['name'] ?? tags['name'] ?? null;
  const phone = override?.phone ?? tags['phone'] ?? tags['contact:phone'] ?? null;
  const website = override?.website ?? tags['website'] ?? tags['contact:website'] ?? null;
  const hours = override?.hours ?? tags['opening_hours'] ?? null;
  const osmStreet =
    tags['addr:housenumber'] && tags['addr:street']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : (tags['addr:street'] ?? null);
  const osmCity = tags['addr:city'] ?? null;
  const osmAddress = [osmStreet, osmCity].filter(Boolean).join(', ') || null;
  const address = override?.address ?? osmAddress;

  function openEditModal() {
    setEditName(name ?? '');
    setEditPhone(phone ?? '');
    setEditWebsite(website ?? '');
    setEditHours(hours ?? '');
    setEditAddress(address ?? '');
    setSaveError(null);
    setEditOpen(true);
  }

  async function handleSave() {
    if (!place || !session?.user.id) return;
    setSaving(true);
    setSaveError(null);
    const err = await saveOverride(place.id, session.user.id, {
      name: editName,
      phone: editPhone,
      website: editWebsite,
      hours: editHours,
      address: editAddress,
    });
    setSaving(false);
    if (err) {
      setSaveError(err);
      return;
    }
    setEditOpen(false);
  }

  function handleDirections() {
    if (!place) return;

    const hasRealName = !!name && name !== 'Skate Park' && name !== 'Skate Shop';
    const hasAddress = !!address && address.trim().length > 0;
    const namedDest = hasRealName && hasAddress ? encodeURIComponent(`${name}, ${address}`) : null;

    const appleUrl = namedDest
      ? `maps://?daddr=${namedDest}`
      : `maps://app?daddr=${place.lat},${place.lng}`;
    const googleUrl = namedDest
      ? `comgooglemaps://?daddr=${namedDest}&directionsmode=driving`
      : `comgooglemaps://?daddr=${place.lat},${place.lng}&directionsmode=driving`;
    const googleWebUrl = namedDest
      ? `https://www.google.com/maps/dir/?api=1&destination=${namedDest}`
      : `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Open in Apple Maps', 'Open in Google Maps', 'Share Location'],
        cancelButtonIndex: 0,
      },
      async (buttonIndex) => {
        if (buttonIndex === 1) {
          await Linking.openURL(appleUrl);
        } else if (buttonIndex === 2) {
          const canOpen = await Linking.canOpenURL(googleUrl);
          if (canOpen) {
            await Linking.openURL(googleUrl);
          } else {
            await Linking.openURL(googleWebUrl);
          }
        } else if (buttonIndex === 3) {
          await Share.share({
            message: `Check out this skate location: ${place.name}\nhttps://maps.apple.com/?q=${place.lat},${place.lng}`,
          });
        }
      }
    );
  }

  async function handlePhone() {
    if (phone) await Linking.openURL(`tel:${phone}`);
  }
  async function handleWebsite() {
    if (!website) return;
    await Linking.openURL(website.startsWith('http') ? website : `https://${website}`);
  }

  async function doCheckIn() {
    if (!onCheckIn) return;
    const newCheckInId = await onCheckIn();
    if (!newCheckInId) return;
    setMyLastCheckInId(newCheckInId);
    setMyTags([]);
    showAlert('Checked in!', 'Added to your parks skated.', [
      { text: 'Done', style: 'cancel' },
      { text: 'Tag Who You Skated With', onPress: () => setSkatedWithCheckInId(newCheckInId) },
      { text: 'Add Photo/Clip', onPress: pickAndUploadPlaceMedia },
      {
        text: 'Undo Check-In',
        style: 'destructive',
        onPress: () => runUndoCheckIn(newCheckInId),
      },
    ]);
  }

  async function runUndoCheckIn(checkInId: string) {
    if (!onUndoCheckIn || !place) return;
    const ok = await onUndoCheckIn(checkInId);
    if (!ok) return;
    await loadMyTagsForPlace(place.id);
  }

  function confirmUndoCheckIn() {
    if (!myLastCheckInId) {
      showAlert('Nothing to undo', 'No check-in found for this park.');
      return;
    }
    showAlert(
      'Undo check-in?',
      "Your most recent visit here will be removed from your parks skated. Any clips you posted stay on the park. This can't be undone.",
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Undo Check-In',
          style: 'destructive',
          onPress: () => runUndoCheckIn(myLastCheckInId),
        },
      ]
    );
  }

  function handleCheckInPress() {
    if (!onCheckIn) return;
    if (checkInState === 'recent') {
      showAlert('You skated here recently', 'You already checked in here in the last few hours.', [
        { text: 'OK', style: 'cancel' },
        ...(onUndoCheckIn && myLastCheckInId
          ? [
              {
                text: 'Undo Check-In',
                style: 'destructive' as const,
                onPress: confirmUndoCheckIn,
              },
            ]
          : []),
      ]);
    } else if (checkInState === 'confirm') {
      showAlert(
        'Check in again?',
        'You already skated here earlier today. Log another check-in?',
        [
          { text: 'Cancel', style: 'cancel' },
          ...(onUndoCheckIn && myLastCheckInId
            ? [
                {
                  text: 'Undo Last Check-In',
                  style: 'destructive' as const,
                  onPress: confirmUndoCheckIn,
                },
              ]
            : []),
          { text: 'Check In Again', onPress: doCheckIn },
        ]
      );
    } else {
      doCheckIn();
    }
  }

  async function handleSubmitRating(rating: number) {
    if (!place || !session?.user.id) return;
    setPendingRating(rating);
    await submitPlaceReview(place.id, session.user.id, rating, place);
  }

  async function handleDeleteReview() {
    if (!place || !session?.user.id) return;
    await deletePlaceReview(place.id, session.user.id);
    setPendingRating(0);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: c.surface,
            padding: 16,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '65%',
          }}>
          <ScrollView>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 2,
              }}>
              <Image
                source={
                  place?.type === 'skateshop'
                    ? require('@/assets/pin-images/skate-shop.png')
                    : require('@/assets/pin-images/skatepark-ramp.png')
                }
                style={{
                  width: 20,
                  height: 20,
                  tintColor: c.text,
                }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  marginLeft: 8,
                  flex: 1,
                  color: c.text,
                }}>
                {name ?? place?.name}
              </Text>
              {isVetted ? (
                <Pressable onPress={openEditModal} style={{ padding: 4, marginRight: 4 }}>
                  <Ionicons name="settings-outline" size={22} color={c.subtext} />
                </Pressable>
              ) : null}
              <Pressable onPress={handleDirections} style={{ padding: 4 }}>
                <Ionicons name="share-outline" size={24} color={c.accent} />
              </Pressable>
              <Pressable onPress={onToggleFavorite} style={{ padding: 4 }}>
                <Ionicons
                  name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                  size={24}
                  color={isFavorite ? 'red' : c.subtext}
                />
              </Pressable>
            </View>

            {placeAddress || distanceMiles !== null ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 8,
                }}>
                <Ionicons name="location-outline" size={12} color={c.subtext} />
                <Text
                  style={{
                    fontSize: 12,
                    color: c.subtext,
                    flexShrink: 1,
                  }}
                  numberOfLines={1}>
                  {placeAddress ? (
                    <Text
                      style={{
                        color: c.text,
                        fontWeight: '600',
                      }}>
                      {placeAddress}
                    </Text>
                  ) : null}
                  {placeAddress && distanceMiles !== null ? ' · ' : ''}
                  {distanceMiles !== null ? `${formatDistance(distanceMiles)} away` : ''}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 16,
              }}>
              <Text
                style={{
                  fontSize: 12,
                  opacity: 0.5,
                  color: c.text,
                }}>
                {place?.type === 'skateshop' ? 'Skate Shop' : 'Skate Park'}
              </Text>
              {avgRating !== null ? (
                <>
                  <Text
                    style={{
                      fontSize: 12,
                      opacity: 0.3,
                      color: c.text,
                    }}>
                    ·
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#FFB800',
                      fontWeight: '600',
                    }}>
                    {avgRating.toFixed(1)} ★
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      opacity: 0.5,
                      color: c.text,
                    }}>
                    ({reviewCount})
                  </Text>
                </>
              ) : null}
              {override ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: '#34C759',
                    fontWeight: '600',
                  }}>
                  · Community edited
                </Text>
              ) : null}
            </View>

            {address ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}>
                <Ionicons name="location-outline" size={18} color={c.subtext} />
                <Text
                  style={{
                    flex: 1,
                    opacity: 0.8,
                    color: c.text,
                  }}>
                  {address}
                </Text>
              </View>
            ) : null}
            {phone ? (
              <Pressable
                onPress={handlePhone}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}>
                <Ionicons name="call-outline" size={18} color={c.accent} />
                <Text style={{ color: c.accent }}>{phone}</Text>
              </Pressable>
            ) : null}
            {website ? (
              <Pressable
                onPress={handleWebsite}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}>
                <Ionicons name="globe-outline" size={18} color={c.accent} />
                <Text style={{ color: c.accent }} numberOfLines={1}>
                  {website}
                </Text>
              </Pressable>
            ) : null}
            {hours ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 12,
                }}>
                <Ionicons name="time-outline" size={18} color={c.subtext} />
                <Text
                  style={{
                    flex: 1,
                    opacity: 0.8,
                    color: c.text,
                  }}>
                  {hours}
                </Text>
              </View>
            ) : null}
            {!address && !phone && !website && !hours ? (
              <Text
                style={{
                  opacity: 0.5,
                  marginBottom: 16,
                  color: c.text,
                }}>
                No additional details available for this location.
              </Text>
            ) : null}

            {place?.type === 'skatepark' && onCheckIn ? (
              <Pressable
                onPress={checkingIn ? undefined : handleCheckInPress}
                disabled={checkingIn}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 8,
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: checkInState === 'recent' ? c.tagBg : '#34C759',
                  opacity: checkingIn ? 0.6 : 1,
                }}>
                <Ionicons
                  name={checkInState === 'recent' ? 'checkmark-circle' : 'location'}
                  size={18}
                  color={checkInState === 'recent' ? '#34C759' : '#fff'}
                />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: checkInState === 'recent' ? c.text : '#fff',
                  }}>
                  {checkingIn
                    ? 'Checking in…'
                    : checkInState === 'recent'
                      ? 'Skated'
                      : checkInState === 'confirm'
                        ? 'Check In Again'
                        : 'Check In'}
                </Text>
              </Pressable>
            ) : null}

            {isPark && myLastCheckInId ? (
              <Pressable
                onPress={() => setSkatedWithCheckInId(myLastCheckInId)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: c.tagBg,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginTop: 8,
                }}>
                <Ionicons name="people" size={16} color={c.subtext} />
                {myTags.length === 0 ? (
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.subtext }}>
                    Skated with…
                  </Text>
                ) : (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flexDirection: 'row' }}>
                      {myTags.slice(0, 4).map((t, i) => (
                        <View
                          key={t.id}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            marginLeft: i === 0 ? 0 : -8,
                            borderWidth: 1.5,
                            borderColor: c.surface,
                            backgroundColor: c.surface,
                            overflow: 'hidden',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          {t.avatar_url ? (
                            <Image
                              source={{ uri: t.avatar_url }}
                              style={{ width: '100%', height: '100%' }}
                            />
                          ) : (
                            <Ionicons name="person" size={12} color={c.subtext} />
                          )}
                        </View>
                      ))}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.text }}>
                      {myTags.length === 1
                        ? `@${myTags[0].username}`
                        : `@${myTags[0].username} +${myTags.length - 1}`}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={14} color={c.subtext} />
              </Pressable>
            ) : null}

            {isPark ? (
              <View
                style={{
                  borderTopWidth: 1,
                  borderColor: c.border,
                  marginTop: 16,
                  paddingTop: 16,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>
                    Session Media
                  </Text>
                  <Pressable
                    onPress={pickAndUploadPlaceMedia}
                    disabled={placeMedia.uploading}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="add-circle-outline" size={18} color={c.accent} />
                    <Text style={{ fontSize: 13, color: c.accent, fontWeight: '600' }}>
                      {placeMedia.uploading ? 'Uploading…' : 'Add'}
                    </Text>
                  </Pressable>
                </View>
                {placeMedia.media.length > 0 ? (
                  <SessionMediaStrip
                    media={placeMedia.media}
                    showUploader
                    grid
                    size={Math.floor((Dimensions.get('window').width - 32 - 16) / 3)}
                    onPressMedia={(m) =>
                      setMediaViewer({
                        list: placeMedia.media.map((mm) => ({
                          id: mm.id,
                          url: mm.url,
                          media_type: mm.media_type,
                          thumbnail_url: mm.thumbnail_url,
                        })),
                        index: placeMedia.media.findIndex((x) => x.id === m.id),
                      })
                    }
                  />
                ) : (
                  <Text style={{ fontSize: 12, color: c.subtext }}>
                    No clips yet. Be the first to post one.
                  </Text>
                )}
              </View>
            ) : null}

            {/* Rating */}
            <View
              style={{
                borderTopWidth: 1,
                borderColor: c.border,
                marginTop: 8,
                paddingTop: 16,
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: c.text,
                  marginBottom: 10,
                }}>
                {existingReviewId ? 'Your Rating' : 'Rate this place'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => handleSubmitRating(star)}>
                    <Ionicons
                      name={star <= (pendingRating || 0) ? 'star' : 'star-outline'}
                      size={28}
                      color={star <= (pendingRating || 0) ? '#FFB800' : c.subtext}
                    />
                  </Pressable>
                ))}
                {existingReviewId ? (
                  <Pressable onPress={handleDeleteReview} style={{ marginLeft: 8 }}>
                    <Ionicons name="trash-outline" size={20} color={c.danger} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={{
                marginTop: 16,
                padding: 12,
                alignItems: 'center',
              }}>
              <Text style={{ color: c.subtext }}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {visible ? <AlertHost /> : null}

      <SessionMediaViewerModal
        visible={mediaViewer !== null}
        onClose={() => setMediaViewer(null)}
        mediaList={mediaViewer?.list ?? []}
        initialIndex={mediaViewer?.index ?? 0}
        currentUserId={session?.user.id ?? null}
      />
      <PaywallModal visible={proPaywallOpen} onClose={() => setProPaywallOpen(false)} />
      <SkatedWithModal
        visible={!!skatedWithCheckInId}
        saving={tagging}
        initialSelected={
          skatedWithCheckInId === myLastCheckInId ? myTags.map((t) => t.id) : undefined
        }
        onClose={() => setSkatedWithCheckInId(null)}
        onConfirm={async (userIds) => {
          if (!skatedWithCheckInId || !place) return;
          const result = await setTags(
            skatedWithCheckInId,
            { placeId: place.id, placeName: place.name },
            userIds
          );
          setSkatedWithCheckInId(null);
          if (!result.success) {
            showAlert('Could not save tags', result.error);
            return;
          }
          await loadMyTagsForPlace(place.id);
        }}
      />

      {/* Edit Modal */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}
            onPress={() => setEditOpen(false)}
          />
          <Pressable
            onPress={Keyboard.dismiss}
            style={{
              backgroundColor: c.surface,
              padding: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                color: c.text,
                marginBottom: 4,
              }}>
              Edit Details
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: c.subtext,
                marginBottom: 16,
              }}>
              {place?.name}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {[
                {
                  label: 'Name',
                  value: editName,
                  onChange: setEditName,
                  placeholder: 'Name Here',
                  keyboardType: 'default' as const,
                  autoCapitalize: 'words' as const,
                },
                {
                  label: 'Phone',
                  value: editPhone,
                  onChange: setEditPhone,
                  placeholder: 'e.g. +1 555 123 4567',
                  keyboardType: 'phone-pad' as const,
                  autoCapitalize: 'none' as const,
                },
                {
                  label: 'Website',
                  value: editWebsite,
                  onChange: setEditWebsite,
                  placeholder: 'e.g. https://example.com',
                  keyboardType: 'url' as const,
                  autoCapitalize: 'none' as const,
                },
                {
                  label: 'Hours',
                  value: editHours,
                  onChange: setEditHours,
                  placeholder: 'e.g. Mon-Fri 10am-6pm',
                  keyboardType: 'default' as const,
                  autoCapitalize: 'words' as const,
                },
                {
                  label: 'Address',
                  value: editAddress,
                  onChange: setEditAddress,
                  placeholder: 'e.g. 123 Main St, Portland',
                  keyboardType: 'default' as const,
                  autoCapitalize: 'words' as const,
                },
              ].map((field) => (
                <View key={field.label} style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: c.subtext,
                      marginBottom: 4,
                    }}>
                    {field.label.toUpperCase()}
                  </Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={field.placeholder}
                    placeholderTextColor={c.placeholder}
                    keyboardType={field.keyboardType}
                    autoCapitalize={field.autoCapitalize}
                    style={{
                      borderWidth: 1,
                      borderColor: c.inputBorder,
                      borderRadius: 8,
                      padding: 10,
                      color: c.text,
                      backgroundColor: c.surface,
                      fontSize: 14,
                    }}
                  />
                </View>
              ))}
            </ScrollView>

            {saveError ? (
              <Text
                style={{
                  color: c.danger,
                  fontSize: 13,
                  marginTop: 8,
                  textAlign: 'center',
                }}>
                {saveError}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                marginTop: 8,
              }}>
              <Pressable
                onPress={() => setEditOpen(false)}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: c.border,
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    color: c.subtext,
                    fontWeight: '600',
                  }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 10,
                  backgroundColor: c.buttonBg,
                  alignItems: 'center',
                  opacity: saving ? 0.6 : 1,
                }}>
                <Text
                  style={{
                    color: c.background,
                    fontWeight: '700',
                  }}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}
