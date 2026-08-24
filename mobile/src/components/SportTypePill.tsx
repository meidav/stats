import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { TemplateGlyph } from './TemplateGlyph';
import type { Sport } from '../types';

type Props = {
  name: string;
  templateId?: string;
  category?: Sport['category'];
  style?: ViewStyle;
};

export function SportTypePill({ name, templateId, category = 'custom', style }: Props) {
  return (
    <View style={[styles.pill, style]}>
      <TemplateGlyph template={{ id: templateId, category }} size={18} />
      <Text style={styles.text} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(219, 234, 254, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.95)',
    maxWidth: '100%',
  },
  text: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 13,
    flexShrink: 1,
  },
});
