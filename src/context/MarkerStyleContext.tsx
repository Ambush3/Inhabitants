import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/src/libs/supabase';
import { usePro } from '@/src/context/ProContext';
import {
  DEFAULT_MARKER_STYLE,
  MarkerStyle,
  MarkerStyleKey,
  markerStyleByKey,
} from '@/src/config/markerStyles';

type MarkerStyleContextType = {
  style: MarkerStyle;
  setStyle: (key: MarkerStyleKey) => Promise<void>;
  reload: () => Promise<void>;
};

const MarkerStyleContext = createContext<MarkerStyleContextType>({
  style: DEFAULT_MARKER_STYLE,
  setStyle: async () => {},
  reload: async () => {},
});

export function MarkerStyleProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<MarkerStyle>(DEFAULT_MARKER_STYLE);
  const { isPro } = usePro();

  // Pro-only. A lapsed subscriber keeps their choice stored but renders as the
  // default, matching what everyone else sees for their spots.
  const style = isPro ? saved : DEFAULT_MARKER_STYLE;

  const reload = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaved(DEFAULT_MARKER_STYLE);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('marker_style')
      .eq('id', user.id)
      .maybeSingle();
    setSaved(markerStyleByKey(data?.marker_style));
  }, []);

  useEffect(() => {
    reload();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      reload();
    });
    return () => sub.subscription.unsubscribe();
  }, [reload]);

  const setStyle = useCallback(async (key: MarkerStyleKey) => {
    setSaved(markerStyleByKey(key));
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ marker_style: key }).eq('id', user.id);
  }, []);

  return (
    <MarkerStyleContext.Provider value={{ style, setStyle, reload }}>
      {children}
    </MarkerStyleContext.Provider>
  );
}

export function useMarkerStyle() {
  return useContext(MarkerStyleContext);
}
