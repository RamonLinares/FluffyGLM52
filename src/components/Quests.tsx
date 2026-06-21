import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAllCollected, useGame, useQuests } from '../store/gameStore';
import { type PlanetConfig, PLANET_RADIUS } from '../game/planets';
import { playerPos, setQuestTargets, type QuestTarget } from '../game/shared';
import type { QuestKind } from '../game/quests';

const HOVER = 1.7;
const COLLECT_RADIUS = 2.6;

interface Props {
  planet: PlanetConfig;
}

export default function Quests({ planet }: Props) {
  const quests = useQuests();
  const collect = useGame((s) => s.collect);
  const beginTransport = useGame((s) => s.beginTransport);
  const allCollected = useAllCollected();

  // Publish quest world positions so the DOM compass can point at them.
  useEffect(() => {
    const targets: QuestTarget[] = quests.map((q) => ({
      id: q.id,
      pos: new THREE.Vector3(q.dir[0], q.dir[1], q.dir[2]).multiplyScalar(PLANET_RADIUS + q.height + HOVER),
    }));
    setQuestTargets(targets);
    return () => setQuestTargets([]);
  }, [quests]);

  // Begin the transport once all five are gathered.
  useEffect(() => {
    if (!allCollected) return;
    const t = setTimeout(() => beginTransport(), 700);
    return () => clearTimeout(t);
  }, [allCollected, beginTransport]);

  // Proximity collection each frame (reads store directly, no re-render).
  useFrame(() => {
    const state = useGame.getState();
    if (state.phase !== 'play') return;
    const collected = state.collectedIds;
    if (collected.length >= quests.length) return;
    const px = playerPos;
    for (const q of quests) {
      if (collected.includes(q.id)) continue;
      const wx = q.dir[0] * (PLANET_RADIUS + q.height + HOVER);
      const wy = q.dir[1] * (PLANET_RADIUS + q.height + HOVER);
      const wz = q.dir[2] * (PLANET_RADIUS + q.height + HOVER);
      const dx = wx - px.x;
      const dy = wy - px.y;
      const dz = wz - px.z;
      if (dx * dx + dy * dy + dz * dz < COLLECT_RADIUS * COLLECT_RADIUS) {
        state.collect(q.id);
      }
    }
  });

  return (
    <>
      {quests.map((q) => (
        <QuestMarker key={q.id} id={q.id} kind={q.kind} dir={q.dir} height={q.height} color={q.color} color2={q.color2} />
      ))}
    </>
  );
}

interface MarkerProps {
  id: number;
  kind: QuestKind;
  dir: [number, number, number];
  height: number;
  color: string;
  color2: string;
}

