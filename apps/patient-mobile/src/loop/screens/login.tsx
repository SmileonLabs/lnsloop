import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  Image,
  TextInput,
  Platform,
  Alert,
  AppState,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import type { Study, HealthRecord, SubmissionInput } from "@loop/contracts";
import { useSession, ApiError } from "../session";
import { Card, Button, Check, Label, styles, colors } from "../ui";
import {
  health,
  readPrivate,
  writePrivate,
  deletePrivate,
  nativeHealth,
} from "../health";
import { typeLabels } from "../i18n";
import { useTask, Page, StudyCard } from "../screen-shared";
export function LoginScreen() {
  const { t, login, request, token, ready } = useSession(),
    task = useTask(),
    router = useRouter(),
    [test, setTest] = useState(false);
  useEffect(() => {
    if (ready && token) router.replace("/(tabs)");
  }, [token, ready]);
  useEffect(() => {
    request("/auth/config")
      .then((c) =>
        setTest(
          c.testAuth && process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH === "true",
        ),
      )
      .catch(() => {});
  }, []);
  return (
    <Page title="LNS Loop" task={task}>
      <Image
        source={require("../../../assets/brand/loop.png")}
        style={{ height: 240, width: "100%" }}
        resizeMode="contain"
      />
      <Text style={styles.title}>{t("tagline")}</Text>
      <Label muted>{t("intro")}</Label>
      <Button
        title={t("login")}
        busy={task.busy}
        onPress={() =>
          void task.run(async () => {
            if (
              Platform.OS === "web" ||
              !process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
            )
              throw new Error(t("configMissing"));
            const { GoogleSignin } =
              await import("@react-native-google-signin/google-signin");
            GoogleSignin.configure({
              webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
              iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
            });
            if (
              Platform.OS === "ios" &&
              !process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
            )
              throw new Error(t("configMissing"));
            if (Platform.OS === "android") await GoogleSignin.hasPlayServices();
            const result = await GoogleSignin.signIn();
            if (result.type === "cancelled") return;
            if (!result.data.idToken)
              throw new Error("Google identity unavailable");
            await login("/auth/google", { idToken: result.data.idToken });
          })
        }
      />
      {test && (
        <Button
          secondary
          title={t("test")}
          onPress={() =>
            void task.run(() => login("/auth/test", { subject: "participant" }))
          }
        />
      )}
      <Button
        secondary
        title={t("privacy")}
        onPress={() =>
          router.push({ pathname: "/information", params: { kind: "privacy" } })
        }
      />
      <Button
        secondary
        title={t("terms")}
        onPress={() =>
          router.push({ pathname: "/information", params: { kind: "terms" } })
        }
      />
    </Page>
  );
}
