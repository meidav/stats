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

import { BrandLockup } from './BrandLockup';
import { APP_TAGLINE } from '../constants/brand';
import { colors, glass, spacing } from '../constants/theme';

type Props = {
  children: React.ReactNode;
  subtitle?: string;
  style?: ViewStyle;
  footer?: React.ReactNode;
};

export function AuthCard({ children, subtitle, style, footer }: Props) {
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
          <View style={styles.brandWrap}>
            <BrandLockup size={132} />
          </View>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </View>
        {footer ? <View style={styles.belowCard}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const authInputStyle = {
  borderWidth: 1,
  borderColor: 'rgba(196, 181, 253, 0.45)',
  borderRadius: 10,
  padding: spacing.md,
  marginBottom: spacing.md,
  fontSize: 16,
  backgroundColor: 'rgba(76, 29, 149, 0.22)',
  color: colors.onGlass,
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
  belowCard: {
    marginTop: spacing.lg,
    alignItems: 'center',
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
  brandWrap: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 16,
    color: colors.onGlassMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: 15,
    color: colors.onGlass,
    textAlign: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 22,
    opacity: 0.92,
  },
});
