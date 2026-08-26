import type { Sport } from '../types';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string } | undefined;
  Home: undefined;
  DiscoverLeagues: undefined;
  CreateLeague: undefined;
  League: { slug: string; name?: string; role?: string };
  EditLeague: {
    slug: string;
    name: string;
    icon?: string | null;
    visibility?: 'public' | 'private' | 'unlisted';
    sportTemplateId?: string;
  };
  AddGame: {
    sportId: number;
    sportName: string;
    templateId?: string;
    playersPerSide: number;
    scoreMode?: 'points' | 'win_loss' | 'optional_points';
    scoresOptional?: boolean;
    sideKind?: 'player' | 'team';
    focus?: 'sports' | 'table' | 'mixed';
    leagueName?: string;
    sportCategory?: Sport['category'];
    gameId?: number;
    winners?: string[];
    losers?: string[];
    winnerScore?: number;
    loserScore?: number;
    gameDate?: string;
    metadata?: Record<string, unknown>;
  };
  PlayerProfile: {
    sportId: number;
    playerName: string;
    sportName: string;
    leagueName: string;
    leagueSlug?: string;
    sportTemplateId?: string;
    sportCategory?: Sport['category'];
    leagueIcon?: string | null;
  };
  EditPlayer: {
    sportId: number;
    playerName: string;
    avatarUrl?: string | null;
    sportName: string;
    leagueName: string;
    leagueSlug?: string;
    sportTemplateId?: string;
    sportCategory?: Sport['category'];
    leagueIcon?: string | null;
  };
};
