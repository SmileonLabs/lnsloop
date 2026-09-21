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
  Pressable,
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
export function PointsScreen() {
  const { request, t, lang } = useSession(),
    task = useTask(),
    router = useRouter(),
    [points, setPoints] = useState<any>(null),
    [ranks, setRanks] = useState<any[]>([]),
    [tab, setTab] = useState(false);
  const load = () =>
    task.run(async () => {
      setPoints(await request("/points"));
      setRanks(await request("/leaderboard"));
    });
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [request]),
  );
  return (
    <Page title={t("points")} task={task}>
      {points && (
        <>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={styles.balance}>{points.total.toLocaleString()}</Text>
            <Label>{t("total")}</Label>
            <Label muted>
              {t("pending")} · {points.pending} P
            </Label>
          </View>
          <View
            accessibilityRole="tablist"
            style={{
              flexDirection: "row",
              padding: 3,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 12,
            }}
          >
            {(["activity", "ranking"] as const).map((key, i) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === (i === 1) }}
                onPress={() => setTab(i === 1)}
                style={{
                  flex: 1,
                  minHeight: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 9,
                  backgroundColor:
                    tab === (i === 1) ? "#465057" : "transparent",
                }}
              >
                <Label>{t(key)}</Label>
              </Pressable>
            ))}
          </View>
          {tab
            ? ranks.map((r, i) => (
                <Card
                  key={i}
                  style={r.me ? { backgroundColor: colors.soft } : undefined}
                >
                  <View style={styles.row}>
                    <Label>
                      {r.rank}. {r.nickname}
                    </Label>
                    <Label>{r.total} P</Label>
                  </View>
                </Card>
              ))
            : points.entries.map((e: any) => (
                <Card key={e.id}>
                  <Label>
                    {e.amount > 0 ? "+" : ""}
                    {e.amount} P
                  </Label>
                  <Label muted>
                    {e.kind === "award" ? statusLabel("award", lang) : e.reason}{" "}
                    · {new Date(e.created_at).toLocaleDateString()}
                  </Label>
                  {e.submission_id && (
                    <Button
                      secondary
                      title={t("detail")}
                      onPress={() =>
                        router.push({
                          pathname: "/submission/[id]",
                          params: { id: e.submission_id },
                        })
                      }
                    />
                  )}
                </Card>
              ))}
          {(tab ? ranks.length : points.entries.length) === 0 && (
            <Label muted>{t("empty")}</Label>
          )}
        </>
      )}
      <Button
        secondary
        title={t("history")}
        onPress={() => router.push("/history")}
      />
      <Button secondary title={t("refresh")} onPress={() => void load()} />
    </Page>
  );
}
