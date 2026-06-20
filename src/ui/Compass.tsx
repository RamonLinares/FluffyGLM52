import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { view } from '../game/shared';
import { useGame } from '../store/gameStore';

// Margin from the screen edge for the clamped arrow.
const MARGIN = 84;

export default function Compass() {
  const arrowRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let raf = 0;
    const tmp = new THREE.Vector3();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const cam = view.camera;
      if (!cam) return;
      const targets = view.questTargets;
      const collected = useGame.getState().collectedIds;

      // Nearest uncollected target by 3D distance to the camera.
      let best: { pos: THREE.Vector3; dist: number } | null = null;
      for (const t of targets) {
        if (collected.includes(t.id)) continue;
        tmp.copy(t.pos).sub(cam.position);
        const d = tmp.length();
        if (!best || d < best.dist) best = { pos: t.pos, dist: d };
      }
      const el = arrowRef.current;
      if (!el) return;
      if (!best) {
        setHidden(true);
        return;
      }
      setHidden(false);

      // Project the quest world position to normalized device coords.
      tmp.copy(best.pos).project(cam);
      const inFront = tmp.z < 1 && tmp.z > -1;
      let x = tmp.x;
      let y = tmp.y;
      if (!inFront) {
        // Behind the camera: flip so the arrow points toward where it will reappear.
        x = -x;
        y = -y;
      }
      // Clamp to a rounded margin rectangle.
      const ax = Math.abs(x);
      const ay = Math.abs(y);
      if (ax > 1 || ay > 1) {
        const sx = ax > 0 ? (ax - 1) : 0;
        const sy = ay > 0 ? (ay - 1) : 0;
        if (sx * (window.innerHeight - 2 * MARGIN) > sy * (window.innerWidth - 2 * MARGIN)) {
          x = Math.sign(x);
          y = y / ax;
        } else {
          y = Math.sign(y);
          x = x / ay;
        }
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      const sx = (x * 0.5 + 0.5) * w;
      const sy = (-y * 0.5 + 0.5) * h;
      const cx = w / 2;
      const cy = h / 2;
      const dx = sx - cx;
      const dy = sy - cy;
      const angle = Math.atan2(dy, dx);
      // Clamp position inside the margin.
      const halfW = w / 2 - MARGIN;
      const halfH = h / 2 - MARGIN;
      let px = dx;
      let py = dy;
      const mag = Math.hypot(px, py);
      if (mag > 0) {
        // Scale into an ellipse with halfW/halfH radii along the direction.
        const ux = px / mag;
        const uy = py / mag;
        const reach = Math.min(
          Math.abs(halfW / ux) || Infinity,
          Math.abs(halfH / uy) || Infinity
        );
        const r = Math.min(mag, reach);
        px = ux * r;
        py = uy * r;
      }
      el.style.transform = `translate(${cx + px - 30}px, ${cy + py - 30}px) rotate(${angle}rad)`;
      el.style.opacity = inFront ? '0.55' : '1';
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
