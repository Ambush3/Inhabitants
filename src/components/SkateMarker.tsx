import React from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';

type Props = {
    id: string;
    lat: number;
    lng: number;
    name: string;
};

export function SkateMarker({ id, lat, lng, name }: Props) {
    return (
        <Marker
            key={id}
            coordinate={{ latitude: lat, longitude: lng }}
            title={name}
        >
            <View
                style={{
                    backgroundColor: '#FFD700',
                    borderRadius: 20,
                    padding: 4,
                    borderWidth: 2,
                    borderColor: 'white',
                }}
            >
                <Text style={{ fontSize: 20 }}>🛹</Text>
            </View>
        </Marker>
    );
}