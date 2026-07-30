import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

type Tier = { threshold: number; label: string; icon: string };

const STREAK_TIERS: Tier[] = [
  { threshold: 100, label: 'Century', icon: '🔥' },
  { threshold: 30, label: 'Month Strong', icon: '🔥' },
  { threshold: 7, label: 'Week Warrior', icon: '🔥' },
  { threshold: 3, label: '3-Day Streak', icon: '🔥' },
];

const PARK_TIERS: Tier[] = [
  { threshold: 25, label: '25 Parks', icon: '🛹' },
  { threshold: 10, label: '10 Parks', icon: '🛹' },
  { threshold: 5, label: '5 Parks', icon: '🛹' },
  { threshold: 1, label: 'First Park', icon: '🛹' },
];

const SPOT_TIERS: Tier[] = [
  { threshold: 100, label: '100 Spots', icon: '📍' },
  { threshold: 50, label: '50 Spots', icon: '📍' },
  { threshold: 25, label: '25 Spots', icon: '📍' },
  { threshold: 10, label: '10 Spots', icon: '📍' },
];

function highest(tiers: Tier[], value: number): Tier | null {
  return tiers.find((t) => value >= t.threshold) ?? null;
}

export function PassportBadges({
  longestStreak,
  parksSkated,
  spotsVisited,
}: {
  longestStreak: number;
  parksSkated: number;
  spotsVisited: number;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const earned = [
    highest(STREAK_TIERS, longestStreak),
    highest(PARK_TIERS, parksSkated),
    highest(SPOT_TIERS, spotsVisited),
  ].filter((t): t is Tier => t != null);

  if (earned.length === 0) {
    return (
      <Text style={{ fontSize: 12, color: c.subtext, marginBottom: 16, textAlign: 'center' }}>
        Keep skating to earn badges.
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      {earned.map((t) => (
        <View
          key={t.label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: c.tagBg,
          }}>
          <Text style={{ fontSize: 14 }}>{t.icon}</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}
