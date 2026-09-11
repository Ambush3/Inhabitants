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
  notes?: string;
  startedAt: string;
  endedAt?: string;
  activeSeconds?: number;
  activeStartedAt?: string;
  pausedAt?: string;
  serverId?: string;
  stops: LiveSessionStop[];
};

const ACTIVE_KEY = 'live_session_active_v1';
const HISTORY_KEY = 'live_session_history_v1';

function keyFor(key: string, userId: string | null): string {
  return `${key}:${userId ?? 'guest'}`;
}

function stopKey(stop: Pick<LiveSessionStop, 'id' | 'type'>): string {
  return `${stop.type}:${stop.id}`;
}

export function getLiveSessionActiveSeconds(session: LiveSession, now = Date.now()): number {
  if (session.activeSeconds == null) {
    const end = new Date(session.endedAt ?? now).getTime();
    return Math.max(0, Math.round((end - new Date(session.startedAt).getTime()) / 1000));
  }

  if (!session.activeStartedAt || session.pausedAt || session.endedAt) {
    return Math.max(0, session.activeSeconds);
  }

  return Math.max(
    0,
    session.activeSeconds + Math.round((now - new Date(session.activeStartedAt).getTime()) / 1000)
  );
}

export function formatLiveSessionDuration(session: LiveSession, now = Date.now()): string {
  const seconds = getLiveSessionActiveSeconds(session, now);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return seconds > 0 && minutes === 0 ? '<1m' : `${minutes}m`;
}

export function isLiveSessionPaused(session: LiveSession): boolean {
  return Boolean(session.pausedAt && !session.endedAt);
}

