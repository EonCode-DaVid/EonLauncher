import { useEffect, useRef, useState } from 'react';

export default function PlayerPreview({ name, uuid }) {
  const host = useRef(null);
  const canvas = useRef(null);
  const [status, setStatus] = useState('loading');
  const validName = /^[A-Za-z0-9_]{3,16}$/.test(name || '');
  const identity = uuid?.replace(/-/g, '') || (validName ? name : 'MHF_Steve');

  useEffect(() => {
    let disposed = false, viewer, observer;
    const controller = new window.AbortController();
    setStatus('loading');
    const timer = setTimeout(async () => {
      let texture;
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const { SkinViewer } = await import('skinview3d');
        if (disposed) return;
        viewer = new SkinViewer({ canvas: canvas.current, width: 260, height: 320, renderPaused: true, pixelRatio: Math.min(window.devicePixelRatio || 1, 2) });
        viewer.controls.enableZoom = false;
        viewer.controls.enablePan = false;
        viewer.controls.enableDamping = false;
        viewer.playerObject.rotation.y = 0.35;
        viewer.controls.addEventListener('change', () => viewer.render());
        observer = new ResizeObserver(([entry]) => {
          viewer.setSize(Math.max(1, entry.contentRect.width), Math.max(1, entry.contentRect.height));
          viewer.render();
        });
        observer.observe(host.current);
        const response = await fetch(`https://minotar.net/skin/${encodeURIComponent(identity)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('skin');
        texture = URL.createObjectURL(await response.blob());
        if (disposed) return;
        await viewer.loadSkin(texture);
        if (disposed) return;
        viewer.render();
        setStatus('ready');
      } catch {
        if (!disposed) setStatus('error');
      } finally {
        clearTimeout(timeout);
        if (texture) URL.revokeObjectURL(texture);
      }
    }, 650);
    return () => { disposed = true; clearTimeout(timer); controller.abort(); observer?.disconnect(); viewer?.dispose(); };
  }, [identity]);

  return <section className="player-preview" aria-label="Podgląd postaci 3D">
    <div className="player-stage" ref={host}>
      <canvas ref={canvas} aria-label={`Model 3D: ${validName ? name : 'Steve'}`} style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }} />
      {status !== 'ready' && <div className="player-placeholder"><i className="fa-solid fa-user" aria-hidden="true"/><span>{status === 'error' ? 'Podgląd chwilowo niedostępny' : 'Wczytywanie postaci…'}</span></div>}
    </div>
    <div className="player-caption"><strong>{validName ? name : 'Twoja postać'}</strong><span>{status === 'ready' ? 'Przeciągnij, aby obrócić' : 'PODGLĄD 3D'}</span></div>
    {!uuid && validName && <small>Skin profilu o tym nicku. W grze offline może być inny.</small>}
  </section>;
}

