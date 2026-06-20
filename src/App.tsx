import { useEffect, useState } from 'react';
import Scene from './components/Scene';
import HUD from './ui/HUD';
import Controls from './ui/Controls';
import CodeModal from './ui/CodeModal';
import Transition from './ui/Transition';
import Compass from './ui/Compass';
import { useKeyboardControls } from './hooks/useControls';

type ModalState = { open: boolean; mode: 'show' | 'enter' };

export default function App() {
  useKeyboardControls();
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'show' });
  const [welcome, setWelcome] = useState(true);

  // Prevent the page from scrolling / bouncing on mobile while playing.
  useEffect(() => {
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.body.addEventListener('touchmove', prevent, { passive: false });
    return () => document.body.removeEventListener('touchmove', prevent);
  }, []);

  return (
    <div className="app">
      <Scene />
      <HUD onShowCode={() => setModal({ open: true, mode: 'show' })} onEnterCode={() => setModal({ open: true, mode: 'enter' })} />
      <Controls />
      <Compass />
      <Transition />

      {modal.open && (
        <CodeModal
          mode={modal.mode}
          onClose={() => setModal({ open: false, mode: modal.mode })}
          onEntered={() => setWelcome(false)}
        />
      )}

      {welcome && <Welcome onBegin={() => setWelcome(false)} />}
    </div>
  );
}

function Welcome({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-logo">
          <i className="fas fa-circle" aria-hidden />
        </div>
        <h1>Fluffy</h1>
        <p className="welcome-tag">A pastel journey across gentle worlds.</p>
        <ul className="welcome-rules">
          <li>
            <i className="fas fa-circle-dot" aria-hidden /> Roll your fluffy ball across a procedural planet.
          </li>
          <li>
            <i className="fas fa-list-check" aria-hidden /> Gather five gentle quests to travel to a new world.
          </li>
          <li>
            <i className="fas fa-share-nodes" aria-hidden /> Save your journey code to resume on any device.
          </li>
        </ul>
        <button className="pill primary lg" onClick={onBegin}>
          <i className="fas fa-wand-magic-sparkles" aria-hidden /> Begin rolling
        </button>
      </div>
    </div>
  );
}
