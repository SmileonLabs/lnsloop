import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme/tokens';
import type { PulseVisualProps } from './PulseVisual';

export function PulseVisualLoading({ height }: Pick<PulseVisualProps, 'height'>) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.host, { height }]}
    />
  );
}

export function PulseVisualStatic({ height, mode, progress = 0.58 }: PulseVisualProps) {
  if (mode === 'mission') {
    return (
      <View style={[styles.host, { height }]}>
        <View
          style={[
            styles.staticRing,
            { borderColor: progress > 0.7 ? colors.coral : colors.mint },
          ]}
        >
          <View style={[styles.ringNode, styles.ringNodeTop]} />
          <View style={[styles.ringNode, styles.ringNodeCurrent]} />
          <View style={[styles.ringNode, styles.ringNodeFuture]} />
        </View>
      </View>
    );
  }

  if (mode === 'capsule') {
    return (
      <View style={[styles.host, { height }]}>
        <View style={styles.staticCapsule}>
          <View style={[styles.capsuleRibbon, styles.ribbonMint]} />
          <View style={[styles.capsuleRibbon, styles.ribbonCoral]} />
          <View style={[styles.capsuleRibbon, styles.ribbonViolet]} />
          <View style={styles.capsuleHighlight} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.host, { height }]}>
      <View style={[styles.signalLine, styles.signalLineMint]} />
      <View style={[styles.signalLine, styles.signalLineCoral]} />
      <View style={[styles.signalLine, styles.signalLineViolet]} />
      <View style={styles.signalHalo} />
      <View style={styles.signalPoint} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  signalLine: {
    borderRadius: 2,
    height: 2,
    left: '-6%',
    position: 'absolute',
    width: '112%',
  },
  signalLineMint: {
    backgroundColor: colors.mintBright,
    transform: [{ rotate: '9deg' }],
  },
  signalLineCoral: {
    backgroundColor: colors.coral,
    transform: [{ rotate: '-6deg' }],
  },
  signalLineViolet: {
    backgroundColor: colors.violet,
    transform: [{ rotate: '3deg' }],
  },
  signalHalo: {
    borderColor: 'rgba(255, 138, 114, 0.34)',
    borderRadius: 30,
    borderWidth: 1,
    height: 60,
    position: 'absolute',
    width: 60,
  },
  signalPoint: {
    backgroundColor: colors.white,
    borderRadius: 4,
    height: 8,
    shadowColor: colors.white,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    width: 8,
  },
  staticRing: {
    borderRadius: 94,
    borderWidth: 11,
    height: 188,
    position: 'relative',
    width: 188,
  },
  ringNode: {
    backgroundColor: colors.ink,
    borderRadius: 17,
    borderWidth: 3,
    height: 34,
    position: 'absolute',
    width: 34,
  },
  ringNodeTop: {
    borderColor: colors.mintBright,
    left: 66,
    top: -22,
  },
  ringNodeCurrent: {
    borderColor: colors.coral,
    bottom: -8,
    left: 14,
  },
  ringNodeFuture: {
    borderColor: colors.violet,
    left: -22,
    top: 68,
  },
  staticCapsule: {
    backgroundColor: 'rgba(88, 209, 188, 0.1)',
    borderColor: colors.mintBright,
    borderRadius: 72,
    borderWidth: 2,
    height: 218,
    overflow: 'hidden',
    position: 'relative',
    width: 144,
  },
  capsuleRibbon: {
    borderRadius: 9,
    height: 250,
    opacity: 0.72,
    position: 'absolute',
    top: -16,
    transform: [{ rotate: '20deg' }],
    width: 10,
  },
  ribbonMint: {
    backgroundColor: colors.mintBright,
    left: 45,
  },
  ribbonCoral: {
    backgroundColor: colors.coral,
    left: 65,
  },
  ribbonViolet: {
    backgroundColor: colors.violet,
    left: 85,
  },
  capsuleHighlight: {
    backgroundColor: colors.white,
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    right: 38,
    top: 38,
    width: 6,
  },
});
