import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { view, playerPos, playerUp, setCompassTargetId } from '../game/shared';
import { useGame } from '../store/gameStore';

const OFFSET = 70;
const ARROW_SIZE = 60;
const STEP = 3;

export default function Compass() {
  const arrowRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let raf = 0;
    const playerDir = new THREE.Vector3();
    const questDir = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const playerScreen = new THREE.Vector3();
    const aheadWorld = new THREE.Vector3();
    const aheadScreen = new THREE.Vector3();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const cam = view.camera;
      if (!cam) return;
      const targets = view.questTargets;
      const collected = useGame.getState().collectedIds;

      playerDir.copy(playerPos).normalize();

      // Nearest uncollected quest by angular distance on the sphere.
      let bestId: number | null = null;
      let bestPos: THREE.Vector3 | null = null;
      let bestAngle = Infinity;
      for (const t of targets) {
        if (collected.includes(t.id)) continue;
        questDir.copy(t.pos).normalize();
        const d = THREE.MathUtils.clamp(playerDir.dot(questDir), -1, 1);
        const ang = Math.acos(d);
        if (ang < bestAngle) {
          bestAngle = ang;
          bestPos = t.pos;
          bestId = t.id;
        }
      }

      setCompassTargetId(bestId);

      const el = arrowRef.current;
      if (!el || !bestPos) {
        setHidden(true);
        if (el) el.style.opacity = '';
        return;
      }
      setHidden(false);

      // Surface bearing: tangent at the player toward the quest.
      questDir.copy(bestPos).normalize();
      tangent.copy(questDir).addScaledVector(playerDir, -questDir.dot(playerDir));
      if (tangent.lengthSq() < 1e-8) {
        el.style.opacity = '0';
        return;
      }
      tangent.normalize();

      // Project the player and a point a small step along the tangent.
      playerScreen.copy(playerPos).project(cam);
      aheadWorld.copy(playerPos).addScaledVector(tangent, STEP);
      aheadScreen.copy(aheadWorld).project(cam);

      let dx = aheadScreen.x - playerScreen.x;
      let dy = aheadScreen.y - playerScreen.y;

      // If the ahead point is behind the camera (NDC z > 1), the projection
      // mirrors through the center — negate to get the true bearing direction.
      if (aheadScreen.z > 1) {
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

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const px = cx + screenDx * OFFSET - ARROW_SIZE / 2;
      const py = cy + screenDy * OFFSET - ARROW_SIZE / 2;

      el.style.transform = `translate(${px}px, ${py}px) rotate(${angle}rad)`;
      el.style.opacity = '0.85';
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      setCompassTargetId(null);
    };
  }, []);

  return (
    <div ref={arrowRef} className={`compass ${hidden ? 'hidden' : ''}`} aria-hidden>
      <div className="compass-arrow">
        <i className="fas fa-location-arrow" />
      </div>
    </div>
  );
}
