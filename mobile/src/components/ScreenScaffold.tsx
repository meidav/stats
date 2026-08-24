import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientBackground } from './GradientBackground';
import { spacing } from '../constants/theme';

type Props = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  keyboard?: boolean;
};

/**
 * Owns safe-area padding via insets. Each screen paints its own gradient so
 * native-stack transitions do not show overlapping content through transparency.
 */
export function ScreenScaffold({ children, footer, contentStyle, keyboard }: Props) {
  const insets = useSafeAreaInsets();

  const body = (
    <GradientBackground>
      <View style={styles.root}>
        <View
          style={[
            styles.body,
            {
              paddingTop: insets.top + spacing.sm,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
            contentStyle,
          ]}
        >
          {children}
        </View>
        {footer ? (
          <View
            style={{
              paddingBottom: Math.max(insets.bottom, spacing.sm),
              paddingLeft: insets.left,
              paddingRight: insets.right,
            }}
          >
            {footer}
          </View>
        ) : null}
      </View>
    </GradientBackground>
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
  },
});
