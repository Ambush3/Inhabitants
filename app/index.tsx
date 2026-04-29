import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
    Text,
    View,
    Button,
    ScrollView,
    Platform,
    Alert,
    Pressable,
    Animated,
    Easing,
    ActionSheetIOS,
} from 'react-native';
import MapView, {
    Marker,
    Region,
    LongPressEvent,
    MapMarker,
} from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as ExpoSplashScreen from 'expo-splash-screen';
import {
    useLocalSearchParams,
    useFocusEffect,
    usePathname,
    router,
} from 'expo-router';
import SplashScreen from '../src/components/SplashScreen';

import { supabase } from '@/src/libs/supabase';

import { SkateMarker } from '@/src/components/SkateMarker';
import { CreateSpotModal } from '@/src/components/CreateSpotModal';
import { SpotDetailsModal } from '@/src/components/SpotDetailsModal';
import { SkateShopDetailsModal } from '@/src/components/SkateShopDetailsModal';
import { ExplorePanel } from '@/src/components/ExplorePanel';
import { SettingsPanel } from '@/src/components/SettingsPanel';
import { OnboardingScreen } from '@/src/components/onboarding/OnboardingScreen';
import { ProfileModal } from '@/src/components/profile/ProfileModal';
import { PublicProfileModal } from '@/src/components/profile/PublicProfileModal';
import { MySpotMarker } from '@/src/components/SpotMarkers/MySpotMarker';
import { OtherUsersSpotMarkers } from '@/src/components/SpotMarkers/OtherUsersSpotMarkers';

import { useSpots } from '@/src/hooks/useSpots';
import { useReviews } from '@/src/hooks/useReviews';
import { useSpotImages } from '@/src/hooks/useSpotImages';
import { useSpotConditions } from '@/src/hooks/useSpotConditions';
import { useNearbyPlaces } from '@/src/hooks/useNearbyPlaces';
import { useTopRated } from '@/src/hooks/useTopRated';
import { useAuth } from '@/src/hooks/useAuth';
import { useFavorites } from '@/src/hooks/useFavorites';
import { usePlaceFavorites } from '@/src/hooks/usePlaceFavorites';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import { sendPushNotification } from '@/src/libs/sendPushNotification';
import { useSpotFlags } from '@/src/hooks/flaggingSystem/useSpotFlags';
import { useReviewFlags } from '@/src/hooks/flaggingSystem/useReviewFlags';

import { useTheme } from '@/src/context/ThemeContext';

import { Ionicons } from '@expo/vector-icons';
import { Place, Spot } from '@/src/types';
import { useWishlist } from '@/src/hooks/useWishlist';
import { useFriendships } from '@/src/hooks/social/useFriendships';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useSocialFeed } from '@/src/hooks/useSocialFeed';
import { SpotVisibility, spotVisibility } from '@/src/hooks/useSpots';
import AsyncStorage from '@react-native-async-storage/async-storage';

ExpoSplashScreen.preventAutoHideAsync();

const DEFAULT_REGION: Region = {
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
};

