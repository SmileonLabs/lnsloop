import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ScreenCapture from 'expo-screen-capture';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import PulseVisualHost from '../../components/pulse/PulseVisualHost';
import { AppFrame } from '../../components/ui/AppFrame';
import { Brand } from '../../components/ui/Brand';
import { GlassCard } from '../../components/ui/GlassCard';
import { MotionToggle } from '../../components/ui/MotionToggle';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SignalChip } from '../../components/ui/SignalChip';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { pulseMotionMode } from '../../config/runtime';
import { demoPulsePayload, missionTasks, signals, type PulseStage } from './model';

const stageOrder: PulseStage[] = ['detected', 'mission', 'capsule'];

function quietHaptic(kind: 'selection' | 'success' | 'light') {
  if (Platform.OS === 'web') return;

  const action =
    kind === 'selection'
      ? Haptics.selectionAsync()
      : kind === 'success'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  void action.catch(() => undefined);
}

interface HeaderProps {
  reduced: boolean;
  onToggleMotion: () => void;
  onBack?: () => void;
}

function Header({ reduced, onToggleMotion, onBack }: HeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityLabel="이전 화면"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
      ) : (
        <Brand />
      )}
      {onBack ? <Text style={styles.headerBrand}>LNS Loop · 데모</Text> : <View style={styles.headerSpacer} />}
      <MotionToggle onToggle={onToggleMotion} reduced={reduced} />
    </View>
  );
}

interface StageDotsProps {
  stage: PulseStage;
}

const stageLabels: Record<Exclude<PulseStage, 'verifying'>, string> = {
  detected: '변화 감지',
  mission: '72시간 기록',
  capsule: '변화 캡슐',
};

function StageDots({ stage }: StageDotsProps) {
  const visibleStage = stage === 'verifying' ? 'mission' : stage;
  const currentIndex = stageOrder.indexOf(visibleStage);
  return (
    <View
      accessibilityLabel="LNS Pulse 진행 단계"
      accessibilityRole="progressbar"
      accessibilityValue={{
        max: stageOrder.length,
        min: 1,
        now: currentIndex + 1,
        text: `${currentIndex + 1}단계, ${stageLabels[visibleStage]}`,
      }}
      style={styles.stageDots}
    >
      {stageOrder.map((item) => (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          key={item}
          style={[styles.stageDot, visibleStage === item && styles.stageDotActive]}
        />
      ))}
    </View>
  );
}

interface ScreenProps {
  reduced: boolean;
  onToggleMotion: () => void;
}

interface DetectedScreenProps extends ScreenProps {
  onStart: () => void;
}

function DetectedScreen({ reduced, onStart, onToggleMotion }: DetectedScreenProps) {
  return (
    <ScreenScroll>
      <Header onToggleMotion={onToggleMotion} reduced={reduced} />
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>LNS PULSE</Text>
        <Text accessibilityRole="header" style={styles.title}>
          변화의 순간이 열렸어요
        </Text>
        <Text style={styles.subtitle}>평소와 다른 흐름이 기록되고 있어요.</Text>
      </View>

      <PulseVisualHost height={226} mode="detected" reducedMotion={reduced} />

      <View style={styles.signalRow}>
        <SignalChip color={signals[0].color} icon="◔" label={signals[0].label} />
        <SignalChip color={signals[1].color} icon="⌁" label={signals[1].label} />
        <SignalChip color={signals[2].color} icon="✓" label={signals[2].label} />
      </View>

      <GlassCard light style={styles.calloutCard}>
        <View style={styles.calloutHeader}>
          <View style={styles.hourglass}>
            <Text style={styles.hourglassIcon}>⌛</Text>
          </View>
          <View style={styles.calloutCopy}>
            <Text style={styles.calloutTitle}>72시간 변화 기록</Text>
            <Text style={styles.calloutSubtitle}>하루 30초면 충분해요.</Text>
          </View>
        </View>
        <PrimaryButton
          accessibilityHint="72시간 연구 기록 미션 화면으로 이동합니다"
          label="기록 시작하기"
          onPress={onStart}
        />
      </GlassCard>

      <View style={styles.safetyNote}>
        <Text style={styles.safetyIcon}>ⓘ</Text>
        <Text style={styles.safetyText}>이 알림은 진단이 아니에요.</Text>
      </View>
    </ScreenScroll>
  );
}

