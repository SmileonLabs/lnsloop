import Constants from 'expo-constants';

export type PulseMotionMode = 'full' | 'reduced' | 'static';

const allowedModes = new Set<PulseMotionMode>(['full', 'reduced', 'static']);
const configuredMode =
  process.env.EXPO_PUBLIC_PULSE_MOTION_MODE ?? Constants.expoConfig?.extra?.pulseMotionMode;

export const pulseMotionMode: PulseMotionMode = allowedModes.has(configuredMode)
  ? configuredMode
  : 'full';
