import React from 'react';
import { View, Text, Pressable } from 'react-native';

type Props = {
    value: number;
    onChange: (v: number) => void;
    size?: number;
    disabled?: boolean;
};

export function Stars({ value, onChange, size = 26, disabled = false }: Props) {
    return (
        <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                    key={n}
                    disabled={disabled}
                    onPress={() => onChange(n)}
                >
                    <Text style={{ fontSize: size }}>
                        {n <= value ? '★' : '☆'}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}