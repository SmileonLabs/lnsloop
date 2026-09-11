import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/tokens';

export function Brand() {
  return (
    <View accessibilityLabel="LNS Loop 인터랙션 데모" style={styles.brand}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.mark}>
        <View style={[styles.loop, styles.loopLeft]} />
        <View style={[styles.loop, styles.loopRight]} />
      </View>
      <Text style={styles.wordmark}>LNS Loop</Text>
      <View style={styles.demoBadge}>
        <Text style={styles.demoText}>데모</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  mark: {
    height: 28,
    width: 38,
  },
  loop: {
    borderColor: colors.mint,
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    position: 'absolute',
    top: 3,
    transform: [{ rotate: '38deg' }],
    width: 15,
  },
  loopLeft: {
    left: 7,
  },
  loopRight: {
    borderColor: colors.mintBright,
    left: 17,
    transform: [{ rotate: '-38deg' }],
  },
  wordmark: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  demoBadge: {
    borderColor: colors.borderStrong,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  demoText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
  },
});
