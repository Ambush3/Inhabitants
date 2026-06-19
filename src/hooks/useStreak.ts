import { useState, useCallback } from 'react';
import { supabase } from '@/src/libs/supabase';

export type ActivityData = {
  grid: Map<string, number>;
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
};

export function useStreak() {
  const [activityData, setActivityData] = useState<ActivityData>({
    grid: new Map(),
    currentStreak: 0,
    longestStreak: 0,
    totalDaysActive: 0,
  });
  const [loading, setLoading] = useState(false);

  const loadStreak = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 84);

      const { data } = await supabase
        .from('check_ins')
        .select('checked_in_at')
        .eq('user_id', user.id)
        .gte('checked_in_at', since.toISOString())
        .order('checked_in_at', { ascending: true });

      if (!data) return;

      const grid = new Map<string, number>();
      for (const row of data) {
        const dateKey = new Date(row.checked_in_at).toLocaleDateString('en-CA');
        grid.set(dateKey, (grid.get(dateKey) ?? 0) + 1);
      }

      const today = new Date();
      const todayKey = today.toLocaleDateString('en-CA');
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toLocaleDateString('en-CA');

      let currentStreak = 0;
      const cursor = new Date(today);

      if (grid.has(todayKey)) {
        currentStreak = 1;
        cursor.setDate(cursor.getDate() - 1);
      } else if (grid.has(yesterdayKey)) {
        currentStreak = 1;
        cursor.setDate(cursor.getDate() - 2);
      } else {
        currentStreak = 0;
        cursor.setDate(cursor.getDate() - 1);
      }

      if (currentStreak > 0) {
        while (true) {
          const key = cursor.toLocaleDateString('en-CA');
          if (grid.has(key)) {
            currentStreak++;
            cursor.setDate(cursor.getDate() - 1);
          } else {
            break;
          }
        }
      }

      const { data: allData } = await supabase
        .from('check_ins')
        .select('checked_in_at')
        .eq('user_id', user.id)
        .order('checked_in_at', { ascending: true });

      const allDays = new Set<string>();
      for (const row of allData ?? []) {
        allDays.add(new Date(row.checked_in_at).toLocaleDateString('en-CA'));
      }

      const sortedDays = Array.from(allDays).sort();
      let longestStreak = 0;
      let runLength = 0;

      for (let i = 0; i < sortedDays.length; i++) {
        if (i === 0) {
          runLength = 1;
        } else {
          const prev = new Date(sortedDays[i - 1]);
          const curr = new Date(sortedDays[i]);
          const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            runLength++;
          } else {
            runLength = 1;
          }
        }
        longestStreak = Math.max(longestStreak, runLength);
      }

      setActivityData({
        grid,
        currentStreak,
        longestStreak,
        totalDaysActive: allDays.size,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return { activityData, loading, loadStreak };
}
