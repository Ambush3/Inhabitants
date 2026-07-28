import React, { useMemo, useState } from 'react';
import { View, Text, LayoutChangeEvent, Dimensions } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { ActivityData } from '@/src/hooks/useStreak';

type Props = {
  activityData: ActivityData;
  loading: boolean;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getColor(count: number, isDark: boolean): string {
  if (count === 0) return isDark ? '#3a3f47' : '#d0d7de';
  if (count === 1) return '#9be9a8';
  if (count <= 3) return '#40c463';
  if (count <= 6) return '#30a14e';
  return '#216e39';
}

const GAP = 3;
const CARD_PADDING = 14;
// Fallback estimate before the card measures itself (window − card margins − card padding).
const INITIAL_WIDTH = Dimensions.get('window').width - 16 * 2 - CARD_PADDING * 2;

export function SkateActivityGraph({ activityData, loading }: Props) {
  const { theme, darkMode } = useTheme();
  const c = theme.colors;
  const [gridWidth, setGridWidth] = useState(INITIAL_WIDTH);

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

  const numWeeks = weeks.length;
  const cell = Math.max(6, Math.floor((gridWidth - GAP * (numWeeks - 1)) / numWeeks));
  const colStride = cell + GAP;

  // Month labels: mark the column where a new month begins.
  const monthLabels = useMemo(() => {
    const labels: { col: number; text: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstDay = week.find((d) => d != null);
      if (!firstDay) return;
      const m = new Date(firstDay).getMonth();
      if (m !== lastMonth) {
        labels.push({ col: wi, text: MONTHS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  function onGridLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - gridWidth) > 0.5) setGridWidth(w);
  }

  const todayStr = new Date().toLocaleDateString('en-CA');

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: c.tagBg,
        borderRadius: 12,
        padding: CARD_PADDING,
      }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 14,
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

      <View onLayout={onGridLayout}>
        {/* Month labels */}
        <View style={{ height: 14, marginBottom: 2 }}>
          {monthLabels.map((l) => (
            <Text
              key={`${l.col}-${l.text}`}
              numberOfLines={1}
              style={{
                position: 'absolute',
                left: l.col * colStride,
                fontSize: 10,
                color: c.subtext,
              }}>
              {l.text}
            </Text>
          ))}
        </View>

        {/* Grid */}
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'column', gap: GAP }}>
              {week.map((day, di) => {
                const count = day ? (activityData.grid.get(day) ?? 0) : 0;
                const isToday = day === todayStr;
                return (
                  <View
                    key={di}
                    style={{
                      width: cell,
                      height: cell,
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
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginTop: 10,
          justifyContent: 'flex-end',
        }}>
        <Text style={{ fontSize: 10, color: c.subtext }}>Less</Text>
        {[0, 1, 3, 5, 7].map((n) => (
          <View
            key={n}
            style={{
              width: 11,
              height: 11,
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
