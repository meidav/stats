export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  CreateLeague: undefined;
  League: { slug: string; name: string };
  AddGame: { sportId: number; sportName: string; playersPerSide: number };
};
