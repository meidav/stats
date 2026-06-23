import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from './src/constants/theme';
import { AuthProvider, useAuth } from './src/lib/auth';
import type { RootStackParamList } from './src/navigation/types';
import { AddGameScreen } from './src/screens/AddGameScreen';
import { CreateLeagueScreen } from './src/screens/CreateLeagueScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LeagueScreen } from './src/screens/LeagueScreen';
import { LoginScreen } from './src/screens/LoginScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {!token ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
          <Stack.Screen name="League" component={LeagueScreen} />
          <Stack.Screen name="AddGame" component={AddGameScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="dark" />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
