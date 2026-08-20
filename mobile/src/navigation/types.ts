export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string } | undefined;
  Home: undefined;
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
    scoreMode?: 'points' | 'win_loss';
    sideKind?: 'player' | 'team';
    focus?: 'sports' | 'table' | 'mixed';
    leagueName?: string;
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
  };
};
