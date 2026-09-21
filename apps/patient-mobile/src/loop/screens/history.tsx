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
import { statusLabel } from "../status";
import { useTask, Page, StudyCard } from "../screen-shared";
export function HistoryScreen() {
  const { request, t, lang } = useSession(),
    task = useTask(),
    router = useRouter(),
    [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    void task.run(async () => setItems(await request("/submissions")));
  }, []);
  return (
    <Page title={t("history")} task={task} back>
      {items.map((s) => (
        <Card key={s.id}>
          <Label>
            {statusLabel(s.activity, lang)} · {statusLabel(s.status, lang)}
          </Label>
          <Label muted>{new Date(s.created_at).toLocaleString()}</Label>
          <Button
            secondary
            title={t("detail")}
            onPress={() =>
              router.push({
                pathname: "/submission/[id]",
                params: { id: s.id },
              })
            }
          />
        </Card>
      ))}
    </Page>
  );
}
