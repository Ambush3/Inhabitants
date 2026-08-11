import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { showAlert } from '@/src/components/ui/ThemedAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  View,
  Button,
  ScrollView,
  Platform,
  Pressable,
  Animated,
  Easing,
  ActionSheetIOS,
  Linking,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Image } from 'expo-image';
import MapView, { Marker, Region, LongPressEvent, MapMarker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useFocusEffect, usePathname, router } from 'expo-router';

import { supabase } from '@/src/libs/supabase';

import { SkateMarker } from '@/src/components/SkateMarker';
import { CreateSpotModal } from '@/src/components/CreateSpotModal';
import { SpotDetailsModal, difficultyLabel } from '@/src/components/SpotDetailsModal';
import { SkateShopDetailsModal } from '@/src/components/SkateShopDetailsModal';
import { ExplorePanel } from '@/src/components/ExplorePanel';
import { SkateCitiesModal } from '@/src/components/SkateCitiesModal';
import { PaywallModal } from '@/src/components/PaywallModal';
import {
  MapFilterSheet,
  MapFilters,
  EMPTY_FILTERS,
  spotMatchesFeatures,
  countActiveFilters,
} from '@/src/components/MapFilterSheet';
import { usePro } from '@/src/context/ProContext';
import { useSplash } from '@/src/context/SplashContext';
import { SettingsPanel } from '@/src/components/SettingsPanel';
import { OnboardingScreen } from '@/src/components/onboarding/OnboardingScreen';
import { ThemeBackdrop } from '@/src/components/ThemeBackdrop';
import { ProfileModal } from '@/src/components/profile/ProfileModal';
import { PublicProfileModal } from '@/src/components/profile/PublicProfileModal';
import { MySpotMarker } from '@/src/components/SpotMarkers/MySpotMarker';
import { OtherUsersSpotMarkers } from '@/src/components/SpotMarkers/OtherUsersSpotMarkers';
import { TrackedMarker } from '@/src/components/SpotMarkers/TrackedMarker';
import { MapLegend } from '@/src/components/MapLegend';
import { MapControls } from '@/src/components/MapControls';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '@/src/constants/darkMapStyle';
import { CreateEventModal } from '@/src/components/CreateEventModal';
import { EventDetailsModal } from '@/src/components/EventDetailsModal';
import { WhatsNewModal } from '@/src/components/WhatsNewModal';
import { CreateCrewModal } from '@/src/components/crews/CreateCrewModal';
import { CrewDetailModal } from '@/src/components/crews/CrewDetailModal';
import { CrewsModal } from '@/src/components/crews/CrewsModal';
import { useCrews, Crew } from '@/src/hooks/useCrews';

import { useSpots } from '@/src/hooks/useSpots';
import { useReviews } from '@/src/hooks/useReviews';
import { useDifficulty } from '@/src/hooks/useDifficulty';
import { useSpotImages } from '@/src/hooks/useSpotImages';
import { useSpotConditions } from '@/src/hooks/useSpotConditions';
import { useNearbyPlaces } from '@/src/hooks/useNearbyPlaces';
import { useTopRated } from '@/src/hooks/useTopRated';
import { useAuth } from '@/src/hooks/useAuth';
import { useFavorites } from '@/src/hooks/useFavorites';
import { usePlaceFavorites } from '@/src/hooks/usePlaceFavorites';
import { usePlaceCheckIns } from '@/src/hooks/usePlaceCheckIns';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import { sendPushNotification, sendSpotClosedNotification } from '@/src/libs/sendPushNotification';
import { useSpotFlags } from '@/src/hooks/flaggingSystem/useSpotFlags';
import { useReviewFlags } from '@/src/hooks/flaggingSystem/useReviewFlags';
import { useEvents, SkateEvent } from '@/src/hooks/useEvents';
import { useWhatsNew } from '@/src/hooks/useWhatsNew';
import { useTrickLog } from '@/src/hooks/useTrickLog';

import { useTheme } from '@/src/context/ThemeContext';
import { useMapProvider } from '@/src/context/MapProviderContext';
import { useToast } from '@/src/context/ToastContext';

import { Ionicons } from '@expo/vector-icons';
import { Place, Spot } from '@/src/types';
import { haversineMeters } from '@/src/libs/distance';
import { useWishlist } from '@/src/hooks/useWishlist';
import { useFriendships } from '@/src/hooks/social/useFriendships';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useSocialFeed } from '@/src/hooks/useSocialFeed';
import { SpotVisibility, spotVisibility } from '@/src/hooks/useSpots';
import { useOfflineCache } from '@/src/hooks/offlineCache/useOfflineCache';

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_REGION: Region = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

function rendersAsSpotMarker(spot: { id: string; spot_type?: string }, highlightSpotId: string | null) {
  return spot.spot_type !== 'skateshop' || spot.id === highlightSpotId;
}

