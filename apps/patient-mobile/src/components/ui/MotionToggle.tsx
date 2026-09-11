import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../../theme/tokens';

interface MotionToggleProps {
  reduced: boolean;
  onToggle: () => void;
}

export function MotionToggle({ reduced, onToggle }: MotionToggleProps) {
  return (
    <Pressable
      accessibilityLabel={reduced ? '모션 줄이기 끄기' : '모션 줄이기 켜기'}
      accessibilityRole="switch"
      accessibilityState={{ checked: reduced }}
      hitSlop={10}
      onPress={onToggle}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={[styles.dot, reduced && styles.dotReduced]} />
      <Text style={styles.label}>{reduced ? '정적' : '모션'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.panelSoft,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 36,
    paddingHorizontal: 11,
  },
  pressed: {
    opacity: 0.72,
  },
  dot: {
    backgroundColor: colors.mint,
    borderRadius: 4,
    height: 8,
    shadowColor: colors.mint,
    shadowOpacity: 0.8,
    shadowRadius: 5,
    width: 8,
  },
  dotReduced: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
