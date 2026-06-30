import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

type Ownership = 'mine' | 'friends' | 'community';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

type Props = {
  search: string;
  onSearchChange: (text: string) => void;
  ownershipFilter: Set<Ownership>;
  onToggleOwnership: (key: Ownership) => void;
  difficultyFilter: Set<Difficulty>;
  onToggleDifficulty: (key: Difficulty) => void;
  style?: StyleProp<ViewStyle>;
};

const OWNERSHIP: { key: Ownership; label: string }[] = [
  { key: 'mine', label: 'Mine' },
  { key: 'friends', label: 'Friends' },
  { key: 'community', label: 'Community' },
];

const DIFFICULTY: { key: Difficulty; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

export function MapControls({
  search,
  onSearchChange,
  ownershipFilter,
  onToggleOwnership,
  difficultyFilter,
  onToggleDifficulty,
  style,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 16,
          backgroundColor: active ? c.accent : c.surface,
          borderWidth: 1,
          borderColor: active ? c.accent : c.border,
          marginRight: 8,
        }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#ffffff' : c.text }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={style} pointerEvents="box-none">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: c.surface,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 9,
          borderWidth: 1,
          borderColor: c.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 4,
        }}>
        <Ionicons name="search" size={18} color={c.subtext} />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search spots & tags"
          placeholderTextColor={c.placeholder}
          style={{ flex: 1, fontSize: 15, color: c.text, padding: 0 }}
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => onSearchChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={c.subtext} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingVertical: 8, paddingRight: 12 }}>
        {OWNERSHIP.map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            active={ownershipFilter.has(o.key)}
            onPress={() => onToggleOwnership(o.key)}
          />
        ))}
        <View style={{ width: 1, backgroundColor: c.border, marginRight: 8, marginVertical: 4 }} />
        {DIFFICULTY.map((d) => (
          <Chip
            key={d.key}
            label={d.label}
            active={difficultyFilter.has(d.key)}
            onPress={() => onToggleDifficulty(d.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
