const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const os=require('os');
const {createService,validate}=require('../core/developerService');
const valid={name:'Test',software:'Paper',version:'1.21.1',ram:2,port:25565,java:'java',eula:true};
test('developer config rejects unsafe paths, invalid memory, ports and missing EULA',()=>{
 for(const patch of [{ram:0},{ram:1.5},{port:80},{port:70000},{version:'../escape'},{software:'other'},{eula:false},{name:''}]) assert.throws(()=>validate({...valid,...patch}));
 assert.equal(validate(valid).name,'Test');
});
test('server profiles persist; backup restore recovers files and saves previous state',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eon-dev-test-'));
 try{
  const jar=path.join(dir,'input.jar');fs.writeFileSync(jar,'test fixture');
  const service=createService(path.join(dir,'servers'));const id=await service.create(valid,jar);
  const root=service.folder(id);assert.equal(service.list()[0].name,'Test');
  assert.deepEqual(service.list()[0].publicAccess,{provider:'none',address:'',agentPath:'',autoStart:false});
  const publicAccess=service.updatePublicAccess(id,{provider:'playit',address:'test.gl.joinmc.link',agentPath:'C:\\Tools\\playit.exe',autoStart:true});
  assert.equal(publicAccess.provider,'playit');assert.equal(createService(path.join(dir,'servers')).list()[0].publicAccess.address,'test.gl.joinmc.link');
  assert.throws(()=>service.updatePublicAccess(id,{provider:'playit',address:'bad\naddress'}));
  assert.throws(()=>service.updatePublicAccess(id,{provider:'playit',address:'https://bad.example'}),/bez https/);
  assert.throws(()=>service.updatePublicAccess(id,{provider:'playit',address:'test.example:99999'}),/Port/);
  assert.match(fs.readFileSync(path.join(root,'server.properties'),'utf8'),/server-ip=127.0.0.1/);
  fs.writeFileSync(path.join(root,'world.txt'),'original');const backup=await service.backup(id);
  fs.writeFileSync(path.join(root,'world.txt'),'changed');fs.writeFileSync(path.join(root,'new.txt'),'new file');
  await service.restore(id,backup);assert.equal(fs.readFileSync(path.join(root,'world.txt'),'utf8'),'original');assert.equal(fs.existsSync(path.join(root,'new.txt')),false);
  assert.equal(createService(path.join(dir,'servers')).list().length,1);
  assert.throws(()=>service.folder('../escape'));await assert.rejects(()=>service.restore(id,'../../escape'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('non-Purpur software requires explicit server JAR',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eon-dev-test-'));
 try{await assert.rejects(()=>createService(dir).create(valid),/JAR/);assert.deepEqual(fs.readdirSync(dir),[]);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
