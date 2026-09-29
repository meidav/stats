import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { TemplateGlyph } from './TemplateGlyph';
import { useThemeTokens } from '../lib/theme';
import type { Sport } from '../types';

type Props = {
  name: string;
  templateId?: string;
  category?: Sport['category'];
  style?: ViewStyle;
};

export function SportTypePill({ name, templateId, category = 'custom', style }: Props) {
  const theme = useThemeTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.pill, style]}>
      <TemplateGlyph template={{ id: templateId || 'custom', category }} size={18} />
      <Text style={styles.text} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useThemeTokens>) {
  const { colors } = theme;
  return StyleSheet.create({
    pill: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.fieldBg,
      borderWidth: 1,
      borderColor: colors.fieldBorder,
      maxWidth: '100%',
    },
    text: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
      flexShrink: 1,
    },
  });
}
