import React, {useState} from 'react';
import { View, Text, Button, Modal, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spot } from '@/src/types';

type Props = {
    visible: boolean;
    onClose: () => void;
    placesLoading: boolean;
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
};

export function ExplorePanel({
                                 visible, onClose, placesLoading, topLoading,
                                 topRated, onLoadSkateparks, onLoadTopRated, onSelectSpot, onSignOut, onSearch, onClearSearch, hasSearchResults, searchResults
                             }: Props) {

    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');

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
                        backgroundColor: 'white',
                        padding: 16,
                    }}
                    onPress={() => {}}
                >
                    <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Explore </Text>

                    <Text style={{ fontSize: 10, fontWeight: '600', marginBottom: 12 }}>Search By Tag </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search by tag..."
                            autoCapitalize="none"
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                            style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 }}
                        />
                        {hasSearchResults ? (
                            <Pressable
                                onPress={handleClear}
                                style={{ justifyContent: 'center', padding: 8 }}
                            >
                                <Text style={{ color: 'red' }}>Clear</Text>
                            </Pressable>
                        ) : null}
                    </View>

                    {searchResults.length > 0 ? (
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontWeight: '600', marginBottom: 8 }}>
                                Search Results ({searchResults.length})
                            </Text>
                            <ScrollView style={{ maxHeight: 200 }}>
                                {searchResults.map(s => (
                                    <Pressable
                                        key={s.id}
                                        style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}
                                        onPress={() => {
                                            onSelectSpot(s);
                                        }}
                                    >
                                        <Text style={{ fontWeight: '600' }}>{s.name}</Text>
                                        {s.tags.length > 0 ? (
                                            <Text style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>
                                                {s.tags.map(t => `#${t}`).join(' ')}
                                            </Text>
                                        ) : null}
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    ) : null}

                    <Button
                        title={placesLoading ? 'Searching...' : 'Local Skateparks'}
                        onPress={onLoadSkateparks}
                        disabled={placesLoading}
                    />

                    <View style={{ height: 12 }} />

                    <Button
                        title={topLoading ? 'Loading...' : 'Top Rated Nearby'}
                        onPress={onLoadTopRated}
                        disabled={topLoading}
                    />

                    <View style={{ height: 16 }} />

                    <ScrollView>
                        {topRated.map(s => (
                            <Pressable
                                key={s.id}
                                style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}
                                onPress={() => onSelectSpot(s)}
                            >
                                <Text style={{ fontWeight: '600' }}>{s.name}</Text>
                                <Text style={{ opacity: 0.7 }}>{s.avg.toFixed(1)} ★ ({s.count})</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                    <View style={{ borderTopWidth: 1, borderColor: '#eee', paddingTop: 16, marginTop: 16 }}>
                        <Pressable
                            onPress={onSignOut}
                            style={{ padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' }}
                        >
                            <Text style={{ color: 'red', fontWeight: '600' }}>Sign out</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}