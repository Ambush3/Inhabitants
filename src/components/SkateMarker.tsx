import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Marker } from 'react-native-maps';
import { Place } from '@/src/types';

type Props = {
    id: string;
    lat: number;
    lng: number;
    name: string;
    type?: 'skatepark' | 'skateshop';
    onPress?: () => void;
};

export function SkateMarker({ id, lat, lng, name, type = 'skatepark', onPress }: Props) {
    const isShop = type === 'skateshop';

    return (
        <Marker
            key={id}
            coordinate={{ latitude: lat, longitude: lng }}
            title={name}
            onPress={onPress}
        >
            <View
                style={{
                    backgroundColor: isShop ? '#22c55e' : '#3b82f6',
                    borderRadius: 20,
                    padding: 4,
                    borderWidth: 2,
                    borderColor: 'white',
                }}
            >
                <Text style={{ fontSize: 20 }}>{isShop ? '🛒' : '🛹'}</Text>
            </View>
        </Marker>
    );
}