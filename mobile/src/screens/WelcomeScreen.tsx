import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton } from '../components/GradientButton';
import { APP_NAME, APP_TAGLINE } from '../constants/brand';
import { colors, glass, gradients, spacing } from '../constants/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const SLIDES = [
  {
    emoji: '🏐',
    title: 'Track every sport',
    body: 'Beach volleyball, tennis, basketball, and more. Log wins, scores, and who played.',
  },
  {
    emoji: '🎲',
    title: 'Game night, sorted',
    body: 'Cards, board games, cribbage, spades. Keep the table honest without a spreadsheet.',
  },
  {
    emoji: '🏆',
    title: 'Leagues that stick',
    body: 'Create a league for your crew, see standings, and build a history of what you play.',
  },
] as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH;

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const isFirst = index === 0;

  function finish() {
    navigation.replace('Login');
  }

  function goToSlide(nextIndex: number) {
    setIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * SLIDE_WIDTH, animated: true });
  }

  function handleNext() {
    if (isLast) {
      finish();
      return;
    }
    goToSlide(index + 1);
  }

  function handlePrevious() {
    if (isFirst) {
      return;
    }
    goToSlide(index - 1);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    setIndex(nextIndex);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.hero}>
          <LinearGradient
            colors={[...gradients.brandText]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.brandGradient}
          >
            <Text style={styles.appName}>{APP_NAME}</Text>
          </LinearGradient>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
      >
        {SLIDES.map((item) => (
          <View key={item.title} style={styles.slidePage}>
            <View style={styles.slide}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideBody}>{item.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((item, dotIndex) => (
            <View
              key={item.title}
              style={[styles.dot, dotIndex === index && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, isFirst && styles.secondaryButtonDisabled]}
            onPress={handlePrevious}
            disabled={isFirst}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isFirst && styles.secondaryButtonTextDisabled,
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          <GradientButton
            label={isLast ? 'Get started' : 'Next'}
            onPress={handleNext}
            style={styles.primaryButtonFlex}
          />
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={finish}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  brandGradient: {
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  tagline: {
    marginTop: spacing.md,
    fontSize: 17,
    color: colors.textMuted,
    textAlign: 'center',
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  slidePage: {
    width: SLIDE_WIDTH,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  slide: {
    backgroundColor: glass.backgroundColor,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: glass.borderColor,
    padding: spacing.xl,
    minHeight: 260,
    justifyContent: 'center',
    shadowColor: glass.shadowColor,
    shadowOpacity: glass.shadowOpacity,
    shadowRadius: glass.shadowRadius,
    shadowOffset: glass.shadowOffset,
    elevation: glass.elevation,
  },
  emoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  slideBody: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
    opacity: 0.82,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  secondaryButtonDisabled: {
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonTextDisabled: {
    color: colors.textMuted,
  },
  primaryButtonFlex: {
    flex: 1,
  },
});
