import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, LogBox, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

import { ErrorBoundary } from './src/components/ErrorBoundary';
import { GradientBackground } from './src/components/GradientBackground';
import { AuthProvider, useAuth } from './src/lib/auth';
import { parseLeagueSlugFromUrl } from './src/lib/leagueLinks';
import { hasSeenIntroRecently } from './src/lib/onboarding';
import type { RootStackParamList } from './src/navigation/types';

// Harmless Fabric / native-stack transition noise:
// https://github.com/react-navigation/react-navigation/issues/11564
LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered.']);

const logoPng = require('./assets/playtracker-logo.png');

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
let pendingLeagueSlug: string | null = null;
let screensEnabled = false;

function ensureScreensEnabled() {
  if (screensEnabled) return;
  screensEnabled = true;
  enableScreens(true);
}

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' as const },
};

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

function stashLeagueLink(url: string | null) {
  const slug = parseLeagueSlugFromUrl(url);
  if (slug) pendingLeagueSlug = slug;
}

function consumePendingLeague(canOpen: boolean) {
  if (!canOpen || !pendingLeagueSlug || !navigationRef.isReady()) return;
  const slug = pendingLeagueSlug;
  pendingLeagueSlug = null;
  navigationRef.navigate('League', { slug, name: '' });
}

function BootScreen({ status }: { status: string }) {
  return (
    <GradientBackground style={styles.loader}>
      <Image source={logoPng} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
      <Text style={styles.status}>{status}</Text>
    </GradientBackground>
  );
}

function AuthStack({ showIntro }: { showIntro: boolean }) {
  ensureScreensEnabled();
  return (
    <Stack.Navigator
      initialRouteName={showIntro ? 'Welcome' : 'Login'}
      screenOptions={screenOptions}
    >
      <Stack.Screen
        name="Welcome"
        getComponent={() => require('./src/screens/WelcomeScreen').WelcomeScreen}
      />
      <Stack.Screen
        name="Login"
        getComponent={() => require('./src/screens/LoginScreen').LoginScreen}
      />
      <Stack.Screen
        name="SignUp"
        getComponent={() => require('./src/screens/SignUpScreen').SignUpScreen}
      />
      <Stack.Screen
        name="ForgotPassword"
        getComponent={() => require('./src/screens/ForgotPasswordScreen').ForgotPasswordScreen}
      />
      <Stack.Screen
        name="ResetPassword"
        getComponent={() => require('./src/screens/ResetPasswordScreen').ResetPasswordScreen}
      />
    </Stack.Navigator>
  );
}

function MainStack() {
  ensureScreensEnabled();
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        getComponent={() => require('./src/screens/HomeScreen').HomeScreen}
      />
      <Stack.Screen
        name="DiscoverLeagues"
        getComponent={() => require('./src/screens/DiscoverLeaguesScreen').DiscoverLeaguesScreen}
      />
      <Stack.Screen
        name="CreateLeague"
        getComponent={() => require('./src/screens/CreateLeagueScreen').CreateLeagueScreen}
      />
      <Stack.Screen
        name="EditLeague"
        getComponent={() => require('./src/screens/EditLeagueScreen').EditLeagueScreen}
      />
      <Stack.Screen
        name="EditPlayer"
        getComponent={() => require('./src/screens/EditPlayerScreen').EditPlayerScreen}
      />
      <Stack.Screen
        name="League"
        getComponent={() => require('./src/screens/LeagueScreen').LeagueScreen}
      />
      <Stack.Screen
        name="AddGame"
        getComponent={() => require('./src/screens/AddGameScreen').AddGameScreen}
      />
      <Stack.Screen
        name="PlayerProfile"
        getComponent={() => require('./src/screens/PlayerProfileScreen').PlayerProfileScreen}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { token, loading: authLoading } = useAuth();
  const [gateReady, setGateReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [status, setStatus] = useState('Restoring session...');

  useEffect(() => {
    let active = true;

    async function decideStart() {
      if (authLoading) {
        setStatus('Restoring session...');
        return;
      }

      if (token) {
        if (active) {
          setStatus('Opening leagues...');
          setGateReady(true);
        }
        return;
      }

      try {
        setStatus('Checking intro...');
        const seen = await hasSeenIntroRecently();
        if (!active) return;
        setShowIntro(!seen);
        setStatus(seen ? 'Opening sign in...' : 'Opening intro...');
      } catch {
        if (!active) return;
        setShowIntro(true);
        setStatus('Opening intro...');
      } finally {
        if (active) setGateReady(true);
      }
    }

    decideStart();

    return () => {
      active = false;
    };
  }, [authLoading, token]);

  useEffect(() => {
    function handleUrl(url: string | null) {
      stashLeagueLink(url);
      consumePendingLeague(Boolean(token) && gateReady);
    }
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [token, gateReady]);

  useEffect(() => {
    consumePendingLeague(Boolean(token) && gateReady && !authLoading);
  }, [gateReady, token, authLoading]);

  if (authLoading || !gateReady) {
    return <BootScreen status={status} />;
  }

  if (token) {
    return <MainStack />;
  }

  return <AuthStack showIntro={showIntro} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <AuthProvider>
            <AppRoot />
          </AuthProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function AppRoot() {
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <View style={styles.root}>
        <AppNavigator />
      </View>
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 168,
    height: 168,
  },
  spinner: {
    marginTop: 24,
  },
  status: {
    marginTop: 16,
    color: '#FDE68A',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
