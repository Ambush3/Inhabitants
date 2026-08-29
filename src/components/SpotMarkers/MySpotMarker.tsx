import React from 'react';
import { View } from 'react-native';
import { PinMarker } from '@/src/components/SpotMarkers/PinMarker';
import { SelectedPulse } from '@/src/components/SpotMarkers/SelectedPulse';
import { useMarkerStyle } from '@/src/context/MarkerStyleContext';

type Props = {
    selected: boolean;
};

export function MySpotMarker({ selected }: Props) {
    const { style } = useMarkerStyle();

    return (
        <View style={{ width: 48, height: 64, alignItems: 'center', justifyContent: 'center' }}>
            <SelectedPulse selected={selected} />
            <PinMarker
                color="#FFD700"
                size={64}
                glyphPath={style.path}
                glyphViewBox={style.viewBox}
                icon={require('@/assets/pin-images/SkateboardOnly.png')}
                iconX={6}
                iconY={8}
                iconWidth={63}
                iconHeight={63}
            />
        </View>
    );
}
