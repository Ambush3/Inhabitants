import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { ActivityData } from '@/src/hooks/useStreak';

type Props = {
  activityData: ActivityData;
  loading: boolean;
};

function getColor(count: number, isDark: boolean): string {
  if (count === 0) return isDark ? '#1e1e1e' : '#d0d7de';
  if (count === 1) return '#9be9a8';
  if (count <= 3) return '#40c463';
  if (count <= 6) return '#30a14e';
  return '#216e39';
}

export function SkateActivityGraph({ activityData, loading }: Props) {
  const { theme, darkMode } = useTheme();
  const c = theme.colors;

  const weeks = useMemo(() => {
    const today = new Date();
    const days: string[] = [];

    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toLocaleDateString('en-CA'));
    }

    const startPadding = new Date(days[0]).getDay();
    const paddedDays: (string | null)[] = [...Array(startPadding).fill(null), ...days];

    const result: (string | null)[][] = [];
    for (let i = 0; i < paddedDays.length; i += 7) {
      result.push(paddedDays.slice(i, i + 7));
    }
    return result;
  }, []);

  const CELL = 11;
  const GAP = 3;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: c.tagBg,
        borderRadius: 12,
        padding: 14,
      }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#34C759' }}>
            {loading ? '—' : activityData.currentStreak}
          </Text>
          <Text style={{ fontSize: 11, color: c.subtext, marginTop: 2 }}>Current Streak</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>
            {loading ? '—' : activityData.totalDaysActive}
          </Text>
          <Text style={{ fontSize: 11, color: c.subtext, marginTop: 2 }}>Days Active</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>
            {loading ? '—' : activityData.longestStreak}
          </Text>
          <Text style={{ fontSize: 11, color: c.subtext, marginTop: 2 }}>Longest Streak</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'column', gap: GAP }}>
              {week.map((day, di) => {
                const count = day ? (activityData.grid.get(day) ?? 0) : 0;
                const isToday = day === new Date().toLocaleDateString('en-CA');
                return (
                  <View
                    key={di}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 2,
                      backgroundColor: day ? getColor(count, darkMode) : 'transparent',
                      borderWidth: isToday ? 1 : 0,
                      borderColor: isToday ? '#34C759' : 'transparent',
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginTop: 8,
          justifyContent: 'flex-end',
        }}>
        <Text style={{ fontSize: 10, color: c.subtext }}>Less</Text>
        {[0, 1, 3, 5, 7].map((n) => (
          <View
            key={n}
            style={{
              width: CELL,
              height: CELL,
              borderRadius: 2,
              backgroundColor: getColor(n, darkMode),
            }}
          />
        ))}
        <Text style={{ fontSize: 10, color: c.subtext }}>More</Text>
      </View>
    </View>
  );
}
