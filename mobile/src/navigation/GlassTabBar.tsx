import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlusCircle } from 'phosphor-react-native';

import { Globe, Medal, Gear } from '../components/icons';
import { spacing } from '../constants/theme';
import { useThemeTokens } from '../lib/theme';

const TAB_META: Record<
  string,
  { label: string; Icon: typeof Medal | typeof PlusCircle }
> = {
  Home: { label: 'My leagues', Icon: Medal },
  DiscoverLeagues: { label: 'Public', Icon: Globe },
  CreateLeague: { label: 'New league', Icon: PlusCircle },
  Settings: { label: 'Settings', Icon: Gear },
};

const ROW_PAD = 6;

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useThemeTokens();
  const bottomPad = Math.max(insets.bottom - 12, 6);
  const [rowWidth, setRowWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;
  const stretch = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const fromIndex = useRef(state.index);
  const tabCount = state.routes.length;
  const innerWidth = Math.max(rowWidth - ROW_PAD * 2, 0);
  const tabWidth = tabCount > 0 ? innerWidth / tabCount : 0;
  const bubbleInset = 4;
  const bubbleWidth = Math.max(tabWidth - bubbleInset * 2, 0);
  // Keep the same frosted look on every tab (Create league was reading clearer
  // because of denser content behind the bar).
  const overlay = theme.isDark ? 'rgba(12, 12, 16, 0.72)' : 'rgba(255, 252, 248, 0.72)';
  const border = theme.isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 255, 255, 0.7)';
  const bubbleFill = theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.55)';
  const bubbleBorder = theme.isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.9)';

  const scaleX = stretch.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.34],
  });
  const scaleY = stretch.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.78],
  });

  useEffect(() => {
    if (tabWidth <= 0) return;
    const toValue = ROW_PAD + state.index * tabWidth + bubbleInset;
    if (!placed.current) {
      slide.setValue(toValue);
      placed.current = true;
      fromIndex.current = state.index;
      return;
    }
    const hops = Math.abs(state.index - fromIndex.current);
    fromIndex.current = state.index;
    const peak = Math.min(1, 0.62 + hops * 0.16);
    slide.stopAnimation();
    stretch.stopAnimation();
    Animated.parallel([
      Animated.spring(slide, {
        toValue,
        useNativeDriver: true,
        damping: 13,
        stiffness: 150,
        mass: 0.9,
      }),
      Animated.sequence([
        Animated.timing(stretch, {
          toValue: peak,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(stretch, {
          toValue: 0,
          useNativeDriver: true,
          damping: 11,
          stiffness: 150,
          mass: 0.55,
        }),
      ]),
    ]).start();
  }, [bubbleInset, slide, state.index, stretch, tabWidth]);

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View
        style={[
          styles.barShell,
          {
            borderColor: border,
            shadowColor: theme.isDark ? '#000' : '#312E81',
            shadowOpacity: theme.isDark ? 0.5 : 0.14,
          },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={70} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: Platform.OS === 'ios' ? overlay : theme.tabBarFallback },
          ]}
        />
        <View
          style={styles.row}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.width;
            setRowWidth((prev) => (prev === next ? prev : next));
          }}
        >
          {bubbleWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.bubble,
                {
                  width: bubbleWidth,
                  borderColor: bubbleBorder,
                  transform: [{ translateX: slide }, { scaleX }, { scaleY }],
                },
              ]}
            >
              {Platform.OS === 'ios' ? (
                <BlurView
                  intensity={40}
                  tint={theme.isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: bubbleFill }]} />
            </Animated.View>
          ) : null}
          {state.routes.map((route, index) => {
            const meta = TAB_META[route.name] || {
              label: descriptors[route.key]?.options.title || route.name,
              Icon: Medal,
            };
            const focused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (event.defaultPrevented) return;
              // Preserve nested stack (e.g. a league) when returning to a tab.
              if (!focused) {
                navigation.navigate(route.name);
              }
            };

            const Icon = meta.Icon;
            const color = focused ? theme.colors.primary : theme.colors.tabInactive;
            // PlusCircle looks wrong with "fill" (solid disc). Keep bold outline.
            const weight =
              route.name === 'CreateLeague' ? 'bold' : focused ? 'fill' : 'regular';
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={meta.label}
                onPress={onPress}
                style={styles.tab}
                activeOpacity={0.85}
              >
                <Icon size={24} color={color} weight={weight} />
                <Text style={[styles.label, { color }]} numberOfLines={1}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
  },
  barShell: {
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 64,
    borderWidth: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ROW_PAD,
    paddingTop: 10,
    paddingBottom: 8,
  },
  bubble: {
    position: 'absolute',
    top: 6,
    bottom: 4,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