const QuestMarker = memo(function QuestMarker({ id, kind, dir, height, color, color2 }: MarkerProps) {
  const collected = useGame((s) => s.collectedIds.includes(id));
  const groupRef = useRef<THREE.Group>(null);
  const [gone, setGone] = useState(false);

  const worldPos = useMemo(() => {
    const r = PLANET_RADIUS + height + HOVER;
    return new THREE.Vector3(dir[0] * r, dir[1] * r, dir[2] * r);
  }, [dir, height]);

  const orientQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dir[0], dir[1], dir[2])), [dir]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const t = performance.now() * 0.001;
    // Hover bob along the radial direction.
    const bob = Math.sin(t * 1.4 + id) * 0.3;
    const r = PLANET_RADIUS + height + HOVER + bob;
    g.position.set(dir[0] * r, dir[1] * r, dir[2] * r);
    g.quaternion.copy(orientQuat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 0.5 + id));
  });

  if (gone) return null;

  if (collected) {
    return <CollectBurst position={worldPos} color={color} color2={color2} onDone={() => setGone(true)} />;
  }

  return (
    <group ref={groupRef}>
      <group>
        <QuestModel kind={kind} color={color} color2={color2} />
      </group>
      {/* Tall glowing beam so the quest is visible from across the planet. */}
      <mesh position={[0, -1.3, 0]}>
        <cylinderGeometry args={[0.08, 0.3, 2.8, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      {/* Sky beacon: a tall, bright pillar that rises high above the surface
          so you can spot the quest from anywhere on the planet. */}
      <mesh position={[0, 12, 0]}>
        <cylinderGeometry args={[0.04, 0.12, 22, 8, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      {/* Floating ring halo above the quest for extra visibility. */}
      <mesh position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} fog={false} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={1.2} distance={10} color={color} />
      {/* A second light high up so the beacon glows from afar. */}
      <pointLight position={[0, 12, 0]} intensity={0.6} distance={20} color={color} />
    </group>
  );
});

// ---------- Per-kind imaginative models ----------

function QuestModel({ kind, color, color2 }: { kind: QuestKind; color: string; color2: string }) {
  switch (kind) {
    case 'orb':
      return <OrbModel color={color} color2={color2} />;
    case 'bell':
      return <BellModel color={color} color2={color2} />;
    case 'lantern':
      return <LanternModel color={color} color2={color2} />;
    case 'flower':
      return <FlowerModel color={color} color2={color2} />;
    case 'shard':
      return <ShardModel color={color} color2={color2} />;
    case 'wisp':
      return <WispModel color={color} color2={color2} />;
    case 'star':
      return <StarModel color={color} color2={color2} />;
    default:
      return null;
  }
}

function glow(color: string, intensity = 0.9) {
  return { color, emissive: color, emissiveIntensity: intensity, roughness: 0.25, metalness: 0, transparent: true, opacity: 0.95 };
}

// Starpetal Orb: glowing core with three orbiting motes on tilted rings.
function OrbModel({ color, color2 }: { color: string; color2: string }) {
  const ringA = useRef<THREE.Group>(null);
  const ringB = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ringA.current) ringA.current.rotation.z += d * 1.4;
    if (ringB.current) ringB.current.rotation.x += d * 1.1;
  });
  return (
    <group>
      <mesh castShadow>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshStandardMaterial {...glow(color, 1.0)} />
      </mesh>
      <group ref={ringA} rotation={[0.4, 0, 0]}>
        <mesh>
          <torusGeometry args={[1.0, 0.02, 8, 48]} />
          <meshBasicMaterial color={color2} transparent opacity={0.5} />
        </mesh>
        <mesh position={[1.0, 0, 0]}>
          <sphereGeometry args={[0.16, 12, 10]} />
          <meshStandardMaterial {...glow(color2, 1.0)} />
        </mesh>
      </group>
      <group ref={ringB} rotation={[0, 0, 0.6]}>
        <mesh>
          <torusGeometry args={[1.2, 0.02, 8, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
        <mesh position={[1.2, 0, 0]}>
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshStandardMaterial {...glow(color2, 1.0)} />
        </mesh>
        <mesh position={[-1.2, 0, 0]}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshStandardMaterial {...glow(color, 1.0)} />
        </mesh>
      </group>
    </group>
  );
}

// Drifting Bell: a bell body with a clapper, gently swinging.
function BellModel({ color, color2 }: { color: string; color2: string }) {
  const swing = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (swing.current) swing.current.rotation.z = Math.sin(performance.now() * 0.002) * 0.3;
  });
  return (
    <group ref={swing}>
      <mesh castShadow position={[0, 0.1, 0]}>
        <coneGeometry args={[0.5, 0.8, 16, 1, true]} />
        <meshStandardMaterial {...glow(color, 0.8)} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <sphereGeometry args={[0.14, 12, 10]} />
        <meshStandardMaterial {...glow(color2, 1.0)} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <torusGeometry args={[0.1, 0.04, 8, 16]} />
        <meshStandardMaterial {...glow(color2, 0.7)} />
      </mesh>
    </group>
  );
}

// Wandering Lantern: a glowing core inside a wireframe cage, hanging from an arc.
function LanternModel({ color, color2 }: { color: string; color2: string }) {
  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[0.45, 0]} />
        <meshBasicMaterial color={color2} wireframe transparent opacity={0.6} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial {...glow(color, 1.2)} />
      </mesh>
      <mesh position={[0, 0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.03, 8, 16, Math.PI]} />
        <meshBasicMaterial color={color2} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// Meadow Bloom: a flower with a center and petals arranged radially.
function FlowerModel({ color, color2 }: { color: string; color2: string }) {
  const petals = useMemo(() => Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2), []);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.28, 16, 12]} />
        <meshStandardMaterial {...glow(color2, 1.0)} />
      </mesh>
      {petals.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]} rotation={[0, -a, Math.PI / 2.4]}>
          <coneGeometry args={[0.22, 0.55, 8]} />
          <meshStandardMaterial {...glow(color, 0.85)} />
        </mesh>
      ))}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshBasicMaterial color={color2} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// Pastel Prism: a cluster of crystals at varied angles.