interface MissionScreenProps extends ScreenProps {
  verifying: boolean;
  onBack: () => void;
  onComplete: () => void;
}

function MissionScreen({
  onBack,
  onComplete,
  onToggleMotion,
  reduced,
  verifying,
}: MissionScreenProps) {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInValue, setCheckInValue] = useState<string | null>(null);
  const rewardAmount = `+${demoPulsePayload.reward.amount} ${demoPulsePayload.reward.currency}`;

  const handlePrimaryAction = () => {
    if (!checkInOpen) {
      setCheckInOpen(true);
      return;
    }
    if (checkInValue) onComplete();
  };

  return (
    <ScreenScroll>
      <Header onBack={onBack} onToggleMotion={onToggleMotion} reduced={reduced} />
      <View style={styles.missionHeading}>
        <Text style={styles.eyebrow}>72시간 PULSE</Text>
        <Text accessibilityRole="header" style={styles.timeTitle}>
          {demoPulsePayload.mission.remainingHours}시간 남음
        </Text>
      </View>

      <View style={styles.missionVisualWrap}>
        <PulseVisualHost
          height={230}
          mode="mission"
          progress={
            verifying
              ? demoPulsePayload.mission.verifyingProgress
              : demoPulsePayload.mission.progress
          }
          reducedMotion={reduced}
        />
        <View style={styles.dayLegend}>
          <View style={styles.dayItem}>
            <Text style={[styles.dayLabel, { color: colors.mintBright }]}>DAY 1</Text>
            <Text style={styles.dayState}>완료</Text>
          </View>
          <View style={styles.dayItem}>
            <Text style={[styles.dayLabel, { color: colors.coral }]}>DAY 2</Text>
            <Text style={styles.dayState}>{verifying ? '확인 중' : '오늘'}</Text>
          </View>
          <View style={styles.dayItem}>
            <Text style={[styles.dayLabel, { color: colors.violet }]}>DAY 3</Text>
            <Text style={styles.dayState}>예정</Text>
          </View>
        </View>
      </View>

      <GlassCard style={styles.taskCard}>
        <Text style={styles.cardTitle}>오늘의 기록</Text>
        <View style={styles.taskList}>
          {missionTasks.map((task, index) => (
            <TaskRow
              key={task.id}
              color={[colors.coral, colors.mint, colors.violet][index]}
              status={
                index === 0
                  ? verifying
                    ? 'checking'
                    : checkInValue
                      ? 'complete'
                      : task.status
                  : task.status
              }
              title={task.title}
            />
          ))}
        </View>
        {checkInOpen && !verifying ? (
          <Animated.View entering={FadeIn.duration(reduced ? 1 : 220)} style={styles.checkInPanel}>
            <Text style={styles.checkInTitle}>오늘 몸의 느낌은 어땠나요?</Text>
            <Text style={styles.checkInHelp}>가장 가까운 느낌 하나만 골라 주세요.</Text>
            <View accessibilityRole="radiogroup" style={styles.checkInOptions}>
              {['평소와 비슷해요', '조금 달라요', '많이 달라요'].map((option) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: checkInValue === option }}
                  key={option}
                  onPress={() => {
                    quietHaptic('selection');
                    setCheckInValue(option);
                  }}
                  style={({ pressed }) => [
                    styles.checkInOption,
                    checkInValue === option && styles.checkInOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.radioDot,
                      checkInValue === option && styles.radioDotSelected,
                    ]}
                  />
                  <Text style={styles.checkInOptionText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}
        <View style={styles.rewardRow}>
          <View style={styles.rewardStar}>
            <Text style={styles.rewardStarText}>✦</Text>
          </View>
          <Text style={styles.rewardLabel}>{verifying ? '보상 확인 중' : '완성 보상'}</Text>
          {verifying ? null : <Text style={styles.rewardAmount}>{rewardAmount}</Text>}
        </View>
        <PrimaryButton
          accessibilityHint="오늘의 짧은 기록을 제출합니다"
          disabled={verifying || (checkInOpen && !checkInValue)}
          label={
            verifying
              ? '기록을 확인하고 있어요'
              : checkInOpen
                ? checkInValue
                  ? '기록 보내기'
                  : '몸 상태를 하나 골라주세요'
                : '오늘 기록하기'
          }
          onPress={handlePrimaryAction}
        />
      </GlassCard>
      <Text accessibilityLiveRegion="polite" style={styles.supportText}>
        {verifying ? '안전하게 접수됐어요. 잠시만 기다려 주세요.' : '완벽하게 기록하지 않아도 괜찮아요.'}
      </Text>
    </ScreenScroll>
  );
}

interface TaskRowProps {
  color: string;
  status: 'complete' | 'current' | 'verified' | 'checking';
  title: string;
}

function TaskRow({ color, status, title }: TaskRowProps) {
  const icon = status === 'checking' ? '···' : status === 'current' ? '⌁' : '✓';
  return (
    <View
      accessibilityLabel={`${title}, ${status === 'checking' ? '확인 중' : status === 'current' ? '진행 가능' : '완료'}`}
      style={styles.taskRow}
    >
      <View style={[styles.taskIcon, { backgroundColor: `${color}24`, borderColor: `${color}66` }]}>
        <Text style={[styles.taskIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={styles.taskTitle}>{title}</Text>
      <Text style={[styles.taskChevron, { color }]}>{status === 'checking' ? '확인 중' : '›'}</Text>
    </View>
  );
}

interface CapsuleScreenProps extends ScreenProps {
  onBack: () => void;
  onReplay: () => void;
}

function CapsuleScreen({ onBack, onReplay, onToggleMotion, reduced }: CapsuleScreenProps) {
  const [expanded, setExpanded] = useState(false);
  const rewardAmount = `+${demoPulsePayload.reward.amount} ${demoPulsePayload.reward.currency}`;

  return (
    <ScreenScroll>
      <Header onBack={onBack} onToggleMotion={onToggleMotion} reduced={reduced} />
      <View style={styles.capsuleHeading}>
        <Text accessibilityRole="header" style={styles.title}>
          변화 캡슐
        </Text>
      </View>
      <PulseVisualHost height={270} mode="capsule" reducedMotion={reduced} />

      {demoPulsePayload.capsule.hospitalRecordVerified ? (
        <View accessibilityLabel="병원 기록 확인됨" style={styles.verifiedBadge}>
          <Text style={styles.verifiedIcon}>✓</Text>
          <Text style={styles.verifiedText}>병원 기록 확인됨</Text>
        </View>
      ) : null}

      <View accessibilityLabel="변화 전, 약물 변경, 변화 후" style={styles.timeline}>
        <View style={[styles.timelineLine, styles.timelineMint]} />
        <View style={[styles.timelineLine, styles.timelineCoral]} />
        <View style={[styles.timelineLine, styles.timelineViolet]} />
        {['변화 전', '약물 변경', '변화 후'].map((label, index) => (
          <View key={label} style={styles.timelineStop}>
            <View
              style={[
                styles.timelineDot,
                {
                  borderColor: [colors.mintBright, colors.coral, colors.violet][index],
                },
              ]}
            />
            <Text style={styles.timelineLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.insightRow}>
        <InsightCard
          color={colors.mintBright}
          label={
            demoPulsePayload.capsule.recoveryInterpretationValidated
              ? '수면 리듬 회복'
              : '수면 리듬 변화'
          }
          pattern={[4, 7, 5, 9, 8, 13]}
        />
        <InsightCard color={colors.coral} label="복통 변화 기록" pattern={[12, 10, 11, 7, 8, 5]} />
      </View>

      <GlassCard style={styles.completionCard}>
        <View style={styles.completionRow}>
          <View style={styles.completionCheck}>
            <Text style={styles.completionCheckText}>✓</Text>
          </View>
          <View style={styles.completionCopy}>
            <Text style={styles.completionTitle}>연구 기여가 완료됐어요</Text>
            <Text accessibilityLiveRegion="polite" style={styles.completionReward}>
              {rewardAmount}
            </Text>
          </View>
        </View>
        <PrimaryButton label={expanded ? '변화 접기' : '내 변화 보기'} onPress={() => setExpanded((value) => !value)} />
        {expanded ? (
          <Animated.View entering={FadeIn.duration(reduced ? 1 : 240)} style={styles.detailPanel}>
            <Text style={styles.detailTitle}>이 캡슐에 담긴 정보</Text>
            <Text style={styles.detailBody}>
              웨어러블 흐름, 짧은 증상 기록, 병원에서 확인된 약물 변경 시점이 하나의 연구용 기록으로 묶였어요.
            </Text>
          </Animated.View>
        ) : null}
      </GlassCard>

      <Text style={styles.privacyText}>이름과 연락처를 뺀 연구용 기록으로 전달돼요.</Text>
      <Text style={styles.demoDataText}>현재 화면은 합성 예시 데이터예요.</Text>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onReplay}>
        <Text style={styles.replayText}>처음부터 다시 보기</Text>
      </Pressable>
    </ScreenScroll>
  );
}

interface InsightCardProps {
  color: string;
  label: string;
  pattern: number[];
}

function InsightCard({ color, label, pattern }: InsightCardProps) {
  return (
    <GlassCard style={styles.insightCard}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.sparkline}>
        {pattern.map((value, index) => (
          <View
            key={`${label}-${index}`}
            style={[styles.sparkBar, { backgroundColor: color, height: value }]}
          />
        ))}
      </View>
      <Text style={styles.insightLabel}>{label}</Text>
    </GlassCard>
  );
}

function ScreenScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

function PrivacyShield() {
  return (
    <View accessibilityLabel="개인정보 보호 화면" style={styles.privacyShield}>
      <Brand />
      <Text style={styles.privacyShieldText}>화면이 잠시 가려졌어요.</Text>
    </View>
  );
}

export function PulseApp() {
  const systemReduced = useReducedMotion();
  const [manualReduced, setManualReduced] = useState(false);
  const [stage, setStage] = useState<PulseStage>('detected');
  const [privateMode, setPrivateMode] = useState(false);
  const reduced = Boolean(
    pulseMotionMode !== 'full' || systemReduced || manualReduced || privateMode,
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setPrivateMode(nextState !== 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const privacyKey = 'lns-pulse-sensitive-screen';
    void ScreenCapture.preventScreenCaptureAsync(privacyKey).catch(() => undefined);
    if (Platform.OS === 'ios') {
      void ScreenCapture.enableAppSwitcherProtectionAsync(1).catch(() => undefined);
    }

    return () => {
      void ScreenCapture.allowScreenCaptureAsync(privacyKey).catch(() => undefined);
      if (Platform.OS === 'ios') {
        void ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    const announcement =
      stage === 'detected'
        ? '변화 감지 화면'
        : stage === 'mission'
          ? `72시간 변화 기록. ${demoPulsePayload.mission.remainingHours}시간 남음.`
          : stage === 'verifying'
            ? '기록 확인 중'
            : '변화 캡슐. 연구 기여와 보상 예시를 확인할 수 있어요.';

    AccessibilityInfo.announceForAccessibility(announcement);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'verifying' || privateMode) return;

    const timer = setTimeout(
      () => {
        setStage('capsule');
        quietHaptic('success');
      },
      reduced ? 450 : 1350,
    );

    return () => clearTimeout(timer);
  }, [privateMode, reduced, stage]);

  const transition = useMemo(
    () => ({
      entering: FadeIn.duration(reduced ? 1 : 320),
    }),
    [reduced],
  );

  const startMission = () => {
    quietHaptic('selection');
    setStage('mission');
  };

  const completeMission = () => {
    quietHaptic('light');
    setStage('verifying');
  };

  return (
    <AppFrame>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbTop]} />
        <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbBottom]} />
        <Animated.View key={stage === 'verifying' ? 'mission' : stage} {...transition} style={styles.scene}>
          {stage === 'detected' ? (
            <DetectedScreen
              onStart={startMission}
              onToggleMotion={() => setManualReduced((value) => !value)}
              reduced={reduced}
            />
          ) : null}
          {stage === 'mission' || stage === 'verifying' ? (
            <MissionScreen
              onBack={() => setStage('detected')}
              onComplete={completeMission}
              onToggleMotion={() => setManualReduced((value) => !value)}
              reduced={reduced}
              verifying={stage === 'verifying'}
            />
          ) : null}
          {stage === 'capsule' ? (
            <CapsuleScreen
              onBack={() => setStage('mission')}
              onReplay={() => setStage('detected')}
              onToggleMotion={() => setManualReduced((value) => !value)}
              reduced={reduced}
            />
          ) : null}
        </Animated.View>
        <StageDots stage={stage} />
        {privateMode ? <PrivacyShield /> : null}
      </SafeAreaView>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.ink,
    flex: 1,
  },
  scene: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 70,
    paddingHorizontal: spacing.xl,
  },
  ambientOrb: {
    borderColor: colors.border,
    borderRadius: 150,
    borderWidth: 1,
    height: 260,
    opacity: 0.28,
    position: 'absolute',
    width: 260,
  },
  ambientOrbTop: {
    right: -154,
    top: 88,
  },
  ambientOrbBottom: {
    bottom: 54,
    left: -170,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingTop: spacing.sm,
  },
  headerSpacer: {
    flex: 1,
  },
  headerBrand: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    left: 0,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
  },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  backIcon: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '200',
    lineHeight: 39,
  },
  pressed: {
    opacity: 0.62,
  },
  intro: {
    marginTop: spacing.xl,
  },
  eyebrow: {
    color: colors.mint,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.35,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
    letterSpacing: -0.95,
    lineHeight: 35,
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.label,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  signalRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: -6,
  },
  calloutCard: {
    gap: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  calloutHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  hourglass: {
    alignItems: 'center',
    backgroundColor: 'rgba(88, 209, 188, 0.16)',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  hourglassIcon: {
    fontSize: 22,
  },
  calloutCopy: {
    flex: 1,
  },
  calloutTitle: {
    color: colors.textDark,
    fontSize: typography.heading,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  calloutSubtitle: {
    color: colors.mutedDark,
    fontSize: typography.label,
    marginTop: 5,
  },
  safetyNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  safetyIcon: {
    color: colors.muted,
    fontSize: typography.label,
  },
  safetyText: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  missionHeading: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  timeTitle: {
    color: colors.text,
    fontSize: typography.display,
    fontWeight: '700',
    letterSpacing: -1.2,
    marginTop: spacing.sm,
  },
  missionVisualWrap: {
    marginTop: -4,
  },
  dayLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -20,
    paddingHorizontal: spacing.xl,
  },
  dayItem: {
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dayState: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },
  taskCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  taskList: {
    gap: spacing.sm,
  },
  checkInPanel: {
    backgroundColor: 'rgba(3, 22, 24, 0.58)',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  checkInTitle: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '700',
  },
  checkInHelp: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  checkInOptions: {
    gap: 7,
    marginTop: spacing.md,
  },
  checkInOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  checkInOptionSelected: {
    backgroundColor: 'rgba(88, 209, 188, 0.12)',
    borderColor: colors.mint,
  },
  checkInOptionText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '600',
    marginLeft: 10,
  },
  radioDot: {
    borderColor: colors.muted,
    borderRadius: 6,
    borderWidth: 1.5,
    height: 12,
    width: 12,
  },
  radioDotSelected: {
    backgroundColor: colors.mintBright,
    borderColor: colors.mintBright,
    borderWidth: 3,
  },
  taskRow: {
    alignItems: 'center',
    backgroundColor: colors.inkSoft,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  taskIcon: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  taskIconText: {
    fontSize: 14,
    fontWeight: '800',
  },
  taskTitle: {
    color: colors.text,
    flex: 1,
    fontSize: typography.label,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
  taskChevron: {
    fontSize: 13,
    fontWeight: '700',
  },
  rewardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 55,
  },
  rewardStar: {
    alignItems: 'center',
    backgroundColor: 'rgba(88, 209, 188, 0.16)',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  rewardStarText: {
    color: colors.mintBright,
    fontSize: 15,
  },
  rewardLabel: {
    color: colors.text,
    flex: 1,
    fontSize: typography.label,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
  rewardAmount: {
    color: colors.mintBright,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  supportText: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  capsuleHeading: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  verifiedBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.panelSoft,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: -12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  verifiedIcon: {
    color: colors.mintBright,
    fontSize: 13,
    fontWeight: '800',
  },
  verifiedText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    position: 'relative',
  },
  timelineLine: {
    height: 2,
    position: 'absolute',
    top: 7,
    width: '35%',
  },
  timelineMint: {
    backgroundColor: colors.mint,
    left: '10%',
  },
  timelineCoral: {
    backgroundColor: colors.coral,
    left: '33%',
  },
  timelineViolet: {
    backgroundColor: colors.violet,
    right: '10%',
  },
  timelineStop: {
    alignItems: 'center',
    width: '33%',
  },
  timelineDot: {
    backgroundColor: colors.ink,
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    width: 16,
  },
  timelineLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 7,
  },
  insightRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  insightCard: {
    flex: 1,
    minHeight: 92,
    padding: spacing.md,
  },
  sparkline: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 5,
    height: 24,
  },
  sparkBar: {
    borderRadius: 2,
    flex: 1,
    opacity: 0.8,
  },
  insightLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  completionCard: {
    gap: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  completionRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  completionCheck: {
    alignItems: 'center',
    borderColor: colors.mint,
    borderRadius: 23,
    borderWidth: 1.5,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  completionCheckText: {
    color: colors.mintBright,
    fontSize: 21,
    fontWeight: '800',
  },
  completionCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  completionTitle: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '600',
  },
  completionReward: {
    color: colors.mintBright,
    fontSize: typography.heading,
    fontWeight: '700',
    marginTop: 4,
  },
  detailPanel: {
    backgroundColor: colors.inkSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  detailTitle: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '700',
  },
  detailBody: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  privacyText: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  demoDataText: {
    color: colors.mutedDark,
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
  },
  replayText: {
    color: colors.mint,
    fontSize: typography.caption,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  stageDots: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(3, 18, 20, 0.9)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 15,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    position: 'absolute',
  },
  stageDot: {
    backgroundColor: colors.mutedDark,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  stageDotActive: {
    backgroundColor: colors.mintBright,
    shadowColor: colors.mintBright,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    width: 24,
  },
  privacyShield: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 100,
  },
  privacyShieldText: {
    color: colors.muted,
    fontSize: typography.label,
    marginTop: spacing.lg,
  },
});
