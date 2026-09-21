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
export function StudyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { request, t, lang } = useSession(),
    router = useRouter(),
    task = useTask(),
    [study, setStudy] = useState<Study | null>(null),
    [enrolled, setEnrolled] = useState(false);
  useFocusEffect(
    useCallback(() => {
      void task.run(async () => {
        const s = await request("/studies/" + id);
        setStudy(s);
        const e = await request("/enrollments");
        setEnrolled(
          e.some(
            (x: any) =>
              x.study_id === id && !x.withdrawn_at && x.version === s.version,
          ),
        );
      });
    }, [id, request]),
  );
  return (
    <Page title={study?.config.title[lang] ?? t("research")} task={task} back>
      {study && (
        <>
          <Label>{study.config.description[lang]}</Label>
          <Card>
            <Label muted>{t("recipient")}</Label>
            <Label>{study.config.recipient}</Label>
            <Label muted>{t("types")}</Label>
            <Label>
              {study.config.types
                .map((k) => typeLabels[k][lang === "ko" ? 0 : 1])
                .join(" · ")}
            </Label>
            <Label>
              {study.config.points} P / {study.config.periodDays}{" "}
              {lang === "ko" ? "일" : "days"}
            </Label>
            <Label muted>
              {new Date(study.config.startsAt).toLocaleDateString()} –{" "}
              {new Date(study.config.endsAt).toLocaleDateString()}
            </Label>
          </Card>
          <Button
            title={enrolled ? t("provide") : t("join")}
            onPress={() =>
              router.push({
                pathname: enrolled ? "/share/[id]" : "/join/[id]",
                params: { id },
              })
            }
          />
          {enrolled && (
            <>
              <Button
                secondary
                title={t("survey")}
                onPress={() =>
                  router.push({ pathname: "/survey/[id]", params: { id } })
                }
              />
              <Button
                secondary
                title={t("connected")}
                onPress={() =>
                  router.push({ pathname: "/connection/[id]", params: { id } })
                }
              />
            </>
          )}
        </>
      )}
    </Page>
  );
}
