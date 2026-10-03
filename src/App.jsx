import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import brand from '../images/brand.png';
import background from '../images/background.png';
import Developers from './Developers.jsx';
import ScreenshotGallery from './ScreenshotGallery.jsx';
import ServerFileEditor from './ServerFileEditor.jsx';
import PlayerPreview from './PlayerPreview.jsx';
import { PL } from './polish.js';
import flMark from '../images/logo.png';

import { sfx } from './sfx.js';
import { getLang } from './i18n.js';
import { DiscordIcon } from './brands.jsx';

import {
  Play, Square, Layers, Package, LayoutGrid, Gift, User, Users, Palette,
  Settings, Search, Plus, RefreshCw, FolderOpen, Copy, Pencil, Trash2,
  Download, Upload, Check, X, AlertTriangle, Info, Camera,
  ExternalLink, Server, Pin, PinOff, Database, Newspaper, Menu, Star, ChevronDown,
} from './icons.jsx';

// Paginador reutilizable (se muestra arriba y abajo de las listas)
function Pager({ t, page, total, onPage, busy }) {
  const pages = Math.max(1, Math.ceil((total || 0) / 24));
  if ((total || 0) <= 24) return null;
  return (
  <div className="row" style={{marginTop:12, marginBottom:6, justifyContent:'center', gap:16}}>
    <button className="ghost" style={{padding:'10px 24px', fontSize:15}} disabled={page<=1 || busy} onClick={()=>onPage(page-1)}>‹ {t('pg.prev')}</button>
    <span className="pill" style={{padding:'10px 18px', fontSize:14}}>{t('pg.page')} {page} / {pages}</span>
    <button className="ghost" style={{padding:'10px 24px', fontSize:15}} disabled={busy || page>=pages} onClick={()=>onPage(page+1)}>{t('pg.next')} ›</button>
  </div>);
}

// Menú hamburguesa para acciones que desbordan (se cierra solo)
function DotsMenu({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const card = ref.current?.closest?.('.card');
    const prev = card ? card.style.zIndex : '';
    if (card) card.style.zIndex = '70';
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); if (card) card.style.zIndex = prev; };
  }, [open ]);
  return (
  <div className="dots" ref={ref}>
    <button className="ghost" onClick={() => setOpen((o) => !o)} title="···"><Menu size={16} /></button>
    {open && <div className="dots-menu" onClick={() => setOpen(false)}>{children}</div>}
  </div>);
}

const fmtSize = (b) => {
  if (!b) return '0 MB';
  return b >= 1073741824 ? `${(b / 1073741824).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1048576))} MB`;
};

// Instalados persistentes (por instancia+origen+tipo): sobreviven a pestañas y reinicios
const loadInstalledIds = (instanceName, scope) => {
  try {
    const all = JSON.parse(localStorage.getItem('ferro-installed') || '{}');
    return all[`${instanceName}::${scope}`] || [];
  } catch { return []; }
};
const rememberInstalled = (instanceName, scope, id) => {
  try {
    const all = JSON.parse(localStorage.getItem('ferro-installed') || '{}');
    const k = `${instanceName}::${scope}`;
    all[k] = [...new Set([...(all[k] || []), id])];
    localStorage.setItem('ferro-installed', JSON.stringify(all));
  } catch {}
};

