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
export function InformationScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>(),
    { t, lang } = useSession();
  return (
    <Page title={kind === "terms" ? t("terms") : t("privacy")} back>
      <Label>
        {lang === "ko"
          ? "LNS Loop는 선택한 연구의 동의 범위에서 건강데이터를 제공합니다. 제공 항목, 기관, 기간과 보관 정책은 각 연구 설명에서 확인할 수 있습니다. 권한과 연구 참여는 언제든 관리할 수 있으며 기존 확정 포인트는 철회만으로 회수되지 않습니다."
          : "LNS Loop shares health data within your selected study’s consent. Review the study for data types, recipient, duration and retention. You can manage permissions and withdraw. Withdrawal does not remove confirmed points."}
      </Label>
      <Label muted>
        {lang === "ko"
          ? "운영 약관·개인정보처리방침의 최종 문서와 문의처는 서비스 출시 전에 연결됩니다."
          : "Final service terms, privacy policy and support contact must be configured before launch."}
      </Label>
    </Page>
  );
}
