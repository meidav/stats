import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing } from '../constants/theme';
import { useAuth } from '../lib/auth';

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
            <Text style={styles.modalTitle}>Sign out?</Text>
            <Text style={styles.modalBody}>You can sign back in anytime with the same account.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.stay} onPress={() => setSignOutOpen(false)}>
                <Text style={styles.stayText}>Stay signed in</Text>
              </TouchableOpacity>
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: spacing.sm,
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
    gap: spacing.sm,
  },
  stay: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  stayText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  confirm: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