function MorphModal({ origin, closing, onClose, title, children }) {
  return (
    <div className="morph-overlay" onClick={onClose}>
      <div className="morph-box" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="morph-head"><span className="card-title">{title}</span><button className="mini" aria-label="Zamknij" onClick={onClose}><X size={12} /></button></div>
        <div className="morph-body">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleHeight,setConsoleHeight]=useState(()=>{try{return Math.max(160,Math.min(700,Number(localStorage.getItem('eon-console-height'))||240));}catch{return 240;}});
  const [installHidden,setInstallHidden]=useState(()=>{try{return localStorage.getItem('eon-install-hidden')==='1';}catch{return false;}});
  useEffect(()=>{try{localStorage.setItem('eon-console-height',String(consoleHeight));}catch{}},[consoleHeight]);
  const hideInstall=()=>{setInstallHidden(true);setConsoleOpen(true);try{localStorage.setItem('eon-install-hidden','1');}catch{}};
  const consoleDrag=useRef(null);
  const resizeConsole=e=>{if(consoleDrag.current!==null)setConsoleHeight(Math.max(160,Math.min(window.innerHeight*.75,consoleDrag.current.height+consoleDrag.current.y-e.clientY)));};
  const [wallpaperDim,setWallpaperDim]=useState(()=>{try{const value=Number(localStorage.getItem('eon-wallpaper-dim'));return value>=.2&&value<=.85?value:.55;}catch{return .55;}});
  useEffect(()=>{try{localStorage.setItem('eon-wallpaper-dim',String(wallpaperDim));}catch{}},[wallpaperDim]);
  useEffect(() => { if (!consoleOpen) return; const close = e => { if (e.key === 'Escape') setConsoleOpen(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [consoleOpen]);
  const [tab, setTab] = useState(() => {
    try {
      const v = localStorage.getItem('ferro-tab');
      const ok = ['jugar', 'versiones', 'instancias', 'mods', 'packs', 'noticias', 'servers', 'cuenta', 'skin', 'ajustes', 'developers', 'gallery'];
      if (ok.includes(v)) return v;
    } catch {}
    return 'jugar';
  });
  useEffect(() => { try { localStorage.setItem('ferro-tab', tab); } catch {} }, [tab]);
  // Intro + cualquier contenido nuevo: cada bloque entra desde su lado más cercano.


  const [sideOpen, setSideOpen] = useState(false);
  const [sidePinned, setSidePinned] = useState(() => { try { return localStorage.getItem('ferro-sidepin') !== '0'; } catch { return false; } });
  const sideBig = sideOpen || sidePinned;
  const [sidebarHidden, setSidebarHidden] = useState(() => { try { return localStorage.getItem('eon-sidebar-collapsed') === '1'; } catch { return false; } });
  const [editorActive,setEditorActive]=useState(false);
  const sectionScroll=useRef({}),mainPanel=useRef(null);
  useEffect(()=>{const update=e=>setEditorActive(e.detail===true);window.addEventListener('eon-editor-active',update);return()=>window.removeEventListener('eon-editor-active',update);},[]);
  useLayoutEffect(()=>{const element=mainPanel.current;if(element)element.scrollTop=sectionScroll.current[tab]||0;},[tab]);
  useEffect(() => { try { localStorage.setItem('eon-sidebar-collapsed', sidebarHidden ? '1' : '0'); } catch {} }, [sidebarHidden]);
  const firstTab = useRef(true);
  useEffect(() => {
    if (firstTab.current) { firstTab.current = false; return; }
    if (!sidePinned) setSideOpen(false);
  }, [tab, sidePinned]);
  const [lang, setLang] = useState(getLang());
  const t = (k, vars) => {
    let s = PL[k] || k;
    if (vars) for (const [kk, vv] of Object.entries(vars)) s = s.replace(`{${kk}}`, vv);
    return s;
  };
  const setLangBoth = (l) => { setLang(l); try { localStorage.setItem('ferro-lang', l); } catch {} };
  const fmtPlay = (s) => {
    const m = Math.floor((s || 0) / 60);
    if (!m) return null;
    return m < 60 ? `${m} min` : `${(m / 60).toFixed(m < 600 ? 1 : 0)} h`;
  };
  const [versions, setVersions] = useState([]);
  const [instances, setInstances] = useState([]);
  const [java, setJava] = useState(null);
  const [username, setUsername] = useState(() => { try { return localStorage.getItem('ferro-username') || ''; } catch { return ''; } });
  const [versionId, setVersionId] = useState('1.21.1');
  const [instanceName, setInstanceName] = useState('');
  const [createRam, setCreateRam] = useState(4096);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const [installTarget, setInstallTarget] = useState(null);
  const [fileProfile,setFileProfile] = useState(null);
  const [ramInfo, setRamInfo] = useState(null);
  const [ramTouched, setRamTouched] = useState(false);
  const [gameError, setGameError] = useState(null);
  const [launching, setLaunching] = useState(false);
  const showGameError = async error => {
    const detail = error?.message || String(error);
    const explained = await window.ferro?.explainError({message:detail}).catch(()=>null);
    setGameError(explained || {title:'Nie udało się uruchomić gry',advice:'Sprawdź szczegóły w konsoli i spróbuj ponownie.',detail});
  };
  const [loaderBusy, setLoaderBusy] = useState(false);
  const [instanceType, setInstanceType] = useState('vanilla');
  const [loaders, setLoaders] = useState([]);
  const [loaderVersion, setLoaderVersion] = useState('');
  const [modQuery, setModQuery] = useState('');
  const [modHits, setModHits] = useState([]);
  const [modTotal, setModTotal] = useState(0);
  const [modPage, setModPage] = useState(1);
  const [fVersion, setFVersion] = useState('1.21.1');
  const [fLoader, setFLoader] = useState('fabric');
  const [fSort, setFSort] = useState('relevance');
  const [kind, setKind] = useState('mod');
  const kindName = kind === 'shader' ? 'shaders' : kind === 'resourcepack' ? "paczki zasobów" : 'mods';
  const [mods, setMods] = useState([]);
  const [modsFor, setModsFor] = useState('');
  const [dpFor, setDpFor] = useState('');
  const [dpWorlds, setDpWorlds] = useState([]);
  const [dpWorld, setDpWorld] = useState('');
  const [dpList, setDpList] = useState([]);
  const [dpQuery, setDpQuery] = useState('');
  const [dpHits, setDpHits] = useState([]);
  const [dpTotal, setDpTotal] = useState(0);
  const [abCfg, setAbCfg] = useState({ mode: 'off', keep: 3 });
  const [wp, setWp] = useState(null);
  const [szMap, setSzMap] = useState({});
  const [szLoading, setSzLoading] = useState(false);
  const [ldState, setLdState] = useState({});
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [dpPage, setDpPage] = useState(1);
  const [dpSearching, setDpSearching] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [installingId, setInstallingId] = useState(null);
  const [installedIds, setInstalledIds] = useState([]);
  const [source, setSource] = useState('mr');
  const [cfKeyInput, setCfKeyInput] = useState('');
  const [cfKeySet, setCfKeySet] = useState('');
  const [cfHits, setCfHits] = useState([]);
  const [cfTotal, setCfTotal] = useState(0);
  const [cfFiles, setCfFiles] = useState({});
  const [cfBusy, setCfBusy] = useState(null);
  const [updMap, setUpdMap] = useState({});
  const [checkingUpd, setCheckingUpd] = useState(false);
  const [updMsg, setUpdMsg] = useState('');
  const [rpOn, setRpOn] = useState(null);
  const [shaderCur, setShaderCur] = useState(null);
  const [packMc, setPackMc] = useState('1.21.1');
  const [packLoader, setPackLoader] = useState('');
  const [packSort, setPackSort] = useState('relevance');
  const [packTotal, setPackTotal] = useState(0);
  const [packQuery, setPackQuery] = useState('');
  const [packPage, setPackPage] = useState(1);
  const [packHits, setPackHits] = useState([]);
  const [packVers, setPackVers] = useState({});
  const [packBusy, setPackBusy] = useState(null);
  const [packSrc, setPackSrc] = useState('mr');
  const [cfPackVers, setCfPackVers] = useState({});
  const [cfPackBusy, setCfPackBusy] = useState(null);
  const [offlineDraft, setOfflineDraft] = useState(() => { try { return localStorage.getItem('ferro-username') || ''; } catch { return ''; } });
  const [idInfo, setIdInfo] = useState({ masked: '', configured: false });
  const [account, setAccount] = useState(null);
  const [accts, setAccts] = useState([]);
  const [authStep, setAuthStep] = useState(null);
  const [browserWaiting, setBrowserWaiting] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [appVer, setAppVer] = useState('');
  const [upd, setUpd] = useState({ state: 'idle' });
  const [sfxOn, setSfxOn] = useState(sfx.cfg.enabled);
  const [sfxVol, setSfxVol] = useState(sfx.cfg.volume);
  const [sfxHover, setSfxHover] = useState(sfx.cfg.hover);
  const [sfxPack, setSfxPack] = useState(sfx.cfg.pack || 'cristal');
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('ferro-theme') || 'midnight'; } catch { return 'ember'; } });

  useEffect(() => {
    try {
      if (theme === 'ember') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('ferro-theme', theme);
    } catch {}
  }, [theme]);
  const [dcId, setDcId] = useState('');
  const [dcOn, setDcOn] = useState(true);
  const [dcHook, setDcHook] = useState('');
  const [social, setSocial] = useState({ github: '', discord: '', youtube: '' });
  useEffect(() => { window.ferro?.social?.().then(setSocial).catch(()=>{}); }, []);
  const [toasts, setToasts] = useState([]);

  const [scare, setScare] = useState(null);
  const toastId = useRef(0);
  const touchedVer = useRef({ create: false, filter: false, pack: false });

  const pushToast = (type, msg, action) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, type, msg: String(msg).slice(0, 180), action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 8000 : 4500);
  };

  // Todo el log pasa por aquí: clasifica lo nuevo (error/éxito) para VFX+sonido
  const setLog = (updater) => {
    setLogRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const added = typeof next === 'string' ? next.slice(prev.length) : '';
      if (added) {
        const errLine = added.split('\n').find((ln) => /^\[error\]/.test(ln));
        if (errLine) {
          sfx.play('error');
          pushToast('error', errLine.replace(/^\[error\]\s*/, ''));

        } else if (/lanzando\.\.\./.test(added)) sfx.play('launch');
        else if (/instalad[oa]|creada|iniciada|guardados|restaurada|importada|list[oa]|aplicada|restablecida/i.test(added)) sfx.play('success');
        if (/protocolo anti-suplantaci.n/i.test(added)) sfx.play('alarm');
        if (/Acceso DENEGADO/.test(added)) {
          const full = prev + added;
          const nm = (full.match(/NOMBRE PREMIUM DETECTADO:\s*(.+?)\s*!!/) || [])[1] || '???';
          const cs = (full.match(/(?:Reporte|Caso)\s+(F-[0-9A-F]+)/) || [])[1] || 'F-????';
          setScare({ name: nm.trim(), caseId: cs });
          setTimeout(() => setScare(null), 6000);
        }
        const crashM = added.match(/crash detectado en (.+?) \(código (\d+)\)/);
        if (crashM) {
          const [, instName] = crashM;
          pushToast('error', t('toast.crash', { n: instName }), {
            label: t('inst.view'),
            fn: () => { setTab('instancias'); setSettingsFor(instName); loadBackups(instName); loadCrashes(instName); },
          });
        }
      }
      return next;
    });
  };
  const [skinInfo, setSkinInfo] = useState(null);
  const [skinName, setSkinName] = useState('');
  const [skinUrl, setSkinUrl] = useState('');
  const [skinVariant, setSkinVariant] = useState('classic');
  const [skinBusy, setSkinBusy] = useState(false);
  const [bkList, setBkList] = useState([]);
  const [crList, setCrList] = useState([]);
  const [crOpen, setCrOpen] = useState(null);
  const [modalOrigin, setModalOrigin] = useState(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [instModal, setInstModal] = useState(null);
  const [instOrigin, setInstOrigin] = useState(null);
  const [instClosing, setInstClosing] = useState(false);
  const [imFilter, setImFilter] = useState('');
  const [imSort, setImSort] = useState('name');
  const [createOpen, setCreateOpen] = useState(false);
  const [createOrigin, setCreateOrigin] = useState(null);
  const [createClosing, setCreateClosing] = useState(false);
  const [galName, setGalName] = useState('');
  const [galOrigin, setGalOrigin] = useState(null);
  const [galClosing, setGalClosing] = useState(false);
  const [galShots, setGalShots] = useState([]);
  const sideLogoRef = useRef(null);
  const pollRef = useRef(null);
  const [launchInstance, setLaunchInstance] = useState(() => { try { return localStorage.getItem('ferro-instance') || ''; } catch { return ''; } });
  useEffect(() => { try { localStorage.setItem('ferro-username', username); } catch {} }, [username]);
  useEffect(() => { try { if (launchInstance) localStorage.setItem('ferro-instance', launchInstance); } catch {} }, [launchInstance]);
  const [log, setLogRaw] = useState('[eoncode] Gotowy.\n');
  const [playFace, setPlayFace] = useState(null);
  const [nameState, setNameState] = useState({ status: 'idle', suggestions: [] });
  const [tourIdx, setTourIdx] = useState(null);
  const [tourRect, setTourRect] = useState(null);

  const tourSteps = () => ([
    { tab: 'jugar', sel: '[data-tour="play"]', title: t('tour.s1t'), body: t('tour.s1x') },
    { tab: 'instancias', sel: '[data-tour="create"]', title: t('tour.s2t'), body: t('tour.s2x') },
    { tab: 'mods', sel: '[data-tour="mods-search"]', title: t('tour.s3t'), body: t('tour.s3x') },
    { tab: 'cuenta', sel: '[data-tour="account-login"]', title: t('tour.s4t'), body: t('tour.s4x') },
    { tab: 'noticias', sel: '[data-tour="news-list"]', title: t('tour.s8t'), body: t('tour.s8x') },
    { tab: 'ajustes', sel: '[data-tour="settings"]', title: t('tour.s5t'), body: t('tour.s5x') },
  ]);
  const startTour = () => setTourIdx(0);
  const endTour = () => { setTourIdx(null); setTourRect(null); try { localStorage.setItem('ferro-tour-done-2', '1'); } catch {} };

  useEffect(() => {
    if (tourIdx === null) return;
    const steps = tourSteps();
    const st = steps[tourIdx];
    if (!st) { endTour(); return; }
    if (tab !== st.tab) setTab(st.tab);
    const t1 = setTimeout(() => {
      const el = document.querySelector(st.sel);
      if (!el) { setTourRect(null); return; }
      el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setTourRect({ x: r.left - 8, y: r.top - 8, w: r.width + 16, h: r.height + 16 });
      }, 250);
    }, 300);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourIdx, tab, lang]);

  useEffect(() => {
    const name = (account?.name || username || '').trim();
    if (!name) { setPlayFace(null); return; }
    if (account) { setPlayFace(`https://visage.surgeplay.com/face/64/${account.uuid.replace(/-/g, '')}`); return; }
    const t = setTimeout(async () => {
      try {
        const s = await window.ferro?.skin({ name });
        setPlayFace(s?.renders ? s.renders.face : null);
      } catch { setPlayFace(null); }
    }, 600);
    return () => clearTimeout(t);
  }, [username, account]);

  // Comprueba si el nombre offline está libre y sugiere alternativas
  useEffect(() => {
    if (account) { setNameState({ status: 'idle', suggestions: [] }); return; }
    const name = (username || '').trim();
    if (name.length < 3) { setNameState({ status: 'idle', suggestions: [] }); return; }
    setNameState({status:/^[A-Za-z0-9_]{3,16}$/.test(name)?'free':'invalid',suggestions:[]});
  }, [username, account]);
  const [running, setRunning] = useState(false);
  // Aviso al cerrar con el juego en marcha (aquí sí existe `running`)
  useEffect(() => {
    if (!running && !createBusy) return;
    const guard = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [running, createBusy]);
  const [logLevel, setLogLevel] = useState('todo');
  const [logSearch, setLogSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [settingsFor, setSettingsFor] = useState('');
  const [sRam, setSRam] = useState('2048');
  const [sW, setSW] = useState('854');
  const [sH, setSH] = useState('480');
  const [sJavaMode, setSJavaMode] = useState('auto');
  const [sJavaPath, setSJavaPath] = useState('');
  const [sJvm, setSJvm] = useState('equilibrado');
  const [verKind, setVerKind] = useState('release');
  const [diag, setDiag] = useState(null);
  const [impScan, setImpScan] = useState(null);
  const [servers, setServers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendName, setFriendName] = useState('');
  const [essInst, setEssInst] = useState('');
  const [essJars, setEssJars] = useState(null);
  const [srvName, setSrvName] = useState('');
  const [srvHost, setSrvHost] = useState('');
  const [srvPort, setSrvPort] = useState('');
  const [srvPing, setSrvPing] = useState({});
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [confirmInput, setConfirmInput] = useState('');
  const loginFx = 0;

  const exploding = null;

  const celebrateLogin = () => {};
  const explodeInstance = async (name) => {
    try { await window.ferro?.deleteInstance({ instanceName: name }); refresh(); }
    catch (e) { setLog(l => l + '[error] ' + e.message + '\n'); }
  };
  const askConfirm = (message, onOk) => setConfirmDlg({ message, onOk, input: false });
  const askRename = (current, onOk) => { setConfirmInput(current); setConfirmDlg({ message: t('inst.renamePrompt'), input: true, onOk: (v) => { if (v && v !== current) onOk(v); } }); };
  const [saving, setSaving] = useState(false);
  const [instFilter, setInstFilter] = useState('');
  const [launchProg, setLaunchProg] = useState(null);
  const [dragOn, setDragOn] = useState(false);
  const dragCount = useRef(0);
  const logRef = useRef(null);

  const refresh = async () => {
    if (!window.ferro) return;
    try {
      const vers = await window.ferro?.versions().catch(()=>versions);
      setVersions(vers || []);
      // Predeterminada: la última release del manifiesto (vale para futuras versiones)
      const latest = vers[0]?.id;
      if (latest) {
        if (!touchedVer.current.create) setVersionId(latest);
        if (!touchedVer.current.filter) setFVersion(latest);
        if (!touchedVer.current.pack) setPackMc(latest);
      }
      const inst = await window.ferro?.instances();
      inst.sort((a, b) => ((b.settings?.pinned ? 1 : 0) - (a.settings?.pinned ? 1 : 0)));
      setInstances(inst || []);
      // Saneado global: ninguna referencia puede apuntar a una instancia que ya no existe
      // (vale tras borrar, renombrar, duplicar o importar).
      const names = inst.map((i) => i.name);
      const first = inst.find((i) => i.settings?.pinned)?.name || inst[0]?.name || '';
      const pick = (cur) => (cur && names.includes(cur) ? cur : first);
      const li = pick(launchInstance); if (li !== launchInstance) setLaunchInstance(li);
      const mf = pick(modsFor); if (mf !== modsFor) setModsFor(mf);
      const df = pick(dpFor);
      if (df !== dpFor) { setDpFor(df); setDpWorld(''); setDpList([]); setDpHits([]); }
      if (df) loadWorlds(df);
      if (essInst && !names.includes(essInst)) { setEssInst(first); setEssJars(null); }
      if (settingsFor && !names.includes(settingsFor)) { setSettingsFor(''); setModalOrigin(null); }
      if (galName && !names.includes(galName)) closeGallery();
      if (instModal === 'mods' && modsFor && !names.includes(modsFor)) closeInstalled();
      if (instModal === 'datapacks' && dpFor && !names.includes(dpFor)) closeInstalled();
      setJava(await window.ferro?.java());
      try { const config = await window.ferro?.autoBackupGet(); if(config) setAbCfg(config); } catch {}
      try {
        const r = await window.ferro?.autoBackupRun();
        if (r?.due) setLog((l) => l + `[eoncode] ${t('ab.done', { n: (r.done || []).length })}\n`);
      } catch {}
      try { setAccount(await window.ferro?.authStatus()); } catch {}
    } catch (e) {
      setLog((l) => l + `[error] ${e.message}\n`);
    }
  };

  const loadVers = async (k) => {
    try {
      setVerKind(k);
      setVersions(await window.ferro?.versions({ kind: k }) || []);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const loadMods = async (name, k) => {
    if (!name) return;
    const kk = k || kind;
    try {
      setMods(await window.ferro?.mods({ instanceName: name, kind: kk }));
      if (kk === 'resourcepack') {
        try { const r = await window.ferro?.rp({ instanceName: name }); setRpOn(r.enabled); }
        catch { setRpOn(null); }
      }
      if (kk === 'shader') {
        try { setShaderCur(await window.ferro?.shader({ instanceName: name })); }
        catch { setShaderCur(null); }
      }
    }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const loadWorlds = async (name) => {
    if (!name) return;
    try {
      const w = await window.ferro?.worlds({ instanceName: name });
      setDpWorlds(w);
      setDpWorld((cur) => (w.includes(cur) ? cur : (w[0] || '')));
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const loadDpList = async (name, world) => {
    if (!name || !world) { setDpList([]); return; }
    try { setDpList(await window.ferro?.mods({ instanceName: name, kind: 'datapack', world })); }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const dpSearch = async (page) => {
    const p = Math.max(1, page || 1);
    const inst = instances.find((i) => i.name === dpFor);
    if (!inst) return;
    const q = dpQuery.trim();
    setDpPage(p);
    setDpSearching(true);
    try {
      const r = await window.ferro?.modSearch({ query: q, mcVersion: inst.versionId, loader: 'fabric', sort: q ? 'relevance' : 'downloads', kind: 'datapack', offset: (p - 1) * 24 });
      setDpHits(r.hits || []);
      setDpTotal(r.total || 0);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setDpSearching(false); }
  };

  const dpInstall = async (m) => {
    if (!dpFor || !dpWorld) { setLog((l) => l + `[error] ${t('dp.needWorld')}\n`); return; }
    try {
      await window.ferro?.modInstall({ instanceName: dpFor, projectId: m.id, kind: 'datapack', world: dpWorld });
      setDpHits((h) => h.filter((x) => x.id !== m.id));
      await loadDpList(dpFor, dpWorld);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const dpToggle = async (f) => {
    try {
      await window.ferro?.modToggle({ instanceName: dpFor, file: f.file, disable: !f.disabled, kind: 'datapack', world: dpWorld });
      await loadDpList(dpFor, dpWorld);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const dpRemove = async (f) => {
    try {
      await window.ferro?.modRemove({ instanceName: dpFor, file: f.file, kind: 'datapack', world: dpWorld });
      await loadDpList(dpFor, dpWorld);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const bulkToggle = async (disable) => {
    try {
      for (const m of mods) {
        if (!!m.disabled === !!disable) continue;
        await window.ferro?.modToggle({ instanceName: modsFor, file: m.file, disable, kind });
      }
      await loadMods(modsFor);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const checkUpdates = async () => {
    if (checkingUpd || !modsFor) return;
    setCheckingUpd(true);
    setUpdMsg('');
    try {
      const list = await window.ferro?.modUpdates({ instanceName: modsFor });
      const map = {};
      for (const u of list) map[u.file] = u;
      setUpdMap(map);
      setUpdMsg(list.length === 0 ? t('mods.upToDate') : t('mods.nUpdates', { n: list.length }));
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setCheckingUpd(false); }
  };

  const doModUpdate = async (u) => {
    try {
      setLog((l) => l + `[eoncode] Aktualizowanie ${u.title || u.file}...\n`);
      await window.ferro?.modUpdate({ instanceName: modsFor, file: u.file, projectId: u.projectId });
      setUpdMap((m) => { const n = { ...m }; delete n[u.file]; return n; });
      loadMods(modsFor);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const loadBackups = async (name) => {
    if (!name) return;
    try { setBkList(await window.ferro?.backups({ instanceName: name })); }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const loadCrashes = async (name) => {
    if (!name) return;
    setCrOpen(null);
    try { setCrList(await window.ferro?.crashes({ instanceName: name })); }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  useEffect(() => { if (tab === 'mods' && modsFor) loadMods(modsFor); }, [modsFor]);
  useEffect(() => {
    if (tab === 'mods' && modsFor) setInstalledIds(loadInstalledIds(modsFor, `${source}:${kind}`));
  }, [tab, modsFor, kind, source]);
  useEffect(() => { if (dpFor) loadWorlds(dpFor); }, [dpFor]);
  useEffect(() => { if (dpFor && dpWorld) loadDpList(dpFor, dpWorld); else setDpList([]); }, [dpFor, dpWorld]);

  useEffect(() => {
    const inst = instances.find((i) => i.name === modsFor);
    if (inst) {
      setFVersion(inst.versionId);
      if (inst.type !== 'vanilla') setFLoader(inst.type);
    }
  }, [modsFor]);

  const doSearch = async (page, over = {}) => {
    const p = Math.max(1, page || 1);
    const q = String(over.query !== undefined ? over.query : modQuery).trim();
    const ver = over.mcVersion || fVersion;
    const loader = over.loader || fLoader;
    const k = over.kind || kind;
    setModPage(p);
    setSearching(true);
    try {
      const r = await window.ferro?.modSearch({ query: q, mcVersion: ver, loader, sort: q ? (over.sort || fSort) : 'downloads', kind: k, offset: (p - 1) * 24 });
      setModHits(r.hits || r);
      setModTotal(r.total || (r.hits || r).length);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setSearching(false); }
  };

  const doInstall = async (projectId, title) => {
    if (installingId) return;
    setInstallingId(projectId);
    try {
      setLog((l) => l + `[eoncode] Instalowanie ${title} en ${modsFor}...\n`);
      const r = await window.ferro?.modInstall({ instanceName: modsFor, projectId, kind });
      setLog((l) => l + `[eoncode] Zainstalowano ${r.file}\n`);
      pushToast('success', `${title} ${t('toast.installed')}`);
      rememberInstalled(modsFor, `mr:${kind}`, projectId);
      setInstalledIds((s) => [...s, projectId]);
      await loadMods(modsFor);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setInstallingId(null); }
  };

  const loadCfKey = async () => {
    try { setCfKeySet(await window.ferro?.cfKey()); } catch {}
  };

  const doCfSearch = async () => {
    setSearching(true);
    try {
      const ck = kind === 'shader' ? 'mod' : kind;
      const r = await window.ferro?.cfSearch({ query: modQuery, mcVersion: fVersion, kind: ck, sort: fSort });
      setCfHits(r.hits || []);
      setCfTotal(r.total || 0);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setSearching(false); }
  };

  const doCfTrending = async () => {
    setSearching(true);
    try {
      const r = await window.ferro?.cfTrending();
      setCfHits(r.hits || []);
      setCfTotal(r.total || 0);
      setLog((l) => l + `[eoncode] Popularne projekty CurseForge: ${r.hits?.length || 0}\n`);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setSearching(false); }
  };

  const doCfFiles = async (modId) => {
    if (cfFiles[modId]) {
      setCfFiles((p) => { const n = { ...p }; delete n[modId]; return n; });
      return;
    }
    try {
      const inst = instances.find((i) => i.name === modsFor);
      const vers = await window.ferro?.cfFiles({ modId, mcVersion: fVersion, loader: inst?.type === 'vanilla' ? undefined : inst?.type });
      setCfFiles((p) => ({ ...p, [modId]: vers }));
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const doCfInstall = async (m, f) => {
    if (cfBusy) return;
    setCfBusy(f.id);
    try {
      setLog((l) => l + `[eoncode] Instalowanie ${f.name} en ${modsFor}...\n`);
      const r = await window.ferro?.cfInstall({ instanceName: modsFor, modId: m.id, fileId: f.id, kind: kind === 'resourcepack' ? 'resourcepack' : 'mod' });
      setLog((l) => l + `[eoncode] Zainstalowano ${r.file}\n`);
      pushToast('success', `${m.title} ${t('toast.installed')}`);
      rememberInstalled(modsFor, `cf:${kind}`, m.id);
      setInstalledIds((s) => [...s, m.id]);
      await loadMods(modsFor);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setCfBusy(null); }
  };

  const doPackSearch = async (page, over = {}) => {
    const p = Math.max(1, page || 1);
    const q = String(over.query !== undefined ? over.query : packQuery).trim();
    setPackPage(p);
    try {
      const r = await window.ferro?.packSearch({ query: q, mcVersion: over.mcVersion || packMc, loader: (over.loader !== undefined ? over.loader : packLoader) || undefined, sort: q ? (over.sort || packSort) : 'downloads', offset: (p - 1) * 24 });
      setPackHits(r.hits || r);
      setPackTotal(r.total || (r.hits || r).length);
      setPackVers({});
    }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const doPackVers = async (projectId) => {
    if (packVers[projectId]) {
      setPackVers((p) => { const n = { ...p }; delete n[projectId]; return n; });
      return;
    }
    try {
      const vers = await window.ferro?.packVersions({ projectId, mcVersion: packMc, loader: packLoader || undefined });
      setPackVers((p) => ({ ...p, [projectId]: vers }));
    }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const doPackInstall = async (pack, v) => {
    if (packBusy) return;
    setPackBusy(v.id);
    try {
      setTab('jugar');
      const r = await window.ferro?.packInstall({ name: `${pack.title} ${v.number}`, projectId: pack.id, packVersionId: v.id, mcVersion: packMc });
      setLog((l) => l + `[eoncode] Instancja ${r.name} została utworzona z paczki modyfikacji\n`);
      pushToast('success', `${t('toast.packDone')}: ${r.name}`);
      await refresh();
      setLaunchInstance(r.name);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setPackBusy(null); }
  };

  const doCfPackSearch = async () => {
    try {
      const r = await window.ferro?.cfSearch({ query: packQuery, mcVersion: packMc, kind: 'modpack', sort: packSort });
      setPackHits(r.hits || []);
      setPackTotal(r.total || 0);
      setPackVers({});
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const doCfPackVers = async (modId) => {
    if (cfPackVers[modId]) {
      setCfPackVers((p) => { const n = { ...p }; delete n[modId]; return n; });
      return;
    }
    try {
      const vers = await window.ferro?.cfFiles({ modId, mcVersion: packMc });
      setCfPackVers((p) => ({ ...p, [modId]: vers }));
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const doCfPackInstall = async (pack, f) => {
    if (cfPackBusy) return;
    setCfPackBusy(f.id);
    try {
      setTab('jugar');
      const r = await window.ferro?.cfPackInstall({ name: pack.title, modId: pack.id, fileId: f.id });
      setLog((l) => l + `[eoncode] Instancja ${r.name} została utworzona z paczki modyfikacji\n`);
      pushToast('success', `${t('toast.packDone')}: ${r.name}`);
      await refresh();
      setLaunchInstance(r.name);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setCfPackBusy(null); }
  };

  const loadAuth = async () => {
    try {
      const ci = await window.ferro?.clientId().catch(() => null);
      setIdInfo(ci || { masked: '', configured: false });

      setAccount(await window.ferro?.authStatus());
      setAccts(await window.ferro?.accounts() || []);
      const dc = await window.ferro?.discord().catch(()=>({clientId:'',enabled:true}));
      setDcId(dc?.clientId || ''); setDcOn(dc?.enabled !== false); setDcHook(dc?.webhook || '');
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const loadSkin = async (name) => {
    try { setSkinInfo(await window.ferro?.skin({ name: name ?? skinName ?? username ?? 'Ferro' })); }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const applySkin = async () => {
    if (skinBusy) return;
    setSkinBusy(true);
    try {
      const r = await window.ferro?.skinApply({ variant: skinVariant, url: skinUrl });
      setSkinInfo({ online: true, ...r });
      setLog((l) => l + `[eoncode] Zaktualizowano skórkę (${skinVariant})\n`);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setSkinBusy(false); }
  };

  const resetSkin = async () => {
    try {
      await window.ferro?.skinReset();
      setLog((l) => l + "[eoncode] Przywrócono skórkę\n");
      loadSkin();
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };
  useEffect(() => stopPoll, []);

  useEffect(() => {
    window.ferro?.onAuthResult?.((err, data) => {
      setBrowserWaiting(false);
      if (err) setLog((l) => l + `[error] ${err.error || err}\n`);
      else {
        setLog((l) => l + `[eoncode] Zalogowano: ${data.name}\n`);
        pushToast('success', `${t('toast.login')}: ${data.name}`);
        loadAuth();
        celebrateLogin();
      }
    });
    window.ferro?.onUpdate?.((d) => setUpd(d));
    window.ferro?.updateState?.().then(d=>{if(d)setUpd(d);}).catch(()=>{});
    window.ferro?.appVersion?.().then(setAppVer).catch(()=>{});
  }, []);

  const doBrowserAuth = async () => {
    try {
      setBrowserWaiting(true);
      await window.ferro?.authWindow();
      setLog((l) => l + "[eoncode] Dokończ logowanie w oknie Microsoft…\n");
    } catch (e) { setBrowserWaiting(false); setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const cancelBrowserAuth = async () => {
    setBrowserWaiting(false);
    try { await window.ferro?.authWindowCancel(); } catch {}
  };

  const doAuthPollOnce = async (s) => {
    const r = await window.ferro?.authPoll({ deviceCode: (s || authStep)?.deviceCode });
    setPollCount((c) => c + 1);
    if (r.status === 'done') {
      stopPoll(); setAuthStep(null);
      setLog((l) => l + `[eoncode] Zalogowano: ${r.name}\n`);
      loadAuth();
      celebrateLogin();
    } else if (r.status === 'error') {
      stopPoll(); setAuthStep(null);
      setLog((l) => l + `[error] ${r.error}\n`);
    }
    return r;
  };

  const doAuthStart = async () => {
    try {

      const s = await window.ferro?.authStart();
      setAuthStep(s);
      setPollCount(0);
      setLog((l) => l + `[eoncode] Potwierdź logowanie kodem ${s.userCode} en ${s.verificationUri}\n`);
      stopPoll();
      pollRef.current = setInterval(async () => {
        try { await doAuthPollOnce(s); }
        catch (e) { stopPoll(); setAuthStep(null); setLog((l) => l + `[error] ${e.message}\n`); }
      }, s.interval);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const doLogout = async () => {
    stopPoll(); setAuthStep(null);
    await window.ferro?.authLogout();
    setAccount(null);
    setLog((l) => l + "[eoncode] Wylogowano\n");
  };

  useEffect(() => {
    window.ferro?.onGameError?.(setGameError);
    window.ferro?.onGameStopped?.(()=>{setRunning(false);setLaunchProg(null);});
    window.ferro?.onLog((t) => {
      setLog((l) => l + t);
      if (/proces zakończony|błąd uruchamiania|proceso terminado|error al arrancar/i.test(t)) setRunning(false);
    });
    refresh();
    window.ferro?.status?.().then((s) => setRunning(!!s?.running)).catch(()=>{});
  }, []);

  // Clics y hover globales en botones
  useEffect(() => {
    let lastHover = 0;
    const onClick = (e) => { if (e.target.closest('button:not(:disabled)')) sfx.play('click'); };
    const onOver = (e) => {
      if (!e.target.closest('button:not(:disabled)')) return;
      const now = Date.now();
      if (now - lastHover < 90) return;
      lastHover = now;
      sfx.play('hover');
    };
    document.addEventListener('click', onClick);
    document.addEventListener('mouseover', onOver);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('mouseover', onOver); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoaders([]); setLoaderVersion(''); setLoaderBusy(false);
    if (instanceType === 'vanilla' || !versionId) return;
    setLoaderBusy(true);
    window.ferro?.loaders({ mcVersion: versionId, type: instanceType }).then((list) => {
      if (cancelled) return;
      setLoaders(list); setLoaderVersion(list[0]?.loader || '');
    }).catch(() => { if (!cancelled) setCreateError('Nie udało się pobrać wersji loadera. Wybierz ponownie typ profilu.'); })
      .finally(() => { if (!cancelled) setLoaderBusy(false); });
    return () => { cancelled = true; };
  }, [instanceType, versionId]);

  useEffect(() => {
    if (!createOpen) return;
    let cancelled = false;
    window.ferro?.ramSuggest({type:instanceType}).then(info=>{ if(cancelled)return;setRamInfo(info);if(!ramTouched)setCreateRam(info.suggestedMb); }).catch(()=>{});
    return ()=>{cancelled=true;};
  }, [createOpen, instanceType, ramTouched]);

  const create = async () => {
    if (createBusy) return;
    if (!installTarget && (!instanceName.trim() || !versionId || (instanceType !== 'vanilla' && !loaderVersion))) { setCreateError('Podaj nazwę i wybierz dostępną wersję gry.'); return; }
    setCreateBusy(true); setCreateError(''); setGameError(null); setLaunchProg(null);
    try {
      if (!window.ferro) throw new Error('Instalacja jest dostępna w aplikacji EonLauncher.');
      let target = installTarget;
      if (!target) {
        const profile = await window.ferro.createInstance({ name: instanceName.trim(), versionId, type: instanceType, ramMb: createRam, loaderVersion: instanceType === 'vanilla' ? undefined : loaderVersion });
        target = profile.name; setInstallTarget(target); setLaunchInstance(target);
      }
      setCreateOpen(false); setCreateOrigin(null);
      pushToast('success','Instalacja trwa w tle. Możesz przeglądać launcher.');
      await window.ferro.installInstance({instanceName:target});
      await refresh(); setLaunchInstance(target);
      setInstanceName(''); setCreateOpen(false); setInstallTarget(null);
      pushToast('success','Minecraft zainstalowany. Gotowe do gry!');
    } catch (e) {
      const detail = await window.ferro?.explainError({message:e.message}).catch(()=>null);
      setCreateError(detail ? detail.title + '. ' + detail.advice : e.message);
      setLog(l=>l+'[error] '+e.message+'\n');
      await refresh();
    } finally { setCreateBusy(false); setLaunchProg(null); }
  };

  const play = async (nm, srv) => {
    const target = nm || launchInstance;
    if (!target || launching || createBusy) return;
    setLaunching(true); setGameError(null);
    try {
      setTab('jugar');
      setLaunchInstance(target);
      if (abCfg?.mode === 'beforePlay') {
        setLog((l) => l + `[eoncode] ${t('ab.backing')} ${target}...\n`);
        await window.ferro?.autoBackupOnce({ instanceName: target });
      }
      setLog((l) => l + `[eoncode] Uruchamianie ${target} jako ${account?.name || username}...\n`);
      setLaunchProg(null);
      await window.ferro?.launch({ instanceName: target, username, ...(srv ? { serverHost: srv.host, serverPort: srv.port } : {}) });
      const s = await window.ferro?.status().catch(() => null);
      setRunning(!!s?.running);
      if (!s?.running) setLog((l) => l + `[error] ${t('play.diedFast')}\n`);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); setRunning(false); await showGameError(e); }
    finally { setLaunching(false); setLaunchProg(null); }
  };

  const stop = async () => {
    try { await window.ferro?.stop(); }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const loadServers = async () => {
    try {
      const list = await window.ferro?.servers();
      setServers(list || []);
      list.forEach((s) => pingServer(s));
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const loadSizes = async (list) => {    const arr = list || instances;
    if (!arr.length) return;
    setSzLoading(true);
    try {
      const out = {};
      for (const i of arr) {
        try { const r = await window.ferro?.instSize({ instanceName: i.name }); out[i.name] = fmtSize(r.bytes); } catch {}
      }
      setSzMap((m) => ({ ...m, ...out }));
    } finally { setSzLoading(false); }
  };

  const cleanInstance = async (name) => {
    try {
      const r = await window.ferro?.instClean({ instanceName: name });
      setLog((l) => l + `[eoncode] ${t('sz.freed', { n: name, m: fmtSize(r.freed), c: r.removed })}\n`);
      setSzMap((m) => { const n = { ...m }; delete n[name]; return n; });
      try { const s = await window.ferro?.instSize({ instanceName: name }); setSzMap((m) => ({ ...m, [name]: fmtSize(s.bytes) })); } catch {}
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const loadLoaderStates = async (list) => {
    const arr = (list || instances).filter((i) => i.type !== 'vanilla');
    if (!arr.length) return;
    setLdState((m) => { const n = { ...m }; arr.forEach((i) => { n[i.name] = { checking: true }; }); return n; });
    for (const i of arr) {
      try {
        const r = await window.ferro?.loaderCheck({ instanceName: i.name });
        setLdState((m) => ({ ...m, [i.name]: { checking: false, outdated: !!r.outdated, latest: r.latest } }));
      } catch {
        setLdState((m) => ({ ...m, [i.name]: { checking: false, outdated: false } }));
      }
    }
  };

  const updateLoader = async (name) => {
    setLdState((m) => ({ ...m, [name]: { ...(m[name] || {}), checking: true } }));
    try {
      const r = await window.ferro?.loaderUpdate({ instanceName: name });
      setLog((l) => l + `[eoncode] loader ${name}: ${r.updated ? `${r.previous || '?'} → ${r.latest}` : `${t('ld.uptodate')} (${r.latest})`}\n`);
      setLdState((m) => ({ ...m, [name]: { checking: false, outdated: false, latest: r.latest } }));
      refresh();
    } catch (e) {
      setLog((l) => l + `[error] ${e.message}\n`);
      setLdState((m) => ({ ...m, [name]: { checking: false, outdated: true } }));
    }
  };

  const pingServer = async (s) => {
    const key = `${s.host}:${s.port}`;
    try {
      const r = await window.ferro?.serverPing({ host: s.host, port: s.port });
      setSrvPing((m) => ({ ...m, [key]: r }));
    } catch { setSrvPing((m) => ({ ...m, [key]: { online: false } })); }
  };

  const addServer = async () => {
    if (!srvHost.trim()) return;
    try {
      setServers(await window.ferro?.serverAdd({ name: srvName.trim() || srvHost.trim(), host: srvHost.trim(), port: srvPort }));
      setSrvName(''); setSrvHost(''); setSrvPort('25565');
      setLog((l) => l + `[eoncode] ${t('srv.added')}\n`);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const playOn = async (s) => {
    if (!launchInstance) { setLog((l) => l + `[error] ${t('srv.noInst')}\n`); return; }
    setLog((l) => l + `[eoncode] Łączenie z ${s.host}...\n`);
    play(launchInstance, s);
  };

  const loadFriends = async () => {
    try { setFriends(await window.ferro?.friendsPresence()); }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const addFriend = async () => {
    if (!friendName.trim()) return;
    const me = String(account?.name || username || '').toLowerCase();
    if (me && friendName.trim().toLowerCase() === me) {
      setLog((l) => l + `[error] ${t('fr.self')}\n`);
      return;
    }
    try {
      await window.ferro?.friendAdd({ name: friendName.trim() });
      setFriendName('');
      await loadFriends();
      setLog((l) => l + `[eoncode] ${t('fr.added')}\n`);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const removeFriend = async (name) => {
    try { setFriends(await window.ferro?.friendRemove({ name })); }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const joinFriend = async (f) => {
    const s = servers.find((x) => (x.name || x.host) === f.server);
    if (!s) { setLog((l) => l + `[error] ${t('fr.noServer')}\n`); return; }
    playOn(s);
  };

  const scanEssential = async () => {
    const name = essInst || launchInstance || (instances[0] && instances[0].name);
    if (!name) return;
    try { setEssJars(await window.ferro?.essentialScan({ instanceName: name })); }
    catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
  };

  const loadNews = async () => {
    setNewsLoading(true);
    try {
      const r = await window.ferro?.news();
      setNewsList(r.entries || []);
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setNewsLoading(false); }
  };

  const filteredLog = useMemo(() => {
    const lines = log.split('\n');
    return lines.filter((ln) => {
      if (logLevel === 'error' && !/error|exception|caused|fail|FATAL|błąd|nie udało/i.test(ln)) return false;
      if (logLevel === 'warn' && !/warn|ostrzeżenie/i.test(ln)) return false;
      if (logLevel === 'eoncode' && !/^\[(?:eoncode|error)\]/i.test(ln)) return false;
      if (logSearch && !ln.toLowerCase().includes(logSearch.toLowerCase())) return false;
      return true;
    }).join('\n');
  }, [log, logLevel, logSearch]);

  useEffect(() => {
    if (autoScroll && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [filteredLog, autoScroll]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (galName) closeGallery();
      else if (settingsFor) closeModal();
      else if (instModal) closeInstalled();
      else if (createOpen) closeCreate();
      else if (confirmDlg) setConfirmDlg(null);
      else if (dragOn) { dragCount.current = 0; setDragOn(false); }
      else if (tourIdx !== null) endTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [galName, settingsFor, instModal, createOpen, createBusy, confirmDlg, dragOn, tourIdx]);

  // Atajos: F5 jugar/parar, Ctrl+1..0 pestañas, Ctrl+, ajustes (no escribiendo)
  const goTab = (name) => {
    if (name === 'amigos') return;
    setTab(name);
    if (name === 'servers') loadServers();
    else if (name === 'noticias') loadNews();
    else if (name === 'instancias') {loadSizes();loadLoaderStates();}
    else if (name === 'skin') loadSkin();
    else if (name === 'packs' && packSrc==='mr' && packHits.length===0) doPackSearch(1);
    else if (name === 'amigos') { loadServers(); loadFriends(); }
    else if (name === 'cuenta') loadAuth();
    else if (name === 'mods') {if(modsFor)loadMods(modsFor);if(source==='mr' && modHits.length===0 && !searching)doSearch(1);}
  };
  const navigateSection=(name)=>{
    if(tab===name){
      sectionScroll.current[name]=0;if(mainPanel.current)mainPanel.current.scrollTop=0;
      window.dispatchEvent(new CustomEvent('eon-section-reset',{detail:name}));
      if(name==='mods'){setKind('mod');setModQuery('');setModPage(1);if(modsFor)loadMods(modsFor,'mod');if(source==='mr')doSearch(1,{kind:'mod',query:''});}
      if(name==='packs'){setPackPage(1);if(packSrc==='mr')doPackSearch(1);}
      if(name==='instancias'){setInstFilter('');setSettingsFor('');setGalName('');setInstModal(null);}
    }else goTab(name);
  };
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === 'F5') { e.preventDefault(); if (running) stop(); else play(); return; }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === ',') { e.preventDefault(); setTab('ajustes'); return; }
        const tabs = ['jugar', 'versiones', 'instancias', 'mods', 'packs', 'servers', 'cuenta', 'skin'];
        let idx = -1;
        if (e.key >= '1' && e.key <= '9') idx = Number(e.key) - 1;
        else if (e.key === '0') idx = 9;
        if (idx >= 0 && idx < tabs.length) { e.preventDefault(); goTab(tabs[idx]); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const confirmGo = () => { const v = confirmDlg.input ? confirmInput : true; const f = confirmDlg.onOk; setConfirmDlg(null); f(v); };

  useEffect(() => { if (!running) setLaunchProg(null); }, [running]);

  useEffect(() => {
    window.ferro?.onProgress?.((d) => setLaunchProg(d));
    window.ferro?.wallpaper?.().then((r) => { setWp(r?.dataUrl || null); }).catch(() => {});
  }, []);

  useEffect(() => {
    const onDragEnter = (e) => { e.preventDefault(); if (e.dataTransfer?.types?.includes('Files')) { dragCount.current++; setDragOn(true); } };
    const lv = (e) => { e.preventDefault(); dragCount.current = Math.max(0, dragCount.current - 1); if (!dragCount.current) setDragOn(false); };
    const dr = (e) => { e.preventDefault(); };
    const dp = async (e) => {
      e.preventDefault(); dragCount.current = 0; setDragOn(false);
      const files = [...(e.dataTransfer?.files || [])].map((f) => f.path).filter(Boolean);
      if (!files.length) return;
      try {
        const r = await window.ferro?.importDrop({ paths: files, instanceName: modsFor });
        for (const x of r || []) setLog((l) => l + `[eoncode] Zaimportowano plik: ${x.kind}: ${x.name || x.file || ''}${x.error ? ` (${x.error})` : ''}\n`);
        refresh();
      } catch (err) { setLog((l) => l + `[error] ${err.message}\n`); }
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', lv);
    window.addEventListener('dragover', dr);
    window.addEventListener('drop', dp);
    return () => { window.removeEventListener('dragenter', onDragEnter); window.removeEventListener('dragleave', lv); window.removeEventListener('dragover', dr); window.removeEventListener('drop', dp); };
  }, [modsFor]);

  const editSettings = (name, e) => {
    if (settingsFor === name) { setSettingsFor(''); setModalOrigin(null); return; }
    const r = e?.currentTarget?.getBoundingClientRect?.();
    setModalOrigin(r ? { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height } : null);
    setSettingsFor(name);
    const i = instances.find((x) => x.name === name);
    if (i?.settings) {
      setSRam(String(i.settings.ramMb)); setSW(String(i.settings.width)); setSH(String(i.settings.height));
      setSJvm(i.settings.jvmPreset || 'equilibrado'); setDiag(null);
      setSJavaMode(i.settings.javaMode); setSJavaPath(i.settings.javaPath || '');
    }
    loadBackups(name);
    loadCrashes(name);
  };

  const closeModal = () => { setModalClosing(true); setTimeout(() => { setSettingsFor(''); setModalOrigin(null); setModalClosing(false); }, 280); };

  const openInstalled = (which, e) => {
    const r = e?.currentTarget?.getBoundingClientRect?.();
    setInstOrigin(r ? { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height } : null);
    if (which === 'datapacks') loadDpList(dpFor, dpWorld);
    else loadMods(modsFor);
    setInstModal(which);
  };
  const closeInstalled = () => { setInstClosing(true); setTimeout(() => { setInstModal(null); setInstOrigin(null); setInstClosing(false); }, 280); };

  const openCreate = (e) => {
    if (createBusy || launching) { pushToast('info','Poczekaj na zakończenie pobierania.'); return; }
    if (installTarget) { setCreateOpen(true); return; }
    const r = e?.currentTarget?.getBoundingClientRect?.();
    setCreateOrigin(r ? { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height } : null);
    setCreateError(''); setInstallTarget(null); setRamTouched(false); setCreateOpen(true);
  };
  const closeCreate = () => { if (createBusy) return; setCreateOpen(false); setCreateOrigin(null); setCreateClosing(false); };

  const openGallery = async (name, e) => {
    const r = e?.currentTarget?.getBoundingClientRect?.();
    setGalOrigin(r ? { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height } : null);
    setGalName(name);
    setGalShots([]);
    try {
      const list = await window.ferro?.shots({ instanceName: name });
      setGalShots(list.map((s) => ({ ...s, thumb: null })));
      for (const s of list) {
        window.ferro?.shotThumb({ instanceName: name, file: s.file })
          .then((t) => setGalShots((g) => g.map((x) => (x.file === s.file ? { ...x, thumb: t.dataUrl } : x))))
          .catch(() => {});
      }
    } catch (e2) { setLog((l) => l + `[error] ${e2.message}\n`); }
  };

  const closeGallery = () => { setGalClosing(true); setTimeout(() => { setGalName(''); setGalOrigin(null); setGalClosing(false); setGalShots([]); }, 280); };

  const saveSettings = async () => {
    if (!settingsFor || saving) return;
    setSaving(true);
    try {
      await window.ferro?.updateSettings({ instanceName: settingsFor, patch: { ramMb: sRam, width: sW, height: sH, javaMode: sJavaMode, javaPath: sJavaPath, jvmPreset: sJvm } });
      setLog((l) => l + `[eoncode] Zapisano ustawienia: ${settingsFor}\n`);
      refresh();
    } catch (e) { setLog((l) => l + `[error] ${e.message}\n`); }
    finally { setSaving(false); }
  };

  return (
    <div className={"layout"+(consoleOpen?" console-open":"")} style={{"--console-height":`min(${consoleHeight}px, 75vh)`,"--wallpaper-dim":wallpaperDim}}>
      <div className="bg-photo" style={{ backgroundImage: `url(${wp || background})` }} />
      <div className={`side eon-sidebar${sidebarHidden || consoleOpen || editorActive ? ' rail' : ''}`} onClickCapture={e=>{
        const title=e.target.closest('button')?.title;
        const names={'Strona główna':'jugar','Wersje gry':'versiones','Moje instancje':'instancias','Paczki modów':'packs','Aktualności':'noticias','Dla Developerów':'developers','Gra wieloosobowa':'servers','Moje konto':'cuenta','Galeria zrzutów':'gallery','Wygląd postaci':'skin','Ustawienia':'ajustes'};
        if(names[title]){e.stopPropagation();navigateSection(names[title]);}
        if(title==='Modyfikacje'){e.stopPropagation();setContentOpen(true);navigateSection('mods');}
      }}>
        <div className="brand-swap" ref={sideLogoRef}>
          <img className="brand-logo brand-full" src={brand} alt="EonLauncher" />
          <img className="brand-logo brand-mini" src={flMark} alt="EonCode" />
          <button className={`pin${sidePinned ? ' on' : ''}`} onClick={()=>{ const v = !sidePinned; setSidePinned(v); setSideOpen(v); try { localStorage.setItem('ferro-sidepin', v ? '1' : '0'); } catch {} }} title="Przypnij">{sidePinned ? <PinOff size={14} /> : <Pin size={14} />}</button>
        </div>
        <button title="Strona główna" className={tab==='jugar'?'active':''} onClick={()=>setTab('jugar')}><Play size={16} /><span className="nav-label">{t('tab.play')}</span></button>
        <button title="Wersje gry" className={tab==='versiones'?'active':''} onClick={()=>setTab('versiones')}><Layers size={16} /><span className="nav-label">{t('tab.versions')}</span></button>
        <button title="Moje instancje" className={tab==='instancias'?'active':''} onClick={()=>{setTab('instancias'); loadSizes(); loadLoaderStates();}}><Package size={16} /><span className="nav-label">{t('tab.instances')}</span></button>
        <div className="nav-group">
          <button title="Modyfikacje" className={tab==='mods'?'active':''} onClick={()=>{if(sidebarHidden)setSidebarHidden(false);if(!contentOpen){setTab('mods'); setKind('mod'); if(modsFor) loadMods(modsFor, 'mod'); if(source==='mr' && modHits.length===0 && !searching) doSearch(1, {kind:'mod'}); setContentOpen(true);} else setContentOpen(false);}}><LayoutGrid size={16} /><span className="nav-label">{t('tab.content')}</span><ChevronDown size={14} className={'chev' + (contentOpen ? ' open' : '')} /></button>
          {contentOpen && (<>
            <button className={'sub' + (tab==='mods' && kind==='mod' ? ' active' : '')} onClick={()=>{setTab('mods'); setKind('mod'); if(modsFor) loadMods(modsFor, 'mod'); if(source==='mr') doSearch(1, {kind:'mod'});}}><span className="nav-label">{t('mods.tMods')}</span></button>
            <button className={'sub' + (tab==='mods' && kind==='shader' ? ' active' : '')} onClick={()=>{setTab('mods'); setKind('shader'); if(modsFor) loadMods(modsFor, 'shader'); if(source==='mr') doSearch(1, {kind:'shader'});}}><span className="nav-label">{t('mods.tShaders')}</span></button>
            <button className={'sub' + (tab==='mods' && kind==='resourcepack' ? ' active' : '')} onClick={()=>{setTab('mods'); setKind('resourcepack'); if(modsFor) loadMods(modsFor, 'resourcepack'); if(source==='mr') doSearch(1, {kind:'resourcepack'});}}><span className="nav-label">{t('mods.tRp')}</span></button>
          </>)}
        </div>
        <button title="Paczki modów" className={tab==='packs'?'active':''} onClick={()=>{setTab('packs'); if(packSrc==='mr' && packHits.length===0) doPackSearch(1);}}><Gift size={16} /><span className="nav-label">{t('tab.packs')}</span></button>
        <button title="Aktualności" className={tab==='noticias'?'active':''} onClick={()=>{setTab('noticias'); loadNews();}}><Newspaper size={16} /><span className="nav-label">{t('tab.news')}</span></button>
        <div className="eon-nav-label">DEVELOPERZY</div>
        <button title="Dla Developerów" className={tab==='developers'?'active':''} onClick={()=>setTab('developers')}><i className="fa-solid fa-code" aria-hidden="true"/><span className="nav-label">Dla Developerów</span><span className="eon-beta">BETA</span></button>
        <button title="Gra wieloosobowa" className={tab==='servers'?'active':''} onClick={()=>{setTab('servers'); loadServers();}}><Server size={16} /><span className="nav-label">{t('tab.servers')}</span></button>
        <button title="Znajomi — niedostępne" disabled className="friends-unavailable"><Users size={16}/><span className="nav-label">Znajomi <small>Niedostępne</small></span></button>
        <button title="Moje konto" className={tab==='cuenta'?'active':''} onClick={()=>{setTab('cuenta'); loadAuth();}}><User size={16} /><span className="nav-label">{t('tab.account')}</span></button>
        <button title="Galeria zrzutów" className={tab==='gallery'?'active':''} onClick={()=>setTab('gallery')}><Camera size={16}/><span className="nav-label">Galeria zrzutów</span></button>
        <button title="Wygląd postaci" className={tab==='skin'?'active':''} onClick={()=>{setTab('skin'); loadSkin();}}><Palette size={16} /><span className="nav-label">{t('tab.skin')}</span></button>
        <button title="Ustawienia" className={tab==='ajustes'?'active':''} onClick={()=>setTab('ajustes')}><Settings size={16} /><span className="nav-label">{t('tab.settings')}</span></button>
        <div className="player-chip" onClick={()=>setTab('cuenta')} title={t('tab.account')}>
          {playFace ? <img className="face" src={playFace} alt="" onError={()=>setPlayFace(null)} /> : <User size={18} />}
          <div className="pc-id"><b className={account ? 'premium-shine' : ''}>{account?.name || username || '—'}</b><span>{account ? t('play.online') : t('play.offline')}</span></div>
          <span className={`dot ${account ? 'on' : ''}`} />
        </div>
        <div className="ver">v{appVer || '?'} · {t('footerTag')}</div>
      </div>
      <div ref={mainPanel} onScroll={e=>{if(e.target===e.currentTarget)sectionScroll.current[tab]=e.currentTarget.scrollTop;}} className={'main' + (tab==='jugar' ? ' home-main' : '')}>
        <div className="bounce">
        <header className="eon-topbar"><div className="topbar-start"><button className="ghost sidebar-toggle" aria-label={sidebarHidden ? "Rozwiń menu" : "Zwiń menu"} aria-expanded={!sidebarHidden && !consoleOpen} onClick={()=>setSidebarHidden(v=>!v)}><Menu size={16}/></button><span><b>EONCODE</b> / {tab==='jugar'?'STRONA GŁÓWNA':'LAUNCHER'}</span></div><button className="ghost console-toggle" aria-expanded={consoleOpen} onClick={()=>setConsoleOpen(v=>!v)}><i className="fa-solid fa-terminal" aria-hidden="true"/> Konsola gry</button></header>
        <div hidden={tab!=='developers'}><Developers /></div>
        {!installHidden && (createBusy || (installTarget && createError)) && <div className="background-install" role="status"><div><strong>{createBusy?'Instalowanie: ':'Instalacja przerwana: '}{installTarget || instanceName}</strong><small>{createBusy?(launchProg?t('play.ph.'+launchProg.phase):'Przygotowywanie plików…'):createError}</small></div>{createBusy ? <progress aria-label="Postęp instalacji w tle" value={launchProg?.total>0?launchProg.done:undefined} max={launchProg?.total || 1}/> : <><button onClick={create}>Ponów</button><button onClick={()=>{setInstallTarget(null);setCreateError('');}}>Zamknij</button></>}<button className="ghost" onClick={hideInstall} title="Ukryj baner i otwórz logi">Tylko logi</button></div>}
        {installHidden&&(createBusy||createError)&&<div className="install-inline"><span>{createError?'Instalacja wymaga uwagi':'Pobieranie w tle'} · {installTarget||instanceName}</span><button className="ghost" onClick={()=>setConsoleOpen(true)}>Logi</button><button className="ghost" onClick={()=>{setInstallHidden(false);try{localStorage.setItem('eon-install-hidden','0');}catch{}}}>Pokaż postęp</button></div>}
        <div hidden={tab!=='gallery'}><ScreenshotGallery instances={instances} onWallpaper={setWp}/></div>
        {fileProfile&&<ServerFileEditor server={{name:fileProfile,instance:true}} onClose={()=>setFileProfile(null)}/>}
        {tab==='jugar' && (<div className="eon-home">
          <section className="eon-welcome home-profiles"><div className="profiles-heading"><div><span className="eon-eyebrow">MINECRAFT · JAVA EDITION</span><h1>Twoje profile</h1></div><button className="ghost profile-add" title="Nowy profil" aria-label="Nowy profil" onClick={openCreate}><Plus size={16}/></button></div>
            {instances.length?<div className="home-profile-list">{instances.slice().sort((a,b)=>Number(b.name===launchInstance)-Number(a.name===launchInstance)).slice(0,3).map(i=><button key={i.name} className={'home-profile-card'+(i.name===launchInstance?' selected':'')} onClick={()=>setLaunchInstance(i.name)} aria-pressed={i.name===launchInstance}><span className="profile-block"><i className="fa-solid fa-cube"/></span><span className="profile-text"><strong>{i.name}</strong><small>{i.versionId} · {i.type==='vanilla'?'Vanilla':i.type} · {(i.settings?.ramMb||2048)/1024} GB RAM</small></span>{i.name===launchInstance&&<Check size={14}/>}</button>)}</div>:<div className="home-profile-empty"><i className="fa-solid fa-cubes"/><p>Dodaj pierwszy profil i rozpocznij przygodę.</p></div>}
            <div className="profile-links"><button className="eon-link" onClick={()=>setTab('instancias')}>Zarządzaj profilami <span>{instances.length}</span></button><button className="eon-link" onClick={()=>setTab('gallery')}><Camera size={12}/> Galeria</button></div>
          </section>
          <div className={`card hero hero-${(() => { const s = instances.find((i)=>i.name===launchInstance); return s ? s.type : 'vanilla'; })()}`}>
            <div className="hero-top">
              {playFace && <img className="face xl" src={playFace} alt="" onError={()=>setPlayFace(null)} />}
              <div className="hero-id">
                <div className="hero-kicker">{account ? `${account.name} · ${t('play.online')}` : `${username || '—'} · ${t('play.offline')}`}</div>
                <div className="hero-title">{launchInstance || 'Twój pierwszy profil'}</div>
                <div className="meta">
                  {(() => { const s = instances.find((i)=>i.name===launchInstance); return s ? (<>
                    <span className="pill">{s.versionId}</span>
                    <span className={`pill l-${s.type}`}>{s.type==='vanilla' ? 'vanilla' : `${s.type} ${s.loaderVersion||''}`}</span>
                    <span className="pill">{((s.settings?.ramMb||2048)/1024)} GB</span>
                    {(() => { const tt = instances.reduce((a, i) => a + (i.playSecs || 0), 0); return tt >= 60 ? (<span className="pill">{fmtPlay(tt)}</span>) : null; })()}
                  </>) : null; })()}
                  {running && <span className="pill green"><span className="spinner" />{t('play.running')}</span>}
                </div>
              </div>
              <div className="hero-play" data-tour="play">
                  {!running
                    ? <button className="primary" onClick={e=>instances.length ? play() : openCreate(e)} disabled={launching || createBusy || (instances.length>0 && !launchInstance)}>{instances.length ? <Play size={18} /> : <Download size={18}/>} {launching ? 'Przygotowywanie…' : instances.length ? t('play.play') : 'Zainstaluj Minecraft'}</button>
                  : <button className="primary" onClick={stop} ><Square size={18} /> {t('play.stop')}</button>}
              </div>
            </div>
            {running&&<div className="game-session"><span className="session-dot"/><div><strong>Minecraft jest uruchomiony</strong><small>Miłej gry! Launcher pozostaje do Twojej dyspozycji.</small></div><button className="ghost" onClick={()=>setConsoleOpen(true)}>Otwórz logi</button><button className="ghost" onClick={()=>setTab('gallery')}>Galeria</button></div>}
            <div className="row hero-controls" hidden={running}>
              {!account && <input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder={t('play.userPh')} />}
              <select aria-label="Aktywna instancja" value={launchInstance} onChange={(e)=>setLaunchInstance(e.target.value)}>
                {!instances.length && <option value="">Utwórz pierwszą instancję</option>}
                {instances.map((i)=><option key={i.name} value={i.name}>{i.name} ({i.versionId}{i.type==='vanilla'?'':' · '+i.type})</option>)}
              </select>
              <button className="ghost" onClick={refresh}><RefreshCw size={14} /> {t('play.reload')}</button>
            </div>
            {!running && !account && nameState.status !== 'idle' && (
              <div className="row" style={{marginTop:8}}>
                {nameState.status === 'checking' && <span className="pill"><span className="spinner" />{t('play.checkingName')}</span>}
                {nameState.status === 'free' && <span className="pill green"><Check size={12} /> Nick gotowy do gry offline</span>}
                {nameState.status === 'invalid' && <span className="pill">{t('play.nameInvalid')}</span>}
                {nameState.status === 'unknown' && <span className="pill">{t('play.nameUnknown')}</span>}
                {nameState.status === 'taken' && <><span className="pill">{t('play.nameTaken')}</span>{nameState.suggestions.map((s)=><button key={s} className="mini" onClick={()=>setUsername(s)}>{s}</button>)}</>}
              </div>
            )}
            
          {launchProg && launchProg.done != null && launchProg.total > 0 && (
            <div className="card home-progress" style={{marginTop:8}}>
              <div className="row"><span>{t('play.ph.' + launchProg.phase) || launchProg.phase}</span><span>{launchProg.done}/{launchProg.total}{launchProg.extra ? ` · ${launchProg.extra}` : ''}</span></div>
              <div style={{height:8, borderRadius:6, background:'rgba(255,255,255,.08)', overflow:'hidden', marginTop:6}}>
                <div style={{height:'100%', width:`${Math.min(100, Math.round(100 * launchProg.done / Math.max(1, launchProg.total)))}%`, background:'#409af0'}} />
              </div>
            </div>
          )}
          </div>
          <PlayerPreview name={account?.name || username || ""} uuid={account?.uuid} />
          <div className="eon-home-grid"><article className="card eon-news"><div className="news-copy"><span className="eon-eyebrow">MINECRAFT · CO NOWEGO</span><h2>{versions[0] ? 'Odkryj Minecraft ' + versions[0].id : 'Świat pełen możliwości'}</h2><p>Sprawdź dostępne wersje gry i przygotuj swoją kolejną przygodę.</p><button className="eon-link" onClick={()=>{setTab('noticias');loadNews();}}>Aktualności Minecraft ↗</button></div><img className="news-art" src={background} alt="" loading="lazy"/></article></div>

        </div>)}
        {consoleOpen && <section className="console-dock" aria-label="Konsola gry"><div className="console-resizer" role="separator" aria-label="Zmień wysokość konsoli" aria-orientation="horizontal" aria-valuenow={consoleHeight} aria-valuemin={160} aria-valuemax={Math.round(window.innerHeight*.75)} tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();setConsoleHeight(h=>Math.max(160,Math.min(window.innerHeight*.75,h+(e.key==='ArrowUp'?20:-20))));}}} onPointerDown={e=>{if(e.button!==0)return;consoleDrag.current={y:e.clientY,height:e.currentTarget.parentElement.getBoundingClientRect().height};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={resizeConsole} onPointerUp={()=>{consoleDrag.current=null;}} onPointerCancel={()=>{consoleDrag.current=null;}} onLostPointerCapture={()=>{consoleDrag.current=null;}}/><div className="console-dock-head"><strong><i className="fa-solid fa-terminal"/> Konsola gry</strong><span className="console-resize-hint">Przeciągnij górną krawędź</span><button className="mini" aria-label="Zamknij konsolę" onClick={()=>setConsoleOpen(false)}><X size={14}/></button></div><div className="eon-console">

            <div className="row" style={{marginBottom:8}}>
              <select aria-label="Poziom logów" value={logLevel} onChange={(e)=>setLogLevel(e.target.value)}>
                <option value="todo">{t('play.lvAll')}</option>
                <option value="eoncode">{t('play.lvEoncode')}</option>
                <option value="warn">{t('play.lvWarn')}</option>
                <option value="error">{t('play.lvError')}</option>
              </select>
              <input value={logSearch} onChange={(e)=>setLogSearch(e.target.value)} placeholder={t('play.filterPh')} />
              <button className="mini" onClick={()=>setAutoScroll(!autoScroll)}>{autoScroll ? "✓ Przewijaj automatycznie" : "Przewijaj automatycznie"}</button>
              <button className="mini" onClick={()=>setLog('')}>{t('play.clear')}</button>
            </div>
            <div className="log" ref={logRef}>{filteredLog}</div>
          </div></section>}
        {tab==='versiones' && (
          <div className="card">
            <h2>{t('ver.title')}</h2>
            <div className="row" style={{marginBottom:10}}>
              {['release','snapshot','all'].map((k)=><button key={k} className="mini" disabled={verKind===k} onClick={()=>loadVers(k)}>{t('ver.'+k)}</button>)}
            </div>
            <div className="grid">
              {versions.map((v)=><div key={v.id} className="card"><div className="card-title">{v.id}</div><div className="meta"><span className="pill">{({release:'Stabilna',snapshot:'Testowa',old_beta:'Archiwalna beta',old_alpha:'Archiwalna alfa'})[v.type] || v.type}</span><span className="pill">{new Date(v.releaseTime).toLocaleDateString()}</span></div></div>)}
            </div>
          </div>
        )}
        {tab==='instancias' && (
          <div className="card">
            <h2>{t('inst.createTitle')}</h2>
            <div className="row" data-tour="create">
              <button className="primary" onClick={(e)=>openCreate(e)}><Plus size={14} /> {t('inst.create')}</button>
            </div>
            <h3>{t('inst.installed')} ({instances.length})</h3>
            <div className="row" style={{marginBottom:10}}>
              <input value={instFilter} onChange={(e)=>setInstFilter(e.target.value)} placeholder={t('inst.filterPh')} />
            </div>
            <div className="grid">
              {instances.filter((i)=>i.name.toLowerCase().includes(instFilter.toLowerCase())).map((i)=><div key={i.name} className={"card" + (exploding === i.name ? " exploding" : "")}><div className="card-title" title={i.name} onDoubleClick={()=>play(i.name)} style={{cursor:'pointer'}}>{i.name}</div><div className="meta"><span className="pill">{i.versionId}</span>{szMap[i.name] ? <span className="pill">{szMap[i.name]}</span> : (szLoading && <span className="pill"><span className="spinner" /></span>)}<span className={`pill l-${i.type}`}>{i.type==='vanilla' ? 'vanilla' : `${i.type} ${i.loaderVersion||''}`}</span><span className="pill">{(i.settings?.ramMb||2048)/1024} GB · {i.settings?.width||854}×{i.settings?.height||480}</span>{i.lastPlayed ? <span className="pill"><Play size={12} /> {new Date(i.lastPlayed).toLocaleDateString()}{i.plays ? ` · ${i.plays}×` : ''}{fmtPlay(i.playSecs) ? ` · ${fmtPlay(i.playSecs)}` : ''}</span> : <span className="pill">{t('inst.neverPlayed')}</span>}</div><div className="actions"><button className="ghost" onClick={async()=>{await window.ferro?.updateSettings({instanceName:i.name, patch:{pinned:!i.settings?.pinned}}); refresh();}} title={t('inst.fav')}>{i.settings?.pinned ? <Star size={14} fill="currentColor" /> : <Star size={14} />}</button>{ldState[i.name]?.checking && <span className="pill" title={t('ld.checking')}><span className="spinner" /></span>}{ldState[i.name]?.outdated && !ldState[i.name]?.checking && <button className="mini hot" onClick={()=>updateLoader(i.name)} title={`${t('ld.update')}: ${ldState[i.name]?.latest || ''}`}><RefreshCw size={12} /> {t('ld.update')}</button>}<DotsMenu><button className="ghost" disabled={createBusy} onClick={()=>setFileProfile(i.name)}><FolderOpen size={14}/> Edytor plików</button><button className="ghost" onClick={(e)=>editSettings(i.name, e)}><Settings size={14} /> {t('inst.settings')}</button><button className="ghost" onClick={(e)=>openGallery(i.name, e)}><Camera size={14} /> {t('inst.shots')}</button><button className="ghost" onClick={async()=>{await window.ferro?.exportInstance({instanceName:i.name});}}><Upload size={14} /> {t('inst.export')}</button><button className="ghost" onClick={async()=>{await window.ferro?.openFolder({instanceName:i.name});}}><FolderOpen size={14} /> {t('inst.folder')}</button><button className="ghost" onClick={()=>askConfirm(t('sz.cleanAsk', {n:i.name}), ()=>cleanInstance(i.name))}><Trash2 size={14} /> {t('sz.clean')}</button><button className="ghost" onClick={async()=>{await window.ferro?.duplicateInstance({instanceName:i.name}); refresh();}}><Copy size={14} /> {t('inst.duplicate')}</button><button className="ghost" onClick={()=>askRename(i.name, async (n)=>{await window.ferro?.renameInstance({instanceName:i.name, newName:n}); refresh();})}><Pencil size={14} /> {t('inst.rename')}</button><button className="ghost danger" onClick={(e)=>{ const card = e.currentTarget.closest('.card'); askConfirm(t('inst.delConfirm', {n:i.name}), ()=>explodeInstance(i.name, card)); }}><Trash2 size={14} /> {t('inst.delete')}</button></DotsMenu></div>
</div>)}
            </div>
            <div className="row" style={{marginTop:12}}>
              <button className="primary" onClick={async()=>{const n=await window.ferro?.importInstance(); if(n){setLog((l)=>l+`[eoncode] Zaimportowano ${n}\n`); refresh();}}}><Upload size={14} /> {t('inst.import')}</button>
              <button className="ghost" onClick={async()=>{try{setImpScan(await window.ferro?.importScan());}catch(e){setLog((l)=>l+`[error] ${e.message}\n`);}}}><Download size={14} /> {t('inst.importOther')}</button>
            </div>
            {impScan && (<div className="card" style={{marginTop:8}}>
              {impScan.vanilla && (<><div className="subhead"><span>Vanilla ({impScan.vanilla.versions?.length||0})</span></div><div className="sublist">{(impScan.vanilla.versions||[]).slice(0,12).map((v)=><div key={v.id} className="subrow"><span className="grow">{v.id}</span><button className="mini" onClick={async()=>{try{const r=await window.ferro?.importVanilla({versionId:v.id}); setLog((l)=>l+`[eoncode] ${t('inst.imported')}: ${r.name}\n`); refresh();}catch(e){setLog((l)=>l+`[error] ${e.message}\n`);}}}>{t('inst.import')}</button></div>)}</div></>)}
              {['prism','multimc'].map((k)=>(impScan[k] && <div key={k}><div className="subhead"><span style={{textTransform:'capitalize'}}>{k} ({impScan[k].instances?.length||0})</span></div><div className="sublist">{(impScan[k].instances||[]).map((i)=><div key={i.name} className="subrow"><span className="grow" title={i.path}>{i.name} · {i.mc||'?'} {i.loader?`+ ${i.loader.type}`:''}</span><button className="mini" onClick={async()=>{try{const r=await window.ferro?.importPrism({from:k, instPath:i.name}); setLog((l)=>l+`[eoncode] ${t('inst.imported')}: ${r.name}\n`); refresh();}catch(e){setLog((l)=>l+`[error] ${e.message}\n`);}}}>{t('inst.import')}</button></div>)}</div></div>))}
              {!impScan.vanilla && !impScan.prism && !impScan.multimc && <p style={{opacity:.6}}>{t('inst.impNone')}</p>}
            </div>)}
          </div>
        )}
        {tab==='mods' && (
          <div className="card">
            <h2>{kind==='shader' ? t('mods.tShaders') : kind==='resourcepack' ? t('mods.tRp') : t('mods.title')}</h2>
            <div className="row" data-tour="mods-search">
              <select value={source} onChange={(e)=>{setSource(e.target.value); setModHits([]); setCfHits([]); setModPage(1); if(e.target.value==='cf') loadCfKey(); else doSearch(1);}} title="Źródło">
                <option value="mr">Modrinth</option>
                <option value="cf">CurseForge</option>
              </select>
              <select value={modsFor} onChange={(e)=>{setModsFor(e.target.value); setUpdMap({}); setUpdMsg(''); setRpOn(null); setShaderCur(null); loadMods(e.target.value);}}>
                {instances.map((i)=><option key={i.name} value={i.name}>{i.name} ({i.versionId}{i.type==='vanilla'?'':' '+i.type})</option>)}
              </select>
              <input value={modQuery} onChange={(e)=>setModQuery(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter') doSearch(1);}} placeholder={`Szukaj ${kindName}...`} />
              <select value={fVersion} onChange={(e)=>{touchedVer.current.filter=true; setFVersion(e.target.value); if(source==='mr') doSearch(1, {mcVersion:e.target.value});}} title="Wersja Minecraft">
                {versions.map((v)=><option key={v.id} value={v.id}>{v.id}</option>)}
              </select>
              {kind==='mod' && (
              <select value={fLoader} onChange={(e)=>{setFLoader(e.target.value); if(source==='mr') doSearch(1, {loader:e.target.value});}} title="Loader">
                <option value="fabric">Fabric</option>
                <option value="quilt">Quilt</option>
                <option value="forge">Forge</option>
                <option value="neoforge">NeoForge</option>
              </select>
              )}
              <select value={fSort} onChange={(e)=>{setFSort(e.target.value); if(source==='mr') doSearch(1, {sort:e.target.value});}} title="Sortowanie">
                <option value="relevance">{t('mods.sRelevance')}</option>
                <option value="downloads">{t('mods.sDownloads')}</option>
                <option value="follows">{t('mods.sFollows')}</option>
                <option value="newest">{t('mods.sNewest')}</option>
                <option value="updated">{t('mods.sUpdated')}</option>
              </select>
              <button className="primary" onClick={()=>{source==='cf' ? doCfSearch() : doSearch(1);}} disabled={searching || !modsFor}>{searching ? t('mods.searching') : <><Search size={14} /> {t('mods.search')}</>}</button>
              {source==='cf' && <button className="ghost" onClick={doCfTrending} disabled={searching}>Popularne</button>}
              <button className="mini" onClick={(e)=>openInstalled('mods', e)} disabled={!modsFor}>{t('mods.viewInstalled')} ({mods.length})</button>
            </div>
            {source==='cf' && (
            <div className="row" style={{marginTop:8}}>
              <input value={cfKeyInput} onChange={(e)=>setCfKeyInput(e.target.value)} type="password" placeholder="Klucz API CurseForge…" style={{minWidth:260}} />
              <button className="mini" onClick={async()=>{await window.ferro?.cfSetKey({key:cfKeyInput}); setCfKeyInput(''); loadCfKey(); setLog((l)=>l+"[eoncode] Zapisano klucz CurseForge\n");}}>{t('acct.save')}</button>
              {cfKeySet ? <span className="pill green">Klucz {cfKeySet}</span> : <span className="pill">console.curseforge.com → klucze API</span>}
            </div>
            )}
            {!modsFor && <p>{t('mods.needLoader')}</p>}
            <h3>{t('mods.results')}{modTotal>0 && ` (${modTotal.toLocaleString()})`} · {fVersion} · {fLoader}</h3>
            {modHits.length===0 && <p style={{opacity:.6}}>{t('mods.noResults')}</p>}
            {source==='mr' && <Pager t={t} page={modPage} total={modTotal} busy={searching} onPage={(p)=>doSearch(p)} />}
            <div className="grid">
              {modHits.map((m)=>{
                const busy = installingId===m.id;
                const done = installedIds.includes(m.id);
                return (
                <div key={m.id} className="card">
                  <div className="mod-head">{m.icon && <img className="mod-icon" src={m.icon} alt="" />}<b>{m.title}</b></div>
                  <div className="desc">{m.description?.slice(0,120)}</div>
                  <div className="meta"><span className="pill"><Download size={12} /> {m.downloads?.toLocaleString?.() || m.downloads}</span>{m.updated && <span className="pill">↻ {new Date(m.updated).toLocaleDateString()}</span>}{m.client==='required' && <span className="pill green">{t('mods.client')}</span>}</div>
                  <div className="actions">
                    <button className={done ? 'mini ok' : 'mini hot'} disabled={busy || done || !modsFor} onClick={()=>doInstall(m.id, m.title)}>
                      {busy ? <><span className="spinner" />{t('mods.installing')}</> : done ? <><Check size={12} /> {t('mods.installedDone')}</> : <><Download size={12} /> {t('mods.install')}</>}
                    </button>
                  </div>
                </div>);
              })}
            </div>
            {source==='mr' && <Pager t={t} page={modPage} total={modTotal} busy={searching} onPage={(p)=>doSearch(p)} />}
            {source==='cf' && kind==='shader' && <p style={{opacity:.65}}>Shadery są dostępne w Modrinth. Zmień źródło wyszukiwania.</p>}
            {source==='cf' && (<>
            <h3>CurseForge{cfTotal>0 && ` (${cfTotal.toLocaleString()})`} · {fVersion}</h3>
            {cfHits.length===0 && <p style={{opacity:.6}}>{t('mods.noResults')}</p>}
            <div className="grid">
              {cfHits.map((m)=>(
                <div key={m.id} className="card">
                  <div className="mod-head">{m.icon && <img className="mod-icon" src={m.icon} alt="" />}<b>{m.title}</b></div>
                  <div className="desc">{m.description?.slice(0,120)}</div>
                  <div className="meta"><span className="pill"><Download size={12} /> {m.downloads?.toLocaleString?.() || m.downloads}</span>{m.updated && <span className="pill">↻ {new Date(m.updated).toLocaleDateString()}</span>}</div>
                  <div className="actions"><button className="mini" onClick={()=>doCfFiles(m.id)}>{t('packs.versions')}</button></div>
                  {(cfFiles[m.id]||[]).length>0 && (
                  <div className="vers">
                  {(cfFiles[m.id]||[]).map((f)=>(
                    <div className="meta" key={f.id}>
                      <span className="pill">{f.name.length > 26 ? f.name.slice(0,25)+'…' : f.name}</span>
                      <button className="mini hot" disabled={cfBusy===f.id || !modsFor} onClick={()=>doCfInstall(m, f)}>
                        {cfBusy===f.id ? <><span className="spinner" />{t('mods.installing')}</> : t('mods.install')}
                      </button>
                    </div>
                  ))}
                  </div>)}
                  {cfFiles[m.id] && cfFiles[m.id].length===0 && <p style={{opacity:.6}}>Brak plików dla {fVersion}.</p>}
                </div>
              ))}
            </div>
            </>)}
            {/* instalados en ventana */}
          </div>
        )}
        {tab==='datapacks' && (
          <div className="card">
            <h2>{t('dp.title')}</h2>
            <div className="row" data-tour="dp-search">
              <select value={dpFor} onChange={(e)=>{setDpFor(e.target.value); setDpWorld(''); setDpList([]); setDpHits([]);}}>
                {instances.map((i)=><option key={i.name} value={i.name}>{i.name} ({i.versionId})</option>)}
              </select>
              <select value={dpWorld} onChange={(e)=>{setDpWorld(e.target.value); if(dpHits.length===0 && !dpSearching) dpSearch(1);}} disabled={!dpWorlds.length}>
                {dpWorlds.map((w)=><option key={w} value={w}>{w}</option>)}
              </select>
              <input value={dpQuery} onChange={(e)=>setDpQuery(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter') dpSearch(1);}} placeholder={t('dp.searchPh')} style={{minWidth:200}} />
              <button className="primary" onClick={()=>dpSearch(1)} disabled={dpSearching || !dpFor}>{dpSearching ? t('mods.searching') : <><Search size={14} /> {t('dp.search')}</>}</button>
              <button className="mini" onClick={(e)=>openInstalled('datapacks', e)} disabled={!dpWorld}>{t('dp.viewInstalled')} ({dpList.length})</button>
            </div>
            {dpFor && !dpWorlds.length && <p style={{opacity:.6}}>{t('dp.noWorld')}</p>}
            {dpHits.length>0 && (<>
            <h3>Modrinth</h3>
            <Pager t={t} page={dpPage} total={dpTotal} busy={dpSearching} onPage={(p)=>dpSearch(p)} />
            <div className="grid">
              {dpHits.map((m)=>(
                <div key={m.id} className="card">
                  <div className="mod-head">{m.icon && <img className="mod-icon" src={m.icon} alt="" />}<b>{m.title}</b></div>
                  <div className="desc">{m.description?.slice(0,120)}</div>
                  <div className="meta"><span className="pill"><Download size={12} /> {m.downloads?.toLocaleString?.() || m.downloads}</span>{m.updated && <span className="pill">↻ {new Date(m.updated).toLocaleDateString()}</span>}</div>
                  <div className="actions"><button className="mini hot" disabled={!dpWorld} onClick={()=>dpInstall(m)}><Download size={12} /> {t('dp.install')}</button></div>
                </div>))}
            </div>
            <Pager t={t} page={dpPage} total={dpTotal} busy={dpSearching} onPage={(p)=>dpSearch(p)} />
            </>)}
            {/* instalados en ventana */}
          </div>
        )}
        {tab==='noticias' && (
          <div className="card">
            <h2>{t('nw.title')}</h2>
            <div className="row" data-tour="news-list">
              <button className="ghost" onClick={loadNews} disabled={newsLoading}><RefreshCw size={14} /> {t('nw.refresh')}</button>
              {newsLoading && <span className="pill"><span className="spinner" /></span>}
            </div>
            <div className="grid" style={{marginTop:10}}>
              {newsList.map((n)=>(
                <div key={n.id} className="card">
                  {n.image && <img src={n.image} alt="" style={{width:'100%', borderRadius:12, marginBottom:8}} loading="lazy" />}
                  <div className="mod-head"><b>{n.title}</b></div>
                  <div className="meta"><span className="pill">{n.category}</span>{n.date && <span className="pill">{n.date}</span>}</div>
                  <div className="desc">{n.text?.slice(0,140)}</div>
                  <div className="actions"><button className="mini hot" onClick={()=>window.ferro?.openUrl({url:n.url})}><ExternalLink size={12} /> {t('nw.read')}</button></div>
                </div>))}
            </div>
            {!newsLoading && newsList.length===0 && <p style={{opacity:.6}}>{t('nw.none')}</p>}
          </div>
        )}
        {tab==='packs' && (
          <div className="card">
            <h2>{t('packs.title')}</h2>
            <div className="row">
              <select value={packSrc} onChange={(e)=>{setPackSrc(e.target.value); setPackHits([]); setPackTotal(0); setPackVers({}); setCfPackVers({}); setPackPage(1); if(e.target.value==='mr') doPackSearch(1);}} title="Źródło">
                <option value="mr">Modrinth</option>
                <option value="cf">CurseForge</option>
              </select>
              <select value={packMc} onChange={(e)=>{touchedVer.current.pack=true; setPackMc(e.target.value); if(packSrc==='mr') doPackSearch(1, {mcVersion:e.target.value});}}>
                {versions.map((v)=><option key={v.id} value={v.id}>{v.id}</option>)}
              </select>
              <input value={packQuery} onChange={(e)=>setPackQuery(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter') doPackSearch(1);}} placeholder={t('packs.searchPh')} />
              <select value={packLoader} onChange={(e)=>{setPackLoader(e.target.value); if(packSrc==='mr') doPackSearch(1, {loader:e.target.value});}} title="Loader">
                <option value="">{t('packs.loaderAll')}</option>
                <option value="fabric">Fabric</option>
                <option value="quilt">Quilt</option>
                <option value="forge">Forge</option>
                <option value="neoforge">NeoForge</option>
              </select>
              <select value={packSort} onChange={(e)=>{setPackSort(e.target.value); if(packSrc==='mr') doPackSearch(1, {sort:e.target.value});}} title="Sortowanie">
                <option value="relevance">{t('mods.sRelevance')}</option>
                <option value="downloads">{t('mods.sDownloads')}</option>
                <option value="follows">{t('mods.sFollows')}</option>
                <option value="newest">{t('mods.sNewest')}</option>
                <option value="updated">{t('mods.sUpdated')}</option>
              </select>
              <button className="primary" onClick={()=>{packSrc==='cf' ? doCfPackSearch() : doPackSearch(1);}}><Search size={14} /> {t('packs.search')}</button>
            </div>
            <p style={{opacity:.65}}>{packTotal>0 ? `${packTotal.toLocaleString()} wyników · ` : ''}{packMc}{packLoader ? ` · ${packLoader}` : ''}. Instalacja utworzy instancję z odpowiednią wersją gry i loaderem. Postęp zobaczysz na stronie głównej.</p>
            {packSrc==='mr' && <Pager t={t} page={packPage} total={packTotal} busy={false} onPage={(p)=>doPackSearch(p)} />}
            <div className="grid">
              {packHits.map((p)=>(
                <div key={p.id} className="card">
                  <div className="mod-head">{p.icon && <img className="mod-icon" src={p.icon} alt="" />}<b>{p.title}</b></div>
                  <div className="desc">{p.description?.slice(0,120)}</div>
                  <div className="meta"><span className="pill"><Download size={12} /> {p.downloads?.toLocaleString?.() || p.downloads}</span>{p.updated && <span className="pill">↻ {new Date(p.updated).toLocaleDateString()}</span>}</div>
                    <div className="actions"><button className="ghost" onClick={()=>{packSrc==='cf' ? doCfPackVers(p.id) : doPackVers(p.id)}}>{(packSrc==='cf' ? cfPackVers[p.id] : packVers[p.id]) ? t('mods.hide') : t('packs.versions')}</button></div>
                  {((packSrc==='cf' ? (cfPackVers[p.id]||[]) : (packVers[p.id]||[])).length>0 || (packVers[p.id]||[]).length>0) && (
                  <div className="vers">
                  {packSrc==='cf' && (cfPackVers[p.id]||[]).map((v)=>(
                    <div className="meta" key={v.id}>
                      <span className="pill">{v.number || v.name}</span>
                      {(v.loaders||[]).map((ld)=><span className="pill" key={ld}>{ld}</span>)}
                      {(v.game||[]).slice(0,3).map((g)=><span className="pill" key={g}>{g}</span>)}
                      <button className="mini hot" disabled={!!cfPackBusy} onClick={()=>doCfPackInstall(p, v)}>{cfPackBusy===v.id ? <><span className="spinner" />{t('mods.installing')}</> : t('mods.install')}</button>
                    </div>
                  ))}
                  {packSrc==='mr' && (packVers[p.id]||[]).map((v)=>(
                    <div className="meta" key={v.id}>
                      <span className="pill">{v.number}</span>
                      {(v.loaders||[]).map((ld)=><span className="pill" key={ld}>{ld}</span>)}
                      {(v.game||[]).slice(0,3).map((g)=><span className="pill" key={g}>{g}</span>)}
                      <button className="mini hot" disabled={!!packBusy} onClick={()=>doPackInstall(p, v)}>
                        {packBusy===v.id ? <><span className="spinner" />{t('mods.installing')}</> : t('mods.install')}
                      </button>
                    </div>
                  ))}
                  </div>)}
                </div>
              ))}
            </div>
            {packSrc==='mr' && <Pager t={t} page={packPage} total={packTotal} busy={false} onPage={(p)=>doPackSearch(p)} />}
          </div>
        )}
        {tab==='cuenta' && (
          <div className="card">
            <h2>{t('acct.title')}</h2>
            <p>{t('acct.desc')}</p>
            <p className="auth-simple-hint">Konto Microsoft zapewnia dostęp do serwerów premium. Profil offline służy do gry lokalnej i testów.</p>
            <form className="auth-simple-card" onSubmit={async e=>{e.preventDefault();try{const nick=offlineDraft.trim();if(!/^[A-Za-z0-9_]{3,16}$/.test(nick))throw new Error('Nick musi mieć 3–16 liter, cyfr lub znaków _.');if(!window.ferro)throw new Error('Uruchom aplikację desktopową.');await window.ferro.authSelect({uuid:null});setUsername(nick);localStorage.setItem('ferro-username',nick);setAccount(null);await loadAuth();pushToast('success','Aktywowano profil offline: '+nick);}catch(err){pushToast('error',err.message);}}}>
              <div><h3>Profil offline (nonpremium)</h3><p>Zapisany nick: {username||'Nie ustawiono'} · {!account?'Aktywny':'Nieaktywny'}</p></div>
              <label>Nick gracza<input aria-label="Nick profilu offline" minLength={3} maxLength={16} pattern="[A-Za-z0-9_]{3,16}" required value={offlineDraft} onChange={e=>setOfflineDraft(e.target.value)} placeholder="Twój nick"/></label>
              <button className="ghost" type="submit" disabled={browserWaiting||!!authStep}>Zapisz i graj offline</button>
            </form>
            <h3>{t('acct.accounts')} ({accts.length})</h3>
            {accts.length===0 && <p style={{opacity:.6}}>{t('acct.noAccounts')}</p>}
            <div className="grid">
              {accts.map((a)=><div key={a.uuid} className="card"><div className="mod-head"><img className="face" src={`https://visage.surgeplay.com/face/64/${a.uuid.replace(/-/g,'')}`} alt="" onError={(e)=>{e.currentTarget.src=`https://minotar.net/helm/${a.uuid.replace(/-/g,'')}/64.png`;}} /><div className="card-title">{a.name}</div></div><div className="meta">{a.active && <span className="pill green">✓ {t('acct.active')}</span>}</div><div className="actions">
                {!a.active && <button className="mini" onClick={async()=>{await window.ferro?.authSelect({uuid:a.uuid}); loadAuth();}}>{t('acct.use')}</button>}
                <button className="mini danger" onClick={async()=>{await window.ferro?.authRemove({uuid:a.uuid}); loadAuth();}}><X size={12} /> {t('acct.remove')}</button>
              </div></div>)}
            </div>
            <h3>{t('acct.status')}</h3>
            {account && !browserWaiting && !authStep
              ? <><div className="row"><span key={loginFx} className={`pill green${loginFx ? ' login-pop' : ''}`}>✓ {account.name}</span><button className="ghost danger" onClick={doLogout}>{t('acct.logout')}</button></div>
                {!browserWaiting && !authStep && <p style={{marginTop:10}}><button className="ghost" onClick={doBrowserAuth}>{t('acct.addAnother')}</button></p>}</>
              : browserWaiting
                ? <div className="card">
                    <p><span className="spinner" />{t('acct.waitBrowser')}</p>
                    <button className="ghost" onClick={cancelBrowserAuth}>{t('acct.cancel')}</button>
                  </div>
                : !authStep
                  ? <div className="row" data-tour="account-login">
                      <button className="primary" onClick={doBrowserAuth}>{t('acct.login')}</button>
                    </div>
                  : null}
            {!browserWaiting && (
              !authStep
                ? <details className="auth-fallback">
                    <summary>{t('acct.help')}</summary>
                    <p><button className="ghost" onClick={doAuthStart} disabled={!idInfo.configured}>{t('acct.altMethod')}</button></p>
                  </details>
                : <div className="card">
                    <p>1. {t('acct.step1')} <b>{authStep.verificationUri}</b></p>
                    <p>2. {t('acct.step2')} <b style={{fontSize:22, letterSpacing:2}}>{authStep.userCode}</b></p>
                    <p style={{opacity:.65}}><span className="spinner" />{t('acct.waiting')} ({t('acct.checkN')} {pollCount})</p>
                    <div className="row">
                      <button className="mini" onClick={()=>doAuthPollOnce()}>{t('acct.checkNow')}</button>
                      <button className="mini" onClick={()=>{stopPoll(); setAuthStep(null);}}>{t('acct.cancel')}</button>
                    </div>
                  </div>)}
          </div>
        )}
        {tab==='skin' && (
          <div className="card">
            <h2>{t('skin.title')}</h2>
            <div className="row">
              <input value={skinName} onChange={(e)=>setSkinName(e.target.value)} placeholder={t('skin.namePh')} />
              <button className="mini" onClick={()=>loadSkin()}>{t('skin.view')}</button>
              {skinInfo?.online && <span className="pill green">✓ {t('skin.online')}</span>}
            </div>
            {!skinInfo && <p style={{opacity:.65}}>{t('skin.pressView')}</p>}
            {skinInfo?.note && <p style={{opacity:.65}}>{skinInfo.note}</p>}
            {skinInfo?.renders && (
              <div className="row" style={{alignItems:'flex-start', marginTop:12}}>
                <div className="card" style={{margin:0}}><div className="card-title">{skinInfo.name}</div><div className="meta"><span className="pill">{skinInfo.variant === 'slim' ? 'smukła' : 'klasyczna'}</span>{skinInfo.cape && <span className="pill">{skinInfo.cape.alias || t('skin.capeDef')}</span>}</div><img src={skinInfo.renders.face} alt="Twarz postaci" width={64} height={64} style={{borderRadius:12}} /></div>
                <div className="card" style={{margin:0}}><div className="card-title">{t('skin.body')}</div><img src={skinInfo.renders.full} alt="Postać" style={{maxHeight:280}} onError={(e)=>{e.currentTarget.src=`https://minotar.net/armor/body/${skinInfo.uuid}/150.png`;}} /></div>
                {skinInfo.cape && <div className="card" style={{margin:0}}><div className="card-title">{t('skin.cape')}</div><img src={skinInfo.cape.url} alt="Peleryna" style={{maxHeight:200}} /></div>}
              </div>
            )}
            <h3>{t('skin.changeTitle')}</h3>
            <p style={{opacity:.65}}>{t('skin.changeDesc')}</p>
            <div className="row">
              <input value={skinUrl} onChange={(e)=>setSkinUrl(e.target.value)} placeholder="https://…/skin.png" style={{minWidth:280}} />
              <select value={skinVariant} onChange={(e)=>setSkinVariant(e.target.value)}>
                <option value="classic">{t('skin.classic')}</option>
                <option value="slim">{t('skin.slim')}</option>
              </select>
              <button className="primary" onClick={applySkin} disabled={skinBusy || !skinUrl}>{skinBusy ? t('skin.applying') : t('skin.apply')}</button>
              <button className="mini danger" onClick={resetSkin}>{t('skin.reset')}</button>
            </div>
          </div>
        )}
        {tab==='servers' && (
          <div className="card">
            <h2>{t('srv.title')}</h2>
            <div className="row">
              <input value={srvName} onChange={(e)=>setSrvName(e.target.value)} placeholder={t('srv.namePh')} style={{width:140}} />
              <input value={srvHost} onChange={(e)=>setSrvHost(e.target.value)} placeholder={t('srv.hostPh')} style={{minWidth:200}} />
              <input value={srvPort} onChange={(e)=>setSrvPort(e.target.value)} placeholder="25565" style={{width:90}} />
              <button className="primary" onClick={addServer}><Plus size={14} /> {t('srv.add')}</button>
            </div>
            <div className="grid" style={{marginTop:10}}>
              {servers.map((s)=>{const k=`${s.host}:${s.port}`; const p=srvPing[k]; return (<div key={k} className="card"><div className="card-title">{p?.favicon && <img src={p.favicon} alt="" style={{width:34,height:34,borderRadius:8,marginRight:8,verticalAlign:'middle'}} />}{s.name}</div><div className="meta"><span className="pill">{s.host}:{s.port}</span>{p ? (p.online ? <><span className="pill green">● {p.latencyMs} ms</span><span className="pill">{p.players.online}/{p.players.max}</span><span className="pill">{p.version}</span></> : <span className="pill">{t('srv.offline')}</span>) : <span className="pill"><span className="spinner" /></span>}</div>{p?.motd && <p style={{opacity:.7}}>{p.motd}</p>}<div className="actions"><button className="mini" onClick={()=>pingServer(s)}><RefreshCw size={12} /></button><button className="ghost" onClick={()=>playOn(s)} disabled={!launchInstance}><Play size={14} /> {t('srv.play')}</button><button className="mini" onClick={()=>{try{navigator.clipboard.writeText(`${s.host}:${s.port}`); setLog((l)=>l+`[eoncode] Skopiowano adres: ${s.host}:${s.port}\n`);}catch{}}} title={t('srv.copy')}><Copy size={12} /></button><button className="ghost danger" onClick={async()=>{setServers(await window.ferro?.serverRemove({host:s.host, port:s.port}));}}><Trash2 size={12} /></button></div></div>);})}
            </div>
            {servers.length===0 && <p style={{opacity:.6}}>{t('srv.none')}</p>}
          </div>
        )}
        {tab==='amigos' && (
          <>
          <div className="card">
            <h2>{t('fr.title')}</h2>
            <div className="row" data-tour="friends-add">
              <input value={friendName} onChange={(e)=>setFriendName(e.target.value)} placeholder={t('fr.nickPh')} style={{minWidth:200}} />
              <button className="primary" onClick={addFriend}><Plus size={14} /> {t('fr.add')}</button>
              <button className="ghost" onClick={loadFriends}><RefreshCw size={14} /> {t('fr.refresh')}</button>
            </div>
            <div className="grid" style={{marginTop:10}}>
              {friends.map((f)=>(<div key={f.name} className="card"><div className="card-title"><img className="face" src={f.face} alt="" onError={(e)=>{e.currentTarget.style.display='none';}} /> {f.name}</div><div className="meta">{f.status==='online' ? <><span className="pill green">● {t('fr.online')}</span><span className="pill">{f.server}</span></> : <span className="pill">{t('fr.offline')}</span>}{!f.uuid && <span className="pill">{t('fr.noPremium')}</span>}</div><div className="actions">{f.status==='online' && <button className="ghost" onClick={()=>joinFriend(f)} disabled={!launchInstance}><Play size={14} /> {t('fr.join')}</button>}<button className="ghost danger" onClick={()=>removeFriend(f.name)}><Trash2 size={12} /></button></div></div>))}
            </div>
            {friends.length===0 && <p style={{opacity:.6}}>{t('fr.none')}</p>}
          </div>
          <div className="card">
            <h2>{t('fr.essential')}</h2>
            <p style={{opacity:.7}}>{t('fr.essentialHelp')}</p>
            <div className="row">
              <select value={essInst || launchInstance || ''} onChange={(e)=>setEssInst(e.target.value)}>{instances.map((i)=><option key={i.name} value={i.name}>{i.name}</option>)}</select>
              <button className="ghost" onClick={scanEssential}><Search size={14} /> {t('fr.essentialScan')}</button>
              <button className="ghost" onClick={()=>window.ferro?.openUrl({url:'https://essential.gg'})}><ExternalLink size={14} /> essential.gg</button>
            </div>
            {essJars && <div className="meta" style={{marginTop:8}}>{essJars.length>0 ? <span className="pill green">● Essential: {essJars.join(', ')}</span> : <span className="pill">{t('fr.essentialMissing')}</span>}</div>}
          </div>
          </>
        )}
        {tab==='ajustes' && (
          <>
          <div className="card" data-tour="settings">
            <h2>{t('set.updates')} {appVer && <span className="pill">v{appVer}</span>}</h2>
            <div className="row">
              <button className="ghost" disabled={['checking','downloading','downloaded'].includes(upd.state)} onClick={async()=>{setUpd({state:'checking'}); try{setUpd(await window.ferro?.checkUpdate() || {state:'dev'});}catch(e){setUpd({state:'error',error:e.message});}}}>{t('set.checkUpd')}</button>
              {upd.state==='checking' && <span className="pill"><span className="spinner" />{t('set.upChecking')}</span>}
              {upd.state==='available' && <><span className="pill">{t('set.upAvail', {v:upd.version})}</span><button className="primary" onClick={async()=>{try{setUpd(await window.ferro.downloadUpdate());}catch(e){setUpd({state:'error',error:e.message});}}}>Pobierz aktualizację</button></>}
              {upd.state==='downloading' && <span className="pill"><span className="spinner" />{(upd.percent||0).toFixed(0)}%</span>}
              {upd.state==='downloaded' && <><span className="pill green">✓ v{upd.version} {t('set.upReady')}</span><button className="primary" onClick={async()=>{try{await window.ferro?.quitAndInstall();}catch(e){pushToast('error',e.message);}}}>{t('set.restart')}</button></>}
              {upd.state==='error' && <span className="pill">{t('set.upErr')}{upd.error?`: ${upd.error.slice(0,80)}`:''}</span>}
              {upd.state==='current' && <span className="pill green">Masz najnowszą wersję.</span>}
              {upd.state==='unconfigured' && <span className="pill">Kanał aktualizacji nie został jeszcze skonfigurowany.</span>}
              {upd.state==='portable' && <span className="pill">Automatyczne aktualizacje wymagają wersji z instalatora.</span>}
              {upd.state==='dev' && <span className="pill">{t('set.upDev')}</span>}
            </div>
          </div>
          <div className="card">
            <h2>{t('set.lang')} / wygląd</h2>
            <div className="row">
              <select value={lang} onChange={(e)=>setLangBoth(e.target.value)}>
                <option value="pl">Polski</option>
                
              </select>
              <select value={theme} onChange={(e)=>setTheme(e.target.value)} title={t('set.theme')}>
                <option value="ember">Żar</option>
                <option value="midnight">Noc</option>
                <option value="forest">Las</option>
                <option value="sakura">Sakura</option>
                <option value="ancient">Pradawne miasto</option>
              </select>
              <button className="ghost" onClick={startTour}>{t('tour.replay')}</button>
            </div>
          </div>
          <div className="card">
            <h2>{t('set.sound')}</h2>
            <div className="row">
              <button className="ghost" onClick={()=>{sfx.cfg.enabled=!sfx.cfg.enabled; sfx.save(); setSfxOn(sfx.cfg.enabled); if(sfx.cfg.enabled) sfx.play('success');}}>{sfxOn ? `✓ ${t('set.sfxOn')}` : t('set.sfxOff')}</button>
              <select value={sfxPack} onChange={(e)=>{sfx.cfg.pack=e.target.value; sfx.save(); setSfxPack(sfx.cfg.pack); sfx.play('success');}} title={t('set.pack')}>
                <option value="cristal">{t('set.packCristal')}</option>
                <option value="asmr">{t('set.packAsmr')}</option>
                {['minimal', 'soft', 'glass', 'arcade', 'mechanical', 'organic', 'dreamy', 'scifi', 'rubber', 'cinematic', 'studio', 'zen'].map((f)=><option key={f} value={f}>{({minimal:'Minimalistyczny',soft:'Delikatny',glass:'Szklany',arcade:'Automat do gier',mechanical:'Mechaniczny',organic:'Naturalny',dreamy:'Senny',scifi:'Fantastyka naukowa',rubber:'Gumowy',cinematic:'Filmowy',studio:'Studyjny',zen:'Spokojny'})[f]}</option>)}
              </select>
              <button className="ghost" onClick={()=>{sfx.cfg.hover=!sfx.cfg.hover; sfx.save(); setSfxHover(sfx.cfg.hover);}}>{t('set.hover')}: {sfxHover ? t('set.yes') : t('set.no')}</button>
              <label>{t('set.volume')} <input type="range" min={0} max={1} step={0.05} value={sfxVol} onChange={(e)=>{sfx.cfg.volume=Number(e.target.value); sfx.save(); setSfxVol(sfx.cfg.volume);}} style={{width:130}} /></label>
              <button className="ghost" onClick={()=>sfx.play('launch')}>{t('set.test')}</button>
            </div>
          </div>
          <div className="card">
            <h2>{t('ab.title')}</h2>
            <div className="row">
              <select value={abCfg.mode} onChange={async(e)=>{try{setAbCfg(await window.ferro?.autoBackupSet({mode:e.target.value}));}catch(er){setLog((l)=>l+`[error] ${er.message}\n`);}}}>
                <option value="off">{t('ab.off')}</option>
                <option value="beforePlay">{t('ab.beforePlay')}</option>
                <option value="daily">{t('ab.daily')}</option>
                <option value="weekly">{t('ab.weekly')}</option>
              </select>
              <label>{t('ab.keep')} <input type="number" min={1} max={20} value={abCfg.keep} onChange={async(e)=>{const v=Math.min(20,Math.max(1,Number(e.target.value)||3)); try{setAbCfg(await window.ferro?.autoBackupSet({keep:v}));}catch(er){setLog((l)=>l+`[error] ${er.message}\n`);}}} style={{width:70}} /></label>
              <button className="ghost" onClick={async()=>{try{const r=await window.ferro?.autoBackupRun({force:true}); setLog((l)=>l+`[eoncode] ${t('ab.done',{n:(r.done||[]).length})}\n`);}catch(e){setLog((l)=>l+`[error] ${e.message}\n`);}}}>{t('ab.now')}</button>
            </div>
            <p style={{opacity:.7}}>{t('ab.hint')}</p>
          </div>
          <div className="card">
            <h2>Tło i wygląd launchera</h2><div className="wallpaper-preview" style={{backgroundImage:`url(${wp||background})`}}><span>{wp?'Twoje tło':'Domyślne tło EonCode'}</span></div>
            <div className="row">
              <button className="ghost" onClick={async()=>{try{await window.ferro?.wallpaperSet(); setWp((await window.ferro?.wallpaper())?.dataUrl || null);}catch(e){setLog((l)=>l+`[error] ${e.message}\n`);}}}>{t('wp.choose')}</button>
              {wp && <button className="ghost" onClick={async()=>{try{await window.ferro?.wallpaperClear(); setWp(null);}catch(e){setLog((l)=>l+`[error] ${e.message}\n`);}}}>{t('wp.clear')}</button>}
            </div>
            <label className="wallpaper-dim">Przyciemnienie tła <input type="range" min="0.2" max="0.85" step="0.05" value={wallpaperDim} onChange={e=>setWallpaperDim(Number(e.target.value))}/><span>{Math.round(wallpaperDim*100)}%</span></label><p className="appearance-hint">PNG, JPG lub WebP do 12 MB. Tło jest zapamiętywane po zamknięciu aplikacji.</p><button className="ghost" onClick={()=>askConfirm('Przywrócić domyślne tło, przyciemnienie, motyw i układ menu? Profile oraz konta pozostaną zachowane.',async()=>{try{await window.ferro?.wallpaperClear();setWp(null);setWallpaperDim(.55);setTheme('midnight');setSidebarHidden(false);setConsoleHeight(240);setConsoleOpen(false);pushToast('success','Przywrócono domyślny wygląd.');}catch(e){pushToast('error',e.message);}})}>Przywróć domyślny wygląd</button>
          </div>
          <div className="card">
            <h2>{t('sc.title')}</h2>
            <div className="meta">
              <span className="pill">F5 · {t('sc.play')}</span>
              <span className="pill">Ctrl+1..0 · {t('sc.tabs')}</span>
              <span className="pill">Ctrl+, · {t('sc.settings')}</span>
              <span className="pill">Esc · {t('sc.close')}</span>
            </div>
          </div>
          <div className="card">
            <h2>{t('set.discord')}</h2>
            <div className="row">
              <button className="ghost" onClick={async()=>{const v=!dcOn; setDcOn(v); await window.ferro?.setDiscord({enabled:v});}}>{dcOn ? `✓ ${t('set.sfxOn')}` : t('set.sfxOff')}</button>
              <button className="ghost" onClick={async()=>{try{await window.ferro?.testWebhook(); setLog((l)=>l+"[eoncode] webhook OK\n");}catch(e){setLog((l)=>l+`[error] ${e.message}\n`);}}}>Wyślij wiadomość testową</button>
            </div>
          </div>
          <div className="card">
            <h2>Społeczność EonCode</h2>
            <div className="row">
              {<button className="ghost" onClick={()=>window.ferro?.openUrl({url:'https://dc.eoncode.fun'})}><DiscordIcon size={16} /> Discord</button>}
            </div>
          </div>
          <div className="card">
            <h2>{t('set.profile')}</h2>
            <p style={{opacity:.65}}>{t('set.profileDesc')}</p>
            <div className="row">
              <button className="ghost" onClick={async()=>{await window.ferro?.profileBackup();}}><Upload size={14} /> {t('set.profileBk')}</button>
              <button className="ghost danger" onClick={()=>askConfirm(t('set.profileRsConfirm'), async()=>{await window.ferro?.profileRestore(); refresh(); loadAuth();})}>{t('set.profileRs')}</button>
            </div>
          </div>
          <div className="card">
            <h2>{t('set.java')}</h2>
            <pre>{JSON.stringify(java, null, 2) || "nie znaleziono"}</pre>
            <p style={{opacity:.7}}>{t('set.javaDesc')}</p>
            <p style={{opacity:.5, fontSize:12}}>Nieoficjalny produkt Minecraft. Nie jest powiązany z Mojang ani Microsoft.</p>
          </div>
          </>
        )}
        </div>
      </div>
      {tourIdx !== null && (() => {
        const steps = tourSteps();
        const st = steps[tourIdx];
        if (!st) return null;
        const last = tourIdx === steps.length - 1;
        const tipStyle = tourRect
          ? (tourRect.y + tourRect.h + 220 < window.innerHeight
            ? { left: Math.min(Math.max(12, tourRect.x), window.innerWidth - 332), top: tourRect.y + tourRect.h + 12 }
            : { left: Math.min(Math.max(12, tourRect.x), window.innerWidth - 332), top: Math.max(12, tourRect.y - 232) })
          : { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' };
        return (<>
          <div className="tour-dim" onClick={endTour} />
          {tourRect && <div className="tour-ring" style={{ left: tourRect.x, top: tourRect.y, width: tourRect.w, height: tourRect.h }} />}
          <div className="tour-tip" style={tipStyle}>
            <div key={tourIdx} className="tour-body">
              <b>{st.title}</b>
              <p>{st.body}</p>
            </div>
            <div className="tour-dots">{steps.map((_, i) => <span key={i} className={i === tourIdx ? 'on' : ''} />)}<span className="tour-count">{tourIdx + 1}/{steps.length}</span></div>
            <div className="row">
              <button className="mini" onClick={endTour}>{t('tour.skip')}</button>
              <span style={{ flex: 1 }} />
              {tourIdx > 0 && <button className="mini" onClick={() => setTourIdx(tourIdx - 1)}>{t('tour.back')}</button>}
              <button className="mini hot" onClick={() => (last ? endTour() : setTourIdx(tourIdx + 1))}>{last ? t('tour.finish') : t('tour.next')}</button>
            </div>
          </div>
        </>);
      })()}
      {scare && (
        <div className="scare" onClick={() => setScare(null)}>
          <div className="scare-title">{t('scare.title')}</div>
          <div className="scare-sub">{t('scare.sub')} <b>{scare.name}</b></div>
          <div className="scare-case">{t('scare.report')} {scare.caseId} · {t('scare.filed')}</div>
          <div className="scare-warn">{t('scare.warn')}</div>
        </div>
      )}
      <div className="toasts">
        {toasts.map((t)=>(
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'error' ? <AlertTriangle size={16} /> : t.type === 'success' ? <Check size={16} /> : <Info size={16} />}
            <span>{t.msg}</span>
            {t.action && <button className="mini hot" onClick={() => { t.action.fn(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>{t.action.label}</button>}
            <div className="t-bar" />
          </div>
        ))}
      </div>
      {dragOn && (
        <div className="confirm-overlay">
          <div className="card" style={{textAlign:'center'}}>
            <div className="card-title">{t('inst.dropTitle')}</div>
            <p style={{opacity:.75}}>{t('inst.dropHint')}</p>
          </div>
        </div>
      )}
      {confirmDlg && (
        <div className="confirm-overlay" onClick={()=>setConfirmDlg(null)}>
          <div className="card" onClick={(e)=>e.stopPropagation()} style={{minWidth:320, maxWidth:440}}>
            <div className="card-title">{t('ui.confirmTitle')}</div>
            <p style={{opacity:.8}}>{confirmDlg.message}</p>
            {confirmDlg.input && <input autoFocus value={confirmInput} onChange={(e)=>setConfirmInput(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') confirmGo(); }} placeholder={t('ui.enterName')} style={{width:'100%', marginTop:8}} />}
            <div className="row" style={{marginTop:12, justifyContent:'flex-end'}}>
              <button className="ghost" onClick={()=>setConfirmDlg(null)}>{t('ui.cancel')}</button>
              <button className="primary" onClick={confirmGo}>{t('ui.confirm')}</button>
            </div>
          </div>
        </div>
      )}
      {settingsFor && (
        <MorphModal origin={modalOrigin} closing={modalClosing} onClose={closeModal} title={settingsFor}>
          <div className="subhead"><span>{t('inst.settings')}</span></div>
          <div className="row">
            <label>{t('inst.ram')} <input type="number" value={sRam} min={512} max={16384} step={512} onChange={(e)=>setSRam(e.target.value)} style={{width:100}} /></label>
            <label>{t('inst.width')} <input type="number" value={sW} min={320} max={7680} onChange={(e)=>setSW(e.target.value)} style={{width:80}} /></label>
            <label>{t('inst.height')} <input type="number" value={sH} min={240} max={4320} onChange={(e)=>setSH(e.target.value)} style={{width:80}} /></label>
            <select value={sJavaMode} onChange={(e)=>setSJavaMode(e.target.value)}><option value="auto">{t('inst.javaAuto')}</option><option value="custom">{t('inst.javaCustom')}</option></select>
            {sJavaMode==='custom' && <input value={sJavaPath} onChange={(e)=>setSJavaPath(e.target.value)} placeholder="C:\...\bin\java.exe" style={{minWidth:200}} />}
            <select value={sJvm} onChange={(e)=>setSJvm(e.target.value)} title={t('inst.jvm')}><option value="equilibrado">{t('inst.jvmEq')}</option><option value="rendimiento">{t('inst.jvmPerf')}</option><option value="patata">{t('inst.jvmPotato')}</option><option value="zgc">{t('inst.jvmZgc')}</option></select>
            <button className="mini" onClick={async()=>{try{const r=await window.ferro?.ramSuggest(); setSRam(String(r.suggestedMb)); setLog((l)=>l+`[eoncode] Sugerowana pamięć RAM: ${r.suggestedMb} MB\n`);}catch(e){setLog((l)=>l+`[error] ${e.message}\n`);}}}>{t('inst.ramSug')}</button>
            <button className="primary" onClick={saveSettings} disabled={saving}>{saving ? t('inst.saving') : t('inst.save')}</button>
          </div>
          <div className="subhead"><span>{t('inst.backupsOf')} {settingsFor}</span><button className="mini" onClick={async()=>{await window.ferro?.backupCreate({instanceName:settingsFor}); loadBackups(settingsFor);}}>{t('inst.createBk')}</button></div>
          {bkList.length===0 ? <p style={{opacity:.6}}>{t('inst.noBk')}</p> : (<div className="sublist">{bkList.map((b)=><div key={b.file} className="subrow"><span className="grow" title={b.file}>{b.file}</span><span className="pill">{(b.size/1048576).toFixed(1)} MB</span><button className="mini" onClick={async()=>{await window.ferro?.backupRestore({instanceName:settingsFor, file:b.file});}}>{t('inst.restore')}</button><button className="mini danger" onClick={async()=>{await window.ferro?.backupDelete({instanceName:settingsFor, file:b.file}); loadBackups(settingsFor);}}><Trash2 size={12} /></button></div>)}</div>)}
            <div className="subhead"><span>{t('inst.crashesOf')} {settingsFor}</span><button className="mini" onClick={async()=>{await window.ferro?.openCrashes({instanceName:settingsFor});}}><FolderOpen size={12} /> {t('inst.folder')}</button><button className="mini" onClick={async()=>{try{setDiag(await window.ferro?.diagnose({instanceName:settingsFor}));}catch(e){setLog((l)=>l+`[error] ${e.message}\n`);}}}><AlertTriangle size={12} /> {t('inst.diagnose')}</button></div>
            {diag && (diag.list.length===0 ? <p style={{opacity:.6}}>{t('inst.diagNone')}</p> : (<div className="sublist">{diag.list.map((d)=><div key={d.id} className="subrow"><span className="grow" title={d.desc}><b>{d.title}</b> — {d.desc}</span>{d.fix && <button className="mini" onClick={async()=>{try{await window.ferro?.doctorFix({instanceName:settingsFor, fix:d.fix}); setLog((l)=>l+`[eoncode] ${t('inst.fixed')}: ${d.title}\n`); setDiag(await window.ferro?.diagnose({instanceName:settingsFor})); refresh();}catch(e){setLog((l)=>l+`[error] ${e.message}\n`);}}}>{d.fix.label || t('inst.applyFix')}</button>}</div>)}</div>))}
          {crList.length===0 ? <p style={{opacity:.6}}>{t('inst.noCrashes')}</p> : (<div className="sublist">{crList.map((c)=><div key={c.file} className="subrow"><span className="grow" title={c.description||c.file}>{c.description||c.file}</span><button className="mini" onClick={async()=>{const r = crOpen?.file===c.file ? null : await window.ferro?.crashRead({instanceName:settingsFor, file:c.file}); setCrOpen(r);}}>{crOpen?.file===c.file ? t('mods.hide') : t('inst.view')}</button></div>)}</div>)}
          {crOpen && <pre style={{marginTop:4}}>{crOpen.content}{crOpen.truncated ? '\n…(truncado)' : ''}</pre>}
        </MorphModal>
      )}
      {instModal && (
        <MorphModal origin={instOrigin} closing={instClosing} onClose={closeInstalled} title={instModal==='datapacks' ? `${t('dp.installed')} · ${dpWorld}` : `${t('mods.installed')} · ${modsFor}`}>
          {instModal==='datapacks' ? (
            <div className="grid">
              {dpList.map((m)=>(<div key={m.file} className="card"><div className="card-title" title={m.file}>{m.file}</div><div className="meta"><span className="pill">{(m.size/1048576).toFixed(1)} MB{m.disabled?" · wyłączony":''}</span></div><div className="actions"><button className="mini" onClick={()=>dpToggle(m)}>{m.disabled?t('dp.activate'):t('dp.deactivate')}</button><button className="mini danger" onClick={()=>dpRemove(m)}><X size={12} /> {t('dp.remove')}</button></div></div>))}
            </div>
          ) : (<>
            <h3>{t('mods.installed')} ({mods.length})</h3>
            <div className="row" style={{marginBottom:8}}>
              <input value={imFilter} onChange={(e)=>setImFilter(e.target.value)} placeholder={t('mods.filterPh')} style={{minWidth:160}} />
              <select value={imSort} onChange={(e)=>setImSort(e.target.value)}>
                <option value="name">{t('mods.sortName')}</option>
                <option value="date">{t('mods.sortDate')}</option>
                <option value="size">{t('mods.sortSize')}</option>
              </select>
              <button className="mini" onClick={()=>bulkToggle(false)}>{t('mods.activate')}</button>
              <button className="mini" onClick={()=>bulkToggle(true)}>{t('mods.deactivate')}</button>
            </div>
            {kind==='shader' && (
            <div className="row" style={{marginBottom:10}}>
              {shaderCur?.iris
                ? <span className="pill green">Iris zainstalowany{shaderCur.pack ? ` · ${shaderCur.pack}` : ''}</span>
                : <span className="pill">{t('mods.needIris')}</span>}
              {shaderCur?.pack && <button className="mini" onClick={async()=>{await window.ferro?.shaderSet({instanceName:modsFor, file:null}); loadMods(modsFor);}}>{t('mods.shadersOff')}</button>}
            </div>
            )}
            {kind==='resourcepack' && rpOn===null && mods.length>0 && <p style={{opacity:.6}}>{t('mods.playOnce')}</p>}
            {kind==='mod' && (
            <div className="row" style={{marginBottom:10}}>
              <button className="ghost" onClick={checkUpdates} disabled={checkingUpd || !modsFor}>{checkingUpd ? t('mods.updating') : t('mods.checkUpd')}</button>
              {updMsg && <span className="pill green">{updMsg}</span>}
            </div>
            )}
            <div className="grid">
              {mods.filter((m)=>m.file.toLowerCase().includes(imFilter.trim().toLowerCase())).sort((a, b)=>imSort==='size' ? b.size - a.size : imSort==='date' ? (b.mtime || 0) - (a.mtime || 0) : a.file.localeCompare(b.file)).map((m)=>{ const u = updMap[m.file];
                const rpActive = kind==='resourcepack' && rpOn?.includes(m.file);
                const shaderActive = kind==='shader' && shaderCur?.pack===m.file && shaderCur?.enabled;
                return (<div key={m.file} className="card"><div className="card-title" title={m.file}>{m.file}</div><div className="meta"><span className="pill">{(m.size/1048576).toFixed(1)} MB{m.disabled?" · wyłączony":''}</span>{u && <span className="pill green">→ {u.latest}</span>}{rpActive && <span className="pill green">aktywny</span>}{shaderActive && <span className="pill green">w użyciu</span>}</div><div className="actions">
                {kind==='mod' && u && <button className="primary" onClick={()=>doModUpdate(u)}>{t('mods.update')}</button>}
                {kind==='resourcepack'
                  ? <button className="mini" onClick={async()=>{await window.ferro?.rpToggle({instanceName:modsFor, file:m.file, enable:!rpActive}); loadMods(modsFor);}}>{rpActive?t('mods.deactivate'):t('mods.activate')}</button>
                  : kind==='shader'
                    ? <button className="mini hot" onClick={async()=>{await window.ferro?.shaderSet({instanceName:modsFor, file:m.file}); loadMods(modsFor);}} disabled={!shaderCur?.iris}>{t('mods.use')}</button>
                    : <button className="mini" onClick={async()=>{await window.ferro?.modToggle({instanceName:modsFor, file:m.file, disable:!m.disabled, kind}); loadMods(modsFor);}}>{m.disabled?t('mods.activate'):t('mods.deactivate')}</button>}
                <button className="mini danger" onClick={async()=>{await window.ferro?.modRemove({instanceName:modsFor, file:m.file, kind}); loadMods(modsFor);}}><X size={12} /> {t('mods.remove')}</button>
              </div></div>);})}
            </div>
          </>)}
        </MorphModal>
      )}
      {gameError && <MorphModal title={gameError.title} onClose={()=>setGameError(null)}><div className="game-error"><p>{gameError.advice}</p><details><summary>Szczegóły błędu</summary><pre>{gameError.detail}</pre></details><div className="actions"><button className="ghost" onClick={()=>setGameError(null)}>Zamknij</button><button className="primary" onClick={()=>{setGameError(null);setConsoleOpen(true);}}>Otwórz konsolę</button></div></div></MorphModal>}
      {createOpen && (
        <MorphModal origin={createOrigin} closing={createClosing} onClose={closeCreate} title={t('inst.createTitle')}>
          <div className="profile-wizard">
            <div className="profile-intro"><div className="profile-icon"><i className="fa-solid fa-cube"/></div><div><h2>Nowy profil Minecraft</h2><p>Wybierz wersję gry i pamięć. Java zostanie dobrana automatycznie.</p></div></div>
            <label className="profile-field">Nazwa profilu<input autoFocus maxLength={64} value={instanceName} onChange={e=>setInstanceName(e.target.value)} placeholder="Np. Mój survival" disabled={createBusy || !!installTarget}/></label>
            <div className="profile-grid">
              <label className="profile-field">Wersja Minecraft<select value={versionId} disabled={createBusy || !!installTarget || !versions.length} onChange={e=>{touchedVer.current.create=true;setVersionId(e.target.value);}}>{!versions.length && <option value="">Brak wersji — sprawdź połączenie</option>}{versions.map(v=><option key={v.id} value={v.id}>{v.id}</option>)}</select></label>
              <label className="profile-field">Rodzaj profilu<select value={instanceType} disabled={createBusy || !!installTarget} onChange={e=>{setCreateError('');setInstanceType(e.target.value);}}>{['vanilla','fabric','forge','neoforge','quilt'].map(type=><option key={type} value={type}>{({vanilla:'Vanilla — bez modów',fabric:'Fabric',forge:'Forge',neoforge:'NeoForge',quilt:'Quilt'})[type]}</option>)}</select></label>
            </div>
            {instanceType!=='vanilla' && <label className="profile-field">Wersja loadera<select value={loaderVersion} disabled={createBusy || !!installTarget || loaderBusy} onChange={e=>setLoaderVersion(e.target.value)}>{!loaders.length && <option value="">{loaderBusy ? 'Pobieranie wersji…' : 'Brak zgodnych wersji'}</option>}{loaders.map(l=><option key={l.loader} value={l.loader}>{l.loader}{l.stable ? ' · stabilna' : ''}</option>)}</select></label>}
            <div className="profile-memory"><label htmlFor="profile-ram">Pamięć RAM <strong>{createRam/1024} GB</strong></label><input id="profile-ram" type="range" min="512" max={ramInfo?.maxMb || 16384} step="512" value={createRam} disabled={createBusy || !!installTarget} onChange={e=>{setRamTouched(true);setCreateRam(Number(e.target.value));}}/><div className="ram-presets">{[2048,4096,6144,8192].filter(ram=>!ramInfo || ram<=ramInfo.maxMb).map(ram=><button key={ram} disabled={createBusy || !!installTarget} className={createRam===ram?'primary':'ghost'} onClick={()=>{setRamTouched(true);setCreateRam(ram);}}>{ram/1024} GB</button>)}</div><small>{ramInfo ? <>Komputer: {ramInfo.totalGb} GB · Wolne teraz: {ramInfo.freeGb} GB · Zalecane dla {instanceType==='vanilla'?'Vanilla':'modów'}: {ramInfo.suggestedMb/1024} GB</> : 'Informacje o pamięci będą dostępne w aplikacji.'}</small>{ramInfo && <button className="mini" disabled={createBusy || !!installTarget} onClick={()=>{setRamTouched(false);setCreateRam(ramInfo.suggestedMb);}}>Użyj zalecanej ilości</button>}{ramInfo && (createRam>ramInfo.availableMb || ramInfo.lowMemory) && <p className="memory-warning">Mało wolnej pamięci. Zamknij zbędne aplikacje lub zmniejsz przydział RAM.</p>}</div>
            {createError && <p className="profile-error" role="alert">{createError}</p>}
            <div className="profile-footer"><span>{createBusy ? (launchProg ? t('play.ph.'+launchProg.phase) : 'Przygotowywanie Javy i plików gry…') : installTarget ? 'Profil jest zapisany. Możesz ponowić pobieranie.' : 'Pobierzemy grę i wymaganą Javę. Gra nie uruchomi się automatycznie.'}</span>{createBusy && launchProg?.total>0 && <progress aria-label="Postęp instalacji" value={launchProg.done} max={launchProg.total}/>} <div className="actions"><button className="ghost" disabled={createBusy} onClick={closeCreate}>Zamknij</button><button className="primary" disabled={createBusy || !instanceName.trim() || !versionId || !versions.length || loaderBusy || (instanceType!=='vanilla' && !loaderVersion)} onClick={create}>{createBusy?'Instalowanie…':installTarget?'Ponów instalację':'Zainstaluj Minecraft'}</button></div></div>
          </div>
        </MorphModal>
      )}
      {galName && (
        <MorphModal origin={galOrigin} closing={galClosing} onClose={closeGallery} title={`${t('inst.shotsOf')} ${galName} (${galShots.length})`}>
          {galShots.length===0
            ? <p style={{opacity:.6}}>{t('inst.noShots')}</p>
            : (<div className="gal-grid">
              {galShots.map((s)=>(
                <div key={s.file} className="gal-item">
                  {s.thumb
                    ? <img src={s.thumb} alt={s.file} loading="lazy" onClick={async()=>{await window.ferro?.shotView({instanceName:galName, file:s.file});}} />
                    : <div className="gal-ph"><span className="spinner" /></div>}
                  <div className="gal-foot"><span className="grow" title={s.file}>{s.file}</span></div>
                  <div className="actions">
                    <button className="mini" onClick={async()=>{await window.ferro?.shotView({instanceName:galName, file:s.file});}}>{t('inst.view')}</button>
                    <button className="mini danger" onClick={async()=>{await window.ferro?.shotDelete({instanceName:galName, file:s.file}); setGalShots((g)=>g.filter((x)=>x.file!==s.file));}}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>)}
        </MorphModal>
      )}
    </div>
  );
}
