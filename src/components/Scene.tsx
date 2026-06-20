import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlanet } from '../store/gameStore';
import Sky from './Sky';
import Planet from './Planet';
import Decorations from './Decorations';
import Quests from './Quests';
import Player from './Player';
import Effects from './Effects';

function SceneContents() {
  const planet = usePlanet();
  const p = planet.palette;
  return (
    <>
      <color attach="background" args={[p.sky[1]]} />
      <fog attach="fog" args={[p.fog, p.fogNear, p.fogFar]} />

      <Sky planet={planet} />
      <Planet planet={planet} />
      <Decorations planet={planet} />
      <Quests planet={planet} />
      <Player planet={planet} />
      <Effects />
    </>
  );
}

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ fov: 55, near: 0.1, far: 500, position: [0, 40, -16] }}
    >
      <Suspense fallback={null}>
        <SceneContents />
      </Suspense>
    </Canvas>
  );
}
