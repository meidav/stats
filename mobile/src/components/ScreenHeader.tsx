import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, gradients, spacing } from '../constants/theme';

type Props = {
  title?: string;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export function ScreenHeader({ title, onBack, actionLabel, onAction }: Props) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.sideButton} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideSpacer} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title ?? ''}
      </Text>

      {onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.85}>
          <LinearGradient
            colors={[...gradients.button]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.action}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.actionText}>{actionLabel ?? 'New'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View style={styles.sideSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  sideSpacer: {
    width: 44,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
