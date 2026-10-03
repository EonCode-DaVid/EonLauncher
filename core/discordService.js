let client = null;
let clientIdUsed = null;



async function connect(clientId, onLog) {
  if (!clientId) return null;
  if (client && clientIdUsed === clientId) return client;
  disconnect();
  try {
    const RPC = require('discord-rpc');
    const c = new RPC.Client({ transport: 'ipc' });
    await c.login({ clientId });
    client = c;
    clientIdUsed = clientId;
    return c;
  } catch (e) {
    onLog && onLog(`[eoncode] Discord jest niedostępny (${e.message?.slice(0, 80)}) — integracja Discord wyłączona\n`);
    client = null;
    return null;
  }
}

function isConnected() {
  return !!(client && clientIdUsed);
}

function base(version) {
  return {
    largeImageKey: 'logo',
    largeImageText: version ? `EonCode v${version}` : "EonCode",

  };
}

// Reposo: visible con solo abrir el launcher.
async function setIdle(clientId, { username, count, version, startedAt }, onLog) {
  const c = await connect(clientId, onLog);
  if (!c) return;
  const n = Number(count) || 0;
  try {
    await c.setActivity({
      ...base(version),
      details: "W launcherze",
      state: `${username || 'Tryb offline'} · Liczba instancji: ${n}`,
      startTimestamp: startedAt || Date.now(),
    });
  } catch (e) {
    onLog && onLog(`[eoncode] discord: ${e.message?.slice(0, 80)}\n`);
  }
}

async function setPlaying(clientId, { version, instance, loader, username, appVer, extra, startedAt }, onLog) {
  const c = await connect(clientId, onLog);
  if (!c) return;
  try {
    await c.setActivity({
      ...base(appVer),
      details: `Minecraft ${version}`,
      state: `${instance}${loader && loader !== 'vanilla' ? ` · ${loader}` : ''} — ${username}${extra ? ` · ${extra}` : ''}`,
      startTimestamp: startedAt || Date.now(),
    });
  } catch (e) {
    onLog && onLog(`[eoncode] discord: ${e.message?.slice(0, 80)}\n`);
  }
}

function clear() {
  try { client && client.clearActivity(); } catch {}
}

function disconnect() {
  try { client && client.destroy(); } catch {}
  client = null;
  clientIdUsed = null;
}

module.exports = { connect, isConnected, setIdle, setPlaying, clear, disconnect };
