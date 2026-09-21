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
export function SurveyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { request, t, lang, user } = useSession(),
    task = useTask(),
    [study, setStudy] = useState<Study | null>(null),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [done, setDone] = useState(false);
  const key = "draft-" + user.id + "-" + id;
  useEffect(() => {
    void task.run(async () => {
      setStudy(await request("/studies/" + id));
      setAnswers((await readPrivate(key)) ?? {});
    });
  }, [id]);
  async function answer(q: string, value: string) {
    const next = { ...answers, [q]: value };
    setAnswers(next);
    if (nativeHealth) await writePrivate(key, next);
  }
  return (
    <Page title={t("survey")} task={task} back>
      {done ? (
        <Label>{t("submitted")}</Label>
      ) : (
        study && (
          <>
            <Label muted>{t("draft")}</Label>
            {study.config.survey.map((q) => (
              <Card key={q.id}>
                <Label>{q.label[lang]}</Label>
                {q.options.map((option) => (
                  <Check
                    key={option}
                    label={option}
                    value={answers[q.id] === option}
                    onChange={() => void task.run(() => answer(q.id, option))}
                  />
                ))}
              </Card>
            ))}
            <Button
              title={t("submit")}
              busy={task.busy}
              disabled={
                !study.config.survey.length ||
                !study.config.survey.every((q) => answers[q.id])
              }
              onPress={() =>
                void task.run(async () => {
                  const w = await request("/studies/" + id + "/window");
                  await request("/submissions", "POST", {
                    studyId: id,
                    version: study.version,
                    activity: "survey",
                    periodStart: w.start,
                    periodEnd: w.end,
                    records: [],
                    answers,
                  });
                  await deletePrivate(key);
                  setDone(true);
                })
              }
            />
          </>
        )
      )}
    </Page>
  );
}
