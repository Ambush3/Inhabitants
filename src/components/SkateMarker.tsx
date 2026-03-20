import React, { forwardRef } from 'react';
import {View, Text, Image} from 'react-native';
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
                    backgroundColor: isShop ? '#000000' : '#ff0000',
                    borderRadius: 20,
                    padding: 4,
                    borderWidth: 2,
                    borderColor: 'white',
                }}
            >
                <Image
                    source={isShop
                        ? require('../../assets/icons/skate-shop.png')
                        : require('../../assets/icons/skateboard.png')
                    }
                    style={{ width: 20, height: 18, tintColor: 'white' }}
                />
            </View>
        </Marker>
    )
})

SkateMarker.displayName = 'SkateMarker'