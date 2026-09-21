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
export function ProfileScreen() {
  const { t, request, user, setUser, lang, setLang, logout, clear } =
      useSession(),
    task = useTask(),
    router = useRouter(),
    [nickname, setNickname] = useState(user.nickname),
    [ranking, setRanking] = useState(user.ranking),
    [reminders, setReminders] = useState(false),
    [enrollments, setEnrollments] = useState<any[]>([]);
  useFocusEffect(
    useCallback(() => {
      void task.run(async () => {
        setEnrollments(await request("/enrollments"));
        setReminders(Boolean(await readPrivate("reminder")));
      });
    }, [request]),
  );
  return (
    <Page title={t("profile")} task={task}>
      <Card>
        <Label>{user.email}</Label>
        <Label muted>{t("nickname")}</Label>
        <TextInput
          accessibilityLabel={t("nickname")}
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
        />
        <View style={styles.row}>
          <Button
            secondary={lang !== "ko"}
            title="한국어"
            onPress={() => setLang("ko")}
          />
          <Button
            secondary={lang !== "en"}
            title="English"
            onPress={() => setLang("en")}
          />
        </View>
        <Check
          label={t("rankingOpt")}
          value={ranking}
          onChange={() => setRanking(!ranking)}
        />
        {nativeHealth && (
          <Check
            label={
              lang === "ko"
                ? "하루 한 번 참여 알림"
                : "Daily participation reminder"
            }
            value={reminders}
            onChange={() =>
              void task.run(async () => {
                const enabled = await nativeHealth.setReminders(
                  !reminders,
                  lang,
                );
                setReminders(enabled);
                if (!enabled && !reminders)
                  throw new Error(
                    lang === "ko"
                      ? "알림 권한을 허용한 뒤 다시 켜주세요."
                      : "Allow notifications, then enable the reminder.",
                  );
              })
            }
          />
        )}
        <Button
          title={t("save")}
          busy={task.busy}
          onPress={() =>
            void task.run(async () => {
              await request("/me", "PATCH", {
                nickname,
                ranking,
                language: lang,
              });
              setUser({ ...user, nickname, ranking, language: lang });
            })
          }
        />
      </Card>
      {enrollments
        .filter((e) => !e.withdrawn_at)
        .map((e) => (
          <Button
            key={e.study_id}
            secondary
            title={t("connected") + " · " + e.study_id.slice(0, 8)}
            onPress={() =>
              router.push({
                pathname: "/connection/[id]",
                params: { id: e.study_id },
              })
            }
          />
        ))}
      <Button
        secondary
        title={t("sync")}
        onPress={() =>
          void task.run(async () => {
            const key = "queue-" + user.id;
            let queue: SubmissionInput[] = (await readPrivate(key)) ?? [];
            while (queue.length) {
              try {
                await request("/submissions", "POST", queue[0]);
              } catch (e) {
                if (
                  !(e instanceof ApiError) ||
                  e.status === 401 ||
                  e.status >= 500
                )
                  throw e;
              }
              queue = queue.slice(1);
              await writePrivate(key, queue);
            }
          })
        }
      />
      <Button
        secondary
        title={t("privacy")}
        onPress={() =>
          router.push({ pathname: "/information", params: { kind: "privacy" } })
        }
      />
      <Button
        secondary
        title={t("logout")}
        onPress={() => void task.run(logout)}
      />
      <Button
        secondary
        title={t("delete")}
        onPress={() =>
          Alert.alert(t("delete"), t("deletionConfirm"), [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("delete"),
              style: "destructive",
              onPress: () =>
                void task.run(async () => {
                  await request("/me/deletion", "POST", {});
                  await clear();
                }),
            },
          ])
        }
      />
    </Page>
  );
}
