export const motion = {
  instant: 1,
  tap: 140,
  micro: 180,
  state: 300,
  transition: 440,
  trace: 600,
  signature: 760,
  ribbonDraw: 900,
  ribbonStagger: 80,
  breathe: 4200,
  orbit: 6800,
  float: 8200,
  ambient: 9200,
} as const;

export const easing = {
  standard: [0.2, 0, 0, 1] as const,
  settle: [0.22, 1, 0.36, 1] as const,
  shared: [0.65, 0, 0.35, 1] as const,
} as const;
