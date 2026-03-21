import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {Text, View, Button, ScrollView, Platform, Alert, Pressable, Animated, Easing } from 'react-native';
import MapView, { Marker, Region, LongPressEvent, MapMarker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as ExpoSplashScreen from 'expo-splash-screen'
import { useLocalSearchParams } from 'expo-router';
import SplashScreen from '../src/components/SplashScreen'

import { useFocusEffect } from 'expo-router';

import { supabase } from '@/src/libs/supabase';

import { SkateMarker } from '@/src/components/SkateMarker';
import { CreateSpotModal } from '@/src/components/CreateSpotModal';
import { SpotDetailsModal } from '@/src/components/SpotDetailsModal';
import { SkateShopDetailsModal} from "@/src/components/SkateShopDetailsModal";
import { ExplorePanel } from '@/src/components/ExplorePanel';
import { SettingsPanel } from '@/src/components/SettingsPanel';

import { useSpots } from '@/src/hooks/useSpots';
import { useReviews } from '@/src/hooks/useReviews';
import { useSpotImages } from '@/src/hooks/useSpotImages';
import { useSpotConditions } from '@/src/hooks/useSpotConditions';
import { useNearbyPlaces } from '@/src/hooks/useNearbyPlaces';
import { useTopRated } from '@/src/hooks/useTopRated';
import { useAuth } from '@/src/hooks/useAuth';
import { useFavorites } from '@/src/hooks/useFavorites';
import {usePlaceFavorites} from "@/src/hooks/usePlaceFavorites";

import { useTheme } from '@/src/context/ThemeContext';

import { Ionicons } from '@expo/vector-icons';
import {Place, Spot} from '@/src/types';
import {useWishlist} from "@/src/hooks/useWishlist";

ExpoSplashScreen.preventAutoHideAsync()

const DEFAULT_REGION: Region = {
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
};

export default function Index() {
    const mapRef = useRef<MapView | null>(null);
    const mapRegionRef = useRef<Region>(DEFAULT_REGION);
    const preModalRegionRef = useRef<Region>(DEFAULT_REGION);

    const autoCenterRef = useRef(true);
    const markerRefs = useRef<Record<string, MapMarker | null>>({});

    const placesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        existingReviewId
    } = useReviews();
    const { signOut, session } = useAuth();
    const { favorites, loading: favLoading, loadFavorites, toggleFavorite, isFavorite } = useFavorites();
    const { wishlist, wishlistLoading, loadWishlist, toggleWishlist, isWishlisted } = useWishlist();
    const { places, setPlaces, parksLoading, shopsLoading, error: nearbyError, loadNearbySkateParks, loadNearbySkateShops, fetchPlaceById } = useNearbyPlaces();
    const { topRated, topLoading, error: topRatedError, loadTopRatedSpotsInArea, clearTopRated } = useTopRated();

    const [spotIsPrivate, setSpotIsPrivate] = useState(false);

    const { placeFavorites, placeFavLoading, loadPlaceFavorites, togglePlaceFavorite, isPlaceFavorite } = usePlaceFavorites();
    const { images, uploading: imagesUploading, loadImages, uploadImages, deleteImage, clearImages } = useSpotImages();
    const { activeConditions, myConditions, loadConditions, toggleCondition, resetConditions } = useSpotConditions();
    const [pendingImages, setPendingImages] = useState<string[]>([]);

    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [placeDetailsOpen, setPlaceDetailsOpen] = useState(false);

    const [panelOpen, setPanelOpen] = useState(false);

    const [highlightSpotId, setHighlightSpotId] = useState<string | null>(null);

    const [useDeviceLocation, setUseDeviceLocation] = useState(true);
    const [locationReady, setLocationReady] = useState(false)
    const [initialRegion, setInitialRegion] = useState<Region>(DEFAULT_REGION)

    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

    const [spotRating, setSpotRating] = useState(0);
    const [spotComment, setSpotComment] = useState('')

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [pendingCoord, setPendingCoord] = useState<{ lat: number; lng: number } | null>(null);

    const [spotName, setSpotName] = useState('');
    const [spotDesc, setSpotDesc] = useState('');
    const [spotTags, setSpotTags] = useState<string[]>([]);

    const [spotCreatorUsername, setSpotCreatorUsername] = useState<string | null>(null);

    const [settingsOpen, setSettingsOpen] = useState(false);

    const [refreshing, setRefreshing] = useState(false);

    const [showSplash, setShowSplash] = useState(true)

    const [spotType, setSpotType] = useState<'spot' | 'skatepark' | 'skateshop'>('spot')

    const { theme, loadThemeForUser, resetTheme } = useTheme();
    const c = theme.colors;

    const insets = useSafeAreaInsets();

    const { spots, mySpots, mySpotsLoading, error, setError, reload, loadMySpots, createSpotAt, deleteSpotById, searchResults, searchByTag, clearSearch, toggleSpotPrivacy } = useSpots();
    const { deepLinkSpotId } = useLocalSearchParams<{ deepLinkSpotId?: string }>();

    const visibleSpots = searchResults.length > 0 ? searchResults : spots;
    const displayError = error ?? nearbyError ?? topRatedError;
    const openedFromPanelRef = useRef(false);

    const spinAnim = useRef(new Animated.Value(0)).current;

    function closeCreateModal() {
        setCreateOpen(false);
        setPendingCoord(null);
        setSpotTags([]);
        setPendingImages([]);
        setSpotIsPrivate(false);
        setSpotComment('');
        setSpotType('spot');
    }

    function closeDetailsModal() {
        if (highlightSpotId) {
            markerRefs.current[highlightSpotId]?.hideCallout?.();
        }
        setDetailsOpen(false);
        setSelectedSpot(null);
        resetReviews();
        setHighlightSpotId(null);
        setSpotCreatorUsername(null);

        if (!openedFromPanelRef.current) {
            mapRef.current?.animateToRegion(preModalRegionRef.current, 400);
        }
        openedFromPanelRef.current = false;
        resetConditions();
    }

    function setPlacesWithAutoClear(updater: (prev: Place[]) => Place[]) {
        if (placesTimerRef.current) clearTimeout(placesTimerRef.current)
        setPlaces(updater)
        placesTimerRef.current = setTimeout(() => {
            setPlaces([])
        }, 120000)
    }

    function animateToSpotWithModalOffset(lat: number, lng: number) {
        preModalRegionRef.current = mapRegionRef.current;

        const MODAL_HEIGHT_RATIO = 0.45;
        const latDelta = 0.03;
        const offsetLat = lat - (latDelta * MODAL_HEIGHT_RATIO);

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
        resetReviews();
        clearImages();

        const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', spot.user_id)
            .single();

        setSpotCreatorUsername(data?.username ?? null);

        await Promise.all([loadReviews(spot.id), loadImages(spot.id), loadConditions(spot.id)]);
    }

    async function onRefresh() {
        setRefreshing(true);
        await Promise.all([reload(), loadMySpots(), loadFavorites(), loadPlaceFavorites()]);
        setRefreshing(false);
    }

    function confirmDelete(spot: Spot) {
        Alert.alert(
            'Delete spot?',
            spot.name,
            [
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
            ]
        );
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

    useEffect(() => {
        reload();
        loadFavorites();
        loadPlaceFavorites();
        loadMySpots();
        loadWishlist();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadFavorites();
            loadPlaceFavorites();
            loadWishlist();
        }, [])
    );

    useEffect(() => {
        (async () => {
            if (Platform.OS === "web") return;
            if (!useDeviceLocation) return;

            setError(null);

            if (!autoCenterRef.current) {
                setUseDeviceLocation(false);
                return;
            }

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setError("Location permission denied.");
                setUseDeviceLocation(false);
                return;
            }

            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            if (!autoCenterRef.current) {
                setUseDeviceLocation(false);
                return;
            }

            const nextRegion: Region = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
            }

            mapRegionRef.current = nextRegion
            setInitialRegion(nextRegion)
            setLocationReady(true)
            setUseDeviceLocation(false)
            mapRef.current?.animateToRegion(nextRegion, 600);

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
        if (session?.user.id) {
            loadThemeForUser(session.user.id);
        } else {
            resetTheme();
        }
    }, [session?.user.id]);

    useEffect(() => {
        if (!deepLinkSpotId || !spots.length) return;
        const spot = spots.find(s => s.id === deepLinkSpotId);
        if (!spot) return;
        animateToSpotWithModalOffset(spot.lat, spot.lng);
        openSpotDetails(spot);
    }, [deepLinkSpotId, spots]);

    if (Platform.OS === 'web') {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: c.headerBg }}>
                {/*<View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>*/}
                {/*    <Button title={loading ? 'Loading…' : 'Reload'} onPress={reload} />*/}
                {/*</View>*/}

                {displayError ? <Text style={{ color: 'red', marginBottom: 12 }}>{displayError}</Text> : null}
                <Text style={{ marginBottom: 12 }}>
                    Map is native-only for now. Web shows a list fallback.
                </Text>

                <ScrollView>
                    {visibleSpots.map((s) => (
                        <View key={s.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#ddd' }}>
                            <Text style={{ fontWeight: '600' }}>{s.name}</Text>
                            {s.description ? <Text>{s.description}</Text> : null}
                            <Text>{s.lat}, {s.lng}</Text>
                            <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                                <Button title="Delete" onPress={() => confirmDelete(s)} />
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
                    <View style={{ height: insets.top, backgroundColor: c.headerBg }} />

                    {displayError ? (
                        <Text style={{ color: "red", paddingHorizontal: 12, paddingTop: 8 }}>
                            {displayError}
                        </Text>
                    ) : null}

                    <View style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottomWidth: 1,
                        borderColor: c.border,
                        backgroundColor: c.headerBg,
                    }}>
                        <Pressable onPress={() => setPanelOpen(true)} style={{ padding: 8 }}>
                            <Ionicons name="menu" size={24} color={c.text} />
                        </Pressable>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text }}>Spots</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Pressable onPress={onRefresh} style={{ padding: 8 }} disabled={refreshing}>
                                <Animated.View style={{
                                    transform: [{
                                        rotate: spinAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '360deg'],
                                        })
                                    }]
                                }}>
                                    <Ionicons name="refresh" size={20} color={refreshing ? '#007AFF' : c.text} />
                                </Animated.View>
                            </Pressable>
                            <Pressable onPress={() => setSettingsOpen(true)} style={{ padding: 8 }}>
                                <Ionicons name="settings-outline" size={24} color={c.text} />
                            </Pressable>
                        </View>
                    </View>

                    <ExplorePanel
                        visible={panelOpen}
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
                                .filter(s => s.spot_type === 'skatepark')
                                .map(s => ({
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
                                    setPlaces([...communityParks, ...googleParks]);
                                }
                            );
                        }}

                        onLoadSkateShops={() => {
                            setPanelOpen(false);
                            const communityShops = spots
                                .filter(s => s.spot_type === 'skateshop')
                                .map(s => ({
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
                                    setPlaces([...communityShops, ...googleShops]);
                                }
                            );
                        }}
                        onLoadTopRated={async () => {
                            const topSpot = await loadTopRatedSpotsInArea(mapRegionRef.current, 10);
                            if (topSpot) {
                                mapRef.current?.animateToRegion(
                                    { latitude: topSpot.lat, longitude: topSpot.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 },
                                    1200
                                );
                            }
                            setTimeout(() => {
                                clearTopRated()
                            }, 10000)
                        }}
                        onSelectSpot={(s) => {
                            setPanelOpen(false);
                            setHighlightSpotId(s.id);
                            openedFromPanelRef.current = true;
                            animateToSpotWithModalOffset(s.lat, s.lng);
                            openSpotDetails(s);
                            setTimeout(() => {
                                markerRefs.current[s.id]?.showCallout();
                            }, 650);
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
                            setSelectedPlaceId(p.id);
                            mapRef.current?.animateToRegion(
                                { latitude: p.lat, longitude: p.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 },
                                600
                            );
                            const full = await fetchPlaceById(p.id);
                            const resolved = full ?? p;
                            setSelectedPlace(resolved);
                            setPlaceDetailsOpen(true);
                            setPlacesWithAutoClear(prev => prev.some(x => x.id === resolved.id) ? prev : [...prev, resolved]);
                            setTimeout(() => {
                                markerRefs.current[p.id]?.showCallout();
                            }, 650);
                        }}
                        wishlist={wishlist}
                        wishlistLoading={wishlistLoading}
                        onToggleSpotPrivacy={async (spot) => {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            await toggleSpotPrivacy(spot);
                            await loadMySpots();
                        }}
                        onDeleteSpot={async (spot) => {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            deleteSpotById(spot.id, async () => {
                                await loadMySpots();
                            });
                        }}
                    />

                    {locationReady ? (
                        <MapView
                            ref={mapRef}
                            style={{ flex: 1, marginBottom: -34 }}
                            initialRegion={initialRegion}
                            onPress={() => {
                                setHighlightSpotId(null);
                                setSelectedPlaceId(null);
                                markerRefs.current[highlightSpotId ?? '']?.hideCallout?.();
                                markerRefs.current[selectedPlaceId ?? '']?.hideCallout?.();
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
                                    coordinate={{ latitude: pendingCoord.lat, longitude: pendingCoord.lng }}
                                    title="New spot"
                                    pinColor="orange"
                                />
                            ) : null}
                            {visibleSpots.filter(s => s.spot_type === 'spot' || s.id === highlightSpotId).map((s) => (
                                s.spot_type === 'spot' ? (
                                    <Marker
                                        ref={(ref) => { markerRefs.current[s.id] = ref; }}
                                        key={s.id}
                                        coordinate={{ latitude: s.lat, longitude: s.lng }}
                                        title={s.name}
                                        description={s.description ?? undefined}
                                        pinColor={
                                            s.id === highlightSpotId
                                                ? (s.user_id === session?.user.id ? '#22CC00' : '#A0A0A0')
                                                : (s.user_id === session?.user.id ? '#39FF14' : '#6B6B6B')
                                        }
                                        onPress={() => {
                                            setHighlightSpotId(s.id);
                                            animateToSpotWithModalOffset(s.lat, s.lng);
                                            openSpotDetails(s);
                                        }}
                                    />
                                ) : (
                                    <SkateMarker
                                        ref={(ref) => { markerRefs.current[s.id] = ref; }}
                                        key={s.id}
                                        id={s.id}
                                        lat={s.lat}
                                        lng={s.lng}
                                        name={s.name}
                                        type={s.spot_type as 'skatepark' | 'skateshop'}
                                        onPress={() => {
                                            setHighlightSpotId(s.id);
                                            animateToSpotWithModalOffset(s.lat, s.lng);
                                            openSpotDetails(s);
                                        }}
                                    />
                                )
                            ))}
                            {places.map((p) => (
                                <SkateMarker
                                    key={p.id}
                                    ref={(ref) => { markerRefs.current[p.id] = ref }}
                                    id={p.id}
                                    lat={p.lat}
                                    lng={p.lng}
                                    name={p.name}
                                    type={p.type as 'skatepark' | 'skateshop'}
                                    onPress={() => {
                                        const communitySpot = spots.find(s => s.id === p.id);
                                        if (communitySpot) {
                                            setHighlightSpotId(communitySpot.id);
                                            animateToSpotWithModalOffset(communitySpot.lat, communitySpot.lng);
                                            openSpotDetails(communitySpot);
                                        } else {
                                            setSelectedPlaceId(p.id);
                                            setSelectedPlace(p);
                                            setPlaceDetailsOpen(true);
                                            setTimeout(() => {
                                                markerRefs.current[p.id]?.showCallout();
                                            }, 300);
                                        }
                                    }}
                                />
                            ))}
                        </MapView>
                    ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: c.text }}>Finding your location...</Text>
                    </View>
                )}
                    <Pressable
                        onPress={() => {
                            autoCenterRef.current = true;
                            setUseDeviceLocation(true);
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
                        onAddTag={(tag) => setSpotTags(prev => prev.includes(tag) ? prev : [...prev, tag])}
                        onRemoveTag={(tag) => setSpotTags(prev => prev.filter(t => t !== tag))}
                        onCancel={closeCreateModal}
                        isPrivate={spotIsPrivate}
                        onTogglePrivate={() => setSpotIsPrivate(prev => !prev)}
                        onCreate={async () => {
                            if (!pendingCoord) return;
                            const newSpot = await createSpotAt(pendingCoord.lat, pendingCoord.lng, spotName, spotDesc, spotRating, spotTags, spotIsPrivate, spotType);
                            if (newSpot) {
                                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                if (pendingImages.length > 0) {
                                    await uploadImages(newSpot.id, pendingImages);
                                }
                                if (spotRating > 0) {
                                    await submitReview(newSpot.id, spotRating, spotComment);
                                }
                                await loadMySpots();

                                if (newSpot.spot_type === 'skatepark' || newSpot.spot_type === 'skateshop') {
                                    setPlacesWithAutoClear(prev => [...prev, {
                                        id: newSpot.id,
                                        name: newSpot.name,
                                        type: newSpot.spot_type as 'skatepark' | 'skateshop',
                                        lat: newSpot.lat,
                                        lng: newSpot.lng,
                                        tags: {},
                                    }]);
                                    setTimeout(() => {
                                        setPlacesWithAutoClear(prev => prev.filter(p => p.id !== newSpot.id));
                                    }, 4000);
                                }
                            }
                            closeCreateModal();
                        }}
                        pendingImages={pendingImages}
                        onAddImage={(uri) => setPendingImages(prev => prev.includes(uri) ? prev : [...prev, uri])}
                        onRemoveImage={(uri) => setPendingImages(prev => prev.filter(u => u !== uri))}
                        spotType={spotType}
                        onChangeSpotType={(v) => {
                            setSpotType(v);
                            if (v !== 'spot') setSpotIsPrivate(false);
                        }}
                    />

                    {/* Details Modal */}
                    <SpotDetailsModal
                        visible={detailsOpen}
                        spot={selectedSpot}
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
                                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            } else {
                                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                        }}
                        onClose={closeDetailsModal}
                        currentUserId={session?.user.id ?? null}
                        onDelete={confirmDelete}
                        isFavorite={selectedSpot ? isFavorite(selectedSpot.id) : false}
                        onToggleFavorite={async () => {
                            if (!selectedSpot) return;
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            await toggleFavorite(selectedSpot.id);
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
                        onTogglePrivacy={async () => {
                            if (!selectedSpot) return;
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            await toggleSpotPrivacy(selectedSpot);
                            setSelectedSpot(prev => prev ? { ...prev, is_private: !prev.is_private } : prev);
                        }}
                        creatorUsername={spotCreatorUsername ?? undefined}
                        activeConditions={activeConditions}
                        myConditions={myConditions}
                        onToggleCondition={async (condition) => {
                            if (!selectedSpot) return;
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            await toggleCondition(selectedSpot.id, condition);
                        }}
                        isWishlisted={selectedSpot ? isWishlisted(selectedSpot.id) : false}
                        onToggleWishlist={async () => {
                            if (!selectedSpot) return;
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            await toggleWishlist(selectedSpot.id);
                        }}
                    />

                    <SkateShopDetailsModal
                        visible={placeDetailsOpen}
                        place={selectedPlace}
                        onClose={() => {
                            setPlaceDetailsOpen(false);
                            setSelectedPlace(null);
                            markerRefs.current[selectedPlaceId ?? '']?.hideCallout?.();
                            setSelectedPlaceId(null);
                        }}
                        isFavorite={selectedPlace ? isPlaceFavorite(selectedPlace.id) : false}
                        onToggleFavorite={async () => {
                            if (!selectedPlace) return;
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                    />
                </View>
            )}
        </>
    );
}