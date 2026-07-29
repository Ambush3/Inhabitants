import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { ActivityData } from '@/src/hooks/useStreak';
import { FireStreakIcon } from '@/src/components/icons/FireStreakIcon';

type Props = {
  activityData: ActivityData;
  loading: boolean;
};

export function StreakCard({ activityData, loading }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const streak = activityData.currentStreak;
  const lit = !loading && streak > 0;

  const last7 = useMemo(() => {
    const today = new Date();
    const arr: { key: string; letter: string; skated: boolean; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-CA');
      arr.push({
        key,
        letter: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        skated: (activityData.grid.get(key) ?? 0) > 0,
        isToday: i === 0,
      });
    }
    return arr;
  }, [activityData]);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: c.tagBg,
        borderRadius: 14,
        padding: 16,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FireStreakIcon size={46} lit={lit} color={c.subtext} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text
            style={{
              fontSize: 34,
              fontWeight: '800',
              color: lit ? '#FF6A00' : c.text,
              lineHeight: 38,
            }}>
            {loading ? '—' : streak}
          </Text>
          <Text style={{ fontSize: 13, color: c.subtext, marginTop: 1 }}>
            day streak
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>
            {loading ? '—' : activityData.longestStreak}
          </Text>
          <Text style={{ fontSize: 11, color: c.subtext, marginTop: 2 }}>Best streak</Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 18,
        }}>
        {last7.map((d, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 11, color: c.subtext }}>{d.letter}</Text>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: d.skated ? '#34C759' : c.background,
                borderWidth: d.skated ? 0 : d.isToday ? 2 : 1,
                borderColor: d.isToday ? '#34C759' : c.border,
              }}>
              {d.skated ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
            </View>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 12, color: c.subtext, marginTop: 16, textAlign: 'center' }}>
        {loading ? '' : `${activityData.totalDaysActive} days skated all-time`}
      </Text>
    </View>
  );
}
