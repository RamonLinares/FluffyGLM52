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

export default function Controls() {
  const isTouch = useIsTouch();
  const layerRef = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null);

  if (!isTouch) {
    return (
      <div className="desktop-hint">
        <i className="fas fa-keyboard" aria-hidden /> &nbsp;WASD / Arrows to roll · Space to hop
      </div>
    );
  }

  const update = (clientX: number, clientY: number) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const maxR = Math.min(window.innerWidth, window.innerHeight) * 0.42;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      setJoystick((dx / dist), -(dy / dist));
    } else {
      setJoystick(dx / maxR, -(dy / maxR));
    }
  };

  const onDown = (e: React.PointerEvent) => {
    active.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    update(e.clientX, e.clientY);
    setMarker({ x: e.clientX, y: e.clientY });
  };
  const onMove = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId) return;
    update(e.clientX, e.clientY);
    setMarker({ x: e.clientX, y: e.clientY });
  };
  const onUp = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId) return;
    active.current = null;
    setJoystick(0, 0);
    setMarker(null);
  };

  return (
    <>
      <div
        ref={layerRef}
        className="touch-layer"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      {marker && <div className="touch-marker" style={{ left: marker.x, top: marker.y }} />}
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
