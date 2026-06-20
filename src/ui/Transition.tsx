import { useEffect, useMemo } from 'react';
import { useGame } from '../store/gameStore';
import { generatePlanet } from '../game/planets';

const HOLD_MS = 1500; // white-out moment when the planet swaps

export default function Transition() {
  const phase = useGame((s) => s.phase);
  const seed = useGame((s) => s.seed);
  const pendingSeed = useGame((s) => s.pendingSeed);
  const planetsCompleted = useGame((s) => s.planetsCompleted);
  const finishTransport = useGame((s) => s.finishTransport);

  const fromName = useMemo(
    () => generatePlanet(seed, planetsCompleted).name,
    [seed, planetsCompleted]
  );
  const toName = useMemo(
    () => (pendingSeed != null ? generatePlanet(pendingSeed, planetsCompleted + 1).name : ''),
    [pendingSeed, planetsCompleted]
  );

  useEffect(() => {
    if (phase !== 'transition') return;
    const t = setTimeout(() => finishTransport(), HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, finishTransport]);

  return (
    <div className={`transport-overlay ${phase === 'transition' ? 'active' : ''}`}>
      <div className="transport-card">
        <div className="transport-from">{fromName}</div>
        <div className="transport-arrow">
          <i className="fas fa-wand-magic-sparkles" aria-hidden />
        </div>
        <div className="transport-to">{toName}</div>
        <div className="transport-sub">Transporting to a new world…</div>
      </div>
    </div>
  );
}
