import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../../theme/tokens';

export function AppFrame({ children }: PropsWithChildren) {
  const { height } = useWindowDimensions();
  const web = Platform.OS === 'web';

  return (
    <LinearGradient
      colors={['#123739', colors.ink, '#031012']}
      style={styles.stage}
    >
      <View
        style={[
          styles.phone,
          web && styles.phoneWeb,
          web && { height: Math.min(876, Math.max(680, height - 36)) },
        ]}
      >
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  phone: {
    backgroundColor: colors.ink,
    flex: 1,
    maxWidth: 430,
    overflow: 'hidden',
    width: '100%',
  },
  phoneWeb: {
    borderColor: 'rgba(206, 245, 235, 0.22)',
    borderRadius: 44,
    borderWidth: 1,
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.46,
    shadowRadius: 42,
  },
});
