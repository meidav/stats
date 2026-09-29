import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Sport } from '../types';

export type LeagueFlowParams = {
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

export type HomeStackParamList = {
  Home: undefined;
} & LeagueFlowParams;

export type DiscoverStackParamList = {
  DiscoverLeagues: undefined;
} & LeagueFlowParams;

/** Screens that live inside either Home or Discover nested stacks. */
export type LeagueStackParamList = HomeStackParamList & DiscoverStackParamList;

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  DiscoverLeagues: NavigatorScreenParams<DiscoverStackParamList> | undefined;
  CreateLeague: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string } | undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  /** Flat aliases kept for auth-era typing and deep-link helpers. */
  Home: undefined;
  DiscoverLeagues: undefined;
  CreateLeague: undefined;
  Settings: undefined;
} & LeagueFlowParams;
