import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { iconForTemplate } from '../lib/templateIcons';
import type { SportTemplate } from '../types';

type GlyphTemplate = Pick<SportTemplate, 'id' | 'category'>;

const beachBall = require('../../assets/beach-volleyball.png');

const FAN = [
  { rank: 'A', suit: 'S', rotate: '-18deg', top: 6, left: 0, z: 5 },
  { rank: 'K', suit: 'H', rotate: '-9deg', top: 3, left: 7, z: 4 },
  { rank: 'Q', suit: 'D', rotate: '0deg', top: 0, left: 14, z: 3 },
  { rank: 'J', suit: 'C', rotate: '9deg', top: 3, left: 21, z: 2 },
  { rank: '10', suit: 'S', rotate: '18deg', top: 6, left: 28, z: 1 },
] as const;

function suitGlyph(suit: string) {
  if (suit === 'H') return { mark: '♥', color: '#E11D48' };
  if (suit === 'D') return { mark: '♦', color: '#E11D48' };
  if (suit === 'C') return { mark: '♣', color: '#0F172A' };
  return { mark: '♠', color: '#0F172A' };
}

export function FanHand({ size }: { size: number }) {
  const scale = size / 28;
  return (
    <View style={[styles.fan, { width: 46 * scale, height: 32 * scale }]}>
      {FAN.map((card) => {
        const suit = suitGlyph(card.suit);
        return (
          <View
            key={`${card.rank}${card.suit}`}
            style={[
              styles.card,
              {
                top: card.top * scale,
                left: card.left * scale,
                zIndex: card.z,
                elevation: card.z,
                width: 16 * scale,
                height: 22 * scale,
                borderRadius: 3 * scale,
                transform: [{ rotate: card.rotate }],
              },
            ]}
          >
            <Text style={[styles.rank, { color: suit.color, fontSize: 6 * scale, lineHeight: 7 * scale }]}>
              {card.rank}
            </Text>
            <Text style={[styles.suit, { color: suit.color, fontSize: 7 * scale, lineHeight: 8 * scale }]}>
              {suit.mark}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function CheckerGlyph({ size }: { size: number }) {
  const back = size * 0.58;
  const front = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.1,
          width: back,
          height: back,
          borderRadius: back / 2,
          backgroundColor: '#B91C1C',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: '#7F1D1D',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.08,
          width: front,
          height: front,
          borderRadius: front / 2,
          backgroundColor: '#1C1917',
          borderWidth: Math.max(1.5, front * 0.08),
          borderColor: 'rgba(255, 255, 255, 0.28)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    </View>
  );
}

export function ChessKnightGlyph({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text
        style={{
          fontSize: size,
          lineHeight: size + 2,
          includeFontPadding: false,
          textAlign: 'center',
        }}
      >
        ♞
      </Text>
    </View>
  );
}

export function ScrabbleTileGlyph({ size }: { size: number }) {
  const radius = Math.max(3, size * 0.18);
  const letterSize = size * 0.58;
  const pointSize = Math.max(7, size * 0.28);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: '#F3E6C8',
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: '#C4A574',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8B6914',
        shadowOpacity: 0.22,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
      }}
    >
      <Text
        style={{
          fontSize: letterSize,
          lineHeight: letterSize + 2,
          fontWeight: '800',
          color: '#1C1917',
          includeFontPadding: false,
          marginTop: size * 0.02,
        }}
      >
        A
      </Text>
      <Text
        style={{
          position: 'absolute',
          right: size * 0.1,
          bottom: size * 0.06,
          fontSize: pointSize,
          lineHeight: pointSize + 1,
          fontWeight: '700',
          color: '#44403C',
          includeFontPadding: false,
        }}
      >
        1
      </Text>
    </View>
  );
}

export function CustomGlyph({ size }: { size: number }) {
  const stroke = Math.max(2, size * 0.14);
  const arm = size * 0.42;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundColor: 'rgba(37, 99, 235, 0.16)',
        borderWidth: 1.5,
        borderColor: 'rgba(37, 99, 235, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: arm,
          height: stroke,
          borderRadius: 1,
          backgroundColor: '#2563EB',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: stroke,
          height: arm,
          borderRadius: 1,
          backgroundColor: '#2563EB',
        }}
      />
    </View>
  );
}

export function BeachVolleyballMark({ size }: { size: number }) {
  return (
    <Image
      source={beachBall}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

export function isCardTemplate(template: GlyphTemplate) {
  return template.category === 'cards' || template.id === 'uno';
}

export function TemplateGlyph({
  template,
  size = 28,
}: {
  template: GlyphTemplate;
  size?: number;
}) {
  if (isCardTemplate(template)) {
    return <FanHand size={size} />;
  }
  if (template.id.startsWith('beach_volleyball') || template.id === 'vollis') {
    return <BeachVolleyballMark size={size + 4} />;
  }
  if (template.id === 'checkers') {
    return <CheckerGlyph size={size} />;
  }
  if (template.id === 'chess') {
    return <ChessKnightGlyph size={size} />;
  }
  if (template.id === 'scrabble') {
    return <ScrabbleTileGlyph size={size} />;
  }
  if (template.id === 'custom') {
    return <CustomGlyph size={size} />;
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size, lineHeight: size + 2, includeFontPadding: false }}>
        {iconForTemplate(template)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fan: {
    position: 'relative',
  },
  card: {
    position: 'absolute',
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
  },
  rank: {
    fontWeight: '800',
  },
  suit: {
    marginTop: -1,
  },
});

