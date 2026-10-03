import {useEffect, useRef, useState} from 'react';

export default function ServerFileEditor({server, onClose}) {
  useEffect(()=>{window.dispatchEvent(new CustomEvent('eon-editor-active',{detail:true}));return()=>window.dispatchEvent(new CustomEvent('eon-editor-active',{detail:false}));},[]);
  const [folder,setFolder]=useState(''), [entries,setEntries]=useState([]), [file,setFile]=useState('');
  const [document,setDocument]=useState(null), [content,setContent]=useState(''), [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const input=useRef(null), gutter=useRef(null), dialog=useRef(null);
  const dirty=!!document && content!==document.content;
  const syncLines=()=>{if(gutter.current&&input.current)gutter.current.style.transform=`translateY(${-input.current.scrollTop}px)`;};
  useEffect(()=>{if(input.current){input.current.scrollTop=0;input.current.scrollLeft=0;}syncLines();},[file]);
  useEffect(()=>{syncLines();},[content]);
  const api=(action,extra={})=>server.instance?window.ferro.instanceFiles({instanceName:server.name,action,...extra}):window.eon.devFiles({id:server.id,action,...extra});
  useEffect(()=>{
    let alive=true;
    const request=server.instance?window.ferro.instanceFiles({instanceName:server.name,action:'list',file:folder}):window.eon.devFiles({id:server.id,action:'list',file:folder});
    request.then(list=>{if(alive)setEntries(list);}).catch(e=>{if(alive)setMessage(e.message);});
    return()=>{alive=false;};
  },[folder,server.id,server.instance,server.name]);
  useEffect(()=>{
    const previous=window.document.activeElement; dialog.current?.focus();
    return()=>previous?.focus();
  },[]);
  useEffect(()=>{
    if(!dirty)return;
    const guard=e=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
  },[dirty]);
  const discard=()=>!dirty||window.confirm('Odrzucić niezapisane zmiany?');
  const open=async path=>{
    if(busy||!discard())return;
    setBusy(true);setMessage('');
    try { const doc=await api('read',{file:path});setFile(path);setDocument(doc);setContent(doc.content); }
    catch(e){setMessage(e.message);}finally{setBusy(false);}
  };
  const save=async()=>{
    if(busy||!dirty||document.readonly)return;
    setBusy(true);setMessage('');
    try {const doc=await api('write',{file,content,revision:document.revision});setDocument(doc);setContent(doc.content);setMessage('Zapisano. Kopia poprzedniej wersji: folder .eon-editor.');}
    catch(e){setMessage(e.message);}finally{setBusy(false);}
  };
  const close=()=>{if(!busy&&discard())onClose();};
  return <div className="workspace-overlay"><div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Edytor plików" className="file-workspace" onKeyDown={e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}
    if(e.key==='Escape'){e.stopPropagation();close();}
    if(e.key==='Tab'&&e.target!==input.current){const nodes=[...dialog.current.querySelectorAll('button:not(:disabled), textarea:not(:disabled)')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&window.document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&window.document.activeElement===last){e.preventDefault();first?.focus();}}
  }}>
    <header><div><strong>Edytor plików</strong><small>{server.name}</small></div><button disabled={busy} onClick={close} aria-label="Zamknij edytor">✕</button></header>
    <div className="file-workspace-body"><aside><div className="file-explorer-heading">{server.instance?'PLIKI PROFILU':'PLIKI SERWERA'}</div><button disabled={!folder} onClick={()=>setFolder(folder.split('/').slice(0,-1).join('/'))}>↑ Folder nadrzędny</button><small className="file-breadcrumb">/{folder}</small>{entries.map(entry=><button key={entry.path} disabled={busy} className={file===entry.path?'selected':''} title={entry.name} onClick={()=>entry.directory?setFolder(entry.path):open(entry.path)}><i className={'fa-solid fa-'+(entry.directory?'folder':'file-lines')}/> {entry.name}</button>)}</aside>
    <main><div className="editor-toolbar"><span title={file}>{file||'Wybierz plik'}{dirty?' ●':''}</span><button disabled={!file||busy} onClick={()=>open(file)}>Wczytaj ponownie</button><button className="primary" disabled={!dirty||busy||document?.readonly} onClick={save}>{busy?'Pracuję…':'Zapisz'}</button></div>
    {document?<div className="editor-code"><div className="editor-gutter" aria-hidden="true"><pre ref={gutter}>{content.split('\n').map((_,i)=>i+1).join('\n')}</pre></div><textarea ref={input} aria-label={'Zawartość '+file} spellCheck={false} wrap="off" disabled={busy} readOnly={document.readonly} value={content} onChange={e=>setContent(e.target.value)} onScroll={syncLines} onKeyDown={e=>{if(e.key==='Tab'&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!document.readonly){e.preventDefault();const start=e.target.selectionStart,end=e.target.selectionEnd;setContent(content.slice(0,start)+'  '+content.slice(end));requestAnimationFrame(()=>input.current?.setSelectionRange(start+2,start+2));}}}/></div>:<div className="editor-empty"><i className="fa-solid fa-code"/><h2>Wszystko w jednym miejscu</h2><p>Wybierz konfigurację, plugin lub plik tekstowy z listy.</p><small>UTF-8 · do 1 MB · Ctrl+S zapisuje</small></div>}
    <footer role="status">{message|| (document?.readonly?'Tylko do odczytu':dirty?'Niezapisane zmiany':'Gotowe')}<span>UTF-8 · {content.split('\n').length} linii · Ctrl+S</span></footer></main></div>
  </div></div>;
}
