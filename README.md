# Fluffy — A Pastel Planet Journey

A relaxed, mobile-first 3D exploration game built with **React**, **Three.js** (via React Three Fiber), and **WebGL**. Roll a fluffy ball across procedurally generated floating planets, gather five gentle quests per world, and get transported to a brand-new planet with its own palette and flora.

## Highlights

- **Procedural floating planets** — seeded noise generates terrain with ridges, valleys, and biome-tinted regions. Each planet is a sphere with its own pastel palette, decorations, rings, and drifting fragments.
- **Fluffy ball character** — rolls around the sphere with radial (Mario-Galaxy-style) gravity, squash-and-stretch breathing, and a soft trailing camera that stays level with the surface.
- **Five quests per planet** — seven imaginative quest types (orbs, bells, lanterns, flowers, shards, wisps, stars), each a unique animated 3D model with a collect-burst VFX.
- **Cross-device journey codes** — progress is saved to `localStorage`, and a short shareable code (`XXX-XXXX-XXX`) lets you resume the exact same planet on any other device.
- **Collision detection** with solid decorations (trees, crystals, rocks, coral, mushrooms).
- **Quest compass** — an on-screen arrow points toward the nearest uncollected quest, even when it's on the far side of the planet.
- **Ethereal anime aesthetic** — ACES tone mapping, bloom, soft shadows, gradient skies with stars, floating sparkles, and a glassmorphic UI.

## Tech stack

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev)
- [Three.js](https://threejs.org) via [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber) and [`@react-three/drei`](https://github.com/pmndrs/drei)
- [`@react-three/postprocessing`](https://github.com/pmndrs/postprocessing) for bloom/vignette
- [Zustand](https://github.com/pmndrs/zustand) for state + localStorage persistence
- [Font Awesome](https://fontawesome.com) for icons

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # preview the production build
npm run typecheck
```

## Controls

- **Desktop:** WASD / arrow keys to roll, Space to hop.
- **Mobile:** on-screen joystick to roll, feather button to hop. (Controls auto-detect via `pointer: coarse`.)

## How it works

- `src/game/planets.ts` — seeded planet generation, 3D noise terrain, biome fields, spherical scatter.
- `src/game/decorations.ts` — procedural multi-part decoration clusters (trees, crystals, mushrooms, etc.).
- `src/game/quests.ts` — quest generation across the sphere.
- `src/game/codec.ts` — encode/decode portable journey codes with a checksum.
- `src/store/gameStore.ts` — Zustand store with localStorage persistence.
- `src/components/` — 3D scene: planet, decorations, player, quests, sky, post-processing.
- `src/ui/` — HUD, compass, code modal, transport overlay, touch controls.

## Acknowledgements

This game was built with [OpenCode](https://opencode.ai) using the **GLM-5.2** model.

## License

Personal project.
