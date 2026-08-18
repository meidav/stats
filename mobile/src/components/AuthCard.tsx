import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { APP_NAME, APP_TAGLINE } from '../constants/brand';
import { colors, glass, gradients, spacing } from '../constants/theme';

type Props = {
  children: React.ReactNode;
  subtitle?: string;
  style?: ViewStyle;
};

export function AuthCard({ children, subtitle, style }: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={[styles.card, style]}>
          <LinearGradient
            colors={[...gradients.brandText]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.brandGradient}
          >
            <Text style={styles.brand}>{APP_NAME}</Text>
          </LinearGradient>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const authInputStyle = {
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.45)',
  borderRadius: 10,
  padding: spacing.md,
  marginBottom: spacing.md,
  fontSize: 16,
  backgroundColor: 'rgba(255, 255, 255, 0.35)',
  color: colors.text,
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: glass.backgroundColor,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: glass.borderColor,
    shadowColor: glass.shadowColor,
    shadowOpacity: glass.shadowOpacity,
    shadowRadius: glass.shadowRadius,
    shadowOffset: glass.shadowOffset,
    elevation: glass.elevation,
  },
  brandGradient: {
    alignSelf: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 22,
    opacity: 0.82,
  },
});
