import type { Language } from "./i18n";
const labels: Record<string, [string, string]> = {
  pending: ["확인 중", "Under review"],
  approved: ["적립 완료", "Confirmed"],
  needs_correction: ["보완 필요", "Needs correction"],
  rejected: ["반려", "Rejected"],
  health: ["건강데이터 제공", "Health contribution"],
  survey: ["설문 제출", "Survey"],
  award: ["기여 포인트", "Contribution points"],
  adjustment: ["포인트 조정", "Point adjustment"],
};
export const statusLabel = (value: string, lang: Language) =>
  labels[value]?.[lang === "ko" ? 0 : 1] ?? value;
