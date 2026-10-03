const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function harness() {
  const handlers = new Map(), calls = [];
  let failAssets = false;
  const step = name => async () => { calls.push(name); if (name === 'assets' && failAssets) throw new Error('network'); return name === 'libraries' ? [] : name; };
  const mocks = {
    electron: { app: { whenReady: () => ({then:()=>{}}), on:()=>{}, setAppUserModelId:()=>{} }, ipcMain: { handle:(name,fn)=>handlers.set(name,fn), on:()=>{} } },
    '../core/constants': { getDataDir:()=>'/mock', dirs:()=>({base:'/mock',instances:'/mock/instances',versions:'/mock/versions',assets:'/mock/assets',libraries:'/mock/libraries',runtimes:'/mock/java'}) },
    '../core/instanceManager': { ensureDirs:()=>{}, listInstances:()=>[{name:'Test',versionId:'1.21',type:'vanilla',settings:{}}], updateInstanceSettings:()=>calls.push('ready') },
    '../core/mojangService': { getVersionDetails:async()=>({id:'1.21',javaVersion:{majorVersion:21}}), downloadClientJar:step('client') },
    '../core/javaManager': { ensureJava:async()=>{calls.push('java');return {path:'java',major:21};} },
    '../core/launcher': { resolveLibraries:step('libraries'), launch:()=>{throw new Error('INSTALL MUST NOT LAUNCH');} },
    '../core/nativesService': { resolveNatives:step('natives') },
    '../core/assetsService': { downloadAssets:step('assets'), downloadLoggingConfig:step('logging') },
  };
  const source = fs.readFileSync(path.join(__dirname,'../electron/main.js'),'utf8');
  vm.runInNewContext(source, { require:name=>mocks[name] || (name.startsWith('../') ? {} : require(name)), process, console, __dirname:path.join(__dirname,'../electron'), setTimeout,clearTimeout,setInterval,clearInterval });
  return { install:()=>handlers.get('ferro:installInstance')({}, {instanceName:'Test'}), calls, setFail:value=>{failAssets=value;} };
}
test('install downloads all resources without launching Minecraft', async () => {
  const h = harness();
  assert.equal((await h.install()).ready, true);
  assert.deepEqual(h.calls, ['java','client','libraries','natives','assets','logging','ready']);
});
test('failed installation is not marked ready and can be retried', async () => {
  const h = harness(); h.setFail(true);
  await assert.rejects(h.install(), /network/);
  assert.equal(h.calls.includes('ready'), false);
  h.setFail(false);
  assert.equal((await h.install()).ready, true);
});
