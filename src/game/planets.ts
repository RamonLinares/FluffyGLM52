import * as THREE from 'three';
import { Noise3D } from './noise';
import { makeRng, pick, shuffle, type Rng } from './rng';

export const PLANET_RADIUS = 30;
export const PLANET_DETAIL = 5; // icosahedron subdivisions

export type DecoKind = 'trees' | 'crystals' | 'mushrooms' | 'flowers' | 'reeds' | 'rocks' | 'coral';

export interface Palette {
  name: string;
  sky: [string, string]; // top, bottom gradient
  nebula: [string, string]; // cosmic haze colors
  fog: string;
  fogNear: number;
  fogFar: number;
  terrain: { deep: string; low: string; mid: string; high: string };
  // Extra terrain tints for biome variety (sandy lowlands, mossy midlands, snowy peaks).
  biome: { shore: string; moss: string; snow: string; rock: string };
  accent: string;
  accent2: string;
  decoration: DecoKind; // primary decoration kind
  decoColor: string;
  decoColor2: string;
  particle: string;
  atmosphere: string;
  sun: string;
}

// Richer palettes: each has a 4-tone terrain, plus two contrasting accents
// so the world never reads as a single hue.
const PALETTES: Palette[] = [
  {
    name: 'Sakura Drift',
    sky: ['#e8b6d6', '#f3e6ff'],
    nebula: ['#ffd1e8', '#cbb6ff'],
    fog: '#f6e6f2',
    fogNear: 55,
    fogFar: 320,
    terrain: { deep: '#e9a9c6', low: '#f4c2dc', mid: '#ffe0ec', high: '#fff5fa' },
    biome: { shore: '#ffe9f4', moss: '#d8f5c8', snow: '#ffffff', rock: '#e2b8c8' },
    accent: '#7fe7b0',
    accent2: '#ffd06a',
    decoration: 'trees',
    decoColor: '#ffb6d5',
    decoColor2: '#9ff0c4',
    particle: '#ffd1e8',
    atmosphere: '#ffc6e2',
    sun: '#fff0f7',
  },
  {
    name: 'Mint Aurora',
    sky: ['#b6efce', '#dff6ff'],
    nebula: ['#cdf7df', '#a6e0ff'],
    fog: '#e2f7ec',
    fogNear: 60,
    fogFar: 330,
    terrain: { deep: '#8fe0b4', low: '#aef0c8', mid: '#d8f7e6', high: '#f0fff6' },
    biome: { shore: '#dff6ee', moss: '#b6efce', snow: '#f4ffff', rock: '#a8d8c0' },
    accent: '#ff9ecb',
    accent2: '#7cd6ff',
    decoration: 'reeds',
    decoColor: '#9ff0c4',
    decoColor2: '#ffb6d5',
    particle: '#cdf7df',
    atmosphere: '#b6f0d4',
    sun: '#f0fff7',
  },
  {
    name: 'Lavender Haze',
    sky: ['#c4b6ff', '#ffe0ec'],
    nebula: ['#e0d6ff', '#ffd9c6'],
    fog: '#ece6ff',
    fogNear: 58,
    fogFar: 325,
    terrain: { deep: '#b39cff', low: '#cbb6ff', mid: '#e0d6ff', high: '#f3eeff' },
    biome: { shore: '#efe9ff', moss: '#d6c6f0', snow: '#f8f4ff', rock: '#b8a8e0' },
    accent: '#ffb088',
    accent2: '#ffd06a',
    decoration: 'crystals',
    decoColor: '#cbb6ff',
    decoColor2: '#ffc2a0',
    particle: '#e0d6ff',
    atmosphere: '#d6ccff',
    sun: '#f3eeff',
  },
  {
    name: 'Peach Dawn',
    sky: ['#ffc2a0', '#ffe6d2'],
    nebula: ['#ffd9c6', '#cdeeff'],
    fog: '#ffe9dc',
    fogNear: 58,
    fogFar: 325,
    terrain: { deep: '#ffb088', low: '#ffc7ad', mid: '#ffe0cc', high: '#fff4ec' },
    biome: { shore: '#fff0e6', moss: '#f0d8b0', snow: '#fff8f0', rock: '#e0b088' },
    accent: '#7cd6ff',
    accent2: '#ff9ecb',
    decoration: 'flowers',
    decoColor: '#ffc2a0',
    decoColor2: '#a6e0ff',
    particle: '#ffd9c6',
    atmosphere: '#ffd0bc',
    sun: '#fff5ee',
  },
  {
    name: 'Aqua Dream',
    sky: ['#a6e0ff', '#e6dcff'],
    nebula: ['#cdeeff', '#ffd1e8'],
    fog: '#e0f4ff',
    fogNear: 60,
    fogFar: 330,
    terrain: { deep: '#7cd6ff', low: '#a9e2ff', mid: '#d2efff', high: '#eefaff' },
    biome: { shore: '#e6f8ff', moss: '#b8e8e0', snow: '#f4fcff', rock: '#9cc8e0' },
    accent: '#ff9ecb',
    accent2: '#cbb6ff',
    decoration: 'coral',
    decoColor: '#a6e0ff',
    decoColor2: '#ffb6d5',
    particle: '#cdeeff',
    atmosphere: '#b6e6ff',
    sun: '#f0fbff',
  },
  {
    name: 'Honey Meadow',
    sky: ['#ffd79a', '#f0e6ff'],
    nebula: ['#ffe9bd', '#d6ccff'],
    fog: '#fff0d6',
    fogNear: 58,
    fogFar: 325,
    terrain: { deep: '#ffc24d', low: '#ffd680', mid: '#ffe9b8', high: '#fff8ec' },
    biome: { shore: '#fff6e0', moss: '#f0e0a8', snow: '#fffaf0', rock: '#e0c878' },
    accent: '#cbb6ff',
    accent2: '#7fe7b0',
    decoration: 'mushrooms',
    decoColor: '#ffd79a',
    decoColor2: '#d6c6ff',
    particle: '#ffe9bd',
    atmosphere: '#ffe0a0',
    sun: '#fff8ec',
  },
  {
    name: 'Rose Quartz',
    sky: ['#ffb6c8', '#e6f0ff'],
    nebula: ['#ffd8e2', '#cdeeff'],
    fog: '#ffe6ec',
    fogNear: 58,
    fogFar: 325,
    terrain: { deep: '#ff9fb6', low: '#ffc0cf', mid: '#ffd8e2', high: '#fff2f5' },
    biome: { shore: '#fff0f4', moss: '#f0d8e0', snow: '#fffafc', rock: '#e0a8b8' },
    accent: '#7fe7b0',
    accent2: '#7cd6ff',
    decoration: 'flowers',
    decoColor: '#ffc6d4',
    decoColor2: '#9ff0c4',
    particle: '#ffd8e2',
    atmosphere: '#ffc6d4',
    sun: '#fff3f5',
  },
  {
    name: 'Periwinkle Cosmos',
    sky: ['#a6b6ff', '#ffe0f0'],
    nebula: ['#cdd6ff', '#ffd1e8'],
    fog: '#e0e6ff',
    fogNear: 60,
    fogFar: 330,
    terrain: { deep: '#9aa8ff', low: '#bcc6ff', mid: '#d8deff', high: '#f1f3ff' },
    biome: { shore: '#eef1ff', moss: '#c8d0ee', snow: '#f8faff', rock: '#a8b0d8' },
    accent: '#ff9ecb',
    accent2: '#ffd06a',
    decoration: 'trees',
    decoColor: '#c2ccff',
    decoColor2: '#ffb6d5',
    particle: '#d4dbff',
    atmosphere: '#c2ccff',
    sun: '#f2f4ff',
  },
];

