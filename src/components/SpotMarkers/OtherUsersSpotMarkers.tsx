import React from 'react';
import { View } from 'react-native';

type Props = {
    selected: boolean;
};

export function OtherUsersSpotMarkers({ selected }: Props) {
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
                    backgroundColor: selected ? '#FF6B6B' : '#2C2C2E',
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
