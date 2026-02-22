import React from 'react';
import { View, Text, Button, Modal, ScrollView, Pressable } from 'react-native';
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
};

export function ExplorePanel({
                                 visible, onClose, placesLoading, topLoading,
                                 topRated, onLoadSkateparks, onLoadTopRated, onSelectSpot,
                             }: Props) {
    const insets = useSafeAreaInsets();

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
                    <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Explore</Text>

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
                </Pressable>
            </Pressable>
        </Modal>
    );
}