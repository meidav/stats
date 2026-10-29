import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { iconForTemplate } from '../lib/templateIcons';
import type { SportTemplate } from '../types';

type GlyphTemplate = Pick<SportTemplate, 'id' | 'category'>;

const beachBall = require('../../assets/beach-volleyball.png');

const FAN = [
  { rank: 'A', suit: 'S', rotate: '-14deg', top: 0.18, left: 0.02, z: 3 },
  { rank: 'K', suit: 'H', rotate: '0deg', top: 0.06, left: 0.22, z: 2 },
  { rank: 'Q', suit: 'D', rotate: '14deg', top: 0.18, left: 0.42, z: 1 },
] as const;

function suitGlyph(suit: string) {
  if (suit === 'H') return { mark: '♥', color: '#E11D48' };
  if (suit === 'D') return { mark: '♦', color: '#E11D48' };
  if (suit === 'C') return { mark: '♣', color: '#0F172A' };
  return { mark: '♠', color: '#0F172A' };
}

export function FanHand({ size }: { size: number }) {
  const cardW = size * 0.42;
  const cardH = size * 0.58;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.88, height: size * 0.78, position: 'relative' }}>
        {FAN.map((card) => {
          const suit = suitGlyph(card.suit);
          return (
            <View
              key={`${card.rank}${card.suit}`}
              style={[
                styles.card,
                {
                  top: size * card.top,
                  left: size * card.left,
                  zIndex: card.z,
                  elevation: card.z,
                  width: cardW,
                  height: cardH,
                  borderRadius: Math.max(2, size * 0.08),
                  transform: [{ rotate: card.rotate }],
                },
              ]}
            >
              <Text
                style={[
                  styles.rank,
                  {
                    color: suit.color,
                    fontSize: Math.max(5, size * 0.2),
                    lineHeight: Math.max(6, size * 0.22),
                  },
                ]}
              >
                {card.rank}
              </Text>
              <Text
                style={[
                  styles.suit,
                  {
                    color: suit.color,
                    fontSize: Math.max(6, size * 0.22),
                    lineHeight: Math.max(7, size * 0.24),
                  },
                ]}
              >
                {suit.mark}
              </Text>
            </View>
          );
        })}
      </View>
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

/** Perforated plastic ball for pickleball (no dedicated emoji exists). */
export function WhiffleBallGlyph({ size }: { size: number }) {
  const r = size / 2;
  const hole = Math.max(1.5, size * 0.11);
  const holes: Array<{ x: number; y: number }> = [
    { x: 0.32, y: 0.28 },
    { x: 0.52, y: 0.22 },
    { x: 0.7, y: 0.32 },
    { x: 0.24, y: 0.48 },
    { x: 0.5, y: 0.46 },
    { x: 0.74, y: 0.5 },
    { x: 0.34, y: 0.68 },
    { x: 0.55, y: 0.72 },
    { x: 0.68, y: 0.64 },
  ];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: '#C8E63A',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: size * 0.1,
          left: size * 0.14,
          width: size * 0.42,
          height: size * 0.28,
          borderRadius: size * 0.2,
          backgroundColor: 'rgba(255, 255, 255, 0.28)',
        }}
      />
      {holes.map((spot) => (
        <View
          key={`${spot.x}-${spot.y}`}
          style={{
            position: 'absolute',
            left: size * spot.x - hole / 2,
            top: size * spot.y - hole / 2,
            width: hole,
            height: hole,
            borderRadius: hole / 2,
            backgroundColor: '#4D7C0F',
            opacity: 0.45,
          }}
        />
      ))}
    </View>
  );
}