const NAME_PREFIXES = ['Lumi', 'Sora', 'Yuki', 'Hana', 'Ame', 'Kiri', 'Niko', 'Ruka', 'Tsu', 'Mai', 'Fuu', 'Koa', 'Eto', 'Sai'];
const NAME_SUFFIXES = ['mir', 'lia', 'sora', 'noa', 'tia', 'wen', 'ra', 'lu', 'mei', 'ya', 'ne', 'su'];

export interface PlanetConfig {
  seed: number;
  index: number;
  name: string;
  palette: Palette;
  amplitude: number; // base terrain displacement
  frequency: number; // base noise scale
  octaves: number;
  rotSpeed: number; // gentle planet self-rotation for life
  hasRings: boolean;
  // Terrain feature params for richer, less plains-like surfaces.
  ridge: number; // 0..1 strength of ridged noise (sharper ridges/valleys)
  ridgeFreq: number;
  detailAmp: number; // small high-frequency detail (boulders, ripples)
  detailFreq: number;
  warp: number; // domain-warp amount for twisting, organic coastlines
  warpFreq: number;
  decorations: DecoKind[]; // primary + 1-2 secondary kinds for variety
}

// Pick a varied mix of decoration kinds: primary from the palette, plus
// complementary secondaries so each world has mixed flora.
function decorationMix(rng: Rng, primary: DecoKind): DecoKind[] {
  const all: DecoKind[] = ['trees', 'crystals', 'mushrooms', 'flowers', 'reeds', 'rocks', 'coral'];
  const seconds = all.filter((k) => k !== primary);
  const extra = shuffle(rng, seconds).slice(0, 2);
  return [primary, ...extra];
}

