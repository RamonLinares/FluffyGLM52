import * as THREE from 'three';
import { type Palette, type DecoKind } from './planets';

// Build a single merged BufferGeometry per decoration kind, composed of several
// sub-shapes with baked vertex colors. Each instance then modulates these colors
// via instanceColor for variety. This keeps one draw call per kind while giving
// multi-part, multi-color, imaginative props.

interface SubPart {
  geom: THREE.BufferGeometry;
  color: THREE.Color;
  flat?: boolean;
}

function withColor(geom: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const count = geom.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geom;
}

// Shade a base color toward white (lighten) or toward a target (darken).
function tint(base: THREE.Color, toward: THREE.Color, amt: number): THREE.Color {
  return base.clone().lerp(toward, amt);
}

function mergeParts(parts: SubPart[]): THREE.BufferGeometry {
  const geoms = parts.map((p) => withColor(p.geom, p.color));
  return mergeBufferGeometries(geoms);
}

// Minimal merge for non-indexed geometries (all our parts are non-indexed).
function mergeBufferGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Convert all to non-indexed + ensure a color attribute.
  const nonIdx = geoms.map((g) => (g.index ? g.toNonIndexed() : g).clone());
  let totalVerts = 0;
  for (const g of nonIdx) totalVerts += g.attributes.position.count;
  const pos = new Float32Array(totalVerts * 3);
  const col = new Float32Array(totalVerts * 3);
  const nor = new Float32Array(totalVerts * 3);
  let pOff = 0;
  for (const g of nonIdx) {
    g.computeVertexNormals();
    const p = g.attributes.position as THREE.BufferAttribute;
    const c = g.attributes.color as THREE.BufferAttribute | undefined;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const hasColor = !!c;
    for (let i = 0; i < p.count; i++) {
      pos[(pOff + i) * 3] = p.getX(i);
      pos[(pOff + i) * 3 + 1] = p.getY(i);
      pos[(pOff + i) * 3 + 2] = p.getZ(i);
      col[(pOff + i) * 3] = hasColor ? c!.getX(i) : 1;
      col[(pOff + i) * 3 + 1] = hasColor ? c!.getY(i) : 1;
      col[(pOff + i) * 3 + 2] = hasColor ? c!.getZ(i) : 1;
      nor[(pOff + i) * 3] = n.getX(i);
      nor[(pOff + i) * 3 + 1] = n.getY(i);
      nor[(pOff + i) * 3 + 2] = n.getZ(i);
    }
    pOff += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

const WHITE = new THREE.Color('#ffffff');
const TRUNK = new THREE.Color('#caa37a');
const TRUNK_DARK = new THREE.Color('#a9855f');
const STEM = new THREE.Color('#e8d9a8');
const MOSS = new THREE.Color('#9fd9a8');

// --- Per-kind cluster builders ---

function buildTrees(p: Palette): SubPart[] {
  const c1 = new THREE.Color(p.decoColor);
  const c2 = new THREE.Color(p.decoColor2);
  const acc = new THREE.Color(p.accent);
  const parts: SubPart[] = [];
  // Trunk.
  parts.push({ geom: new THREE.CylinderGeometry(0.16, 0.26, 1.4, 8).translate(0, 0.7, 0), color: TRUNK });
  // Canopy: a cluster of three soft blobs in two colors for depth.
  parts.push({ geom: new THREE.IcosahedronGeometry(0.9, 2).translate(0, 1.8, 0), color: c1 });
  parts.push({ geom: new THREE.IcosahedronGeometry(0.62, 2).translate(0.62, 1.55, 0.2), color: tint(c2, WHITE, 0.25) });
  parts.push({ geom: new THREE.IcosahedronGeometry(0.58, 2).translate(-0.55, 1.6, -0.18), color: tint(c1, acc, 0.3) });
  // A couple of hanging berry dots in the accent color.
  parts.push({ geom: new THREE.SphereGeometry(0.1, 8, 6).translate(0.5, 1.2, 0.1), color: acc });
  parts.push({ geom: new THREE.SphereGeometry(0.08, 8, 6).translate(-0.4, 1.15, -0.1), color: tint(acc, WHITE, 0.4) });
  return parts;
}

function buildCrystals(p: Palette): SubPart[] {
  const c1 = new THREE.Color(p.decoColor);
  const c2 = new THREE.Color(p.decoColor2);
  const parts: SubPart[] = [];
  const shards: Array<[number, number, number, number, THREE.Color]> = [
    [0, 0.9, 0, 1.2, c1],
    [0.42, 0.5, 0.18, 0.8, tint(c2, WHITE, 0.2)],
    [-0.36, 0.4, -0.16, 0.7, c2],
    [0.12, 0.3, -0.42, 0.55, tint(c1, WHITE, 0.35)],
    [-0.2, 0.25, 0.4, 0.5, tint(c2, c1, 0.4)],
  ];
  for (const [x, y, z, s, col] of shards) {
    const g = new THREE.OctahedronGeometry(0.5 * s, 0);
    g.translate(x, y, z);
    parts.push({ geom: g, color: col, flat: true });
  }
  // Glowing base ring.
  parts.push({ geom: new THREE.TorusGeometry(0.5, 0.04, 8, 20).rotateX(Math.PI / 2).translate(0, 0.05, 0), color: tint(c1, WHITE, 0.5) });
  return parts;
}

function buildMushrooms(p: Palette): SubPart[] {
  const c1 = new THREE.Color(p.decoColor);
  const c2 = new THREE.Color(p.decoColor2);
  const parts: SubPart[] = [];
  // Stem.
  parts.push({ geom: new THREE.CylinderGeometry(0.14, 0.18, 0.7, 10).translate(0, 0.35, 0), color: STEM });
  // Cap (dome).
  parts.push({ geom: new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.7, 0), color: c1 });
  // Cap underside hint.
  parts.push({ geom: new THREE.CircleGeometry(0.55, 16).rotateX(Math.PI / 2).translate(0, 0.7, 0), color: tint(STEM, WHITE, 0.2) });
  // Spots in a contrasting color.
  const spots: Array<[number, number, number]> = [
    [0.2, 1.0, 0.18],
    [-0.22, 1.05, -0.1],
    [0.0, 1.15, -0.25],
    [0.25, 0.85, -0.3],
  ];
  for (const [x, y, z] of spots) {
    parts.push({ geom: new THREE.SphereGeometry(0.09, 8, 6).translate(x, y, z), color: tint(c2, WHITE, 0.3) });
  }
  // A tiny second mushroom for cluster variety.
  parts.push({ geom: new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8).translate(0.6, 0.2, 0.1), color: STEM });
  parts.push({ geom: new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0.6, 0.4, 0.1), color: tint(c1, c2, 0.5) });
  return parts;
}

