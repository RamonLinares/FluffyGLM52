import { useState } from 'react';
import { useGame } from '../store/gameStore';

interface Props {
  mode: 'show' | 'enter';
  onClose: () => void;
  onEntered?: () => void;
}

export default function CodeModal({ mode, onClose, onEntered }: Props) {
  const exportCode = useGame((s) => s.exportCode);
  const importCode = useGame((s) => s.importCode);
  const [code, setCode] = useState(mode === 'show' ? exportCode() : '');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Copy failed — select and copy manually.');
    }
  };

  const submit = () => {
    const ok = importCode(code);
    if (ok) {
      onEntered?.();
      onClose();
    } else {
      setError('That code looks off. Check the dashes and try again.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Close">
          <i className="fas fa-xmark" />
        </button>

        {mode === 'show' ? (
          <>
            <h2>
              <i className="fas fa-share-nodes" aria-hidden /> Your Journey Code
            </h2>
            <p className="modal-sub">
              Save this code. Enter it on any other device to carry on from this exact planet.
            </p>
            <div className="code-box">{code}</div>
            <div className="modal-actions">
              <button className="pill primary" onClick={copy}>
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} aria-hidden />
                {copied ? 'Copied!' : 'Copy code'}
              </button>
              <button className="pill" onClick={onClose}>
                Back to play
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>
              <i className="fas fa-arrow-right-to-bracket" aria-hidden /> Enter a Journey Code
            </h2>
            <p className="modal-sub">Resume a friend’s planet — or your own on another device.</p>
            <input
              className="code-input"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              placeholder="XXX-XXXX-XXX"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />
            {error && <div className="modal-error">{error}</div>}
            <div className="modal-actions">
              <button className="pill primary" onClick={submit}>
                <i className="fas fa-wand-magic-sparkles" aria-hidden /> Travel there
              </button>
              <button className="pill" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
