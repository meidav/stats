import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import { CreateLeagueScreen } from '../screens/CreateLeagueScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { MainTabParamList } from './types';
import { GlassTabBar } from './GlassTabBar';
import { DiscoverStack, HomeStack } from './LeagueStacks';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: 'My leagues' }} />
      <Tab.Screen
        name="DiscoverLeagues"
        component={DiscoverStack}
        options={{ title: 'Public leagues' }}
      />
      <Tab.Screen
        name="CreateLeague"
        component={CreateLeagueScreen}
        options={{ title: 'New league' }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
