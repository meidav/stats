import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { CaretDown, CaretUp } from './icons';
import { spacing } from '../constants/theme';
import { useThemeTokens } from '../lib/theme';

type Props = {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: Props) {
  const theme = useThemeTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [open, setOpen] = useState(defaultOpen);
  const progress = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const activeAnim = useRef<Animated.CompositeAnimation | null>(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    return () => {
      activeAnim.current?.stop();
      progress.stopAnimation();
    };
  }, [progress]);

  function toggle() {
    const next = !open;
    setAnimating(true);
    setOpen(next);
    activeAnim.current?.stop();
    activeAnim.current = Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: next ? 260 : 220,
      easing: next
        ? Easing.out(Easing.cubic)
        : Easing.in(Easing.cubic),
      useNativeDriver: false,
    });
    activeAnim.current.start(() => {
      setAnimating(false);
    });
  }

  function onBodyLayout(event: LayoutChangeEvent) {
    if (animating || !open) return;
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0 && nextHeight !== bodyHeight) {
      setBodyHeight(nextHeight);
    }
  }

  const height = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(bodyHeight, 1)],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-Math.max(bodyHeight * 0.55, 36), 0],
  });
  const scaleX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 1],
  });
  const headerPad = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 8],
  });

  return (
    <View style={[styles.wrap, !open && styles.wrapCollapsed]}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.85}>
        <Animated.View
          style={[
            styles.header,
            !open && styles.headerCollapsed,
            { paddingVertical: headerPad },
          ]}
        >
          <Text style={[styles.title, !open && styles.titleCollapsed]}>{title}</Text>
          {count != null ? (
            <View style={[styles.badge, !open && styles.badgeCollapsed]}>
              <Text style={[styles.badgeText, !open && styles.badgeTextCollapsed]}>
                {count}
              </Text>
            </View>
          ) : null}
          {open ? (
            <CaretUp size={16} color={theme.colors.textMuted} weight="bold" />
          ) : (
            <CaretDown size={20} color={theme.colors.primary} weight="bold" />
          )}
        </Animated.View>
      </TouchableOpacity>
      <Animated.View
        style={[
          styles.body,
          { height: open && !animating ? undefined : height },
        ]}
      >
        <Animated.View
          collapsable={false}
          onLayout={onBodyLayout}
          style={{ transform: [{ translateY }, { scaleX }] }}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useThemeTokens>) {
  const { colors } = theme;
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
    },
    wrapCollapsed: {
      marginBottom: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginBottom: spacing.xs,
      zIndex: 2,
    },
    headerCollapsed: {
      backgroundColor: colors.fieldBg,
      borderWidth: 1,
      borderColor: colors.fieldBorder,
      shadowColor: theme.glass.shadowColor,
      shadowOpacity: theme.isDark ? 0.35 : 0.16,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    title: {
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.text,
    },
    titleCollapsed: {
      fontSize: 15,
      letterSpacing: 0.4,
    },
    badge: {
      minWidth: 24,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : `${colors.primary}22`,
      alignItems: 'center',
    },
    badgeCollapsed: {
      backgroundColor: colors.primary,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    badgeText: {
      color: theme.isDark ? colors.primary : colors.primaryDark,
      fontWeight: '800',
      fontSize: 12,
    },
    badgeTextCollapsed: {
      color: theme.id === 'classic' ? '#121820' : '#fff',
      fontSize: 13,
    },
    body: {
      overflow: 'hidden',
    },
  });
}
