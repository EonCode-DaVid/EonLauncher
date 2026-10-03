const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const createUpdates = require('../electron/updates');

function fixture(extra = {}) {
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => updater.emit('update-available', { version: '1.0.0' });
  updater.downloadUpdate = async () => updater.emit('update-downloaded', { version: '1.0.0' });
  let installs = 0;
  updater.quitAndInstall = () => installs++;
  const service = createUpdates({ updater, packaged: true, configured: true, portable: false, version: '0.9.4', send: () => {}, canInstall: () => true, ...extra });
  return { updater, service, installs: () => installs };
}
test('updates: missing channel and portable builds do not report up-to-date', async () => {
  assert.equal((await fixture({configured:false}).service.check()).state, 'unconfigured');
  assert.equal((await fixture({portable:true}).service.check()).state, 'portable');
});
test('updates: download and install require correct state', async () => {
  const f = fixture();
  assert.throws(() => f.service.install(), /gotowa/);
  assert.equal((await f.service.check()).state, 'available');
  assert.equal(f.updater.autoInstallOnAppQuit, false);
  assert.equal((await f.service.download()).state, 'downloaded');
  f.service.install();
  assert.equal(f.installs(), 1);
});
test('updates: running game blocks install without losing download', async () => {
  const f = fixture({ canInstall: () => false });
  await f.service.check(); await f.service.download();
  assert.throws(() => f.service.install(), /zatrzymaj/);
  assert.equal(f.service.getState().state, 'downloaded');
  assert.equal(f.installs(), 0);
});
test('updates: network failure can be retried', async () => {
  const f = fixture();
  f.updater.checkForUpdates = async () => { throw new Error('offline'); };
  assert.equal((await f.service.check()).state, 'error');
  f.updater.checkForUpdates = async () => f.updater.emit('update-not-available');
  assert.equal((await f.service.check()).state, 'current');
});