export function generatePlanet(seed: number, index: number): PlanetConfig {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const palette = pick(rng, PALETTES);
  const name = `${pick(rng, NAME_PREFIXES)}${pick(rng, NAME_SUFFIXES)}`;
  return {
    seed,
    index,
    name,
    palette,
    amplitude: 1.8 + rng() * 2.6, // 1.8..4.4 — gentle but readable hills
    frequency: 0.085 + rng() * 0.045,
    octaves: 5,
    rotSpeed: (rng() - 0.5) * 0.03,
    hasRings: rng() > 0.6,
    ridge: rng() * 0.6, // 0..0.6
    ridgeFreq: 0.06 + rng() * 0.05,
    detailAmp: 0.25 + rng() * 0.45,
    detailFreq: 0.4 + rng() * 0.3,
    warp: 0.3 + rng() * 0.5,
    warpFreq: 0.04 + rng() * 0.03,
    decorations: decorationMix(rng, palette.decoration),
  };
}

// Ridged multifractal: produces sharp ridges and valleys (1 - |noise|, squared).
function ridged(noise: Noise3D, x: number, y: number, z: number, freq: number, octaves: number): number {
  let amp = 1, f = freq, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = 1 - Math.abs(noise.noise(x * f, y * f, z * f));
    sum += amp * n * n;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return (sum / norm) * 2 - 1;
}

// Shared terrain height on the sphere, sampled along a surface direction (unit vector).
// Combines base fbm hills + ridged component + high-frequency detail + domain warp
// for organic, non-plains-like but still gentle, realistic terrain.
export function heightOnSphere(planet: PlanetConfig, noise: Noise3D, nx: number, ny: number, nz: number): number {
  // Domain warp: offset the sample coords with a low-frequency noise field so
  // coastlines and ridges twist instead of forming straight gradients.
  const wf = planet.warpFreq;
  const wx = noise.noise(nx * wf + 11.3, ny * wf + 5.1, nz * wf + 7.7) * planet.warp;
  const wy = noise.noise(nx * wf + 2.4, ny * wf + 19.8, nz * wf + 3.2) * planet.warp;
  const wz = noise.noise(nx * wf + 8.1, ny * wf + 1.6, nz * wf + 14.5) * planet.warp;

  const base = noise.fbm((nx + wx) * planet.frequency, (ny + wy) * planet.frequency, (nz + wz) * planet.frequency, planet.octaves, 2, 0.5);
  const ridge = ridged(noise, nx + wx, ny + wy, nz + wz, planet.ridgeFreq, 4);
  const detail = noise.noise(nx * planet.detailFreq, ny * planet.detailFreq, nz * planet.detailFreq);

  return base * planet.amplitude + ridge * planet.amplitude * planet.ridge + detail * planet.detailAmp;
}

