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
export function ConnectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { request, t, lang, token, apiUrl, user } = useSession(),
    task = useTask(),
    router = useRouter(),
    [study, setStudy] = useState<Study | null>(null),
    [permissions, setPermissions] = useState<string[]>([]),
    [available, setAvailable] = useState(false),
    [automatic, setAutomatic] = useState(false),
    [consent, setConsent] = useState<any>(null);
  const refresh = async () => {
    const s = await request("/studies/" + id);
    setStudy(s);
    setAvailable((await health.availability()).available);
    setPermissions(await health.permissions(s.config.types));
    const es = await request("/enrollments");
    setAutomatic(
      Boolean(
        es.find((e: any) => e.study_id === id && !e.withdrawn_at)?.auto_share,
      ),
    );
    setConsent(await request("/consents/" + id));
  };
  useEffect(() => {
    void task.run(refresh);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void task.run(refresh);
    });
    return () => sub.remove();
  }, [id]);
  return (
    <Page title={t("connect")} task={task} back>
      {study && (
        <>
          <Card>
            <Label>
              {Platform.OS === "ios" ? "Apple Health" : "Health Connect"}
            </Label>
            {Platform.OS === "ios" && (
              <Label muted>
                {lang === "ko"
                  ? "체크 표시는 최근 조회된 기록을 뜻합니다. 기록이 없으면 미기록인지 접근 제한인지 구분할 수 없습니다."
                  : "Checks indicate recently readable records. No results may mean no records or restricted access."}
              </Label>
            )}
            {!available ? (
              <Label muted>{t("unsupported")}</Label>
            ) : (
              study.config.types.map((k) => (
                <Label key={k}>
                  {permissions.includes(k) ? "✓" : "○"}{" "}
                  {typeLabels[k][lang === "ko" ? 0 : 1]}
                </Label>
              ))
            )}
            <Button
              title={t("connect")}
              disabled={!available}
              onPress={() =>
                void task.run(async () => {
                  await health.requestPermissions(study.config.types);
                })
              }
            />
            {!available && nativeHealth && Platform.OS === "android" && (
              <Button
                secondary
                title={
                  lang === "ko"
                    ? "Health Connect 설치 / 업데이트"
                    : "Install / update Health Connect"
                }
                onPress={() => void task.run(() => nativeHealth.install())}
              />
            )}
            {available && Platform.OS === "android" && study.config.periodDays >= 30 && nativeHealth && (
              <Button
                secondary
                title={
                  lang === "ko"
                    ? "이전 기록 접근 허용"
                    : "Allow historical records"
                }
                onPress={() =>
                  void task.run(() => nativeHealth.requestHistory())
                }
              />
            )}
            <Label muted>{t("connectionWait")}</Label>
            <Button
              secondary
              title={t("check")}
              onPress={() => void task.run(refresh)}
            />
            <Button
              secondary
              title={t("settings")}
              onPress={() => void task.run(() => health.openSettings())}
            />
          </Card>
          <Card>
            <Check
              label={t("automatic")}
              value={automatic}
              onChange={() =>
                void task.run(async () => {
                  if (!nativeHealth) throw new Error(t("unsupported"));
                  if (!automatic) {
                    await nativeHealth.configureAutomatic(id, token, apiUrl);
                    await request(
                      "/enrollments/" + id + "/automatic",
                      "PATCH",
                      { enabled: true },
                    );
                  } else {
                    await request(
                      "/enrollments/" + id + "/automatic",
                      "PATCH",
                      { enabled: false },
                    );
                    await nativeHealth.cancelAutomaticStudy(id);
                  }
                  setAutomatic(!automatic);
                })
              }
            />
            <Label muted>{t("automaticHint")}</Label>
          </Card>
          <Button
            title={t("provide")}
            disabled={!available}
            onPress={() =>
              router.replace({ pathname: "/share/[id]", params: { id } })
            }
          />
          {consent && (
            <Card>
              <Label>
                {t("consent")} · v{consent.version}
              </Label>
              <Label muted>{consent.text[lang]}</Label>
            </Card>
          )}
          <Button
            secondary
            title={t("withdraw")}
            onPress={() =>
              Alert.alert(t("withdraw"), t("withdrawConfirm"), [
                { text: t("cancel"), style: "cancel" },
                {
                  text: t("withdraw"),
                  style: "destructive",
                  onPress: () =>
                    void task.run(async () => {
                      await request(
                        "/enrollments/" + id + "/withdraw",
                        "POST",
                        {},
                      );
                      if (nativeHealth)
                        await nativeHealth.cancelAutomaticStudy(id);
                      await deletePrivate("queue-" + user.id);
                      router.replace("/(tabs)/research");
                    }),
                },
              ])
            }
          />
        </>
      )}
    </Page>
  );
}
