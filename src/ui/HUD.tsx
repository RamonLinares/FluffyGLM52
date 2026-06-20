import { useGame, usePlanet, useQuests } from '../store/gameStore';

const KIND_ICON: Record<string, string> = {
  orb: 'fa-circle-dot',
  bell: 'fa-bell',
  lantern: 'fa-lightbulb',
  flower: 'fa-spa',
  shard: 'fa-gem',
  wisp: 'fa-wind',
  star: 'fa-star',
};

interface Props {
  onShowCode: () => void;
  onEnterCode: () => void;
}

export default function HUD({ onShowCode, onEnterCode }: Props) {
  const planet = usePlanet();
  const quests = useQuests();
  const planetsCompleted = useGame((s) => s.planetsCompleted);
  const collectedIds = useGame((s) => s.collectedIds);
  const isCollected = (id: number) => collectedIds.includes(id);
  const collectedCount = quests.filter((q) => isCollected(q.id)).length;

  return (
    <>
      <div className="hud-top">
        <div className="planet-card">
          <div className="planet-idx">Planet {planetsCompleted + 1}</div>
          <div className="planet-name">{planet.name}</div>
          <div className="planet-pal">
            <span className="pal-dot" style={{ background: planet.palette.accent }} />
            {planet.palette.name}
          </div>
        </div>
        <div className="hud-actions">
          <button className="pill" onClick={onShowCode} title="Get your journey code">
            <i className="fas fa-share-nodes" aria-hidden /> Code
          </button>
          <button className="pill" onClick={onEnterCode} title="Enter a journey code">
            <i className="fas fa-arrow-right-to-bracket" aria-hidden /> Enter
          </button>
        </div>
      </div>

      <div className="hud-quests">
        <div className="quests-head">
          <span className="quests-title">Quests</span>
          <span className="quests-count">{collectedCount}/5</span>
        </div>
        <ul className="quest-list">
          {quests.map((q) => {
            const done = isCollected(q.id);
            return (
              <li key={q.id} className={done ? 'quest done' : 'quest'}>
                <span className="quest-icon" style={{ background: done ? undefined : q.color }}>
                  <i className={`fas ${KIND_ICON[q.kind] ?? 'fa-star'}`} aria-hidden />
                </span>
                <span className="quest-name">{q.name}</span>
                <span className="quest-state">
                  <i className={`fas ${done ? 'fa-check' : 'fa-circle'}`} aria-hidden />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