/** Stylized Earth for discover / public-leagues CTAs. */
export function GlobeMark({ size }: { size: number }) {
  const r = size / 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: '#1D4ED8',
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: '#1E3A8A',
        shadowColor: '#1E3A8A',
        shadowOpacity: 0.28,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          left: size * 0.12,
          width: size * 0.42,
          height: size * 0.28,
          borderRadius: size * 0.2,
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.22,
          left: size * 0.18,
          width: size * 0.34,
          height: size * 0.26,
          borderRadius: size * 0.16,
          backgroundColor: '#4ADE80',
          transform: [{ rotate: '-18deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.48,
          left: size * 0.08,
          width: size * 0.28,
          height: size * 0.2,
          borderRadius: size * 0.12,
          backgroundColor: '#22C55E',
          transform: [{ rotate: '12deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.3,
          right: size * 0.06,
          width: size * 0.32,
          height: size * 0.38,
          borderRadius: size * 0.18,
          backgroundColor: '#16A34A',
          transform: [{ rotate: '8deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          left: size * 0.46,
          width: StyleSheet.hairlineWidth * 2,
          height: size * 0.64,
          backgroundColor: 'rgba(191, 219, 254, 0.55)',
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.36,
          left: size * 0.1,
          width: size * 0.8,
          height: StyleSheet.hairlineWidth * 2,
          backgroundColor: 'rgba(191, 219, 254, 0.45)',
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.58,
          left: size * 0.14,
          width: size * 0.72,
          height: StyleSheet.hairlineWidth * 2,
          backgroundColor: 'rgba(191, 219, 254, 0.35)',
          borderRadius: 1,
        }}
      />
    </View>
  );
}

/** Classic Connect 4 discs: yellow behind, red in front. */
export function ConnectFourGlyph({ size }: { size: number }) {
  const disc = size * 0.62;
  const rim = Math.max(1.5, disc * 0.12);
  const inset = disc * 0.55;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          left: size * 0.06,
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          backgroundColor: '#FACC15',
          borderWidth: rim,
          borderColor: '#EAB308',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: inset,
            height: inset,
            borderRadius: inset / 2,
            backgroundColor: '#FDE047',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(161, 98, 7, 0.25)',
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.06,
          right: size * 0.04,
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          backgroundColor: '#EF4444',
          borderWidth: rim,
          borderColor: '#DC2626',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: inset,
            height: inset,
            borderRadius: inset / 2,
            backgroundColor: '#F87171',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(127, 29, 29, 0.28)',
          }}
        />
      </View>
    </View>
  );
}

/** Rummikub-style numbered tile. */
export function RummikubTileGlyph({ size }: { size: number }) {
  const w = size * 0.62;
  const h = size * 0.82;
  const radius = Math.max(2, size * 0.08);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: w,
          height: h,
          borderRadius: radius,
          backgroundColor: '#FFFDF8',
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: 'rgba(15, 23, 42, 0.2)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#0F172A',
          shadowOpacity: 0.12,
          shadowRadius: 1.5,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
      >
        <Text
          style={{
            fontSize: size * 0.42,
            lineHeight: size * 0.46,
            fontWeight: '800',
            color: '#2563EB',
            includeFontPadding: false,
          }}
        >
          13
        </Text>
      </View>
    </View>
  );
}

/** Simple locomotive mark for Ticket to Ride. */
export function TrainGlyph({ size }: { size: number }) {
  const bodyH = size * 0.34;
  const bodyW = size * 0.72;
  const cabW = size * 0.28;
  const stackW = size * 0.12;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.12,
          left: size * 0.22,
          width: stackW,
          height: size * 0.22,
          borderRadius: stackW / 2,
          backgroundColor: '#1E293B',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.06,
          left: size * 0.16,
          width: size * 0.24,
          height: size * 0.1,
          borderRadius: size * 0.05,
          backgroundColor: 'rgba(148, 163, 184, 0.9)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.3,
          left: size * 0.12,
          width: bodyW,
          height: bodyH,
          borderRadius: size * 0.08,
          backgroundColor: '#DC2626',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.22,
          right: size * 0.14,
          width: cabW,
          height: size * 0.42,
          borderTopLeftRadius: size * 0.06,
          borderTopRightRadius: size * 0.06,
          borderBottomRightRadius: size * 0.04,
          backgroundColor: '#0F172A',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.3,
          right: size * 0.2,
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: 2,
          backgroundColor: '#7DD3FC',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.16,
          left: size * 0.2,
          width: size * 0.18,
          height: size * 0.18,
          borderRadius: size * 0.09,
          backgroundColor: '#334155',
          borderWidth: Math.max(1, size * 0.03),
          borderColor: '#94A3B8',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.16,
          right: size * 0.22,
          width: size * 0.18,
          height: size * 0.18,
          borderRadius: size * 0.09,
          backgroundColor: '#334155',
          borderWidth: Math.max(1, size * 0.03),
          borderColor: '#94A3B8',
        }}
      />
    </View>
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
  if (template.id.startsWith('pickleball')) {
    return <WhiffleBallGlyph size={size} />;
  }
  if (template.id === 'connect_four') {
    return <ConnectFourGlyph size={size} />;
  }
  if (template.id === 'rummikub') {
    return <RummikubTileGlyph size={size} />;
  }
  if (template.id === 'ticket_to_ride') {
    return <TrainGlyph size={size} />;
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

