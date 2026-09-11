import { StatusBar } from 'expo-status-bar';

import { LoopPreview } from '../src/features/preview/LoopPreview';

export default function IndexScreen() {
  return (
    <>
      <StatusBar style="light" />
      <LoopPreview />
    </>
  );
}
