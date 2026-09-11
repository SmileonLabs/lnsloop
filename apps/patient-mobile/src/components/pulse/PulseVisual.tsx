import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  RoundedRect,
  Skia,
  SweepGradient,
  usePathInterpolation,
  vec,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../../theme/tokens';
import { motion } from '../../theme/motion';

export type PulseVisualMode = 'detected' | 'mission' | 'capsule';

export interface PulseVisualProps {
  mode: PulseVisualMode;
  height: number;
  reducedMotion: boolean;
  progress?: number;
}

interface PulseCanvasProps extends Omit<PulseVisualProps, 'mode'> {
  width: number;
}

const TAU = Math.PI * 2;
const MORPH_RANGE = [0, 1];
const NEON_POSITIONS = [0, 0.38, 0.54, 1];

function useAmbientClock(reducedMotion: boolean, duration: number) {
  const clock = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(clock);
    clock.value = 0;

    if (!reducedMotion) {
      clock.value = withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    }

    return () => cancelAnimation(clock);
  }, [clock, duration, reducedMotion]);

  return clock;
}

function makeDetectedPaths(width: number, height: number) {
  const joinX = width * 0.67;
  const joinY = height * 0.52;
  const endX = width + 12;

  const makeUpper = (direction: number) => {
    const path = Skia.PathBuilder.Make();
    path.moveTo(-12, height * 0.29);
    path.cubicTo(
      width * 0.22,
      height * 0.2 + direction * 2.5,
      width * 0.34,
      height * 0.58 - direction * 2,
      joinX,
      joinY,
    );
    path.cubicTo(
      width * 0.78,
      height * 0.49 + direction * 2.2,
      width * 0.88,
      height * 0.31 - direction * 2.6,
      endX,
      height * 0.36,
    );
    return path.detach();
  };

  const makeMiddle = (direction: number) => {
    const path = Skia.PathBuilder.Make();
    path.moveTo(-12, height * 0.52);
    path.cubicTo(
      width * 0.2,
      height * 0.7 - direction * 2.3,
      width * 0.38,
      height * 0.34 + direction * 2.5,
      joinX,
      joinY,
    );
    path.cubicTo(
      width * 0.82,
      height * 0.62 - direction * 2.1,
      width * 0.9,
      height * 0.73 + direction * 2.4,
      endX,
      height * 0.62,
    );
    return path.detach();
  };

  const makeLower = (direction: number) => {
    const path = Skia.PathBuilder.Make();
    path.moveTo(-12, height * 0.72);
    path.cubicTo(
      width * 0.2,
      height * 0.58 + direction * 2.2,
      width * 0.39,
      height * 0.82 - direction * 2.6,
      joinX,
      joinY,
    );
    path.cubicTo(
      width * 0.78,
      height * 0.42 + direction * 2.5,
      width * 0.9,
      height * 0.48 - direction * 2.2,
      endX,
      height * 0.47,
    );
    return path.detach();
  };

  return {
    joinX,
    joinY,
    pathRanges: [
      [makeUpper(-1), makeUpper(1)],
      [makeMiddle(-1), makeMiddle(1)],
      [makeLower(-1), makeLower(1)],
    ],
    truthPaths: [makeUpper(0), makeMiddle(0), makeLower(0)],
  };
}

function makeMissionRing(width: number, height: number) {
  const size = Math.min(width * 0.7, height * 0.78);
  const left = (width - size) / 2;
  const top = (height - size) / 2;
  const ring = Skia.PathBuilder.Make();
  ring.addArc(Skia.XYWHRect(left, top, size, size), -90, 359.9);
  return { ring: ring.detach(), size, left, top, cx: width / 2, cy: height / 2 };
}

