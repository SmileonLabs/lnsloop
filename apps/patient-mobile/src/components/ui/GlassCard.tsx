import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius } from '../../theme/tokens';

interface GlassCardProps extends PropsWithChildren {
  light?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export function GlassCard({ children, light = false, style }: GlassCardProps) {
  return <View style={[styles.card, light && styles.light, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  light: {
    backgroundColor: colors.paper,
    borderColor: 'rgba(255, 255, 255, 0.72)',
  },
});
