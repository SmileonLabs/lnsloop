import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSession } from "../../src/loop/session";
import { colors } from "../../src/loop/ui";
import { TabIcon } from "../../src/loop/tab-icon";
export default function TabLayout() {
  const { t } = useSession();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.mint,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
          minHeight: 64,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {(
        [
          ["index", "home", "⌂"],
          ["research", "research", "◉"],
          ["points", "points", "▥"],
          ["profile", "profile", "○"],
        ] as const
      ).map(([name, key, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(key),
            tabBarIcon: ({ color }) => <TabIcon name={key} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
