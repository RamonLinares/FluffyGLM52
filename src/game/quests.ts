import { generatePlanet, getNoise3D, heightOnSphere, scatterOnSphere, type PlanetConfig } from './planets';
import { makeRng, pick, shuffle } from './rng';

export type QuestKind = 'orb' | 'bell' | 'lantern' | 'flower' | 'shard' | 'wisp' | 'star';

export interface Quest {
  id: number;
  name: string;
  kind: QuestKind;
  dir: [number, number, number]; // unit surface direction
  height: number; // terrain height at this point
  color: string;
  color2: string;
}

const QUEST_VERBS: Record<QuestKind, string[]> = {
  orb: ['Gather the Starpetal Orb', 'Collect the Moonbloom Core', 'Find the Lost Lightseed'],
  bell: ['Soothe the Drifting Bell', 'Wake the Sleeping Echo', 'Ring the Meadow Chime'],
  lantern: ['Light the Wandering Lantern', 'Kindle the Soft Flame', 'Guide the Pale Lantern'],
  flower: ['Befriend the Meadow Spirit', 'Tend the Pastel Bloom', 'Comfort the Singing Bloom'],
  shard: ['Retrieve the Pastel Shard', 'Mend the Broken Prism', 'Catch the Floating Song'],
  wisp: ['Follow the Wandering Wisp', 'Cradle the Fading Wisp', 'Release the Silver Wisp'],
  star: ['Catch the Falling Star', 'Claim the Drifting Star', 'Wish upon the Wandering Star'],
};

const KINDS: QuestKind[] = ['orb', 'bell', 'lantern', 'flower', 'shard', 'wisp', 'star'];

const QUEST_COLORS = [
  '#ffd1e8', '#cdf7df', '#e0d6ff', '#ffd9c6', '#cdeeff',
  '#ffe9bd', '#ffd8e2', '#d4dbff', '#ffc2a0', '#b6f0d4',
];
const QUEST_COLORS2 = [
  '#ff9ecb', '#7fe7b0', '#b39cff', '#ffb088', '#7cd6ff',
  '#ffd06a', '#ff9fb6', '#9aa8ff', '#ff8f6a', '#5fd9a8',
];

export function generateQuests(planet: PlanetConfig): Quest[] {
  const rng = makeRng(planet.seed ^ 0x85ebca6b);
  const dirs = scatterOnSphere(rng, 5, 0.85); // ~49° apart
  const kinds = shuffle(rng, KINDS).slice(0, dirs.length);
  const colorOrder = shuffle(rng, QUEST_COLORS);
  const color2Order = shuffle(rng, QUEST_COLORS2);

  return dirs.map((d, i) => {
    const kind = kinds[i] ?? pick(rng, KINDS);
    const verb = pick(rng, QUEST_VERBS[kind]);
    const height = heightOnSphere(planet, getNoise3D(planet.seed), d[0], d[1], d[2]);
    return {
      id: i,
      name: verb,
      kind,
      dir: d,
      height,
      color: colorOrder[i % colorOrder.length],
      color2: color2Order[i % color2Order.length],
    };
  });
}

export function planetSummary(seed: number, index: number) {
  const planet = generatePlanet(seed, index);
  return { name: planet.name, palette: planet.palette.name };
}
