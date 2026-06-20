import { useMemo } from 'react';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { type PlanetConfig } from '../game/planets';
import { makeRng } from '../game/rng';

function SkyDome({ planet }: { planet: PlanetConfig }) {
  const geometry = useMemo(() => {
    const geom = new THREE.SphereGeometry(400, 32, 24);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color(planet.palette.sky[0]);
    const bottom = new THREE.Color(planet.palette.sky[1]);
    const nebA = new THREE.Color(planet.palette.nebula[0]);
    const nebB = new THREE.Color(planet.palette.nebula[1]);
    const tmp = new THREE.Color();
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      n.fromBufferAttribute(pos, i).normalize();
      const y = n.y * 0.5 + 0.5;
      tmp.copy(bottom).lerp(top, y);
      // Sprinkle a soft nebula tint by direction for cosmic variety.
      const nebT = 0.5 + 0.5 * Math.sin(n.x * 2.1 + n.z * 1.7);
      tmp.lerp(nebT > 0.5 ? nebA : nebB, 0.08);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
  }, [planet]);

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}

// A sprinkle of distant pastel stars.
function Stars({ planet }: { planet: PlanetConfig }) {
  const geometry = useMemo(() => {
    const rng = makeRng(planet.seed ^ 0x555555);
    const count = 900;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color();
    const palette = [planet.palette.particle, planet.palette.accent, planet.palette.accent2, '#ffffff'];
    for (let i = 0; i < count; i++) {
      const u = rng();
      const v = rng();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 350;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.cos(phi) * r;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
      c.set(palette[Math.floor(rng() * palette.length)]);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
  }, [planet]);

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={1.6} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} fog={false} />
    </points>
  );
}

export default function Sky({ planet }: { planet: PlanetConfig }) {
  const p = planet.palette;
  return (
    <>
      <SkyDome planet={planet} />
      <Stars planet={planet} />

      <hemisphereLight args={[p.sky[0], p.terrain.low, 0.85]} />
      <ambientLight intensity={0.28} color={p.sky[1]} />
      <directionalLight
        position={[40, 60, 25]}
        intensity={1.2}
        color={p.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={220}
      />
      <directionalLight position={[-50, 30, -40]} intensity={0.4} color={p.accent} />

      <Sparkles count={120} scale={[160, 60, 160]} position={[0, 30, 0]} size={6} speed={0.3} opacity={0.6} color={p.particle} noise={1.2} />
      <Sparkles count={60} scale={[140, 50, 140]} position={[0, 20, 0]} size={10} speed={0.15} opacity={0.4} color={p.accent} noise={0.8} />
    </>
  );
}
