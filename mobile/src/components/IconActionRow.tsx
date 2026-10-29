import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { PencilSimple, Trash } from './icons';
import { spacing } from '../constants/theme';
import { useThemeTokens } from '../lib/theme';

type Props = {
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
};

export function IconActionRow({ onEdit, onDelete, editLabel, deleteLabel }: Props) {
  const theme = useThemeTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.editButton}
        onPress={onEdit}
        accessibilityLabel={editLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <PencilSimple size={22} color={theme.colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        accessibilityLabel={deleteLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Trash size={20} color={theme.colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useThemeTokens>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    editButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark ? 'rgba(96,165,250,0.18)' : 'rgba(37, 99, 235, 0.12)',
    },
    deleteButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(220, 38, 38, 0.12)',
    },
  });
}
