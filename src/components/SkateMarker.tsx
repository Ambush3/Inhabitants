import React, { forwardRef } from 'react';
import { TrackedMarker } from '@/src/components/SpotMarkers/TrackedMarker';
import { PinMarker } from '@/src/components/SpotMarkers/PinMarker';

type Props = {
    id: string;
    lat: number;
    lng: number;
    name: string;
    type?: 'skatepark' | 'skateshop';
    onPress?: () => void;
    selected?: boolean;
};

const TYPE_CONFIG = {
    skatepark: {
        color: '#34C759',
        icon: require('@/assets/pin-images/skatepark-ramp.png'),
        iconX: 15,
        iconY: 14,
        iconWidth: 45,
        iconHeight: 45,
    },
    skateshop: {
        color: '#007AFF',
        icon: require('@/assets/pin-images/skate-shop.png'),
        iconX: 15,
        iconY: 14,
        iconWidth: 45,
        iconHeight: 45,
    },
};

export const SkateMarker = forwardRef<any, Props>(
    ({ id, lat, lng, type = 'skatepark', onPress }, ref) => {
        const config = TYPE_CONFIG[type ?? 'skatepark'];
        return (
            <TrackedMarker
                ref={ref}
                identifier={id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={onPress}
                anchor={{ x: 0.5, y: 1.0 }}
            >
                <PinMarker
                    color={config.color}
                    size={55}
                    icon={config.icon}
                    iconX={config.iconX}
                    iconY={config.iconY}
                    iconWidth={config.iconWidth}
                    iconHeight={config.iconHeight}
                />
            </TrackedMarker>
        );
    }
);

SkateMarker.displayName = 'SkateMarker';
