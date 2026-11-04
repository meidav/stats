import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaretLeft, Plus } from './icons';
import { spacing } from '../constants/theme';
import { useThemeTokens } from '../lib/theme';

type Props = {
  /** Centered page title (My leagues, Settings, league name, …). */
  title?: string;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  /** Extra trailing controls (edit, share, …). Prefer GlassHeaderButton. */
  right?: React.ReactNode;
};

const BTN = 36;

/**
 * iOS-style frosted header: centered title, glass round corners for back / actions.
 * No brand mark or wordmark (splash + welcome carry the brand).
 */
export function ScreenHeader({ title, onBack, actionLabel, onAction, right }: Props) {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const titleColor = theme.isDark ? '#F8FAFC' : theme.colors.text;
  const overlay = theme.isDark ? 'rgba(12, 12, 16, 0.55)' : 'rgba(255, 252, 248, 0.55)';
  const border = theme.isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.65)';
  const hasTrailing = Boolean(right) || Boolean(onAction);

  return (
    <View
      style={[
        styles.shell,
        {
          paddingTop: insets.top + 4,
          borderBottomColor: border,
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={theme.isDark ? 48 : 64}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              Platform.OS === 'ios' ? overlay : theme.isDark ? 'rgba(18, 24, 32, 0.92)' : 'rgba(255, 252, 248, 0.92)',
          },
        ]}
      />

      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <GlassHeaderButton onPress={onBack} accessibilityLabel="Back">
              <CaretLeft size={20} color={titleColor} weight="bold" />
            </GlassHeaderButton>
          ) : null}
        </View>

        <View style={styles.titleWrap} pointerEvents="none">
          {title ? (
            <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        <View style={[styles.side, styles.sideEnd]}>
          {hasTrailing ? (
            <View style={styles.trailing}>
              {right}
              {onAction ? (
                <GlassHeaderButton
                  onPress={onAction}
                  accessibilityLabel={actionLabel || 'Add'}
                >
                  <Plus size={18} color={titleColor} weight="bold" />
                </GlassHeaderButton>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type GlassBtnProps = {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

/** Round frosted control for header corners (back, edit, share, …). */
export function GlassHeaderButton({
  onPress,
  accessibilityLabel,
  children,
  style,
}: GlassBtnProps) {
  const theme = useThemeTokens();
  const fill = theme.isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.08)';
  const border = theme.isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.7)';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.glassBtn,
        {
          backgroundColor: fill,
          borderColor: border,
        },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: BTN,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: BTN,
  },
  sideEnd: {
    justifyContent: 'flex-end',
  },
  titleWrap: {
    flexShrink: 1,
    maxWidth: '56%',
    paddingHorizontal: spacing.xs,
  },
  title: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  glassBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
