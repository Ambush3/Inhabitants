export type Spot = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  created_at: string;
  user_id: string | null;
  tags: string[];
  is_private: boolean;
  friends_only: boolean;
  spot_type: 'spot' | 'skatepark' | 'skateshop';
  flag_count: number;
  is_verified: boolean;
  is_flagged: boolean;
  closure_report_count?: number;
  avg_difficulty: number | null;
  difficulty_vote_count: number;
};

export type Review = {
  id: string;
  spot_id: string;
  rating: number;
  comment: string | null;
  text: string | null;
  created_at: string;
  user_id: string | null;
  username?: string;
  avatar_url?: string;
};

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
  type: 'skatepark' | 'skateshop';
};
