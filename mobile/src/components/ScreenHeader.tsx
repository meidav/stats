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
  title?: string;
  onBack?: () => void;
  /** Default: start when back is present, otherwise center. */
  titleAlign?: 'center' | 'start';
  actionLabel?: string;
  onAction?: () => void;
  /** Extra trailing controls (edit, share, …). Prefer GlassHeaderButton. */
  right?: React.ReactNode;
};

const BTN = 36;
const PAD_TOP = 4;
const PAD_BOTTOM = 10;
/** Room for up to two wrapped title lines (~17px font). */
const TITLE_BLOCK = 44;

/** Distance from screen top to content below a floating ScreenHeader. */
export function useHeaderContentInset() {
  const insets = useSafeAreaInsets();
  return insets.top + PAD_TOP + Math.max(BTN, TITLE_BLOCK) + PAD_BOTTOM;
}

/**
 * Frosted floating header. Sits absolutely over scrolling content so BlurView
 * has something to frost. Pair with useHeaderContentInset() padding on lists.
 */
export function ScreenHeader({
  title,
  onBack,
  titleAlign,
  actionLabel,
  onAction,
  right,
}: Props) {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const align = titleAlign ?? (onBack ? 'start' : 'center');
  const titleColor = theme.isDark ? '#F8FAFC' : theme.colors.text;
  const overlay = theme.isDark ? 'rgba(8, 10, 18, 0.28)' : 'rgba(255, 252, 248, 0.32)';
  const border = theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.55)';
  const hasTrailing = Boolean(right) || Boolean(onAction);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.shell,
        {
          paddingTop: insets.top + PAD_TOP,
          borderBottomColor: border,
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={theme.isDark ? 72 : 80}
          tint={theme.isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <BlurView
          intensity={theme.isDark ? 64 : 70}
          tint={theme.isDark ? 'dark' : 'light'}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />

      <View style={styles.row}>
        {align === 'start' ? (
          <>
            <View style={styles.leadingCluster}>
              {onBack ? (
                <GlassHeaderButton onPress={onBack} accessibilityLabel="Back">
                  <CaretLeft size={20} color={titleColor} weight="bold" />
                </GlassHeaderButton>
              ) : null}
              {title ? (
                <Text
                  style={[styles.titleStart, { color: titleColor }]}
                  numberOfLines={2}
                >
                  {title}
                </Text>
              ) : null}
            </View>
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
          </>
        ) : (
          <>
            <View style={styles.side}>
              {onBack ? (
                <GlassHeaderButton onPress={onBack} accessibilityLabel="Back">
                  <CaretLeft size={20} color={titleColor} weight="bold" />
                </GlassHeaderButton>
              ) : null}
            </View>
            <View style={styles.titleWrap} pointerEvents="none">
              {title ? (
                <Text style={[styles.titleCenter, { color: titleColor }]} numberOfLines={2}>
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
          </>
        )}
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
  const fill = theme.isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.08)';
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: spacing.md,
    paddingBottom: PAD_BOTTOM,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Math.max(BTN, TITLE_BLOCK),
    gap: spacing.sm,
  },
  leadingCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
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
    maxWidth: '62%',
    paddingHorizontal: spacing.xs,
  },
  titleCenter: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  titleStart: {
    flex: 1,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
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
