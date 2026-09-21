import { View, type ColorValue } from "react-native";
export function TabIcon({ name, color }: { name: string; color: ColorValue }) {
  const border = { borderColor: color, borderWidth: 1.6 };
  return (
    <View
      style={{
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {name === "home" ? (
        <>
          <View
            style={{
              ...border,
              width: 15,
              height: 15,
              transform: [{ rotate: "45deg" }],
              borderRightWidth: 0,
              borderBottomWidth: 0,
              position: "absolute",
              top: 3,
            }}
          />
          <View
            style={{
              ...border,
              width: 16,
              height: 13,
              borderTopWidth: 0,
              position: "absolute",
              bottom: 1,
            }}
          />
        </>
      ) : name === "research" ? (
        <>
          <View
            style={{
              ...border,
              width: 17,
              height: 17,
              borderRadius: 10,
              position: "absolute",
              left: 1,
              top: 1,
            }}
          />
          <View
            style={{
              width: 10,
              height: 1.6,
              backgroundColor: color,
              transform: [{ rotate: "45deg" }],
              position: "absolute",
              right: 0,
              bottom: 3,
            }}
          />
        </>
      ) : name === "points" ? (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
          {[10, 18, 24].map((h) => (
            <View
              key={h}
              style={{ ...border, width: 5, height: h, borderRadius: 1 }}
            />
          ))}
        </View>
      ) : (
        <>
          <View
            style={{
              ...border,
              width: 10,
              height: 10,
              borderRadius: 6,
              position: "absolute",
              top: 0,
            }}
          />
          <View
            style={{
              ...border,
              width: 20,
              height: 10,
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
              position: "absolute",
              bottom: 1,
            }}
          />
        </>
      )}
    </View>
  );
}
