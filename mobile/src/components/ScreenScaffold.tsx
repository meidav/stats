import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../constants/theme';

type Props = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  keyboard?: boolean;
};

/**
 * Owns top safe-area padding so content never sits under the status bar on
 * iPhone or iPad. Footer handles the home indicator separately.
 */
export function ScreenScaffold({ children, footer, contentStyle, keyboard }: Props) {
  const body = (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={[styles.body, contentStyle]}>{children}</View>
      {footer ? (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          {footer}
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );

  if (!keyboard) return body;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  footer: {
    paddingBottom: spacing.sm,
  },
});
