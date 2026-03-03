import React, {useState} from 'react';
import { View, Text, Modal, Pressable, ScrollView, Linking, StyleSheet, ActionSheetIOS, Share } from 'react-native';
import { Place } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

type Props = {
    visible: boolean;
    place: Place | null;
    onClose: () => void;
    onToggleFavorite: () => void;
    isFavorite: boolean;
};

export function SkateShopDetailsModal({ visible, place, onClose, onToggleFavorite, isFavorite }: Props) {
    const [sharing, setSharing] = useState(false);

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
                    await Share.share({
                        message: `Check out this skate location: ${place.name}\nhttps://maps.apple.com/?q=${place.lat},${place.lng}`,
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

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Pressable
                    style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }}
                    onPress={onClose}
                />
                <View style={{ backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' }}>
                    <ScrollView>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ fontSize: 20 }}>{place?.type === 'skateshop' ? '🛒' : '🛹'}</Text>
                            <Text style={{ fontSize: 18, fontWeight: '600', marginLeft: 8, flex: 1 }}>{place?.name}</Text>
                            <Pressable onPress={handleDirections} style={{ padding: 4 }}>
                                <Ionicons name="share-outline" size={24} color="#007AFF" />
                            </Pressable>
                            <Pressable onPress={onToggleFavorite} style={{ padding: 4 }}>
                                <Ionicons
                                    name={isFavorite ? 'star' : 'star-outline'}
                                    size={24}
                                    color={isFavorite ? '#f5a623' : '#ccc'}
                                />
                            </Pressable>
                        </View>

                        <Text style={{ fontSize: 12, opacity: 0.5, marginBottom: 16 }}>
                            {place?.type === 'skateshop' ? 'Skate Shop' : 'Skate Park'}
                        </Text>

                        {address ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <Ionicons name="location-outline" size={18} color="#666" />
                                <Text style={{ flex: 1, opacity: 0.8 }}>{address}</Text>
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
                                <Ionicons name="time-outline" size={18} color="#666" />
                                <Text style={{ flex: 1, opacity: 0.8 }}>{hours}</Text>
                            </View>
                        ) : null}

                        {!address && !phone && !website && !hours ? (
                            <Text style={{ opacity: 0.5, marginBottom: 16 }}>No additional details available for this location.</Text>
                        ) : null}

                        <Pressable onPress={onClose} style={{ marginTop: 12, padding: 12, alignItems: 'center' }}>
                            <Text style={{ color: '#666' }}>Close</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}