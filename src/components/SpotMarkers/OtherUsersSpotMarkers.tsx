import React from 'react';
import { View } from 'react-native';
import { PinMarker } from '@/src/components/SpotMarkers/PinMarker';
import { SelectedPulse } from '@/src/components/SpotMarkers/SelectedPulse';

type Props = {
    selected: boolean;
    isFriend?: boolean;
    glyphPath?: string | string[] | null;
    glyphViewBox?: string;
};

export function OtherUsersSpotMarkers({ selected, isFriend, glyphPath = null, glyphViewBox }: Props) {
    const color = isFriend ? '#5856D6' : '#8E8E93';

    return (
        <View style={{ width: 48, height: 64, alignItems: 'center', justifyContent: 'center' }}>
            <SelectedPulse selected={selected} />
            <PinMarker
                color={color}
                size={64}
                glyphPath={glyphPath}
                glyphViewBox={glyphViewBox}
                icon={require('@/assets/pin-images/SkateboardOnly.png')}
                iconX={6}
                iconY={8}
                iconWidth={63}
                iconHeight={63}
            />
        </View>
    );
}
