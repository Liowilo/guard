'use client';

import LaserFlow from './LaserFlow';

export default function HeroLaserFlow() {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0"
      style={{
        mixBlendMode: 'screen',
        opacity: 0.55,
        bottom: '-40%',
        height: '80%',
      }}
    >
      <LaserFlow
        color="#34D399"
        horizontalBeamOffset={0.0}
        verticalBeamOffset={0.0}
        wispDensity={1}
        wispSpeed={15}
        wispIntensity={4}
        flowSpeed={0.35}
        flowStrength={0.25}
        fogIntensity={0.45}
        fogScale={0.3}
        fogFallSpeed={0.6}
        decay={1.1}
        falloffStart={1.2}
        verticalSizing={2}
        horizontalSizing={0.5}
      />
    </div>
  );
}
