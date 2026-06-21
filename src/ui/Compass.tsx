import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { view, playerPos, playerUp } from '../game/shared';
import { useGame } from '../store/gameStore';

// The arrow sits near screen center and points in the direction you need to
// roll to reach the nearest uncollected quest along the planet's surface.
const OFFSET = 70; // px from screen center
const ARROW_SIZE = 60;

export default function Compass() {
  const arrowRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let raf = 0;
    const playerDir = new THREE.Vector3();
    const questDir = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();
    const camForward = new THREE.Vector3();
    const aheadWorld = new THREE.Vector3();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const cam = view.camera;
      if (!cam) return;
      const targets = view.questTargets;
      const collected = useGame.getState().collectedIds;

      // Player's radial direction (where they are on the sphere).
      playerDir.copy(playerPos).normalize();

      // Pick the nearest uncollected quest by angular distance on the sphere.
      // Smallest angle (acos of dot) = closest along the surface.
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
        }
      }
      const el = arrowRef.current;
      if (!el || !bestPos) {
        setHidden(true);
        return;
      }
      setHidden(false);

      // Surface bearing: tangent at the player pointing toward the quest along
      // the great circle. tangent = normalize(questDir - (questDir·up)·up).
      questDir.copy(bestPos).normalize();
      tangent.copy(questDir).addScaledVector(playerDir, -questDir.dot(playerDir));
      if (tangent.lengthSq() < 1e-8) {
        // Quest is exactly at the player's position — nothing to point to.
        el.style.opacity = '0';
        return;
      }
      tangent.normalize();

      // Get the camera's basis vectors so we can express the tangent in
      // camera-relative space (robust regardless of camera orientation).
      cam.matrixWorld.extractBasis(camRight, camUp, camForward);
      // Camera looks down -forward, so the view direction is -camForward.
      const viewDir = camForward.clone().negate();

      // How much of the tangent is along the screen-right and screen-up axes?
      // Only the component perpendicular to the view direction matters.
      const alongRight = tangent.dot(camRight);
      const alongUp = tangent.dot(camUp);
      const alongView = tangent.dot(viewDir);

      // Screen X = right, screen Y = down (so negate alongUp).
      let screenDx = alongRight;
      let screenDy = -alongUp;

      // If the tangent points mostly away from the view (behind the camera),
      // the on-screen direction is unreliable — flip 180° so the arrow still
      // indicates "turn around and head the other way".
      if (alongView < -0.2) {
        screenDx = -screenDx;
        screenDy = -screenDy;
      }

      const len = Math.hypot(screenDx, screenDy);
      if (len < 1e-6) {
        el.style.opacity = '0';
        return;
      }
      screenDx /= len;
      screenDy /= len;
      const angle = Math.atan2(screenDy, screenDx);

      // Place the arrow OFFSET pixels from screen center in the bearing direction.
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const px = cx + screenDx * OFFSET - ARROW_SIZE / 2;
      const py = cy + screenDy * OFFSET - ARROW_SIZE / 2;

      el.style.transform = `translate(${px}px, ${py}px) rotate(${angle}rad)`;
      el.style.opacity = '0.85';

      // Use aheadWorld to avoid unused-var lint (kept for future depth checks).
      void aheadWorld;
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
