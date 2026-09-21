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
import { prepareContribution, submitContribution } from "../contribution";
export function HomeScreen() {
  const { request, t, lang, user } = useSession(),
    router = useRouter(),
    task = useTask(),
    [data, setData] = useState<any>(null),
    [prepared, setPrepared] = useState<SubmissionInput | null>(null),
    [receipt, setReceipt] = useState<any>(null);
  const load = () =>
    task.run(async () => {
      const [studies, enrollments, points, submissions] = await Promise.all(
        ["/studies", "/enrollments", "/points", "/submissions"].map((p) =>
          request(p),
        ),
      );
      setData({ studies, enrollments, points, submissions });
    });
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [request]),
  );
  const active = data?.studies.find((s: Study) =>
    data.enrollments.some(
      (e: any) =>
        e.study_id === s.id && !e.withdrawn_at && e.version === s.version,
    ),
  );
  useEffect(() => {
    let cancelled = false;
    setPrepared(null);
    if (active && nativeHealth)
      prepareContribution(request, active)
        .then((p) => {
          if (!cancelled) setPrepared(p);
        })
        .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active?.id, active?.version, request, data]);
  const already =
    prepared &&
    data.submissions.some(
      (s: any) =>
        s.study_id === prepared.studyId &&
        s.activity === "health" &&
        new Date(s.period_start).toISOString() === prepared.periodStart &&
        ["approved", "pending"].includes(s.status),
    );
  return (
    <Page title={t("home")} task={task}>
      <Text style={styles.heading}>
        {lang === "ko"
          ? "당신의 일상, 더 큰 기여."
          : "Your everyday. A bigger impact."}
      </Text>
      {data && (
        <>
          <Card>
            <Label muted>{t("next")}</Label>
            <Text style={styles.heading}>
              {active ? active.config.title[lang] : t("explore")}
            </Text>
            {prepared && (
              <>
                <Label muted>
                  {new Date(prepared.periodStart).toLocaleDateString()} –{" "}
                  {new Date(prepared.periodEnd).toLocaleDateString()}
                </Label>
                <Label muted>
                  {active.config.types
                    .map((k: string) => typeLabels[k][lang === "ko" ? 0 : 1])
                    .join(" · ")}
                </Label>
                <Label>
                  {t("expected")}: {active.config.points} P ·{" "}
                  {prepared.records.length}{" "}
                  {lang === "ko" ? "개 기록" : "records"}
                </Label>
              </>
            )}
            {receipt && (
              <Label>
                {receipt.status === "queued"
                  ? t("queued")
                  : receipt.status === "approved"
                    ? t("confirmed")
                    : t("submitted")}
              </Label>
            )}
            <Button
              title={
                already ? t("submitted") : active ? t("provide") : t("explore")
              }
              disabled={Boolean(already) || task.busy}
              onPress={() =>
                prepared?.records.length
                  ? void task.run(async () => {
                      setReceipt(
                        await submitContribution(request, user.id, prepared),
                      );
                      await load();
                    })
                  : active
                    ? router.push({
                        pathname: "/share/[id]",
                        params: { id: active.id },
                      })
                    : router.push("/(tabs)/research")
              }
            />
            {prepared && (
              <Button
                secondary
                title={t("detail")}
                onPress={() =>
                  router.push({
                    pathname: "/share/[id]",
                    params: { id: active.id },
                  })
                }
              />
            )}
          </Card>
          <Card>
            <Label>{t("total")}</Label>
            <Text style={styles.balance}>
              {data.points.total.toLocaleString()}
            </Text>
            <Label muted>
              {t("pending")} · {data.points.pending} P
            </Label>
            <Button
              secondary
              title={t("activity")}
              onPress={() => router.push("/(tabs)/points")}
            />
          </Card>
          <Card>
            <Label>{t("week")}</Label>
            <View style={styles.row}>
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - 6 + i);
                const completed = data.submissions.some(
                  (s: any) =>
                    s.status === "approved" &&
                    new Date(s.created_at).toDateString() ===
                      date.toDateString(),
                );
                return (
                  <View
                    key={i}
                    style={{ alignItems: "center", gap: 8 }}
                    accessible
                    accessibilityLabel={
                      date.toLocaleDateString(lang) + (completed ? " ✓" : " —")
                    }
                  >
                    <Text style={styles.muted}>
                      {date.toLocaleDateString(lang, { weekday: "narrow" })}
                    </Text>
                    <View
                      style={{
                        height: 32,
                        width: 32,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.mint,
                        backgroundColor: completed
                          ? colors.mint
                          : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{ color: completed ? colors.bg : colors.muted }}
                      >
                        {completed ? "✓" : "·"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
          {active && (
            <Button
              secondary
              title={t("survey")}
              onPress={() =>
                router.push({
                  pathname: "/survey/[id]",
                  params: { id: active.id },
                })
              }
            />
          )}
        </>
      )}
      <Button secondary title={t("refresh")} onPress={() => void load()} />
    </Page>
  );
}
