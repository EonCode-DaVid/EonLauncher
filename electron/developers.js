const { ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { createService } = require('../core/developerService');
module.exports = function registerDevelopers(base) {
  const service = createService(path.join(base,'eon-servers'));
  const monitor = require('../core/processMetrics').createMonitor();
  const playit = require('../core/playitManager').createPlayitManager();
  const bots = require('../core/botTests').createBotTests({command:(id,text)=>service.command(id,text),getLocal:id=>{
    const server=service.list().find(s=>s.id===id);if(!server)return null;
    const properties=require('fs').readFileSync(path.join(service.folder(id),'server.properties'),'utf8');
    return {...server,onlineMode:!/^online-mode\s*=\s*false\s*$/m.test(properties)};
  }});
  ipcMain.handle('eon:botTests',(_, {action,...data})=>{
    if(!['start','stop','status','teleport','travel','pause'].includes(action))throw new Error('Nieznana operacja testu.');
    return bots[action](data);
  });
  ipcMain.handle('eon:devMetrics',()=>monitor.sample(service.list()));
  let chosenJar = null;
  const locks = new Set();
  ipcMain.handle('eon:devFiles', (_, {id, action, file = '', content, revision}) => {
    if (locks.has(id)) throw new Error('Poczekaj na zakończenie operacji serwera.');
    const files = require('../core/serverFiles').editor(service.folder(id));
    if (action === 'list') return files.list(file);
    if (action === 'read') return files.read(file);
    if (action === 'write') return files.write(file, content, revision);
    throw new Error('Nieznana operacja plików.');
  });
  ipcMain.handle('eon:devList',()=>service.list());
  ipcMain.handle('eon:devPickJar',async()=>{
    const result=await dialog.showOpenDialog({title:'Wybierz uruchamialny JAR serwera',properties:['openFile'],filters:[{name:'Serwer Java',extensions:['jar']}]});
    chosenJar=result.canceled ? null:result.filePaths[0];return chosenJar;
  });
  ipcMain.handle('eon:devCreate',async(_,data)=>service.create(data,data.useJar ? chosenJar:null));
  ipcMain.handle('eon:devPublicSave',(_, {id,settings})=>service.updatePublicAccess(id,settings));
  ipcMain.handle('eon:playitPick',async()=>{
    const result=await dialog.showOpenDialog({title:'Wybierz oficjalny program playit.exe',properties:['openFile'],filters:[{name:'Agent playit',extensions:['exe']}]});
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('eon:playitStatus',()=>playit.status());
  ipcMain.handle('eon:playitAction',(_, {action,agentPath})=>{
    if(action==='setup') return playit.setup(agentPath);
    if(action==='start') return playit.start(agentPath);
    if(action==='stop') return playit.stop();
    if(action==='openClaim') {
      const url=playit.status().claimUrl;
      if(!/^https:\/\/playit\.gg\/(?:claim|login\/guest-account)\//i.test(url)) throw new Error('Link przypisania nie jest jeszcze gotowy.');
      shell.openExternal(url);return true;
    }
    if(action==='download') {shell.openExternal('https://playit.gg/download');return true;}
    if(action==='dashboard') {shell.openExternal('https://playit.gg/account/tunnels');return true;}
    throw new Error('Nieznana operacja playit.');
  });
  ipcMain.handle('eon:devAction',async(_, {id,action,command,backup})=>{
    if(locks.has(id)) throw new Error('Poczekaj na zakończenie poprzedniej operacji.');
    locks.add(id);
    try {
      if(action==='exportLog') {
        const server=service.list().find(s=>s.id===id);
        if(!server) throw new Error('Nie znaleziono serwera.');
        const result=await dialog.showSaveDialog({title:'Zapisz konsolę serwera',defaultPath:'eon-serwer.log',filters:[{name:'Log serwera',extensions:['log']}]});
        if(result.canceled||!result.filePath)return false;
        await require('fs').promises.writeFile(result.filePath,server.log||'', 'utf8');
        return true;
      }
      if(action==='folder') {const error=await shell.openPath(service.folder(id));if(error) throw new Error(error);return true;}
      if(action==='backups') return service.backups(id);
      if(action==='command') return service.command(id,command);
      if(action==='restore') return await service.restore(id,backup);
      if(['start','stop','restart','backup'].includes(action)) {
        if(['stop','restart'].includes(action)&&bots.status().serverId===id)bots.stop();
        const result=await service[action](id);
        if(action==='start') {
          const server=service.list().find(item=>item.id===id);
          if(server?.publicAccess?.provider==='playit' && server.publicAccess.autoStart && !playit.status().running) {
            try { playit.start(server.publicAccess.agentPath); } catch(error) { playit.noteError(error); }
          }
        }
        return result;
      }
      throw new Error('Nieznana operacja.');
    } finally {locks.delete(id);}
  });
  const originalStopAll=service.stopAll;
  service.stopAll=()=>{bots.stop();originalStopAll();playit.shutdown();};
  return service;
};