const SpotMap = React.memo(
  ({
    mapRef,
    visibleSpots,
    places,
    highlightSpotId,
    selectedPlaceId,
    session,
    friendIds,
    pendingCoord,
    initialRegion,
    onPress,
    onPanDrag,
    onRegionChangeComplete,
    onLongPress,
    onMarkerPress,
    onPlacePress,
    markerRefs,
    suppressMapPressRef,
    setHighlightSpotId,
    highlightSpotIdRef,
    animateToSpotWithModalOffset,
    openSpotDetails,
    openSpotPreview,
    setSelectedPlaceId,
    setSelectedPlace,
    setPlaceDetailsOpen,
    setSelectedEvent,
    setEventDetailsOpen,
    spots,
    events,
    pendingEventCoord,
    mapStyle,
    mapDark,
    mapProvider,
    clusterColor,
    markersVisible,
    mapType,
  }: any) => (
    <MapView
      key={`${mapProvider}-${mapDark ? 'dark' : 'light'}`}
      ref={mapRef}
      provider={mapProvider === 'google' ? PROVIDER_GOOGLE : undefined}
      mapType={mapType}
      customMapStyle={mapProvider === 'google' && mapType === 'standard' ? mapStyle : []}
      userInterfaceStyle={mapDark ? 'dark' : 'light'}
      style={{ flex: 1, marginBottom: -34 }}
      initialRegion={initialRegion}
      onPress={onPress}
      onPanDrag={onPanDrag}
      onRegionChangeComplete={onRegionChangeComplete}
      showsUserLocation
      showsMyLocationButton={false}
      followsUserLocation={false}
      onMarkerPress={onMarkerPress}
      onLongPress={onLongPress}>
      {pendingCoord ? (
        <Marker
          key="pending"
          coordinate={{ latitude: pendingCoord.lat, longitude: pendingCoord.lng }}
          title="New spot"
          pinColor="red"
        />
      ) : null}
      {pendingEventCoord ? (
        <Marker
          key="pending-event"
          coordinate={{ latitude: pendingEventCoord.lat, longitude: pendingEventCoord.lng }}
          anchor={{ x: 0.5, y: 0.5 }}>
          <View
            style={{
              backgroundColor: '#FF9500',
              borderRadius: 20,
              padding: 6,
              borderWidth: 2,
              borderColor: 'white',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="calendar" size={14} color="white" />
          </View>
        </Marker>
      ) : null}
      {visibleSpots
        .filter(
          (s: any) =>
            s.lat != null &&
            s.lng != null &&
            rendersAsSpotMarker(s, highlightSpotId) &&
            (s.spot_type === 'spot' ||
              s.spot_type === 'skatepark' ||
              s.spot_type === 'skateshop' ||
              s.id === highlightSpotId)
        )
        .map((s: any) =>
          s.spot_type === 'spot' ? (
            s.user_id === session?.user.id ? (
              <TrackedMarker
                ref={(ref) => {
                  markerRefs.current[s.id] = ref;
                }}
                key={s.id}
                coordinate={{ latitude: s.lat, longitude: s.lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                opacity={markersVisible || s.id === highlightSpotId ? 1 : 0}
                keepActive={s.id === highlightSpotId}
                onPress={() => {
                  suppressMapPressRef.current = true;
                  setHighlightSpotId(s.id);
                  highlightSpotIdRef.current = s.id;
                  animateToSpotWithModalOffset(s.lat, s.lng, 'small');
                  openSpotPreview(s);
                }}>
                <MySpotMarker selected={s.id === highlightSpotId} />
              </TrackedMarker>
            ) : (
              <TrackedMarker
                ref={(ref) => {
                  markerRefs.current[s.id] = ref;
                }}
                key={s.id}
                coordinate={{ latitude: s.lat, longitude: s.lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                opacity={markersVisible || s.id === highlightSpotId ? 1 : 0}
                keepActive={s.id === highlightSpotId}
                onPress={() => {
                  suppressMapPressRef.current = true;
                  setHighlightSpotId(s.id);
                  highlightSpotIdRef.current = s.id;
                  animateToSpotWithModalOffset(s.lat, s.lng, 'small');
                  openSpotPreview(s);
                }}>
                <OtherUsersSpotMarkers
                  selected={s.id === highlightSpotId}
                  isFriend={s.user_id ? friendIds.has(s.user_id) : false}
                />
              </TrackedMarker>
            )
          ) : s.lat && s.lng ? (
            <SkateMarker
              ref={(ref) => {
                markerRefs.current[s.id] = ref;
              }}
              key={s.id}
              id={s.id}
              lat={s.lat}
              lng={s.lng}
              name={s.name}
              type={s.spot_type as 'skatepark' | 'skateshop'}
              selected={s.id === highlightSpotId}
              opacity={markersVisible || s.id === highlightSpotId ? 1 : 0}
              onPress={() => {
                suppressMapPressRef.current = true;
                setHighlightSpotId(s.id);
                highlightSpotIdRef.current = s.id;
                animateToSpotWithModalOffset(s.lat, s.lng, 'small');
                if (s.spot_type === 'skateshop') openSpotDetails(s);
                else openSpotPreview(s);
              }}
            />
          ) : null
        )}
      {places
        .filter((p: any) => p.lat && p.lng)
        .map((p: any) => (
          <SkateMarker
            key={p.id}
            ref={(ref) => {
              markerRefs.current[p.id] = ref;
            }}
            id={p.id}
            lat={p.lat}
            lng={p.lng}
            name={p.name}
            type={p.type as 'skatepark' | 'skateshop'}
            selected={p.id === selectedPlaceId}
            opacity={markersVisible || p.id === selectedPlaceId ? 1 : 0}
            onPress={() => {
              suppressMapPressRef.current = true;
              const communitySpot = spots.find((s: any) => s.id === p.id);
              if (communitySpot) {
                setHighlightSpotId(communitySpot.id);
                highlightSpotIdRef.current = communitySpot.id;
                animateToSpotWithModalOffset(communitySpot.lat, communitySpot.lng);
                openSpotDetails(communitySpot);
              } else {
                suppressMapPressRef.current = true;
                setSelectedPlaceId(p.id);
                animateToSpotWithModalOffset(p.lat, p.lng, 'small');
                setSelectedPlace(p);
                setPlaceDetailsOpen(true);
              }
            }}
          />
        ))}
      {events
        .filter((e: any) => e.visibility === 'public' && e.lat != null && e.lng != null)
        .map((e: any) => (
          <TrackedMarker
            key={`event-${e.id}`}
            coordinate={{ latitude: e.lat, longitude: e.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            opacity={markersVisible ? 1 : 0}
            onPress={() => {
              suppressMapPressRef.current = true;
              setSelectedEvent(e);
              setEventDetailsOpen(true);
              animateToSpotWithModalOffset(e.lat, e.lng, 'small');
            }}>
            <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  backgroundColor: '#FF9500',
                  borderRadius: 16,
                  padding: 6,
                  borderWidth: 2,
                  borderColor: 'white',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="calendar" size={14} color="white" />
              </View>
            </View>
          </TrackedMarker>
        ))}
    </MapView>
  ),
  (prevProps, nextProps) => {
    return (
      prevProps.visibleSpots === nextProps.visibleSpots &&
      prevProps.places === nextProps.places &&
      prevProps.highlightSpotId === nextProps.highlightSpotId &&
      prevProps.selectedPlaceId === nextProps.selectedPlaceId &&
      prevProps.pendingCoord === nextProps.pendingCoord &&
      prevProps.initialRegion === nextProps.initialRegion &&
      prevProps.events === nextProps.events &&
      prevProps.pendingEventCoord === nextProps.pendingEventCoord &&
      prevProps.mapStyle === nextProps.mapStyle &&
      prevProps.mapDark === nextProps.mapDark &&
      prevProps.mapProvider === nextProps.mapProvider &&
      prevProps.mapType === nextProps.mapType &&
      prevProps.clusterColor === nextProps.clusterColor &&
      prevProps.markersVisible === nextProps.markersVisible
    );
  }
);

export default function Index() {
  const mapRef = useRef<MapView | null>(null);
  const mapRegionRef = useRef<Region>(DEFAULT_REGION);
  const userLocationRef = useRef<Region | null>(null);
  const preModalRegionRef = useRef<Region>(DEFAULT_REGION);

  const autoCenterRef = useRef(true);
  const markerRefs = useRef<Record<string, MapMarker | null>>({});

  const placesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);
  const detailSheetOpenRef = useRef(false);

  const highlightSpotIdRef = useRef<string | null>(null);

  const pendingDeepLinkRef = useRef<string | null>(null);
  const hasOpenedDeepLinkRef = useRef(false);
  const openedFromDeepLinkRef = useRef(false);
  const hasNavigatedFromNotification = useRef(false);
  const openedFromFavoritesRef = useRef(false);

  const suppressMapPressRef = useRef(false);
  const actionSheetOpenRef = useRef(false);

  const openedPublicProfileFromProfileRef = useRef(false);
  const reopenSpotDetailsOnProfileCloseRef = useRef(false);
  const reopenCrewDetailOnProfileCloseRef = useRef(false);

  const {
    reviews: spotReviews,
    avgRating,
    newRating: newReviewRating,
    setNewRating: setNewReviewRating,
    newComment: newReviewComment,
    setNewComment: setNewReviewComment,
    loadReviews,
    submitReview,
    deleteReview,
    resetReviews,
    existingReviewId,
    loadMyReviews,
    myReviews,
  } = useReviews();

  const {
    newDifficulty,
    setNewDifficulty,
    loadMyDifficultyVote,
    submitDifficulty,
    removeDifficulty,
    resetDifficulty,
    existingVoteId: existingDifficultyVoteId,
  } = useDifficulty();

  async function refreshSpotDifficulty(spotId: string) {
    // Update just the open spot's stats — a full reload() re-renders the
    // clustered map and can fling the selected pin to the corner.
    const { data } = await supabase
      .from('spots')
      .select('avg_difficulty, difficulty_vote_count')
      .eq('id', spotId)
      .single();
    if (data) {
      setSelectedSpot((prev) =>
        prev
          ? {
            ...prev,
            avg_difficulty: data.avg_difficulty,
            difficulty_vote_count: data.difficulty_vote_count,
          }
          : prev
      );
    }
  }

  const {
    isOnline,
    isStale,
    cacheLoaded,
    cachedMapSpots,
    cachedFavorites,
    showOfflineBanner,
    bannerMessage,
    cacheMapSpots,
    cacheFavorites,
  } = useOfflineCache();

  const { signOut, session } = useAuth();
  const { favorites, loading: favLoading, loadFavorites, toggleFavorite, isFavorite } = useFavorites();
  const { wishlist, wishlistLoading, loadWishlist, toggleWishlist, isWishlisted } = useWishlist();
  const {
    places,
    setPlaces,
    parksLoading,
    shopsLoading,
    loadNearbySkateParks,
    loadNearbySkateShops,
    fetchPlaceById,
  } = useNearbyPlaces();
  const { topRated, topLoading, error: topRatedError, loadTopRatedSpotsInArea, clearTopRated } = useTopRated();

  const [createSpotVisibility, setCreateSpotVisibility] = useState<SpotVisibility>('public');

  const { placeFavorites, placeFavLoading, loadPlaceFavorites, togglePlaceFavorite, isPlaceFavorite } =
    usePlaceFavorites();
  const {
    load: loadPlaceCheckIns,
    checkInPlace,
    getPlaceCheckInState,
    checkingIn: placeCheckingIn,
  } = usePlaceCheckIns();
  const { images, uploading: imagesUploading, loadImages, uploadImages, deleteImage, clearImages } = useSpotImages();
  const { activeConditions, myConditions, loadConditions, toggleCondition, resetConditions } = useSpotConditions();

  const { pendingReceived, loadPendingRequests, friends, loadFriends } = useFriendships();
  const friendIds = new Set(friends.map((f) => f.id));
  const { items: feedItems, loading: feedLoading, loadFeed } = useSocialFeed();
  const {
    notifications: activityNotifications,
    unreadCount: unreadActivityCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const { flaggedSpotIds, loadFlags, toggleFlag, isFlaggedByMe } = useSpotFlags(session?.user.id ?? null);
  const { flaggedReviewIds, loadReviewFlags, toggleReviewFlag, isReviewFlaggedByMe } = useReviewFlags(
    session?.user.id ?? null
  );

  const {
    trickLogs,
    spotTrickLogs,
    loading: trickLoading,
    logTrick,
    loadTrickLogsForSpot,
    loadAllTrickLogs,
    deleteTrickLog,
  } = useTrickLog();

  const {
    events,
    myEvents,
    invitedEventIds,
    unreadInviteCount,
    unreadRsvpCount,
    loading: eventsLoading,
    loadPublicEvents,
    loadMyEvents,
    loadInvitedEventIds,
    clearUnreadInviteCount,
    clearUnreadRsvpCount,
    createEvent,
    updateEvent,
    cancelEvent,
    loadEventRsvps,
    upsertRsvp,
    deleteRsvp,
    eventRsvpCounts,
    loadRsvpCounts,
    subscribeToRsvpChanges,
  } = useEvents();

  const [pendingImages, setPendingImages] = useState<string[]>([]);

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [placeDetailsOpen, setPlaceDetailsOpen] = useState(false);

  const [panelOpen, setPanelOpen] = useState(false);

  const [highlightSpotId, setHighlightSpotId] = useState<string | null>(null);

  const [useDeviceLocation, setUseDeviceLocation] = useState(true);
  const [locating, setLocating] = useState(true);
  const regionWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const [spotRating, setSpotRating] = useState(0);
  const [spotComment, setSpotComment] = useState('');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [previewSpot, setPreviewSpot] = useState<Spot | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [crewsOpen, setCrewsOpen] = useState(false);
  const [crewDetailOpen, setCrewDetailOpen] = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [createCrewOpen, setCreateCrewOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [crewReopenAfterCreate, setCrewReopenAfterCreate] = useState<'crews' | 'detail' | null>(null);
  const [crewsInitialTab, setCrewsInitialTab] = useState<'mine' | 'discover' | 'invites'>('mine');
  const { createCrew, updateCrew, uploadCrewAvatar } = useCrews();

  const [createOpen, setCreateOpen] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [spotName, setSpotName] = useState('');
  const [spotDesc, setSpotDesc] = useState('');
  const [spotTags, setSpotTags] = useState<string[]>([]);

  const [spotCreatorUsername, setSpotCreatorUsername] = useState<string | null>(null);

  const [spotCreatorAvatarUrl, setSpotCreatorAvatarUrl] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingFeedbackPostId, setPendingFeedbackPostId] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);

  const [spotType, setSpotType] = useState<'spot' | 'skatepark' | 'skateshop'>('spot');
  const [isAdmin, setIsAdmin] = useState(false);

  const [spotAddress, setSpotAddress] = useState('');
  const [spotPhone, setSpotPhone] = useState('');
  const [spotWebsite, setSpotWebsite] = useState('');
  const [spotHours, setSpotHours] = useState('');

  const [detailsLoading, setDetailsLoading] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

  const [publicProfileUserId, setPublicProfileUserId] = useState<string | null>(null);
  const [publicProfileOpen, setPublicProfileOpen] = useState(false);

  const [isVetted, setIsVetted] = useState(false);

  const { theme, loadThemeForUser } = useTheme();
  const { mapProvider, mapType, setMapType } = useMapProvider();
  const toast = useToast();
  const c = theme.colors;

  const insets = useSafeAreaInsets();

  const pathname = usePathname();

  const {
    spots,
    mySpots,
    patchSpotLocal,
    mySpotsLoading,
    error,
    setError,
    reload,
    loadMySpots,
    createSpotAt,
    findNearbyDuplicate,
    deleteSpotById,
    searchResults,
    searchByTag,
    clearSearch,
    setSpotVisibility,
    updateSpot,
    removeFromSearchResults,
  } = useSpots();

  const { showWhatsNew, dismissWhatsNew } = useWhatsNew();
  const { splashDone } = useSplash();

  const { deepLinkSpotId, deepLinkLat, deepLinkLng } = useLocalSearchParams<{
    deepLinkSpotId?: string;
    deepLinkLat?: string;
    deepLinkLng?: string;
  }>();

  const deepLinkRegion =
    deepLinkLat && deepLinkLng
      ? {
        latitude: parseFloat(deepLinkLat) - 0.03 * 0.45,
        longitude: parseFloat(deepLinkLng),
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }
      : null;

  const [initialRegion, setInitialRegion] = useState<Region>(deepLinkRegion ?? DEFAULT_REGION);

  const [commentCount, setCommentCount] = useState(0);

  const [spotCreatorBadge, setSpotCreatorBadge] = useState<'local' | 'regular' | 'ambassador' | null>(null);

  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallHeadline, setPaywallHeadline] = useState<string | undefined>(undefined);
  const { isPro } = usePro();
  const [editingEvent, setEditingEvent] = useState<SkateEvent | null>(null);
  const [pendingEventCoord, setPendingEventCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [eventFilterOverride, setEventFilterOverride] = useState<
    'all' | 'public' | 'friends' | 'invited' | undefined
  >(undefined);

  const [selectedEvent, setSelectedEvent] = useState<SkateEvent | null>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);

  useEffect(() => {
    detailSheetOpenRef.current = detailsOpen || placeDetailsOpen || eventDetailsOpen;
  }, [detailsOpen, placeDetailsOpen, eventDetailsOpen]);

  const [difficultyFilter, setDifficultyFilter] = useState<Set<'beginner' | 'intermediate' | 'advanced'>>(new Set());
  const [ownershipFilter, setOwnershipFilter] = useState<Set<'mine' | 'friends' | 'community'>>(new Set());
  const [advFilters, setAdvFilters] = useState<MapFilters>(EMPTY_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [viewportRegion, setViewportRegion] = useState<Region | null>(null);
  const [visitedSpotIds, setVisitedSpotIds] = useState<Set<string>>(new Set());
  const [spotRatings, setSpotRatings] = useState<Record<string, number>>({});
  const [mapSearch, setMapSearch] = useState('');
  const [headerHeight, setHeaderHeight] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [markersVisible, setMarkersVisible] = useState(true);

  function matchesDifficultyFilter(spot: Spot): boolean {
    if (difficultyFilter.size === 0) return true;
    if (spot.avg_difficulty === null) return false;
    const label = difficultyLabel(spot.avg_difficulty).toLowerCase();
    if (difficultyFilter.has('beginner') && (label === 'beginner' || label === 'easy')) return true;
    if (difficultyFilter.has('intermediate') && label === 'intermediate') return true;
    if (difficultyFilter.has('advanced') && (label === 'advanced' || label === 'expert')) return true;
    return false;
  }

  const filteredSearchResults = useMemo(
    () => searchResults.filter(matchesDifficultyFilter),
    [searchResults, difficultyFilter]
  );

  const visibleSpots = useMemo(() => {
    const sourceSpots = isOnline ? spots : cachedMapSpots;
    let list =
      filteredSearchResults.length > 0 ? filteredSearchResults : sourceSpots.filter(matchesDifficultyFilter);

    if (ownershipFilter.size > 0) {
      const myId = session?.user?.id;
      list = list.filter((s) => {
        const mine = !!myId && s.user_id === myId;
        const friend = !mine && !!s.user_id && friendIds.has(s.user_id);
        const community = !mine && !friend;
        return (
          (ownershipFilter.has('mine') && mine) ||
          (ownershipFilter.has('friends') && friend) ||
          (ownershipFilter.has('community') && community)
        );
      });
    }

    const q = mapSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          (s.tags ?? []).some((t: string) => t.toLowerCase().includes(q))
      );
    }

    if (advFilters.features.length > 0) {
      list = list.filter((s) => spotMatchesFeatures(s.tags, advFilters.features));
    }
    if (advFilters.types.length > 0) {
      list = list.filter((s) => advFilters.types.includes(s.spot_type));
    }
    if (advFilters.verifiedOnly) {
      list = list.filter((s) => s.is_verified);
    }
    if (advFilters.ratings.length > 0) {
      list = list.filter((s) => {
        const avg = spotRatings[s.id];
        return avg != null && advFilters.ratings.includes(Math.round(avg));
      });
    }
    if (advFilters.visited !== 'all') {
      const myId = session?.user?.id;
      list = list.filter((s) => {
        const visited = visitedSpotIds.has(s.id) || (!!myId && s.user_id === myId);
        return advFilters.visited === 'visited' ? visited : !visited;
      });
    }

    const region = viewportRegion ?? initialRegion;
    if (region && !(region.latitude === 0 && region.longitude === 0)) {
      const halfLat = region.latitudeDelta / 2;
      const halfLng = region.longitudeDelta / 2;
      const minLat = region.latitude - halfLat;
      const maxLat = region.latitude + halfLat;
      const minLng = region.longitude - halfLng;
      const maxLng = region.longitude + halfLng;
      list = list.filter(
        (s) => s.lat >= minLat && s.lat <= maxLat && s.lng >= minLng && s.lng <= maxLng
      );
    }

    return list.filter((s) => s.lat && s.lng);
  }, [
    filteredSearchResults,
    spots,
    cachedMapSpots,
    isOnline,
    difficultyFilter,
    ownershipFilter,
    mapSearch,
    session,
    friendIds,
    advFilters,
    visitedSpotIds,
    spotRatings,
    viewportRegion,
    initialRegion,
  ]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setVisitedSpotIds(new Set());
      return;
    }
    supabase
      .from('check_ins')
      .select('spot_id')
      .eq('user_id', uid)
      .then(({ data }) => {
        setVisitedSpotIds(new Set((data ?? []).map((r: any) => r.spot_id)));
      });
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isOnline) return;
    supabase
      .from('reviews')
      .select('spot_id, rating')
      .then(({ data }) => {
        if (!data) return;
        const sums: Record<string, { total: number; count: number }> = {};
        for (const r of data as any[]) {
          if (!r.spot_id || r.rating == null) continue;
          const e = sums[r.spot_id] ?? { total: 0, count: 0 };
          e.total += r.rating;
          e.count += 1;
          sums[r.spot_id] = e;
        }
        const avgs: Record<string, number> = {};
        for (const id in sums) avgs[id] = sums[id].total / sums[id].count;
        setSpotRatings(avgs);
      });
  }, [isOnline, spots.length]);

  const visiblePlaces = useMemo(() => {
    const hasPlaceType = advFilters.types.some((t) => t === 'skatepark' || t === 'skateshop');
    if (
      !hasPlaceType &&
      (advFilters.features.length > 0 ||
        advFilters.ratings.length > 0 ||
        advFilters.visited !== 'all' ||
        advFilters.verifiedOnly)
    ) {
      return [];
    }
    const spotIds = new Set(
      visibleSpots.filter((s) => rendersAsSpotMarker(s, highlightSpotId)).map((s) => s.id)
    );
    const seen = new Set<string>();
    return places.filter((p) => {
      if (spotIds.has(p.id) || seen.has(p.id)) return false;
      if (advFilters.types.length > 0 && !advFilters.types.includes(p.type)) return false;
      seen.add(p.id);
      return true;
    });
  }, [places, visibleSpots, advFilters, highlightSpotId]);

  const toggleOwnershipFilter = (key: 'mine' | 'friends' | 'community') =>
    setOwnershipFilter((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleDifficultyFilter = (key: 'beginner' | 'intermediate' | 'advanced') =>
    setDifficultyFilter((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const displayError = error ?? topRatedError;

  useEffect(() => {
    if (!displayError) {
      setBannerVisible(false);
      return;
    }
    setBannerVisible(true);
    const t = setTimeout(() => setBannerVisible(false), 6000);
    return () => clearTimeout(t);
  }, [displayError]);
  const mapStyle = useMemo(() => (theme.dark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE), [theme.dark]);
  const themeFirstRenderRef = useRef(true);
  useEffect(() => {
    if (themeFirstRenderRef.current) {
      themeFirstRenderRef.current = false;
      return;
    }
    setInitialRegion(mapRegionRef.current);
  }, [theme.dark]);
  const openedFromPanelRef = useRef(false);
  const pendingSpotEditRef = useRef<
    { id: string; name: string; description: string | null; tags: string[] } | null
  >(null);

  const spinAnim = useRef(new Animated.Value(0)).current;

  function closeCreateModal() {
    setCreateOpen(false);
    setPendingCoord(null);
    setSpotTags([]);
    setPendingImages([]);
    setCreateSpotVisibility('public');
    setSpotComment('');
    setSpotType('spot');
    setSpotAddress('');
    setSpotPhone('');
    setSpotWebsite('');
    setSpotHours('');
  }

  function closeDetailsModal() {
    const idToHide = highlightSpotIdRef.current;
    const spotToCenter = selectedSpot;

    const pendingEdit = pendingSpotEditRef.current;
    if (pendingEdit) {
      patchSpotLocal(pendingEdit.id, {
        name: pendingEdit.name,
        description: pendingEdit.description,
        tags: pendingEdit.tags,
      });
      pendingSpotEditRef.current = null;
    }

    setDetailsOpen(false);
    setSelectedSpot(null);
    resetReviews();
    setSpotCreatorUsername(null);
    setSpotCreatorAvatarUrl(null);
    setSpotCreatorBadge(null);

    setTimeout(() => {
      mapRef.current?.animateToRegion(
        {
          latitude: spotToCenter?.lat ?? mapRegionRef.current.latitude,
          longitude: spotToCenter?.lng ?? mapRegionRef.current.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        400
      );
    }, 300);

    openedFromPanelRef.current = false;
    resetConditions();
    resetDifficulty();

    if (idToHide) {
      if (openedFromDeepLinkRef.current) {
        setPlaces([]);
      }
      openedFromDeepLinkRef.current = false;
    }

    highlightSpotIdRef.current = null;
    setHighlightSpotId(null);
    setCommentCount(0);
  }

  const schedulePlacesClear = useCallback(() => {
    if (placesTimerRef.current) clearTimeout(placesTimerRef.current);
    placesTimerRef.current = setTimeout(() => {
      if (detailSheetOpenRef.current) {
        schedulePlacesClear();
      } else {
        setPlaces([]);
        placesTimerRef.current = null;
      }
    }, 30000);
  }, [setPlaces]);

  function setPlacesWithAutoClear(updater: (prev: Place[]) => Place[]) {
    setPlaces(updater);
    schedulePlacesClear();
  }

  const resetPlacesTimer = useCallback(() => {
    if (placesTimerRef.current) schedulePlacesClear();
  }, [schedulePlacesClear]);

  function mergePlaces(prev: Place[], added: Place[]): Place[] {
    const ids = new Set(prev.map((p) => p.id));
    return [...prev, ...added.filter((p) => !ids.has(p.id))];
  }

  function communityPlacesNear(type: 'skatepark' | 'skateshop', radiusMeters: number): Place[] {
    const { latitude, longitude } = mapRegionRef.current;
    return spots
      .filter(
        (s) =>
          s.spot_type === type &&
          s.lat != null &&
          s.lng != null &&
          haversineMeters(latitude, longitude, s.lat, s.lng) <= radiusMeters
      )
      .map((s) => ({ id: s.id, name: s.name, type, lat: s.lat, lng: s.lng, tags: {} }));
  }

  async function autoLoadPlaceType(type: 'skatepark' | 'skateshop') {
    const community = communityPlacesNear(type, 20000);
    if (community.length) setPlacesWithAutoClear((prev) => mergePlaces(prev, community));
    const loader = type === 'skatepark' ? loadNearbySkateParks : loadNearbySkateShops;
    await loader(
      mapRegionRef.current.latitude,
      mapRegionRef.current.longitude,
      20000,
      undefined,
      (osm) => setPlacesWithAutoClear((prev) => mergePlaces(prev, osm))
    );
  }

  function warmPlaceCache() {
    const { latitude, longitude } = mapRegionRef.current;
    if (!advFilters.types.includes('skatepark')) {
      loadNearbySkateParks(latitude, longitude, 20000, undefined, () => {});
    }
    if (!advFilters.types.includes('skateshop')) {
      loadNearbySkateShops(latitude, longitude, 20000, undefined, () => {});
    }
  }

  const autoLoadedTypesRef = useRef<Set<'skatepark' | 'skateshop'>>(new Set());
  useEffect(() => {
    (['skatepark', 'skateshop'] as const).forEach((t) => {
      if (advFilters.types.includes(t)) {
        if (!autoLoadedTypesRef.current.has(t)) {
          autoLoadedTypesRef.current.add(t);
          autoLoadPlaceType(t);
        }
      } else {
        autoLoadedTypesRef.current.delete(t);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advFilters.types]);

  const animateToSpotWithModalOffset = useCallback(
    (lat: number, lng: number, modalSize: 'full' | 'small' | 'medium' = 'full') => {
      preModalRegionRef.current = mapRegionRef.current;

      const MODAL_HEIGHT_RATIO = modalSize === 'small' ? 0.25 : modalSize === 'medium' ? 0.4 : 0.55;
      const latDelta = 0.03;
      const offsetLat = lat - latDelta * MODAL_HEIGHT_RATIO;

      mapRef.current?.animateToRegion(
        {
          latitude: offsetLat,
          longitude: lng,
          latitudeDelta: latDelta,
          longitudeDelta: 0.03,
        },
        400
      );
    },
    []
  );

  const openSpotPreview = useCallback(async (spot: Spot) => {
    setPreviewSpot(spot);
    setPreviewImageUrl(null);
    // Prefer the owner-pinned hero, then newest image, then a video thumbnail.
    const { data } = await supabase
      .from('check_in_media')
      .select('url, thumbnail_url, media_type, is_hero')
      .eq('spot_id', spot.id)
      .order('is_hero', { ascending: false })
      .order('created_at', { ascending: false });
    const image = data?.find((m) => m.media_type === 'image');
    const videoThumb = data?.find((m) => m.thumbnail_url);
    setPreviewImageUrl(image?.url ?? videoThumb?.thumbnail_url ?? null);
  }, []);

  const openSpotDetails = useCallback(
    async (spot: Spot) => {
      if (!session) {
        showAlert(
          'Sign in required',
          'Create a free account to view full spot details, reviews, and photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.push('/auth') },
          ]
        );
        return;
      }

      const freshSpot = spots.find((s) => s.id === spot.id) ?? spot;
      setPreviewSpot(null);
      setPreviewImageUrl(null);
      setSelectedSpot(freshSpot);
      setDetailsOpen(true);
      setDetailsLoading(true);
      resetReviews();
      clearImages();

      const [profileResult, , , , commentResult] = await Promise.all([
        supabase.from('profiles').select('username, avatar_url, badge').eq('id', freshSpot.user_id).single(),
        loadReviews(freshSpot.id),
        loadImages(freshSpot.id),
        loadConditions(freshSpot.id),
        supabase.from('spot_comments').select('*', { count: 'exact', head: true }).eq('spot_id', freshSpot.id),
      ]);

      if (freshSpot.spot_type === 'spot') {
        await loadMyDifficultyVote(freshSpot.id);
      }

      setSpotCreatorUsername(profileResult.data?.username ?? null);
      setSpotCreatorAvatarUrl(profileResult.data?.avatar_url ?? null);
      setSpotCreatorBadge(profileResult.data?.badge ?? null);
      setCommentCount(commentResult.count ?? 0);
      setDetailsLoading(false);
    },
    [spots]
  );

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([reload(), loadMySpots(), loadFavorites(), loadPlaceFavorites()]);
    setRefreshing(false);
  }

  async function getMyUsername(): Promise<string> {
    if (!session?.user.id) return 'Someone';
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', session.user.id)
      .single();
    return data?.username ?? 'Someone';
  }

  function confirmDelete(spot: Spot) {
    showAlert('Delete spot?', spot.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteSpotById(spot.id, () => {
            setDetailsOpen(false);
            setSelectedSpot(null);
            resetReviews();
          });
          removeFromSearchResults(spot.id);
        },
      },
    ]);
  }

  function onLongPress(e: LongPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPendingCoord({ lat: latitude, lng: longitude });
    setSpotName('');
    setSpotDesc('');
    setCreateOpen(true);
    setSpotRating(0);
  }

  function requireAuth(action: () => void) {
    if (!session) {
      showAlert('Sign in required', 'Create a free account to unlock this feature.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/auth') },
      ]);
      return;
    }
    action();
  }

  usePushNotifications(
    session?.user.id ?? null,
    session,
    (spotId, lat, lng) => {
      setPanelOpen(false);
      setTimeout(() => {
        const spot = spots.find((s) => s.id === spotId);
        if (spot) {
          animateToSpotWithModalOffset(lat, lng);
          openSpotDetails(spot);
        }
      }, 300);
    },
    () => setProfileOpen(true),
    (actorId) => {
      setPublicProfileUserId(actorId);
      setPublicProfileOpen(true);
    },
    (spotId) => {
      const notif = activityNotifications.find((n) => n.spot_id === spotId && !n.read);
      if (notif) markAsRead(notif.id);
    },
    () => {
      setPanelOpen(true);
      setEventFilterOverride('invited');
    },
    () => {
      setPanelOpen(false);
      setCrewsInitialTab('invites');
      setCrewsOpen(true);
    },
    (crewId) => {
      setPanelOpen(false);
      setSelectedCrewId(crewId);
      setCrewDetailOpen(true);
    }
  );

  useEffect(() => {
    reload();
    loadFavorites();
    loadPlaceFavorites();
    loadPlaceCheckIns();
    loadMySpots();
    loadWishlist();
    loadFlags();
    loadReviewFlags();
    loadPendingRequests();
    loadPublicEvents();
    loadMyEvents();
    loadInvitedEventIds();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      loadPlaceFavorites();
      loadWishlist();
      loadFlags();
      loadReviewFlags();
      loadPendingRequests();
    }, [])
  );

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      if (!useDeviceLocation) return;

      setError(null);

      if (!autoCenterRef.current) {
        setUseDeviceLocation(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied.');
        setUseDeviceLocation(false);
        setLocating(false);
        return;
      }

      let pos;
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (e) {
        try {
          pos = await Location.getLastKnownPositionAsync();
        } catch {
          pos = null;
        }
        if (!pos) {
          setError('Could not determine your location. Showing default view.');
          setUseDeviceLocation(false);
          setLocating(false);
          return;
        }
      }

      if (!autoCenterRef.current) {
        setUseDeviceLocation(false);
        setLocating(false);
        return;
      }

      const nextRegion: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };

      mapRegionRef.current = nextRegion;
      userLocationRef.current = nextRegion;
      if (!deepLinkRegion) {
        setInitialRegion(nextRegion);
        mapRef.current?.animateToRegion(nextRegion, 600);
      }
      setLocating(false);
      setUseDeviceLocation(false);
    })();
  }, [useDeviceLocation]);

  async function recenterToUser() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let pos;
      try {
        pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      } catch {
        pos = await Location.getLastKnownPositionAsync().catch(() => null);
      }
      if (!pos) return;
      const region: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      userLocationRef.current = region;
      mapRegionRef.current = region;
      mapRef.current?.animateToRegion(region, 500);
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (deepLinkRegion) return;
    AsyncStorage.getItem('cached_last_map_region').then((raw) => {
      if (!raw) return;
      try {
        const cached = JSON.parse(raw) as Region;
        if (
          typeof cached?.latitude === 'number' &&
          typeof cached?.longitude === 'number' &&
          typeof cached?.latitudeDelta === 'number' &&
          typeof cached?.longitudeDelta === 'number'
        ) {
          mapRegionRef.current = cached;
          setInitialRegion(cached);
          mapRef.current?.animateToRegion(cached, 0);
        }
      } catch { }
    });
  }, []);

  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [refreshing]);

  useEffect(() => {
    loadFeed(friends.map((f) => f.id));
  }, [friends]);

  useEffect(() => {
    if (panelOpen) {
      loadFeed(friends.map((f) => f.id));
      loadNotifications();
    }
  }, [panelOpen]);

  useEffect(() => {
    if (!session?.user.id) return;
    const fids = new Set(friends.map((f) => f.id));
    const refresh = (payload: any) => {
      const uid = payload?.new?.user_id;
      if (uid && fids.has(uid)) {
        loadFeed(friends.map((f) => f.id));
      }
    };
    const spotsCh = supabase
      .channel(`feed-spots-${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spots' }, refresh)
      .subscribe();
    const reviewsCh = supabase
      .channel(`feed-reviews-${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(spotsCh);
      supabase.removeChannel(reviewsCh);
    };
  }, [session?.user.id, friends]);

  useEffect(() => {
    if (session?.user.id) {
      loadThemeForUser(session.user.id);
      loadFlags();
      loadReviewFlags();
      loadPendingRequests();
      loadFriends();
      loadNotifications();
      supabase
        .from('profiles')
        .select('avatar_url, is_vetted, is_admin')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          setMyAvatarUrl(data?.avatar_url ?? null);
          setIsVetted(data?.is_vetted ?? false);
          setIsAdmin(data?.is_admin ?? false);
        });
    } else {
      setMyAvatarUrl(null);
      setIsAdmin(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !splashDone) return;
    let cancelled = false;
    AsyncStorage.getItem('pending_profile_id').then((id) => {
      if (cancelled || !id) return;
      AsyncStorage.removeItem('pending_profile_id');
      setTimeout(() => {
        if (cancelled) return;
        if (id === session.user.id) {
          setProfileOpen(true);
        } else {
          setPublicProfileUserId(id);
          setPublicProfileOpen(true);
        }
      }, 300);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, splashDone]);

  useEffect(() => {
    if (!session?.user.id) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadFriends();
        loadPendingRequests();
        loadNotifications();
      }
    });
    return () => sub.remove();
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) return;
    const channel = supabase
      .channel(`notifications-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) return;
    const handler = () => {
      loadPendingRequests();
      loadFriends();
      reload();
    };
    const inboundCh = supabase
      .channel(`friendships-in-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${session.user.id}`,
        },
        handler
      )
      .subscribe();
    const outboundCh = supabase
      .channel(`friendships-out-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `requester_id=eq.${session.user.id}`,
        },
        handler
      )
      .subscribe();
    return () => {
      supabase.removeChannel(inboundCh);
      supabase.removeChannel(outboundCh);
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (deepLinkSpotId) {
      pendingDeepLinkRef.current = deepLinkSpotId;
    }
  }, [deepLinkSpotId]);

  useEffect(() => {
    if (hasOpenedDeepLinkRef.current) return;
    if (!pendingDeepLinkRef.current || !spots.length || locating) return;
    const spot = spots.find((s) => s.id === pendingDeepLinkRef.current);
    if (!spot) return;
    hasOpenedDeepLinkRef.current = true;
    pendingDeepLinkRef.current = null;

    const spotRegion = {
      latitude: spot.lat - 0.03 * 0.45,
      longitude: spot.lng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };
    setInitialRegion(spotRegion);
    mapRegionRef.current = spotRegion;

    if (spot.spot_type === 'skatepark' || spot.spot_type === 'skateshop') {
      setPlacesWithAutoClear((prev) =>
        prev.some((p) => p.id === spot.id)
          ? prev
          : [
            ...prev,
            {
              id: spot.id,
              name: spot.name,
              type: spot.spot_type as 'skatepark' | 'skateshop',
              lat: spot.lat,
              lng: spot.lng,
              tags: {},
            },
          ]
      );
    }

    setTimeout(() => {
      preModalRegionRef.current = spotRegion;
      openedFromDeepLinkRef.current = true;
      highlightSpotIdRef.current = spot.id;
      mapRef.current?.animateToRegion(spotRegion, 400);
      openSpotDetails(spot);
    }, 1500);
  }, [spots, locating]);

  useEffect(() => {
    if (!session) return;
    //

    AsyncStorage.getItem('pendingNotificationSpot').then((raw) => {
      if (!raw) return;
      hasNavigatedFromNotification.current = true;
      AsyncStorage.removeItem('pendingNotificationSpot');
      const pending = JSON.parse(raw);
      setTimeout(() => {
        router.replace({
          pathname: '/',
          params: {
            deepLinkSpotId: pending.spot_id,
            deepLinkLat: pending.lat,
            deepLinkLng: pending.lng,
          },
        });
      }, 1000);
    });

    AsyncStorage.getItem('pendingNotificationEvents').then((val) => {
      if (!val) return;
      AsyncStorage.removeItem('pendingNotificationEvents');
      setPanelOpen(true);
      setEventFilterOverride('invited');
    });

    AsyncStorage.getItem('pendingNotificationCrewInvites').then((val) => {
      if (!val) return;
      AsyncStorage.removeItem('pendingNotificationCrewInvites');
      setPanelOpen(false);
      setCrewsInitialTab('invites');
      setCrewsOpen(true);
    });

    AsyncStorage.getItem('pendingNotificationCrewDetail').then((crewId) => {
      if (!crewId) return;
      AsyncStorage.removeItem('pendingNotificationCrewDetail');
      setPanelOpen(false);
      setSelectedCrewId(crewId);
      setCrewDetailOpen(true);
    });

    AsyncStorage.getItem('pendingNotificationProfile').then((val) => {
      if (!val) return;
      setProfileOpen(true);
    });

    AsyncStorage.getItem('pendingNotificationPublicProfile').then((actorId) => {
      if (!actorId) return;
      setPublicProfileUserId(actorId);
      setPublicProfileOpen(true);
    });
  }, [session]);

  useEffect(() => {
    if (!crewsOpen || crewsInitialTab !== 'invites') return;
    activityNotifications.filter((n) => !n.read && n.type === 'crew_invite').forEach((n) => markAsRead(n.id));
  }, [crewsOpen, crewsInitialTab, activityNotifications]);

  useEffect(() => {
    if (!crewDetailOpen || !selectedCrewId) return;
    activityNotifications
      .filter(
        (n) =>
          !n.read && n.crew_id === selectedCrewId && (n.type === 'crew_join' || n.type === 'crew_spot_added')
      )
      .forEach((n) => markAsRead(n.id));
  }, [crewDetailOpen, selectedCrewId, activityNotifications]);

  useEffect(() => {
    if (!profileOpen) return;
    const timer = setTimeout(() => {
      AsyncStorage.removeItem('pendingNotificationProfile');
    }, 3000);
    return () => clearTimeout(timer);
  }, [profileOpen]);

  useEffect(() => {
    if (!publicProfileOpen) return;
    const timer = setTimeout(() => {
      AsyncStorage.removeItem('pendingNotificationPublicProfile');
    }, 3000);
    return () => clearTimeout(timer);
  }, [publicProfileOpen]);

  useEffect(() => {
    if (pathname === '/reset-password') {
      setSettingsOpen(false);
      setPanelOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!session?.user.id || myEvents.length === 0) return;
    const unsubscribe = subscribeToRsvpChanges(
      session.user.id,
      myEvents.map((e) => e.id)
    );
    return unsubscribe;
  }, [session?.user.id, myEvents]);

  useEffect(() => {
    if (spots.length > 0) cacheMapSpots(spots);
  }, [spots]);

  useEffect(() => {
    if (favorites.length > 0) cacheFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    if (!deepLinkSpotId && typeof window !== 'undefined') return;
    const url = Linking.getInitialURL();
    url?.then((initialUrl) => {
      if (!initialUrl) return;
      const match = initialUrl.match(/join\?ref=([a-f0-9-]+)/);
      if (match?.[1]) {
        AsyncStorage.setItem('pending_referral_id', match[1]);
      }
    });
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const match = url.match(/join\?ref=([a-f0-9-]+)/);
      if (match?.[1]) {
        AsyncStorage.setItem('pending_referral_id', match[1]);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (panelOpen && session) {
      loadFeed(friends.map((f) => f.id));
      loadNotifications();
    }
  }, [panelOpen]);

  useEffect(() => {
    if (profileOpen && session) {
      loadAllTrickLogs();
    }
  }, [profileOpen]);

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }}>
        {/*<View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>*/}
        {/*    <Button title={loading ? 'Loading…' : 'Reload'} onPress={reload} />*/}
        {/*</View>*/}

        {displayError ? <Text style={{ color: 'red', marginBottom: 12 }}>{displayError}</Text> : null}
        <Text style={{ marginBottom: 12 }}>Map is native-only for now. Web shows a list fallback.</Text>

        <ScrollView>
          {visibleSpots.map((s) => (
            <View
              key={s.id}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderColor: '#ddd',
              }}>
              <Text style={{ fontWeight: '600' }}>{s.name}</Text>
              {s.description ? <Text>{s.description}</Text> : null}
              <Text>
                {s.lat}, {s.lng}
              </Text>
              <View
                style={{
                  marginTop: 8,
                  alignSelf: 'flex-start',
                }}>
                <Button title="Delete" onPress={() => confirmDelete(s)} />
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.headerBg }}>
      <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
      <ThemeBackdrop color={c.headerBg} variant="header">
      <View
        style={{
          height: insets.top,
          backgroundColor: 'transparent',
        }}
      />
      {displayError && bannerVisible ? (
        <Text
          style={{
            color: 'red',
            paddingHorizontal: 12,
            paddingTop: 8,
          }}>
          {displayError}
        </Text>
      ) : null}
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderColor: c.border,
          backgroundColor: 'transparent',
        }}>
        <Pressable onPress={() => setPanelOpen(true)} style={{ padding: 8 }}>
          <Ionicons name="menu" size={24} color={c.text} />
          {pendingReceived.length + unreadActivityCount + unreadInviteCount + unreadRsvpCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: c.danger,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}>
              <Text
                style={{
                  color: 'white',
                  fontSize: 11,
                  fontWeight: '700',
                }}>
                {pendingReceived.length + unreadActivityCount + unreadInviteCount + unreadRsvpCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: c.text,
          }}>
          Inhabitants
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <Pressable onPress={onRefresh} style={{ padding: 8 }} disabled={refreshing}>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: spinAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}>
              <Ionicons name="refresh" size={20} color={refreshing ? c.accent : c.text} />
            </Animated.View>
          </Pressable>
          <Pressable onPress={() => setSettingsOpen(true)} style={{ padding: 8 }}>
            <Ionicons name="settings-outline" size={24} color={c.text} />
          </Pressable>
        </View>
      </View>
      </ThemeBackdrop>
      {showOfflineBanner ? (
        <View
          style={{
            backgroundColor: isOnline ? 'rgba(255,149,0,0.12)' : 'rgba(255,59,48,0.12)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
          <Ionicons
            name={isOnline ? 'time-outline' : 'cloud-offline-outline'}
            size={14}
            color={isOnline ? '#FF9500' : '#FF3B30'}
          />
          <Text
            style={{
              fontSize: 12,
              color: isOnline ? '#FF9500' : '#FF3B30',
              fontWeight: '500',
              flex: 1,
            }}>
            {bannerMessage}
          </Text>
        </View>
      ) : null}
      </View>
      <ExplorePanel
        session={session}
        visible={panelOpen}
        pendingFriendRequestsCount={pendingReceived.length}
        feedItems={feedItems}
        feedLoading={feedLoading}
        onSelectFeedSpot={(s) => {
          setPanelOpen(false);
          openedFromPanelRef.current = true;
          setHighlightSpotId(s.id);
          highlightSpotIdRef.current = s.id;
          if (s.spot_type === 'skatepark' || s.spot_type === 'skateshop') {
            setPlacesWithAutoClear((prev) =>
              prev.some((p) => p.id === s.id)
                ? prev
                : [
                  ...prev,
                  {
                    id: s.id,
                    name: s.name,
                    type: s.spot_type as 'skatepark' | 'skateshop',
                    lat: s.lat,
                    lng: s.lng,
                    tags: {},
                  },
                ]
            );
            setTimeout(() => {
              animateToSpotWithModalOffset(s.lat, s.lng);
              openSpotDetails(s);
            }, 400);
          } else {
            animateToSpotWithModalOffset(s.lat, s.lng);
            openSpotDetails(s);
          }
        }}
        activityNotifications={activityNotifications}
        onMarkAllNotificationsRead={markAllAsRead}
        onSelectNotification={(n) => {
          markAsRead(n.id);
          if (n.type === 'crew_invite') {
            setPanelOpen(false);
            setCrewsInitialTab('invites');
            setCrewsOpen(true);
            return;
          }
          if (n.type === 'crew_join' && n.crew_id) {
            setPanelOpen(false);
            setSelectedCrewId(n.crew_id);
            setCrewDetailOpen(true);
            return;
          }
          if (n.type === 'feedback_reply') {
            setPanelOpen(false);
            setPendingFeedbackPostId(n.feedback_post_id ?? null);
            setSettingsOpen(true);
            return;
          }
          openedFromPanelRef.current = true;
          const spot = n.spot_id ? spots.find((s) => s.id === n.spot_id) : null;
          if (spot) {
            setPanelOpen(false);
            setHighlightSpotId(spot.id);
            highlightSpotIdRef.current = spot.id;
            animateToSpotWithModalOffset(spot.lat, spot.lng);
            openSpotDetails(spot);
          }
        }}
        onClose={() => {
          setPanelOpen(false);
          setPendingEventCoord(null);
          reload();
          loadMySpots();
        }}
        onOpenSettings={() => {
          setPanelOpen(false);
          reload();
          loadMySpots();
          setSettingsOpen(true);
        }}
        onOpenCrews={() => {
          setPanelOpen(false);
          setCrewsOpen(true);
        }}
        parksLoading={parksLoading}
        shopsLoading={shopsLoading}
        topLoading={topLoading}
        topRated={topRated}
        mySpots={mySpots}
        mySpotsLoading={mySpotsLoading}
        onLoadSkateparks={() =>
          requireAuth(async () => {
            setPanelOpen(false);
            const token = ++searchSeqRef.current;
            toast.show('Searching…', { duration: 0 });
            const communityParks = communityPlacesNear('skatepark', 20000);
            setPlacesWithAutoClear(() => communityParks);
            const res = await loadNearbySkateParks(
              mapRegionRef.current.latitude,
              mapRegionRef.current.longitude,
              20000,
              undefined,
              (googleParks) => {
                if (searchSeqRef.current !== token) return;
                setPlacesWithAutoClear(() => [...communityParks, ...googleParks]);
              }
            );
            if (searchSeqRef.current !== token) return;
            const total = communityParks.length + res.count;
            if (total > 0) { toast.hide(); return; }
            if (res.status === 'timeout') toast.error('Timed out');
            else if (res.status === 'error') toast.error('Couldn’t search right now');
            else toast.show('No skate parks in this area');
          })
        }
        onOpenProfile={() => {
          setPanelOpen(false);
          loadAllTrickLogs();
          setProfileOpen(true);
        }}
        onLoadSkateShops={() =>
          requireAuth(async () => {
            setPanelOpen(false);
            const token = ++searchSeqRef.current;
            toast.show('Searching…', { duration: 0 });
            const communityShops = communityPlacesNear('skateshop', 20000);
            setPlacesWithAutoClear(() => communityShops);
            const res = await loadNearbySkateShops(
              mapRegionRef.current.latitude,
              mapRegionRef.current.longitude,
              20000,
              undefined,
              (googleShops) => {
                if (searchSeqRef.current !== token) return;
                setPlacesWithAutoClear(() => [...communityShops, ...googleShops]);
              }
            );
            if (searchSeqRef.current !== token) return;
            const total = communityShops.length + res.count;
            if (total > 0) { toast.hide(); return; }
            if (res.status === 'timeout') toast.error('Timed out');
            else if (res.status === 'error') toast.error('Couldn’t search right now');
            else toast.show('No skate shops in this area');
          })
        }
        onLoadTopRated={() =>
          requireAuth(async () => {
            const topSpot = await loadTopRatedSpotsInArea(mapRegionRef.current, 10);
            if (topSpot) {
              mapRef.current?.animateToRegion(
                {
                  latitude: topSpot.lat,
                  longitude: topSpot.lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                },
                1200
              );
            }
            setTimeout(() => {
              clearTopRated();
            }, 60000);
          })
        }
        onOpenCities={() => {
          setPanelOpen(false);
          setCitiesOpen(true);
        }}
        onSelectSpot={(s) => {
          if (actionSheetOpenRef.current) return;
          setPanelOpen(false);
          openedFromPanelRef.current = true;
          if (s.spot_type === 'skatepark' || s.spot_type === 'skateshop') {
            setHighlightSpotId(s.id);
            highlightSpotIdRef.current = s.id;
            setPlacesWithAutoClear((prev) =>
              prev.some((p) => p.id === s.id)
                ? prev
                : [
                  ...prev,
                  {
                    id: s.id,
                    name: s.name,
                    type: s.spot_type as 'skatepark' | 'skateshop',
                    lat: s.lat,
                    lng: s.lng,
                    tags: {},
                  },
                ]
            );
            setTimeout(() => {
              animateToSpotWithModalOffset(s.lat, s.lng);
              openSpotDetails(s);
            }, 400);
          } else {
            setHighlightSpotId(s.id);
            highlightSpotIdRef.current = s.id;
            setTimeout(() => {
              animateToSpotWithModalOffset(s.lat, s.lng);
              openSpotDetails(s);
            }, 350);
          }
        }}
        onSignOut={async () => {
          await signOut();
          setPanelOpen(false);
        }}
        onSearch={(tag) => requireAuth(() => searchByTag(tag))}
        onClearSearch={clearSearch}
        difficultyFilter={difficultyFilter}
        onToggleDifficultyFilter={(level) => {
          setDifficultyFilter((prev) => {
            const next = new Set(prev);
            if (next.has(level)) next.delete(level);
            else next.add(level);
            return next;
          });
        }}
        searchResults={filteredSearchResults}
        hasSearchResults={filteredSearchResults.length > 0}
        favorites={favorites}
        favLoading={favLoading}
        placeFavorites={placeFavorites}
        placeFavLoading={placeFavLoading}
        onSelectPlace={async (p) => {
          setPanelOpen(false);
          openedFromFavoritesRef.current = true;
          setSelectedPlaceId(p.id);
          setSelectedPlace(p);
          setPlaceDetailsOpen(true);
          setPlacesWithAutoClear((prev) =>
            prev.some((x) => x.id === p.id) ? prev : [...prev, p]
          );
          animateToSpotWithModalOffset(p.lat, p.lng, 'small');
          const full = await fetchPlaceById(p.id);
          if (full) {
            setSelectedPlace(full);
            setPlacesWithAutoClear((prev) =>
              prev.map((x) => (x.id === full.id ? full : x))
            );
          }
        }}
        onCycleSpotVisibility={async (spot) => {
          if (actionSheetOpenRef.current) return;
          actionSheetOpenRef.current = true;
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const current = spotVisibility(spot);
          const options: SpotVisibility[] = ['public', 'friends', 'private'];
          const labels = ['Public', 'Friends', 'Private', 'Cancel'];
          ActionSheetIOS.showActionSheetWithOptions(
            {
              title: 'Visibility',
              options: labels,
              cancelButtonIndex: 3,
            },
            async (idx) => {
              if (idx === 3 || options[idx] === current) {
                actionSheetOpenRef.current = false;
                return;
              }
              const picked = options[idx];
              if (picked === 'public') {
                const publicDup = await findNearbyDuplicate(spot.lat, spot.lng, spot.name, {
                  excludeId: spot.id,
                  publicOnly: true,
                });
                if (publicDup) {
                  showAlert(
                    'Public spot already exists',
                    `"${publicDup.name}" is already public here. Keep yours private or friends-only to avoid a duplicate, or view the public spot.`,
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => {
                          actionSheetOpenRef.current = false;
                        },
                      },
                      {
                        text: 'View public spot',
                        onPress: () => {
                          actionSheetOpenRef.current = false;
                          setDetailsOpen(false);
                          setHighlightSpotId(publicDup.id);
                          highlightSpotIdRef.current = publicDup.id;
                          animateToSpotWithModalOffset(publicDup.lat, publicDup.lng);
                          setTimeout(() => openSpotDetails(publicDup), 450);
                        },
                      },
                      {
                        text: 'Delete mine',
                        style: 'destructive',
                        onPress: () => {
                          actionSheetOpenRef.current = false;
                          setDetailsOpen(false);
                          deleteSpotById(spot.id, async () => {
                            await loadMySpots();
                            await reload();
                          });
                        },
                      },
                    ]
                  );
                  return;
                }
              }
              actionSheetOpenRef.current = false;
              await setSpotVisibility(spot, picked);
              await loadMySpots();
            }
          );
        }}
        onDeleteSpot={async (spot) => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteSpotById(spot.id, async () => {
            await loadMySpots();
            setPlaces((prev) => prev.filter((p) => p.id !== spot.id));
          });
        }}
        events={events}
        myEvents={myEvents}
        eventsLoading={eventsLoading}
        onCreateEvent={() => {
          setPanelOpen(false);
          setCreateEventOpen(true);
        }}
        onSelectEvent={(event) => {
          setPanelOpen(false);
          setSelectedEvent(event);
          setEventDetailsOpen(true);
          if (event.spot_id) {
            const spot = spots.find((s) => s.id === event.spot_id);
            if (spot) {
              setTimeout(() => {
                preModalRegionRef.current = mapRegionRef.current;
                openedFromPanelRef.current = true;
                setHighlightSpotId(spot.id);
                highlightSpotIdRef.current = spot.id;
                animateToSpotWithModalOffset(spot.lat, spot.lng);
              }, 450);
            }
          } else {
            setTimeout(() => {
              setPendingEventCoord({ lat: event.lat, lng: event.lng });
              mapRef.current?.animateToRegion(
                {
                  latitude: event.lat - 0.03 * 0.45,
                  longitude: event.lng,
                  latitudeDelta: 0.03,
                  longitudeDelta: 0.03,
                },
                400
              );
            }, 450);
          }
        }}
        onDeleteEvent={async (eventId) => {
          await cancelEvent(eventId);
          setPendingEventCoord(null);
        }}
        onRefreshEvents={() => {
          loadPublicEvents().then(() => {
            loadRsvpCounts(events.map((e) => e.id));
          });
          loadInvitedEventIds();
        }}
        eventRsvpCounts={eventRsvpCounts}
        invitedEventIds={invitedEventIds}
        unreadInviteCount={unreadInviteCount}
        onClearUnreadInvites={clearUnreadInviteCount}
        initialEventFilter={eventFilterOverride}
        unreadRsvpCount={unreadRsvpCount}
        onClearUnreadRsvps={clearUnreadRsvpCount}
      />

      <SpotMap
        mapRef={mapRef}
        visibleSpots={visibleSpots}
        places={visiblePlaces}
        highlightSpotId={highlightSpotId}
        selectedPlaceId={selectedPlaceId}
        session={session}
        friendIds={friendIds}
        pendingCoord={pendingCoord}
        initialRegion={initialRegion}
        onMarkerPress={resetPlacesTimer}
        onPress={() => {
          if (suppressMapPressRef.current) {
            suppressMapPressRef.current = false;
            return;
          }
          setHighlightSpotId(null);
          setSelectedPlaceId(null);
          setPreviewSpot(null);
          setPreviewImageUrl(null);
        }}
        onPanDrag={() => {
          autoCenterRef.current = false;
        }}
        onRegionChangeComplete={(r: Region) => {
          mapRegionRef.current = r;
          setViewportRegion(r);
          const shouldShow = r.latitudeDelta < 0.5;
          setMarkersVisible((prev) => (prev === shouldShow ? prev : shouldShow));
          if (regionWriteTimerRef.current) clearTimeout(regionWriteTimerRef.current);
          regionWriteTimerRef.current = setTimeout(() => {
            AsyncStorage.setItem('cached_last_map_region', JSON.stringify(r)).catch(() => { });
          }, 1000);
        }}
        onLongPress={onLongPress}
        markerRefs={markerRefs}
        suppressMapPressRef={suppressMapPressRef}
        setHighlightSpotId={setHighlightSpotId}
        highlightSpotIdRef={highlightSpotIdRef}
        animateToSpotWithModalOffset={animateToSpotWithModalOffset}
        openSpotDetails={openSpotDetails}
        openSpotPreview={openSpotPreview}
        setSelectedPlaceId={setSelectedPlaceId}
        setSelectedPlace={setSelectedPlace}
        setPlaceDetailsOpen={setPlaceDetailsOpen}
        setSelectedEvent={setSelectedEvent}
        setEventDetailsOpen={setEventDetailsOpen}
        spots={spots}
        events={events}
        pendingEventCoord={pendingEventCoord}
        mapStyle={mapStyle}
        mapDark={theme.dark}
        mapProvider={mapProvider}
        mapType={mapType}
        clusterColor={c.accent}
        markersVisible={markersVisible}
      />
      {!detailsOpen && !placeDetailsOpen && !eventDetailsOpen ? (
        <>
          <Text
            onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
            style={{
              position: 'absolute',
              bottom: insets.bottom + 44,
              left: 10,
              fontSize: 10,
              color: c.text,
              backgroundColor: c.surface,
              opacity: 0.85,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 6,
              overflow: 'hidden',
            }}>
            © OSM
          </Text>
          <MapControls
            style={{ position: 'absolute', top: (headerHeight || insets.top + 56) + 8, left: 12, right: 12 }}
            search={mapSearch}
            onSearchChange={setMapSearch}
            ownershipFilter={ownershipFilter}
            onToggleOwnership={toggleOwnershipFilter}
            difficultyFilter={difficultyFilter}
            onToggleDifficulty={toggleDifficultyFilter}
            isPro={isPro}
            activeFilterCount={countActiveFilters(advFilters)}
            onOpenFilters={() =>
              requireAuth(() => {
                if (!isPro) {
                  setPaywallHeadline('Unlock advanced filters and find exactly the spots you want.');
                  setPaywallOpen(true);
                  return;
                }
                warmPlaceCache();
                setFilterSheetOpen(true);
              })
            }
          />
          <MapLegend
            style={{ position: 'absolute', top: (headerHeight || insets.top + 56) + 112, right: 12, alignItems: 'flex-end' }}
          />
          <Pressable
            onPress={recenterToUser}
            disabled={locating}
            style={{
              position: 'absolute',
              bottom: 40,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: c.surface,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}>
            <Ionicons
              name={locating ? 'ellipsis-horizontal' : 'locate'}
              size={22}
              color={c.accent}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              const next =
                mapType === 'standard'
                  ? 'satellite'
                  : mapType === 'satellite'
                    ? 'hybrid'
                    : 'standard';
              setMapType(next);
              toast.show(
                next === 'standard' ? 'Standard' : next === 'satellite' ? 'Satellite' : 'Hybrid'
              );
            }}
            style={{
              position: 'absolute',
              bottom: 92,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: c.surface,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}>
            <Ionicons
              name={mapType === 'standard' ? 'layers-outline' : 'layers'}
              size={22}
              color={c.accent}
            />
          </Pressable>
        </>
      ) : null}
      {locating ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + 56,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(0,0,0,0.7)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
          }}>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>Locating you…</Text>
        </View>
      ) : null}
      {previewSpot && !detailsOpen ? (
        <Pressable
          onPress={() => {
            const s = previewSpot;
            setPreviewSpot(null);
            setPreviewImageUrl(null);
            animateToSpotWithModalOffset(s.lat, s.lng);
            openSpotDetails(s);
          }}
          style={{
            position: 'absolute',
            bottom: 110,
            left: 16,
            right: 16,
            backgroundColor: c.surface,
            borderRadius: 12,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5,
          }}>
          {previewImageUrl ? (
            <Image source={{ uri: previewImageUrl }} style={{ width: 64, height: 64, borderRadius: 8 }} />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                backgroundColor: c.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Ionicons name="image-outline" size={24} color={c.subtext} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: c.text, fontSize: 15 }} numberOfLines={1}>
              {previewSpot.name}
            </Text>
            {previewSpot.tags && previewSpot.tags.length > 0 ? (
              <Text style={{ fontSize: 12, color: c.subtext, marginTop: 2 }} numberOfLines={1}>
                {previewSpot.tags.map((t) => `#${t}`).join(' ')}
              </Text>
            ) : null}
            {previewSpot.spot_type === 'spot' &&
              previewSpot.difficulty_vote_count > 0 &&
              previewSpot.avg_difficulty !== null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="skull" size={12} color="#FF3B30" />
                <Text style={{ fontSize: 11, color: c.subtext, fontWeight: '600' }}>
                  {previewSpot.avg_difficulty.toFixed(1)} ·{' '}
                  {difficultyLabel(previewSpot.avg_difficulty)}
                </Text>
              </View>
            ) : null}
            <Text
              style={{
                fontSize: 12,
                color: c.buttonBg,
                marginTop: 4,
                fontWeight: '600',
              }}>
              Tap to view details →
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setPreviewSpot(null);
              setPreviewImageUrl(null);
            }}
            hitSlop={10}
            style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color={c.subtext} />
          </Pressable>
        </Pressable>
      ) : null}
      {/* Create A Spot Modal */}
      <CreateSpotModal
        visible={createOpen}
        pendingCoord={pendingCoord}
        spotName={spotName}
        spotDesc={spotDesc}
        spotRating={spotRating}
        spotComment={spotComment}
        onChangeComment={setSpotComment}
        onChangeName={setSpotName}
        onChangeDesc={setSpotDesc}
        onChangeRating={setSpotRating}
        spotTags={spotTags}
        onAddTag={(tag) => setSpotTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))}
        onRemoveTag={(tag) => setSpotTags((prev) => prev.filter((t) => t !== tag))}
        onCancel={closeCreateModal}
        visibility={createSpotVisibility}
        onChangeVisibility={setCreateSpotVisibility}
        onCreate={async () => {
          if (!pendingCoord) return;
          const duplicate = await findNearbyDuplicate(pendingCoord.lat, pendingCoord.lng, spotName);
          if (duplicate) {
            const dupIsPublic = !duplicate.is_private && !duplicate.friends_only;
            const dupIsMine = duplicate.user_id === session?.user.id;
            const creatingPublic = createSpotVisibility === 'public';
            if (dupIsMine || (dupIsPublic && creatingPublic)) {
              showAlert(
                dupIsMine ? 'You already added this spot' : 'Public spot already exists',
                dupIsMine
                  ? `You already have "${duplicate.name}" here. View it instead of creating a duplicate.`
                  : `"${duplicate.name}" is already a public spot here. Make yours private or friends-only to keep a personal copy, or view the public spot.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'View spot',
                    onPress: () => {
                      setTimeout(() => {
                        closeCreateModal();
                        setHighlightSpotId(duplicate.id);
                        highlightSpotIdRef.current = duplicate.id;
                        animateToSpotWithModalOffset(duplicate.lat, duplicate.lng);
                        setTimeout(() => openSpotDetails(duplicate), 450);
                      }, 300);
                    },
                  },
                ]
              );
              return;
            }
          }
          const newSpot = await createSpotAt(
            pendingCoord.lat,
            pendingCoord.lng,
            spotName,
            spotDesc,
            spotRating,
            spotTags,
            createSpotVisibility,
            spotType,
            {
              address: spotAddress,
              phone: spotPhone,
              website: spotWebsite,
              hours: spotHours,
            }
          );
          if (newSpot) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (pendingImages.length > 0) {
              await uploadImages(newSpot.id, pendingImages);
            }
            if (spotRating > 0) {
              await submitReview(newSpot.id, spotRating, spotComment);
            }
            await loadMySpots();
            await reload();

            if (newSpot.spot_type === 'skatepark' || newSpot.spot_type === 'skateshop') {
              setPlacesWithAutoClear((prev) => [
                ...prev,
                {
                  id: newSpot.id,
                  name: newSpot.name,
                  type: newSpot.spot_type as 'skatepark' | 'skateshop',
                  lat: newSpot.lat,
                  lng: newSpot.lng,
                  tags: {},
                },
              ]);
              setTimeout(() => {
                setPlacesWithAutoClear((prev) => prev.filter((p) => p.id !== newSpot.id));
              }, 4000);
            }

            closeCreateModal();
            animateToSpotWithModalOffset(newSpot.lat, newSpot.lng);
            setHighlightSpotId(newSpot.id);
            highlightSpotIdRef.current = newSpot.id;
            setTimeout(() => {
              openSpotDetails(newSpot);
            }, 450);
            return;
          }
          closeCreateModal();
        }}
        isVetted={isVetted}
        pendingImages={pendingImages}
        onAddImage={(uri) => setPendingImages((prev) => (prev.includes(uri) ? prev : [...prev, uri]))}
        onRemoveImage={(uri) => setPendingImages((prev) => prev.filter((u) => u !== uri))}
        spotType={spotType}
        isAdmin={isAdmin}
        spotAddress={spotAddress}
        onChangeAddress={setSpotAddress}
        spotPhone={spotPhone}
        onChangePhone={setSpotPhone}
        spotWebsite={spotWebsite}
        onChangeWebsite={setSpotWebsite}
        spotHours={spotHours}
        onChangeHours={setSpotHours}
        onChangeSpotType={(v) => {
          setSpotType(v);
          if (v !== 'spot') setCreateSpotVisibility('public');
        }}
      />
      {/* Details Modal */}
      <SpotDetailsModal
        visible={detailsOpen}
        spot={selectedSpot}
        isFlaggedByMe={selectedSpot ? isFlaggedByMe(selectedSpot.id) : false}
        flagCount={selectedSpot?.flag_count ?? 0}
        onToggleFlag={async (reason?: string) => {
          if (!selectedSpot) return;
          await toggleFlag(selectedSpot.id, reason);
        }}
        reviews={spotReviews}
        newDifficulty={newDifficulty}
        existingDifficultyVoteId={existingDifficultyVoteId}
        onChangeDifficulty={setNewDifficulty}
        onSubmitDifficulty={async (overrideDifficulty?: number) => {
          if (!selectedSpot) return;
          const err = await submitDifficulty(selectedSpot.id, overrideDifficulty);
          if (err) {
            setError(err);
            return;
          }
          await refreshSpotDifficulty(selectedSpot.id);
        }}
        onRemoveDifficulty={async () => {
          if (!selectedSpot) return;
          const err = await removeDifficulty();
          if (err) {
            setError(err);
            return;
          }
          await refreshSpotDifficulty(selectedSpot.id);
        }}
        existingReviewId={existingReviewId}
        avgRating={avgRating}
        newRating={newReviewRating}
        newComment={newReviewComment}
        onChangeRating={setNewReviewRating}
        onChangeComment={setNewReviewComment}
        onSubmitReview={async (overrideRating?: number) => {
          if (!selectedSpot) return;
          await submitReview(selectedSpot.id, overrideRating);
        }}
        onClose={closeDetailsModal}
        currentUserId={session?.user.id ?? null}
        onDelete={confirmDelete}
        isFavorite={selectedSpot ? isFavorite(selectedSpot.id) : false}
        onToggleFavorite={async () => {
          if (!selectedSpot) return;
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const wasAlreadyFavorited = isFavorite(selectedSpot.id);
          await toggleFavorite(selectedSpot.id);
          if (selectedSpot.user_id !== session?.user.id && !wasAlreadyFavorited) {
            const username = await getMyUsername();
            await sendPushNotification(selectedSpot.id, 'favorite', username, session?.user.id);
          }
        }}
        onDeleteReview={async (reviewId) => {
          if (!selectedSpot) return;
          const err = await deleteReview(reviewId, selectedSpot.id);
          if (err) setError(err);
        }}
        images={images}
        imagesLoading={imagesUploading}
        onDeleteImage={async (url) => {
          if (!selectedSpot) return;
          await deleteImage(selectedSpot.id, url);
        }}
        onUploadImages={async (uris) => {
          if (!selectedSpot) return;
          await uploadImages(selectedSpot.id, uris);
        }}
        creatorUsername={spotCreatorUsername ?? undefined}
        creatorAvatarUrl={spotCreatorAvatarUrl ?? undefined}
        activeConditions={activeConditions}
        myConditions={myConditions}
        onToggleCondition={async (condition) => {
          if (!selectedSpot) return;
          const wasActive = myConditions.includes(condition);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await toggleCondition(selectedSpot.id, condition);
          if (wasActive) return;
          const username = await getMyUsername();
          if (condition === 'closed') {
            await sendSpotClosedNotification(selectedSpot.id, username, session?.user.id);
          } else if (selectedSpot.user_id !== session?.user.id) {
            await sendPushNotification(selectedSpot.id, 'condition', username, session?.user.id);
          }
        }}
        isWishlisted={selectedSpot ? isWishlisted(selectedSpot.id) : false}
        onToggleWishlist={async () => {
          if (!selectedSpot) return;
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const wasAlreadyWishlisted = isWishlisted(selectedSpot.id);
          await toggleWishlist(selectedSpot.id);
          if (selectedSpot.user_id !== session?.user.id && !wasAlreadyWishlisted) {
            const username = await getMyUsername();
            await sendPushNotification(selectedSpot.id, 'wishlist', username, session?.user.id);
          }
        }}
        detailsLoading={detailsLoading}
        isReviewFlaggedByMe={isReviewFlaggedByMe}
        onToggleReviewFlag={async (reviewId: string, reason?: string) => {
          await toggleReviewFlag(reviewId, reason);
        }}
        onViewProfile={(userId) => {
          if (userId === session?.user.id) {
            reopenSpotDetailsOnProfileCloseRef.current = true;
            setDetailsOpen(false);
            setTimeout(() => setProfileOpen(true), 350);
            return;
          }
          if (publicProfileOpen) return;
          reopenSpotDetailsOnProfileCloseRef.current = true;
          setDetailsOpen(false);
          setTimeout(() => {
            setPublicProfileUserId(userId);
            setPublicProfileOpen(true);
          }, 350);
        }}
        onConditionDone={() => {}}
        userLocation={
          userLocationRef.current
            ? {
              latitude: userLocationRef.current.latitude,
              longitude: userLocationRef.current.longitude,
            }
            : null
        }
        spotId={selectedSpot?.id ?? null}
        commentCount={commentCount}
        friendIds={friendIds}
        onUpdateSpot={async (spotId, name, description, tags, details) => {
          const err = await updateSpot(spotId, name, description, tags, true, details);
          if (!err) {
            const normalizedDesc = description.trim() || null;
            const normalizedDetails = details
              ? {
                address: details.address?.trim() || null,
                phone: details.phone?.trim() || null,
                website: details.website?.trim() || null,
                hours: details.hours?.trim() || null,
              }
              : null;
            setSelectedSpot((prev) =>
              prev && prev.id === spotId
                ? { ...prev, name, description: normalizedDesc, tags, ...(normalizedDetails ?? {}) }
                : prev
            );
            patchSpotLocal(spotId, {
              name,
              description: normalizedDesc,
              tags,
              ...(normalizedDetails ?? {}),
            });
            pendingSpotEditRef.current = { id: spotId, name, description: normalizedDesc, tags };
          }
          return err;
        }}
        creatorBadge={spotCreatorBadge}
        spotTrickLogs={spotTrickLogs}
        onLogTrickSubmit={async (trickName, loggedAt) => {
          if (!selectedSpot) return null;
          const err = await logTrick(selectedSpot.id, trickName, loggedAt);
          if (!err) await loadTrickLogsForSpot(selectedSpot.id);
          return err;
        }}
        onDeleteTrickLog={async (id) => {
          const err = await deleteTrickLog(id);
          if (!err && selectedSpot) await loadTrickLogsForSpot(selectedSpot.id);
          return err;
        }}
        onOpenTrickLog={() => {
          if (!selectedSpot) return;
          loadTrickLogsForSpot(selectedSpot.id);
        }}
      />

      <SkateShopDetailsModal
        visible={placeDetailsOpen}
        place={selectedPlace}
        onClose={() => {
          setPlaceDetailsOpen(false);
          setSelectedPlace(null);
          setSelectedPlaceId(null);
          openedFromFavoritesRef.current = false;
          closeDetailsModal();
        }}
        isFavorite={selectedPlace ? isPlaceFavorite(selectedPlace.id) : false}
        onToggleFavorite={async () => {
          if (!selectedPlace) return;
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await togglePlaceFavorite(selectedPlace);
        }}
        userLocation={
          userLocationRef.current
            ? {
              latitude: userLocationRef.current.latitude,
              longitude: userLocationRef.current.longitude,
            }
            : null
        }
        checkInState={selectedPlace ? getPlaceCheckInState(selectedPlace.id) : 'available'}
        checkingIn={placeCheckingIn}
        onCheckIn={async () => {
          if (!selectedPlace) return false;
          const res = await checkInPlace(selectedPlace);
          if (res.ok) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            toast.show('Checked in — added to your parks skated');
            return true;
          } else if (res.reason === 'cooldown') {
            toast.show('You checked in here recently');
          } else if (res.reason === 'auth') {
            toast.error('Sign in to check in');
          } else {
            toast.error('Couldn’t check in right now');
          }
          return false;
        }}
      />
      <SettingsPanel
        session={session}
        visible={settingsOpen}
        initialFeedbackPostId={pendingFeedbackPostId}
        onClose={() => {
          setSettingsOpen(false);
          setPendingFeedbackPostId(null);
        }}
        onSignOut={async () => {
          await signOut();
          setSettingsOpen(false);
          setPendingFeedbackPostId(null);
        }}
        onShowOnboarding={() => setShowOnboarding(true)}
      />
      {showOnboarding ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}>
          <OnboardingScreen onFinish={() => setShowOnboarding(false)} />
        </View>
      ) : null}
      <ProfileModal
        visible={profileOpen}
        onClose={() => {
          setProfileOpen(false);
          AsyncStorage.removeItem('pendingNotificationProfile');
          loadPendingRequests();
          if (reopenCrewDetailOnProfileCloseRef.current) {
            reopenCrewDetailOnProfileCloseRef.current = false;
            setTimeout(() => setCrewDetailOpen(true), 350);
          } else if (reopenSpotDetailsOnProfileCloseRef.current) {
            reopenSpotDetailsOnProfileCloseRef.current = false;
            setTimeout(() => setDetailsOpen(true), 350);
          }
        }}
        mySpots={mySpots}
        myReviews={myReviews}
        onLoadMyReviews={loadMyReviews}
        allSpots={spots}
        onSelectSpot={(s) => {
          setProfileOpen(false);
          reopenCrewDetailOnProfileCloseRef.current = false;
          setHighlightSpotId(s.id);
          highlightSpotIdRef.current = s.id;
          if (s.spot_type === 'skatepark' || s.spot_type === 'skateshop') {
            setPlacesWithAutoClear((prev) =>
              prev.some((p) => p.id === s.id)
                ? prev
                : [
                  ...prev,
                  {
                    id: s.id,
                    name: s.name,
                    type: s.spot_type as 'skatepark' | 'skateshop',
                    lat: s.lat,
                    lng: s.lng,
                    tags: {},
                  },
                ]
            );
            setTimeout(() => {
              animateToSpotWithModalOffset(s.lat, s.lng);
              openSpotDetails(s);
            }, 400);
          } else {
            animateToSpotWithModalOffset(s.lat, s.lng);
            openSpotDetails(s);
          }
        }}
        onSignOut={async () => {
          await signOut();
          setProfileOpen(false);
          reopenCrewDetailOnProfileCloseRef.current = false;
        }}
        onViewProfile={(userId) => {
          setProfileOpen(false);
          openedPublicProfileFromProfileRef.current = true;
          setTimeout(() => {
            setPublicProfileUserId(userId);
            setPublicProfileOpen(true);
          }, 350);
        }}
        trickLogs={trickLogs}
        trickLogsLoading={trickLoading}
        onDeleteTrickLog={async (id) => {
          const err = await deleteTrickLog(id);
          return err;
        }}
      />

      <PublicProfileModal
        visible={publicProfileOpen}
        onClose={() => {
          setPublicProfileOpen(false);
          setPublicProfileUserId(null);
          AsyncStorage.removeItem('pendingNotificationPublicProfile');
          if (openedPublicProfileFromProfileRef.current) {
            openedPublicProfileFromProfileRef.current = false;
            setTimeout(() => setProfileOpen(true), 350);
          } else if (reopenSpotDetailsOnProfileCloseRef.current) {
            reopenSpotDetailsOnProfileCloseRef.current = false;
            setTimeout(() => setDetailsOpen(true), 350);
          } else if (reopenCrewDetailOnProfileCloseRef.current) {
            reopenCrewDetailOnProfileCloseRef.current = false;
            setTimeout(() => setCrewDetailOpen(true), 350);
          }
        }}
        userId={publicProfileUserId}
        allSpots={spots}
        onSelectSpot={(s) => {
          setPublicProfileOpen(false);
          setPublicProfileUserId(null);
          openedPublicProfileFromProfileRef.current = false;
          reopenSpotDetailsOnProfileCloseRef.current = false;
          reopenCrewDetailOnProfileCloseRef.current = false;
          setHighlightSpotId(s.id);
          highlightSpotIdRef.current = s.id;
          animateToSpotWithModalOffset(s.lat, s.lng);
          openSpotDetails(s);
        }}
        onFriendshipChange={() => {
          loadFriends();
          loadPendingRequests();
        }}
      />
      <PaywallModal
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        headline={paywallHeadline}
      />
      <MapFilterSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filters={advFilters}
        onChange={setAdvFilters}
        resultCount={visibleSpots.length + visiblePlaces.length}
        loading={
          (advFilters.types.includes('skatepark') && parksLoading) ||
          (advFilters.types.includes('skateshop') && shopsLoading)
        }
      />
      <SkateCitiesModal
        visible={citiesOpen}
        onClose={() => setCitiesOpen(false)}
        onSelectCity={(city) => {
          requireAuth(async () => {
            setCitiesOpen(false);
            setPanelOpen(false);
            const region = {
              latitude: city.latitude,
              longitude: city.longitude,
              latitudeDelta: city.latitudeDelta,
              longitudeDelta: city.longitudeDelta,
            };
            mapRegionRef.current = region;
            mapRef.current?.animateToRegion(region, 800);
            setPlacesWithAutoClear(() => []);

            const spotsInCity = spots.filter(
              (s) =>
                s.spot_type === 'spot' &&
                Math.abs(s.lat - city.latitude) <= city.latitudeDelta &&
                Math.abs(s.lng - city.longitude) <= city.longitudeDelta
            );
            toast.show(
              spotsInCity.length === 0
                ? `No spots in ${city.name} yet — be the first to add one!`
                : `Exploring ${city.name}`
            );
          });
        }}
      />
      <CreateEventModal
        visible={createEventOpen}
        onClose={() => {
          setCreateEventOpen(false);
          if (editingEvent) {
            setTimeout(() => {
              setEventDetailsOpen(true);
            }, 350);
          }
          setEditingEvent(null);
        }}
        onSubmit={async (
          title,
          description,
          locationName,
          lat,
          lng,
          eventDate,
          visibility,
          spotId,
          inviteUserIds
        ) => {
          if (editingEvent) {
            const err = await updateEvent(
              editingEvent.id,
              title,
              description,
              locationName,
              lat,
              lng,
              eventDate,
              visibility,
              spotId ?? null
            );
            if (!err) {
              setSelectedEvent((prev) =>
                prev
                  ? {
                    ...prev,
                    title,
                    description,
                    location_name: locationName,
                    lat,
                    lng,
                    spot_id: spotId ?? null,
                    event_date: eventDate.toISOString(),
                  }
                  : prev
              );
              if (lat !== null && lng !== null) {
                setHighlightSpotId(null);
                highlightSpotIdRef.current = null;
                setTimeout(() => {
                  setPendingEventCoord({ lat, lng });
                  animateToSpotWithModalOffset(lat, lng);
                }, 500);
              }
            }
            return err;
          }

          const err = await createEvent(
            title,
            description,
            locationName,
            lat,
            lng,
            eventDate,
            visibility,
            spotId,
            inviteUserIds
          );

          if (!err) {
            setCreateEventOpen(false);
            // Defer map work until the modal (and its "Pick on map" MapView)
            // has fully unmounted — animating the main map while a second
            // MapView is tearing down crashes on the new architecture.
            setTimeout(() => {
              setPendingEventCoord({ lat, lng });
              animateToSpotWithModalOffset(lat, lng);
            }, 500);
            setTimeout(async () => {
              const fresh = await loadPublicEvents();
              await loadRsvpCounts(fresh.map((e) => e.id));
              loadInvitedEventIds();
              setPendingEventCoord(null);
            }, 3500);
          }
          return err;
        }}
        pendingCoord={pendingEventCoord}
        spots={spots}
        editEvent={editingEvent}
      />

      <EventDetailsModal
        visible={eventDetailsOpen}
        event={selectedEvent}
        currentUserId={session?.user.id ?? null}
        onClose={() => {
          setEventDetailsOpen(false);
          setSelectedEvent(null);
        }}
        onCancelEvent={async (eventId) => {
          const err = await cancelEvent(eventId);
          if (!err) {
            setEventDetailsOpen(false);
            setSelectedEvent(null);
            setPendingEventCoord(null);
          }
        }}
        onViewSpotDetails={() => {
          if (!selectedEvent?.spot_id) return;
          const spot = spots.find((s) => s.id === selectedEvent.spot_id);
          if (spot) {
            setEventDetailsOpen(false);
            setTimeout(() => {
              openedFromPanelRef.current = true;
              setHighlightSpotId(spot.id);
              highlightSpotIdRef.current = spot.id;
              animateToSpotWithModalOffset(spot.lat, spot.lng);
              openSpotDetails(spot);
            }, 350);
          }
        }}
        onLoadRsvps={loadEventRsvps}
        onUpsertRsvp={upsertRsvp}
        onDeleteRsvp={deleteRsvp}
        onEditEvent={() => {
          setEventDetailsOpen(false);
          setEditingEvent(selectedEvent);
          setTimeout(() => {
            setCreateEventOpen(true);
          }, 350);
        }}
        onViewProfile={(userId) => {
          setEventDetailsOpen(false);
          setSelectedEvent(null);
          setTimeout(() => {
            setPublicProfileUserId(userId);
            setPublicProfileOpen(true);
          }, 350);
        }}
      />
      <WhatsNewModal visible={showWhatsNew && splashDone} onClose={dismissWhatsNew} />
      <CrewsModal
        visible={crewsOpen}
        initialTab={crewsInitialTab}
        onClose={() => setCrewsOpen(false)}
        onSelectCrew={(id) => {
          setSelectedCrewId(id);
          setCrewsOpen(false);
          setTimeout(() => setCrewDetailOpen(true), 350);
        }}
        onCreatePress={() => {
          setEditingCrew(null);
          setCrewsOpen(false);
          setCrewReopenAfterCreate('crews');
          setTimeout(() => setCreateCrewOpen(true), 350);
        }}
      />
      <CrewDetailModal
        visible={crewDetailOpen}
        onClose={() => {
          setCrewDetailOpen(false);
          setSelectedCrewId(null);
          setTimeout(() => setCrewsOpen(true), 350);
        }}
        crewId={selectedCrewId}
        onEdit={(crew) => {
          setEditingCrew(crew);
          setCrewDetailOpen(false);
          setCrewReopenAfterCreate('detail');
          setTimeout(() => setCreateCrewOpen(true), 350);
        }}
        onSelectSpot={(spot) => {
          setCrewDetailOpen(false);
          setCrewsOpen(false);
          setSelectedCrewId(null);
          animateToSpotWithModalOffset(spot.lat, spot.lng);
          openSpotDetails(spot);
        }}
        onSelectMember={(userId) => {
          if (publicProfileOpen || profileOpen) return;
          reopenCrewDetailOnProfileCloseRef.current = true;
          setCrewDetailOpen(false);
          if (userId === session?.user.id) {
            setTimeout(() => setProfileOpen(true), 350);
          } else {
            setTimeout(() => {
              setPublicProfileUserId(userId);
              setPublicProfileOpen(true);
            }, 350);
          }
        }}
      />
      <CreateCrewModal
        visible={createCrewOpen}
        onClose={() => {
          setCreateCrewOpen(false);
          const reopen = crewReopenAfterCreate;
          setCrewReopenAfterCreate(null);
          if (reopen === 'crews') {
            setTimeout(() => setCrewsOpen(true), 350);
          } else if (reopen === 'detail') {
            setTimeout(() => setCrewDetailOpen(true), 350);
          }
        }}
        editCrew={editingCrew}
        onSubmit={async ({ name, description, isPublic, imageUri }) => {
          if (editingCrew) {
            let avatarUrl = editingCrew.avatar_url;
            if (imageUri) {
              const up = await uploadCrewAvatar(editingCrew.id, imageUri);
              if (up.error) return up.error;
              avatarUrl = up.url;
            }
            return updateCrew(editingCrew.id, {
              name,
              description: description ?? null,
              is_public: isPublic,
              avatar_url: avatarUrl,
            });
          }
          const res = await createCrew({ name, description, isPublic });
          if (res.error || !res.id) return res.error;
          if (imageUri) {
            const up = await uploadCrewAvatar(res.id, imageUri);
            if (up.error) return up.error;
            await updateCrew(res.id, { avatar_url: up.url });
          }
          return null;
        }}
      />
    </View>
  );
}