export default function Index() {
    const mapRef = useRef<MapView | null>(null);
    const mapRegionRef = useRef<Region>(DEFAULT_REGION);
    const userLocationRef = useRef<Region | null>(null);
    const preModalRegionRef = useRef<Region>(DEFAULT_REGION);

    const autoCenterRef = useRef(true);
    const markerRefs = useRef<Record<string, MapMarker | null>>({});

    const placesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const highlightSpotIdRef = useRef<string | null>(null);

    const pendingDeepLinkRef = useRef<string | null>(null);
    const hasOpenedDeepLinkRef = useRef(false);
    const openedFromDeepLinkRef = useRef(false);
    const hasNavigatedFromNotification = useRef(false);
    const openedFromFavoritesRef = useRef(false);

    const suppressMapPressRef = useRef(false);
    const actionSheetOpenRef = useRef(false);

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

    const { signOut, session } = useAuth();
    const {
        favorites,
        loading: favLoading,
        loadFavorites,
        toggleFavorite,
        isFavorite,
    } = useFavorites();
    const {
        wishlist,
        wishlistLoading,
        loadWishlist,
        toggleWishlist,
        isWishlisted,
    } = useWishlist();
    const {
        places,
        setPlaces,
        parksLoading,
        shopsLoading,
        error: nearbyError,
        loadNearbySkateParks,
        loadNearbySkateShops,
        fetchPlaceById,
    } = useNearbyPlaces();
    const {
        topRated,
        topLoading,
        error: topRatedError,
        loadTopRatedSpotsInArea,
        clearTopRated,
    } = useTopRated();

    const [createSpotVisibility, setCreateSpotVisibility] =
        useState<SpotVisibility>('public');

    const {
        placeFavorites,
        placeFavLoading,
        loadPlaceFavorites,
        togglePlaceFavorite,
        isPlaceFavorite,
    } = usePlaceFavorites();
    const {
        images,
        uploading: imagesUploading,
        loadImages,
        uploadImages,
        deleteImage,
        clearImages,
    } = useSpotImages();
    const {
        activeConditions,
        myConditions,
        loadConditions,
        toggleCondition,
        resetConditions,
    } = useSpotConditions();

    const { pendingReceived, loadPendingRequests, friends, loadFriends } =
        useFriendships();
    const friendIds = new Set(friends.map((f) => f.id));
    const {
        items: feedItems,
        loading: feedLoading,
        loadFeed,
    } = useSocialFeed();
    const {
        notifications: activityNotifications,
        unreadCount: unreadActivityCount,
        loadNotifications,
        markAsRead,
        markAllAsRead,
    } = useNotifications();

    const { flaggedSpotIds, loadFlags, toggleFlag, isFlaggedByMe } =
        useSpotFlags(session?.user.id ?? null);
    const {
        flaggedReviewIds,
        loadReviewFlags,
        toggleReviewFlag,
        isReviewFlaggedByMe,
    } = useReviewFlags(session?.user.id ?? null);

    const [pendingImages, setPendingImages] = useState<string[]>([]);

    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [placeDetailsOpen, setPlaceDetailsOpen] = useState(false);

    const [panelOpen, setPanelOpen] = useState(false);

    const [highlightSpotId, setHighlightSpotId] = useState<string | null>(null);

    const [useDeviceLocation, setUseDeviceLocation] = useState(true);
    const [locationReady, setLocationReady] = useState(false);

    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

    const [spotRating, setSpotRating] = useState(0);
    const [spotComment, setSpotComment] = useState('');

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [pendingCoord, setPendingCoord] = useState<{
        lat: number;
        lng: number;
    } | null>(null);

    const [spotName, setSpotName] = useState('');
    const [spotDesc, setSpotDesc] = useState('');
    const [spotTags, setSpotTags] = useState<string[]>([]);

    const [spotCreatorUsername, setSpotCreatorUsername] = useState<
        string | null
    >(null);

    const [spotCreatorAvatarUrl, setSpotCreatorAvatarUrl] = useState<
        string | null
    >(null);

    const [settingsOpen, setSettingsOpen] = useState(false);

    const [refreshing, setRefreshing] = useState(false);

    const [showOnboarding, setShowOnboarding] = useState(false);

    const [spotType, setSpotType] = useState<
        'spot' | 'skatepark' | 'skateshop'
    >('spot');

    const [detailsLoading, setDetailsLoading] = useState(false);

    const [profileOpen, setProfileOpen] = useState(false);

    const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

    const [publicProfileUserId, setPublicProfileUserId] = useState<
        string | null
    >(null);
    const [publicProfileOpen, setPublicProfileOpen] = useState(false);

    const { theme, loadThemeForUser, resetTheme } = useTheme();
    const c = theme.colors;

    const insets = useSafeAreaInsets();

    const pathname = usePathname();

    const {
        spots,
        mySpots,
        mySpotsLoading,
        error,
        setError,
        reload,
        loadMySpots,
        createSpotAt,
        deleteSpotById,
        searchResults,
        searchByTag,
        clearSearch,
        setSpotVisibility,
    } = useSpots();
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

    const [initialRegion, setInitialRegion] = useState<Region>(
        deepLinkRegion ?? DEFAULT_REGION
    );

    const [showSplash, setShowSplash] = useState(!deepLinkSpotId);

    const visibleSpots = searchResults.length > 0 ? searchResults : spots;
    const displayError = error ?? nearbyError ?? topRatedError;
    const openedFromPanelRef = useRef(false);

    const spinAnim = useRef(new Animated.Value(0)).current;

    function closeCreateModal() {
        setCreateOpen(false);
        setPendingCoord(null);
        setSpotTags([]);
        setPendingImages([]);
        setCreateSpotVisibility('public');
        setSpotComment('');
        setSpotType('spot');
    }

    function closeDetailsModal() {
        const idToHide = highlightSpotIdRef.current;

        setDetailsOpen(false);
        setSelectedSpot(null);
        resetReviews();
        setSpotCreatorUsername(null);
        setSpotCreatorAvatarUrl(null);

        if (!openedFromPanelRef.current) {
            mapRef.current?.animateToRegion(preModalRegionRef.current, 400);
        }
        openedFromPanelRef.current = false;
        resetConditions();

        if (idToHide) {
            setTimeout(() => {
                markerRefs.current[idToHide]?.hideCallout?.();
            }, 100);
            if (openedFromDeepLinkRef.current) {
                setPlaces([]);
            }
            openedFromDeepLinkRef.current = false;
        } else {
            console.log('idToHide was null, skipping places clear');
        }

        highlightSpotIdRef.current = null;
        setHighlightSpotId(null);
    }

    function setPlacesWithAutoClear(updater: (prev: Place[]) => Place[]) {
        if (placesTimerRef.current) clearTimeout(placesTimerRef.current);
        setPlaces(updater);
        placesTimerRef.current = setTimeout(() => {
            setPlaces([]);
        }, 120000);
    }

    function animateToSpotWithModalOffset(lat: number, lng: number) {
        preModalRegionRef.current = mapRegionRef.current;

        const MODAL_HEIGHT_RATIO = 0.4;
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
    }

    async function openSpotDetails(spot: Spot) {
        setSelectedSpot(spot);
        setDetailsOpen(true);
        setDetailsLoading(true);
        resetReviews();
        clearImages();

        const [profileResult] = await Promise.all([
            supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', spot.user_id)
                .single(),
            loadReviews(spot.id),
            loadImages(spot.id),
            loadConditions(spot.id),
        ]);

        setSpotCreatorUsername(profileResult.data?.username ?? null);
        setSpotCreatorAvatarUrl(profileResult.data?.avatar_url ?? null);
        setDetailsLoading(false);
    }

    async function onRefresh() {
        setRefreshing(true);
        await Promise.all([
            reload(),
            loadMySpots(),
            loadFavorites(),
            loadPlaceFavorites(),
        ]);
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
        Alert.alert('Delete spot?', spot.name, [
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
        setCreateOpen(true);
    }

    usePushNotifications(
        session?.user.id ?? null,
        session,
        (spotId, lat, lng) => {
            const spot = spots.find((s) => s.id === spotId);
            if (spot) {
                animateToSpotWithModalOffset(lat, lng);
                openSpotDetails(spot);
            }
        },
        () => setProfileOpen(true),
        (actorId) => {
            setPublicProfileUserId(actorId);
            setPublicProfileOpen(true);
        }
    );

    useEffect(() => {
        reload();
        loadFavorites();
        loadPlaceFavorites();
        loadMySpots();
        loadWishlist();
        loadFlags();
        loadReviewFlags();
        loadPendingRequests();
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

            const { status } =
                await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Location permission denied.');
                setUseDeviceLocation(false);
                setLocationReady(true);
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
                    setError(
                        'Could not determine your location. Showing default view.'
                    );
                    setUseDeviceLocation(false);
                    setLocationReady(true);
                    return;
                }
            }

            if (!autoCenterRef.current) {
                setUseDeviceLocation(false);
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
            setLocationReady(true);
            setUseDeviceLocation(false);
        })();
    }, [useDeviceLocation]);

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
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'spots' },
                refresh
            )
            .subscribe();
        const reviewsCh = supabase
            .channel(`feed-reviews-${session.user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'reviews' },
                refresh
            )
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
                .select('avatar_url')
                .eq('id', session.user.id)
                .single()
                .then(({ data }) => setMyAvatarUrl(data?.avatar_url ?? null));
        } else {
            resetTheme();
            setMyAvatarUrl(null);
        }
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
        if (!pendingDeepLinkRef.current || !spots.length || !locationReady)
            return;
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
    }, [spots, locationReady]);

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

        AsyncStorage.getItem('pendingNotificationProfile').then((val) => {
            if (!val) return;
            setProfileOpen(true);
        });

        AsyncStorage.getItem('pendingNotificationPublicProfile').then(
            (actorId) => {
                if (!actorId) return;
                setPublicProfileUserId(actorId);
                setPublicProfileOpen(true);
            }
        );
    }, [session]);

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

    if (Platform.OS === 'web') {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }}>
                {/*<View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>*/}
                {/*    <Button title={loading ? 'Loading…' : 'Reload'} onPress={reload} />*/}
                {/*</View>*/}

                {displayError ? (
                    <Text style={{ color: 'red', marginBottom: 12 }}>
                        {displayError}
                    </Text>
                ) : null}
                <Text style={{ marginBottom: 12 }}>
                    Map is native-only for now. Web shows a list fallback.
                </Text>

                <ScrollView>
                    {visibleSpots.map((s) => (
                        <View
                            key={s.id}
                            style={{
                                paddingVertical: 10,
                                borderBottomWidth: 1,
                                borderColor: '#ddd',
                            }}
                        >
                            <Text style={{ fontWeight: '600' }}>{s.name}</Text>
                            {s.description ? (
                                <Text>{s.description}</Text>
                            ) : null}
                            <Text>
                                {s.lat}, {s.lng}
                            </Text>
                            <View
                                style={{
                                    marginTop: 8,
                                    alignSelf: 'flex-start',
                                }}
                            >
                                <Button
                                    title="Delete"
                                    onPress={() => confirmDelete(s)}
                                />
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <>
            {showSplash ? (
                <SplashScreen onFinish={() => setShowSplash(false)} />
            ) : (
                <View style={{ flex: 1, backgroundColor: c.headerBg }}>
                    <View
                        style={{
                            height: insets.top,
                            backgroundColor: c.headerBg,
                        }}
                    />

                    {displayError ? (
                        <Text
                            style={{
                                color: 'red',
                                paddingHorizontal: 12,
                                paddingTop: 8,
                            }}
                        >
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
                            backgroundColor: c.headerBg,
                        }}
                    >
                        <Pressable
                            onPress={() => setPanelOpen(true)}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="menu" size={24} color={c.text} />
                            {pendingReceived.length + unreadActivityCount >
                            0 ? (
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
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: 'white',
                                            fontSize: 11,
                                            fontWeight: '700',
                                        }}
                                    >
                                        {pendingReceived.length +
                                            unreadActivityCount}
                                    </Text>
                                </View>
                            ) : null}
                        </Pressable>
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: '600',
                                color: c.text,
                            }}
                        >
                            Spots
                        </Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            <Pressable
                                onPress={onRefresh}
                                style={{ padding: 8 }}
                                disabled={refreshing}
                            >
                                <Animated.View
                                    style={{
                                        transform: [
                                            {
                                                rotate: spinAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [
                                                        '0deg',
                                                        '360deg',
                                                    ],
                                                }),
                                            },
                                        ],
                                    }}
                                >
                                    <Ionicons
                                        name="refresh"
                                        size={20}
                                        color={refreshing ? '#007AFF' : c.text}
                                    />
                                </Animated.View>
                            </Pressable>
                            <Pressable
                                onPress={() => setSettingsOpen(true)}
                                style={{ padding: 8 }}
                            >
                                <Ionicons
                                    name="settings-outline"
                                    size={24}
                                    color={c.text}
                                />
                            </Pressable>
                        </View>
                    </View>

                    <ExplorePanel
                        visible={panelOpen}
                        pendingFriendRequestsCount={pendingReceived.length}
                        feedItems={feedItems}
                        feedLoading={feedLoading}
                        onSelectFeedSpot={(s) => {
                            setPanelOpen(false);
                            setHighlightSpotId(s.id);
                            highlightSpotIdRef.current = s.id;
                            if (
                                s.spot_type === 'skatepark' ||
                                s.spot_type === 'skateshop'
                            ) {
                                setPlacesWithAutoClear((prev) =>
                                    prev.some((p) => p.id === s.id)
                                        ? prev
                                        : [
                                              ...prev,
                                              {
                                                  id: s.id,
                                                  name: s.name,
                                                  type: s.spot_type as
                                                      | 'skatepark'
                                                      | 'skateshop',
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
                            const spot = n.spot_id
                                ? spots.find((s) => s.id === n.spot_id)
                                : null;
                            if (spot) {
                                setPanelOpen(false);
                                setHighlightSpotId(spot.id);
                                highlightSpotIdRef.current = spot.id;
                                animateToSpotWithModalOffset(
                                    spot.lat,
                                    spot.lng
                                );
                                openSpotDetails(spot);
                            }
                        }}
                        onClose={() => {
                            setPanelOpen(false);
                            reload();
                            loadMySpots();
                        }}
                        onOpenSettings={() => {
                            setPanelOpen(false);
                            reload();
                            loadMySpots();
                            setSettingsOpen(true);
                        }}
                        parksLoading={parksLoading}
                        shopsLoading={shopsLoading}
                        topLoading={topLoading}
                        topRated={topRated}
                        mySpots={mySpots}
                        mySpotsLoading={mySpotsLoading}
                        onLoadSkateparks={() => {
                            setPanelOpen(false);
                            const communityParks = spots
                                .filter((s) => s.spot_type === 'skatepark')
                                .map((s) => ({
                                    id: s.id,
                                    name: s.name,
                                    type: 'skatepark' as const,
                                    lat: s.lat,
                                    lng: s.lng,
                                    tags: {},
                                }));
                            loadNearbySkateParks(
                                mapRegionRef.current.latitude,
                                mapRegionRef.current.longitude,
                                20000,
                                undefined,
                                (googleParks) => {
                                    setPlaces([
                                        ...communityParks,
                                        ...googleParks,
                                    ]);
                                }
                            );
                        }}
                        onOpenProfile={() => {
                            setPanelOpen(false);
                            setProfileOpen(true);
                        }}
                        onLoadSkateShops={() => {
                            setPanelOpen(false);
                            const communityShops = spots
                                .filter((s) => s.spot_type === 'skateshop')
                                .map((s) => ({
                                    id: s.id,
                                    name: s.name,
                                    type: 'skateshop' as const,
                                    lat: s.lat,
                                    lng: s.lng,
                                    tags: {},
                                }));
                            loadNearbySkateShops(
                                mapRegionRef.current.latitude,
                                mapRegionRef.current.longitude,
                                20000,
                                undefined,
                                (googleShops) => {
                                    setPlaces([
                                        ...communityShops,
                                        ...googleShops,
                                    ]);
                                }
                            );
                        }}
                        onLoadTopRated={async () => {
                            const topSpot = await loadTopRatedSpotsInArea(
                                mapRegionRef.current,
                                10
                            );
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
                        }}
                        onSelectSpot={(s) => {
                            if (actionSheetOpenRef.current) return;
                            setPanelOpen(false);
                            if (
                                s.spot_type === 'skatepark' ||
                                s.spot_type === 'skateshop'
                            ) {
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
                                                  type: s.spot_type as
                                                      | 'skatepark'
                                                      | 'skateshop',
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
                        searchResults={searchResults}
                        onSearch={(tag) => searchByTag(tag)}
                        onClearSearch={clearSearch}
                        hasSearchResults={searchResults.length > 0}
                        favorites={favorites}
                        favLoading={favLoading}
                        placeFavorites={placeFavorites}
                        placeFavLoading={placeFavLoading}
                        onSelectPlace={async (p) => {
                            setPanelOpen(false);
                            openedFromFavoritesRef.current = true;
                            setSelectedPlaceId(p.id);
                            mapRef.current?.animateToRegion(
                                {
                                    latitude: p.lat,
                                    longitude: p.lng,
                                    latitudeDelta: 0.03,
                                    longitudeDelta: 0.03,
                                },
                                600
                            );
                            const full = await fetchPlaceById(p.id);
                            const resolved = full ?? p;
                            setSelectedPlace(resolved);
                            setPlaceDetailsOpen(true);
                            setPlacesWithAutoClear((prev) =>
                                prev.some((x) => x.id === resolved.id)
                                    ? prev
                                    : [...prev, resolved]
                            );
                            setTimeout(() => {
                                markerRefs.current[p.id]?.showCallout();
                            }, 650);
                        }}
                        wishlist={wishlist}
                        wishlistLoading={wishlistLoading}
                        onCycleSpotVisibility={async (spot) => {
                            if (actionSheetOpenRef.current) return;
                            actionSheetOpenRef.current = true;
                            await Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light
                            );
                            const current = spotVisibility(spot);
                            const options: SpotVisibility[] = [
                                'public',
                                'friends',
                                'private',
                            ];
                            const labels = [
                                'Public',
                                'Friends',
                                'Private',
                                'Cancel',
                            ];
                            ActionSheetIOS.showActionSheetWithOptions(
                                {
                                    title: 'Visibility',
                                    options: labels,
                                    cancelButtonIndex: 3,
                                },
                                async (idx) => {
                                    actionSheetOpenRef.current = false;
                                    if (idx === 3) return;
                                    const picked = options[idx];
                                    if (picked === current) return;
                                    await setSpotVisibility(spot, picked);
                                    await loadMySpots();
                                }
                            );
                        }}
                        onDeleteSpot={async (spot) => {
                            await Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Heavy
                            );
                            deleteSpotById(spot.id, async () => {
                                await loadMySpots();
                                setPlaces((prev) =>
                                    prev.filter((p) => p.id !== spot.id)
                                );
                            });
                        }}
                    />

                    {locationReady ? (
                        <MapView
                            ref={mapRef}
                            style={{ flex: 1, marginBottom: -34 }}
                            initialRegion={initialRegion}
                            onPress={() => {
                                if (suppressMapPressRef.current) {
                                    suppressMapPressRef.current = false;
                                    return;
                                }
                                setHighlightSpotId(null);
                                setSelectedPlaceId(null);
                                markerRefs.current[
                                    highlightSpotId ?? ''
                                ]?.hideCallout?.();
                                markerRefs.current[
                                    selectedPlaceId ?? ''
                                ]?.hideCallout?.();
                            }}
                            onPanDrag={() => {
                                autoCenterRef.current = false;
                            }}
                            onRegionChangeComplete={(r) => {
                                mapRegionRef.current = r;
                            }}
                            showsUserLocation
                            showsMyLocationButton
                            followsUserLocation={false}
                            onLongPress={onLongPress}
                        >
                            {pendingCoord ? (
                                <Marker
                                    key="pending"
                                    coordinate={{
                                        latitude: pendingCoord.lat,
                                        longitude: pendingCoord.lng,
                                    }}
                                    title="New spot"
                                    pinColor="orange"
                                />
                            ) : null}
                            {visibleSpots
                                .filter(
                                    (s) =>
                                        s.spot_type === 'spot' ||
                                        s.id === highlightSpotId
                                )
                                .map((s) =>
                                    s.spot_type === 'spot' ? (
                                        s.user_id === session?.user.id ? (
                                            <Marker
                                                ref={(ref) => {
                                                    markerRefs.current[s.id] =
                                                        ref;
                                                }}
                                                key={`${s.id}-${s.id === highlightSpotId}`}
                                                coordinate={{
                                                    latitude: s.lat,
                                                    longitude: s.lng,
                                                }}
                                                tracksViewChanges={
                                                    s.id === highlightSpotId
                                                }
                                                anchor={{ x: 0.5, y: 0.5 }}
                                                onPress={() => {
                                                    suppressMapPressRef.current = true;
                                                    setHighlightSpotId(s.id);
                                                    highlightSpotIdRef.current =
                                                        s.id;
                                                    animateToSpotWithModalOffset(
                                                        s.lat,
                                                        s.lng
                                                    );
                                                    openSpotDetails(s);
                                                }}
                                            >
                                                <MySpotMarker
                                                    selected={
                                                        s.id === highlightSpotId
                                                    }
                                                />
                                            </Marker>
                                        ) : (
                                            <Marker
                                                ref={(ref) => {
                                                    markerRefs.current[s.id] =
                                                        ref;
                                                }}
                                                key={`${s.id}-${s.id === highlightSpotId}`}
                                                coordinate={{
                                                    latitude: s.lat,
                                                    longitude: s.lng,
                                                }}
                                                tracksViewChanges={
                                                    s.id === highlightSpotId
                                                }
                                                anchor={{ x: 0.5, y: 0.5 }}
                                                onPress={() => {
                                                    suppressMapPressRef.current = true;
                                                    setHighlightSpotId(s.id);
                                                    highlightSpotIdRef.current =
                                                        s.id;
                                                    animateToSpotWithModalOffset(
                                                        s.lat,
                                                        s.lng
                                                    );
                                                    openSpotDetails(s);
                                                }}
                                            >
                                                <OtherUsersSpotMarkers
                                                    selected={
                                                        s.id === highlightSpotId
                                                    }
                                                    isFriend={
                                                        s.user_id
                                                            ? friendIds.has(
                                                                  s.user_id
                                                              )
                                                            : false
                                                    }
                                                />
                                            </Marker>
                                        )
                                    ) : (
                                        <SkateMarker
                                            ref={(ref) => {
                                                markerRefs.current[s.id] = ref;
                                            }}
                                            key={`${s.id}-${s.id === highlightSpotId}`}
                                            id={s.id}
                                            lat={s.lat}
                                            lng={s.lng}
                                            name={s.name}
                                            type={
                                                s.spot_type as
                                                    | 'skatepark'
                                                    | 'skateshop'
                                            }
                                            selected={s.id === highlightSpotId}
                                            onPress={() => {
                                                suppressMapPressRef.current = true;
                                                setHighlightSpotId(s.id);
                                                highlightSpotIdRef.current =
                                                    s.id;
                                                animateToSpotWithModalOffset(
                                                    s.lat,
                                                    s.lng
                                                );
                                                openSpotDetails(s);
                                            }}
                                        />
                                    )
                                )}
                            {places.map((p) => (
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
                                    onPress={() => {
                                        suppressMapPressRef.current = true;
                                        const communitySpot = spots.find(
                                            (s) => s.id === p.id
                                        );
                                        if (communitySpot) {
                                            setHighlightSpotId(
                                                communitySpot.id
                                            );
                                            highlightSpotIdRef.current =
                                                communitySpot.id;
                                            animateToSpotWithModalOffset(
                                                communitySpot.lat,
                                                communitySpot.lng
                                            );
                                            openSpotDetails(communitySpot);
                                        } else {
                                            openedFromFavoritesRef.current = false;
                                            setSelectedPlaceId(p.id);
                                            animateToSpotWithModalOffset(
                                                p.lat,
                                                p.lng
                                            );
                                            setSelectedPlace(p);
                                            setPlaceDetailsOpen(true);
                                            setTimeout(() => {
                                                markerRefs.current[
                                                    p.id
                                                ]?.showCallout();
                                            }, 300);
                                        }
                                    }}
                                />
                            ))}
                        </MapView>
                    ) : (
                        <View
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text style={{ color: c.text }}>
                                Finding your location...
                            </Text>
                        </View>
                    )}
                    <Pressable
                        onPress={() => {
                            autoCenterRef.current = true;
                            if (userLocationRef.current) {
                                mapRef.current?.animateToRegion(
                                    userLocationRef.current,
                                    600
                                );
                            } else {
                                setUseDeviceLocation(true);
                            }
                        }}
                        style={{
                            position: 'absolute',
                            bottom: 50,
                            right: 16,
                            backgroundColor: c.surface,
                            borderRadius: 30,
                            padding: 12,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 4,
                        }}
                    >
                        <Ionicons name="navigate" size={22} color="#007AFF" />
                    </Pressable>

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
                        onAddTag={(tag) =>
                            setSpotTags((prev) =>
                                prev.includes(tag) ? prev : [...prev, tag]
                            )
                        }
                        onRemoveTag={(tag) =>
                            setSpotTags((prev) => prev.filter((t) => t !== tag))
                        }
                        onCancel={closeCreateModal}
                        visibility={createSpotVisibility}
                        onChangeVisibility={setCreateSpotVisibility}
                        onCreate={async () => {
                            if (!pendingCoord) return;
                            const newSpot = await createSpotAt(
                                pendingCoord.lat,
                                pendingCoord.lng,
                                spotName,
                                spotDesc,
                                spotRating,
                                spotTags,
                                createSpotVisibility,
                                spotType
                            );
                            if (newSpot) {
                                await Haptics.notificationAsync(
                                    Haptics.NotificationFeedbackType.Success
                                );
                                if (pendingImages.length > 0) {
                                    await uploadImages(
                                        newSpot.id,
                                        pendingImages
                                    );
                                }
                                if (spotRating > 0) {
                                    await submitReview(
                                        newSpot.id,
                                        spotRating,
                                        spotComment
                                    );
                                }
                                await loadMySpots();

                                if (
                                    newSpot.spot_type === 'skatepark' ||
                                    newSpot.spot_type === 'skateshop'
                                ) {
                                    setPlacesWithAutoClear((prev) => [
                                        ...prev,
                                        {
                                            id: newSpot.id,
                                            name: newSpot.name,
                                            type: newSpot.spot_type as
                                                | 'skatepark'
                                                | 'skateshop',
                                            lat: newSpot.lat,
                                            lng: newSpot.lng,
                                            tags: {},
                                        },
                                    ]);
                                    setTimeout(() => {
                                        setPlacesWithAutoClear((prev) =>
                                            prev.filter(
                                                (p) => p.id !== newSpot.id
                                            )
                                        );
                                    }, 4000);
                                }
                            }
                            closeCreateModal();
                        }}
                        pendingImages={pendingImages}
                        onAddImage={(uri) =>
                            setPendingImages((prev) =>
                                prev.includes(uri) ? prev : [...prev, uri]
                            )
                        }
                        onRemoveImage={(uri) =>
                            setPendingImages((prev) =>
                                prev.filter((u) => u !== uri)
                            )
                        }
                        spotType={spotType}
                        onChangeSpotType={(v) => {
                            setSpotType(v);
                            if (v !== 'spot') setCreateSpotVisibility('public');
                        }}
                    />

                    {/* Details Modal */}
                    <SpotDetailsModal
                        visible={detailsOpen}
                        spot={selectedSpot}
                        isFlaggedByMe={
                            selectedSpot
                                ? isFlaggedByMe(selectedSpot.id)
                                : false
                        }
                        flagCount={selectedSpot?.flag_count ?? 0}
                        onToggleFlag={async () => {
                            if (!selectedSpot) return;
                            await toggleFlag(selectedSpot.id);
                        }}
                        reviews={spotReviews}
                        existingReviewId={existingReviewId}
                        avgRating={avgRating}
                        newRating={newReviewRating}
                        newComment={newReviewComment}
                        onChangeRating={setNewReviewRating}
                        onChangeComment={setNewReviewComment}
                        onSubmitReview={async () => {
                            if (!selectedSpot) return;
                            setError(null);
                            const err = await submitReview(selectedSpot.id);
                            if (err) {
                                setError(err);
                                await Haptics.notificationAsync(
                                    Haptics.NotificationFeedbackType.Error
                                );
                            } else {
                                await Haptics.notificationAsync(
                                    Haptics.NotificationFeedbackType.Success
                                );
                                if (selectedSpot.user_id !== session?.user.id) {
                                    const username = await getMyUsername();
                                    await sendPushNotification(
                                        selectedSpot.id,
                                        'review',
                                        username,
                                        session?.user.id
                                    );
                                }
                            }
                        }}
                        onClose={closeDetailsModal}
                        currentUserId={session?.user.id ?? null}
                        onDelete={confirmDelete}
                        isFavorite={
                            selectedSpot ? isFavorite(selectedSpot.id) : false
                        }
                        onToggleFavorite={async () => {
                            if (!selectedSpot) return;
                            await Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light
                            );
                            const wasAlreadyFavorited = isFavorite(
                                selectedSpot.id
                            );
                            await toggleFavorite(selectedSpot.id);
                            if (
                                selectedSpot.user_id !== session?.user.id &&
                                !wasAlreadyFavorited
                            ) {
                                const username = await getMyUsername();
                                await sendPushNotification(
                                    selectedSpot.id,
                                    'favorite',
                                    username,
                                    session?.user.id
                                );
                            }
                        }}
                        onDeleteReview={async (reviewId) => {
                            if (!selectedSpot) return;
                            const err = await deleteReview(
                                reviewId,
                                selectedSpot.id
                            );
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
                            await Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light
                            );
                            await toggleCondition(selectedSpot.id, condition);
                            if (selectedSpot.user_id !== session?.user.id) {
                                const username = await getMyUsername();
                                await sendPushNotification(
                                    selectedSpot.id,
                                    'condition',
                                    username,
                                    session?.user.id
                                );
                            }
                        }}
                        isWishlisted={
                            selectedSpot ? isWishlisted(selectedSpot.id) : false
                        }
                        onToggleWishlist={async () => {
                            if (!selectedSpot) return;
                            await Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light
                            );
                            const wasAlreadyWishlisted = isWishlisted(
                                selectedSpot.id
                            );
                            await toggleWishlist(selectedSpot.id);
                            if (
                                selectedSpot.user_id !== session?.user.id &&
                                !wasAlreadyWishlisted
                            ) {
                                const username = await getMyUsername();
                                await sendPushNotification(
                                    selectedSpot.id,
                                    'wishlist',
                                    username,
                                    session?.user.id
                                );
                            }
                        }}
                        detailsLoading={detailsLoading}
                        isReviewFlaggedByMe={isReviewFlaggedByMe}
                        onToggleReviewFlag={async (
                            reviewId: string,
                            reason?: string
                        ) => {
                            await toggleReviewFlag(reviewId, reason);
                        }}
                        onViewProfile={(userId) => {
                            if (publicProfileOpen) return;
                            closeDetailsModal();
                            setTimeout(() => {
                                setPublicProfileUserId(userId);
                                setPublicProfileOpen(true);
                            }, 350);
                        }}
                    />

                    <SkateShopDetailsModal
                        visible={placeDetailsOpen}
                        place={selectedPlace}
                        onClose={() => {
                            setPlaceDetailsOpen(false);
                            setSelectedPlace(null);
                            markerRefs.current[
                                selectedPlaceId ?? ''
                            ]?.hideCallout?.();
                            setSelectedPlaceId(null);
                            if (openedFromFavoritesRef.current) {
                                setPlaces([]);
                                openedFromFavoritesRef.current = false;
                            }
                        }}
                        isFavorite={
                            selectedPlace
                                ? isPlaceFavorite(selectedPlace.id)
                                : false
                        }
                        onToggleFavorite={async () => {
                            if (!selectedPlace) return;
                            await Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light
                            );
                            await togglePlaceFavorite(selectedPlace);
                        }}
                    />

                    <SettingsPanel
                        visible={settingsOpen}
                        onClose={() => setSettingsOpen(false)}
                        onSignOut={async () => {
                            await signOut();
                            setSettingsOpen(false);
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
                            }}
                        >
                            <OnboardingScreen
                                onFinish={() => setShowOnboarding(false)}
                            />
                        </View>
                    ) : null}

                    <ProfileModal
                        visible={profileOpen}
                        onClose={() => {
                            setProfileOpen(false);
                            AsyncStorage.removeItem(
                                'pendingNotificationProfile'
                            );
                            loadPendingRequests();
                        }}
                        mySpots={mySpots}
                        myReviews={myReviews}
                        onLoadMyReviews={loadMyReviews}
                        allSpots={spots}
                        onSelectSpot={(s) => {
                            setProfileOpen(false);
                            setHighlightSpotId(s.id);
                            highlightSpotIdRef.current = s.id;
                            if (
                                s.spot_type === 'skatepark' ||
                                s.spot_type === 'skateshop'
                            ) {
                                setPlacesWithAutoClear((prev) =>
                                    prev.some((p) => p.id === s.id)
                                        ? prev
                                        : [
                                              ...prev,
                                              {
                                                  id: s.id,
                                                  name: s.name,
                                                  type: s.spot_type as
                                                      | 'skatepark'
                                                      | 'skateshop',
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
                        }}
                        onViewProfile={(userId) => {
                            setProfileOpen(false);
                            setTimeout(() => {
                                setPublicProfileUserId(userId);
                                setPublicProfileOpen(true);
                            }, 350);
                        }}
                    />

                    <PublicProfileModal
                        visible={publicProfileOpen}
                        onClose={() => {
                            setPublicProfileOpen(false);
                            setPublicProfileUserId(null);
                            AsyncStorage.removeItem(
                                'pendingNotificationPublicProfile'
                            );
                        }}
                        userId={publicProfileUserId}
                        allSpots={spots}
                        onSelectSpot={(s) => {
                            setPublicProfileOpen(false);
                            setHighlightSpotId(s.id);
                            highlightSpotIdRef.current = s.id;
                            animateToSpotWithModalOffset(s.lat, s.lng);
                            openSpotDetails(s);
                        }}
                    />
                </View>
            )}
        </>
    );
}
