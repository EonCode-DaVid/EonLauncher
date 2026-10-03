// Keep the latest state so renderers opened after an event still see it.
module.exports = function createUpdates({ updater, packaged, configured, portable, version, send, canInstall }) {
  let state = { state: !packaged ? 'dev' : !configured ? 'unconfigured' : portable ? 'portable' : 'idle', version };
  let checking = false;
  const push = (value) => { state = { ...value, currentVersion: version }; send(state); return state; };
  const enabled = packaged && configured && !portable;
  if (enabled) {
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowDowngrade = false;
    updater.on('checking-for-update', () => push({ state: 'checking' }));
    updater.on('update-available', info => push({ state: 'available', version: info.version }));
    updater.on('update-not-available', () => push({ state: 'current', version }));
    updater.on('download-progress', p => push({ ...state, state: 'downloading', percent: Math.max(0, Math.min(100, p.percent || 0)) }));
    updater.on('update-downloaded', info => push({ state: 'downloaded', version: info.version }));
    updater.on('error', () => push({ state: 'error', error: 'Nie udało się pobrać aktualizacji. Sprawdź połączenie i spróbuj ponownie.' }));
  }
  return {
    getState: () => state,
    async check() {
      if (!enabled || checking || ['downloading', 'downloaded'].includes(state.state)) return state;
      checking = true;
      try { await updater.checkForUpdates(); }
      catch { push({ state: 'error', error: 'Nie udało się sprawdzić aktualizacji. Spróbuj ponownie później.' }); }
      finally { checking = false; }
      return state;
    },
    async download() {
      if (!enabled || state.state !== 'available') return state;
      push({ ...state, state: 'downloading', percent: 0 });
      try { await updater.downloadUpdate(); }
      catch { push({ state: 'error', error: 'Pobieranie nie powiodło się. Sprawdź ponownie dostępność aktualizacji.' }); }
      return state;
    },
    install() {
      if (!enabled || state.state !== 'downloaded') throw new Error('Aktualizacja nie jest jeszcze gotowa.');
      if (!canInstall()) throw new Error('Przed aktualizacją zatrzymaj grę i lokalne serwery.');
      updater.quitAndInstall(false, true);
      return true;
    },
  };
};
