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
export function SubmissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { request, t, lang } = useSession(),
    task = useTask(),
    [item, setItem] = useState<any>(null);
  useEffect(() => {
    void task.run(async () => setItem(await request("/submissions/" + id)));
  }, [id]);
  return (
    <Page title={t("detail")} task={task} back>
      {item && (
        <Card>
          <Text style={styles.balance}>{item.points} P</Text>
          <Label>
            {t("status")}: {statusLabel(item.status, lang)}
          </Label>
          <Label muted>
            {t("period")}: {new Date(item.period_start).toLocaleDateString()} –{" "}
            {new Date(item.period_end).toLocaleDateString()}
          </Label>
          {item.reason && (
            <Label>
              {t("reason")}: {item.reason}
            </Label>
          )}
          <Label muted>{item.data.records.length} records</Label>
        </Card>
      )}
    </Page>
  );
}
