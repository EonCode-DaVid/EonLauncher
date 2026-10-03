const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function createPlayitManager() {
  let child = null;
  let state = 'stopped';
  let mode = null;
  let log = '';
  let claimUrl = '';
  let started = null;

  const append = chunk => {
    const text = String(chunk || '');
    log = (log + text).slice(-24000);
    const hit = text.match(/https:\/\/playit\.gg\/(?:claim|login\/guest-account)\/[A-Za-z0-9_-]+/i);
    if (hit) claimUrl = hit[0];
  };
  const executable = value => {
    const selected = String(value || '').trim();
    if (!selected) return 'playit';
    if (path.extname(selected).toLowerCase() !== '.exe' || !fs.existsSync(selected) || !fs.statSync(selected).isFile()) {
      throw new Error('Wybierz poprawny plik playit.exe pobrany z oficjalnej strony.');
    }
    return selected;
  };
  const launch = (exe, args, nextMode) => {
    if (child) throw new Error('Agent playit już pracuje.');
    const command = executable(exe);
    state = nextMode === 'setup' ? 'configuring' : 'starting';
    mode = nextMode;
    log = '';
    claimUrl = '';
    started = Date.now();
    const proc = spawn(command, args, { windowsHide:true, shell:false, stdio:['ignore','pipe','pipe'] });
    child = proc;
    proc.stdout.on('data', append);
    proc.stderr.on('data', append);
    proc.once('spawn', () => { state = nextMode === 'setup' ? 'configuring' : 'running'; });
    proc.once('error', error => {
      append(`\n[eoncode] ${error.message}\n`);
      state = 'error'; child = null;
    });
    proc.once('close', code => {
      append(`\n[eoncode] Agent zakończył pracę (kod ${code}).\n`);
      state = code === 0 ? 'stopped' : 'error'; child = null;
    });
    return status();
  };
  const status = () => ({state, mode, running:!!child, log, claimUrl, started});
  return {
    status,
    setup(exe) { return launch(exe, ['--stdout','setup'], 'setup'); },
    start(exe) { return launch(exe, ['--stdout'], 'tunnel'); },
    stop() {
      if (!child) return status();
      state = 'stopping';
      child.kill();
      return status();
    },
    noteError(error) { state='error'; append(`\n[eoncode] ${error?.message || error}\n`); return status(); },
    shutdown() { if (child) child.kill(); },
  };
}

module.exports = { createPlayitManager };
