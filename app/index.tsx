import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {Text, View, Button, ScrollView, Platform, Alert, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Region, LongPressEvent, MapMarker } from 'react-native-maps';
import * as Location from 'expo-location';

import { SkateMarker } from '@/src/components/SkateMarker';
import { CreateSpotModal } from '@/src/components/CreateSpotModal';
import { SpotDetailsModal } from '@/src/components/SpotDetailsModal';
import { SkateShopDetailsModal} from "@/src/components/SkateShopDetailsModal";
import { ExplorePanel } from '@/src/components/ExplorePanel';
import { SettingsPanel } from '@/src/components/SettingsPanel';

import { useSpots } from '@/src/hooks/useSpots';
import { useReviews } from '@/src/hooks/useReviews';
import { useSpotImages } from '@/src/hooks/useSpotImages';
import { useNearbyPlaces } from '@/src/hooks/useNearbyPlaces';
import { useTopRated } from '@/src/hooks/useTopRated';
import { useAuth } from '@/src/hooks/useAuth';
import { useFavorites } from '@/src/hooks/useFavorites';
import {usePlaceFavorites} from "@/src/hooks/usePlaceFavorites";

import { useTheme } from '@/src/context/ThemeContext';

import { Ionicons } from '@expo/vector-icons';
import {Place, Spot} from '@/src/types';

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
    const { places, setPlaces, parksLoading, shopsLoading, error: nearbyError, loadNearbySkateParks, loadNearbySkateShops, fetchPlaceById } = useNearbyPlaces();
    const { topRated, topLoading, error: topRatedError, loadTopRatedSpotsInArea } = useTopRated();

    const { placeFavorites, placeFavLoading, loadPlaceFavorites, togglePlaceFavorite, isPlaceFavorite } = usePlaceFavorites();

    const { images, uploading: imagesUploading, loadImages, uploadImages, deleteImage, clearImages } = useSpotImages();
    const [pendingImages, setPendingImages] = useState<string[]>([]);

    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [placeDetailsOpen, setPlaceDetailsOpen] = useState(false);

    const [panelOpen, setPanelOpen] = useState(false);

    const [highlightSpotId, setHighlightSpotId] = useState<string | null>(null);

    const [useDeviceLocation, setUseDeviceLocation] = useState(true);
    const [spotRating, setSpotRating] = useState(0);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [pendingCoord, setPendingCoord] = useState<{ lat: number; lng: number } | null>(null);

    const [spotName, setSpotName] = useState('');
    const [spotDesc, setSpotDesc] = useState('');
    const [spotTags, setSpotTags] = useState<string[]>([]);

    const [settingsOpen, setSettingsOpen] = useState(false);

    const { theme } = useTheme();
    const c = theme.colors;

    const insets = useSafeAreaInsets();

    const { spots, loading, error, setError, reload, createSpotAt, deleteSpotById, searchResults, searching, searchByTag, clearSearch } = useSpots();

    const visibleSpots = searchResults.length > 0 ? searchResults : spots;
    const displayError = error ?? nearbyError ?? topRatedError;
    const openedFromPanelRef = useRef(false);

    function closeCreateModal() {
        setCreateOpen(false);
        setPendingCoord(null);
        setSpotTags([]);
        setPendingImages([]);
    }

    function closeDetailsModal() {
        if (highlightSpotId) {
            markerRefs.current[highlightSpotId]?.hideCallout?.();
        }
        setDetailsOpen(false);
        setSelectedSpot(null);
        resetReviews();
        setHighlightSpotId(null);

        if (!openedFromPanelRef.current) {
            mapRef.current?.animateToRegion(preModalRegionRef.current, 400);
        }
        openedFromPanelRef.current = false;
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
        await Promise.all([loadReviews(spot.id), loadImages(spot.id)]);
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
                    onPress: () => deleteSpotById(spot.id, () => {
                        setDetailsOpen(false);
                        setSelectedSpot(null);
                        resetReviews();
                    }),
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
    }, []);

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
            };

            mapRegionRef.current = nextRegion;
            mapRef.current?.animateToRegion(nextRegion, 600);

            setUseDeviceLocation(false);
        })();
    }, [useDeviceLocation]);

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
                <Pressable onPress={() => setSettingsOpen(true)} style={{ padding: 8 }}>
                    <Ionicons name="settings-outline" size={24} color={c.text} />
                </Pressable>
            </View>

            <ExplorePanel
                visible={panelOpen}
                onClose={() => setPanelOpen(false)}
                onOpenSettings={() => {
                    setPanelOpen(false);
                    setSettingsOpen(true);
                }}
                parksLoading={parksLoading}
                shopsLoading={shopsLoading}
                topLoading={topLoading}
                topRated={topRated}
                onLoadSkateparks={() => {
                    setPanelOpen(false);
                    loadNearbySkateParks(mapRegionRef.current.latitude, mapRegionRef.current.longitude, 20000);
                }}
                onLoadSkateShops={() => {
                    setPanelOpen(false);
                    loadNearbySkateShops(mapRegionRef.current.latitude, mapRegionRef.current.longitude, 20000);
                }}
                onLoadTopRated={async () => {
                    const topSpot = await loadTopRatedSpotsInArea(mapRegionRef.current, 10);
                    if (topSpot) {
                        mapRef.current?.animateToRegion(
                            { latitude: topSpot.lat, longitude: topSpot.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 },
                            600
                        );
                    }
                }}
                onSelectSpot={(s) => {
                    setPanelOpen(false);
                    setHighlightSpotId(s.id);
                    openedFromPanelRef.current = true;
                    animateToSpotWithModalOffset(s.lat, s.lng);
                    openSpotDetails(s);
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
                    mapRef.current?.animateToRegion(
                        { latitude: p.lat, longitude: p.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 },
                        600
                    );
                    const full = await fetchPlaceById(p.id);
                    const resolved = full ?? p;
                    setSelectedPlace(resolved);
                    setPlaceDetailsOpen(true);
                    setPlaces(prev => prev.some(x => x.id === resolved.id) ? prev : [...prev, resolved]);
                }}
            />

            <MapView
                ref={mapRef}
                style={{ flex: 1, marginBottom: -34 }}
                initialRegion={DEFAULT_REGION}
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
                {visibleSpots.map((s) => (
                    <Marker
                        ref={(ref) => { markerRefs.current[s.id] = ref; }}
                        key={s.id}
                        coordinate={{ latitude: s.lat, longitude: s.lng }}
                        title={s.name}
                        description={s.description ?? undefined}
                        pinColor={
                            s.id === highlightSpotId
                                ? (s.user_id === session?.user.id ? '#f5a623' : 'purple')
                                : (s.user_id === session?.user.id ? '#f5a623' : 'red')
                        }
                        onPress={() => {
                            setHighlightSpotId(s.id);
                            animateToSpotWithModalOffset(s.lat, s.lng);
                            openSpotDetails(s);
                        }}
                    />
                ))}
                {places.map((p) => (
                    <SkateMarker
                        key={p.id}
                        id={p.id}
                        lat={p.lat}
                        lng={p.lng}
                        name={p.name}
                        type={p.type as 'skatepark' | 'skateshop'}
                        onPress={() => {
                            setSelectedPlace(p);
                            setPlaceDetailsOpen(true);
                        }}
                    />
                ))}
            </MapView>

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
                onChangeName={setSpotName}
                onChangeDesc={setSpotDesc}
                onChangeRating={setSpotRating}
                spotTags={spotTags}
                onAddTag={(tag) => setSpotTags(prev => prev.includes(tag) ? prev : [...prev, tag])}
                onRemoveTag={(tag) => setSpotTags(prev => prev.filter(t => t !== tag))}
                onCancel={closeCreateModal}
                onCreate={async () => {
                    if (!pendingCoord) return;
                    const newSpot = await createSpotAt(pendingCoord.lat, pendingCoord.lng, spotName, spotDesc, spotRating, spotTags);
                    if (newSpot && pendingImages.length > 0) {
                        await uploadImages(newSpot.id, pendingImages);
                    }
                    closeCreateModal();
                }}
                pendingImages={pendingImages}
                onAddImage={(uri) => setPendingImages(prev => prev.includes(uri) ? prev : [...prev, uri])}
                onRemoveImage={(uri) => setPendingImages(prev => prev.filter(u => u !== uri))}
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
                    if (err) setError(err);
                }}
                onClose={closeDetailsModal}
                currentUserId={session?.user.id ?? null}
                onDelete={confirmDelete}
                isFavorite={selectedSpot ? isFavorite(selectedSpot.id) : false}
                onToggleFavorite={async () => {
                    if (!selectedSpot) return;
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
            />
            <SkateShopDetailsModal
                visible={placeDetailsOpen}
                place={selectedPlace}
                onClose={() => {
                    setPlaceDetailsOpen(false);
                    setSelectedPlace(null);
                }}
                isFavorite={selectedPlace ? isPlaceFavorite(selectedPlace.id) : false}
                onToggleFavorite={async () => {
                    if (!selectedPlace) return;
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
    );
}