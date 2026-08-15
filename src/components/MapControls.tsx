import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

type Props = {
  search: string;
  onSearchChange: (text: string) => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  style?: StyleProp<ViewStyle>;
  placeTypes: Set<PlaceType>;
  onTogglePlaceType: (key: PlaceType) => void;
  onSubmitSearch?: () => void;
  parksLoading?: boolean;
  shopsLoading?: boolean;
};

export type PlaceType = 'skatepark' | 'skateshop';

const PLACE_TYPES: { key: PlaceType; label: string }[] = [
  { key: 'skatepark', label: 'Parks' },
  { key: 'skateshop', label: 'Shops' },
];

export function MapControls({
  search,
  onSearchChange,
  onOpenFilters,
  activeFilterCount = 0,
  style,
  placeTypes,
  onTogglePlaceType,
  onSubmitSearch,
  parksLoading = false,
  shopsLoading = false,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  function Chip({
    label,
    active,
    onPress,
    loading,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
    loading?: boolean;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
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
        {loading ? <ActivityIndicator size="small" color={active ? '#ffffff' : c.subtext} /> : null}
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
          onSubmitEditing={onSubmitSearch}
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
        contentContainerStyle={{ paddingVertical: 8, paddingRight: 88 }}>
        {onOpenFilters ? (
          <>
            <Pressable
              onPress={onOpenFilters}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: activeFilterCount > 0 ? c.accent : c.surface,
                borderWidth: 1,
                borderColor: activeFilterCount > 0 ? c.accent : c.border,
                marginRight: 8,
              }}>
              <Ionicons
                name="options-outline"
                size={15}
                color={activeFilterCount > 0 ? '#fff' : c.text}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: activeFilterCount > 0 ? '#fff' : c.text,
                }}>
                Filters
              </Text>
              {activeFilterCount > 0 ? (
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: c.accent }}>
                    {activeFilterCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </>
        ) : null}
        {PLACE_TYPES.map((p) => (
          <Chip
            key={p.key}
            label={p.label}
            active={placeTypes.has(p.key)}
            loading={p.key === 'skatepark' ? parksLoading : shopsLoading}
            onPress={() => onTogglePlaceType(p.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
