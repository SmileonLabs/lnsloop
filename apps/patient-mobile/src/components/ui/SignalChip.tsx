import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../../theme/tokens';

interface SignalChipProps {
  label: string;
  color: string;
  icon: string;
}

export function SignalChip({ label, color, icon }: SignalChipProps) {
  return (
    <View accessibilityLabel={label} style={styles.chip}>
      <View style={[styles.iconShell, { borderColor: `${color}66` }]}>
        <Text style={[styles.icon, { color }]}>{icon}</Text>
      </View>
      <Text numberOfLines={2} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.panelSoft,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minHeight: 82,
    paddingHorizontal: 6,
    paddingVertical: 11,
  },
  iconShell: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  icon: {
    fontSize: 15,
    fontWeight: '700',
  },
  label: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textAlign: 'center',
  },
});
