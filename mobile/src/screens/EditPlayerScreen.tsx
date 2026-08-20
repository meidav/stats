import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ErrorBanner } from '../components/ErrorBanner';
import { GradientButton } from '../components/GradientButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { colors, spacing } from '../constants/theme';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { autoCapWords, initials } from '../lib/names';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditPlayer'>;

export function EditPlayerScreen({ route, navigation }: Props) {
  const { sportId, playerName: initialName, avatarUrl: initialAvatar } = route.params;
  const { token } = useAuth();
  const [name, setName] = useState(initialName);
  const [avatarUri, setAvatarUri] = useState<string | null>(initialAvatar ?? null);
  const [photoPayload, setPhotoPayload] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to set a player picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      setError('Could not read that photo. Try another image.');
      return;
    }
    const mime = asset.mimeType || 'image/jpeg';
    setAvatarUri(asset.uri);
    setPhotoPayload(`data:${mime};base64,${asset.base64}`);
    setError('');
  }

  async function handleSave() {
    if (!token) {
      setError('Your session expired. Sign out and sign in again.');
      return;
    }
    const nextName = name.trim();
    if (!nextName) {
      setError('Add a name to continue.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload: { name?: string; photo?: string | null } = {};
      if (nextName !== initialName) payload.name = nextName;
      if (photoPayload !== undefined) payload.photo = photoPayload;
      const saved = await api.updatePlayer(token, sportId, initialName, payload);
      navigation.navigate('PlayerProfile', {
        sportId,
        playerName: saved.player,
        sportName: saved.sport?.name || route.params.sportName,
        leagueName: saved.league?.name || route.params.leagueName,
        leagueSlug: saved.league?.slug || route.params.leagueSlug,
        sportTemplateId: saved.sport?.template_id || route.params.sportTemplateId,
        sportCategory: saved.sport?.category || route.params.sportCategory,
        leagueIcon: saved.league?.icon ?? route.params.leagueIcon,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save player');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold
      keyboard
      footer={
        <View style={styles.footer}>
          <ErrorBanner message={error} />
          <GradientButton label="Save" onPress={handleSave} loading={loading} disabled={loading} />
        </View>
      }
    >
      <ScreenHeader title="Edit player" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Photo</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity style={styles.avatar} onPress={pickPhoto} accessibilityLabel="Change photo">
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials(name || initialName)}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.photoActions}>
            <TouchableOpacity onPress={pickPhoto} style={styles.photoButton}>
              <Text style={styles.photoButtonText}>Choose photo</Text>
            </TouchableOpacity>
            {avatarUri ? (
              <TouchableOpacity
                onPress={() => {
                  setAvatarUri(null);
                  setPhotoPayload(null);
                }}
                style={styles.photoButton}
              >
                <Text style={styles.photoButtonText}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          autoCapitalize="words"
          onChangeText={(value) => setName(autoCapWords(value))}
        />
        <Text style={styles.hint}>This updates the name on every game in this activity.</Text>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    fontSize: 16,
    color: colors.text,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 88,
    height: 88,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  photoActions: {
    flex: 1,
    gap: spacing.sm,
  },
  photoButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  photoButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
