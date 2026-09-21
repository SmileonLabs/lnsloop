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
export function JoinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { request, t, lang } = useSession(),
    router = useRouter(),
    task = useTask(),
    [study, setStudy] = useState<Study | null>(null),
    [step, setStep] = useState(0),
    [accepted, setAccepted] = useState(false),
    [selections, setSelections] = useState<Record<string, boolean>>({}),
    [answers, setAnswers] = useState<Record<string, string>>({});
  useEffect(() => {
    void task.run(async () => setStudy(await request("/studies/" + id)));
  }, [id]);
  return (
    <Page title={step === 0 ? t("consent") : t("eligibility")} back task={task}>
      <Label muted>{step + 1} / 2</Label>
      {study &&
        (step === 0 ? (
          <>
            <Card>
              <Label>{study.config.consent[lang]}</Label>
              <Label muted>
                {t("recipient")}: {study.config.recipient}
              </Label>
              <Label muted>
                {lang === "ko" ? "보관 기간" : "Retention"}:{" "}
                {study.config.retentionDays} {lang === "ko" ? "일" : "days"}
              </Label>
            </Card>
            <Check
              label={t("accepted")}
              value={accepted}
              onChange={() => setAccepted(!accepted)}
            />
            {(study.config.consentItems ?? []).map((c) => (
              <Check
                key={c.id}
                label={c.label[lang] + (c.required ? " *" : "")}
                value={Boolean(selections[c.id])}
                onChange={() =>
                  setSelections((s) => ({ ...s, [c.id]: !s[c.id] }))
                }
              />
            ))}
            <Button
              title={t("continue")}
              disabled={
                !accepted ||
                (study.config.consentItems ?? []).some(
                  (c) => c.required && !selections[c.id],
                )
              }
              onPress={() => setStep(1)}
            />
          </>
        ) : (
          <>
            {study.config.eligibility.map((q) => (
              <Card key={q.id}>
                <Label>{q.label[lang]}</Label>
                {q.options.map((option) => (
                  <Check
                    key={option}
                    label={option}
                    value={answers[q.id] === option}
                    onChange={() =>
                      setAnswers((a) => ({ ...a, [q.id]: option }))
                    }
                  />
                ))}
              </Card>
            ))}
            <Button
              title={t("join")}
              busy={task.busy}
              disabled={!study.config.eligibility.every((q) => answers[q.id])}
              onPress={() =>
                void task.run(async () => {
                  await request("/enrollments", "POST", {
                    studyId: id,
                    version: study.version,
                    accepted,
                    selections,
                    answers,
                  });
                  router.replace({
                    pathname: "/connection/[id]",
                    params: { id },
                  });
                })
              }
            />
          </>
        ))}
    </Page>
  );
}
