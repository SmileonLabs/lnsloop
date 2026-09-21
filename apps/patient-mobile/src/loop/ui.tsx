import {
  Text,
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";
export const colors = {
  bg: "#181C20",
  surface: "#242A2E",
  line: "#384146",
  text: "#F6F8F7",
  muted: "#ADB8BE",
  mint: "#B8F4DA",
  soft: "#233C35",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 24,
    gap: 18,
    paddingBottom: 36,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 39,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 30,
  },
  text: { color: colors.text, fontSize: 16, lineHeight: 25 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    minHeight: 52,
    padding: 12,
    color: colors.text,
    fontSize: 16,
  },
  balance: { color: colors.text, fontSize: 60, fontWeight: "600" },
  error: { color: "#FFD4CF", fontSize: 15, lineHeight: 23 },
});
export function Label({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return <Text style={muted ? styles.muted : styles.text}>{children}</Text>;
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 15,
          padding: 18,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  busy = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        padding: 14,
        borderRadius: 11,
        backgroundColor: secondary ? colors.surface : colors.mint,
        borderWidth: 1,
        borderColor: secondary ? colors.line : colors.mint,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled || busy ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={colors.bg} />
      ) : (
        <Text
          style={{
            color: secondary ? colors.text : colors.bg,
            fontSize: 16,
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={onChange}
      style={{
        minHeight: 52,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          height: 24,
          width: 24,
          borderRadius: 5,
          borderWidth: 1,
          borderColor: colors.mint,
          backgroundColor: value ? colors.mint : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value && <Text style={{ color: colors.bg }}>✓</Text>}
      </View>
      <Text style={[styles.text, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}
