export type User = {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  /** Optional; filled once Apple/Google sign-in stores a real name. */
  display_name?: string | null;
  first_name?: string | null;
};

export type SportTemplate = {
  id: string;
  name: string;
  category: 'sports' | 'cards' | 'board' | 'custom';
  players_per_side: number;
  score_direction: 'higher_wins' | 'lower_wins';
  score_mode: 'points' | 'win_loss';
  side_kind?: 'player' | 'team';
  typical_win_score?: number | null;
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
  score_shape?: 'points' | 'sets';
  side_kind?: 'player' | 'team';
  typical_win_score?: number | null;
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
  icon?: string | null;
  invite_code?: string;
  share_url?: string | null;
  role?: string;
  sports: Sport[];
  game_count?: number;
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
  plus_minus?: number;
  rank?: number;
};

export type SportStats = {
  sport_id: number;
  year: string;
  min_games: number;
  total_games: number;
  stats: PlayerStat[];
  occasional_stats?: PlayerStat[];
  years?: Array<{ year: string; games: number }>;
  today_stats?: PlayerStat[];
};

export type SportGamesPage = {
  games: Game[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type PlayerProfile = {
  sport_id: number;
  sport_name?: string;
  player: string;
  year: string;
  wins: number;
  losses: number;
  games: number;
  win_pct: number;
  plus_minus: number;
  streak: string;
  rank: number | null;
  field_size: number;
  last_results: string[];
  min_games?: number;
  min_games_pct?: number;
  partners: PlayerStat[];
  occasional_partners?: PlayerStat[];
  opponents: PlayerStat[];
  occasional_opponents?: PlayerStat[];
  player_games?: Game[];
  avatar_url?: string | null;
  can_edit?: boolean;
  share_url?: string | null;
  league?: Pick<League, 'id' | 'name' | 'slug' | 'visibility' | 'icon' | 'share_url'>;
  sport?: Pick<Sport, 'id' | 'name' | 'template_id' | 'category' | 'score_mode' | 'players_per_side'>;
};
