import { useState } from 'react';
import { supabase } from '@/src/libs/supabase';

export function useDifficulty() {
  const [newDifficulty, setNewDifficulty] = useState(0);
  const [existingVoteId, setExistingVoteId] = useState<string | null>(null);

  async function loadMyDifficultyVote(spotId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('spot_difficulty_votes')
      .select('*')
      .eq('spot_id', spotId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setExistingVoteId(data.id);
      setNewDifficulty(data.difficulty);
    } else {
      setExistingVoteId(null);
      setNewDifficulty(0);
    }
  }

  async function submitDifficulty(spotId: string, overrideDifficulty?: number): Promise<string | null> {
    const difficulty = overrideDifficulty ?? newDifficulty;
    if (difficulty <= 0) return 'Please choose a difficulty.';

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'You must be logged in to vote.';

    if (existingVoteId) {
      const { error } = await supabase
        .from('spot_difficulty_votes')
        .update({ difficulty })
        .eq('id', existingVoteId);
      if (error) return error.message;
    } else {
      const { error, data } = await supabase
        .from('spot_difficulty_votes')
        .insert({ spot_id: spotId, difficulty, user_id: user.id })
        .select()
        .single();
      if (error) return error.message;
      setExistingVoteId(data.id);
    }

    setNewDifficulty(difficulty);
    return null;
  }

  function resetDifficulty() {
    setNewDifficulty(0);
    setExistingVoteId(null);
  }

  return {
    newDifficulty,
    setNewDifficulty,
    loadMyDifficultyVote,
    submitDifficulty,
    resetDifficulty,
    existingVoteId,
  };
}
