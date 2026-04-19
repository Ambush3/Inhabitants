import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

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

    const pulseScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2.2],
    });

    const pulseOpacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 0],
    });

    return (
        <View
            style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {selected ? (
                <Animated.View
                    style={{
                        position: 'absolute',
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: '#FFD700',
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                    }}
                />
            ) : null}
            <View
                style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: '#FFD700',
                    borderWidth: 2.5,
                    borderColor: 'white',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.35,
                    shadowRadius: 3,
                }}
            />
        </View>
    );
}
