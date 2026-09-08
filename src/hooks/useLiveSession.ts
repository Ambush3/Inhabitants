import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/libs/supabase';

export type LiveSessionStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'spot' | 'skatepark' | 'skateshop';
  addedAt: string;
};

export type LiveSession = {
  id: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  serverId?: string;
  stops: LiveSessionStop[];
};

const ACTIVE_KEY = 'live_session_active_v1';
const HISTORY_KEY = 'live_session_history_v1';

function keyFor(key: string, userId: string | null): string {
  return `${key}:${userId ?? 'guest'}`;
}

export function useLiveSession(userId: string | null) {
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [lastCompleted, setLastCompleted] = useState<LiveSession | null>(null);
  const [history, setHistory] = useState<LiveSession[]>([]);
  const creatingServerSession = useRef<Promise<string | null> | null>(null);

  const ensureServerSession = useCallback(async (): Promise<string | null> => {
    if (!userId || !activeSession) return null;
    if (activeSession.serverId) return activeSession.serverId;
    if (creatingServerSession.current) return creatingServerSession.current;

    const creation = (async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .insert({ user_id: userId, title: activeSession.title, started_at: activeSession.startedAt })
        .select('id')
        .single();
      if (error || !data) return null;
      setActiveSession((existing) =>
        existing?.id === activeSession.id ? { ...existing, serverId: data.id } : existing
      );
      return data.id as string;
    })();
    creatingServerSession.current = creation;
    creation.finally(() => {
      if (creatingServerSession.current === creation) creatingServerSession.current = null;
    });
    return creation;
  }, [activeSession, userId]);

  useEffect(() => {
    if (!userId) {
      setActiveSession(null);
      setHistory([]);
      return;
    }
    Promise.all([
      AsyncStorage.getItem(keyFor(ACTIVE_KEY, userId)),
      AsyncStorage.getItem(keyFor(HISTORY_KEY, userId)),
      supabase
        .from('live_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false }),
    ]).then(async ([activeRaw, historyRaw, remoteResult]) => {
      if (!remoteResult.error) {
        const rows = (remoteResult.data ?? []) as any[];
        // Preserve sessions created by the local MVP until they are ended and
        // re-saved through the server-backed flow.
        if (rows.length === 0 && (activeRaw || historyRaw)) {
          try {
            setActiveSession(activeRaw ? (JSON.parse(activeRaw) as LiveSession) : null);
            setHistory(historyRaw ? (JSON.parse(historyRaw) as LiveSession[]) : []);
            return;
          } catch {
            // Fall through to the empty remote state if the local cache is invalid.
          }
        }
        const activeRow = rows.find((row) => !row.ended_at);
        const completedRows = rows.filter((row) => !!row.ended_at);
        const sessionIds = rows.map((row) => row.id);
        let stopRows: any[] = [];
        if (sessionIds.length > 0) {
          const { data } = await supabase
            .from('live_session_stops')
            .select('*')
            .in('session_id', sessionIds)
            .order('sequence', { ascending: true });
          stopRows = data ?? [];
        }
        const stopsBySession = new Map<string, LiveSessionStop[]>();
        for (const row of stopRows) {
          const stops = stopsBySession.get(row.session_id) ?? [];
          stops.push({
            id: row.spot_id ?? row.place_id,
            name: row.name,
            lat: row.lat,
            lng: row.lng,
            type: row.stop_type,
            addedAt: row.added_at,
          });
          stopsBySession.set(row.session_id, stops);
        }
        const mapRemote = (row: any): LiveSession => ({
          id: `live-${row.id}`,
          serverId: row.id,
          title: row.title,
          startedAt: row.started_at,
          endedAt: row.ended_at ?? undefined,
          stops: stopsBySession.get(row.id) ?? [],
        });
        let localHistory: LiveSession[] = [];
        if (historyRaw) {
          try {
            localHistory = JSON.parse(historyRaw) as LiveSession[];
          } catch {
            localHistory = [];
          }
        }
        const remoteHistory = completedRows.map(mapRemote);
        const remoteIds = new Set(remoteHistory.map((session) => session.id));
        setActiveSession(activeRow ? mapRemote(activeRow) : null);
        setHistory([
          ...remoteHistory,
          ...localHistory.filter((session) => !remoteIds.has(session.id)),
        ].slice(0, 25));
        return;
      }

      if (activeRaw) {
        try {
          setActiveSession(JSON.parse(activeRaw) as LiveSession);
        } catch {
          AsyncStorage.removeItem(keyFor(ACTIVE_KEY, userId)).catch(() => {});
        }
      }
      if (historyRaw) {
        try {
          setHistory(JSON.parse(historyRaw) as LiveSession[]);
        } catch {
          AsyncStorage.removeItem(keyFor(HISTORY_KEY, userId)).catch(() => {});
        }
      }
    });
  }, [userId]);

  useEffect(() => {
    if (!userId || !activeSession) return;
    let cancelled = false;
    const current = activeSession;

    async function persistActiveSession() {
      const serverId = await ensureServerSession();
      if (!serverId || cancelled) return;

      await supabase.from('live_session_stops').delete().eq('session_id', serverId);
      if (current.stops.length > 0) {
        await supabase.from('live_session_stops').insert(
          current.stops.map((stop, index) => ({
            session_id: serverId,
            spot_id: stop.type === 'spot' ? stop.id : null,
            place_id: stop.type === 'spot' ? null : stop.id,
            stop_type: stop.type,
            name: stop.name,
            lat: stop.lat,
            lng: stop.lng,
            sequence: index,
            added_at: stop.addedAt,
          }))
        );
      }
    }

    persistActiveSession();
    return () => {
      cancelled = true;
    };
  }, [activeSession, ensureServerSession, userId]);

  useEffect(() => {
    if (!userId || !activeSession) return;
    AsyncStorage.setItem(keyFor(ACTIVE_KEY, userId), JSON.stringify(activeSession)).catch(() => {});
  }, [activeSession, userId]);

  const startSession = useCallback((title: string, firstStop?: Omit<LiveSessionStop, 'addedAt'>) => {
    const session: LiveSession = {
      id: `live-${Date.now()}`,
      title: title.trim() || 'Skate session',
      startedAt: new Date().toISOString(),
      stops: firstStop ? [{ ...firstStop, addedAt: new Date().toISOString() }] : [],
    };
    setLastCompleted(null);
    setActiveSession(session);
  }, []);

  const addStop = useCallback((stop: Omit<LiveSessionStop, 'addedAt'>) => {
    setActiveSession((current) => {
      if (!current || current.stops.some((item) => item.id === stop.id)) return current;
      return { ...current, stops: [...current.stops, { ...stop, addedAt: new Date().toISOString() }] };
    });
  }, []);

  const removeStop = useCallback((stopId: string) => {
    setActiveSession((current) =>
      current ? { ...current, stops: current.stops.filter((stop) => stop.id !== stopId) } : current
    );
  }, []);

  const endSession = useCallback(async (): Promise<LiveSession | null> => {
    if (!activeSession || !userId) return null;
    const completed = { ...activeSession, endedAt: new Date().toISOString() };
    if (activeSession.serverId) {
      await supabase
        .from('live_sessions')
        .update({ ended_at: completed.endedAt })
        .eq('id', activeSession.serverId)
        .eq('user_id', userId);
    }
    const historyKey = keyFor(HISTORY_KEY, userId);
    try {
      const raw = await AsyncStorage.getItem(historyKey);
      const history = raw ? (JSON.parse(raw) as LiveSession[]) : [];
      const nextHistory = [completed, ...history].slice(0, 25);
      await AsyncStorage.setItem(historyKey, JSON.stringify(nextHistory));
      setHistory(nextHistory);
      await AsyncStorage.removeItem(keyFor(ACTIVE_KEY, userId));
    } catch {
      // The recap is still available in memory if local persistence fails.
    }
    setLastCompleted(completed);
    setActiveSession(null);
    return completed;
  }, [activeSession, userId]);

  const clearLastCompleted = useCallback(() => setLastCompleted(null), []);

  return {
    activeSession,
    lastCompleted,
    startSession,
    addStop,
    removeStop,
    endSession,
    clearLastCompleted,
    ensureServerSession,
    history,
  };
}
