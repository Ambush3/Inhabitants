import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {Text, View, Button, ScrollView, Platform, Alert, Pressable} from 'react-native';
import MapView, { Marker, Region, LongPressEvent, MapMarker } from 'react-native-maps';
import * as Location from 'expo-location';
import { SkateMarker } from '@/src/components/SkateMarker';
import { CreateSpotModal } from '@/src/components/CreateSpotModal';
import { SpotDetailsModal } from '@/src/components/SpotDetailsModal';
import { ExplorePanel } from '@/src/components/ExplorePanel';
import { Spot } from '@/src/types';
import { useSpots } from '@/src/hooks/useSpots';
import { useReviews } from '@/src/hooks/useReviews';
import { useNearbyPlaces } from '@/src/hooks/useNearbyPlaces';
import { useTopRated } from '@/src/hooks/useTopRated';
import { Ionicons } from '@expo/vector-icons';

// const GRAND_RAPIDS: Region = {
//     latitude: 42.9634,
//     longitude: -85.6681,
//     latitudeDelta: 0.15,
//     longitudeDelta: 0.15,
// };

const SAN_FRANCISCO: Region = {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
};

export default function Index() {
    const mapRef = useRef<MapView | null>(null);
    const mapRegionRef = useRef<Region>(SAN_FRANCISCO);
    const preModalRegionRef = useRef<Region>(SAN_FRANCISCO);

    const autoCenterRef = useRef(true);
    const markerRefs = useRef<Record<string, MapMarker | null>>({});

    const { spots, loading, error, setError, reload, createSpotAt, deleteSpotById } = useSpots();
    const {
        reviews: spotReviews,
        avgRating,
        newRating: newReviewRating,
        setNewRating: setNewReviewRating,
        newComment: newReviewComment,
        setNewComment: setNewReviewComment,
        loadReviews,
        submitReview,
        resetReviews,
    } = useReviews();
    const { places, placesLoading, error: nearbyError, loadNearbySkateParks } = useNearbyPlaces();
    const { topRated, topLoading, error: topRatedError, loadTopRatedSpotsInArea } = useTopRated();

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

    const displayError = error ?? nearbyError ?? topRatedError;

    function closeCreateModal() {
        setCreateOpen(false);
        setPendingCoord(null);
    }

    function closeDetailsModal() {
        if (highlightSpotId) {
            markerRefs.current[highlightSpotId]?.hideCallout?.();
        }
        setDetailsOpen(false);
        setSelectedSpot(null);
        resetReviews()
        setHighlightSpotId(null);

        mapRef.current?.animateToRegion(preModalRegionRef.current, 400);
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
        await loadReviews(spot.id);
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
            <SafeAreaView style={{ flex: 1, padding: 16 }}>
                {/*<View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>*/}
                {/*    <Button title={loading ? 'Loading…' : 'Reload'} onPress={reload} />*/}
                {/*</View>*/}

                {displayError ? <Text style={{ color: 'red', marginBottom: 12 }}>{displayError}</Text> : null}
                <Text style={{ marginBottom: 12 }}>
                    Map is native-only for now. Web shows a list fallback.
                </Text>

                <ScrollView>
                    {spots.map((s) => (
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
        <SafeAreaView style={{ flex: 1 }}>
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
                borderColor: "#e5e5e5",
                backgroundColor: "white",
            }}>
                <Pressable onPress={() => setPanelOpen(true)} style={{ padding: 8 }}>
                    <Ionicons name="menu" size={24} color="#000" />
                </Pressable>
                <Text style={{ fontSize: 16, fontWeight: "600" }}>Spots</Text>
            </View>

            <ExplorePanel
                visible={panelOpen}
                onClose={() => setPanelOpen(false)}
                placesLoading={placesLoading}
                topLoading={topLoading}
                topRated={topRated}
                onLoadSkateparks={() => {
                    setPanelOpen(false);
                    loadNearbySkateParks(mapRegionRef.current.latitude, mapRegionRef.current.longitude, 20000);
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
                    animateToSpotWithModalOffset(s.lat, s.lng);
                    openSpotDetails(s);
                }}
            />

            <MapView
                ref={mapRef}
                style={{ flex: 1, marginBottom: -34 }}
                initialRegion={SAN_FRANCISCO}
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
                {spots.map((s) => (
                    <Marker
                        ref={(ref) => { markerRefs.current[s.id] = ref; }}
                        key={s.id}
                        coordinate={{ latitude: s.lat, longitude: s.lng }}
                        title={s.name}
                        description={s.description ?? undefined}
                        pinColor={s.id === highlightSpotId ? "gold" : "red"}
                        onPress={() => {
                            setHighlightSpotId(s.id);
                            animateToSpotWithModalOffset(s.lat, s.lng);
                            openSpotDetails(s);
                        }}
                    />
                ))}
                {places.map((p) => (
                    <SkateMarker key={p.id} id={p.id} lat={p.lat} lng={p.lng} name={p.name} />
                ))}
            </MapView>

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
                onCancel={closeCreateModal}
                onCreate={async () => {
                    if (!pendingCoord) return;
                    await createSpotAt(pendingCoord.lat, pendingCoord.lng, spotName, spotDesc, spotRating);
                    closeCreateModal();
                }}
            />

            {/* Details Modal */}
            <SpotDetailsModal
                visible={detailsOpen}
                spot={selectedSpot}
                reviews={spotReviews}
                avgRating={avgRating}
                newRating={newReviewRating}
                newComment={newReviewComment}
                onChangeRating={setNewReviewRating}
                onChangeComment={setNewReviewComment}
                onSubmitReview={async () => {
                    if (!selectedSpot) return;
                    const err = await submitReview(selectedSpot.id);
                    if (err) setError(err);
                }}
                onClose={closeDetailsModal}
                onDelete={confirmDelete}
            />
        </SafeAreaView>
    );
}