function ShardModel({ color, color2 }: { color: string; color2: string }) {
  const shards = useMemo(
    () => [
      { p: [0, 0.2, 0] as [number, number, number], s: 1, r: [0, 0, 0] as [number, number, number], c: color },
      { p: [0.4, -0.1, 0.1] as [number, number, number], s: 0.7, r: [0.3, 0.4, 0.2] as [number, number, number], c: color2 },
      { p: [-0.35, 0, -0.15] as [number, number, number], s: 0.6, r: [-0.2, 0.5, 0.3] as [number, number, number], c: color2 },
      { p: [0.1, -0.25, 0.35] as [number, number, number], s: 0.5, r: [0.5, 0.1, -0.3] as [number, number, number], c: color },
    ],
    [color, color2]
  );
  return (
    <group>
      {shards.map((s, i) => (
        <mesh key={i} position={s.p} rotation={s.r} scale={s.s} castShadow>
          <octahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial {...glow(s.c, 0.9)} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// Wandering Wisp: a glowing core with a swirling ribbon tail.
function WispModel({ color, color2 }: { color: string; color2: string }) {
  const tail = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (tail.current) tail.current.rotation.y += d * 1.6;
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.34, 16, 12]} />
        <meshStandardMaterial {...glow(color, 1.2)} />
      </mesh>
      <group ref={tail}>
        <mesh position={[0.5, 0.2, 0]}>
          <sphereGeometry args={[0.16, 10, 8]} />
          <meshStandardMaterial {...glow(color2, 0.9)} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0.7, -0.15, 0.2]}>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial {...glow(color2, 0.8)} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.6, -0.35, -0.1]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial {...glow(color, 0.7)} transparent opacity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// Falling Star: a 5-pointed star with a little trail.
function StarModel({ color, color2 }: { color: string; color2: string }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const spikes = 5;
    const outer = 0.6;
    const inner = 0.26;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }, []);
  const spin = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (spin.current) spin.current.rotation.z += d * 1.2;
  });
  return (
    <group>
      <mesh ref={spin} castShadow>
        <extrudeGeometry args={[shape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 }]} />
        <meshStandardMaterial {...glow(color, 1.0)} />
      </mesh>
      <mesh position={[0.7, 0.3, 0]}>
        <coneGeometry args={[0.1, 0.5, 8]} />
        <meshBasicMaterial color={color2} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// ---------- Collect burst VFX ----------

function CollectBurst({
  position,
  color,
  color2,
  onDone,
}: {
  position: THREE.Vector3;
  color: string;
  color2: string;
  onDone: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const start = useRef(performance.now());
  const particles = useMemo(() => {
    const arr: Array<{ vel: THREE.Vector3; mesh: number }> = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const p = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 2;
      arr.push({
        vel: new THREE.Vector3(
          Math.cos(a) * Math.cos(p) * speed,
          Math.sin(p) * speed,
          Math.sin(a) * Math.cos(p) * speed
        ),
        mesh: i,
      });
    }
    return arr;
  }, []);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const elapsed = (performance.now() - start.current) / 1000;
    const dur = 0.6;
    const t = Math.min(1, elapsed / dur);
    for (let i = 0; i < particles.length; i++) {
      const child = g.children[i] as THREE.Mesh | undefined;
      if (!child) continue;
      child.position.copy(particles[i].vel).multiplyScalar(elapsed);
      const s = (1 - t) * 0.9;
      child.scale.setScalar(Math.max(0.01, s));
      const mat = child.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.9;
    }
    if (ringRef.current) {
      const rs = 0.2 + t * 2.4;
      ringRef.current.scale.setScalar(rs);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.6;
    }
    if (elapsed >= dur) onDone();
  });

  return (
    <group ref={ref} position={position}>
      {particles.map((p, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshBasicMaterial color={i % 2 === 0 ? color : color2} transparent opacity={0.9} depthWrite={false} fog={false} />
        </mesh>
      ))}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.42, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} fog={false} />
      </mesh>
    </group>
  );
}
