import React, {useState} from 'react';
import { View, Text, Button, Modal, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Place, Spot} from '@/src/types';
import {Ionicons} from "@expo/vector-icons";

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
};

export function ExplorePanel({
                                 visible, onClose, parksLoading, shopsLoading, topLoading,
                                 topRated, onLoadSkateparks, onLoadSkateShops, onLoadTopRated, onSelectSpot, onSignOut, onSearch, onClearSearch, hasSearchResults, searchResults,
                                 favorites, favLoading, placeFavorites, placeFavLoading, onSelectPlace
                             }: Props) {

    const insets = useSafeAreaInsets();
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
            <Pressable style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.3)'}} onPress={onClose}>
                <Pressable
                    style={{
                        paddingTop: insets.top,
                        width: 280,
                        height: '100%',
                        backgroundColor: 'white',
                        padding: 16,
                        flexDirection: 'column',
                    }}
                    onPress={() => {
                    }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{fontSize: 18, fontWeight: '600', marginBottom: 12}}>Explore</Text>

                        <Text style={{fontSize: 10, fontWeight: '600', marginBottom: 12}}>Search By Tag</Text>
                        <View style={{flexDirection: 'row', gap: 8, marginBottom: 16}}>
                            <TextInput
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search by tag..."
                                autoCapitalize="none"
                                returnKeyType="search"
                                onSubmitEditing={handleSearch}
                                style={{flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10}}
                            />
                            {hasSearchResults ? (
                                <Pressable onPress={handleClear} style={{justifyContent: 'center', padding: 8}}>
                                    <Text style={{color: 'red'}}>Clear</Text>
                                </Pressable>
                            ) : null}
                        </View>

                        {searchResults.length > 0 ? (
                            <View style={{marginBottom: 16}}>
                                <Text style={{fontWeight: '600', marginBottom: 8}}>
                                    Search Results ({searchResults.length})
                                </Text>
                                {searchResults.map(s => (
                                    <Pressable
                                        key={s.id}
                                        style={{paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee'}}
                                        onPress={() => onSelectSpot(s)}
                                    >
                                        <Text style={{fontWeight: '600'}}>{s.name}</Text>
                                        {s.tags.length > 0 ? (
                                            <Text style={{opacity: 0.6, fontSize: 12, marginTop: 2}}>
                                                {s.tags.map(t => `#${t}`).join(' ')}
                                            </Text>
                                        ) : null}
                                    </Pressable>
                                ))}
                            </View>
                        ) : null}

                        <Pressable
                            onPress={() => setFavoritesOpen(prev => !prev)}
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingVertical: 10,
                                borderBottomWidth: 1,
                                borderColor: '#eee',
                                marginBottom: 8
                            }}
                        >
                            <Text style={{fontWeight: '800'}}>
                                {favLoading ? 'Loading...' : `Favorite Spots (${favorites.length})`}
                            </Text>
                            <Ionicons name={favoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#999"/>
                        </Pressable>

                        {favoritesOpen ? (
                            favorites.length > 0 ? (
                                favorites.map(s => (
                                    <Pressable
                                        key={s.id}
                                        style={{paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee'}}
                                        onPress={() => {
                                            setFavoritesOpen(false);
                                            onSelectSpot(s);
                                        }}
                                    >
                                        <Text style={{fontWeight: '600'}}>{s.name}</Text>
                                        {s.tags?.length > 0 ? (
                                            <Text style={{opacity: 0.6, fontSize: 12, marginTop: 2}}>
                                                {s.tags.map(t => `#${t}`).join(' ')}
                                            </Text>
                                        ) : null}
                                    </Pressable>
                                ))
                            ) : (
                                <Text style={{opacity: 0.5, fontSize: 13, marginBottom: 16}}>No favorites yet</Text>
                            )
                        ) : null}

                        <Pressable
                            onPress={() => setParkFavoritesOpen(prev => !prev)}
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingVertical: 10,
                                borderBottomWidth: 1,
                                borderColor: '#eee',
                                marginBottom: 8
                            }}
                        >
                            <Text style={{fontWeight: '800'}}>
                                {placeFavLoading ? 'Loading...' : `Favorite Skate Parks (${placeFavorites.filter(f => f.place_type === 'skatepark').length})`}
                            </Text>
                            <Ionicons name={parkFavoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#999"/>
                        </Pressable>

                        {parkFavoritesOpen ? (
                            placeFavorites.filter(f => f.place_type === 'skatepark').length > 0 ? (
                                placeFavorites.filter(f => f.place_type === 'skatepark').map(f => (
                                    <Pressable
                                        key={f.place_id}
                                        style={{paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee'}}
                                        onPress={() => {
                                            setParkFavoritesOpen(false);
                                            onSelectPlace({
                                                id: f.place_id,
                                                name: f.place_name,
                                                type: f.place_type as 'skatepark' | 'skateshop',
                                                lat: f.lat,
                                                lng: f.lng,
                                                tags: {}
                                            });
                                        }}
                                    >
                                        <Text style={{fontWeight: '600'}}>{f.place_name}</Text>
                                    </Pressable>
                                ))
                            ) : (
                                <Text style={{opacity: 0.5, fontSize: 13, marginBottom: 16}}>No favorites yet</Text>
                            )
                        ) : null}

                        <Pressable
                            onPress={() => setShopFavoritesOpen(prev => !prev)}
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingVertical: 10,
                                borderBottomWidth: 1,
                                borderColor: '#eee',
                                marginBottom: 8
                            }}
                        >
                            <Text style={{fontWeight: '800'}}>
                                {placeFavLoading ? 'Loading...' : `Favorite Skate Shops (${placeFavorites.filter(f => f.place_type === 'skateshop').length})`}
                            </Text>
                            <Ionicons name={shopFavoritesOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#999"/>
                        </Pressable>

                        {shopFavoritesOpen ? (
                            placeFavorites.filter(f => f.place_type === 'skateshop').length > 0 ? (
                                placeFavorites.filter(f => f.place_type === 'skateshop').map(f => (
                                    <Pressable
                                        key={f.place_id}
                                        style={{paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee'}}
                                        onPress={() => {
                                            setShopFavoritesOpen(false);
                                            onSelectPlace({
                                                id: f.place_id,
                                                name: f.place_name,
                                                type: f.place_type as 'skatepark' | 'skateshop',
                                                lat: f.lat,
                                                lng: f.lng,
                                                tags: {}
                                            });
                                        }}
                                    >
                                        <Text style={{fontWeight: '600'}}>{f.place_name}</Text>
                                    </Pressable>
                                ))
                            ) : (
                                <Text style={{opacity: 0.5, fontSize: 13, marginBottom: 16}}>No favorites yet</Text>
                            )
                        ) : null}

                        <View style={{height: 12}}/>
                        <Button title={parksLoading ? 'Searching...' : 'Local Skate Parks'} onPress={onLoadSkateparks}
                                disabled={parksLoading}/>
                        <View style={{height: 12}}/>
                        <Button title={shopsLoading ? 'Searching...' : 'Local Skate Shops'} onPress={onLoadSkateShops}
                                disabled={shopsLoading}/>
                        <View style={{height: 12}}/>
                        <Button title={topLoading ? 'Loading...' : 'Top Rated Nearby'} onPress={onLoadTopRated}
                                disabled={topLoading}/>
                        <View style={{height: 16}}/>

                        {topRated.map(s => (
                            <Pressable
                                key={s.id}
                                style={{paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee'}}
                                onPress={() => onSelectSpot(s)}
                            >
                                <Text style={{fontWeight: '600'}}>{s.name}</Text>
                                <Text style={{opacity: 0.7}}>{s.avg.toFixed(1)} ★ ({s.count})</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                    <View style={{borderTopWidth: 1, borderColor: '#eee', paddingTop: 16, marginTop: 19}}>
                        <Pressable
                            onPress={onSignOut}
                            style={{padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center'}}
                        >
                            <Text style={{color: 'red', fontWeight: '600'}}>Sign out</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}