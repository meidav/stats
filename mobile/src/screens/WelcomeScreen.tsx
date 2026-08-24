import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLockup } from '../components/BrandLockup';
import { GradientButton } from '../components/GradientButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { BeachVolleyballMark } from '../components/TemplateGlyph';
import { APP_TAGLINE } from '../constants/brand';
import { colors, glass, spacing } from '../constants/theme';
import { useContentMaxWidth } from '../lib/layout';
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
    body: 'Create a league for one sport or one game night. Standings and history stay clear.',
  },
] as const;

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const contentMaxWidth = useContentMaxWidth();
  const scrollRef = useRef<ScrollView>(null);
  const finishing = useRef(false);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const isFirst = index === 0;
  const slideWidth = screenWidth;
  const cardWidthStyle = contentMaxWidth
    ? { width: contentMaxWidth, alignSelf: 'center' as const }
    : { width: '100%' as const };

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
    scrollRef.current?.scrollTo({ x: nextIndex * slideWidth, animated: true });
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
    const lastStart = slideWidth * (SLIDES.length - 1);
    if (x > lastStart + slideWidth * 0.28) {
      finish();
    }
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
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
          <View key={item.title} style={[styles.slidePage, { width: slideWidth }]}>
            <View style={[styles.slide, cardWidthStyle]}>
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
        <View style={[styles.slidePage, { width: slideWidth }]} />
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

        <View style={[styles.navRow, cardWidthStyle]}>
          <SecondaryButton
            label="Previous"
            onPress={handlePrevious}
            disabled={isFirst}
            style={styles.navButton}
          />

          <GradientButton
            label={isLast ? 'Get started' : 'Next'}
            onPress={handleNext}
            style={styles.navButton}
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
    alignItems: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  navButton: {
    flex: 1,
  },
});
