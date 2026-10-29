import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { AddGameScreen } from '../screens/AddGameScreen';
import { DiscoverLeaguesScreen } from '../screens/DiscoverLeaguesScreen';
import { EditLeagueScreen } from '../screens/EditLeagueScreen';
import { EditPlayerScreen } from '../screens/EditPlayerScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LeagueScreen } from '../screens/LeagueScreen';
import { PlayerProfileScreen } from '../screens/PlayerProfileScreen';
import type { DiscoverStackParamList, HomeStackParamList } from './types';

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' as const },
  animation: 'slide_from_right' as const,
};

const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const DiscoverStackNav = createNativeStackNavigator<DiscoverStackParamList>();

export function HomeStack() {
  return (
    <HomeStackNav.Navigator initialRouteName="Home" screenOptions={screenOptions}>
      <HomeStackNav.Screen name="Home" component={HomeScreen} />
      <HomeStackNav.Screen name="League" component={LeagueScreen} />
      <HomeStackNav.Screen name="AddGame" component={AddGameScreen} />
      <HomeStackNav.Screen name="PlayerProfile" component={PlayerProfileScreen} />
      <HomeStackNav.Screen name="EditLeague" component={EditLeagueScreen} />
      <HomeStackNav.Screen name="EditPlayer" component={EditPlayerScreen} />
    </HomeStackNav.Navigator>
  );
}

export function DiscoverStack() {
  return (
    <DiscoverStackNav.Navigator
      initialRouteName="DiscoverLeagues"
      screenOptions={screenOptions}
    >
      <DiscoverStackNav.Screen name="DiscoverLeagues" component={DiscoverLeaguesScreen} />
      <DiscoverStackNav.Screen name="League" component={LeagueScreen} />
      <DiscoverStackNav.Screen name="AddGame" component={AddGameScreen} />
      <DiscoverStackNav.Screen name="PlayerProfile" component={PlayerProfileScreen} />
      <DiscoverStackNav.Screen name="EditLeague" component={EditLeagueScreen} />
      <DiscoverStackNav.Screen name="EditPlayer" component={EditPlayerScreen} />
    </DiscoverStackNav.Navigator>
  );
}