function makeCapsule(width: number, height: number) {
  const capsuleWidth = Math.min(width * 0.43, 144);
  const capsuleHeight = Math.min(height * 0.78, 224);
  const x = (width - capsuleWidth) / 2;
  const y = (height - capsuleHeight) / 2;
  const rect = Skia.XYWHRect(x, y, capsuleWidth, capsuleHeight);
  const rrect = Skia.RRectXY(rect, capsuleWidth / 2, capsuleWidth / 2);
  const clip = Skia.PathBuilder.Make();
  clip.addRRect(rrect);

  const strand = (offset: number, direction: number) => {
    const path = Skia.PathBuilder.Make();
    path.moveTo(x + capsuleWidth * (0.12 + offset), y + capsuleHeight + 12);
    path.cubicTo(
      x + capsuleWidth * (0.12 + offset) + direction * 2.4,
      y + capsuleHeight * 0.74 + direction * 1.6,
      x + capsuleWidth * (0.86 - offset) - direction * 2.8,
      y + capsuleHeight * 0.69 - direction * 1.8,
      x + capsuleWidth * (0.82 - offset) + direction * 1.8,
      y + capsuleHeight * 0.48 + direction * 1.2,
    );
    path.cubicTo(
      x + capsuleWidth * (0.78 - offset) - direction * 2.6,
      y + capsuleHeight * 0.25 - direction * 1.5,
      x + capsuleWidth * (0.18 + offset) + direction * 2.5,
      y + capsuleHeight * 0.31 + direction * 1.7,
      x + capsuleWidth * (0.22 + offset),
      y - 12,
    );
    return path.detach();
  };

  return {
    capsuleHeight,
    capsuleWidth,
    clip: clip.detach(),
    strandRanges: [
      [strand(0, -1), strand(0, 1)],
      [strand(0.08, -1), strand(0.08, 1)],
      [strand(0.16, -1), strand(0.16, 1)],
    ],
    truthStrands: [strand(0, 0), strand(0.08, 0), strand(0.16, 0)],
    x,
    y,
  };
}

