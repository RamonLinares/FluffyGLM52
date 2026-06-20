import { useEffect } from 'react';

// Shared, mutable input state read by the player each frame.
// Keyboard and the on-screen joystick both write here.
export const input = {
  x: 0, // strafe: -1 left .. +1 right
  y: 0, // forward: -1 back .. +1 forward
  jump: false,
  _kb: { x: 0, y: 0 },
  _joy: { x: 0, y: 0 },
  _keys: new Set<string>(),
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function recompute(): void {
  input.x = clamp(input._kb.x + input._joy.x, -1, 1);
  input.y = clamp(input._kb.y + input._joy.y, -1, 1);
}

function updateKeyboard(): void {
  const k = input._keys;
  let x = 0;
  let y = 0;
  if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
  if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
  // Normalize diagonals so speed feels consistent.
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.sqrt(2);
    x *= inv;
    y *= inv;
  }
  input._kb.x = x;
  input._kb.y = y;
  recompute();
}

export function setJoystick(x: number, y: number): void {
  input._joy.x = x;
  input._joy.y = y;
  recompute();
}

export function resetInput(): void {
  input._keys.clear();
  input._kb.x = 0;
  input._kb.y = 0;
  input._joy.x = 0;
  input._joy.y = 0;
  input.x = 0;
  input.y = 0;
  input.jump = false;
}

export function useKeyboardControls(): void {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space') input.jump = true;
      input._keys.add(e.code);
      updateKeyboard();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') input.jump = false;
      input._keys.delete(e.code);
      updateKeyboard();
    };
    const blur = () => {
      input._keys.clear();
      updateKeyboard();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
}

// Lightweight tap detector used to trigger a small hop on mobile.
let tapJumpRequested = false;
export function requestTapJump(): void {
  tapJumpRequested = true;
}
export function consumeTapJump(): boolean {
  const v = tapJumpRequested;
  tapJumpRequested = false;
  return v;
}
