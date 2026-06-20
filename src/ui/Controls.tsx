import { useEffect, useRef, useState } from 'react';
import { setJoystick, requestTapJump } from '../hooks/useControls';

function useIsTouch(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setTouch(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return touch;
}

const BASE = 132;
const KNOB = 58;
const MAX = (BASE - KNOB) / 2;

export default function Controls() {
  const isTouch = useIsTouch();
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);

  if (!isTouch) {
    return (
      <div className="desktop-hint">
        <i className="fas fa-keyboard" aria-hidden /> &nbsp;WASD / Arrows to roll · Space to hop
      </div>
    );
  }

  const onDown = (e: React.PointerEvent) => {
    active.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    move(e);
  };
  const move = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId) return;
    const el = baseRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX) {
      dx = (dx / dist) * MAX;
      dy = (dy / dist) * MAX;
    }
    setKnob({ x: dx, y: dy });
    setJoystick(dx / MAX, -dy / MAX);
  };
  const onUp = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId) return;
    active.current = null;
    setKnob({ x: 0, y: 0 });
    setJoystick(0, 0);
  };

  return (
    <>
      <div
        ref={baseRef}
        className="joystick-base"
        onPointerDown={onDown}
        onPointerMove={move}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ width: BASE, height: BASE }}
      >
        <div
          className="joystick-knob"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)`, width: KNOB, height: KNOB }}
        />
      </div>
      <button
        className="jump-btn"
        aria-label="Hop"
        onPointerDown={(e) => {
          e.preventDefault();
          requestTapJump();
        }}
      >
        <i className="fas fa-feather" aria-hidden />
      </button>
    </>
  );
}
