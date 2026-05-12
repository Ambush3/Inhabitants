import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { PinMarker } from '@/src/components/SpotMarkers/PinMarker';

type Props = {
    selected: boolean;
};

export function MySpotMarker({ selected }: Props) {
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (selected) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(0);
        }
    }, [selected]);

    const pulseOpacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 0],
    });

    const pulseScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2.0],
    });

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {selected ? (
                <Animated.View
                    style={{
                        position: 'absolute',
                        width: 33,
                        height: 44,
                        borderRadius: 16,
                        backgroundColor: '#D9D9D9',
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                    }}
                />
            ) : null}
            <PinMarker
                color={selected ? '#FFD700' : '#FFD700'}
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