function buildFlowers(p: Palette): SubPart[] {
  const c1 = new THREE.Color(p.decoColor);
  const c2 = new THREE.Color(p.decoColor2);
  const acc = new THREE.Color(p.accent);
  const parts: SubPart[] = [];
  // Stem.
  parts.push({ geom: new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6).translate(0, 0.4, 0), color: MOSS });
  // Leaves.
  parts.push({ geom: new THREE.ConeGeometry(0.08, 0.25, 5).rotateZ(Math.PI / 2.5).translate(0.12, 0.35, 0), color: tint(MOSS, c2, 0.2) });
  parts.push({ geom: new THREE.ConeGeometry(0.08, 0.25, 5).rotateZ(-Math.PI / 2.5).translate(-0.12, 0.5, 0), color: tint(MOSS, c2, 0.2) });
  // Petals (6) around a center.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push({
      geom: new THREE.ConeGeometry(0.14, 0.4, 6).rotateZ(Math.PI / 2).rotateY(-a).translate(Math.cos(a) * 0.32, 0.85, Math.sin(a) * 0.32),
      color: i % 2 === 0 ? c1 : tint(c1, WHITE, 0.25),
    });
  }
  // Center.
  parts.push({ geom: new THREE.SphereGeometry(0.16, 12, 10).translate(0, 0.85, 0), color: tint(acc, WHITE, 0.3) });
  // A second smaller bud.
  parts.push({ geom: new THREE.SphereGeometry(0.12, 8, 8).translate(0.45, 0.5, 0.2), color: c2 });
  return parts;
}

function buildReeds(p: Palette): SubPart[] {
  const c1 = new THREE.Color(p.decoColor);
  const c2 = new THREE.Color(p.decoColor2);
  const parts: SubPart[] = [];
  const blades: Array<[number, number, number, number, THREE.Color]> = [
    [0, 0.9, 0, 1.8, c1],
    [0.18, 0.7, 0.1, 1.5, tint(c2, WHITE, 0.2)],
    [-0.16, 0.65, -0.08, 1.4, c2],
    [0.1, 0.5, -0.2, 1.2, tint(c1, c2, 0.4)],
  ];
  for (const [x, y, z, h, col] of blades) {
    parts.push({ geom: new THREE.ConeGeometry(0.07, h, 5).translate(x, y, z), color: col });
  }
  // Seed heads (little tufts) at the top of the tallest blade.
  parts.push({ geom: new THREE.SphereGeometry(0.1, 8, 6).translate(0, 1.85, 0), color: tint(c1, WHITE, 0.4) });
  parts.push({ geom: new THREE.SphereGeometry(0.07, 8, 6).translate(0.12, 1.75, 0.05), color: tint(c2, WHITE, 0.4) });
  return parts;
}

