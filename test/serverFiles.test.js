const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {editor}=require('../core/serverFiles');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'eon-editor-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.writeFileSync(path.join(root,'server.properties'),'motd=Hello\r\n');return{root,api:editor(root)};}
test('editor saves with backup, preserves line endings and rejects stale writes',t=>{
 const {root,api}=fixture(t), doc=api.read('server.properties');
 const updated=api.write('server.properties','motd=Eon\n',doc.revision);
 assert.equal(updated.content,'motd=Eon\r\n');
 const backup=fs.readdirSync(path.join(root,'.eon-editor'))[0];
 assert.equal(fs.readFileSync(path.join(root,'.eon-editor',backup),'utf8'),doc.content);
 assert.throws(()=>api.write('server.properties','oops',doc.revision),/zmieniony/);
 assert.equal(api.read('server.properties').content,updated.content);
});
test('editor confines paths and rejects binary, oversized and internal metadata writes',t=>{
 const {root,api}=fixture(t);
 for(const file of ['../outside','C:\\Windows\\win.ini','/etc/passwd','.eon-editor/a','a:stream','foo./bar']) assert.throws(()=>api.read(file));
 fs.writeFileSync(path.join(root,'server.jar'),Buffer.from([1,0,2]));assert.throws(()=>api.read('server.jar'),/binarny/);
 fs.writeFileSync(path.join(root,'large.log'),'x'.repeat(1048577));assert.throws(()=>api.read('large.log'),/1 MB/);
 fs.writeFileSync(path.join(root,'eon.json'),'{}');const doc=api.read('eon.json');assert.throws(()=>api.write('eon.json','{}',doc.revision),/odczytu/);
});
test('editor rejects directory junctions escaping server root',t=>{
 const {root,api}=fixture(t);const outside=fs.mkdtempSync(path.join(os.tmpdir(),'eon-outside-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
 fs.writeFileSync(path.join(outside,'private.txt'),'private');fs.symlinkSync(outside,path.join(root,'link'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>api.read('link/private.txt'),/Dowiązania/);assert.ok(!api.list().some(e=>e.name==='link'));
});