// Biome field (0..1) sampled per direction, used for region-based color variety
// (e.g. mossy vs sandy vs snowy patches) independent of height.
export function biomeAt(planet: PlanetConfig, noise: Noise3D, nx: number, ny: number, nz: number): number {
  return 0.5 + 0.5 * noise.fbm(nx * 0.05 + 3.3, ny * 0.05 + 9.1, nz * 0.05 + 6.6, 3, 2, 0.5);
}

// Surface radius (from planet center) at a given direction, including terrain.
export function surfaceRadius(planet: PlanetConfig, noise: Noise3D, nx: number, ny: number, nz: number): number {
  return PLANET_RADIUS + heightOnSphere(planet, noise, nx, ny, nz);
}

// True surface normal at a direction, derived from the height field's angular
// gradient. This accounts for terrain slope so props planted on a hill stand
// perpendicular to the actual ground, not to the raw radial direction.
//
// We measure how height changes per radian along two tangent directions, then
// tilt the normal away from radial by (gradient / radius). This is far more
// accurate than a cross-product of displaced surface points, whose tangent
// vectors are dominated by the planet's curvature and swamp the height signal.
const _snD = new THREE.Vector3();
const _snT1 = new THREE.Vector3();
const _snT2 = new THREE.Vector3();
export function surfaceNormal(
  planet: PlanetConfig,
  noise: Noise3D,
  nx: number,
  ny: number,
  nz: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const EPS = 0.02; // small angular step for a local derivative
  _snD.set(nx, ny, nz).normalize();
  // Two orthonormal tangent directions on the unit sphere.
  if (Math.abs(_snD.y) < 0.9) _snT1.set(0, 1, 0).cross(_snD);
  else _snT1.set(1, 0, 0).cross(_snD);
  _snT1.normalize();
  _snT2.crossVectors(_snD, _snT1).normalize();

  const h0 = heightOnSphere(planet, noise, _snD.x, _snD.y, _snD.z);

  // Height at a small angular step along T1.
  const d1x = _snD.x + EPS * _snT1.x;
  const d1y = _snD.y + EPS * _snT1.y;
  const d1z = _snD.z + EPS * _snT1.z;
  const dl1 = Math.hypot(d1x, d1y, d1z);
  const h1 = heightOnSphere(planet, noise, d1x / dl1, d1y / dl1, d1z / dl1);

  // Height at a small angular step along T2.
  const d2x = _snD.x + EPS * _snT2.x;
  const d2y = _snD.y + EPS * _snT2.y;
  const d2z = _snD.z + EPS * _snT2.z;
  const dl2 = Math.hypot(d2x, d2y, d2z);
  const h2 = heightOnSphere(planet, noise, d2x / dl2, d2y / dl2, d2z / dl2);

  // Angular gradient (height change per radian), in world units.
  const g1 = (h1 - h0) / EPS;
  const g2 = (h2 - h0) / EPS;
  const r = PLANET_RADIUS + h0;

  // Tilt the radial direction opposite to the uphill gradient, scaled by 1/r.
  // For a slope of angle α this yields a normal tilt of α (tan α ≈ α for gentle hills).
  out
    .copy(_snD)
    .addScaledVector(_snT1, -g1 / r)
    .addScaledVector(_snT2, -g2 / r)
    .normalize();
  return out;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Per-planet 3D noise cache (stable across renders).
const noiseCache = new Map<number, Noise3D>();
export function getNoise3D(seed: number): Noise3D {
  let n = noiseCache.get(seed);
  if (!n) {
    n = new Noise3D(seed);
    noiseCache.set(seed, n);
  }
  return n;
}

// Scatter points on a unit sphere, keeping a minimum angular distance apart.
export function scatterOnSphere(rng: Rng, count: number, minAngle: number): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [];
  let tries = 0;
  const cosMin = Math.cos(minAngle);
  while (pts.length < count && tries < count * 400) {
    tries++;
    const u = rng();
    const v = rng();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);
    let ok = true;
    for (const p of pts) {
      const dot = p[0] * x + p[1] * y + p[2] * z;
      if (dot > cosMin) {
        ok = false;
        break;
      }
    }
    if (ok) pts.push([x, y, z]);
  }
  return pts;
}