function DetectedVisual({ height, reducedMotion, width }: PulseCanvasProps) {
  const upperReveal = useSharedValue(reducedMotion ? 1 : 0);
  const middleReveal = useSharedValue(reducedMotion ? 1 : 0);
  const lowerReveal = useSharedValue(reducedMotion ? 1 : 0);
  const recoil = useSharedValue(0);
  const ambientGate = useSharedValue(0);
  const pulse = useSharedValue(reducedMotion ? 1 : 0);
  const ambient = useAmbientClock(reducedMotion, motion.ambient);
  const visual = useMemo(() => makeDetectedPaths(width, height), [height, width]);
  const pulseRadius = useDerivedValue(() => 5 + pulse.value * 34);
  const pulseOpacity = useDerivedValue(() => Math.max(0, 0.34 - pulse.value * 0.34));
  const glowOpacity = useDerivedValue(() => {
    const glowWave = 0.5 + Math.sin(ambient.value * TAU) * 0.5;
    return 0.2 + ambientGate.value * glowWave * 0.1;
  });
  const upperMorph = useDerivedValue(() => {
    const phase = ambient.value * TAU;
    const wave = Math.sin(phase) + Math.sin(phase * 2 + 0.7) * 0.28;
    const value = 0.5 + recoil.value * 0.28 + ambientGate.value * wave * 0.085;
    return Math.max(0, Math.min(1, value));
  });
  const middleMorph = useDerivedValue(() => {
    const phase = (ambient.value + 0.33) * TAU;
    const wave = Math.sin(phase) + Math.sin(phase * 2 + 1.1) * 0.24;
    const value = 0.5 - recoil.value * 0.24 + ambientGate.value * wave * 0.09;
    return Math.max(0, Math.min(1, value));
  });
  const lowerMorph = useDerivedValue(() => {
    const phase = (ambient.value + 0.66) * TAU;
    const wave = Math.sin(phase) + Math.sin(phase * 2 + 1.7) * 0.3;
    const value = 0.5 + recoil.value * 0.2 + ambientGate.value * wave * 0.082;
    return Math.max(0, Math.min(1, value));
  });
  const upperPath = usePathInterpolation(upperMorph, MORPH_RANGE, visual.pathRanges[0], 'clamp');
  const middlePath = usePathInterpolation(
    middleMorph,
    MORPH_RANGE,
    visual.pathRanges[1],
    'clamp',
  );
  const lowerPath = usePathInterpolation(lowerMorph, MORPH_RANGE, visual.pathRanges[2], 'clamp');
  const shimmerStart = useDerivedValue(() => ({
    x: width * (-0.4 + ambient.value * 1.55),
    y: height * 0.5,
  }));
  const shimmerEnd = useDerivedValue(() => ({
    x: width * (-0.1 + ambient.value * 1.55),
    y: height * 0.5,
  }));
  const shimmerOpacity = useDerivedValue(() =>
    reducedMotion ? 0 : ambientGate.value * Math.sin(Math.PI * ambient.value) * 0.54,
  );
  const truthOpacity = useDerivedValue(() => 1 - ambientGate.value);
  const breath = useDerivedValue(() => 0.5 + Math.sin(ambient.value * TAU) * 0.5);
  const haloRadius = useDerivedValue(() => 15 + breath.value * 13);
  const haloOpacity = useDerivedValue(() => 0.11 + breath.value * 0.16);
  const coreRadius = useDerivedValue(() => 2.7 + breath.value * 1.15);
  const particleOneX = useDerivedValue(
    () => visual.joinX + Math.cos(ambient.value * TAU) * 25,
  );
  const particleOneY = useDerivedValue(
    () => visual.joinY + Math.sin(ambient.value * TAU) * 11,
  );
  const particleTwoX = useDerivedValue(
    () => visual.joinX + Math.cos((ambient.value + 0.44) * TAU) * 36,
  );
  const particleTwoY = useDerivedValue(
    () => visual.joinY + Math.sin((ambient.value + 0.44) * TAU) * 17,
  );
  const particleOpacity = useDerivedValue(
    () =>
      ambientGate.value *
      (0.2 + (0.5 + Math.sin((ambient.value + 0.2) * TAU) * 0.5) * 0.32),
  );
  const ribbonPaths = [upperPath, middlePath, lowerPath];
  const upperHeadStart = useDerivedValue(() => Math.max(0, upperReveal.value - 0.065));
  const middleHeadStart = useDerivedValue(() => Math.max(0, middleReveal.value - 0.065));
  const lowerHeadStart = useDerivedValue(() => Math.max(0, lowerReveal.value - 0.065));
  const upperHeadOpacity = useDerivedValue(() => Math.sin(Math.PI * upperReveal.value) * 0.84);
  const middleHeadOpacity = useDerivedValue(
    () => Math.sin(Math.PI * middleReveal.value) * 0.84,
  );
  const lowerHeadOpacity = useDerivedValue(() => Math.sin(Math.PI * lowerReveal.value) * 0.84);
  const ribbonReveals = [upperReveal, middleReveal, lowerReveal];
  const ribbonHeadStarts = [upperHeadStart, middleHeadStart, lowerHeadStart];
  const ribbonHeadOpacities = [upperHeadOpacity, middleHeadOpacity, lowerHeadOpacity];
  const ribbonColors = [
    [colors.mintBright, colors.mint, colors.coral],
    [colors.coral, colors.coral, colors.violet],
    [colors.violet, colors.mint, colors.mintBright],
  ];
  const ribbonTruthColors = [
    'rgba(126,247,224,0.3)',
    'rgba(255,138,114,0.28)',
    'rgba(137,124,255,0.28)',
  ];
  const ribbonNeonColors = [
    ['rgba(126,247,224,0)', colors.mintBright, 'rgba(235,255,250,0.94)', 'rgba(126,247,224,0)'],
    ['rgba(255,138,114,0)', colors.coral, 'rgba(255,232,226,0.94)', 'rgba(255,138,114,0)'],
    ['rgba(137,124,255,0)', colors.violet, 'rgba(240,235,255,0.94)', 'rgba(137,124,255,0)'],
  ];

  useEffect(() => {
    cancelAnimation(upperReveal);
    cancelAnimation(middleReveal);
    cancelAnimation(lowerReveal);
    cancelAnimation(recoil);
    cancelAnimation(ambientGate);
    cancelAnimation(pulse);

    upperReveal.value = reducedMotion ? 1 : 0;
    middleReveal.value = reducedMotion ? 1 : 0;
    lowerReveal.value = reducedMotion ? 1 : 0;
    recoil.value = 0;
    ambientGate.value = 0;
    pulse.value = reducedMotion ? 1 : 0;

    if (!reducedMotion) {
      const drawEasing = Easing.bezier(0.32, 0, 0.2, 1);
      const lastLineFinish = motion.ribbonDraw + motion.ribbonStagger * 2;

      upperReveal.value = withTiming(1, {
        duration: motion.ribbonDraw,
        easing: drawEasing,
      });
      middleReveal.value = withDelay(
        motion.ribbonStagger,
        withTiming(1, {
          duration: motion.ribbonDraw,
          easing: drawEasing,
        }),
      );
      lowerReveal.value = withDelay(
        motion.ribbonStagger * 2,
        withTiming(1, {
          duration: motion.ribbonDraw,
          easing: drawEasing,
        }),
      );
      recoil.value = withDelay(
        lastLineFinish,
        withSequence(
          withTiming(1, {
            duration: 72,
            easing: Easing.out(Easing.quad),
          }),
          withSpring(0, {
            damping: 10,
            energyThreshold: 0.001,
            mass: 0.55,
            overshootClamping: false,
            stiffness: 142,
          }),
        ),
      );
      ambientGate.value = withDelay(
        lastLineFinish,
        withTiming(1, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
        }),
      );
      pulse.value = withDelay(
        lastLineFinish,
        withTiming(1, {
          duration: 520,
          easing: Easing.out(Easing.quad),
        }),
      );
    }

    return () => {
      cancelAnimation(upperReveal);
      cancelAnimation(middleReveal);
      cancelAnimation(lowerReveal);
      cancelAnimation(recoil);
      cancelAnimation(ambientGate);
      cancelAnimation(pulse);
    };
  }, [ambientGate, lowerReveal, middleReveal, pulse, recoil, reducedMotion, upperReveal]);

  return (
    <Canvas style={{ height, width }}>
      {ribbonPaths.map((path, index) => (
        <Group key={`ribbon-${index}`}>
          <Path
            color={ribbonTruthColors[index]}
            end={ribbonReveals[index]}
            opacity={truthOpacity}
            path={visual.truthPaths[index]}
            strokeCap="round"
            strokeWidth={0.9}
            style="stroke"
          />
          <Group opacity={glowOpacity}>
            <Path
              end={ribbonReveals[index]}
              path={path}
              strokeCap="round"
              strokeWidth={10}
              style="stroke"
            >
              <LinearGradient
                colors={ribbonColors[index]}
                end={vec(width, height * 0.5)}
                start={vec(0, height * 0.5)}
              />
              <BlurMask blur={6} style="normal" />
            </Path>
          </Group>
          <Path
            end={ribbonReveals[index]}
            path={path}
            strokeCap="round"
            strokeWidth={2.4}
            style="stroke"
          >
            <LinearGradient
              colors={ribbonColors[index]}
              end={vec(width, height * 0.5)}
              start={vec(0, height * 0.5)}
            />
          </Path>
          <Path
            blendMode="screen"
            color="rgba(248,255,253,0.98)"
            end={ribbonReveals[index]}
            opacity={ribbonHeadOpacities[index]}
            path={path}
            start={ribbonHeadStarts[index]}
            strokeCap="round"
            strokeWidth={4.2}
            style="stroke"
          />
          <Path
            blendMode="screen"
            end={ribbonReveals[index]}
            opacity={shimmerOpacity}
            path={path}
            strokeCap="round"
            strokeWidth={3.4}
            style="stroke"
          >
            <LinearGradient
              colors={ribbonNeonColors[index]}
              end={shimmerEnd}
              positions={NEON_POSITIONS}
              start={shimmerStart}
            />
          </Path>
        </Group>
      ))}
      <Circle
        color={colors.mintBright}
        cx={visual.joinX}
        cy={visual.joinY}
        opacity={haloOpacity}
        r={haloRadius}
      >
        <BlurMask blur={12} style="solid" />
      </Circle>
      <Circle
        color={colors.coral}
        cx={visual.joinX}
        cy={visual.joinY}
        opacity={pulseOpacity}
        r={pulseRadius}
        style="stroke"
        strokeWidth={1.5}
      />
      <Circle
        color={colors.mintBright}
        cx={particleOneX}
        cy={particleOneY}
        opacity={particleOpacity}
        r={1.7}
      />
      <Circle
        color={colors.violet}
        cx={particleTwoX}
        cy={particleTwoY}
        opacity={particleOpacity}
        r={1.25}
      />
      <Circle color={colors.white} cx={visual.joinX} cy={visual.joinY} r={4.5}>
        <BlurMask blur={8} style="solid" />
      </Circle>
      <Circle color={colors.white} cx={visual.joinX} cy={visual.joinY} r={coreRadius} />
    </Canvas>
  );
}

