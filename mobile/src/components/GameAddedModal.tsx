import React, { useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { GameList } from './GameList';
import { StatsTable } from './StatsTable';
import { X } from './icons';
import { spacing } from '../constants/theme';
import { useThemeTokens } from '../lib/theme';
import type { Game, PlayerStat } from '../types';

const AUTO_DISMISS_MS = 7000;

type Props = {
  visible: boolean;
  game: Game | null;
  todayStats: PlayerStat[];
  winLoss?: boolean;
  onClose: () => void;
};

export function GameAddedModal({ visible, game, todayStats, winLoss, onClose }: Props) {
  const theme = useThemeTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Game saved</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}
              activeOpacity={0.85}
            >
              <X size={22} color={theme.colors.text} weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {game ? (
              <GameList
                games={[game]}
                canEdit={false}
                winLoss={winLoss}
                onEdit={() => undefined}
                onDelete={() => undefined}
              />
            ) : null}

            {todayStats.length > 0 ? (
              <View style={styles.todayBlock}>
                <View style={styles.todayHeader}>
                  <Text style={styles.todayTitle}>Today's stats</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{todayStats.length}</Text>
                  </View>
                </View>
                <StatsTable stats={todayStats} />
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: ReturnType<typeof useThemeTokens>) {
  const { colors } = theme;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
    },
    sheet: {
      maxHeight: '78%',
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.fieldBorder,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.06)',
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    todayBlock: {
      gap: spacing.sm,
    },
    todayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 4,
    },
    todayTitle: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.text,
    },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark ? `${colors.primary}33` : `${colors.primary}22`,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
    },
  });
}
