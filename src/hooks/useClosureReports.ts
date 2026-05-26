import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export type ClosureReason = 'demolished' | 'closed' | 'security';

export function useClosureReports(userId: string | null) {
  const [reportedSpotIds, setReportedSpotIds] = useState<Set<string>>(new Set());

  async function loadMyReports() {
    if (!userId) return;
    const { data } = await supabase.from('spot_closure_reports').select('spot_id').eq('user_id', userId);
    setReportedSpotIds(new Set((data ?? []).map((r: any) => r.spot_id)));
  }

  async function reportClosure(spotId: string, reason: ClosureReason): Promise<string | null> {
    if (!userId) return 'Not logged in';
    const { error } = await supabase
      .from('spot_closure_reports')
      .insert({ spot_id: spotId, user_id: userId, reason });
    if (error) return error.message;
    setReportedSpotIds((prev) => new Set([...prev, spotId]));
    return null;
  }

  async function removeReport(spotId: string): Promise<string | null> {
    if (!userId) return 'Not logged in';
    const { error } = await supabase
      .from('spot_closure_reports')
      .delete()
      .eq('spot_id', spotId)
      .eq('user_id', userId);
    if (error) return error.message;
    setReportedSpotIds((prev) => {
      const next = new Set(prev);
      next.delete(spotId);
      return next;
    });
    return null;
  }

  function isReportedByMe(spotId: string): boolean {
    return reportedSpotIds.has(spotId);
  }

  return {
    reportedSpotIds,
    loadMyReports,
    reportClosure,
    removeReport,
    isReportedByMe,
  };
}