function buildCoral(p: Palette): SubPart[] {
  const c1 = new THREE.Color(p.decoColor);
  const c2 = new THREE.Color(p.decoColor2);
  const parts: SubPart[] = [];
  // Branching arms made from cylinders fanned out.
  const arms: Array<[number, number, number]> = [
    [0, 0.9, 0],
    [0.3, 0.7, 0.1],
    [-0.28, 0.75, -0.1],
    [0.15, 0.6, -0.28],
    [-0.12, 0.55, 0.26],
  ];
  for (let i = 0; i < arms.length; i++) {
    const [x, y, z] = arms[i];
    const col = i % 2 === 0 ? c1 : tint(c2, WHITE, 0.2);
    parts.push({ geom: new THREE.CylinderGeometry(0.09, 0.13, y * 2, 8).translate(x, y, z), color: col });
    // Knobby tip.
    parts.push({ geom: new THREE.SphereGeometry(0.14, 10, 8).translate(x, y * 2 + 0.05, z), color: tint(col, WHITE, 0.3) });
  }
  // Base cluster.
  parts.push({ geom: new THREE.SphereGeometry(0.22, 10, 8).translate(0, 0.1, 0), color: tint(c1, c2, 0.5) });
  return parts;
}

function buildRocks(p: Palette): SubPart[] {
  const c1 = new THREE.Color(p.decoColor);
  const c2 = new THREE.Color(p.decoColor2);
  const rock = new THREE.Color(p.biome.rock);
  const parts: SubPart[] = [];
  // Main boulder (toward rock tone for realism).
  parts.push({ geom: new THREE.DodecahedronGeometry(0.7, 0).translate(0, 0.5, 0), color: tint(rock, c1, 0.25), flat: true });
  // Smaller flanking rocks.
  parts.push({ geom: new THREE.DodecahedronGeometry(0.4, 0).translate(0.6, 0.25, 0.15), color: tint(rock, c2, 0.3), flat: true });
  parts.push({ geom: new THREE.DodecahedronGeometry(0.32, 0).translate(-0.5, 0.2, -0.18), color: tint(rock, WHITE, 0.1), flat: true });
  // Moss cap on the big rock.
  parts.push({ geom: new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.95, 0), color: tint(MOSS, c2, 0.3) });
  return parts;
}

const BUILDERS: Record<DecoKind, (p: Palette) => SubPart[]> = {
  trees: buildTrees,
  crystals: buildCrystals,
  mushrooms: buildMushrooms,
  flowers: buildFlowers,
  reeds: buildReeds,
  coral: buildCoral,
  rocks: buildRocks,
};

// Cache merged geometries per (kind + palette name) so we don't rebuild on rerenders.
const geomCache = new Map<string, THREE.BufferGeometry>();

export function clusterGeometry(kind: DecoKind, palette: Palette): THREE.BufferGeometry {
  const key = `${kind}:${palette.name}`;
  let g = geomCache.get(key);
  if (!g) {
    g = mergeParts(BUILDERS[kind](palette));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    geomCache.set(key, g);
  }
  return g;
}

// Approximate collision radius (as a fraction of instance scale) for each kind.
export const SOLID_RADIUS: Partial<Record<DecoKind, number>> = {
  trees: 0.5, // collide with the trunk, not the wide canopy
  crystals: 0.6,
  mushrooms: 0.45,
  coral: 0.55,
  rocks: 0.8,
};
// Soft kinds (flowers, reeds) are pass-through.
export function isSoft(kind: DecoKind): boolean {
  return SOLID_RADIUS[kind] == null;
}

// Per-kind vertical lift so the cluster sits on the surface (its base ~ y=0).
export function liftFor(kind: DecoKind): number {
  switch (kind) {
    case 'trees': return 0.0;
    case 'rocks': return 0.0;
    case 'coral': return 0.0;
    case 'mushrooms': return 0.0;
    case 'crystals': return 0.0;
    case 'flowers': return 0.0;
    case 'reeds': return 0.0;
    default: return 0.0;
  }
}

// Whether the kind reads better with flat shading (faceted).
export function isFlat(kind: DecoKind): boolean {
  return kind === 'crystals' || kind === 'rocks';
}
