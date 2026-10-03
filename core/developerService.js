const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');

function validate(data) {
  const name = String(data.name || '').trim();
  if (!name || name.length > 60 || /[\r\n\x00]/.test(name)) throw new Error('Podaj nazwę serwera (1–60 znaków).');
  if (!['Paper','Purpur','Fabric','Forge','Velocity'].includes(data.software)) throw new Error('Nieobsługiwane oprogramowanie.');
  if (!/^[\w.+-]{1,40}$/.test(data.version || '')) throw new Error('Podaj poprawną wersję.');
  const ram = Number(data.ram), port = Number(data.port);
  if (!Number.isInteger(ram) || ram < 1 || ram > 64) throw new Error('RAM: od 1 do 64 GB.');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port: od 1024 do 65535.');
  if (data.eula !== true) throw new Error('Zaakceptuj EULA Minecraft.');
  return { name, software:data.software, version:data.version, ram, port, java:String(data.java || 'java').trim() || 'java' };
}

function createService(root) {
  fs.mkdirSync(root, { recursive:true });
  const jobs = new Map();
  const folder = (id) => {
    if (!/^[a-f0-9-]{36}$/.test(String(id))) throw new Error('Niepoprawny identyfikator.');
    const dir = path.join(root, id);
    if (!fs.existsSync(path.join(dir, 'eon.json'))) throw new Error('Nie znaleziono serwera.');
    return dir;
  };
  const config = (id) => JSON.parse(fs.readFileSync(path.join(folder(id), 'eon.json'), 'utf8'));
  const publicSettings = value => {
    const data = value && typeof value === 'object' ? value : {};
    const provider = data.provider === 'playit' ? 'playit' : 'none';
    const address = String(data.address || '').trim();
    if (address.length > 180 || /[\r\n\x00]/.test(address)) throw new Error('Podaj poprawny publiczny adres serwera.');
    if (address && !/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(address)) throw new Error('Adres powinien mieć postać domena:port, bez https://.');
    const addressPort=address.match(/:(\d+)$/)?.[1];
    if(addressPort && Number(addressPort)>65535) throw new Error('Port publicznego adresu jest nieprawidłowy.');
    const agentPath = String(data.agentPath || '').trim();
    if (agentPath.length > 500 || /[\r\n\x00]/.test(agentPath)) throw new Error('Nieprawidłowa ścieżka do agenta.');
    return {provider, address, agentPath, autoStart:data.autoStart === true};
  };
  const append = (job, chunk) => { job.log = (job.log + chunk.toString()).slice(-100000); };
  const service = {
    list() {
      return fs.readdirSync(root).filter(id=>/^[a-f0-9-]{36}$/.test(id) && fs.existsSync(path.join(root,id,'eon.json'))).map(id=>{
        const c = config(id), job = jobs.get(id);
        return {...c, publicAccess:publicSettings(c.publicAccess), pid:job?.child?.pid || null, running:!!job?.child, state:job?.state || 'stopped', path:path.join(root,id), log:job?.log || '', started:job?.started || null};
      });
    },
    updatePublicAccess(id, value) {
      const c = config(id);
      c.publicAccess = publicSettings(value);
      const target = path.join(folder(id),'eon.json'), temp = target+'.tmp';
      fs.writeFileSync(temp, JSON.stringify(c,null,2));
      fs.renameSync(temp,target);
      return c.publicAccess;
    },
    async create(data, jarPath) {
      const c = validate(data), id = randomUUID(), dir = path.join(root,id);
      if (!jarPath && c.software !== 'Purpur') throw new Error('Wybierz gotowy, uruchamialny plik JAR serwera.');
      fs.mkdirSync(dir);
      try {
        if (jarPath) {
          if (path.extname(jarPath).toLowerCase() !== '.jar' || !fs.statSync(jarPath).isFile()) throw new Error('Wybierz plik JAR.');
          await fs.promises.copyFile(jarPath, path.join(dir,'server.jar'));
        } else {
          const response = await fetch(`https://api.purpurmc.org/v2/purpur/${encodeURIComponent(c.version)}/latest/download`, { signal:AbortSignal.timeout(120000) });
          if (!response.ok) throw new Error(`Pobieranie Purpur: HTTP ${response.status}. Sprawdź wersję gry.`);
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) throw new Error('Serwer nie zwrócił poprawnego JAR.');
          await fs.promises.writeFile(path.join(dir,'server.jar'),buffer);
        }
        fs.mkdirSync(path.join(dir,'plugins'));fs.mkdirSync(path.join(dir,'mods'));
        fs.writeFileSync(path.join(dir,'eula.txt'),'eula=true\n');
        fs.writeFileSync(path.join(dir,'server.properties'),`server-ip=127.0.0.1\nserver-port=${c.port}\nonline-mode=true\nmax-players=20\nmotd=Serwer testowy EonCode\n`);
        fs.writeFileSync(path.join(dir,'eon.json'),JSON.stringify({...c,id,created:new Date().toISOString()},null,2));
        return id;
      } catch (e) { await fs.promises.rm(dir,{recursive:true,force:true}); throw e; }
    },
    start(id) {
      const c = config(id), existing = jobs.get(id);
      if (existing?.child) throw new Error('Serwer jest już uruchomiony.');
      if ([...jobs.entries()].some(([key,job])=>key !== id && job.child && config(key).port === c.port)) throw new Error('Ten port jest już używany przez inny serwer.');
      const job = {state:'starting',log:'[eoncode] Uruchamianie serwera…\n',started:Date.now(),child:null};
      jobs.set(id,job);
      const child = spawn(c.java,['-Xms512M',`-Xmx${c.ram}G`,'-jar','server.jar','nogui'],{cwd:folder(id),windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});
      job.child = child;
      child.stdout.on('data',chunk=>{append(job,chunk);if (/Done \(|Listening on/i.test(chunk.toString())) job.state='running';});
      child.stderr.on('data',chunk=>append(job,chunk));
      child.stdin.on('error',e=>append(job,`\n[eoncode] ${e.message}\n`));
      child.on('error',e=>{job.state='error';append(job,`\n[eoncode] ${e.message}. Sprawdź ścieżkę i wersję Javy.\n`);});
      child.on('close',code=>{job.child=null;job.state=code === 0 ? 'stopped':'error';append(job,`\n[eoncode] Proces zakończony (kod ${code}).\n`);});
      return true;
    },
    command(id, command) {
      folder(id);
      const job=jobs.get(id);
      if (!job?.child || job.state === 'stopping') throw new Error('Serwer nie przyjmuje komend.');
      const text=String(command).trim();
      if (!text || /[\r\n\x00]/.test(text) || text.length>1000) throw new Error('Podaj pojedynczą komendę.');
      job.child.stdin.write(text+'\n');append(job,`> ${text}\n`);return true;
    },
    stop(id) {
      const c=config(id), job=jobs.get(id);
      if (!job?.child) return true;
      if(job.state==='stopping') return true;
      job.child.stdin.write(c.software === 'Velocity' ? 'shutdown\n':'stop\n');job.state='stopping';return true;
    },
    async restart(id) {
      service.stop(id);
      const job=jobs.get(id);
      if(job?.child) await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Serwer nie zakończył pracy. Sprawdź konsolę.')),45000);
        job.child.once('close',()=>{clearTimeout(timer);resolve();});
      });
      return service.start(id);
    },
    folder,
    backups(id) {
      const dir=path.join(folder(id),'backups');
      return fs.existsSync(dir) ? fs.readdirSync(dir).filter(n=>/^backup-\d+$/.test(n)).sort().reverse():[];
    },
    async backup(id) {
      if(jobs.get(id)?.child) throw new Error('Zatrzymaj serwer przed wykonaniem spójnej kopii.');
      const dir=folder(id);
      let stamp=Date.now();
      while(fs.existsSync(path.join(dir,'backups','backup-'+stamp))) stamp++;
      const name='backup-'+stamp, dest=path.join(dir,'backups',name), pending=dest+'.partial';
      await fs.promises.mkdir(pending,{recursive:true});
      for(const item of fs.readdirSync(dir)) {
        if(['backups','server.jar','eon.json'].includes(item)) continue;
        await fs.promises.cp(path.join(dir,item),path.join(pending,item),{recursive:true,dereference:false});
      }
      await fs.promises.rename(pending,dest);
      return name;
    },
    async restore(id,name) {
      if(jobs.get(id)?.child) throw new Error('Zatrzymaj serwer przed przywróceniem kopii.');
      if(!service.backups(id).includes(name)) throw new Error('Nie znaleziono kopii.');
      const dir=folder(id), source=path.join(dir,'backups',name);
      await service.backup(id);
      for(const item of fs.readdirSync(dir)) {
        if(['backups','server.jar','eon.json'].includes(item)) continue;
        await fs.promises.rm(path.join(dir,item),{recursive:true,force:true});
      }
      for(const item of fs.readdirSync(source)) await fs.promises.cp(path.join(source,item),path.join(dir,item),{recursive:true,dereference:false});
      return true;
    },
    stopAll(){for(const [id,job] of jobs) if(job.child) service.stop(id);},
  };
  return service;
}
module.exports={createService,validate};
