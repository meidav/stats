import React, { useEffect, useState } from 'react';
import {
  Keyboard,
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
  /** Jump above the keyboard instead of sliding with it. */
  instantKeyboard?: boolean;
  /** Brand header owns the top safe area. */
  edgeHeader?: boolean;
  /** Lift footer above the floating glass tab bar. */
  aboveTabBar?: boolean;
};

/** Room for GlassTabBar shell (above safe-area, which footer already pads). */
const TAB_BAR_CLEARANCE = 78;

/**
 * Owns safe-area padding via insets. Each screen paints its own gradient so
 * native-stack transitions do not show overlapping content through transparency.
 */
export function ScreenScaffold({
  children,
  footer,
  contentStyle,
  keyboard,
  instantKeyboard,
  edgeHeader,
  aboveTabBar,
}: Props) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!instantKeyboard) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [instantKeyboard]);

  const footerBottom =
    keyboardHeight > 0
      ? spacing.sm
      : Math.max(insets.bottom, spacing.sm) + (aboveTabBar ? TAB_BAR_CLEARANCE : 0);

  const body = (
    <GradientBackground>
      <View style={styles.root}>
        <View
          style={[
            styles.body,
            {
              paddingTop: edgeHeader ? 0 : insets.top + spacing.sm,
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
              paddingBottom: footerBottom,
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

  if (instantKeyboard) {
    return <View style={[styles.root, { paddingBottom: keyboardHeight }]}>{body}</View>;
  }

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
