// Encode/decode portable progress codes so a player can resume the same planet
// on another device. The code carries the current planet seed + planets completed,
// plus a checksum to catch typos. Planet progression is a deterministic chain from
// the seed, so sharing the seed alone is enough to land on the same world.

const SEED_LEN = 7; // base36 -> covers full 32-bit uint
const DONE_LEN = 2; // base36 -> up to 1295 planets
const CHK_LEN = 1;

const BASE = 36;

function toBase36(n: number, len: number): string {
  return n.toString(BASE).padStart(len, '0').toLowerCase();
}

function checksum(seed: number, completed: number): number {
  const h = (Math.imul(seed, 31) + completed + 0x9e3779b9) >>> 0;
  return h % BASE;
}

export interface CodedProgress {
  seed: number;
  completed: number;
}

export function encodeProgress(seed: number, completed: number): string {
  const raw =
    toBase36(seed >>> 0, SEED_LEN) +
    toBase36(Math.max(0, Math.min(BASE * BASE - 1, completed)), DONE_LEN) +
    toBase36(checksum(seed, completed), CHK_LEN);
  // Format as XXX-XXXX-XXX for readability.
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 10)}`;
}

export function decodeProgress(code: string): CodedProgress | null {
  const raw = code.replace(/[^0-9a-z]/gi, '').toLowerCase();
  if (raw.length !== SEED_LEN + DONE_LEN + CHK_LEN) return null;
  const seed = parseInt(raw.slice(0, SEED_LEN), BASE);
  const completed = parseInt(raw.slice(SEED_LEN, SEED_LEN + DONE_LEN), BASE);
  const chk = parseInt(raw.slice(SEED_LEN + DONE_LEN), BASE);
  if (Number.isNaN(seed) || Number.isNaN(completed) || Number.isNaN(chk)) return null;
  if (checksum(seed, completed) !== chk) return null;
  return { seed: seed >>> 0, completed };
}

// Deterministic next-planet seed so a shared journey stays consistent across devices.
export function nextSeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
}

// A pleasant starting seed for brand-new players.
export function freshSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 0x1234abcd;
}
