import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { type PlanetConfig, type DecoKind, PLANET_RADIUS, heightOnSphere, scatterOnSphere, getNoise3D } from '../game/planets';
import { makeRng } from '../game/rng';
import { setColliders, type Collider } from '../game/shared';
import { clusterGeometry, SOLID_RADIUS, isFlat } from '../game/decorations';

interface Props {
  planet: PlanetConfig;
}

interface DecoItem {
  dir: THREE.Vector3;
  radius: number;
  scale: number;
  spin: number;
  // Per-instance color modulation (multiplied with baked vertex colors).
  colorMod: THREE.Color;
}

// Count per kind: primary gets the most, secondaries fewer for variety.
function countForKind(kind: DecoKind, isPrimary: boolean): number {
  if (isPrimary) return 48;
  return 22;
}

// Scale range per kind so the world has tall and small props.
function scaleForKind(kind: DecoKind, rng: () => number): number {
  switch (kind) {
    case 'trees': return 0.9 + rng() * 1.3;
    case 'rocks': return 0.6 + rng() * 1.1;
    case 'coral': return 0.7 + rng() * 1.0;
    case 'mushrooms': return 0.7 + rng() * 1.1;
    case 'crystals': return 0.7 + rng() * 1.2;
    case 'flowers': return 0.7 + rng() * 0.9;
    case 'reeds': return 0.7 + rng() * 1.0;
    default: return 0.8 + rng() * 1.0;
  }
}

// Per-kind instance color modulation for variety (slight hue shifts and light/dark).
function colorModFor(kind: DecoKind, rng: () => number, palette: PlanetConfig['palette']): THREE.Color {
  const base = new THREE.Color(palette.decoColor);
  const alt = new THREE.Color(palette.decoColor2);
  const acc = new THREE.Color(palette.accent);
  const choices = [base, alt, tint(base, acc, 0.3), tint(alt, base, 0.3)];
  const c = choices[Math.floor(rng() * choices.length)].clone();
  // Slight brightness variation.
  const v = 0.85 + rng() * 0.3;
  c.multiplyScalar(v);
  return c;
}

function tint(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, t);
}

function DecoLayer({
  planet,
  kind,
  isPrimary,
  seedOffset,
}: {
  planet: PlanetConfig;
  kind: DecoKind;
  isPrimary: boolean;
  seedOffset: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const items = useMemo<DecoItem[]>(() => {
    const rng = makeRng(planet.seed ^ seedOffset);
    const noise = getNoise3D(planet.seed);
    const count = countForKind(kind, isPrimary);
    const minAngle = isPrimary ? 0.3 : 0.4;
    const dirs = scatterOnSphere(rng, count, minAngle);
    return dirs.map((d) => {
      const dir = new THREE.Vector3(d[0], d[1], d[2]);
      const h = heightOnSphere(planet, noise, d[0], d[1], d[2]);
      return {
        dir,
        radius: PLANET_RADIUS + h,
        scale: scaleForKind(kind, rng),
        spin: rng() * Math.PI * 2,
        colorMod: colorModFor(kind, rng, planet.palette),
      };
    });
  }, [planet, kind, isPrimary, seedOffset]);

  const geometry = useMemo(() => clusterGeometry(kind, planet.palette), [kind, planet.palette]);
  const flat = isFlat(kind);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      // Align local +Y to the radial line from the planet's center, then twist
      // around that same axis. Order matters: alignment first (qA), then spin (qB),
      // so the tree spins around its own axis instead of tilting.
      const qAlign = new THREE.Quaternion().setFromUnitVectors(up, it.dir);
      const qSpin = new THREE.Quaternion().setFromAxisAngle(it.dir, it.spin);
      q.copy(qSpin).multiply(qAlign); // qB * qA → apply qA first, then qB
      // Sink slightly into the ground so the base meets the visible mesh
      // (which is interpolated between vertices and sits a touch below the
      // true noise height the decoration is placed at).
      pos.copy(it.dir).multiplyScalar(it.radius - it.scale * 0.18);
      scl.setScalar(it.scale);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, it.colorMod);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={flat ? 0.35 : 0.6}
        metalness={0}
        emissive={planet.palette.decoColor}
        emissiveIntensity={kind === 'crystals' ? 0.25 : 0.1}
        flatShading={flat}
        transparent
        opacity={0.97}
      />
    </instancedMesh>
  );
}

export default function Decorations({ planet }: Props) {
  // Publish static colliders across all solid decoration layers.
  useEffect(() => {
    const noise = getNoise3D(planet.seed);
    const next: Collider[] = [];
    const cpos = new THREE.Vector3();
    for (const kind of planet.decorations) {
      const solidR = SOLID_RADIUS[kind];
      if (solidR == null) continue;
      const rng = makeRng(planet.seed ^ (kind.charCodeAt(0) * 0x1000003));
      const count = countForKind(kind, kind === planet.decorations[0]);
      const dirs = scatterOnSphere(rng, count, 0.32);
      for (const d of dirs) {
        const dir = new THREE.Vector3(d[0], d[1], d[2]);
        const h = heightOnSphere(planet, noise, d[0], d[1], d[2]);
        const scale = scaleForKind(kind, rng);
        cpos.copy(dir).multiplyScalar(PLANET_RADIUS + h + scale * 0.4);
        next.push({ pos: cpos.clone(), radius: solidR * scale });
      }
    }
    setColliders(next);
  }, [planet]);

  // Clear colliders when this planet unmounts.
  useEffect(() => () => setColliders([]), []);

  return (
    <>
      {planet.decorations.map((kind, i) => (
        <DecoLayer
          key={kind}
          planet={planet}
          kind={kind}
          isPrimary={i === 0}
          seedOffset={0x1b873593 + kind.charCodeAt(0) * 0x10001 + i * 0x1000003}
        />
      ))}
    </>
  );
}
