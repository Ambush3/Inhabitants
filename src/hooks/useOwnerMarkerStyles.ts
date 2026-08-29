import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { markerStyleByKey } from '@/src/config/markerStyles';

const styleCache = new Map<string, string>();

export function useOwnerMarkerStyles(userIds: string[]) {
  const [styles, setStyles] = useState<Record<string, string>>({});

  const key = Array.from(new Set(userIds)).sort().join(',');

  const load = useCallback(async () => {
    const ids = key ? key.split(',') : [];
    const missing = ids.filter((id) => id && !styleCache.has(id));

    if (missing.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, marker_style')
        .eq('is_pro', true)
        .in('id', missing);
      for (const id of missing) styleCache.set(id, 'classic');
      for (const row of (data ?? []) as { id: string; marker_style: string | null }[]) {
        styleCache.set(row.id, markerStyleByKey(row.marker_style).key);
      }
    }

    const next: Record<string, string> = {};
    for (const id of ids) {
      const cached = styleCache.get(id);
      if (cached && cached !== 'classic') next[id] = cached;
    }
    setStyles(next);
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return styles;
}
