import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export type TrickLog = {
  id: string;
  user_id: string;
  spot_id: string;
  trick_name: string;
  logged_at: string;
  created_at: string;
  spot?: {
    name: string;
  };
};

export function useTrickLog() {
  const [trickLogs, setTrickLogs] = useState<TrickLog[]>([]);
  const [spotTrickLogs, setSpotTrickLogs] = useState<TrickLog[]>([]);
  const [loading, setLoading] = useState(false);

  async function logTrick(
    spotId: string,
    trickName: string,
    loggedAt: Date
  ): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not logged in';
    if (!trickName.trim()) return 'Trick name is required';

    const { error } = await supabase.from('trick_logs').insert({
      user_id: user.id,
      spot_id: spotId,
      trick_name: trickName.trim(),
      logged_at: loggedAt.toISOString(),
    });

    if (error) return error.message;
    return null;
  }

  async function loadTrickLogsForSpot(spotId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('trick_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('spot_id', spotId)
      .order('logged_at', { ascending: false });

    setSpotTrickLogs(data ?? []);
  }

  async function loadAllTrickLogs() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    const { data } = await supabase
      .from('trick_logs')
      .select('*, spot:spots(name)')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false });

    setTrickLogs(data ?? []);
    setLoading(false);
  }

  async function deleteTrickLog(id: string): Promise<string | null> {
    const { error } = await supabase
      .from('trick_logs')
      .delete()
      .eq('id', id);

    if (error) return error.message;

    setTrickLogs((prev) => prev.filter((t) => t.id !== id));
    setSpotTrickLogs((prev) => prev.filter((t) => t.id !== id));
    return null;
  }

  return {
    trickLogs,
    spotTrickLogs,
    loading,
    logTrick,
    loadTrickLogsForSpot,
    loadAllTrickLogs,
    deleteTrickLog,
  };
}
