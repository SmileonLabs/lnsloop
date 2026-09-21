import "react-native-gesture-handler";

import { Stack, useSegments, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SessionProvider, useSession } from "../src/loop/session";
import { colors } from "../src/loop/ui";
import { nativeHealth } from "../src/loop/health";

function Routes() {
  const { ready, token } = useSession(),
    segments = useSegments(),
    router = useRouter();
  const publicRoute = ["login", "information"].includes(segments[0] ?? "");
  useEffect(() => {
    if (ready && nativeHealth)
      nativeHealth.rationaleRequested().then((show: boolean) => {
        if (show)
          router.push({
            pathname: "/information",
            params: { kind: "privacy" },
          });
      });
  }, [ready]);
  useEffect(() => {
    if (ready && !token && !publicRoute) router.replace("/login");
  }, [ready, token, publicRoute]);
  if (!ready || (!token && !publicRoute)) return null;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "none",
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <SafeAreaView
            edges={["top", "left", "right"]}
            style={{ flex: 1, backgroundColor: colors.bg }}
          >
            <StatusBar style="light" />
            <Routes />
          </SafeAreaView>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
