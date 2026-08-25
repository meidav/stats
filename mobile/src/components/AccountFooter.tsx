import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { SecondaryButton } from './SecondaryButton';
import { colors, gradients, spacing } from '../constants/theme';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

/** Soft dark lilac used for discover / public-league accents (not primary blue). */
export const accentLilac = '#5B21B6';

/**
 * Signed-in account strip: email + Account menu (cog).
 * Used on home, discover, and similar hubs.
 */
export function AccountFooter() {
  const { user, logout, deleteAccount } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
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

  function openDeleteFlow() {
    setAccountOpen(false);
    setDeleteStep(1);
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

  function openSignOutFlow() {
    setAccountOpen(false);
    setSignOutOpen(true);
  }

  function closeSignOut() {
    setSignOutOpen(false);
  }

  async function confirmSignOut() {
    setSignOutOpen(false);
    await logout();
  }

  return (
    <>
      <View style={styles.footer}>
        <Text style={styles.user} numberOfLines={1}>
          {email}
        </Text>
        <TouchableOpacity
          onPress={() => setAccountOpen(true)}
          style={styles.cogButton}
          accessibilityLabel="Account"
          accessibilityRole="button"
        >
          <Ionicons name="settings-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={accountOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountOpen(false)}
      >
        <Pressable style={styles.scrim} onPress={() => setAccountOpen(false)}>
          <Pressable style={styles.modalWrap} onPress={() => {}}>
            <LinearGradient
              colors={['#BFDBFE', '#C4B5FD', '#93C5FD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.accountCard}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setAccountOpen(false)}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={18} color={colors.onGlass} />
              </TouchableOpacity>
              <Text style={styles.accountTitle}>Account</Text>
              <Text style={styles.accountEmail} numberOfLines={2}>
                {email}
              </Text>
              <View style={styles.accountActions}>
                <SecondaryButton
                  label="Delete account"
                  onPress={openDeleteFlow}
                  style={[styles.actionButton, styles.deleteSecondary]}
                />
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={openSignOutFlow}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[...gradients.button]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.signOutButton}
                  >
                    <Text style={styles.signOutText}>Sign out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={signOutOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSignOut}
      >
        <Pressable style={styles.scrim} onPress={closeSignOut}>
          <Pressable style={styles.modalWrap} onPress={() => {}}>
            <LinearGradient
              colors={['#BFDBFE', '#C4B5FD', '#93C5FD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.accountCard}
            >
              <View style={styles.signOutHeader}>
                <Ionicons name="log-out-outline" size={26} color={colors.primaryDark} />
                <Text style={styles.signOutTitle}>Sign out?</Text>
              </View>
              <Text style={styles.signOutBody}>
                You will need to sign in again to access your leagues.
              </Text>
              <View style={styles.accountActions}>
                <SecondaryButton
                  label="Cancel"
                  onPress={closeSignOut}
                  style={styles.actionButton}
                />
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={confirmSignOut}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[...gradients.button]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.signOutButton}
                  >
                    <Text style={styles.signOutText}>Sign out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={deleteStep > 0}
        transparent
        animationType="fade"
        onRequestClose={closeDelete}
      >
        <Pressable style={styles.deleteScrim} onPress={closeDelete}>
          <Pressable style={styles.modalWrap} onPress={() => {}}>
            <LinearGradient
              colors={['#FECACA', '#FDBA74', '#FB7185']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.accountCard}
            >
              <View style={styles.deleteHeader}>
                <Ionicons name="warning" size={28} color="#9F1239" />
                <Text style={styles.deleteTitle}>
                  {deleteStep === 1 ? 'Delete your account?' : 'Permanently delete everything?'}
                </Text>
              </View>
              <Text style={styles.deleteBody}>
                {deleteStep === 1
                  ? 'This removes your PlayTracker account. Leagues you own (and their games) will be deleted. Memberships in other leagues will be removed. This cannot be undone.'
                  : 'Final step: your account and owned league data will be permanently deleted. There is no way to get them back.'}
              </Text>
              {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}
              <View style={styles.accountActions}>
                <SecondaryButton
                  label="Keep account"
                  onPress={closeDelete}
                  disabled={deleting}
                  style={[styles.actionButton, styles.keepSecondary]}
                />
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={confirmDelete}
                  disabled={deleting}
                  activeOpacity={0.85}
                >
                  <View style={[styles.deleteConfirm, deleting && styles.deleteConfirmDisabled]}>
                    {deleting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.deleteConfirmText}>
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
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  user: {
    color: colors.textMuted,
    fontSize: 13,
    maxWidth: '72%',
  },
  cogButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(30, 58, 138, 0.42)',
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
  accountCard: {
    width: '100%',
    borderRadius: 20,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.28)',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(91, 33, 182, 0.22)',
  },
  accountTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  accountEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E40AF',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  signOutBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1D4ED8',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  signOutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  signOutTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
  },
  deleteSecondary: {
    backgroundColor: 'rgba(220, 38, 38, 0.28)',
  },
  keepSecondary: {
    backgroundColor: 'rgba(127, 29, 29, 0.22)',
  },
  signOutButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  signOutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  deleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  deleteTitle: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#7F1D1D',
    textAlign: 'left',
  },
  deleteBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#9F1239',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  deleteError: {
    color: '#7F1D1D',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  deleteConfirm: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9F1239',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  deleteConfirmDisabled: {
    opacity: 0.7,
  },
  deleteConfirmText: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 16,
  },
});
