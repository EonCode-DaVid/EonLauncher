const { execFile } = require('child_process');
const os = require('os');

function calculateSample(previous, processInfo, at = Date.now(), cores = os.cpus().length || 1) {
  const cpuSeconds = processInfo.CPU == null ? null : Number(processInfo.CPU);
  const elapsed = previous ? (at - previous.at) / 1000 : 0;
  const cpu = previous && elapsed > 0 && Number.isFinite(previous.cpuSeconds) && Number.isFinite(cpuSeconds) ? Math.max(0, Math.min(100, (cpuSeconds - previous.cpuSeconds) / elapsed / Math.max(1, cores) * 100)) : null;
  const memory = processInfo.WorkingSet64 == null ? null : Number(processInfo.WorkingSet64);
  return { at, cpu, cpuSeconds, ramMb: Number.isFinite(memory) && memory >= 0 ? memory / 1048576 : null };
}
function createMonitor({ read = readWindowsProcesses, now = Date.now } = {}) {
  const history = new Map(), previous = new Map();
  let lastPoll = -Infinity, pending;
  return {
    async sample(servers) {
      const active = servers.filter(s=>Number.isInteger(s.pid) && s.pid>0);
      for(const id of previous.keys()) if(!active.some(s=>s.id===id)) previous.delete(id);
      if(active.length && now()-lastPoll>=4500 && !pending) {
        lastPoll=now();
        pending=(async()=>{
          try {
            const rows=await read(active.map(s=>s.pid));
            const at=now();
            for(const server of active) {
              const row=rows.find(r=>Number(r.Id)===server.pid);
              if(!row) continue;
              const old=previous.get(server.id);
              const point=calculateSample(old?.pid===server.pid?old:null,row,at);
              previous.set(server.id,{...point,pid:server.pid});
              history.set(server.id,[...(history.get(server.id)||[]),point].slice(-60));
            }
          } catch { /* Missing access or exited process: keep last sample timestamp. */ }
          finally { pending=null; }
        })();
      }
      if(pending) await pending;
      return Object.fromEntries(servers.map(s=>[s.id,{running:!!s.pid,points:history.get(s.id)||[]} ]));
    },
  };
}
function readWindowsProcesses(pids) {
  if(process.platform!=='win32') return Promise.resolve([]);
  const ids=pids.filter(p=>Number.isInteger(p)&&p>0).join(',');
  if(!ids) return Promise.resolve([]);
  return new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Get-Process -Id ${ids} -ErrorAction SilentlyContinue | Select-Object Id,CPU,WorkingSet64 | ConvertTo-Json -Compress`],{windowsHide:true,timeout:4000,maxBuffer:1048576},(error,stdout)=>{
    if(error && !stdout.trim()) return reject(error);
    try { const data=stdout.trim()?JSON.parse(stdout):[]; resolve(Array.isArray(data)?data:[data]); } catch(e){reject(e);}
  }));
}
module.exports={calculateSample,createMonitor};
