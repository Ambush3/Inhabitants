import React, { forwardRef } from 'react';
import { Image } from 'react-native';
import { Marker } from 'react-native-maps';

type Props = {
    id: string;
    lat: number;
    lng: number;
    name: string;
    type?: 'skatepark' | 'skateshop';
    onPress?: () => void;
    selected?: boolean;
};

const ICONS = {
    skatepark: require('@/assets/pin-images/skatepark-ramp.png'),
    skateshop: require('@/assets/pin-images/skate-shop.png'),
};

export const SkateMarker = forwardRef<any, Props>(
    ({ id, lat, lng, type = 'skatepark', onPress, selected }, ref) => {
        return (
            <Marker
                ref={ref}
                identifier={id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={onPress}
                anchor={{ x: 0.5, y: 1.0 }}
            >
                <Image
                    source={ICONS[type ?? 'skatepark']}
                    style={{ width: 36, height: 36 }}
                    resizeMode="contain"
                />
            </Marker>
        );
    }
);

SkateMarker.displayName = 'SkateMarker';