function MissionVisual({
  height,
  progress = 0.58,
  reducedMotion,
  width,
}: PulseCanvasProps) {
  const safeProgress = Math.min(1, Math.max(0, progress));
  const animatedProgress = useSharedValue(reducedMotion ? safeProgress : 0);
  const ambient = useAmbientClock(reducedMotion, motion.orbit);
  const visual = useMemo(() => makeMissionRing(width, height), [height, width]);
  const centerX = visual.cx;
  const centerY = visual.cy;
  const ringRadius = visual.size / 2;
  const currentX = useDerivedValue(() => {
    const angle = ((-90 + animatedProgress.value * 360) * Math.PI) / 180;
    return centerX + Math.cos(angle) * ringRadius;
  });
  const currentY = useDerivedValue(() => {
    const angle = ((-90 + animatedProgress.value * 360) * Math.PI) / 180;
    return centerY + Math.sin(angle) * ringRadius;
  });
  const orbitHead = useDerivedValue(() => animatedProgress.value * ambient.value);
  const orbitTail = useDerivedValue(() => Math.max(0, orbitHead.value - 0.09));
  const orbitOpacity = useDerivedValue(() => Math.sin(Math.PI * ambient.value) * 0.68);
  const centerBreath = useDerivedValue(
    () => 0.5 + Math.sin((ambient.value + 0.18) * TAU) * 0.5,
  );
  const centerGlowRadius = useDerivedValue(() => visual.size * (0.19 + centerBreath.value * 0.035));
  const centerGlowOpacity = useDerivedValue(() => 0.035 + centerBreath.value * 0.06);
  const ringGlowOpacity = useDerivedValue(() => 0.27 + centerBreath.value * 0.13);
  const currentHaloRadius = useDerivedValue(() => 18 + centerBreath.value * 5);
  const currentHaloOpacity = useDerivedValue(() => 0.14 + centerBreath.value * 0.14);

  useEffect(() => {
    animatedProgress.value = reducedMotion
      ? safeProgress
      : withTiming(safeProgress, {
          duration: motion.trace,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
        });

    return () => cancelAnimation(animatedProgress);
  }, [animatedProgress, reducedMotion, safeProgress]);

  return (
    <Canvas style={{ height, width }}>
      <Circle
        cx={visual.cx}
        cy={visual.cy}
        opacity={centerGlowOpacity}
        r={centerGlowRadius}
      >
        <RadialGradient
          c={vec(visual.cx, visual.cy)}
          colors={['rgba(126,247,224,0.42)', 'rgba(126,247,224,0.11)', 'rgba(126,247,224,0)']}
          positions={[0, 0.46, 1]}
          r={centerGlowRadius}
        />
      </Circle>
      <Path
        color="rgba(135, 190, 181, 0.18)"
        path={visual.ring}
        strokeCap="round"
        strokeWidth={13}
        style="stroke"
      />
      <Group opacity={ringGlowOpacity}>
        <Path
          end={animatedProgress}
          path={visual.ring}
          strokeCap="round"
          strokeWidth={18}
          style="stroke"
        >
          <SweepGradient
            c={vec(visual.cx, visual.cy)}
            colors={[colors.mintBright, colors.mint, colors.coral, colors.violet, colors.mintBright]}
          />
          <BlurMask blur={7} style="normal" />
        </Path>
      </Group>
      <Path
        end={animatedProgress}
        path={visual.ring}
        strokeCap="round"
        strokeWidth={5}
        style="stroke"
      >
        <SweepGradient
          c={vec(visual.cx, visual.cy)}
          colors={[colors.mintBright, colors.mint, colors.coral, colors.violet, colors.mintBright]}
        />
      </Path>
      <Group opacity={orbitOpacity}>
        <Path
          color={colors.white}
          end={orbitHead}
          path={visual.ring}
          start={orbitTail}
          strokeCap="round"
          strokeWidth={9}
          style="stroke"
        >
          <BlurMask blur={5} style="normal" />
        </Path>
        <Path
          color={colors.mintBright}
          end={orbitHead}
          path={visual.ring}
          start={orbitTail}
          strokeCap="round"
          strokeWidth={2.4}
          style="stroke"
        />
      </Group>
      <Circle
        color={colors.mint}
        cx={visual.cx}
        cy={visual.top}
        r={17}
        style="stroke"
        strokeWidth={2}
      />
      <Circle color={colors.mintBright} cx={visual.cx} cy={visual.top} r={5} />
      <Circle
        color={colors.coral}
        cx={currentX}
        cy={currentY}
        opacity={currentHaloOpacity}
        r={currentHaloRadius}
      >
        <BlurMask blur={6} style="solid" />
      </Circle>
      <Circle
        color={colors.coral}
        cx={currentX}
        cy={currentY}
        r={17}
        style="stroke"
        strokeWidth={3}
      />
      <Circle color={colors.white} cx={currentX} cy={currentY} r={5} />
      <Circle
        color={colors.violet}
        cx={visual.left}
        cy={visual.cy}
        r={16}
        style="stroke"
        strokeWidth={2}
      />
      <Circle color={colors.violet} cx={visual.left} cy={visual.cy} r={4} />
    </Canvas>
  );
}

