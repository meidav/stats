import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../constants/theme';

type Props = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  keyboard?: boolean;
};

export function ScreenScaffold({ children, footer, contentStyle, keyboard }: Props) {
  const insets = useSafeAreaInsets();

  const body = (
    <View style={styles.root}>
      <View
        style={[
          styles.body,
          { paddingTop: insets.top + spacing.sm },
          contentStyle,
        ]}
      >
        {children}
      </View>
      {footer ? (
        <View style={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}>{footer}</View>
      ) : null}
    </View>
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
