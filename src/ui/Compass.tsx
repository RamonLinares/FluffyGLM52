import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { view, playerPos, playerUp } from '../game/shared';
import { useGame } from '../store/gameStore';

// The arrow sits near screen center (where the player appears) and points in
// the direction you need to roll to reach the nearest quest.
const OFFSET = 70; // px from screen center
const ARROW_SIZE = 60;

export default function Compass() {
  const arrowRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let raf = 0;
    const playerScreen = new THREE.Vector3();
    const aheadWorld = new THREE.Vector3();
    const aheadScreen = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const toQuest = new THREE.Vector3();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const cam = view.camera;
      if (!cam) return;
      const targets = view.questTargets;
      const collected = useGame.getState().collectedIds;

      // Find nearest uncollected quest by surface distance (angular distance
      // from the player's radial direction to the quest's radial direction).
      let best: THREE.Vector3 | null = null;
      let bestDot = -2;
      const playerDir = playerUp; // = normalize(playerPos), the radial direction
      for (const t of targets) {
        if (collected.includes(t.id)) continue;
        toQuest.copy(t.pos).normalize();
        const dot = toQuest.dot(playerDir);
        if (dot > bestDot) {
          bestDot = dot;
          best = t.pos;
        }
      }
      const el = arrowRef.current;
      if (!el || !best) {
        setHidden(true);
        return;
      }
      setHidden(false);

      // Surface bearing: tangent direction at the player's position toward the
      // quest. This is the direction to roll along the great circle to get there.
      // tangent = normalize(questPos - (questPos · up) * up)
      toQuest.copy(best).normalize();
      tangent.copy(toQuest).addScaledVector(playerDir, -toQuest.dot(playerDir));
      if (tangent.lengthSq() < 1e-8) {
        // Quest is directly above/below; pick the player's forward as fallback.
        tangent.set(0, 0, 1);
      }
      tangent.normalize();

      // Project the player position and a point slightly ahead in the tangent
      // direction to get the screen-space bearing.
      playerScreen.copy(playerPos).project(cam);
      aheadWorld.copy(playerPos).addScaledVector(tangent, 3);
      aheadScreen.copy(aheadWorld).project(cam);

      // Screen-space direction from player to the ahead point.
      let dx = aheadScreen.x - playerScreen.x;
      let dy = aheadScreen.y - playerScreen.y;

      // If the ahead point is behind the camera (z > 1), the projection flips.
      // Detect this and flip the direction so the arrow still points the right way.
      if (aheadScreen.z > 1 || playerScreen.z > 1) {
        dx = -dx;
        dy = -dy;
      }

      const len = Math.hypot(dx, dy);
      if (len < 1e-6) {
        el.style.opacity = '0';
        return;
      }
      dx /= len;
      dy /= len;

      // Screen Y is flipped (NDC y-up vs screen y-down).
      const screenDx = dx;
      const screenDy = -dy;
      const angle = Math.atan2(screenDy, screenDx);

      // Place the arrow OFFSET pixels from screen center in the bearing direction.
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const px = cx + screenDx * OFFSET - ARROW_SIZE / 2;
      const py = cy + screenDy * OFFSET - ARROW_SIZE / 2;

      el.style.transform = `translate(${px}px, ${py}px) rotate(${angle}rad)`;
      // Fade based on how close the quest is to being directly ahead on screen.
      el.style.opacity = '0.85';
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={arrowRef} className={`compass ${hidden ? 'hidden' : ''}`} aria-hidden>
      <div className="compass-arrow">
        <i className="fas fa-location-arrow" />
      </div>
    </div>
  );
}
