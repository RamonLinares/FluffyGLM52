import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { decodeProgress, encodeProgress, freshSeed, nextSeed } from '../game/codec';
import { generatePlanet, type PlanetConfig } from '../game/planets';
import { generateQuests, type Quest } from '../game/quests';

const QUESTS_PER_PLANET = 5;

export type Phase = 'play' | 'transition';

interface GameState {
  seed: number;
  planetsCompleted: number;
  collectedIds: number[];
  phase: Phase;
  pendingSeed: number | null;
  collect: (id: number) => void;
  beginTransport: () => void;
  finishTransport: () => void;
  importCode: (code: string) => boolean;
  exportCode: () => string;
  reset: () => void;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      seed: freshSeed(),
      planetsCompleted: 0,
      collectedIds: [],
      phase: 'play',
      pendingSeed: null,

      collect: (id) => {
        const state = get();
        if (state.collectedIds.includes(id)) return;
        if (state.phase !== 'play') return;
        set({ collectedIds: [...state.collectedIds, id] });
      },

      beginTransport: () => {
        const state = get();
        if (state.phase !== 'play') return;
        set({ phase: 'transition', pendingSeed: nextSeed(state.seed) });
      },

      finishTransport: () => {
        const state = get();
        if (state.phase !== 'transition' || state.pendingSeed == null) return;
        set({
          seed: state.pendingSeed,
          planetsCompleted: state.planetsCompleted + 1,
          collectedIds: [],
          phase: 'play',
          pendingSeed: null,
        });
      },

      importCode: (code) => {
        const decoded = decodeProgress(code);
        if (!decoded) return false;
        set({
          seed: decoded.seed,
          planetsCompleted: decoded.completed,
          collectedIds: [],
          phase: 'play',
          pendingSeed: null,
        });
        return true;
      },

      exportCode: () => encodeProgress(get().seed, get().planetsCompleted),

      reset: () =>
        set({
          seed: freshSeed(),
          planetsCompleted: 0,
          collectedIds: [],
          phase: 'play',
          pendingSeed: null,
        }),
    }),
    {
      name: 'fluffy-hlm52-progress',
      version: 1,
      partialize: (s) => ({
        seed: s.seed,
        planetsCompleted: s.planetsCompleted,
        collectedIds: s.collectedIds,
      }),
    }
  )
);

export const QUESTS_PER_PLANET_COUNT = QUESTS_PER_PLANET;

// Memoized planet config per (seed, index).
const planetCache = new Map<string, PlanetConfig>();
export function usePlanet(): PlanetConfig {
  const seed = useGame((s) => s.seed);
  const planetsCompleted = useGame((s) => s.planetsCompleted);
  const key = `${seed}:${planetsCompleted}`;
  let p = planetCache.get(key);
  if (!p) {
    p = generatePlanet(seed, planetsCompleted);
    planetCache.set(key, p);
  }
  return p;
}

// Stable base quests (memoized by seed only — no collected field, no per-render
// object rebuilding). Markers subscribe to their own collected state instead,
// so collecting one quest re-renders only that single marker.
const questCache = new Map<number, Quest[]>();
export function useQuests(): Quest[] {
  const seed = useGame((s) => s.seed);
  let base = questCache.get(seed);
  if (!base) {
    const planet = generatePlanet(seed, useGame.getState().planetsCompleted);
    base = generateQuests(planet);
    questCache.set(seed, base);
  }
  return base;
}

// Boolean selector: all quests collected? Only flips once per planet.
export function useAllCollected(): boolean {
  return useGame((s) => s.collectedIds.length >= QUESTS_PER_PLANET);
}
