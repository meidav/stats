import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '../constants/theme';
import { useThemeTokens } from '../lib/theme';

export function ErrorBanner({ message }: { message?: string | null }) {
  const theme = useThemeTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useThemeTokens>) {
  return StyleSheet.create({
    banner: {
      alignSelf: 'center',
      backgroundColor: theme.colors.errorFill,
      borderWidth: 1,
      borderColor: theme.colors.errorBorder,
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
}
