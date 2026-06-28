import React from 'react';
import { View } from 'react-native';
import { PinMarker } from '@/src/components/SpotMarkers/PinMarker';
import { SelectedPulse } from '@/src/components/SpotMarkers/SelectedPulse';

type Props = {
    selected: boolean;
};

export function MySpotMarker({ selected }: Props) {
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <SelectedPulse selected={selected} />
            <PinMarker
                color="#FFD700"
                size={64}
                icon={require('@/assets/pin-images/SkateboardOnly.png')}
                iconX={6}
                iconY={8}
                iconWidth={63}
                iconHeight={63}
            />
        </View>
    );
}
