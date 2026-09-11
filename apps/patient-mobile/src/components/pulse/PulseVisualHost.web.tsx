import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import { pulseMotionMode } from '../../config/runtime';
import type { PulseVisualProps } from './PulseVisual';
import { PulseVisualLoading, PulseVisualStatic } from './PulseVisualStatic';

export default function PulseVisualHost(props: PulseVisualProps) {
  if (pulseMotionMode === 'static') return <PulseVisualStatic {...props} />;

  return (
    <WithSkiaWeb
      componentProps={props}
      fallback={<PulseVisualLoading height={props.height} />}
      getComponent={() => import('./PulseVisual')}
      opts={undefined}
    />
  );
}
