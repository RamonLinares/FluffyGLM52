import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PLANET_RADIUS, PLANET_DETAIL, heightOnSphere, biomeAt, getNoise3D, type PlanetConfig } from '../game/planets';
import { makeRng } from '../game/rng';

interface Props {
  planet: PlanetConfig;
}

// The floating planet: a displaced icosphere with vertex-colored pastel biomes.
// Coloring blends height-based tones with a separate biome field and slope
// (steep faces turn rocky) so the surface reads as varied regions, not one hue.
export default function Planet({ planet }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const noise = getNoise3D(planet.seed);
    const geom = new THREE.IcosahedronGeometry(PLANET_RADIUS, PLANET_DETAIL);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const t = planet.palette.terrain;
    const b = planet.palette.biome;
    const deep = new THREE.Color(t.deep);
    const low = new THREE.Color(t.low);
    const mid = new THREE.Color(t.mid);
    const high = new THREE.Color(t.high);
    const shore = new THREE.Color(b.shore);
    const moss = new THREE.Color(b.moss);
    const snow = new THREE.Color(b.snow);
    const rock = new THREE.Color(b.rock);
    const accent = new THREE.Color(planet.palette.accent);
    const tmp = new THREE.Color();
    const colA = new THREE.Color();
    const colB = new THREE.Color();
    const v = new THREE.Vector3();
    const n0 = new THREE.Vector3();
    const amp = planet.amplitude;
    const radial = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      n0.copy(v).normalize();
      const h = heightOnSphere(planet, noise, n0.x, n0.y, n0.z);
      const r = PLANET_RADIUS + h;
      v.copy(n0).multiplyScalar(r);
      pos.setXYZ(i, v.x, v.y, v.z);

      // Height ratio 0..1 across the amplitude range.
      const hr = THREE.MathUtils.clamp((h + amp) / (amp * 2), 0, 1);
      // Base height ramp: deep -> low -> mid -> high.
      if (hr < 0.33) colA.copy(deep).lerp(low, hr / 0.33);
      else if (hr < 0.66) colA.copy(low).lerp(mid, (hr - 0.33) / 0.33);
      else colA.copy(mid).lerp(high, (hr - 0.66) / 0.34);

      // Biome field: blend toward shore (lowlands), moss (mid), or snow (peaks).
      const biome = biomeAt(planet, noise, n0.x, n0.y, n0.z);
      if (hr < 0.4) colB.copy(shore);
      else if (hr < 0.75) colB.copy(moss);
      else colB.copy(snow);
      colA.lerp(colB, 0.32 * Math.abs(biome - 0.5) * 2);

      // Slope: steep faces (normal far from radial) turn rocky for realism.
      // Approximate the surface normal from the displaced position vs. the
      // radial direction. Cheaper than recomputing per-vertex; good enough for tinting.
      radial.copy(v).normalize();
      // Use the neighbor-free proxy: the more the displaced radius differs from
      // the smooth sphere, the more likely it's a slope. Combine with height noise.
      const slope = THREE.MathUtils.clamp(Math.abs(h) / amp, 0, 1);
      const steep = 1 - slope; // flatter areas => less rock; we invert below
      // Use a sharper slope proxy via the second-derivative-ish detail term.
      const detail = noise.noise(n0.x * planet.detailFreq * 2, n0.y * planet.detailFreq * 2, n0.z * planet.detailFreq * 2);
      const rocky = THREE.MathUtils.clamp(0.5 - detail * 0.8, 0, 1); // high detail variation => rocky patches
      void steep;
      colA.lerp(rock, rocky * 0.35);

      // Whisper of accent in the valleys for the ethereal anime tone.
      colA.lerp(accent, (1 - hr) * 0.06);

      colors[i * 3] = colA.r;
      colors[i * 3 + 1] = colA.g;
      colors[i * 3 + 2] = colA.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    return geom;
  }, [planet]);

  // NOTE: the planet does not self-rotate. Decorations, quests, and the player
  // are all anchored to world-space radial directions, so spinning the terrain
  // mesh alone would make planted props drift off their surface points and
  // appear tilted/floating. The world still feels alive via floating fragments,
  // sparkles, and quest motion.

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial vertexColors roughness={0.9} metalness={0} flatShading={false} />
      </mesh>
      <PlanetAtmosphere planet={planet} />
      <FloatingFragments planet={planet} />
      {planet.hasRings && <PlanetRings planet={planet} />}
    </group>
  );
}

// Soft additive halo hugging the planet for an ethereal rim.
export function PlanetAtmosphere({ planet }: Props) {
  return (
    <mesh scale={1.06}>
      <sphereGeometry args={[PLANET_RADIUS, 48, 32]} />
      <meshBasicMaterial
        color={planet.palette.atmosphere}
        transparent
        opacity={0.12}
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </mesh>
  );
}

// A few pastel rock shards drifting around the planet.
export function FloatingFragments({ planet }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geometry, items } = useMemo(() => {
    const rng = makeRng(planet.seed ^ 0x2c1b3a6d);
    const count = 7;
    const items: Array<{ orbit: number; tilt: number; phase: number; speed: number; scale: number }> = [];
    for (let i = 0; i < count; i++) {
      items.push({
        orbit: PLANET_RADIUS * (1.5 + rng() * 1.2),
        tilt: (rng() - 0.5) * 1.2,
        phase: rng() * Math.PI * 2,
        speed: 0.05 + rng() * 0.08,
        scale: 0.6 + rng() * 1.4,
      });
    }
    const geom = new THREE.DodecahedronGeometry(0.8, 0);
    return { geometry: geom, items };
  }, [planet]);

  const colors = useMemo(() => {
    const rng = makeRng(planet.seed ^ 0x2c1b3a6d);
    const palette = [planet.palette.decoColor2, planet.palette.accent, planet.palette.accent2, planet.palette.decoColor];
    const arr = new Float32Array(items.length * 3);
    const c = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      c.set(palette[Math.floor(rng() * palette.length)]);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [planet, items.length]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const _color = new THREE.Color();
    const t = performance.now() * 0.001;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const a = it.phase + t * it.speed;
      pos.set(Math.cos(a) * it.orbit, Math.sin(it.tilt) * it.orbit * 0.3, Math.sin(a) * it.orbit);
      e.set(t * 0.3 + i, t * 0.2 + i, 0);
      q.setFromEuler(e);
      scl.setScalar(it.scale);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, _color.setRGB(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]}>
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.5}
        metalness={0}
        emissive={planet.palette.accent}
        emissiveIntensity={0.2}
        flatShading
      />
    </instancedMesh>
  );
}

// A thin pastel ring around some planets.
function PlanetRings({ planet }: Props) {
  return (
    <mesh rotation={[Math.PI / 2.6, 0.4, 0]}>
      <ringGeometry args={[PLANET_RADIUS * 1.4, PLANET_RADIUS * 1.9, 96]} />
      <meshBasicMaterial
        color={planet.palette.accent2}
        transparent
        opacity={0.28}
        side={THREE.DoubleSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}

