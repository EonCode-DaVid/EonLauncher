const os = require('os');

const PRESETS = {
  equilibrado: [],
  rendimiento: [
    '-XX:+UnlockExperimentalVMOptions', '-XX:+UseG1GC', '-XX:+ParallelRefProcEnabled',
    '-XX:MaxGCPauseMillis=200', '-XX:+DisableExplicitGC', '-XX:+AlwaysPreTouch',
    '-XX:G1NewSizePercent=30', '-XX:G1MaxNewSizePercent=40', '-XX:G1HeapRegionSize=8M',
    '-XX:G1ReservePercent=20', '-XX:G1HeapWastePercent=5', '-XX:G1MixedGCCountTarget=4',
    '-XX:InitiatingHeapOccupancyPercent=15', '-XX:G1MixedGCLiveThresholdPercent=90',
    '-XX:SurvivorRatio=32', '-XX:+PerfDisableSharedMem', '-XX:MaxTenuringThreshold=1',
  ],
  patata: [
    '-XX:+UseSerialGC', '-XX:+TieredCompilation', '-XX:TieredStopAtLevel=1',
    '-XX:+DisableExplicitGC', '-XX:MaxGCPauseMillis=500',
  ],
  zgc: ['-XX:+UnlockExperimentalVMOptions', '-XX:+UseZGC', '-XX:+DisableExplicitGC'],
};

const LABELS = ['equilibrado', 'rendimiento', 'patata', 'zgc'];

function suggestRam(type = 'vanilla', memory = { total: os.totalmem(), free: os.freemem() }) {
  const totalMb = Math.floor(memory.total / 1048576);
  const freeMb = Math.floor(memory.free / 1048576);
  const reserveMb = Math.max(2048, Math.ceil(totalMb * 0.25 / 512) * 512);
  const maxMb = Math.max(512, Math.min(16384, Math.floor((totalMb - reserveMb) / 512) * 512));
  const availableMb = Math.max(512, Math.floor((freeMb - 1024) / 512) * 512);
  const target = type === 'vanilla' ? 3072 : 6144;
  const suggestedMb = Math.min(target, maxMb, availableMb);
  return { totalGb: Math.round(totalMb / 102.4) / 10, freeGb: Math.round(freeMb / 102.4) / 10, suggestedMb, maxMb, availableMb, reserveMb, lowMemory: suggestedMb < 2048 };
}

// ZGC solo en Java 17+; si no, cae a G1 (rendimiento)
function flagsFor(preset, javaMajor) {
  const p = LABELS.includes(preset) ? preset : 'equilibrado';
  if (p === 'zgc' && !(javaMajor >= 17)) return PRESETS.rendimiento;
  return PRESETS[p];
}

module.exports = { PRESETS, LABELS, suggestRam, flagsFor };
