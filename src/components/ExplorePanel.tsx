import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Place, Spot } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { AnimatedSpotCard } from '@/src/components/AnimatedSpotCard'
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

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
    onDeleteSpot: (id: Spot) => void;
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
    mySpots: Spot[];
    mySpotsLoading: boolean;
    wishlist: Spot[];
    wishlistLoading: boolean;
    onToggleSpotPrivacy: (spot: Spot) => void;
};

type Tab = 'explore' | 'myspots' | 'favorites';

export function ExplorePanel({
                                 visible, onClose, parksLoading, shopsLoading, topLoading,
                                 topRated, onLoadSkateparks, onLoadSkateShops, onLoadTopRated, onSelectSpot, onSignOut,
                                 onSearch, onClearSearch, hasSearchResults, searchResults,
                                 favorites, favLoading, placeFavorites, placeFavLoading, onSelectPlace, onDeleteSpot, onOpenSettings,
                                 mySpots, mySpotsLoading, wishlist, wishlistLoading, onToggleSpotPrivacy,
                             }: Props) {

    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const c = theme.colors;

    const [activeTab, setActiveTab] = useState<Tab>('explore');
    const [searchQuery, setSearchQuery] = useState('');
    const [favoritesOpen, setFavoritesOpen] = useState(false);
    const [parkFavoritesOpen, setParkFavoritesOpen] = useState(false);
    const [shopFavoritesOpen, setShopFavoritesOpen] = useState(false);
    const [wishlistOpen, setWishlistOpen] = useState(false);

    function handleSearch() {
        if (!searchQuery.trim()) return;
        onSearch(searchQuery.trim());
    }

    function handleClear() {
        setSearchQuery('');
        onClearSearch();
    }

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'explore', label: 'Explore', icon: 'compass-outline' },
        { key: 'myspots', label: 'My Spots', icon: 'pin-outline' },
        { key: 'favorites', label: 'Favorites', icon: 'bookmark-outline' },
    ];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={onClose}>
                <Pressable
                    style={{
                        paddingTop: insets.top,
                        width: 280,
                        height: '100%',
                        backgroundColor: c.panelBg,
                        flexDirection: 'column',
                    }}
                    onPress={() => {}}
                >
                    {/* Tab Bar */}
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: c.border, paddingHorizontal: 8, paddingTop: 12 }}>
                        {tabs.map(tab => (
                            <Pressable
                                key={tab.key}
                                onPress={() => setActiveTab(tab.key)}
                                style={{ flex: 1, alignItems: 'center', paddingBottom: 10, borderBottomWidth: 2, borderColor: activeTab === tab.key ? '#007AFF' : 'transparent' }}
                            >
                                <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? '#007AFF' : c.subtext} />
                                <Text style={{ fontSize: 10, marginTop: 3, color: activeTab === tab.key ? '#007AFF' : c.subtext, fontWeight: activeTab === tab.key ? '600' : '400' }}>
                                    {tab.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>

                        {/* EXPLORE TAB */}
                        {activeTab === 'explore' ? (
                            <View>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: c.subtext, marginBottom: 8, letterSpacing: 0.8 }}>SEARCH BY TAG</Text>
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                    <TextInput
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="e.g. stairs, rails..."
                                        placeholderTextColor={c.placeholder}
                                        autoCapitalize="none"
                                        returnKeyType="search"
                                        onSubmitEditing={handleSearch}
                                        style={{ flex: 1, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, padding: 10, color: c.text, backgroundColor: c.surface, fontSize: 13 }}
                                    />
                                    {hasSearchResults ? (
                                        <Pressable onPress={handleClear} style={{ justifyContent: 'center', padding: 8 }}>
                                            <Text style={{ color: c.danger, fontSize: 13 }}>Clear</Text>
                                        </Pressable>
                                    ) : null}
                                </View>

                                {searchResults.length > 0 ? (
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={{ fontWeight: '600', marginBottom: 8, color: c.text }}>
                                            Results ({searchResults.length})
                                        </Text>
                                        {searchResults.map((s, index) => (
                                            <AnimatedSpotCard key={s.id} index={index}>
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
                                            </AnimatedSpotCard>
                                        ))}
                                    </View>
                                ) : null}

                                <Text style={{ fontSize: 11, fontWeight: '600', color: c.subtext, marginBottom: 8, letterSpacing: 0.8 }}>NEARBY</Text>
                                <Pressable
                                    onPress={onLoadSkateparks}
                                    disabled={parksLoading}
                                    style={{ backgroundColor: c.tagBg, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: parksLoading ? 0.6 : 1, marginBottom: 10 }}
                                >
                                    <Text style={{ fontSize: 15 }}>🛹</Text>
                                    <Text style={{ color: c.text, fontWeight: '600' }}>{parksLoading ? 'Searching...' : 'Local Skate Parks'}</Text>
                                </Pressable>

                                <Pressable
                                    onPress={onLoadSkateShops}
                                    disabled={shopsLoading}
                                    style={{ backgroundColor: c.tagBg, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: shopsLoading ? 0.6 : 1, marginBottom: 10 }}
                                >
                                    <Ionicons name="storefront-outline" size={16} color={c.text} />
                                    <Text style={{ color: c.text, fontWeight: '600' }}>{shopsLoading ? 'Searching...' : 'Local Skate Shops'}</Text>
                                </Pressable>

                                <Pressable
                                    onPress={onLoadTopRated}
                                    disabled={topLoading}
                                    style={{ backgroundColor: c.tagBg, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: topLoading ? 0.6 : 1, marginBottom: 16 }}
                                >
                                    <Ionicons name="star-outline" size={16} color={c.text} />
                                    <Text style={{ color: c.text, fontWeight: '600' }}>{topLoading ? 'Loading...' : 'Top Rated Nearby'}</Text>
                                </Pressable>

                                {topRated.map((s, index) => (
                                    <AnimatedSpotCard key={s.id} index={index}>
                                        <Pressable
                                            key={s.id}
                                            style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border }}
                                            onPress={() => onSelectSpot(s)}
                                        >
                                            <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                            <Text style={{ opacity: 0.7, fontSize: 12, color: c.text }}>{s.avg.toFixed(1)} ★ ({s.count})</Text>
                                        </Pressable>
                                    </AnimatedSpotCard>
                                ))}
                            </View>
                        ) : null}

                        {activeTab === 'myspots' ? (
                            <View>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: c.subtext, marginBottom: 12, letterSpacing: 0.8 }}>MY SPOTS</Text>
                                {mySpotsLoading ? (
                                    <Text style={{ color: c.subtext, fontSize: 13 }}>Loading...</Text>
                                ) : mySpots.length === 0 ? (
                                    <Text style={{ color: c.subtext, fontSize: 13, opacity: 0.6 }}>You haven&apos;t created any spots yet.</Text>
                                ) : (
                                    mySpots.map((s, index) => (
                                        <AnimatedSpotCard key={s.id} index={index}>
                                            <Swipeable
                                                renderLeftActions={() => (
                                                    <Pressable
                                                        onPress={() => onDeleteSpot(s)}
                                                        style={{
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            width: 75,
                                                            backgroundColor: c.danger,
                                                            borderTopLeftRadius: 8,
                                                            borderBottomLeftRadius: 8,
                                                            marginVertical: 2,
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <Ionicons name="trash-outline" size={18} color="white" />
                                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>
                                                            Delete
                                                        </Text>
                                                    </Pressable>
                                                )}
                                                onSwipeableOpen={(direction) => {
                                                    if (direction === 'right') {
                                                        onDeleteSpot(s);
                                                    }
                                                }}
                                                renderRightActions={() => (
                                                    <Pressable
                                                        onPress={() => onToggleSpotPrivacy(s)}
                                                        style={{
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            width: 75,
                                                            backgroundColor: s.is_private ? '#34C759' : '#FF9500',
                                                            borderTopRightRadius: 8,
                                                            borderBottomRightRadius: 8,
                                                            marginVertical: 2,
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <Ionicons
                                                            name={s.is_private ? 'lock-open-outline' : 'lock-closed'}
                                                            size={18}
                                                            color="white"
                                                        />
                                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>
                                                            {s.is_private ? 'Public' : 'Private'}
                                                        </Text>
                                                    </Pressable>
                                                )}
                                            >
                                                <Pressable
                                                    onPress={() => onSelectSpot(s)}
                                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border, gap: 10, backgroundColor: c.panelBg }}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                                        {s.tags?.length > 0 ? (
                                                            <Text style={{ opacity: 0.6, fontSize: 12, marginTop: 2, color: c.text }}>
                                                                {s.tags.map(t => `#${t}`).join(' ')}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    {s.is_private ? (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                            <Ionicons name="lock-closed" size={14} color={c.danger} />
                                                            <Text style={{ fontSize: 11, color: c.danger, fontWeight: '600' }}>Private</Text>
                                                        </View>
                                                    ) : null}
                                                </Pressable>
                                            </Swipeable>
                                        </AnimatedSpotCard>
                                    ))
                                )}
                            </View>
                        ) : null}

                        {/* FAVORITES TAB */}
                        {activeTab === 'favorites' ? (
                            <View>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: c.subtext, marginBottom: 12, letterSpacing: 0.8 }}>FAVORITES</Text>

                                <Pressable
                                    onPress={() => setFavoritesOpen(prev => !prev)}
                                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border, marginBottom: 4 }}
                                >
                                    <Text style={{ fontWeight: '700', color: c.text }}>
                                        {favLoading ? 'Loading...' : `Spots (${favorites.length})`}
                                    </Text>
                                    <Ionicons name={favoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.subtext} />
                                </Pressable>
                                {favoritesOpen ? (
                                    favorites.length > 0 ? favorites.filter(s => s != null).map((s, index) => (
                                        <AnimatedSpotCard key={s.id} index={index}>
                                            <Pressable
                                                style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border, paddingLeft: 12 }}
                                                onPress={() => { setFavoritesOpen(false); onSelectSpot(s); }}
                                            >
                                                <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                                {s.tags?.length > 0 ? (
                                                    <Text style={{ opacity: 0.6, fontSize: 12, marginTop: 2, color: c.text }}>
                                                        {s.tags.map(t => `#${t}`).join(' ')}
                                                    </Text>
                                                ) : null}
                                            </Pressable>
                                        </AnimatedSpotCard>
                                    )) : (
                                        <Text style={{ opacity: 0.5, fontSize: 13, padding: 12, color: c.text }}>No favorites yet</Text>
                                    )
                                ) : null}

                                <Pressable
                                    onPress={() => setParkFavoritesOpen(prev => !prev)}
                                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border, marginBottom: 4, marginTop: 8 }}
                                >
                                    <Text style={{ fontWeight: '700', color: c.text }}>
                                        {placeFavLoading ? 'Loading...' : `Parks (${placeFavorites.filter(f => f.place_type === 'skatepark').length})`}
                                    </Text>
                                    <Ionicons name={parkFavoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.subtext} />
                                </Pressable>
                                {parkFavoritesOpen ? (
                                    placeFavorites.filter(f => f.place_type === 'skatepark').length > 0 ?
                                        placeFavorites.filter(f => f.place_type === 'skatepark').map((f, index) => (
                                            <AnimatedSpotCard key={f.place_id} index={index}>
                                                <Pressable
                                                    style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border, paddingLeft: 12 }}
                                                    onPress={() => {
                                                        setParkFavoritesOpen(false);
                                                        onSelectPlace({ id: f.place_id, name: f.place_name, type: f.place_type as 'skatepark' | 'skateshop', lat: f.lat, lng: f.lng, tags: {} });
                                                    }}
                                                >
                                                    <Text style={{ fontWeight: '600', color: c.text }}>{f.place_name}</Text>
                                                </Pressable>
                                            </AnimatedSpotCard>
                                        )) : (
                                            <Text style={{ opacity: 0.5, fontSize: 13, padding: 12, color: c.text }}>No favorites yet</Text>
                                        )
                                ) : null}

                                <Pressable
                                    onPress={() => setShopFavoritesOpen(prev => !prev)}
                                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border, marginBottom: 4, marginTop: 8 }}
                                >
                                    <Text style={{ fontWeight: '700', color: c.text }}>
                                        {placeFavLoading ? 'Loading...' : `Shops (${placeFavorites.filter(f => f.place_type === 'skateshop').length})`}
                                    </Text>
                                    <Ionicons name={shopFavoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.subtext} />
                                </Pressable>
                                {shopFavoritesOpen ? (
                                    placeFavorites.filter(f => f.place_type === 'skateshop').length > 0 ?
                                        placeFavorites.filter(f => f.place_type === 'skateshop').map((f, index) => (
                                            <AnimatedSpotCard key={f.place_id} index={index}>
                                                <Pressable
                                                    style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border, paddingLeft: 12 }}
                                                    onPress={() => {
                                                        setShopFavoritesOpen(false);
                                                        onSelectPlace({ id: f.place_id, name: f.place_name, type: f.place_type as 'skatepark' | 'skateshop', lat: f.lat, lng: f.lng, tags: {} });
                                                    }}
                                                >
                                                    <Text style={{ fontWeight: '600', color: c.text }}>{f.place_name}</Text>
                                                </Pressable>
                                            </AnimatedSpotCard>
                                        )) : (
                                            <Text style={{ opacity: 0.5, fontSize: 13, padding: 12, color: c.text }}>No favorites yet</Text>
                                        )
                                ) : null}

                                <Pressable
                                    onPress={() => setWishlistOpen(prev => !prev)}
                                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border, marginBottom: 4, marginTop: 8 }}
                                >
                                    <Text style={{ fontWeight: '700', color: c.text }}>
                                        {wishlistLoading ? 'Loading...' : `My Wishlist (${wishlist.length})`}
                                    </Text>
                                    <Ionicons name={wishlistOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.subtext} />
                                </Pressable>
                                {wishlistOpen ? (
                                    wishlist.length > 0 ? wishlist.map((s, index) => (
                                        <AnimatedSpotCard key={s.id} index={index}>
                                            <Pressable
                                                style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border, paddingLeft: 12 }}
                                                onPress={() => { setWishlistOpen(false); onSelectSpot(s); }}
                                            >
                                                <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                                {s.tags?.length > 0 ? (
                                                    <Text style={{ opacity: 0.6, fontSize: 12, marginTop: 2, color: c.text }}>
                                                        {s.tags.map(t => `#${t}`).join(' ')}
                                                    </Text>
                                                ) : null}
                                            </Pressable>
                                        </AnimatedSpotCard>
                                    )) : (
                                        <Text style={{ opacity: 0.5, fontSize: 13, padding: 12, color: c.text }}>No spots wishlisted yet</Text>
                                    )
                                ) : null}
                            </View>
                        ) : null}
                    </ScrollView>

                    {/* Footer */}
                    <View style={{ borderTopWidth: 1, borderColor: c.border, padding: 16 }}>
                        <Pressable
                            onPress={onOpenSettings}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}
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