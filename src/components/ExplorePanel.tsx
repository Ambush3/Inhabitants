import React, {useState} from 'react';
import { View, Text, Button, Modal, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Place, Spot} from '@/src/types';
import {Ionicons} from "@expo/vector-icons";
import { useTheme } from '@/src/context/ThemeContext';

type PlaceFavorite = {
    place_id: string;
    place_name: string;
    place_type: string;
    lat: number;
    lng: number;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    topLoading: boolean;
    topRated: (Spot & { avg: number; count: number })[];
    onLoadSkateparks: () => void;
    onLoadTopRated: () => void;
    onSelectSpot: (spot: Spot) => void;
    onSignOut: () => void;
    onSearch: (tag: string) => void;
    onClearSearch: () => void;
    hasSearchResults: boolean;
    searchResults: Spot[];
    favorites: Spot[];
    favLoading: boolean;
    onLoadSkateShops: () => void;
    parksLoading: boolean;
    shopsLoading: boolean;
    placeFavorites: PlaceFavorite[];
    placeFavLoading: boolean;
    onSelectPlace: (place: Place) => void;
    onOpenSettings: () => void;
};

export function ExplorePanel({
                                 visible, onClose, parksLoading, shopsLoading, topLoading,
                                 topRated, onLoadSkateparks, onLoadSkateShops, onLoadTopRated, onSelectSpot, onSignOut, onSearch, onClearSearch, hasSearchResults, searchResults,
                                 favorites, favLoading, placeFavorites, placeFavLoading, onSelectPlace, onOpenSettings
                             }: Props) {

    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const c = theme.colors;
    const [searchQuery, setSearchQuery] = useState('');
    const [favoritesOpen, setFavoritesOpen] = useState(false);
    const [parkFavoritesOpen, setParkFavoritesOpen] = useState(false);
    const [shopFavoritesOpen, setShopFavoritesOpen] = useState(false);

    function handleSearch() {
        if (!searchQuery.trim()) return;
        onSearch(searchQuery.trim());
    }

    function handleClear() {
        setSearchQuery('');
        onClearSearch();
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={onClose}>
                <Pressable
                    style={{
                        paddingTop: insets.top,
                        width: 280,
                        height: '100%',
                        backgroundColor: c.panelBg,
                        padding: 16,
                        flexDirection: 'column',
                    }}
                    onPress={() => {}}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: c.text }}>Explore</Text>

                        <Text style={{ fontSize: 10, fontWeight: '600', marginBottom: 12, color: c.text }}>Search By Tag</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            <TextInput
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search by tag..."
                                placeholderTextColor={c.placeholder}
                                autoCapitalize="none"
                                returnKeyType="search"
                                onSubmitEditing={handleSearch}
                                style={{ flex: 1, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, padding: 10, color: c.text, backgroundColor: c.surface }}
                            />
                            {hasSearchResults ? (
                                <Pressable onPress={handleClear} style={{ justifyContent: 'center', padding: 8 }}>
                                    <Text style={{ color: c.danger }}>Clear</Text>
                                </Pressable>
                            ) : null}
                        </View>

                        {searchResults.length > 0 ? (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontWeight: '600', marginBottom: 8, color: c.text }}>
                                    Search Results ({searchResults.length})
                                </Text>
                                {searchResults.map(s => (
                                    <Pressable
                                        key={s.id}
                                        style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border }}
                                        onPress={() => onSelectSpot(s)}
                                    >
                                        <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                        {s.tags.length > 0 ? (
                                            <Text style={{ opacity: 0.6, fontSize: 12, marginTop: 2, color: c.text }}>
                                                {s.tags.map(t => `#${t}`).join(' ')}
                                            </Text>
                                        ) : null}
                                    </Pressable>
                                ))}
                            </View>
                        ) : null}

                        <Pressable
                            onPress={() => setFavoritesOpen(prev => !prev)}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border, marginBottom: 8 }}
                        >
                            <Text style={{ fontWeight: '800', color: c.text }}>
                                {favLoading ? 'Loading...' : `Favorite Spots (${favorites.length})`}
                            </Text>
                            <Ionicons name={favoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.subtext} />
                        </Pressable>

                        {favoritesOpen ? (
                            favorites.length > 0 ? (
                                favorites.map(s => (
                                    <Pressable
                                        key={s.id}
                                        style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border }}
                                        onPress={() => { setFavoritesOpen(false); onSelectSpot(s); }}
                                    >
                                        <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                        {s.tags?.length > 0 ? (
                                            <Text style={{ opacity: 0.6, fontSize: 12, marginTop: 2, color: c.text }}>
                                                {s.tags.map(t => `#${t}`).join(' ')}
                                            </Text>
                                        ) : null}
                                    </Pressable>
                                ))
                            ) : (
                                <Text style={{ opacity: 0.5, fontSize: 13, marginBottom: 16, color: c.text }}>No favorites yet</Text>
                            )
                        ) : null}

                        <Pressable
                            onPress={() => setParkFavoritesOpen(prev => !prev)}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border, marginBottom: 8 }}
                        >
                            <Text style={{ fontWeight: '800', color: c.text }}>
                                {placeFavLoading ? 'Loading...' : `Favorite Skate Parks (${placeFavorites.filter(f => f.place_type === 'skatepark').length})`}
                            </Text>
                            <Ionicons name={parkFavoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.subtext} />
                        </Pressable>

                        {parkFavoritesOpen ? (
                            placeFavorites.filter(f => f.place_type === 'skatepark').length > 0 ? (
                                placeFavorites.filter(f => f.place_type === 'skatepark').map(f => (
                                    <Pressable
                                        key={f.place_id}
                                        style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border }}
                                        onPress={() => {
                                            setParkFavoritesOpen(false);
                                            onSelectPlace({ id: f.place_id, name: f.place_name, type: f.place_type as 'skatepark' | 'skateshop', lat: f.lat, lng: f.lng, tags: {} });
                                        }}
                                    >
                                        <Text style={{ fontWeight: '600', color: c.text }}>{f.place_name}</Text>
                                    </Pressable>
                                ))
                            ) : (
                                <Text style={{ opacity: 0.5, fontSize: 13, marginBottom: 16, color: c.text }}>No favorites yet</Text>
                            )
                        ) : null}

                        <Pressable
                            onPress={() => setShopFavoritesOpen(prev => !prev)}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border, marginBottom: 8 }}
                        >
                            <Text style={{ fontWeight: '800', color: c.text }}>
                                {placeFavLoading ? 'Loading...' : `Favorite Skate Shops (${placeFavorites.filter(f => f.place_type === 'skateshop').length})`}
                            </Text>
                            <Ionicons name={shopFavoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.subtext} />
                        </Pressable>

                        {shopFavoritesOpen ? (
                            placeFavorites.filter(f => f.place_type === 'skateshop').length > 0 ? (
                                placeFavorites.filter(f => f.place_type === 'skateshop').map(f => (
                                    <Pressable
                                        key={f.place_id}
                                        style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border }}
                                        onPress={() => {
                                            setShopFavoritesOpen(false);
                                            onSelectPlace({ id: f.place_id, name: f.place_name, type: f.place_type as 'skatepark' | 'skateshop', lat: f.lat, lng: f.lng, tags: {} });
                                        }}
                                    >
                                        <Text style={{ fontWeight: '600', color: c.text }}>{f.place_name}</Text>
                                    </Pressable>
                                ))
                            ) : (
                                <Text style={{ opacity: 0.5, fontSize: 13, marginBottom: 16, color: c.text }}>No favorites yet</Text>
                            )
                        ) : null}

                        <View style={{ height: 12 }} />
                        <Pressable
                            onPress={onLoadSkateparks}
                            disabled={parksLoading}
                            style={{ backgroundColor: c.tagBg, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: parksLoading ? 0.6 : 1, marginBottom: 12 }}
                        >
                            <Ionicons name="flag-outline" size={16} color={c.text} />
                            <Text style={{ color: c.text, fontWeight: '600' }}>
                                {parksLoading ? 'Searching...' : 'Local Skate Parks'}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={onLoadSkateShops}
                            disabled={shopsLoading}
                            style={{ backgroundColor: c.tagBg, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: shopsLoading ? 0.6 : 1, marginBottom: 12 }}
                        >
                            <Ionicons name="storefront-outline" size={16} color={c.text} />
                            <Text style={{ color: c.text, fontWeight: '600' }}>
                                {shopsLoading ? 'Searching...' : 'Local Skate Shops'}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={onLoadTopRated}
                            disabled={topLoading}
                            style={{ backgroundColor: c.tagBg, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: topLoading ? 0.6 : 1, marginBottom: 16 }}
                        >
                            <Ionicons name="star-outline" size={16} color={c.text} />
                            <Text style={{ color: c.text, fontWeight: '600' }}>
                                {topLoading ? 'Loading...' : 'Top Rated Nearby'}
                            </Text>
                        </Pressable>

                        {topRated.map(s => (
                            <Pressable
                                key={s.id}
                                style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border }}
                                onPress={() => onSelectSpot(s)}
                            >
                                <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                <Text style={{ opacity: 0.7, color: c.text }}>{s.avg.toFixed(1)} ★ ({s.count})</Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 16, marginTop: 19 }}>
                        <Pressable
                            onPress={onOpenSettings}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1, borderColor: c.border }}
                        >
                            <Ionicons name="settings-outline" size={18} color={c.text} />
                            <Text style={{ fontSize: 15, color: c.text }}>Settings</Text>
                        </Pressable>
                        <Pressable
                            onPress={onSignOut}
                            style={{ padding: 12, borderRadius: 8, backgroundColor: c.tagBg, alignItems: 'center' }}
                        >
                            <Text style={{ color: c.danger, fontWeight: '600' }}>Sign out</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}