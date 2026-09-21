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
import { useSession, ApiError } from "./session";
import { Card, Button, Check, Label, styles, colors } from "./ui";
import {
  health,
  readPrivate,
  writePrivate,
  deletePrivate,
  nativeHealth,
} from "./health";
import { typeLabels } from "./i18n";
export function useTask() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}
export function Page({
  title,
  children,
  task,
  back = false,
}: {
  title: string;
  children: React.ReactNode;
  task?: ReturnType<typeof useTask>;
  back?: boolean;
}) {
  const router = useRouter(),
    { t } = useSession();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {back && (
        <Button
          title={"‹ " + t("back")}
          secondary
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
        />
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {task?.error && (
        <Card>
          <Text accessibilityRole="alert" style={styles.error}>
            {task.error}
          </Text>
        </Card>
      )}
      {task?.busy && <ActivityIndicator color={colors.mint} />}
      {children}
    </ScrollView>
  );
}
export function StudyCard({ study }: { study: Study }) {
  const { lang, t } = useSession(),
    router = useRouter();
  return (
    <Card>
      <Text style={styles.heading}>{study.config.title[lang]}</Text>
      <Label muted>{study.config.description[lang]}</Label>
      <Label>
        {study.config.points} P · {study.config.recipient}
      </Label>
      {study.config.testOnly && <Label muted>{t("testHint")}</Label>}
      <Button
        title={t("detail")}
        onPress={() =>
          router.push({ pathname: "/study/[id]", params: { id: study.id } })
        }
      />
    </Card>
  );
}
