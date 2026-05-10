import React from 'react';
import { View } from 'react-native';
import { PinMarker } from '@/src/components/SpotMarkers/PinMarker';

type Props = {
    selected: boolean;
    isFriend?: boolean;
};

export function OtherUsersSpotMarkers({ selected, isFriend }: Props) {
    const color = isFriend ? '#5856D6' : '#F0E6C8';

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <PinMarker color={selected ? '#FF6B6B' : color} size={44} />
        </View>
    );
}
