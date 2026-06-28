import React, { useState } from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

const ITEMS: { color: string; label: string }[] = [
  { color: '#FFD700', label: 'Your spots' },
  { color: '#5856D6', label: "Friends' spots" },
  { color: '#8E8E93', label: 'Community spots' },
  { color: '#34C759', label: 'Skateparks' },
  { color: '#007AFF', label: 'Shops' },
];

export function MapLegend({ style }: { style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);

  const bg = theme.dark ? 'rgba(20,20,22,0.92)' : 'rgba(255,255,255,0.94)';

  return (
    <View style={style}>
      {open ? (
        <View
          style={{
            backgroundColor: bg,
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: c.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 5,
            elevation: 4,
          }}>
          <Pressable
            onPress={() => setOpen(false)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: c.subtext,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}>
              Legend
            </Text>
            <Ionicons name="chevron-up" size={14} color={c.subtext} />
          </Pressable>
          {ITEMS.map((item) => (
            <View
              key={item.label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: item.color,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.7)',
                }}
              />
              <Text style={{ fontSize: 12, color: c.text }}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: bg,
            borderRadius: 20,
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: c.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 5,
            elevation: 4,
          }}>
          <Ionicons name="list" size={14} color={c.text} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: c.text }}>Key</Text>
        </Pressable>
      )}
    </View>
  );
}
