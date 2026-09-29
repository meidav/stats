import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaretLeft, Plus } from './icons';
import { APP_NAME } from '../constants/brand';
import { spacing } from '../constants/theme';
import { useThemeTokens } from '../lib/theme';

const brandIcon = require('../../assets/playtracker-icon.png');

type Props = {
  /** Page title under the brand row (My leagues, Settings, …). */
  title?: string;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  /** Extra trailing controls (edit, share, …). */
  right?: React.ReactNode;
};

/**
 * Shared app chrome: theme-matched bar, icon top-left, gradient PlayTracker wordmark,
 * large centered page title.
 */
export function ScreenHeader({ title, onBack, actionLabel, onAction, right }: Props) {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const hasTrailing = Boolean(right) || Boolean(onAction);
  const titleColor = theme.isDark ? '#F8FAFC' : theme.colors.text;
  const backBg = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)';

  return (
    <LinearGradient
      colors={[...theme.gradients.header]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.bar, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftCluster}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={[styles.sideButton, { backgroundColor: backBg }]}
              accessibilityLabel="Back"
            >
              <CaretLeft size={22} color={titleColor} weight="bold" />
            </TouchableOpacity>
          ) : null}
          <Image source={brandIcon} style={styles.logo} resizeMode="contain" />
          <MaskedView
            style={styles.brandMask}
            maskElement={
              <Text style={styles.brandMaskText} numberOfLines={1}>
                {APP_NAME}
              </Text>
            }
          >
            <LinearGradient
              colors={[...theme.gradients.brandText]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.brandFill}
            >
              <Text style={[styles.brandMaskText, styles.brandHidden]} numberOfLines={1}>
                {APP_NAME}
              </Text>
            </LinearGradient>
          </MaskedView>
        </View>

        {hasTrailing ? (
          <View style={styles.trailing}>
            {right}
            {onAction ? (
              <TouchableOpacity onPress={onAction} activeOpacity={0.85}>
                <View style={[styles.actionChip, { backgroundColor: backBg }]}>
                  <Plus size={16} color={titleColor} weight="bold" />
                  {actionLabel ? (
                    <Text style={[styles.actionText, { color: titleColor }]}>{actionLabel}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.sideSpacer} />
        )}
      </View>

      {title ? (
        <Text style={[styles.pageTitle, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 40,
  },
  leftCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  logo: {
    width: 44,
    height: 44,
  },
  brandMask: {
    maxWidth: 168,
    marginLeft: -2,
  },
  brandMaskText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  brandFill: {
    flexGrow: 0,
  },
  brandHidden: {
    opacity: 0,
  },
  pageTitle: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.15,
  },
  sideButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSpacer: {
    width: 36,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
