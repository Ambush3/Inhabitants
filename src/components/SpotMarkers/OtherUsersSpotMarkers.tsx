import React from 'react';
import { View } from 'react-native';
import { PinMarker } from '@/src/components/SpotMarkers/PinMarker';

type Props = {
    selected: boolean;
    isFriend?: boolean;
};

export function OtherUsersSpotMarkers({ selected, isFriend }: Props) {
    const color = selected ? '#FF6B6B' : isFriend ? '#5856D6' : '#8E8E93';

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <PinMarker
                color={color}
                size={55}
                icon={require('@/assets/pin-images/SkateboardOnly.png')}
                iconX={6}
                iconY={8}
                iconWidth={63}
                iconHeight={63}
            />
        </View>
    );
}
