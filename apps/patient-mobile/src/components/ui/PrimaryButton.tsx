import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius } from '../../theme/tokens';
import { motion } from '../../theme/motion';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
  accessibilityHint?: string;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  trailing,
  accessibilityHint,
}: PrimaryButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0.72 : 1,
    transform: [{ scale: scale.value }],
  }));

  const press = (value: number) => {
    scale.value = withTiming(value, {
      duration: motion.tap,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  };

  return (
    <Animated.View style={[styles.shell, animatedStyle]}>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => press(0.98)}
        onPressOut={() => press(1)}
        style={styles.pressable}
      >
        <LinearGradient
          colors={[colors.mintBright, colors.mint]}
          end={{ x: 1, y: 0.9 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <Text style={styles.label}>{label}</Text>
          {trailing}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    shadowColor: colors.mint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
  pressable: {
    minHeight: 58,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 22,
  },
  label: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
});
