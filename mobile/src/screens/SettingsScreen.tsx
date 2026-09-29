import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ErrorBanner } from '../components/ErrorBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SecondaryButton } from '../components/SecondaryButton';
import { SignOut, Warning } from '../components/icons';
import { APP_DOMAIN, APP_URL, SUPPORT_EMAIL, SUPPORT_MAILTO } from '../constants/brand';
import { spacing, type ThemeId } from '../constants/theme';
import { ApiError } from '../lib/api';
import { appVersionLabel } from '../lib/appVersion';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

export function SettingsScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const { theme, themeId, setThemeId, themes } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const email = user?.email || user?.username || '';

  function closeDelete() {
    if (deleting) return;
    setDeleteStep(0);
    setDeleteError('');
  }

  async function confirmDelete() {
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      setDeleteStep(0);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete account');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScreenScaffold edgeHeader>
      <ScreenHeader title="Settings" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.section}>Appearance</Text>
        <Text style={styles.hint}>Pick a look. Saved on this device.</Text>
        <View style={styles.themeGrid}>
          {themes.map((item) => {
            const selected = item.id === themeId;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.themeCard, selected && styles.themeCardOn]}
                onPress={() => setThemeId(item.id as ThemeId)}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={
                    item.isDark
                      ? [item.gradients.screen[0], item.colors.surface, item.colors.primary]
                      : [...item.gradients.screen]
                  }
                  locations={item.isDark ? [0, 0.42, 1] : [...item.gradients.screenLocations]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[
                    styles.themeSwatch,
                    {
                      borderColor: item.isDark
                        ? 'rgba(255,255,255,0.38)'
                        : 'rgba(15,23,42,0.12)',
                    },
                  ]}
                />
                <Text style={styles.themeLabel}>{item.label}</Text>
                <Text style={styles.themeSummary}>{item.summary}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.section}>Account</Text>
        <View style={styles.accountCard}>
          <Text style={styles.accountLabel}>Signed in as</Text>
          <Text style={styles.accountEmail} numberOfLines={2}>{email || 'your account'}</Text>
        </View>
        <View style={styles.actions}>
          <SecondaryButton label="Sign out" onPress={() => setSignOutOpen(true)} />
          <SecondaryButton
            label="Delete account"
            onPress={() => setDeleteStep(1)}
            style={styles.deleteButton}
          />
        </View>

        <View style={styles.metaBlock}>
          <TouchableOpacity
            onPress={() => Linking.openURL(SUPPORT_MAILTO)}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.metaLink}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
          <Text style={styles.metaDot}>·</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(APP_URL)}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.metaLink}>{APP_DOMAIN}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.version}>{appVersionLabel()}</Text>
      </ScrollView>

      <Modal visible={signOutOpen} transparent animationType="fade" onRequestClose={() => setSignOutOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setSignOutOpen(false)}>
          <Pressable style={styles.modalWrap} onPress={() => {}}>
            <LinearGradient
              colors={[...theme.gradients.modal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalCard}
            >
              <View style={styles.modalHeader}>
                <SignOut size={26} color={theme.colors.primaryDark} />
                <Text style={styles.modalTitle}>Sign out?</Text>
              </View>
              <Text style={styles.modalBody}>
                You will need to sign in again to access your leagues.
              </Text>
              <View style={styles.modalActions}>
                <SecondaryButton
                  label="Cancel"
                  onPress={() => setSignOutOpen(false)}
                  style={styles.modalAction}
                />
                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={async () => {
                    setSignOutOpen(false);
                    await logout();
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[...theme.gradients.button]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.confirmButton}
                  >
                    <Text style={styles.confirmText}>Sign out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={deleteStep > 0} transparent animationType="fade" onRequestClose={closeDelete}>
        <Pressable style={styles.deleteScrim} onPress={closeDelete}>
          <Pressable style={styles.modalWrap} onPress={() => {}}>
            <LinearGradient
              colors={[...theme.gradients.modalDanger]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalCard}
            >
              <View style={styles.modalHeader}>
                <Warning size={28} color="#9F1239" weight="fill" />
                <Text style={[styles.modalTitle, styles.deleteTitle]}>
                  {deleteStep === 1 ? 'Delete your account?' : 'Permanently delete everything?'}
                </Text>
              </View>
              <Text style={[styles.modalBody, styles.deleteBody]}>
                {deleteStep === 1
                  ? 'This removes your PlayTracker account. Leagues you own (and their games) will be deleted. Memberships in other leagues will be removed. This cannot be undone.'
                  : 'Final step: your account and owned league data will be permanently deleted. There is no way to get them back.'}
              </Text>
              {deleteError ? <ErrorBanner message={deleteError} /> : null}
              <View style={styles.modalActions}>
                <SecondaryButton
                  label="Keep account"
                  onPress={closeDelete}
                  disabled={deleting}
                  style={styles.modalAction}
                />
                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={confirmDelete}
                  disabled={deleting}
                  activeOpacity={0.85}
                >
                  <View style={[styles.deleteConfirm, deleting && styles.deleteConfirmDisabled]}>
                    {deleting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.confirmText}>
                        {deleteStep === 1 ? 'Delete' : 'Delete everything'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenScaffold>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  const { colors } = theme;
  // Soft glass instead of solid white so light themes keep the screen gradient.
  const cardBg = theme.isDark
    ? theme.glassLight.backgroundColor
    : 'rgba(255, 255, 255, 0.34)';
  const cardBorder = theme.isDark
    ? theme.glassLight.borderColor
    : 'rgba(15, 23, 42, 0.1)';
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 120,
      gap: spacing.sm,
    },
    section: {
      marginTop: spacing.md,
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    hint: {
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    themeGrid: {
      gap: spacing.sm,
    },
    themeCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: cardBg,
      padding: spacing.md,
      gap: 6,
    },
    themeCardOn: {
      borderColor: colors.primary,
      borderWidth: 2,
      backgroundColor: theme.isDark
        ? `${colors.primary}22`
        : 'rgba(255, 255, 255, 0.48)',
    },
    themeSwatch: {
      height: 44,
      borderRadius: 12,
      marginBottom: 4,
      borderWidth: 1,
      overflow: 'hidden',
    },
    accountCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: cardBg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
      gap: 4,
    },
    accountLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    accountEmail: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    themeLabel: {
      fontWeight: '800',
      color: colors.text,
      fontSize: 16,
    },
    themeSummary: {
      color: colors.textMuted,
      fontSize: 13,
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    deleteButton: {
      backgroundColor: 'rgba(220, 38, 38, 0.18)',
    },
    metaBlock: {
      marginTop: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    metaLink: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryDark,
    },
    metaDot: {
      fontSize: 13,
      color: colors.textMuted,
    },
    version: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },
    scrim: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    deleteScrim: {
      flex: 1,
      backgroundColor: 'rgba(127, 29, 29, 0.48)',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    modalWrap: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    modalCard: {
      borderRadius: 20,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: spacing.sm,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.cardTitle,
    },
    deleteTitle: {
      color: '#7F1D1D',
      flexShrink: 1,
    },
    modalBody: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.cardBody,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    deleteBody: {
      color: '#9F1239',
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    modalAction: {
      flex: 1,
      minWidth: 0,
    },
    confirmButton: {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    confirmText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    deleteConfirm: {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#9F1239',
      minHeight: 52,
    },
    deleteConfirmDisabled: {
      opacity: 0.7,
    },
  });
}
