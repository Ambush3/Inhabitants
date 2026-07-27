import React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { CrownIcon } from '@/src/components/icons/CrownIcon';

export type SpotType = 'spot' | 'skatepark' | 'skateshop';

export type MapFilters = {
  features: string[];
  ratings: number[];
  types: SpotType[];
  visited: 'all' | 'visited' | 'notvisited';
  verifiedOnly: boolean;
};

export const EMPTY_FILTERS: MapFilters = {
  features: [],
  ratings: [],
  types: [],
  visited: 'all',
  verifiedOnly: false,
};

export const FEATURES: { key: string; label: string; match: string[] }[] = [
  { key: 'stairs', label: 'Stairs', match: ['stair', 'step'] },
  { key: 'ledges', label: 'Ledges', match: ['ledge'] },
  { key: 'rails', label: 'Rails', match: ['rail'] },
  { key: 'gaps', label: 'Gaps', match: ['gap'] },
  { key: 'banks', label: 'Banks', match: ['bank'] },
  { key: 'manual', label: 'Manual pads', match: ['manual', 'manny'] },
  { key: 'bowl', label: 'Bowl', match: ['bowl', 'pool'] },
  { key: 'vert', label: 'Vert / Ramp', match: ['vert', 'ramp', 'halfpipe', 'mini'] },
  { key: 'flat', label: 'Flat', match: ['flat'] },
];

export function spotMatchesFeatures(tags: string[], features: string[]): boolean {
  if (features.length === 0) return true;
  const lower = (tags ?? []).map((t) => t.toLowerCase());
  return features.every((fk) => {
    const feat = FEATURES.find((f) => f.key === fk);
    if (!feat) return true;
    return lower.some((t) => feat.match.some((m) => t.includes(m)));
  });
}

export function countActiveFilters(f: MapFilters): number {
  return (
    f.features.length +
    f.ratings.length +
    f.types.length +
    (f.visited !== 'all' ? 1 : 0) +
    (f.verifiedOnly ? 1 : 0)
  );
}

export function MapFilterSheet({
  visible,
  onClose,
  filters,
  onChange,
  resultCount,
}: {
  visible: boolean;
  onClose: () => void;
  filters: MapFilters;
  onChange: (f: MapFilters) => void;
  resultCount: number;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const activeCount = countActiveFilters(filters);

  function toggleFeature(key: string) {
    onChange({
      ...filters,
      features: filters.features.includes(key)
        ? filters.features.filter((k) => k !== key)
        : [...filters.features, key],
    });
  }

  function toggleRating(r: number) {
    onChange({
      ...filters,
      ratings: filters.ratings.includes(r)
        ? filters.ratings.filter((x) => x !== r)
        : [...filters.ratings, r],
    });
  }

  function toggleType(t: SpotType) {
    onChange({
      ...filters,
      types: filters.types.includes(t)
        ? filters.types.filter((x) => x !== t)
        : [...filters.types, t],
    });
  }

  function Chip({
    label,
    active,
    onPress,
    icon,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 20,
          backgroundColor: active ? c.accent : c.tagBg,
          borderWidth: 1,
          borderColor: active ? c.accent : 'transparent',
        }}>
        {icon ? (
          <Ionicons name={icon} size={14} color={active ? '#fff' : c.subtext} />
        ) : null}
        <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : c.text }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function Section({
    title,
    hint,
    children,
  }: {
    title: string;
    hint?: string;
    children: React.ReactNode;
  }) {
    return (
      <View style={{ marginBottom: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
          <Text
            style={{ fontSize: 12, fontWeight: '700', color: c.subtext, letterSpacing: 0.6 }}>
            {title}
          </Text>
          {hint ? (
            <Text style={{ fontSize: 11, color: c.subtext, opacity: 0.8 }}>({hint})</Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={onClose}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '85%',
            backgroundColor: c.surface,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 18,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              marginBottom: 16,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <CrownIcon size={18} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>Filters</Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={c.subtext} />
            </Pressable>
          </View>

          <ScrollView
            style={{ paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}>
            <Section title="FEATURE">
              {FEATURES.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  active={filters.features.includes(f.key)}
                  onPress={() => toggleFeature(f.key)}
                />
              ))}
            </Section>

            <Section title="RATING">
              {[1, 2, 3, 4, 5].map((r) => (
                <Chip
                  key={r}
                  label={`${r}★`}
                  active={filters.ratings.includes(r)}
                  onPress={() => toggleRating(r)}
                />
              ))}
            </Section>

            <Section title="TYPE">
              {(
                [
                  ['spot', 'Skate Spot'],
                  ['skatepark', 'Skate Park'],
                  ['skateshop', 'Skate Shop'],
                ] as [SpotType, string][]
              ).map(([t, label]) => (
                <Chip
                  key={t}
                  label={label}
                  active={filters.types.includes(t)}
                  onPress={() => toggleType(t)}
                />
              ))}
            </Section>

            <Section title="VISITED">
              {(
                [
                  ['all', 'All'],
                  ['visited', 'Visited'],
                  ['notvisited', 'Not visited'],
                ] as [MapFilters['visited'], string][]
              ).map(([v, label]) => (
                <Chip
                  key={v}
                  label={label}
                  active={filters.visited === v}
                  onPress={() => onChange({ ...filters, visited: v })}
                />
              ))}
            </Section>

            <Section title="TRUST" hint="rated by 3+ skaters">
              <Chip
                label="Verified only"
                icon="shield-checkmark"
                active={filters.verifiedOnly}
                onPress={() => onChange({ ...filters, verifiedOnly: !filters.verifiedOnly })}
              />
            </Section>
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 28,
              borderTopWidth: 1,
              borderTopColor: c.border,
            }}>
            <Pressable
              onPress={() => onChange(EMPTY_FILTERS)}
              disabled={activeCount === 0}
              style={{ paddingVertical: 12, opacity: activeCount === 0 ? 0.4 : 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: c.subtext }}>Clear all</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: c.accent,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                Show {resultCount} {resultCount === 1 ? 'spot' : 'spots'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