function CapsuleVisual({ height, reducedMotion, width }: PulseCanvasProps) {
  const reveal = useSharedValue(reducedMotion ? 1 : 0);
  const ambient = useAmbientClock(reducedMotion, motion.float);
  const visual = useMemo(() => makeCapsule(width, height), [height, width]);
  const morphAmplitude = reducedMotion ? 0 : 0.5;
  const mintMorph = useDerivedValue(
    () => 0.5 + Math.sin(ambient.value * TAU) * morphAmplitude,
  );
  const coralMorph = useDerivedValue(
    () => 0.5 + Math.sin((ambient.value + 0.33) * TAU) * morphAmplitude,
  );
  const violetMorph = useDerivedValue(
    () => 0.5 + Math.sin((ambient.value + 0.66) * TAU) * morphAmplitude,
  );
  const mintPath = usePathInterpolation(mintMorph, MORPH_RANGE, visual.strandRanges[0], 'clamp');
  const coralPath = usePathInterpolation(
    coralMorph,
    MORPH_RANGE,
    visual.strandRanges[1],
    'clamp',
  );
  const violetPath = usePathInterpolation(
    violetMorph,
    MORPH_RANGE,
    visual.strandRanges[2],
    'clamp',
  );
  const strandPaths = [mintPath, coralPath, violetPath];
  const capsuleGlowOpacity = useDerivedValue(
    () => 0.1 + (0.5 + Math.sin(ambient.value * TAU) * 0.5) * 0.09,
  );
  const outlineOpacity = useDerivedValue(
    () => 0.72 + (0.5 + Math.sin((ambient.value + 0.16) * TAU) * 0.5) * 0.28,
  );
  const surfaceMintCenter = useDerivedValue(() => ({
    x:
      visual.x +
      visual.capsuleWidth * 0.38 +
      Math.sin((ambient.value + 0.08) * TAU) * visual.capsuleWidth * 0.13,
    y:
      visual.y +
      visual.capsuleHeight * 0.42 +
      Math.cos((ambient.value + 0.08) * TAU) * visual.capsuleHeight * 0.12,
  }));
  const surfaceCoralCenter = useDerivedValue(() => ({
    x:
      visual.x +
      visual.capsuleWidth * 0.66 +
      Math.sin((ambient.value + 0.56) * TAU) * visual.capsuleWidth * 0.11,
    y:
      visual.y +
      visual.capsuleHeight * 0.62 +
      Math.cos((ambient.value + 0.56) * TAU) * visual.capsuleHeight * 0.1,
  }));
  const surfaceBloomOpacity = useDerivedValue(
    () => 0.58 + (0.5 + Math.sin((ambient.value + 0.2) * TAU) * 0.5) * 0.28,
  );
  const strandShimmerStart = useDerivedValue(() => ({
    x: visual.x,
    y: visual.y + visual.capsuleHeight * (1.42 - ambient.value * 1.7),
  }));
  const strandShimmerEnd = useDerivedValue(() => ({
    x: visual.x + visual.capsuleWidth,
    y: visual.y + visual.capsuleHeight * (1.17 - ambient.value * 1.7),
  }));
  const strandShimmerOpacity = useDerivedValue(() =>
    reducedMotion ? 0 : Math.sin(Math.PI * ambient.value) * 0.52,
  );
  const strandColors = [colors.mintBright, colors.coral, colors.violet];
  const strandTruthColors = [
    'rgba(126,247,224,0.2)',
    'rgba(255,138,114,0.2)',
    'rgba(137,124,255,0.2)',
  ];
  const strandNeonColors = [
    ['rgba(126,247,224,0)', colors.mintBright, 'rgba(235,255,250,0.94)', 'rgba(126,247,224,0)'],
    ['rgba(255,138,114,0)', colors.coral, 'rgba(255,232,226,0.94)', 'rgba(255,138,114,0)'],
    ['rgba(137,124,255,0)', colors.violet, 'rgba(240,235,255,0.94)', 'rgba(137,124,255,0)'],
  ];
  const highlightX = useDerivedValue(
    () =>
      visual.x +
      visual.capsuleWidth * 0.64 +
      Math.sin((ambient.value + 0.12) * TAU) * visual.capsuleWidth * 0.08,
  );
  const highlightY = useDerivedValue(
    () =>
      visual.y +
      visual.capsuleHeight * 0.19 +
      Math.cos((ambient.value + 0.12) * TAU) * visual.capsuleHeight * 0.05,
  );
  const bubbleOneX = useDerivedValue(
    () => visual.x + visual.capsuleWidth * 0.37 + Math.sin(ambient.value * TAU) * 10,
  );
  const bubbleOneY = useDerivedValue(
    () => visual.y + visual.capsuleHeight * (0.82 - ambient.value * 0.62),
  );
  const bubbleOneOpacity = useDerivedValue(() => Math.sin(Math.PI * ambient.value) * 0.52);
  const bubbleTwoX = useDerivedValue(() => {
    const local = (ambient.value + 0.46) % 1;
    return visual.x + visual.capsuleWidth * 0.68 + Math.sin(local * TAU) * 8;
  });
  const bubbleTwoY = useDerivedValue(() => {
    const local = (ambient.value + 0.46) % 1;
    return visual.y + visual.capsuleHeight * (0.84 - local * 0.66);
  });
  const bubbleTwoOpacity = useDerivedValue(() => {
    const local = (ambient.value + 0.46) % 1;
    return Math.sin(Math.PI * local) * 0.42;
  });

  useEffect(() => {
    reveal.value = reducedMotion
      ? 1
      : withTiming(1, {
          duration: motion.signature,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        });

    return () => cancelAnimation(reveal);
  }, [reducedMotion, reveal]);

  return (
    <Canvas style={{ height, width }}>
      <RoundedRect
        color={colors.mint}
        height={visual.capsuleHeight}
        opacity={capsuleGlowOpacity}
        r={visual.capsuleWidth / 2}
        width={visual.capsuleWidth}
        x={visual.x}
        y={visual.y}
      >
        <BlurMask blur={12} style="solid" />
      </RoundedRect>
      <Group clip={visual.clip}>
        <RoundedRect
          height={visual.capsuleHeight}
          r={visual.capsuleWidth / 2}
          width={visual.capsuleWidth}
          x={visual.x}
          y={visual.y}
        >
          <LinearGradient
            colors={['rgba(226,255,248,0.22)', 'rgba(16,51,54,0.28)', 'rgba(3,19,22,0.82)']}
            end={vec(visual.x + visual.capsuleWidth, visual.y + visual.capsuleHeight)}
            start={vec(visual.x, visual.y)}
          />
        </RoundedRect>
        <Circle c={surfaceMintCenter} opacity={surfaceBloomOpacity} r={visual.capsuleWidth * 0.72}>
          <RadialGradient
            c={surfaceMintCenter}
            colors={['rgba(126,247,224,0.25)', 'rgba(126,247,224,0.07)', 'rgba(126,247,224,0)']}
            positions={[0, 0.44, 1]}
            r={visual.capsuleWidth * 0.72}
          />
        </Circle>
        <Circle c={surfaceCoralCenter} opacity={surfaceBloomOpacity} r={visual.capsuleWidth * 0.64}>
          <RadialGradient
            c={surfaceCoralCenter}
            colors={['rgba(255,138,114,0.18)', 'rgba(137,124,255,0.08)', 'rgba(137,124,255,0)']}
            positions={[0, 0.5, 1]}
            r={visual.capsuleWidth * 0.64}
          />
        </Circle>
        {strandPaths.map((path, index) => (
          <Group key={`capsule-strand-${index}`} opacity={index === 1 ? 0.9 : 0.76}>
            <Path
              color={strandTruthColors[index]}
              end={reveal}
              path={visual.truthStrands[index]}
              strokeCap="round"
              strokeWidth={0.8}
              style="stroke"
            />
            <Path
              color={strandColors[index]}
              end={reveal}
              path={path}
              strokeCap="round"
              strokeWidth={9}
              style="stroke"
            >
              <BlurMask blur={5} style="normal" />
            </Path>
            <Path
              color={strandColors[index]}
              end={reveal}
              path={path}
              strokeCap="round"
              strokeWidth={2.4}
              style="stroke"
            />
            <Path
              blendMode="screen"
              end={reveal}
              opacity={strandShimmerOpacity}
              path={path}
              strokeCap="round"
              strokeWidth={3.2}
              style="stroke"
            >
              <LinearGradient
                colors={strandNeonColors[index]}
                end={strandShimmerEnd}
                positions={NEON_POSITIONS}
                start={strandShimmerStart}
              />
            </Path>
          </Group>
        ))}
        <Circle
          color={colors.mintBright}
          cx={bubbleOneX}
          cy={bubbleOneY}
          opacity={bubbleOneOpacity}
          r={2}
        />
        <Circle
          color={colors.violet}
          cx={bubbleTwoX}
          cy={bubbleTwoY}
          opacity={bubbleTwoOpacity}
          r={1.6}
        />
      </Group>
      <RoundedRect
        height={visual.capsuleHeight}
        opacity={outlineOpacity}
        r={visual.capsuleWidth / 2}
        style="stroke"
        strokeWidth={2}
        width={visual.capsuleWidth}
        x={visual.x}
        y={visual.y}
      >
        <LinearGradient
          colors={[colors.white, colors.mintBright, colors.violet, colors.coral]}
          end={vec(visual.x + visual.capsuleWidth, visual.y + visual.capsuleHeight)}
          start={vec(visual.x, visual.y)}
        />
      </RoundedRect>
      <Circle
        color={colors.white}
        cx={highlightX}
        cy={highlightY}
        r={3}
      >
        <BlurMask blur={8} style="solid" />
      </Circle>
    </Canvas>
  );
}

export default function PulseVisual(props: PulseVisualProps) {
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== width) setWidth(nextWidth);
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={handleLayout}
      style={[styles.shell, { height: props.height }]}
    >
      {width > 0 && props.mode === 'detected' ? <DetectedVisual {...props} width={width} /> : null}
      {width > 0 && props.mode === 'mission' ? <MissionVisual {...props} width={width} /> : null}
      {width > 0 && props.mode === 'capsule' ? <CapsuleVisual {...props} width={width} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    width: '100%',
  },
});
