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
export function ResearchScreen() {
  const { request, t } = useSession(),
    task = useTask(),
    [studies, setStudies] = useState<Study[]>([]);
  const load = () =>
    task.run(async () => setStudies(await request("/studies")));
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [request]),
  );
  return (
    <Page title={t("research")} task={task}>
      {studies.map((s) => (
        <StudyCard key={s.id} study={s} />
      ))}
      {!task.busy && !studies.length && <Label muted>{t("noStudies")}</Label>}
      <Button secondary title={t("refresh")} onPress={() => void load()} />
    </Page>
  );
}
