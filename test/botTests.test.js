const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('events');
const {createBotTests,validate}=require('../core/botTests');

function fixture(t,local=true){const clients=[],commands=[];const service=createBotTests({createBot:opts=>{const b=new EventEmitter();b.options=opts;b.chat=cmd=>commands.push(cmd);b.end=()=>b.emit('end');clients.push(b);return b;},getLocal:id=>({id,port:25566,running:true,onlineMode:!local}),command:(id,cmd)=>commands.push(cmd)});t.after(()=>service.stop());return{service,clients,commands};}
test('bot test requires authorization for custom target and validates protocol fields',t=>{
 const {service}=fixture(t);
 assert.throws(()=>service.start({host:'example.com',count:2}),/zgodę/);
 assert.equal(validate({host:'localhost',count:50}).count,50);
 for(const data of [{host:'mc.example\nstop',count:1},{host:'example.com',count:51},{host:'example.com',count:1,port:0},{host:'example.com',count:1,port:65536}]){
  assert.throws(()=>validate(data));
 }
 assert.throws(()=>validate({host:'https://example.com',count:1}));
});
test('real Minecraft protocol connection, teleport command and disconnect', {timeout:20000},async t=>{
 const mc=require('minecraft-protocol');
 const server=mc.createServer({host:'127.0.0.1',port:0,version:'1.16.5','online-mode':false});
 const service=createBotTests();
 t.after(()=>{service.stop();for(const client of Object.values(server.clients))client.end();server.close();});
 await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
 let received='';
 server.on('playerJoin',client=>{
  const login=require('minecraft-data')('1.16.5').loginPacket;
  client.write('login',{...login,entityId:1,isHardcore:false,gameMode:1,previousGameMode:1,hashedSeed:[0,0],maxPlayers:10,viewDistance:2,reducedDebugInfo:false,enableRespawnScreen:true,isDebug:false,isFlat:true});
  client.write('position',{x:0,y:100,z:0,yaw:0,pitch:0,flags:0,teleportId:1});
  client.write('update_health',{health:20,food:20,foodSaturation:5});
  client.on('chat',packet=>{received=packet.message;});
 });
 service.start({host:'127.0.0.1',port:server.socketServer.address().port,count:1,authorized:true});
 const until=async condition=>{const deadline=Date.now()+10000;while(!condition()){if(Date.now()>deadline)throw new Error(JSON.stringify(service.status()));await new Promise(resolve=>setTimeout(resolve,50));}};
 await until(()=>service.status().bots[0]?.state==='connected');
 const name=service.status().bots[0].name;
 service.teleport({x:12,y:100,z:34,radius:0});await until(()=>received===`/tp ${name} 12 100 34`);
 service.stop();await until(()=>Object.keys(server.clients).length===0);
});
test('local test refuses online-mode rather than changing authentication',t=>{
 const {service,clients}=fixture(t,false);
 assert.throws(()=>service.start({serverId:'local',count:1}),/online-mode=false/);assert.equal(clients.length,0);
});
test('local operators are revoked and connections released when test ends',t=>{
 const {service,clients,commands}=fixture(t);
 service.start({serverId:'local',count:1,operators:true});const bot=clients[0];
 assert.equal(bot.options.host,'127.0.0.1');assert.equal(bot.options.port,25566);assert.equal(bot.options.auth,'offline');
 bot.emit('spawn');bot.emit('chunkColumnLoad');
 assert.equal(service.status().bots[0].chunks,1);assert.equal(service.status().bots[0].granted,true);
 service.teleport({x:120,y:100,z:-30,radius:0});assert.ok(commands.includes(`tp ${bot.options.username} 120 100 -30`));
 service.stop();assert.ok(commands.includes(`deop ${bot.options.username}`));assert.equal(service.status().active,false);
});
test('external teleport uses bot chat and does not attempt to grant itself OP',t=>{
 const {service,clients,commands}=fixture(t);
 service.start({host:'example.test',count:1,authorized:true,operators:true});clients[0].emit('spawn');
 service.teleport({x:1,y:80,z:2});assert.equal(commands[0],`/tp ${clients[0].options.username} 1 80 2`);
 assert.throws(()=>service.travel({x:0,y:100,z:0,interval:1}),/5–120/);
 assert.throws(()=>service.teleport({x:'1\nop someone',y:100,z:0}),/współrzędne/);
});
test('stopping test cancels pending joins and travel',async t=>{
 const {service,clients}=fixture(t);service.start({serverId:'local',count:2});clients[0].emit('spawn');service.travel({x:0,y:90,z:0,interval:5});
 service.stop();await new Promise(resolve=>setTimeout(resolve,2100));assert.equal(clients.length,1);assert.equal(service.status().travelling,false);
});
