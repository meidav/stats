import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ScreenHeader } from '../components/ScreenHeader';
import { APP_TAGLINE } from '../constants/brand';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import type { League } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { token, user, logout } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeagues = useCallback(async () => {
    if (!token) return;
    try {
      const result = await api.getMyLeagues(token);
      setLeagues(result.leagues);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadLeagues();
    }, [loadLeagues]),
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My Leagues"
        onPress={() => navigation.navigate('CreateLeague')}
      />
      <Text style={styles.subtitle}>{APP_TAGLINE}</Text>
      <Text style={styles.user}>Signed in as {user?.username}</Text>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={leagues}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              loadLeagues();
            }} />
          }
          contentContainerStyle={leagues.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            <Text style={styles.empty}>No leagues yet. Create your first one.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('League', { slug: item.slug, name: item.name })}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.sports.length} sport{item.sports.length === 1 ? '' : 's'} · {item.visibility}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subtitle: {
    paddingHorizontal: spacing.md,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  user: {
    paddingHorizontal: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  logout: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '600',
  },
});
