import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { SecondaryButton } from './SecondaryButton';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../lib/auth';

/** Soft dark lilac used for discover / public-league accents (not primary blue). */
export const accentLilac = '#5B21B6';

/**
 * Shared account strip: email + Sign out. Used on home, discover, and similar hubs.
 */
export function AccountFooter() {
  const { user, logout } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);

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
    maxWidth: '62%',
  },
  dot: {
    color: colors.textMuted,
  },
  logoutText: {
    color: colors.primary,
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
});
