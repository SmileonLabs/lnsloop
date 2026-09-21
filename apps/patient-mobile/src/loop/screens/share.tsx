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
export function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { request, t, lang, user } = useSession(),
    task = useTask(),
    [study, setStudy] = useState<Study | null>(null),
    [payload, setPayload] = useState<SubmissionInput | null>(null),
    [result, setResult] = useState<any>(null),
    [expanded, setExpanded] = useState(false);
  const prepare = () =>
    task.run(async () => {
      const s = await request("/studies/" + id);
      setStudy(s);
      const w = await request("/studies/" + id + "/window");
      const end = new Date(
        Math.min(Date.parse(w.end), Date.now()),
      ).toISOString();
      const records = (await health.read(s.config.types, w.start, end)).filter(
        (r) =>
          Date.parse(r.start) >= Date.parse(w.start) &&
          Date.parse(r.end) <= Date.parse(end),
      );
      setPayload({
        studyId: id,
        version: s.version,
        activity: "health",
        periodStart: w.start,
        periodEnd: w.end,
        records,
        answers: {},
      });
    });
  useEffect(() => {
    void prepare();
  }, [id]);
  return (
    <Page title={t("preview")} task={task} back>
      {study && <Label>{study.config.title[lang]}</Label>}
      {result ? (
        <Card>
          <Text style={styles.heading}>
            {result.status === "approved" ? t("confirmed") : t("submitted")}
          </Text>
          <Label>
            {result.points} P · {statusLabel(result.status, lang)}
          </Label>
        </Card>
      ) : (
        payload && (
          <>
            <Card>
              <Label muted>{t("period")}</Label>
              <Label>
                {new Date(payload.periodStart).toLocaleDateString()} –{" "}
                {new Date(payload.periodEnd).toLocaleDateString()}
              </Label>
              <Label>
                {t("expected")} · {study?.config.points} P
              </Label>
              <Label muted>
                {payload.records.length} {lang === "ko" ? "개 기록" : "records"}
              </Label>
              {study?.config.types.map((k) => (
                <Label key={k}>
                  {typeLabels[k][lang === "ko" ? 0 : 1]} ·{" "}
                  {payload.records.filter((r) => r.type === k).length}
                </Label>
              ))}
              <Button
                secondary
                title={t("detail")}
                onPress={() => setExpanded(!expanded)}
              />
              {expanded &&
                payload.records.slice(0, 30).map((r, i) => (
                  <Label key={i} muted>
                    {r.origin} · {r.type} · {r.start}
                  </Label>
                ))}
            </Card>
            {!payload.records.length && <Label muted>{t("missing")}</Label>}
            <Button
              title={t("submit")}
              busy={task.busy}
              disabled={!payload.records.length}
              onPress={() =>
                void task.run(async () => {
                  try {
                    setResult(await request("/submissions", "POST", payload));
                  } catch (e) {
                    if (e instanceof ApiError) throw e;
                    const key = "queue-" + user.id;
                    const existing = (await readPrivate(key)) ?? [];
                    await writePrivate(key, [
                      ...existing.filter(
                        (p: SubmissionInput) =>
                          !(
                            p.studyId === id &&
                            p.activity === payload.activity &&
                            p.periodStart === payload.periodStart
                          ),
                      ),
                      payload,
                    ]);
                    throw new Error(t("queued"));
                  }
                })
              }
            />
          </>
        )
      )}
      <Button secondary title={t("refresh")} onPress={() => void prepare()} />
    </Page>
  );
}
