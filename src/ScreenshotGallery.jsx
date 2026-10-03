import { useEffect, useRef, useState } from 'react';

export default function ScreenshotGallery({ instances, onWallpaper }) {
  const [selected,setSelected]=useState(null),[full,setFull]=useState(''),[zoom,setZoom]=useState(1),[previewError,setPreviewError]=useState(''),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
  const preview=useRef(null);
  const [filter, setFilter] = useState(''), [items, setItems] = useState([]), [thumbs, setThumbs] = useState({});
  const [page, setPage] = useState(0), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(()=>{const reset=e=>{if(e.detail==='gallery'){setFilter('');setPage(0);setSelected(null);}};window.addEventListener('eon-section-reset',reset);return()=>window.removeEventListener('eon-section-reset',reset);},[]);
  useEffect(() => {
    let alive = true;
    setBusy(true); setError(''); setPage(0);
    const load = async () => {
      try {
        const lists = await Promise.all(instances.filter(i=>!filter || i.name===filter).map(async i => (await window.ferro?.shots({instanceName:i.name}) || []).map(s=>({...s,instance:i.name,key:i.name+'/'+s.file}))));
        if(alive) setItems(lists.flat().sort((a,b)=>b.mtime-a.mtime));
      } catch(e) { if(alive) setError(e.message); }
      finally { if(alive) setBusy(false); }
    };
    load(); return ()=>{alive=false;};
  }, [instances, filter, revision]);
  useEffect(() => {
    let alive = true;
    setThumbs({});
    items.slice(page*12,page*12+12).forEach(async s=>{
      try { const image=await window.ferro.shotThumb({instanceName:s.instance,file:s.file}); if(alive) setThumbs(t=>({...t,[s.key]:image.dataUrl})); }
      catch { if(alive) setThumbs(t=>({...t,[s.key]:null})); }
    });
    return ()=>{alive=false;};
  },[items,page]);
  const shot=items.find(s=>s.key===selected);
  const position=items.findIndex(s=>s.key===selected);
  useEffect(()=>{
    let alive=true;setFull('');setZoom(1);setPreviewError('');setNotice('');
    if(shot)window.ferro.shotImage({instanceName:shot.instance,file:shot.file}).then(result=>{if(alive)setFull(result.dataUrl);}).catch(e=>{if(alive)setPreviewError(e.message);});
    return()=>{alive=false;};
  },[shot]);
  useEffect(()=>{
    if(!selected)return;
    const previous=document.activeElement;preview.current?.focus();
    return()=>previous?.focus();
  },[selected]);
  const move=delta=>{if(!saving&&items[position+delta])setSelected(items[position+delta].key);};
  const wallpaper=async()=>{
    setSaving(true);setPreviewError('');
    try{const result=await window.ferro.shotWallpaper({instanceName:shot.instance,file:shot.file});onWallpaper(result.dataUrl);setNotice('Ustawiono jako tło launchera.');}
    catch(e){setPreviewError(e.message);}finally{setSaving(false);}
  };
  const open=s=>setSelected(s.key);
  return <section className="screenshots-page">
    <div className="section-heading"><div><span className="eon-eyebrow">TWOJE WSPOMNIENIA</span><h1>Galeria zrzutów</h1><p>Zrzuty wykonane klawiszem F2 w Minecraft.</p></div><button className="ghost" disabled={busy} onClick={()=>setRevision(r=>r+1)}>Odśwież</button></div>
    <div className="gallery-toolbar"><select aria-label="Filtr profilu" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Wszystkie profile</option>{instances.map(i=><option key={i.name}>{i.name}</option>)}</select><span>{items.length} zrzutów</span></div>
    {error&&<p role="alert" className="eon-error eon-notice">{error}</p>}
    {busy?<p>Wczytywanie galerii…</p>:!items.length?<div className="card gallery-empty"><i className="fa-regular fa-images"/><h2>Tu pojawią się Twoje przygody</h2><p>Zrób pierwszy zrzut w grze i odśwież galerię.</p></div>:<div className="screenshot-grid">{items.slice(page*12,page*12+12).map(s=><button className="screenshot-tile" key={s.key} onClick={()=>open(s)} title="Otwórz pełny obraz">{thumbs[s.key]?<img src={thumbs[s.key]} alt={s.file}/>:<div className="shot-placeholder">{thumbs[s.key]===null?'Podgląd niedostępny':'Wczytywanie…'}</div>}<span><strong>{s.instance}</strong><small>{new Date(s.mtime).toLocaleString('pl-PL')}</small></span></button>)}</div>}
    {items.length>12&&<div className="gallery-pages"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>Poprzednia</button><span>{page+1} / {Math.ceil(items.length/12)}</span><button disabled={(page+1)*12>=items.length} onClick={()=>setPage(p=>p+1)}>Następna</button></div>}
    {shot&&<div className="workspace-overlay"><div ref={preview} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Podgląd zrzutu ekranu" className="shot-viewer" onKeyDown={e=>{
      if(e.key==='Escape'){e.stopPropagation();if(!saving)setSelected(null);}
      if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1);
      if(e.key==='Tab'){const nodes=[...preview.current.querySelectorAll('button:not(:disabled)')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    }}><header><div><strong>{shot.instance}</strong><small>{shot.file} · {position+1} / {items.length}</small></div><button disabled={saving} onClick={()=>setSelected(null)} aria-label="Zamknij podgląd">✕</button></header><div className="shot-canvas">{full?<img src={full} alt={shot.file} style={{width:`${zoom*100}%`,maxWidth:'none'}}/>:<p>{previewError||'Wczytywanie obrazu…'}</p>}</div><footer><button disabled={saving||position===0} onClick={()=>move(-1)} aria-label="Poprzedni zrzut">←</button><button disabled={saving||position===items.length-1} onClick={()=>move(1)} aria-label="Następny zrzut">→</button><button disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.25))} aria-label="Pomniejsz">−</button><button onClick={()=>setZoom(1)}>{Math.round(zoom*100)}%</button><button disabled={zoom>=3} onClick={()=>setZoom(z=>Math.min(3,z+.25))} aria-label="Powiększ">+</button><button className="primary" disabled={!full||saving} onClick={wallpaper}>{saving?'Zapisywanie…':'Ustaw jako tło'}</button></footer>{(previewError||notice)&&<p role="status" className="shot-notice">{previewError||notice}</p>}</div></div>}
  </section>;
}
