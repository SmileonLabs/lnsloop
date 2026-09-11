import { StatusBar } from 'expo-status-bar';

import { PulseApp } from '../src/features/pulse/PulseApp';

export default function IndexScreen() {
  return (
    <>
      <StatusBar style="light" />
      <PulseApp />
    </>
  );
}
