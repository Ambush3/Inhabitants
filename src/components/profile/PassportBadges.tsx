import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

type Tier = { threshold: number; label: string; icon: string };
type BadgeKind = 'streak' | 'parks' | 'spots';
type BadgeDetail = {
  tier: Tier;
  kind: BadgeKind;
  value: number;
  metricLabel: string;
  description: string;
  next: Tier | null;
  earned: boolean;
};

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

function badgeDetail(kind: BadgeKind, tier: Tier, value: number): BadgeDetail {
  const tiers = kind === 'streak' ? STREAK_TIERS : kind === 'parks' ? PARK_TIERS : SPOT_TIERS;
  const higherTiers = tiers.filter((candidate) => candidate.threshold > tier.threshold);
  const earned = value >= tier.threshold;
  return {
    tier,
    kind,
    value,
    metricLabel: kind === 'streak' ? 'Best streak' : kind === 'parks' ? 'Parks visited' : 'Spots visited',
    description:
      kind === 'streak'
        ? 'Earned by checking in on consecutive days.'
        : kind === 'parks'
          ? 'Earned by visiting unique parks.'
          : 'Earned by checking into unique public spots.',
    next: earned ? (higherTiers.length > 0 ? higherTiers[higherTiers.length - 1] : null) : tier,
    earned,
  };
}

function BadgeDetailsModal({ detail, onClose }: { detail: BadgeDetail | null; onClose: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  if (!detail) return null;
  const progressTarget = detail.next?.threshold ?? detail.tier.threshold;
  const progress = Math.min(detail.value / progressTarget, 1);

  return (
    <Modal visible={detail !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Text style={{ fontSize: 34 }}>{detail.tier.icon}</Text>
            <Text style={{ color: c.text, fontSize: 22, fontWeight: '800', marginTop: 6 }}>{detail.tier.label}</Text>
            <Text style={{ color: c.subtext, textAlign: 'center', marginTop: 6 }}>{detail.description}</Text>
          </View>
          <View style={{ backgroundColor: c.tagBg, borderRadius: 14, padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: c.subtext, fontWeight: '600' }}>{detail.metricLabel}</Text>
              <Text style={{ color: c.text, fontWeight: '800' }}>{detail.value}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' }}>
              <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: c.accent }} />
            </View>
          </View>
          {detail.next ? (
            <Text style={{ color: c.subtext, marginTop: 14, textAlign: 'center' }}>
              {detail.earned ? 'Next' : 'Progress'}:{' '}
              <Text style={{ color: c.text, fontWeight: '700' }}>{detail.next.label}</Text> at {detail.next.threshold}
            </Text>
          ) : (
            <Text style={{ color: c.subtext, marginTop: 14, textAlign: 'center' }}>Highest badge in this category</Text>
          )}
          <Pressable onPress={onClose} style={{ marginTop: 20, alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ color: c.accent, fontSize: 16, fontWeight: '700' }}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
  const [selectedBadge, setSelectedBadge] = React.useState<BadgeDetail | null>(null);
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
          <Pressable key={badge.label} onPress={() => setSelectedBadge(badgeDetail(badge.label.includes('Streak') || badge.label.includes('Warrior') || badge.label.includes('Strong') || badge.label === 'Century' ? 'streak' : badge.label.includes('Park') ? 'parks' : 'spots', badge, badge.label.includes('Streak') ? longestStreak : badge.label.includes('Park') ? parksSkated : spotsVisited))} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.tagBg, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 }}>
            <Text style={{ fontSize: 13 }}>{badge.icon}</Text>
            <Text style={{ color: c.text, fontSize: 11, fontWeight: '700' }}>{badge.label}</Text>
          </Pressable>
        ))}
      </View>
      <BadgeDetailsModal detail={selectedBadge} onClose={() => setSelectedBadge(null)} />
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
  const [selectedBadge, setSelectedBadge] = React.useState<BadgeDetail | null>(null);

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
          <Pressable
            key={t.label}
            onPress={() => setSelectedBadge(badgeDetail(t.label.includes('Streak') || t.label.includes('Warrior') || t.label.includes('Strong') || t.label === 'Century' ? 'streak' : t.label.includes('Park') ? 'parks' : 'spots', t, t.label.includes('Streak') ? longestStreak : t.label.includes('Park') ? parksSkated : spotsVisited))}
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
          </Pressable>
        ))}
        {locked.map(({ tier, value }) => (
          <Pressable
            key={`locked-${tier.label}`}
            onPress={() => setSelectedBadge(badgeDetail(tier.label.includes('Streak') || tier.label.includes('Warrior') || tier.label.includes('Strong') || tier.label === 'Century' ? 'streak' : tier.label.includes('Park') ? 'parks' : 'spots', tier, value))}
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
          </Pressable>
        ))}
      </View>
      <BadgeDetailsModal detail={selectedBadge} onClose={() => setSelectedBadge(null)} />
    </View>
  );
}
