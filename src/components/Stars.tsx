import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

type Props = {
    value: number;
    onChange: (v: number) => void;
    size?: number;
    disabled?: boolean;
};

export function Stars({ value, onChange, size = 26, disabled = false }: Props) {
    const { theme } = useTheme();

    return (
        <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                    key={n}
                    disabled={disabled}
                    onPress={() => onChange(n === value ? 0 : n)}
                >
                    <Text style={{ fontSize: size, color: n <= value ? '#f5a623' : theme.colors.text }}>
                        {n <= value ? '★' : '☆'}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}