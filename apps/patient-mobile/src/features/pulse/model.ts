export const pulseStages = ['detected', 'mission', 'verifying', 'capsule'] as const;

export type PulseStage = (typeof pulseStages)[number];

export type PulseSource = 'wearable' | 'selfReport' | 'hospital';

export interface PulseSignal {
  id: PulseSource;
  label: string;
  color: string;
  verified: boolean;
}

export const signals: PulseSignal[] = [
  { id: 'wearable', label: '수면 변화', color: '#58D1BC', verified: true },
  { id: 'selfReport', label: '증상 기록', color: '#FF8A72', verified: true },
  { id: 'hospital', label: '병원 기록 확인', color: '#9787FF', verified: true },
];

export interface MissionTask {
  id: string;
  title: string;
  detail: string;
  status: 'complete' | 'current' | 'verified';
}

export const missionTasks: MissionTask[] = [
  {
    id: 'symptom',
    title: '30초 증상 체크',
    detail: '오늘의 몸 상태를 간단히 남겨요',
    status: 'current',
  },
  {
    id: 'wearable',
    title: '웨어러블 자동 연결',
    detail: '수면과 활동 흐름을 가져왔어요',
    status: 'complete',
  },
  {
    id: 'medication',
    title: '약물 변경 확인됨',
    detail: '병원 기록에서 시점을 확인했어요',
    status: 'verified',
  },
];

/**
 * Server-shaped synthetic payload used only by this motion PoC.
 * Replace this export with API data before any participant-facing build.
 */
export const demoPulsePayload = {
  synthetic: true,
  mission: {
    progress: 0.58,
    verifyingProgress: 0.78,
    remainingHours: 42,
  },
  reward: {
    amount: 12,
    currency: 'LNS',
    status: 'confirmed' as const,
  },
  capsule: {
    hospitalRecordVerified: true,
    recoveryInterpretationValidated: false,
  },
} as const;

export function nextPulseStage(stage: PulseStage): PulseStage {
  switch (stage) {
    case 'detected':
      return 'mission';
    case 'mission':
      return 'verifying';
    case 'verifying':
      return 'capsule';
    case 'capsule':
      return 'detected';
  }
}

export function isRewardConfirmed(stage: PulseStage): boolean {
  return stage === 'capsule';
}
