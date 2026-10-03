const { app, BrowserWindow, ipcMain, shell, dialog, screen, nativeImage } = require('electron');
if (process.platform === 'win32') {
  try { app.setAppUserModelId('pl.eoncode.launcher'); } catch {}
}
const path = require('path');
const fs = require('fs');
const { getDataDir, dirs } = require('../core/constants');
const { ensureDirs, listInstances, createInstance, updateInstanceSettings, setForgeProfile, duplicateInstance, deleteInstance, renameInstance, touchPlayed, addPlayTime, instanceSize, cleanInstance } = require('../core/instanceManager');
const { listVersions, getVersionDetails, downloadClientJar } = require('../core/mojangService');
const { findJava, ensureJava } = require('../core/javaManager');
const { resolveLibraries, launch } = require('../core/launcher');
const { resolveNatives } = require('../core/nativesService');
const { downloadAssets, downloadLoggingConfig } = require('../core/assetsService');
const { listLoaders, getLoaderMeta, resolveFabricLibraries } = require('../core/fabricService');
const quilt = require('../core/quiltService');
const { listForge, forgeInstallerUrl, listNeoForge, neoInstallerUrl, runInstaller, downloadInstaller } = require('../core/forgeService');

function loaderApi(type) {
  if (type === 'quilt') return { list: quilt.listLoaders, meta: quilt.getLoaderMeta, resolve: quilt.resolveQuiltLibraries, label: 'quilt' };
  return { list: listLoaders, meta: getLoaderMeta, resolve: resolveFabricLibraries, label: 'fabric' };
}
const { searchMods, listMods, listWorlds, installMod, removeMod, toggleMod, checkModUpdates, updateMod } = require('../core/modrinthService');
const { searchModpacks, packVersions, getPackVersion, installMrpack, readMrpackManifest } = require('../core/modpackService');
const auth = require('../core/authService');
const skins = require('../core/skinService');
const backups = require('../core/backupService');
const discord = require('../core/discordService');
const crashes = require('../core/crashService');
const gallery = require('../core/galleryService');
const { notify } = require('../core/notifyService');
const cf = require('../core/curseforgeService');
const res = require('../core/resourceService');
const perf = require('../core/perfService');
const doctor = require('../core/crashDoctor');
const imp = require('../core/importService');
const srv = require('../core/serverService');
const friends = require('../core/friendsService');
const news = require('../core/newsService');

function findInstance(d, name) {
  const inst = listInstances(d.instances).find((i) => i.name === name);
  if (!inst) throw new Error("Nie znaleziono instancji");
  return inst;
}

