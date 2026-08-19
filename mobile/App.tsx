import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { GradientBackground } from './src/components/GradientBackground';
import { colors } from './src/constants/theme';
import { AuthProvider, useAuth } from './src/lib/auth';
import { hasSeenIntroRecently } from './src/lib/onboarding';
import type { RootStackParamList } from './src/navigation/types';
import { AddGameScreen } from './src/screens/AddGameScreen';
import { CreateLeagueScreen } from './src/screens/CreateLeagueScreen';
import { EditLeagueScreen } from './src/screens/EditLeagueScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LeagueScreen } from './src/screens/LeagueScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PlayerProfileScreen } from './src/screens/PlayerProfileScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

function AppNavigator() {
  const { token, loading: authLoading } = useAuth();
  const [gateReady, setGateReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    let active = true;
    setGateReady(false);
    async function decideStart() {
      if (authLoading) return;
      if (token) {
        if (active) setGateReady(true);
        return;
      }
      const seen = await hasSeenIntroRecently();
      if (!active) return;
      setShowIntro(!seen);
      setGateReady(true);
    }
    decideStart();
    return () => {
      active = false;
    };
  }, [authLoading, token]);

  if (authLoading || !gateReady) {
    return (
      <GradientBackground style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </GradientBackground>
    );
  }

  const initialRouteName = token ? 'Home' : showIntro ? 'Welcome' : 'Login';

  const stack = (
    <GradientBackground>
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {!token ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
          <Stack.Screen name="EditLeague" component={EditLeagueScreen} />
          <Stack.Screen name="League" component={LeagueScreen} />
          <Stack.Screen name="AddGame" component={AddGameScreen} />
          <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
        </>
      )}
    </Stack.Navigator>
    </GradientBackground>
  );

  return stack;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={navTheme}>
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
  },
});
