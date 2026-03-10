import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';

type Props = {
    id: string;
    lat: number;
    lng: number;
    name: string;
    type?: 'skatepark' | 'skateshop';
    onPress?: () => void;
};

export const SkateMarker = forwardRef<any, Props>(({ id, lat, lng, name, type = 'skatepark', onPress }, ref) => {
    const isShop = type === 'skateshop';

    return (
        <Marker
            ref={ref}
            coordinate={{ latitude: lat, longitude: lng }}
            title={name}
            onPress={onPress}
            tracksViewChanges={false}
        >
            <View
                style={{
                    backgroundColor: isShop ? '#f6ff0e' : '#ff0000',
                    borderRadius: 20,
                    padding: 4,
                    borderWidth: 2,
                    borderColor: 'white',
                }}
            >
                <Text style={{ fontSize: 20 }}>{isShop ? '🛒' : '🛹'}</Text>
            </View>
        </Marker>
    )
})

SkateMarker.displayName = 'SkateMarker'