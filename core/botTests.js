const {randomBytes}=require('crypto');

function validate(data) {
  const host=String(data.host||'').trim(), port=Number(data.port??25565), count=Number(data.count);
  if(!host || host.length>253 || /[\s/\\:@\x00]/.test(host)) throw new Error('Podaj sam adres serwera, a port w osobnym polu.');
  if(!Number.isInteger(port)||port<1||port>65535) throw new Error('Port musi mieścić się między 1 a 65535.');
  if(!Number.isInteger(count)||count<1||count>50) throw new Error('Test obsługuje od 1 do 50 botów.');
  return {host,port,count};
}
function createBotTests({createBot,command=()=>{},getLocal=()=>null,now=Date.now}={}) {
  let run=null, joinTimer=null, travelTimer=null, endTimer=null;
  const log=(r,text)=>{r.log.push({time:now(),text:String(text).slice(0,1500)});if(r.log.length>100)r.log.shift();};
  const cleanup=(r,item)=>{
    if(item.timeout)clearTimeout(item.timeout);
    if(item.granted){try{command(r.serverId,`deop ${item.name}`);item.granted=false;}catch{log(r,`Nie udało się odebrać OP ${item.name}. Odbierz uprawnienia w konsoli serwera.`);}}
  };
  const stop=()=>{
    clearTimeout(joinTimer);clearInterval(travelTimer);clearTimeout(endTimer);
    if(!run)return;
    run.active=false;run.travelling=false;
    for(const item of run.bots){cleanup(run,item);try{item.bot?.end('Test zakończony');}catch{}item.state='stopped';}
    log(run,'Test zakończony. Boty rozłączone.');
  };
  const status=()=>run?{...run,bots:run.bots.map(({bot,timeout,...item})=>({...item,position:bot?.entity?.position?{x:Math.round(bot.entity.position.x),y:Math.round(bot.entity.position.y),z:Math.round(bot.entity.position.z)}:null})),log:[...run.log]}:{active:false,bots:[],log:[],travelling:false};
  function start(data) {
    if(run?.active)throw new Error('Zatrzymaj bieżący test przed kolejnym.');
    let local=null;
    if(data.serverId){local=getLocal(data.serverId);if(!local?.running)throw new Error('Uruchom wybrany serwer lokalny.');if(local.onlineMode)throw new Error('Boty testowe używają kont offline. Przygotuj lokalny serwer testowy z online-mode=false i uruchom go ponownie.');}
    else if(data.authorized!==true)throw new Error('Potwierdź zgodę właściciela serwera na ten test.');
    const target=validate({...data,host:local?'127.0.0.1':data.host,port:local?local.port:data.port});
    const r=run={...target,serverId:local?.id||null,active:true,travelling:false,started:now(),bots:[],log:[]};
    const prefix='Eon_'+randomBytes(3).toString('hex');
    log(r,'Łączenie botów co 2 sekundy. Maksymalny czas testu: 10 minut.');
    let index=0;
    const join=()=>{
      if(run!==r||!r.active)return;
      const item={name:prefix+'_'+String(++index).padStart(2,'0'),state:'connecting',chunks:0,granted:false};r.bots.push(item);
      try {
        const factory=createBot||require('mineflayer').createBot;
        const bot=item.bot=factory({host:target.host,port:target.port,username:item.name,auth:'offline',version:false,viewDistance:'short',logErrors:false,hideErrors:true});
        item.timeout=setTimeout(()=>{if(item.state==='connecting'){item.state='error';log(r,`${item.name}: przekroczono czas połączenia.`);bot.end();}},30000);
        bot.once('spawn',()=>{
          clearTimeout(item.timeout);if(!r.active){bot.end();return;}item.state='connected';
          if(local&&data.operators===true){try{command(local.id,`op ${item.name}`);item.granted=true;}catch(e){log(r,e.message);}}
          log(r,`${item.name}: połączono.`);
        });
        bot.on('chunkColumnLoad',()=>item.chunks++);
        bot.on('messagestr',text=>log(r,`${item.name}: ${text}`));
        bot.on('kicked',reason=>{item.state='error';log(r,`${item.name}: wyrzucono — ${typeof reason==='string'?reason:JSON.stringify(reason)}`);cleanup(r,item);});
        bot.on('error',e=>{item.state='error';log(r,`${item.name}: ${e.message}`);cleanup(r,item);try{bot.end();}catch{}});
        bot.on('end',()=>{cleanup(r,item);if(item.state!=='error')item.state='stopped';if(index===target.count&&r.bots.every(b=>['stopped','error'].includes(b.state))){r.active=false;r.travelling=false;if(run===r){clearInterval(travelTimer);clearTimeout(endTimer);}}});
      }catch(e){item.state='error';log(r,e.message);}
      if(index<target.count)joinTimer=setTimeout(join,2000);
      else if(r.bots.every(b=>b.state==='error'))r.active=false;
    };
    clearTimeout(endTimer);clearInterval(travelTimer);clearTimeout(joinTimer);
    join();if(r.active)endTimer=setTimeout(stop,600000);return status();
  }
  function teleport(data) {
    if(!run?.active)throw new Error('Najpierw połącz boty.');
    const x=Number(data.x),y=Number(data.y),z=Number(data.z),radius=Number(data.radius||0);
    if(![x,y,z,radius].every(Number.isFinite)||Math.abs(x)>29000000||Math.abs(z)>29000000||y< -64||y>320||radius<0||radius>10000)throw new Error('Nieprawidłowe współrzędne lub promień (0–10000).');
    const connected=run.bots.filter(b=>b.state==='connected');
    if(!connected.length)throw new Error('Brak połączonych botów.');
    for(const item of connected){
      const tx=Math.round(x+(Math.random()*2-1)*radius),tz=Math.round(z+(Math.random()*2-1)*radius);
      const cmd=`tp ${item.name} ${tx} ${Math.round(y)} ${tz}`;
      if(run.serverId)command(run.serverId,cmd);else item.bot.chat('/'+cmd);
    }
    log(run,'Wysłano teleportację. Pozycje na liście pokazują wynik potwierdzony przez serwer.');return status();
  }
  return {start,stop:()=>{stop();return status();},status,teleport,
    travel(data){const interval=Number(data.interval);if(!Number.isInteger(interval)||interval<5||interval>120)throw new Error('Odstęp teleportacji: 5–120 sekund.');clearInterval(travelTimer);teleport(data);run.travelling=true;travelTimer=setInterval(()=>{try{teleport(data);}catch(e){clearInterval(travelTimer);run.travelling=false;log(run,e.message);}},interval*1000);return status();},
    pause(){clearInterval(travelTimer);if(run)run.travelling=false;return status();}
  };
}
module.exports={createBotTests,validate};
