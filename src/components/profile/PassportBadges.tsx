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

function nextLocked(tiers: Tier[], value: number): Tier | null {
  return [...tiers].reverse().find((t) => value < t.threshold) ?? null;
}

export function longestStreakFromDates(dates: string[]): number {
  const days = [...new Set(dates.map((date) => new Date(date).toISOString().slice(0, 10)))].sort();
  if (days.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i += 1) {
    const previous = new Date(`${days[i - 1]}T00:00:00Z`).getTime();
    const next = new Date(`${days[i]}T00:00:00Z`).getTime();
    if (next - previous === 24 * 60 * 60 * 1000) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function ProfileBadgeSummary({
  longestStreak,
  parksSkated,
  spotsVisited,
  showLabel = true,
}: {
  longestStreak: number;
  parksSkated: number;
  spotsVisited: number;
  showLabel?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const earned = [
    highest(STREAK_TIERS, longestStreak),
    highest(PARK_TIERS, parksSkated),
    highest(SPOT_TIERS, spotsVisited),
  ].filter((t): t is Tier => t != null);
  if (earned.length === 0) return null;

  return (
    <View style={{ alignItems: 'center' }}>
      {showLabel ? (
        <Text style={{ color: c.subtext, fontSize: 10, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 6 }}>
          Earned badges
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
        {earned.map((badge) => (
          <View key={badge.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.tagBg, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 }}>
            <Text style={{ fontSize: 13 }}>{badge.icon}</Text>
            <Text style={{ color: c.text, fontSize: 11, fontWeight: '700' }}>{badge.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
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

  const locked = [
    { tier: nextLocked(STREAK_TIERS, longestStreak), value: longestStreak },
    { tier: nextLocked(PARK_TIERS, parksSkated), value: parksSkated },
    { tier: nextLocked(SPOT_TIERS, spotsVisited), value: spotsVisited },
  ].filter((l): l is { tier: Tier; value: number } => l.tier != null);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.6,
          color: c.subtext,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
        Badges
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
        {locked.map(({ tier, value }) => (
          <View
            key={`locked-${tier.label}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: c.border,
              opacity: 0.55,
            }}>
            <Text style={{ fontSize: 14 }}>{tier.icon}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.subtext }}>{tier.label}</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: c.subtext }}>
              {value}/{tier.threshold}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
