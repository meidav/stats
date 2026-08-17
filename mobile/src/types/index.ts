export type User = {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
};

export type SportTemplate = {
  id: string;
  name: string;
  category: 'sports' | 'cards' | 'board' | 'custom';
  players_per_side: number;
  score_direction: 'higher_wins' | 'lower_wins';
  score_mode: 'points' | 'win_loss';
  default_name: string;
  configurable: boolean;
};

export type Sport = {
  id: number;
  league_id: number;
  name: string;
  template_id: string;
  category?: SportTemplate['category'];
  players_per_side: number;
  score_direction: 'higher_wins' | 'lower_wins';
  score_mode?: 'points' | 'win_loss';
  min_games_for_rank: number;
  created_at: string;
};

export type League = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  visibility: 'public' | 'private' | 'unlisted';
  focus?: 'sports' | 'table' | 'mixed';
  invite_code?: string;
  role?: string;
  sports: Sport[];
  created_at: string;
  updated_at: string;
};

export type Game = {
  id: number;
  sport_id: number;
  league_id: number;
  game_date: string;
  winners: string[];
  losers: string[];
  winner_score: number;
  loser_score: number;
  metadata: Record<string, unknown>;
};

export type PlayerStat = {
  player: string;
  wins: number;
  losses: number;
  games: number;
  win_pct: number;
};

export type SportStats = {
  sport_id: number;
  year: string;
  min_games: number;
  total_games: number;
  stats: PlayerStat[];
};
