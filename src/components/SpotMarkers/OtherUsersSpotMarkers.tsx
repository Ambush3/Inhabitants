import React from 'react';
import { View } from 'react-native';

type Props = {
    selected: boolean;
    isFriend?: boolean;
};

export function OtherUsersSpotMarkers({ selected, isFriend }: Props) {
    const baseColor = isFriend ? '#5856D6' : '#2C2C2E';
    return (
        <View
            style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <View
                style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: selected ? '#FF6B6B' : baseColor,
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
