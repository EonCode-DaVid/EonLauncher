const fs = require('fs');
const path = require('path');

// Cada regla: qué buscar (log o código de salida) -> diagnóstico + arreglo opcional
const RULES = [
  {
    id: 'oom', title: "Brak pamięci (OutOfMemory)",
    match: /OutOfMemoryError|Could not reserve enough space|insufficient memory|malloc|commit_memory/i,
    exit: [-805306369],
    desc: "Minecraft wykorzystał przydzieloną pamięć. Zwiększ limit RAM.",
    fix: { type: 'ram', mb: 6144, label: "Zwiększ RAM do 6 GB" },
  },
  {
    id: 'ram32', title: "Zbyt dużo RAM dla 32-bitowej Javy",
    match: /Could not reserve enough space for.*heap|exceeds maximum representable/i,
    desc: "Ta Java nie obsługuje wybranego limitu pamięci. Użyj wersji 64-bitowej lub zmniejsz RAM.",
    fix: { type: 'ram', mb: 2048, label: "Zmniejsz RAM do 2 GB" },
  },
  {
    id: 'natives', title: "Uszkodzone biblioteki systemowe (DLL)",
    match: /UnsatisfiedLinkError|Failed to load library|natives|EXCEPTION_.*0x/i,
    desc: "Biblioteki systemowe są uszkodzone. Zostaną pobrane ponownie przy uruchomieniu.",
    fix: { type: 'wipeNatives', label: "Wyczyść biblioteki systemowe i spróbuj ponownie" },
  },
  {
    id: 'javaversion', title: "Niewłaściwa wersja Javy",
    match: /UnsupportedClassVersionError|class file version|Unsupported major\.minor/i,
    desc: "Ta wersja gry wymaga innej Javy. Launcher dobierze ją podczas uruchamiania.",
    fix: null,
  },
  {
    id: 'driver', title: "Sterownik graficzny",
    match: /EXCEPTION_ACCESS_VIOLATION|Pixel format not accelerated|org\.lwjgl.*GL|ig7icd|nvogl/i,
    desc: "Błąd sterownika grafiki. Zaktualizuj sterowniki karty Intel, NVIDIA lub AMD.",
    fix: null,
  },
  {
    id: 'moddep', title: "Problem z zależnościami modyfikacji",
    match: /Missing Mods|Dependency|mods\.toml|NoClassDefFoundError|NoSuchMethodError|MixinApplyError|mixin/i,
    desc: "Modyfikacja ma brakujące zależności lub niezgodną wersję. Sprawdź ostatnio zainstalowane mody.",
    fix: null,
  },
  {
    id: 'acceso', title: "Brak uprawnień lub blokada antywirusa",
    match: /AccessDeniedException|Permission denied|java\.nio\.file\.AccessDenied/i,
    desc: "System lub antywirus zablokował pliki gry. Sprawdź uprawnienia oraz historię ochrony.",
    fix: null,
  },
];

const EXIT_HINTS = {
  '-1073741819': 'driver',
  '-805306369': 'oom',
  '-1': null,
  1: null,
};

function diagnose({ logTail = '', exitCode = null, crashDesc = '' }) {
  const text = `${logTail}\n${crashDesc}`;
  const out = [];
  const seen = new Set();
  const push = (r) => { if (!seen.has(r.id)) { seen.add(r.id); out.push({ id: r.id, title: r.title, desc: r.desc, fix: r.fix || null }); } };
  for (const r of RULES) {
    if (r.match && r.match.test(text)) push(r);
    if (r.exit && exitCode !== null && r.exit.includes(Number(exitCode))) push(r);
  }
  if (exitCode !== null && EXIT_HINTS[String(exitCode)] && out.length === 0) {
    const r = RULES.find((x) => x.id === EXIT_HINTS[String(exitCode)]);
    if (r) push(r);
  }
  return out;
}

function readTail(p, maxLines = 120) {
  try {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    return lines.slice(-maxLines).join('\n');
  } catch { return ''; }
}

function latestLogTail(instanceDir) {
  return readTail(path.join(instanceDir, 'logs', 'latest.log'));
}

function lastCrashDesc(instanceDir) {
  try {
    const dir = path.join(instanceDir, 'crash-reports');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt'))
      .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    if (!files.length) return '';
    const head = fs.readFileSync(path.join(dir, files[0].f), 'utf8').slice(0, 3000);
    const m = head.match(/Description:\s*(.+)/);
    return m ? m[1].trim().slice(0, 200) : '';
  } catch { return ''; }
}

module.exports = { diagnose, latestLogTail, lastCrashDesc, RULES };
