import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useRef, useState } from 'react';
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

import { BrandLockup } from '../components/BrandLockup';
import { GradientButton } from '../components/GradientButton';
import { BeachVolleyballMark } from '../components/TemplateGlyph';
import { APP_TAGLINE } from '../constants/brand';
import { colors, glass, spacing } from '../constants/theme';
import { markIntroSeen } from '../lib/onboarding';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const SLIDES = [
  {
    graphic: 'beach' as const,
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
  const finishing = useRef(false);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const isFirst = index === 0;

  useFocusEffect(
    useCallback(() => {
      finishing.current = false;
      setIndex(0);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: 0, animated: false });
      });
    }, []),
  );

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    try {
      await markIntroSeen();
    } finally {
      navigation.replace('Login');
    }
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

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = event.nativeEvent.contentOffset.x;
    const lastStart = SLIDE_WIDTH * (SLIDES.length - 1);
    if (x > lastStart + SLIDE_WIDTH * 0.28) {
      finish();
    }
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    if (nextIndex >= SLIDES.length) {
      finish();
      return;
    }
    setIndex(nextIndex);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.hero}>
          <BrandLockup size={148} />
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
      >
        {SLIDES.map((item) => (
          <View key={item.title} style={styles.slidePage}>
            <View style={styles.slide}>
              {'graphic' in item ? (
                <View style={styles.graphicWrap}>
                  <BeachVolleyballMark size={96} />
                </View>
              ) : (
                <Text style={styles.emoji}>{item.emoji}</Text>
              )}
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideBody}>{item.body}</Text>
            </View>
          </View>
        ))}
        <View style={styles.slidePage} />
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  tagline: {
    marginTop: spacing.sm,
    fontSize: 17,
    color: colors.text,
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
  graphicWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
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
    opacity: 0.88,
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
    backgroundColor: 'rgba(91, 33, 182, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  secondaryButtonDisabled: {
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(49, 16, 101, 0.18)',
  },
  secondaryButtonText: {
    color: colors.onGlass,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonTextDisabled: {
    color: colors.onGlassMuted,
  },
  primaryButtonFlex: {
    flex: 1,
  },
});
