import { Component, lazy, Suspense, type PropsWithChildren, type ReactNode } from 'react';

import { pulseMotionMode } from '../../config/runtime';
import type { PulseVisualProps } from './PulseVisual';
import { PulseVisualLoading, PulseVisualStatic } from './PulseVisualStatic';

const LazyPulseVisual = lazy(() => import('./PulseVisual'));

interface VisualBoundaryProps extends PropsWithChildren {
  fallback: ReactNode;
}

class VisualBoundary extends Component<VisualBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function PulseVisualHost(props: PulseVisualProps) {
  const fallback = <PulseVisualStatic {...props} />;
  if (pulseMotionMode === 'static') return fallback;

  return (
    <VisualBoundary fallback={fallback}>
      <Suspense fallback={<PulseVisualLoading height={props.height} />}>
        <LazyPulseVisual {...props} />
      </Suspense>
    </VisualBoundary>
  );
}

export type { PulseVisualProps } from './PulseVisual';