// Caché de nombres premium (sesión, TTL 10 min): name.lower -> uuid | null | 'unknown'
const premiumCache = new Map();
const PREMIUM_TTL = 10 * 60 * 1000;
async function premiumUuidOf(name) {
  const key = String(name || '').toLowerCase();
  const hit = premiumCache.get(key);
  if (hit && Date.now() - hit.t < PREMIUM_TTL) return hit.v;
  let out;
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`);
    if (res.status === 200) out = (await res.json()).id || null;
    else if (res.status === 404 || res.status === 204 || res.status === 400) out = null;
    else out = 'unknown';
  } catch {
    out = 'unknown';
  }
  premiumCache.set(key, { v: out, t: Date.now() });
  return out;
}

// Susto teatral: sacude la ventana unos ms (solo si no está maximizada)
function shakeWindow() {
  try {
    if (!win || win.isDestroyed() || win.isMaximized() || win.isMinimized() || win.isFullScreen()) return;
    const [x0, y0] = win.getPosition();
    [[-9, 4], [8, -6], [-6, 3], [5, -2], [-3, 1], [0, 0]].forEach(([dx, dy], i) => {
      setTimeout(() => { try { win.setPosition(x0 + dx, y0 + dy); } catch {} }, i * 55);
    });
  } catch {}
}

let win = null;
let D = null;
let activeChild = null;
let bridgeTimer = null;
const bridgeOffsets = new Map();
// Puente: lee eventos del mod (join/leave/adv/death) solo desde donde lo dejo.
function drainBridge(d, inst, send) {
  try {
    const fs = require('fs');
    const p = require('path').join(inst.path, 'config', 'ferrobridge.jsonl');
    let st = null;
    try { st = fs.statSync(p); } catch { return; }
    const seen = bridgeOffsets.get(inst.path);
    if (seen === undefined || st.size < seen) { bridgeOffsets.set(inst.path, st.size); return; }
    if (st.size === seen) return;
    if (st.size - seen > 1048576) { bridgeOffsets.set(inst.path, st.size); return; }
    const fd = fs.openSync(p, 'r');
    const buf = Buffer.alloc(st.size - seen);
    fs.readSync(fd, buf, 0, buf.length, seen);
    fs.closeSync(fd);
    bridgeOffsets.set(inst.path, st.size);
    for (const line of buf.toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      let ev = null;
      try { ev = JSON.parse(line); } catch { continue; }
      if (!ev || !ev.t) continue;
      if (ev.t === 'death') {
        send(`[eoncode] ☠ Śmierć w ${inst.name}\n`);
      } else if (ev.t === 'join') {
        send(`[eoncode] ${inst.name} — połączono${ev.a ? ' z ' + ev.a : ''}\n`);
      } else if (ev.t === 'leave') {
        send(`[eoncode] ${inst.name} — rozłączono\n`);
      }
    }
  } catch {}
}
let activeInstance = null;
let activeT0 = null;
let lastExit = null;

function fmtPlay(totalSecs) {
  const m = Math.floor((totalSecs || 0) / 60);
  if (m < 60) return `${m} min`;
  return `${(m / 60).toFixed(m < 600 ? 1 : 0)} h`;
}

const bootT0 = Date.now();
function idleInfo() {
  const d = getDirs();
  let username = '';
  try { username = auth.loadAccount(d.base)?.name || ''; } catch {}
  let count = 0;
  try { const l = listInstances(d.instances); count = Array.isArray(l) ? l.length : 0; } catch {}
  return { username, count, version: app.getVersion(), startedAt: bootT0 };
}
// Reposo: estado visible con solo abrir el launcher; se repara solo cada minuto.
function refreshIdlePresence() {
  try {
    if (activeChild) return;
    const dc = auth.getDiscord(getDirs().base);
    if (!dc.enabled || !dc.clientId) return;
    if (discord.isConnected()) return;
    discord.setIdle(dc.clientId, idleInfo());
  } catch {}
}
function getDirs() {
  if (!D) {
    const base = getDataDir(app);
    D = dirs(base);
    ensureDirs(D);
  }
  return D;
}

function boundsPath() { return path.join(getDirs().base, 'win-bounds.json'); }
function loadBounds() { try { return JSON.parse(fs.readFileSync(boundsPath(), 'utf8')); } catch { return null; } }
function saveBounds() { try { if (win && !win.isDestroyed()) fs.writeFileSync(boundsPath(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() })); } catch {} }

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 850,
    minWidth: 900, minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: '#080f1d',
    show: false,
    icon: path.join(__dirname, '../build/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  const dev = !app.isPackaged && process.argv.includes('--dev');
  win.on('close', () => saveBounds());
  let saveTimer;
  const scheduleSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveBounds, 400); };
  win.on('resize', scheduleSave); win.on('move', scheduleSave);
  win.on('maximize', scheduleSave); win.on('unmaximize', scheduleSave);
  win.on('closed', () => clearTimeout(saveTimer));
  if (dev) win.loadURL('http://localhost:5173');
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
  win.once('ready-to-show', () => {
    try {
      if (win && !win.isDestroyed()) {
        const saved = loadBounds();
        if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height)) {
          const area = screen.getDisplayMatching({ x: Number.isFinite(saved.x) ? saved.x : 0, y: Number.isFinite(saved.y) ? saved.y : 0, width: Math.max(1, saved.width), height: Math.max(1, saved.height) }).workArea;
          const width = Math.max(900, Math.min(area.width, saved.width));
          const height = Math.max(640, Math.min(area.height, saved.height));
          win.setBounds({ width, height, x: Math.max(area.x, Math.min(saved.x || area.x, area.x + area.width - width)), y: Math.max(area.y, Math.min(saved.y || area.y, area.y + area.height - height)) });
          if (saved.maximized) win.maximize();
        }
        win.show();
      }
    } catch {}
  });
}

let developerService;
app.whenReady().then(() => {
  getDirs();
  developerService = require('./developers')(getDirs().base);
  createWindow();
  initUpdater();
  setTimeout(refreshIdlePresence, 5000);
  setInterval(refreshIdlePresence, 60000);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('before-quit', () => { developerService?.stopAll(); try { discord.clear(); } catch {} });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

let updates;
function initUpdater() {
  const configured = Boolean(require('../package.json').build.publish);
  updates = require('./updates')({
    updater: require('electron-updater').autoUpdater,
    packaged: app.isPackaged, configured, portable: Boolean(process.env.PORTABLE_EXECUTABLE_FILE), version: app.getVersion(),
    send: state => { if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send('ferro:update', state); },
    canInstall: () => !preparingGame && !activeChild && !developerService?.list().some(server => server.running),
  });
  const timer = setTimeout(() => updates.check(), 10000); timer.unref();
  const interval = setInterval(() => updates.check(), 4 * 60 * 60 * 1000); interval.unref();
}
ipcMain.handle('ferro:appVersion', () => app.getVersion());
ipcMain.handle('ferro:updateState', () => updates?.getState());
ipcMain.handle('ferro:checkUpdate', () => updates.check());
ipcMain.handle('ferro:downloadUpdate', () => updates.download());
ipcMain.handle('ferro:quitAndInstall', () => updates.install());

ipcMain.handle('ferro:versions', async (_, { kind } = {}) => {
  const all = await listVersions();
  if (kind === 'snapshot') return all.filter((v) => v.type === 'snapshot').slice(0, 30);
  if (kind === 'all') return all.slice(0, 60);
  return all.filter((v) => v.type === 'release').slice(0, 30);
});

ipcMain.handle('ferro:instances', async () => listInstances(getDirs().instances));
ipcMain.handle('ferro:createInstance', async (_, { name, versionId, type, loaderVersion, ramMb }) => { if (!name?.trim() || !versionId) throw new Error('Podaj nazwę profilu i wersję Minecraft.'); return createInstance(getDirs().instances, name, versionId, { type, loaderVersion, ramMb }); });
ipcMain.handle('ferro:loaders', async (_, { mcVersion, type }) => {
  if (type === 'forge') return (await listForge(mcVersion)).map((f) => ({ loader: f.version, tag: f.tag }));
  if (type === 'neoforge') return (await listNeoForge(mcVersion)).map((v) => ({ loader: v, stable: true }));
  return loaderApi(type).list(mcVersion);
});
// Compara versiones por tramos numéricos (sufijos ignorados)
function cmpVer(a, b) {
  const pa = String(a).split(/[^0-9]+/).filter(Boolean).map(Number);
  const pb = String(b).split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}
async function latestLoaderFor(inst) {
  if (!inst || inst.type === 'vanilla') return null;
  if (inst.type === 'forge') {
    const l = await listForge(inst.versionId);
    return l[0]?.version || null;
  }
  if (inst.type === 'neoforge') {
    const l = await listNeoForge(inst.versionId);
    return l[0] || null;
  }
  const l = await loaderApi(inst.type).list(inst.versionId);
  return l[0]?.loader || null;
}
ipcMain.handle('ferro:loaderCheck', async (_, { instanceName }) => {
  const d = getDirs();
  const inst = findInstance(d, instanceName);
  if (!inst || inst.type === 'vanilla') return { current: null, latest: null, outdated: false };
  const latest = await latestLoaderFor(inst);
  const cur = inst.loaderVersion || null;
  return { current: cur, latest, outdated: !!latest && (!cur || cmpVer(latest, cur) > 0) };
});
ipcMain.handle('ferro:loaderUpdate', async (_, { instanceName }) => {
  const d = getDirs();
  const inst = findInstance(d, instanceName);
  if (!inst || inst.type === 'vanilla') throw new Error("Instancja Vanilla nie korzysta z loadera");
  const latest = await latestLoaderFor(inst);
  if (!latest) throw new Error("Brak loadera dla wybranej wersji gry");
  const cur = inst.loaderVersion || null;
  if (cur && cmpVer(latest, cur) <= 0) return { updated: false, current: cur, latest };
  updateInstanceSettings(d.instances, instanceName, { loaderVersion: latest });
  return { updated: true, previous: cur, latest };
});

ipcMain.handle('ferro:modSearch', async (_, { query, mcVersion, loader, sort, kind, offset }) => searchMods(query || '', mcVersion, ['quilt', 'forge', 'neoforge'].includes(loader) ? loader : 'fabric', { sort, kind: ['shader', 'resourcepack', 'datapack'].includes(kind) ? kind : 'mod', offset: Math.max(0, Number(offset) || 0) }));
ipcMain.handle('ferro:mods', async (_, { instanceName, kind, world }) => listMods(findInstance(getDirs(), instanceName).path, kind, world));
ipcMain.handle('ferro:worlds', async (_, { instanceName }) => listWorlds(findInstance(getDirs(), instanceName).path));
ipcMain.handle('ferro:modInstall', async (event, { instanceName, projectId, kind, world }) => {
  const k = ['shader', 'resourcepack', 'datapack'].includes(kind) ? kind : 'mod';
  const inst = findInstance(getDirs(), instanceName);
  if (k === 'mod' && inst.type === 'vanilla') throw new Error("Mody wymagają instancji z loaderem");
  if (k === 'datapack' && !world) throw new Error("Wybierz świat dla paczki danych");
  const send = (t) => win && win.webContents.send('ferro:log', t);
  const r = await installMod(inst.path, projectId, inst.versionId, inst.type, send, k, world);
  notify(getDirs().base, 'ok', `Zainstalowano zawartość`, `${r.file} → ${instanceName}`);
  return r;
});
ipcMain.handle('ferro:modRemove', async (_, { instanceName, file, kind, world }) => {
  removeMod(findInstance(getDirs(), instanceName).path, file, kind, world);
  return true;
});
ipcMain.handle('ferro:modToggle', async (_, { instanceName, file, disable, kind, world }) => toggleMod(findInstance(getDirs(), instanceName).path, file, disable, kind, world));
ipcMain.handle('ferro:modUpdates', async (event, { instanceName }) => {
  const inst = findInstance(getDirs(), instanceName);
  const send = (t) => win && win.webContents.send('ferro:log', t);
  return checkModUpdates(inst.path, inst.versionId, inst.type === 'vanilla' ? 'fabric' : inst.type, (s) => send(`[eoncode] Sprawdzanie modyfikacji ${s.done}/${s.total}\n`));
});
ipcMain.handle('ferro:modUpdate', async (_, { instanceName, file, projectId }) => {
  const d = getDirs();
  const inst = findInstance(d, instanceName);
  const send = (t) => win && win.webContents.send('ferro:log', t);
  return updateMod(inst.path, projectId, inst.versionId, inst.type === 'vanilla' ? 'fabric' : inst.type, file, send);
});
ipcMain.handle('ferro:cfKey', async () => (cf.getKey(getDirs().base) ? '••••' + cf.getKey(getDirs().base).slice(-4) : ''));
  ipcMain.handle('ferro:cfSetKey', async (_, { key }) => cf.setKey(getDirs().base, key));
ipcMain.handle('ferro:cfSearch', async (_, { query, mcVersion, kind, sort }) => cf.search(getDirs().base, query || '', mcVersion, kind, sort));
ipcMain.handle('ferro:cfTrending', async () => cf.trending(getDirs().base));
ipcMain.handle('ferro:cfFiles', async (_, { modId, mcVersion, loader }) => cf.files(getDirs().base, modId, mcVersion, loader));
ipcMain.handle('ferro:cfInstall', async (_, { instanceName, modId, fileId, kind }) => {
  const inst = findInstance(getDirs(), instanceName);
  const send = (t) => win && win.webContents.send('ferro:log', t);
  return cf.installFile(getDirs().base, inst.path, modId, fileId, kind, send);
});
ipcMain.handle('ferro:cfPackInstall', async (_, { name, modId, fileId }) => {
  const d = getDirs();
  const send = (t) => win && win.webContents.send('ferro:log', t);
  const meta = await cf.inspectPack(d.base, modId, fileId);
  const inst = createInstance(d.instances, name || meta.name, meta.mcVersion, {
    type: ['fabric', 'quilt', 'forge', 'neoforge'].includes(meta.loaderType) ? meta.loaderType : 'forge',
    loaderVersion: meta.loaderVersion || undefined,
  });
  send(`[eoncode] Instalowanie paczki CurseForge w ${inst.name} (MC ${meta.mcVersion} + ${inst.type})...\n`);
  const info = await cf.finishPack(d.base, meta.tmpDir, meta.zipPath, inst.path, send);
  const cfgPath = require('path').join(inst.path, 'ferro.json');
  const cfg = JSON.parse(require('fs').readFileSync(cfgPath, 'utf8'));
  if (meta.mcVersion) cfg.versionId = meta.mcVersion;
  if (meta.loaderVersion) cfg.loaderVersion = meta.loaderVersion;
  cfg.type = inst.type;
  cfg.modpack = { projectId: modId, packVersionId: fileId, packName: meta.name, source: 'curseforge' };
  require('fs').writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  send(`[eoncode] Paczka gotowa: ${info.files} plików\n`);
  return { name: inst.name, ...cfg };
});
ipcMain.handle('ferro:rp', async (_, { instanceName }) => {
  const inst = findInstance(getDirs(), instanceName);
  return { enabled: res.getEnabledRP(inst.path), iris: res.hasIris(inst.path) };
});
ipcMain.handle('ferro:rpToggle', async (_, { instanceName, file, enable }) => {
  const inst = findInstance(getDirs(), instanceName);
  return res.setRPEnabled(inst.path, file, enable);
});
ipcMain.handle('ferro:shader', async (_, { instanceName }) => {
  const inst = findInstance(getDirs(), instanceName);
  return { ...res.getShader(inst.path), iris: res.hasIris(inst.path) };
});
ipcMain.handle('ferro:shaderSet', async (_, { instanceName, file }) => {
  const inst = findInstance(getDirs(), instanceName);
  return res.setShader(inst.path, file || null);
});
ipcMain.handle('ferro:packSearch', async (_, { query, mcVersion, loader, sort, offset }) => searchModpacks(query || '', mcVersion, { loader: ['fabric', 'forge', 'neoforge', 'quilt'].includes(loader) ? loader : null, sort, offset: Math.max(0, Number(offset) || 0) }));
ipcMain.handle('ferro:packVersions', async (_, { projectId, mcVersion, loader }) => {
  const vers = await packVersions(projectId, mcVersion, ['fabric', 'forge', 'neoforge', 'quilt'].includes(loader) ? [loader] : undefined);
  return vers.map((v) => ({ id: v.id, number: v.version_number, type: v.version_type, loaders: v.loaders, game: v.game_versions, files: v.files?.length || 0 }));
});
ipcMain.handle('ferro:packInstall', async (_, { name, projectId, packVersionId, mcVersion }) => {
  const d = getDirs();
  const send = (t) => win && win.webContents.send('ferro:log', t);
  const ver = await getPackVersion(packVersionId);
  const mrpack = (ver.files || []).find((f) => f.filename.endsWith('.mrpack')) || ver.files?.[0];
  if (!mrpack?.url) throw new Error("Ta wersja nie zawiera pliku .mrpack");
  const inst = createInstance(d.instances, name || `${ver.name || 'Modpack'}`, mcVersion, { type: 'fabric' });
  send(`[eoncode] Instalowanie paczki w ${inst.name}...\n`);
  const info = await installMrpack(inst.path, mrpack.url, send);
  // Ajusta la instancia a lo que pide el pack (MC + loader exactos)
  const fs = require('fs');
  const cfgPath = require('path').join(inst.path, 'ferro.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (info.mcVersion) cfg.versionId = info.mcVersion;
  if (info.loaderVersion) cfg.loaderVersion = info.loaderVersion;
  cfg.type = info.loaderType || 'fabric';
  cfg.modpack = { projectId, packVersionId, packName: info.name };
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  send(`[eoncode] Paczka gotowa: ${info.files} plików, MC ${cfg.versionId} + ${cfg.type} ${cfg.loaderVersion || ''}\n`);
  return { name: inst.name, ...cfg };
});
ipcMain.handle('ferro:java', async () => (await findJava()) || null);

ipcMain.handle('ferro:clientId', async () => auth.getClientIdPublic(getDirs().base));
ipcMain.handle('ferro:discord', async () => ({ ...auth.getDiscord(getDirs().base), webhook: readWebhook(getDirs().base) }));
ipcMain.handle('ferro:setDiscord', async (_, patch) => {
  const d = writeWebhook(getDirs().base, patch || {});
  const r = { ...auth.setDiscord(getDirs().base, patch || {}), webhook: d };
  try {
    if (r.enabled && r.clientId) discord.setIdle(r.clientId, idleInfo());
    else { discord.clear(); discord.disconnect(); }
  } catch {}
  return r;
});
ipcMain.handle('ferro:testWebhook', async () => {
  if (!readWebhook(getDirs().base)) throw new Error("Najpierw podaj adres webhooka w ustawieniach Discorda");
  const ok = await notify(getDirs().base, 'ok', "EonCode połączony", "Połączenie działa. Powiadomienia o grze, błędach i instalacjach są gotowe.");
  if (!ok) throw new Error("Discord odrzucił wiadomość. Sprawdź adres i połączenie.");
  return true;
});
ipcMain.handle('ferro:openUrl', async (_, data) => {
  const url = typeof data === 'string' ? data : data?.url;
  const u = String(url || '');
  if (!/^https:\/\/(x\.com|www\.reddit\.com|wa\.me|t\.me|github\.com|discord\.gg|discord\.com|www\.youtube\.com|youtu\.be|www\.tiktok\.com|essential\.gg|minecraft\.net|www\.minecraft\.net|help\.minecraft\.net|feedback\.minecraft\.net|modrinth\.com|curseforge\.com|www\.curseforge\.com)\//.test(u)) throw new Error("Niedozwolony adres");
  await shell.openExternal(u);
  return true;
});
ipcMain.handle('ferro:social', async () => ({
  github: '',
  discord: 'https://dc.eoncode.fun',
  youtube: readSocial(getDirs().base).youtube || '',
}));

function readSocial(base) {
  try {
    const s = JSON.parse(require('fs').readFileSync(require('path').join(base, 'ferro-config.json'), 'utf8')).social || {};
    return { discord: 'https://discord.gg/vTujTm3hE', youtube: 'https://www.youtube.com/@4dri4n-08', ...s };
  }
  catch { return { discord: 'https://discord.gg/vTujTm3hE', youtube: 'https://www.youtube.com/@4dri4n-08' }; }
}
function readWebhook(base) {
  try { return JSON.parse(require('fs').readFileSync(require('path').join(base, 'ferro-config.json'), 'utf8')).discordWebhook || ''; }
  catch { return ''; }
}
function writeWebhook(base, patch) {
  const fs = require('fs');
  const path = require('path');
  const p = path.join(base, 'ferro-config.json');
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  if (patch.webhook !== undefined) cfg.discordWebhook = String(patch.webhook || '').trim();
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
  return cfg.discordWebhook || '';
}
ipcMain.handle('ferro:setClientId', async (_, { clientId }) => auth.setClientId(getDirs().base, clientId));
ipcMain.handle('ferro:authStatus', async () => {
  const d = getDirs();
  const acc = await auth.validAccount(d.base, auth.getClientId(d.base)).catch(() => auth.loadAccount(d.base));
  return acc ? { name: acc.profile?.name, uuid: acc.profile?.uuid } : null;
});
ipcMain.handle('ferro:authStart', async () => auth.deviceStart(auth.getClientId(getDirs().base)));
ipcMain.handle('ferro:authPoll', async (_, { deviceCode }) => {
  const d = getDirs();
  const r = await auth.devicePollOnce(auth.getClientId(d.base), deviceCode);
  if (r.status !== 'done') return r;
  const acc = await auth.completeLogin(d.base, r.accessToken, r.refreshToken);
  return { status: 'done', name: acc.profile.name, uuid: acc.profile.uuid };
});
ipcMain.handle('ferro:authLogout', async () => { auth.clearAccount(getDirs().base); return true; });
ipcMain.handle('ferro:accounts', async () => auth.listAccounts(getDirs().base));
ipcMain.handle('ferro:authSelect', async (_, { uuid }) => auth.setActive(getDirs().base, uuid));
ipcMain.handle('ferro:authRemove', async (_, { uuid }) => auth.removeAccount(getDirs().base, uuid));

async function mcTokenOrThrow() {
  const d = getDirs();
  const acc = await auth.validAccount(d.base, auth.getClientId(d.base));
  if (!acc) throw new Error("Najpierw zaloguj się przez Microsoft w zakładce Moje konto");
  return acc;
}
ipcMain.handle('ferro:skin', async (_, { name }) => {
  const d = getDirs();
  const acc = await auth.validAccount(d.base, auth.getClientId(d.base)).catch(() => null);
  if (acc) {
    const res = await fetch('https://api.minecraftservices.com/minecraft/profile', { headers: { Authorization: `Bearer ${acc.mcToken}` } });
    if (!res.ok) throw new Error(`Mojang HTTP ${res.status}`);
    return { online: true, ...skins.summarize(await res.json()) };
  }
  const uuid = await skins.resolveUuid(name || 'EonCode');
  if (!uuid) return { online: false, name: name || 'EonCode', uuid: null, renders: null, note: "Podgląd jest niedostępny bez profilu Minecraft" };
  return { online: false, name, uuid, renders: skins.renders(uuid), note: "Podgląd. W trybie offline gra użyje skórki Steve lub Alex." };
});
ipcMain.handle('ferro:skinApply', async (_, { variant, url }) => {
  const acc = await mcTokenOrThrow();
  return skins.applySkin(acc.mcToken, { variant, url });
});
ipcMain.handle('ferro:skinReset', async () => {
  const acc = await mcTokenOrThrow();
  return skins.resetSkin(acc.mcToken);
});

let authWin = null;
ipcMain.handle('ferro:authWindowCancel', async () => { try { if (authWin && !authWin.isDestroyed()) authWin.close(); } catch {} authWin = null; return true; });
ipcMain.handle('ferro:authWindow', async () => {
  const d = getDirs();
  const clientId = auth.getClientId(d.base);
  if (!clientId) throw new Error("Logowanie Microsoft nie jest jeszcze skonfigurowane przez twórcę launchera.");
  if (authWin && !authWin.isDestroyed()) { authWin.focus(); return true; }
  const crypto = require('crypto');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(8).toString('hex');
  const url = auth.authorizeUrl({ clientId, redirectUri: auth.NATIVE_REDIRECT, challenge, state });

  authWin = new BrowserWindow({
    width: 480, height: 700, parent: win, modal: false,
    autoHideMenuBar: true, title: "Logowanie przez Microsoft",
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  authWin.loadURL(url);

  const done = (err, acc) => {
    authDone = true;
    try { if (authWin && !authWin.isDestroyed()) authWin.close(); } catch {}
    authWin = null;
    if (err) win && win.webContents.send('ferro:auth-error', { error: err.message || String(err) });
    else win && win.webContents.send('ferro:auth-done', { name: acc.profile.name, uuid: acc.profile.uuid });
  };

  let handled = false;
  let authDone = false;
  const intercept = async (navUrl) => {
    if (!navUrl.startsWith(auth.NATIVE_REDIRECT)) return false;
    if (handled) return true; // la redirección ya se está procesando: ignora el duplicado
    handled = true;
    win && win.webContents.send('ferro:log', "[eoncode] Odebrano odpowiedź Microsoft. Trwa logowanie…\n");
    try {
      const u = new URL(navUrl);
      if (u.searchParams.get('state') !== state) throw new Error("Niepoprawny stan logowania");
      if (u.searchParams.get('error')) throw new Error(u.searchParams.get('error_description') || u.searchParams.get('error'));
      const code = u.searchParams.get('code');
      if (!code) throw new Error("Microsoft nie zwrócił kodu logowania");
      const acc = await auth.exchangeCode({ clientId, code, redirectUri: auth.NATIVE_REDIRECT, verifier, baseDir: d.base });
      done(null, acc);
    } catch (err) { done(err); }
    return true;
  };

  authWin.webContents.on('will-redirect', (e, navUrl) => {
    if (!navUrl.startsWith(auth.NATIVE_REDIRECT)) return;
    e.preventDefault(); // síncrono: frena la navegación antes de procesar
    intercept(navUrl);
  });
  // Red de seguridad: algunas navegaciones no pasan por will-redirect
  authWin.webContents.on('did-navigate', async (_, navUrl) => { await intercept(navUrl); });
  authWin.webContents.on('did-fail-load', (_, code, desc, navUrl) => {
    if (navUrl.startsWith(auth.NATIVE_REDIRECT)) return; // esperado: esa URL no es una página real
    win && win.webContents.send('ferro:log', `[eoncode] Nie udało się załadować okna logowania (${code} ${desc})\n`);
  });
  authWin.on('closed', () => {
    authWin = null;
    if (!authDone) win && win.webContents.send('ferro:auth-error', { error: "Okno zamknięto przed zakończeniem logowania" });
  });
  return true;
});

ipcMain.handle('ferro:updateSettings', async (_, { instanceName, patch }) => updateInstanceSettings(getDirs().instances, instanceName, patch || {}));
ipcMain.handle('ferro:openFolder', async (_, { instanceName }) => {
  const p = findInstance(getDirs(), instanceName).path;
  await shell.openPath(p);
  return true;
});
ipcMain.handle('ferro:instanceFiles', (_, {instanceName, action, file = '', content, revision}) => {
  if(preparingGame) throw new Error('Poczekaj na zakończenie instalacji.');
  const files = require('../core/serverFiles').editor(findInstance(getDirs(),instanceName).path);
  if(action==='list') return files.list(file);
  if(action==='read') return files.read(file);
  if(action==='write') return files.write(file,content,revision);
  throw new Error('Nieznana operacja plików.');
});
ipcMain.handle('ferro:duplicateInstance', async (_, { instanceName }) => duplicateInstance(getDirs().instances, instanceName));
ipcMain.handle('ferro:deleteInstance', async (_, { instanceName }) => {
  if(preparingGame) throw new Error('Poczekaj na zakończenie instalacji.');
  const d = getDirs();
  const inst = findInstance(d, instanceName);
  try {
    const r = shell.trashItem(inst.path);
    if (r && typeof r.then === 'function') await r;
    return true;
  } catch {}
  try {
    return deleteInstance(d.instances, instanceName);
  } catch (e) {
    if (e.code === 'EBUSY' || /EBUSY/.test(e.message || '')) {
      throw new Error("Folder jest używany. Zamknij grę i okno folderu, a następnie spróbuj ponownie.");
    }
    throw e;
  }
});
ipcMain.handle('ferro:renameInstance', async (_, { instanceName, newName }) => {
  if(preparingGame) throw new Error('Poczekaj na zakończenie instalacji.');
  return renameInstance(getDirs().instances, instanceName, newName);
});
ipcMain.handle('ferro:instSize', async (_, { instanceName }) => instanceSize(findInstance(getDirs(), instanceName).path));
ipcMain.handle('ferro:instClean', async (_, { instanceName }) => {
  if(preparingGame) throw new Error('Poczekaj na zakończenie instalacji.');
  return cleanInstance(findInstance(getDirs(), instanceName).path);
});

ipcMain.handle('ferro:exportInstance', async (_, { instanceName }) => {
  const d = getDirs();
  const inst = findInstance(d, instanceName);
  const send = (t) => win && win.webContents.send('ferro:log', t);
  const { filePath } = await dialog.showSaveDialog(win, { title: "Eksportuj instancję", defaultPath: `${instanceName}.eoncode`, filters: [{ name: "Archiwum EonCode", extensions: ['eoncode', 'ferro'] }] });
  if (!filePath) return null;
  return backups.exportInstance(inst.path, filePath, send);
});
ipcMain.handle('ferro:importInstance', async () => {
  const d = getDirs();
  const send = (t) => win && win.webContents.send('ferro:log', t);
  const { filePaths } = await dialog.showOpenDialog(win, { title: "Importuj instancję", filters: [{ name: "Archiwum EonCode", extensions: ['eoncode', 'ferro'] }], properties: ['openFile'] });
  if (!filePaths?.[0]) return null;
  return backups.importPack(filePaths[0], d.instances, send);
});
ipcMain.handle('ferro:backups', async (_, { instanceName }) => backups.listBackups(getDirs().base, instanceName));
ipcMain.handle('ferro:backupCreate', async (_, { instanceName }) => {
  const d = getDirs();
  const send = (t) => win && win.webContents.send('ferro:log', t);
  return backups.createBackup(d.base, findInstance(d, instanceName).path, instanceName, send);
});
ipcMain.handle('ferro:backupRestore', async (_, { instanceName, file }) => {
  const d = getDirs();
  const send = (t) => win && win.webContents.send('ferro:log', t);
  return backups.restoreBackup(d.base, d.instances, instanceName, file, send);
});
ipcMain.handle('ferro:backupDelete', async (_, { instanceName, file }) => backups.deleteBackup(getDirs().base, instanceName, file));
ipcMain.handle('ferro:autoBackupGet', async () => backups.getAutoCfg(getDirs().base));
ipcMain.handle('ferro:autoBackupSet', async (_, data) => backups.setAutoCfg(getDirs().base, data || {}));
ipcMain.handle('ferro:autoBackupRun', async (_, data) => {
  const d = getDirs();
  const send = (t) => win && win.webContents.send('ferro:log', t);
  return backups.runAutoBackups(d.base, listInstances(d.instances), send, data && data.force);
});
ipcMain.handle('ferro:autoBackupOnce', async (_, { instanceName }) => {
  const d = getDirs();
  const send = (t) => win && win.webContents.send('ferro:log', t);
  return backups.autoBackupOnce(d.base, findInstance(d, instanceName).path, instanceName, send);
});
ipcMain.handle('ferro:profileBackup', async () => {
  const d = getDirs();
  const send = (t) => win && win.webContents.send('ferro:log', t);
  const stamp = new Date().toISOString().slice(0, 10);
  const { filePath } = await dialog.showSaveDialog(win, { title: "Kopia całego profilu", defaultPath: `eoncode-profil-${stamp}.eoncode`, filters: [{ name: "Profil EonCode", extensions: ['eoncode', 'ferro'] }] });
  if (!filePath) return null;
  return backups.profileBackup(d.base, filePath, send);
});
ipcMain.handle('ferro:profileRestore', async () => {
  const d = getDirs();
  const send = (t) => win && win.webContents.send('ferro:log', t);
  const { filePaths } = await dialog.showOpenDialog(win, { title: "Przywróć profil", filters: [{ name: "Profil EonCode", extensions: ['eoncode', 'ferro'] }], properties: ['openFile'] });
  if (!filePaths?.[0]) return null;
  return backups.profileRestore(filePaths[0], d.base, send);
});
ipcMain.handle('ferro:crashes', async (_, { instanceName }) => crashes.listCrashes(findInstance(getDirs(), instanceName).path));
ipcMain.handle('ferro:crashRead', async (_, { instanceName, file }) => crashes.readCrash(findInstance(getDirs(), instanceName).path, file));
ipcMain.handle('ferro:openCrashes', async (_, { instanceName }) => {
  const dir = crashes.crashDir(findInstance(getDirs(), instanceName).path);
  require('fs').mkdirSync(dir, { recursive: true });
  await shell.openPath(dir);
  return true;
});
ipcMain.handle('ferro:shots', async (_, { instanceName }) => gallery.listShots(findInstance(getDirs(), instanceName).path));
function resolveShot(instanceName, file) {
  const root = findInstance(getDirs(), instanceName).path;
  const hit = gallery.listShots(root).find(s => s.file === file);
  if (!hit) throw new Error('Nie znaleziono zrzutu ekranu.');
  const fs = require('fs');
  const relative = path.relative(fs.realpathSync(root), fs.realpathSync(hit.path));
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Zrzut znajduje się poza profilem.');
  if (fs.statSync(hit.path).size > 15 * 1048576) throw new Error('Obraz jest zbyt duży (limit 15 MB).');
  return hit.path;
}
ipcMain.handle('ferro:shotImage', (_, {instanceName, file}) => {
  const source = resolveShot(instanceName, file);
  const image = nativeImage.createFromPath(source);
  if (image.isEmpty()) throw new Error('Nie można odczytać obrazu.');
  return {dataUrl: image.toDataURL()};
});
ipcMain.handle('ferro:shotWallpaper', (_, {instanceName, file}) => saveWallpaper(resolveShot(instanceName, file)));
ipcMain.handle('ferro:shotThumb', async (_, { instanceName, file }) => {
  const list = gallery.listShots(findInstance(getDirs(), instanceName).path);
  const hit = list.find((s) => s.file === path.basename(file));
  if (!hit) throw new Error("Nie znaleziono zrzutu ekranu");
  if (hit.size > 15 * 1048576) throw new Error("Obraz jest zbyt duży");
  const image = nativeImage.createFromPath(hit.path);
  if(image.isEmpty()) throw new Error('Nie można odczytać obrazu.');
  return { file: hit.file, dataUrl: 'data:image/jpeg;base64,' + image.resize({width:480}).toJPEG(80).toString('base64') };
});
ipcMain.handle('ferro:shotView', async (_, { instanceName, file }) => {
  const list = gallery.listShots(findInstance(getDirs(), instanceName).path);
  const hit = list.find((s) => s.file === path.basename(file));
  if (!hit) throw new Error("Nie znaleziono zrzutu ekranu");
  await shell.openPath(hit.path);
  return true;
});
ipcMain.handle('ferro:shotDelete', async (_, { instanceName, file }) => gallery.deleteShot(findInstance(getDirs(), instanceName).path, file));
ipcMain.handle('ferro:wallpaper', async () => {
  const base = getDirs().base;
  const fs = require('fs');
  const hit = ['wallpaper.png', 'wallpaper.jpg', 'wallpaper.jpeg', 'wallpaper.webp'].map((f) => path.join(base, f)).find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
  if (!hit) return null;
  if (fs.statSync(hit).size > 12 * 1048576) return { tooBig: true };
  const ext = path.extname(hit).slice(1).toLowerCase().replace('jpg', 'jpeg');
  return { dataUrl: `data:image/${ext};base64,` + fs.readFileSync(hit).toString('base64') };
});
ipcMain.handle('ferro:wallpaperSet', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Obraz', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  return saveWallpaper(r.filePaths[0]);
});
function saveWallpaper(source) {
  const base = getDirs().base;
  const fs = require('fs');
  if (fs.statSync(source).size > 12 * 1048576) throw new Error('Wybierz tło mniejsze niż 12 MB.');
  const ext = path.extname(source).toLowerCase();
  if(!['.png','.jpg','.jpeg','.webp'].includes(ext) || nativeImage.createFromPath(source).isEmpty()) throw new Error('Wybierz poprawny obraz PNG, JPG lub WebP.');
  const bytes = fs.readFileSync(source);
  const dest = path.join(base, 'wallpaper'+ext);
  fs.writeFileSync(dest+'.tmp',bytes);
  fs.renameSync(dest+'.tmp',dest);
  for(const f of ['wallpaper.png','wallpaper.jpg','wallpaper.jpeg','wallpaper.webp']) {
    const other=path.join(base,f); if(other!==dest) { try{fs.unlinkSync(other);}catch{} }
  }
  return {dataUrl: `data:image/${ext.slice(1).replace('jpg','jpeg')};base64,`+bytes.toString('base64')};
}
ipcMain.handle('ferro:wallpaperClear', async () => {
  const base = getDirs().base;
  const fs = require('fs');
  for (const f of ['wallpaper.png', 'wallpaper.jpg', 'wallpaper.jpeg', 'wallpaper.webp']) { try { fs.unlinkSync(path.join(base, f)); } catch {} }
  return true;
});
ipcMain.handle('ferro:stop', async () => {
  if (!activeChild || activeChild.killed || activeChild.exitCode !== null) return false;
  const send = (t) => win && win.webContents.send('ferro:log', t);
  send(`[eoncode] Zatrzymywanie ${activeInstance || 'gry'}...\n`);
  activeChild.kill();
  setTimeout(() => { try { if (activeChild && activeChild.exitCode === null) activeChild.kill('SIGKILL'); } catch {} }, 5000);
  return true;
});
ipcMain.handle('ferro:status', async () => ({ running: !!activeChild && activeChild.exitCode === null && !activeChild.killed, instance: activeInstance }));

// Rendimiento: presets JVM + RAM sugerida
ipcMain.handle('eon:explainError', (_, { message }) => require('../core/gameErrors').explainGameError(message));
ipcMain.handle('ferro:ramSuggest', async (_, data) => perf.suggestRam(data?.type));

// Doctor de crashes: diagnostica + aplica arreglos seguros
function nativesDirFor(inst, d) {
  let profileDir = path.join(d.versions, inst.versionId);
  if ((inst.type === 'forge' || inst.type === 'neoforge') && inst.forgeProfileId) {
    profileDir = path.join(d.versions, inst.forgeProfileId);
  }
  return path.join(profileDir, 'natives-windows');
}
ipcMain.handle('ferro:diagnose', async (_, { instanceName }) => {
  const d = getDirs();
  const inst = findInstance(d, instanceName);
  const exitCode = (lastExit && lastExit.instance === instanceName) ? lastExit.code : null;
  return {
    exitCode,
    list: doctor.diagnose({
      logTail: doctor.latestLogTail(inst.path),
      exitCode,
      crashDesc: doctor.lastCrashDesc(inst.path),
    }),
  };
});
ipcMain.handle('ferro:doctorFix', async (_, { instanceName, fix }) => {
  const d = getDirs();
  const inst = findInstance(d, instanceName);
  if (fix?.type === 'ram' && fix.mb) {
    return updateInstanceSettings(d.instances, instanceName, { ramMb: fix.mb });
  }
  if (fix?.type === 'wipeNatives') {
    fs.rmSync(nativesDirFor(inst, d), { recursive: true, force: true });
    return true;
  }
  throw new Error("Ta naprawa nie jest obsługiwana");
});

// Importar de otros launchers
ipcMain.handle('ferro:importDrop', async (_, { paths, instanceName }) => {
  const d = getDirs();
  const send = (t) => win && win.webContents.send('ferro:log', t);
  const out = [];
  for (const p of paths || []) {
    const low = String(p || '').toLowerCase();
    try {
      if (/\.(?:eoncode|ferro)$/.test(low)) {
        out.push({ kind: 'eoncode', name: backups.importPack(p, d.instances, send) });
      } else if (low.endsWith('.mrpack')) {
        const man = readMrpackManifest(p);
        const inst = createInstance(d.instances, man.name || path.basename(p, '.mrpack'), man.mcVersion, {
          type: ['fabric', 'quilt', 'forge', 'neoforge'].includes(man.loaderType) ? man.loaderType : 'fabric',
          loaderVersion: man.loaderVersion || undefined,
        });
        const info = await installMrpack(inst.path, p, send);
        const cfgPath = path.join(inst.path, 'ferro.json');
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        if (info.mcVersion) cfg.versionId = info.mcVersion;
        if (info.loaderVersion) cfg.loaderVersion = info.loaderVersion;
        fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        out.push({ kind: 'mrpack', name: inst.name });
      } else if (low.endsWith('.jar') && instanceName) {
        const inst = findInstance(d, instanceName);
        const safe = path.basename(p).replace(/[^\w\-.+() \[\]]+/g, '_');
        fs.mkdirSync(path.join(inst.path, 'mods'), { recursive: true });
        fs.copyFileSync(p, path.join(inst.path, 'mods', safe));
        out.push({ kind: 'jar', file: safe });
      } else {
        out.push({ kind: 'skip', file: path.basename(p) });
      }
    } catch (e) {
      out.push({ kind: 'error', file: path.basename(p), error: e.message });
    }
  }
  return out;
});
ipcMain.handle('ferro:importScan', async () => {
  const found = imp.detectLaunchers();
  const out = { found: Object.keys(found) };
  if (found.vanilla) {
    try { out.vanilla = { path: found.vanilla, versions: imp.listVanilla(found.vanilla).slice(0, 60) }; } catch (e) { out.vanilla = { path: found.vanilla, error: e.message }; }
  }
  for (const k of ['prism', 'multimc']) {
    if (found[k]) {
      try { out[k] = { path: found[k], instances: imp.listPrism(found[k]) }; } catch (e) { out[k] = { path: found[k], error: e.message }; }
    }
  }
  return out;
});
ipcMain.handle('ferro:importVanilla', async (_, { versionId, asName }) => {
  const d = getDirs();
  const found = imp.detectLaunchers();
  if (!found.vanilla) throw new Error("Nie znaleziono oficjalnego launchera");
  return imp.importVanillaInstance(d.instances, found.vanilla, versionId, asName);
});
ipcMain.handle('ferro:importPrism', async (_, { from, instPath, asName }) => {
  const d = getDirs();
  const found = imp.detectLaunchers();
  const base = found[from];
  if (!base) throw new Error("Nie znaleziono launchera");
  const full = path.join(base, 'instances', path.basename(instPath || ''));
  if (!full.startsWith(path.join(base, 'instances'))) throw new Error("Niepoprawna ścieżka");
  return imp.importPrismInstance(d.instances, full, asName);
});

// Servidores favoritos + ping
ipcMain.handle('ferro:servers', async () => srv.listServers(getDirs().base));
ipcMain.handle('ferro:serverAdd', async (_, data) => srv.addServer(getDirs().base, data || {}));
ipcMain.handle('ferro:serverRemove', async (_, { host, port }) => srv.removeServer(getDirs().base, host, port));
ipcMain.handle('ferro:friendAdd', async (_, data) => friends.addFriend(getDirs().base, data || {}));
ipcMain.handle('ferro:friendRemove', async (_, data) => friends.removeFriend(getDirs().base, data || {}));
ipcMain.handle('ferro:friendsPresence', async () => friends.presence(getDirs().base));
ipcMain.handle('ferro:essentialScan', async (_, { instanceName }) => friends.essentialScan(findInstance(getDirs(), instanceName).path));
ipcMain.handle('ferro:news', async () => news.getNews(24));
ipcMain.handle('ferro:serverPing', async (_, { host, port }) => srv.ping(String(host || '').trim(), Number(port) || 25565));

const NAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
ipcMain.handle('ferro:nameCheck', async (_, { name }) => {
  const clean = String(name || '').trim();
  if (!NAME_RE.test(clean)) return { name: clean, valid: false };
  const uuid = await premiumUuidOf(clean).catch(() => 'unknown');
  return { name: clean, valid: true, premium: !!uuid && uuid !== 'unknown', unknown: uuid === 'unknown' };
});
ipcMain.handle('ferro:nameSuggest', async (_, { base }) => {
  const b = String(base || '').trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 12) || 'EonCode';
  const cap = b.charAt(0).toUpperCase() + b.slice(1);
  const r2 = () => String(Math.floor(Math.random() * 90) + 10);
  const raw = [`${b}_`, `_${b}`, `${b}${r2()}`, `${b}HD`, `${b}YT`, `${b}MC`, `${b}GG`, `${b}Pro`, `xX${b}Xx`.slice(0, 16), `The${cap}`.slice(0, 16), `${b}x`, `${cap}Gamer`.slice(0, 16)];
  const cands = [...new Set(raw)].filter((n) => NAME_RE.test(n) && n.toLowerCase() !== b.toLowerCase()).slice(0, 10);
  const out = [];
  await Promise.all(cands.map(async (n) => {
    const u = await premiumUuidOf(n).catch(() => 'unknown');
    if (u === null) out.push(n);
  }));
  return out.slice(0, 4);
});

let preparingGame = false;
async function prepareGame(instanceName) {
  const d = getDirs();
  const instances = listInstances(d.instances);
  const inst = instances.find((i) => i.name === instanceName);
  if (!inst) throw new Error("Nie znaleziono instancji");
  const send = (t) => win && win.webContents.send('ferro:log', t);
  const prog = (phase, s) => { try { win && win.webContents.send('ferro:progress', { phase, done: s?.done ?? null, total: s?.total ?? null, extra: s?.lib || null }); } catch {} };

  send(`[eoncode] Przygotowywanie ${inst.versionId}...\n`);
  const vanilla = await getVersionDetails(inst.versionId);
  const requiredJavaVanilla = vanilla.javaVersion?.majorVersion || null;
  if (requiredJavaVanilla) send(`[eoncode] Ta wersja wymaga Javy ${requiredJavaVanilla}\n`);

  // Java antes: el instalador Forge/NeoForge también lo necesita
  const { checkJava } = require('../core/javaManager');
  let java;
  if (inst.settings?.javaMode === 'custom' && inst.settings?.javaPath) {
    const custom = await checkJava(inst.settings.javaPath);
    if (!custom) throw new Error(`Niepoprawna ścieżka własnej Javy: ${inst.settings.javaPath}`);
    if (requiredJavaVanilla && custom.major !== null && requiredJavaVanilla > 8 && custom.major < requiredJavaVanilla) {
      throw new Error(`Niezgodna Java: wymagana Java ${requiredJavaVanilla}, wybrano ${custom.major}. Włącz automatyczny wybór Javy w ustawieniach profilu.`);
    }
    java = custom;
  } else {
    java = await ensureJava(requiredJavaVanilla, d.runtimes, send);
  }
  let javaBin = java.path === 'java' ? 'java' : java.path;
  send(`[eoncode] Java ${java.version} (wersja główna ${java.major}) — ${java.path}${java.managed ? " [zarządzana automatycznie]" : ''}\n`);

  // Perfil efectivo: vanilla, modloader ligero, o el generado por el instalador Forge/NeoForge
  let details = vanilla;
  let profileDir = path.join(d.versions, vanilla.id);
  let mainClassOverride = null, extraClasspath = [];
  if (inst.type === 'forge' || inst.type === 'neoforge') {
    const isForge = inst.type === 'forge';
    const ver = inst.loaderVersion;
    if (!ver) throw new Error(`Utwórz instancję, wybierając wersję ${inst.type}`);
    const installerJar = path.join(d.versions, '_installers', `${inst.type}-${inst.versionId}-${ver}-installer.jar`);
    await downloadInstaller(isForge ? forgeInstallerUrl(inst.versionId, ver) : neoInstallerUrl(ver), installerJar);
    send(`[eoncode] Instalator ${inst.type} ${ver} gotowy\n`);
    let profileJson = inst.forgeProfileId ? path.join(d.versions, inst.forgeProfileId, `${inst.forgeProfileId}.json`) : null;
    if (!profileJson || !fs.existsSync(profileJson)) {
      profileJson = await runInstaller(javaBin, installerJar, d.base, d.versions, send);
      const pid = path.basename(path.dirname(profileJson));
      setForgeProfile(d.instances, inst.name, { forgeProfileId: pid });
      send(`[eoncode] Profil ${inst.type} — zainstalowano: ${pid}\n`);
    } else {
      send(`[eoncode] Profil ${inst.type} jest już zainstalowany\n`);
    }
    profileDir = path.dirname(profileJson);
    details = JSON.parse(fs.readFileSync(profileJson, 'utf8'));
  } else if (inst.type === 'fabric' || inst.type === 'quilt') {
    const api = loaderApi(inst.type);
    const loaders = await api.list(inst.versionId);
    const pick = inst.loaderVersion || loaders[0]?.loader;
    if (!pick) throw new Error(`${api.label} — brak loadera dla ${inst.versionId}`);
    send(`[eoncode] ${api.label} loader ${pick}...\n`);
    const meta = await api.meta(inst.versionId, pick);
    const fab = await api.resolve(meta, d.libraries, (s) => { send(`[eoncode] ${api.label} ${s.done}/${s.total} ${s.lib}\n`); prog('loader', s); });
    mainClassOverride = fab.mainClass;
    extraClasspath = fab.classpathExtra;
    send(`[eoncode] ${api.label}: ${fab.count} bibliotek, klasa główna ${fab.mainClass}\n`);
  }
  const requiredJava = details.javaVersion?.majorVersion || requiredJavaVanilla;
  // El perfil EFECTIVO (el del loader/instalador) es el que manda: puede pedir un
  // Java más nuevo que el de vanilla. Antes se calculaba aquí y no se usaba.
  if (requiredJava && java.major != null && requiredJava > 8 && java.major < requiredJava && !(inst.settings?.javaMode === 'custom')) {
    send(`[eoncode] Profil wymaga Javy ${requiredJava}; obecna wersja to ${java.major}: dobieranie środowiska…\n`);
    try {
      const better = await ensureJava(requiredJava, d.runtimes, send);
      if (better && better.major >= requiredJava) {
        java = better;
        javaBin = java.path === 'java' ? 'java' : java.path;
        send(`[eoncode] Java ${java.version} (wersja główna ${java.major}) — ${java.path}${java.managed ? " [zarządzana automatycznie]" : ''}\n`);
      } else {
        send(`[eoncode] Brak Javy ${requiredJava}: uruchamianie przy użyciu ${java.major}, uruchomienie może się nie powieść\n`);
      }
    } catch (e) {
      send(`[eoncode] Ostrzeżenie: nie udało się pobrać Javy ${requiredJava} (${e.message}). Kontynuowanie z ${java.major}\n`);
    }
  }

  if (requiredJava && java.major != null && java.major < requiredJava) throw new Error('Niezgodna Java: wymagana wersja ' + requiredJava + '. Włącz automatyczny wybór Javy.');
  const forClient = details.downloads?.client?.url ? details : vanilla;
  const clientJar = await downloadClientJar(forClient, d.versions, (p) => { send(`[eoncode] Pliki gry ${(p*100).toFixed(0)}%\n`); prog('client', { done: p, total: 1 }); });
  const cp = await resolveLibraries(details, d.libraries, (s) => { send(`[eoncode] Biblioteki ${s.done}/${s.total} ${s.lib}\n`); prog('libs', s); });
  const nativesDir = path.join(profileDir, 'natives-windows');
  await resolveNatives(details, d.libraries, nativesDir, (s) => { send(`[eoncode] Biblioteki systemowe ${s.done}/${s.total}\n`); prog('natives', s); });
  await downloadAssets(details, d.assets, (s) => { send(`[eoncode] Zasoby ${s.done}/${s.total}\n`); prog('assets', s); });
  const loggingPath = await downloadLoggingConfig(details, d.base || d.versions);
  updateInstanceSettings(d.instances, inst.name, { installed: true });
  return { d, inst, details, java, javaBin, clientJar, cp, nativesDir, loggingPath, mainClassOverride, extraClasspath, send };
}
ipcMain.handle('ferro:installInstance', async (_, { instanceName }) => {
  if (preparingGame || activeChild) throw new Error('Poczekaj na zakończenie bieżącej operacji lub zatrzymaj grę.');
  preparingGame = true;
  try { await prepareGame(instanceName); return { ready: true }; }
  finally { preparingGame = false; }
});
ipcMain.handle('ferro:launch', async (event, { instanceName, username, ramMb, width, height, serverHost, serverPort }) => {
  if (preparingGame || activeChild) throw new Error('Gra jest już uruchomiona lub trwa przygotowywanie plików.');
  preparingGame = true;
  try {
  const { d, inst, details, java, javaBin, clientJar, cp, nativesDir, loggingPath, mainClassOverride, extraClasspath, send } = await prepareGame(instanceName);
  send("[eoncode] Uruchamianie gry…\n");
  const effRam = ramMb || inst.settings?.ramMb || 2048;
  const effW = width || inst.settings?.width || null;
  const effH = height || inst.settings?.height || null;
  // Online si hay cuenta Microsoft válida; si no, offline con el nombre escrito
  let authArg = null;
  try {
    const acc = await auth.validAccount(d.base, auth.getClientId(d.base));
    if (acc) {
      authArg = { uuid: acc.profile.uuid, token: acc.mcToken, username: acc.profile.name, xuid: acc.uhs };
      send(`[eoncode] Konto Microsoft: ${acc.profile.name}\n`);
    } else {
      send("[eoncode] Bez konta Microsoft: tryb offline\n");
    }
  } catch (e) {
    send(`[eoncode] Nie udało się odświeżyć sesji; tryb offline (${e.message})\n`);
  }
  if (!authArg) {
    const uname = (username || 'EonCode').trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(uname)) throw new Error('Nick offline musi mieć 3–16 liter, cyfr lub znaków _.');
    send(`[eoncode] Profil offline: ${uname}. Serwery z weryfikacją Microsoft wymagają zalogowania.\n`);
  }
  let recentGameLog = '';
  const gameLog = text => { recentGameLog = (recentGameLog + text).slice(-32000); send(text); };
  activeChild = await launch({ javaPath: javaBin, versionDetails: details, clientJar, librariesCp: cp, nativesDir, loggingPath, instanceDir: inst.path, dataDirs: d, username: username || 'EonCode', ramMb: effRam, width: effW, height: effH, onLog: gameLog, mainClassOverride, extraClasspath, auth: authArg, jvmPreset: inst.settings?.jvmPreset, javaMajor: java.major, serverHost, serverPort });
  activeInstance = inst.name;
  activeT0 = Date.now();
  // Puente: eventos del mod + RPC vivo cada 5 s.
  try { if (bridgeTimer) clearInterval(bridgeTimer); } catch {}
  try {
    const bInst = inst, bD = d;
    const bUser = (authArg && authArg.username) || username || 'EonCode';
    let pollN = 0;
    const pollBridge = () => {
      try {
        drainBridge(bD, bInst, send);
        if (++pollN % 6 === 0) {
          let st = null;
          try { st = JSON.parse(require('fs').readFileSync(require('path').join(bInst.path, 'config', 'ferrobridge-status.json'), 'utf8')); } catch {}
          if (st && st.ts && Date.now() - st.ts < 90000) {
            try {
              const dc = auth.getDiscord(bD.base);
              if (dc.enabled && dc.clientId) {
                const where = st.server || (st.dim ? String(st.dim).split(':').pop() : '');
                discord.setPlaying(dc.clientId, { version: details.id, instance: bInst.name, loader: bInst.type, username: bUser, appVer: app.getVersion(), extra: where, startedAt: activeT0 }, null);
              }
            } catch {}
          }
        }
      } catch {}
    };
    setTimeout(pollBridge, 8000);
    bridgeTimer = setInterval(pollBridge, 5000);
  } catch {}
  touchPlayed(d.instances, inst.name);
  notify(d.base, 'info', `Gra: ${details.id}`, `${inst.name} · ${inst.type === 'vanilla' ? 'vanilla' : inst.type} · ${(authArg && authArg.username) || username || 'EonCode'}`);
  // Discord RPC (no bloquea; falla en silencio sin cliente Discord)
  try {
    const dc = auth.getDiscord(d.base);
    if (dc.enabled && dc.clientId) {
      discord.setPlaying(dc.clientId, { version: details.id, instance: inst.name, loader: inst.type, username: (authArg && authArg.username) || username || 'EonCode', appVer: app.getVersion() }, send);
    }
  } catch {}
  activeChild.on('close', () => {
    const secs = activeT0 ? Math.round((Date.now() - activeT0) / 1000) : 0;
    if (activeInstance && secs >= 60) {
      const total = addPlayTime(d.instances, activeInstance, secs);
      if (total) send(`[eoncode] Czas sesji: ${Math.floor(secs / 60)} min (łącznie ${fmtPlay(total)})\n`);
    }
    activeChild = null; activeInstance = null; activeT0 = null;
    try { if (bridgeTimer) { clearInterval(bridgeTimer); bridgeTimer = null; } } catch {}
    try {
      const dc2 = auth.getDiscord(d.base);
      if (dc2.enabled && dc2.clientId) discord.setIdle(dc2.clientId, idleInfo());
      else discord.clear();
    } catch {}
  });
  activeChild.on('close', (code) => {
    win?.webContents.send('eon:gameStopped');
    lastExit = { instance: inst.name, code };
    if (code !== 0 && code !== null) {
      win?.webContents.send('eon:gameError', require('../core/gameErrors').explainGameError(recentGameLog || ('Kod zakończenia: ' + code)));
      send(`[eoncode] Błąd gry w ${inst.name} (kod ${code})\n`);
      notify(d.base, 'error', `Błąd gry: ${inst.name}`, `Kod ${code}. Raport znajdziesz w zakładce Moje instancje.`);
    }
  });
  return true;
  } finally { preparingGame = false; }
});
