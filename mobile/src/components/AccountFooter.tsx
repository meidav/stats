import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { SecondaryButton } from './SecondaryButton';
import { colors, spacing } from '../constants/theme';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

/** Soft dark lilac used for discover / public-league accents (not primary blue). */
export const accentLilac = '#5B21B6';

/**
 * Shared account strip: email + Sign out + Delete account.
 * Used on home, discover, and similar hubs.
 */
export function AccountFooter() {
  const { user, logout, deleteAccount } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
    <>
      <View style={styles.footer}>
        <Text style={styles.user} numberOfLines={1}>
          {user?.email || user?.username}
        </Text>
        <Text style={styles.dot}>·</Text>
        <TouchableOpacity onPress={() => setSignOutOpen(true)}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
        <Text style={styles.dot}>·</Text>
        <TouchableOpacity onPress={() => setDeleteStep(1)}>
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={signOutOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSignOutOpen(false)}
      >
        <View style={styles.scrim}>
          <LinearGradient
            colors={['#BFDBFE', '#C4B5FD', '#93C5FD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="log-out-outline" size={26} color={colors.primaryDark} />
              <Text style={styles.modalTitle}>Sign out?</Text>
            </View>
            <Text style={styles.modalBody}>You can sign back in anytime with the same account.</Text>
            <View style={styles.modalActions}>
              <SecondaryButton
                label="Stay signed in"
                onPress={() => setSignOutOpen(false)}
                style={styles.modalButton}
              />
              <TouchableOpacity
                style={styles.confirm}
                onPress={async () => {
                  setSignOutOpen(false);
                  await logout();
                }}
              >
                <Text style={styles.confirmText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      <Modal
        visible={deleteStep > 0}
        transparent
        animationType="fade"
        onRequestClose={closeDelete}
      >
        <View style={styles.deleteScrim}>
          <LinearGradient
            colors={['#FECACA', '#FDBA74', '#FB7185']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalCard}
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
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.deleteKeep}
                onPress={closeDelete}
                disabled={deleting}
              >
                <Text style={styles.deleteKeepText}>Keep account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirm}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteConfirmText}>
                    {deleteStep === 1 ? 'Delete' : 'Delete everything'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  user: {
    color: colors.textMuted,
    fontSize: 13,
    maxWidth: '48%',
  },
  dot: {
    color: colors.textMuted,
  },
  logoutText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  deleteText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(30, 58, 138, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  deleteScrim: {
    flex: 1,
    backgroundColor: 'rgba(127, 29, 29, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.28)',
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
    color: '#1E3A8A',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1E40AF',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  confirm: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 52,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
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
  deleteKeep: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    minHeight: 52,
  },
  deleteKeepText: {
    fontWeight: '700',
    color: '#7F1D1D',
  },
  deleteConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9F1239',
    minHeight: 52,
  },
  deleteConfirmText: {
    fontWeight: '700',
    color: '#fff',
  },
});
