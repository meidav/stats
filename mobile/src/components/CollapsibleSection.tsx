import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, spacing } from '../constants/theme';

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
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={open ? 16 : 20}
            color={open ? colors.textMuted : colors.primaryDark}
          />
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

const styles = StyleSheet.create({
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
    marginBottom: spacing.sm,
    zIndex: 2,
  },
  headerCollapsed: {
    backgroundColor: 'rgba(255, 252, 248, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.28)',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.16,
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
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
  },
  badgeCollapsed: {
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 12,
  },
  badgeTextCollapsed: {
    color: '#fff',
    fontSize: 13,
  },
  body: {
    overflow: 'hidden',
  },
});
