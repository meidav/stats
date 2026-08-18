import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    backgroundColor: colors.errorFill,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
    maxWidth: '92%',
    minWidth: '72%',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
