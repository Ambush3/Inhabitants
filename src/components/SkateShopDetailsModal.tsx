import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Linking, StyleSheet, ActionSheetIOS, Share, Image } from 'react-native';
import { Place } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { usePlaceReviews } from '@/src/hooks/usePlaceReviews';
import { useAuth } from '@/src/hooks/useAuth';

type Props = {
    visible: boolean;
    place: Place | null;
    onClose: () => void;
    onToggleFavorite: () => void;
    isFavorite: boolean;
};

export function SkateShopDetailsModal({ visible, place, onClose, onToggleFavorite, isFavorite }: Props) {
    const { theme } = useTheme();
    const c = theme.colors;
    const { session } = useAuth();

    const {
        avgRating,
        reviewCount,
        existingReviewId,
        loadPlaceReviews,
        submitPlaceReview,
        deletePlaceReview,
        resetPlaceReviews,
    } = usePlaceReviews();

    const [pendingRating, setPendingRating] = useState(0);

    useEffect(() => {
        if (visible && place && session?.user.id) {
            loadPlaceReviews(place.id, session.user.id).then((reviews) => {
                const mine = reviews?.find((r: any) => r.user_id === session.user.id);
                if (mine) setPendingRating(mine.rating);
            });
        }
        if (!visible) {
            resetPlaceReviews();
            setPendingRating(0);
        }
    }, [visible, place?.id]);

    const tags = place?.tags ?? {};
    const phone = tags['phone'] ?? tags['contact:phone'] ?? null;
    const website = tags['website'] ?? tags['contact:website'] ?? null;
    const hours = tags['opening_hours'] ?? null;
    const street = tags['addr:housenumber'] && tags['addr:street']
        ? `${tags['addr:housenumber']} ${tags['addr:street']}`
        : tags['addr:street'] ?? null;
    const city = tags['addr:city'] ?? null;
    const address = [street, city].filter(Boolean).join(', ') || null;

    function handleDirections() {
        if (!place) return;
        ActionSheetIOS.showActionSheetWithOptions(
            {
                options: ['Cancel', 'Open in Apple Maps', 'Open in Google Maps', 'Share Location'],
                cancelButtonIndex: 0,
            },
            async (buttonIndex) => {
                if (buttonIndex === 1) {
                    await Linking.openURL(`maps://app?daddr=${place.lat},${place.lng}`);
                } else if (buttonIndex === 2) {
                    const url = `comgooglemaps://?daddr=${place.lat},${place.lng}&directionsmode=driving`;
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                        await Linking.openURL(url);
                    } else {
                        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`);
                    }
                } else if (buttonIndex === 3) {
                    const label = place.type === 'skateshop' ? 'skate shop' : 'skate park';
                    await Share.share({
                        message: `Check out this ${label}: ${place.name}\nhttps://maps.apple.com/?q=${place.lat},${place.lng}`,
                    });
                }
            }
        );
    }

    async function handlePhone() {
        if (!phone) return;
        await Linking.openURL(`tel:${phone}`);
    }

    async function handleWebsite() {
        if (!website) return;
        const url = website.startsWith('http') ? website : `https://${website}`;
        await Linking.openURL(url);
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
                    style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }}
                    onPress={onClose}
                />
                <View style={{ backgroundColor: c.surface, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '65%' }}>
                    <ScrollView>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Image
                                source={place?.type === 'skateshop'
                                    ? require('../../assets/icons/skate-shop.png')
                                    : require('../../assets/icons/skatepark-ramp.png')
                                }
                                style={{ width: 20, height: 20, tintColor: c.text }}
                            />
                            <Text style={{ fontSize: 18, fontWeight: '600', marginLeft: 8, flex: 1, color: c.text }}>{place?.name}</Text>
                            <Pressable onPress={handleDirections} style={{ padding: 4 }}>
                                <Ionicons name="share-outline" size={24} color="#007AFF" />
                            </Pressable>
                            <Pressable onPress={onToggleFavorite} style={{ padding: 4 }}>
                                <Ionicons
                                    name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                                    size={24}
                                    color={isFavorite ? 'red' : c.subtext}
                                />
                            </Pressable>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, opacity: 0.5, color: c.text }}>
                                {place?.type === 'skateshop' ? 'Skate Shop' : 'Skate Park'}
                            </Text>
                            {avgRating !== null ? (
                                <>
                                    <Text style={{ fontSize: 12, opacity: 0.3, color: c.text }}>·</Text>
                                    <Text style={{ fontSize: 12, color: '#FFB800', fontWeight: '600' }}>
                                        {avgRating.toFixed(1)} ★
                                    </Text>
                                    <Text style={{ fontSize: 12, opacity: 0.5, color: c.text }}>
                                        ({reviewCount})
                                    </Text>
                                </>
                            ) : null}
                        </View>

                        {address ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <Ionicons name="location-outline" size={18} color={c.subtext} />
                                <Text style={{ flex: 1, opacity: 0.8, color: c.text }}>{address}</Text>
                            </View>
                        ) : null}

                        {phone ? (
                            <Pressable onPress={handlePhone} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <Ionicons name="call-outline" size={18} color="#007AFF" />
                                <Text style={{ color: '#007AFF' }}>{phone}</Text>
                            </Pressable>
                        ) : null}

                        {website ? (
                            <Pressable onPress={handleWebsite} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <Ionicons name="globe-outline" size={18} color="#007AFF" />
                                <Text style={{ color: '#007AFF' }} numberOfLines={1}>{website}</Text>
                            </Pressable>
                        ) : null}

                        {hours ? (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                                <Ionicons name="time-outline" size={18} color={c.subtext} />
                                <Text style={{ flex: 1, opacity: 0.8, color: c.text }}>{hours}</Text>
                            </View>
                        ) : null}

                        {!address && !phone && !website && !hours ? (
                            <Text style={{ opacity: 0.5, marginBottom: 16, color: c.text }}>No additional details available for this location.</Text>
                        ) : null}

                        <View style={{ borderTopWidth: 1, borderColor: c.border, marginTop: 8, paddingTop: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 10 }}>
                                {existingReviewId ? 'Your Rating' : 'Rate this place'}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                {[1, 2, 3, 4, 5].map(star => (
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

                        <Pressable onPress={onClose} style={{ marginTop: 16, padding: 12, alignItems: 'center' }}>
                            <Text style={{ color: c.subtext }}>Close</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}