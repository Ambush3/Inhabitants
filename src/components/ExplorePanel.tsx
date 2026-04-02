import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Place, Spot } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { AnimatedSpotCard } from '@/src/components/AnimatedSpotCard'
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import {TopRatedItem} from "@/src/hooks/useTopRated";

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
    topRated: TopRatedItem[];
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
    const [topRatedTab, setTopRatedTab] = useState<'spot' | 'skatepark' | 'skateshop'>('spot')

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

    const favParks = [
        ...placeFavorites.filter(f => f.place_type === 'skatepark'),
    ];
    const favParkSpots = favorites.filter(s => s.spot_type === 'skatepark');

    const favShops = [
        ...placeFavorites.filter(f => f.place_type === 'skateshop'),
    ];
    const favShopSpots = favorites.filter(s => s.spot_type === 'skateshop');

    const myActualSpots = mySpots.filter(s => s.spot_type === 'spot');
    const myCreatedParks = mySpots.filter(s => s.spot_type === 'skatepark');
    const myCreatedShops = mySpots.filter(s => s.spot_type === 'skateshop');

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
                                    <Image source={require('@/assets/pin-images/icons8-ramp-80.png')} style={{ width: 24, height: 24 }} />
                                    <Text style={{ color: c.text, fontWeight: '600' }}>{parksLoading ? 'Searching...' : 'Local Skate Parks'}</Text>
                                </Pressable>

                                <Pressable
                                    onPress={onLoadSkateShops}
                                    disabled={shopsLoading}
                                    style={{ backgroundColor: c.tagBg, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: shopsLoading ? 0.6 : 1, marginBottom: 10 }}
                                >
                                    <Image source={require('@/assets/pin-images/icons8-shop-80.png')} style={{ width: 24, height: 24 }} />
                                    <Text style={{ color: c.text, fontWeight: '600' }}>{shopsLoading ? 'Searching...' : 'Local Skate Shops'}</Text>
                                </Pressable>

                                <Pressable
                                    onPress={onLoadTopRated}
                                    disabled={topLoading}
                                    style={{ backgroundColor: c.tagBg, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: topLoading ? 0.6 : 1, marginBottom: 10 }}
                                >
                                    <Text style={{ fontSize: 16 }}>⭐</Text>
                                    <Text style={{ color: c.text, fontWeight: '600' }}>{topLoading ? 'Searching...' : 'Top Rated Nearby'}</Text>
                                </Pressable>

                                {topRated.length > 0 ? (
                                    <View style={{ marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                                            {(['spot', 'skatepark', 'skateshop'] as const).map(type => {
                                                const labels = { spot: 'Spots', skatepark: 'Parks', skateshop: 'Shops' }
                                                const isActive = topRatedTab === type
                                                return (
                                                    <Pressable
                                                        key={type}
                                                        onPress={() => setTopRatedTab(type)}
                                                        style={{
                                                            flex: 1,
                                                            paddingVertical: 6,
                                                            borderRadius: 6,
                                                            borderWidth: 1,
                                                            borderColor: isActive ? '#007AFF' : c.inputBorder,
                                                            backgroundColor: isActive ? '#007AFF' : c.surface,
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? 'white' : c.subtext }}>
                                                            {labels[type]}
                                                        </Text>
                                                    </Pressable>
                                                )
                                            })}
                                        </View>

                                        {topRated.filter(s => s.spot_type === topRatedTab).length === 0 ? (
                                            <Text style={{ color: c.subtext, fontSize: 13, opacity: 0.6 }}>No top rated {topRatedTab === 'spot' ? 'spots' : topRatedTab === 'skatepark' ? 'parks' : 'shops'} nearby.</Text>
                                        ) : (
                                            topRated.filter(s => s.spot_type === topRatedTab).map((s, index) => (
                                                <AnimatedSpotCard key={s.id} index={index}>
                                                    <Pressable
                                                        style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border }}
                                                        onPress={() => {
                                                            if ('isPlace' in s && s.isPlace) {
                                                                onSelectPlace({
                                                                    id: s.id,
                                                                    name: s.name,
                                                                    lat: s.lat,
                                                                    lng: s.lng,
                                                                    type: s.type as 'skatepark' | 'skateshop',
                                                                    tags: {},
                                                                });
                                                            } else {
                                                                onSelectSpot(s as Spot);
                                                            }
                                                        }}
                                                    >
                                                        <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                                        <Text style={{ opacity: 0.7, fontSize: 12, color: c.text }}>{s.avg.toFixed(1)} ★ ({s.count})</Text>
                                                    </Pressable>
                                                </AnimatedSpotCard>
                                            ))
                                        )}
                                    </View>
                                ) : null}
                            </View>
                        ) : null}

                        {activeTab === 'myspots' ? (
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <Text style={{ fontSize: 16 }}>📍</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '600', color: c.subtext, letterSpacing: 0.8 }}>MY SPOTS</Text>
                                </View>
                                {mySpotsLoading ? (
                                    <Text style={{ color: c.subtext, fontSize: 13 }}>Loading...</Text>
                                ) : myActualSpots.length === 0 ? (
                                    <Text style={{ color: c.subtext, fontSize: 13, opacity: 0.6 }}>You haven&apos;t created any spots yet.</Text>
                                ) : (
                                    myActualSpots.map((s, index) => (
                                        <AnimatedSpotCard key={s.id} index={index}>
                                            <Swipeable
                                                renderLeftActions={() => (
                                                    <Pressable
                                                        onPress={() => onDeleteSpot(s)}
                                                        style={{ justifyContent: 'center', alignItems: 'center', width: 75, backgroundColor: c.danger, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, marginVertical: 2, gap: 4 }}
                                                    >
                                                        <Ionicons name="trash-outline" size={18} color="white" />
                                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>Delete</Text>
                                                    </Pressable>
                                                )}
                                                onSwipeableOpen={(direction) => { if (direction === 'right') onDeleteSpot(s); }}
                                                renderRightActions={() => (
                                                    <Pressable
                                                        onPress={() => onToggleSpotPrivacy(s)}
                                                        style={{ justifyContent: 'center', alignItems: 'center', width: 75, backgroundColor: s.is_private ? '#34C759' : '#FF9500', borderTopRightRadius: 8, borderBottomRightRadius: 8, marginVertical: 2, gap: 4 }}
                                                    >
                                                        <Ionicons name={s.is_private ? 'lock-open-outline' : 'lock-closed'} size={18} color="white" />
                                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>{s.is_private ? 'Public' : 'Private'}</Text>
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
                                                            <Text style={{ opacity: 0.6, fontSize: 12, marginTop: 2, color: c.text }}>{s.tags.map(t => `#${t}`).join(' ')}</Text>
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

                                {myCreatedParks.length > 0 ? (
                                    <View style={{ marginTop: 20 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                            <Image source={require('@/assets/pin-images/icons8-ramp-80.png')} style={{ width: 18, height: 18 }} />
                                            <Text style={{ fontSize: 11, fontWeight: '600', color: c.subtext, letterSpacing: 0.8 }}>MY PARKS</Text>
                                        </View>
                                        {myCreatedParks.map((s, index) => (
                                            <AnimatedSpotCard key={s.id} index={index}>
                                                <Swipeable
                                                    renderLeftActions={() => (
                                                        <Pressable
                                                            onPress={() => onDeleteSpot(s)}
                                                            style={{ justifyContent: 'center', alignItems: 'center', width: 75, backgroundColor: c.danger, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, marginVertical: 2, gap: 4 }}
                                                        >
                                                            <Ionicons name="trash-outline" size={18} color="white" />
                                                            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>Delete</Text>
                                                        </Pressable>
                                                    )}
                                                    onSwipeableOpen={(direction) => { if (direction === 'right') onDeleteSpot(s); }}
                                                >
                                                    <Pressable
                                                        onPress={() => onSelectSpot(s)}
                                                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border, gap: 10, backgroundColor: c.panelBg }}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                                        </View>
                                                    </Pressable>
                                                </Swipeable>
                                            </AnimatedSpotCard>
                                        ))}
                                    </View>
                                ) : null}

                                {myCreatedShops.length > 0 ? (
                                    <View style={{ marginTop: 20 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                            <Image source={require('@/assets/pin-images/icons8-shop-80.png')} style={{ width: 18, height: 18 }} />
                                            <Text style={{ fontSize: 11, fontWeight: '600', color: c.subtext, letterSpacing: 0.8 }}>MY SHOPS</Text>
                                        </View>
                                        {myCreatedShops.map((s, index) => (
                                            <AnimatedSpotCard key={s.id} index={index}>
                                                <Swipeable
                                                    renderLeftActions={() => (
                                                        <Pressable
                                                            onPress={() => onDeleteSpot(s)}
                                                            style={{ justifyContent: 'center', alignItems: 'center', width: 75, backgroundColor: c.danger, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, marginVertical: 2, gap: 4 }}
                                                        >
                                                            <Ionicons name="trash-outline" size={18} color="white" />
                                                            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>Delete</Text>
                                                        </Pressable>
                                                    )}
                                                    onSwipeableOpen={(direction) => { if (direction === 'right') onDeleteSpot(s); }}
                                                >
                                                    <Pressable
                                                        onPress={() => onSelectSpot(s)}
                                                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border, gap: 10, backgroundColor: c.panelBg }}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                                        </View>
                                                    </Pressable>
                                                </Swipeable>
                                            </AnimatedSpotCard>
                                        ))}
                                    </View>
                                ) : null}
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
                                        {favLoading ? 'Loading...' : `Spots (${favorites.filter(s => s.spot_type === 'spot').length})`}
                                    </Text>
                                    <Ionicons name={favoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.subtext} />
                                </Pressable>
                                {favoritesOpen ? (
                                    favorites.filter(s => s != null && s.spot_type === 'spot').length > 0 ? favorites.filter(s => s != null && s.spot_type === 'spot').map((s, index) => (
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
                                        {placeFavLoading ? 'Loading...' : `Parks (${favParks.length + favParkSpots.length})`}
                                    </Text>
                                    <Ionicons name={parkFavoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.subtext} />
                                </Pressable>
                                {parkFavoritesOpen ? (
                                    favParks.length + favParkSpots.length > 0 ? (
                                        <>
                                            {favParkSpots.map((s, index) => (
                                                <AnimatedSpotCard key={s.id} index={index}>
                                                    <Pressable
                                                        style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border, paddingLeft: 12 }}
                                                        onPress={() => { setParkFavoritesOpen(false); onSelectSpot(s); }}
                                                    >
                                                        <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                                    </Pressable>
                                                </AnimatedSpotCard>
                                            ))}
                                            {favParks.map((f, index) => (
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
                                            ))}
                                        </>
                                    ) : (
                                        <Text style={{ opacity: 0.5, fontSize: 13, padding: 12, color: c.text }}>No favorites yet</Text>
                                    )
                                ) : null}

                                <Pressable
                                    onPress={() => setShopFavoritesOpen(prev => !prev)}
                                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border, marginBottom: 4, marginTop: 8 }}
                                >
                                    <Text style={{ fontWeight: '700', color: c.text }}>
                                        {placeFavLoading ? 'Loading...' : `Shops (${favShops.length + favShopSpots.length})`}
                                    </Text>
                                    <Ionicons name={shopFavoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.subtext} />
                                </Pressable>
                                {shopFavoritesOpen ? (
                                    favShops.length + favShopSpots.length > 0 ? (
                                        <>
                                            {favShopSpots.map((s, index) => (
                                                <AnimatedSpotCard key={s.id} index={index}>
                                                    <Pressable
                                                        style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border, paddingLeft: 12 }}
                                                        onPress={() => { setShopFavoritesOpen(false); onSelectSpot(s); }}
                                                    >
                                                        <Text style={{ fontWeight: '600', color: c.text }}>{s.name}</Text>
                                                    </Pressable>
                                                </AnimatedSpotCard>
                                            ))}
                                            {favShops.map((f, index) => (
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
                                            ))}
                                        </>
                                    ) : (
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