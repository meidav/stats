export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string } | undefined;
  Home: undefined;
  CreateLeague: undefined;
  League: { slug: string; name: string };
  AddGame: {
    sportId: number;
    sportName: string;
    templateId?: string;
    playersPerSide: number;
    scoreMode?: 'points' | 'win_loss';
    focus?: 'sports' | 'table' | 'mixed';
    leagueName?: string;
  };
  PlayerProfile: {
    sportId: number;
    playerName: string;
    sportName: string;
    leagueName: string;
  };
};
