import * as THREE from 'three';

// Cross-component shared state (read every frame, no React re-render needed).
export const playerPos = new THREE.Vector3(0, 34, 0);
export const playerUp = new THREE.Vector3(0, 1, 0);
export const playerForward = new THREE.Vector3(0, 0, 1);
export const playerVel = new THREE.Vector3();

// Camera + quest target registry, read by the DOM-side compass each frame.
export interface QuestTarget {
  id: number;
  pos: THREE.Vector3;
}
export const view: { camera: THREE.Camera | null; questTargets: QuestTarget[] } = {
  camera: null,
  questTargets: [],
};
export function setCamera(c: THREE.Camera | null): void {
  view.camera = c;
}
export function setQuestTargets(ts: QuestTarget[]): void {
  view.questTargets = ts;
}

// The quest ID the compass is currently pointing at, written by the compass
// each frame and read by the HUD to highlight the active quest.
export let compassTargetId: number | null = null;
export function setCompassTargetId(id: number | null): void {
  compassTargetId = id;
}

// Static collider registry for fixed world elements (decorations).
// Decorations publish their spheres here; the Player resolves against them
// each frame. Positions are in world space and stay static (decorations are
// siblings of the rotating planet group).
export interface Collider {
  pos: THREE.Vector3;
  radius: number;
}
let colliderItems: Collider[] = [];
export function setColliders(items: Collider[]): void {
  colliderItems = items;
}
export function getColliders(): Collider[] {
  return colliderItems;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