export function useLiveSession(userId: string | null) {
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [lastCompleted, setLastCompleted] = useState<LiveSession | null>(null);
  const [history, setHistory] = useState<LiveSession[]>([]);
  const creatingServerSession = useRef<Promise<string | null> | null>(null);
  const endingServerSessions = useRef(new Set<string>());
  const persistingServerSession = useRef(Promise.resolve());

  const ensureServerSession = useCallback(async (): Promise<string | null> => {
    if (!userId || !activeSession) return null;
    if (activeSession.serverId) return activeSession.serverId;
    if (creatingServerSession.current) return creatingServerSession.current;

    const creation = (async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .insert({
          user_id: userId,
          title: activeSession.title,
          notes: activeSession.notes ?? null,
          started_at: activeSession.startedAt,
          active_seconds: activeSession.activeSeconds ?? null,
          active_started_at: activeSession.activeStartedAt ?? null,
          paused_at: activeSession.pausedAt ?? null,
        })
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
        const activeRow = rows.find((row) => !row.ended_at && !endingServerSessions.current.has(row.id));
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
        const stopKeysBySession = new Map<string, Set<string>>();
        for (const row of stopRows) {
          const stops = stopsBySession.get(row.session_id) ?? [];
          const stopKeySet = stopKeysBySession.get(row.session_id) ?? new Set<string>();
          const key = stopKey({ id: row.spot_id ?? row.place_id, type: row.stop_type });
          if (stopKeySet.has(key)) continue;
          stops.push({
            id: row.spot_id ?? row.place_id,
            name: row.name,
            lat: row.lat,
            lng: row.lng,
            type: row.stop_type,
            addedAt: row.added_at,
          });
          stopsBySession.set(row.session_id, stops);
          stopKeySet.add(key);
          stopKeysBySession.set(row.session_id, stopKeySet);
        }
        const mapRemote = (row: any): LiveSession => ({
          id: `live-${row.id}`,
          serverId: row.id,
          title: row.title,
          notes: row.notes ?? undefined,
          startedAt: row.started_at,
          endedAt: row.ended_at ?? undefined,
          activeSeconds: row.active_seconds ?? undefined,
          activeStartedAt: row.active_started_at ?? undefined,
          pausedAt: row.paused_at ?? undefined,
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
        const remoteServerIds = new Set(remoteHistory.map((session) => session.serverId).filter(Boolean));
        const seenSessionKeys = new Set<string>([
          ...remoteHistory.map((session) => session.serverId ?? session.id),
        ]);
        const mergedHistory = [
          ...remoteHistory,
          ...localHistory.filter((session) => {
            const key = session.serverId ?? session.id;
            if (remoteIds.has(session.id) || remoteServerIds.has(session.serverId) || seenSessionKeys.has(key)) return false;
            seenSessionKeys.add(key);
            return true;
          }),
        ];
        setActiveSession(activeRow ? mapRemote(activeRow) : null);
        setHistory(mergedHistory.slice(0, 25));
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

      await supabase
        .from('live_sessions')
        .update({
          notes: current.notes ?? null,
          active_seconds: current.activeSeconds ?? null,
          active_started_at: current.activeStartedAt ?? null,
          paused_at: current.pausedAt ?? null,
        })
        .eq('id', serverId)
        .eq('user_id', userId);

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

    persistingServerSession.current = persistingServerSession.current.then(
      persistActiveSession,
      persistActiveSession
    );
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
      activeSeconds: 0,
      activeStartedAt: new Date().toISOString(),
      stops: firstStop ? [{ ...firstStop, addedAt: new Date().toISOString() }] : [],
    };
    setLastCompleted(null);
    setActiveSession(session);
  }, []);

  const addStop = useCallback((stop: Omit<LiveSessionStop, 'addedAt'>) => {
    setActiveSession((current) => {
      if (!current || current.stops.some((item) => stopKey(item) === stopKey(stop))) return current;
      return { ...current, stops: [...current.stops, { ...stop, addedAt: new Date().toISOString() }] };
    });
  }, []);

  const removeStop = useCallback((stopId: string) => {
    setActiveSession((current) =>
      current ? { ...current, stops: current.stops.filter((stop) => stop.id !== stopId) } : current
    );
  }, []);

  const pauseSession = useCallback(() => {
    setActiveSession((current) => {
      if (!current || isLiveSessionPaused(current)) return current;
      const pausedAt = new Date().toISOString();
      const activeSeconds = getLiveSessionActiveSeconds(current, new Date(pausedAt).getTime());
      return { ...current, activeSeconds, activeStartedAt: undefined, pausedAt };
    });
  }, []);

  const resumeSession = useCallback(() => {
    setActiveSession((current) => {
      if (!current || !isLiveSessionPaused(current)) return current;
      return { ...current, activeStartedAt: new Date().toISOString(), pausedAt: undefined };
    });
  }, []);

  const endSession = useCallback(async (): Promise<LiveSession | null> => {
    if (!activeSession || !userId) return null;
    const endedAt = new Date().toISOString();
    const completed = {
      ...activeSession,
      endedAt,
      activeSeconds: getLiveSessionActiveSeconds(activeSession, new Date(endedAt).getTime()),
      activeStartedAt: undefined,
      pausedAt: undefined,
    };
    if (activeSession.serverId) endingServerSessions.current.add(activeSession.serverId);

    setLastCompleted(completed);
    setActiveSession(null);
    const historyKey = keyFor(HISTORY_KEY, userId);
    setHistory((current) => [completed, ...current.filter((item) => item.id !== completed.id)].slice(0, 25));

    void (async () => {
      let serverId = activeSession.serverId;
      if (!serverId) {
        const { data } = await supabase
          .from('live_sessions')
          .insert({
            user_id: userId,
            title: completed.title,
            notes: completed.notes ?? null,
            started_at: completed.startedAt,
            active_seconds: completed.activeSeconds ?? null,
            active_started_at: null,
            paused_at: null,
          })
          .select('id')
          .single();
        serverId = data?.id;
      }
      if (serverId) {
        await supabase
          .from('live_sessions')
          .update({
            ended_at: completed.endedAt,
            notes: completed.notes ?? null,
            active_seconds: completed.activeSeconds ?? null,
            active_started_at: null,
            paused_at: null,
          })
          .eq('id', serverId)
          .eq('user_id', userId);
        endingServerSessions.current.delete(serverId);
      }
      try {
        const raw = await AsyncStorage.getItem(historyKey);
        const stored = raw ? (JSON.parse(raw) as LiveSession[]) : [];
        const nextHistory = [completed, ...stored.filter((item) => item.id !== completed.id)].slice(0, 25);
        await AsyncStorage.setItem(historyKey, JSON.stringify(nextHistory));
        await AsyncStorage.removeItem(keyFor(ACTIVE_KEY, userId));
      } catch {}
    })();
    return completed;
  }, [activeSession, userId]);

  const clearLastCompleted = useCallback(() => setLastCompleted(null), []);

  const updateSessionNotes = useCallback(async (session: LiveSession, notes: string): Promise<boolean> => {
    if (!userId) return false;
    const trimmed = notes.trim();
    if (session.serverId) {
      const { error } = await supabase
        .from('live_sessions')
        .update({ notes: trimmed || null })
        .eq('id', session.serverId)
        .eq('user_id', userId);
      if (error) return false;
    }

    const update = (item: LiveSession): LiveSession =>
      item.id === session.id ? { ...item, notes: trimmed || undefined } : item;
    const nextHistory = history.map(update);
    setHistory(nextHistory);
    setLastCompleted((current) => (current?.id === session.id ? update(current) : current));
    setActiveSession((current) => (current?.id === session.id ? update(current) : current));
    try {
      await AsyncStorage.setItem(keyFor(HISTORY_KEY, userId), JSON.stringify(nextHistory));
    } catch {}
    return true;
  }, [history, userId]);

  const deleteSession = useCallback(async (session: LiveSession): Promise<boolean> => {
    if (!userId) return false;
    if (session.serverId) {
      const { error } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', session.serverId)
        .eq('user_id', userId);
      if (error) return false;
    }

    const nextHistory = history.filter((item) => item.id !== session.id);
    setHistory(nextHistory);
    if (lastCompleted?.id === session.id) setLastCompleted(null);
    await AsyncStorage.setItem(keyFor(HISTORY_KEY, userId), JSON.stringify(nextHistory));
    return true;
  }, [history, lastCompleted, userId]);

  return {
    activeSession,
    lastCompleted,
    startSession,
    addStop,
    removeStop,
    pauseSession,
    resumeSession,
    endSession,
    clearLastCompleted,
    updateSessionNotes,
    deleteSession,
    ensureServerSession,
    history,
  };
}
