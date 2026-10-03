const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSample, createMonitor } = require('../core/processMetrics');

test('CPU uses elapsed time and all cores; unknown data stays unknown', () => {
  const first = calculateSample(null, { CPU: 10, WorkingSet64: 104857600 }, 1000, 4);
  assert.equal(first.cpu, null);
  assert.equal(first.ramMb, 100);
  assert.equal(calculateSample(first, { CPU: 12, WorkingSet64: 0 }, 3000, 4).cpu, 25);
  const unknown = calculateSample(first, { CPU: null, WorkingSet64: null }, 4000, 4);
  assert.equal(unknown.cpu, null);
  assert.equal(unknown.ramMb, null);
  assert.equal(calculateSample(unknown, { CPU: 14 }, 5000, 4).cpu, null);
});

test('monitor throttles, resets CPU after restart and bounds history', async () => {
  let time = 0, reads = 0;
  const monitor = createMonitor({ now: () => time, read: async ids => { reads++; return ids.map(Id => ({ Id, CPU: time / 1000, WorkingSet64: 1048576 })); } });
  await monitor.sample([{ id: 'a', pid: 1 }]);
  await monitor.sample([{ id: 'a', pid: 1 }]);
  assert.equal(reads, 1);
  for(let i=0;i<65;i++){time+=5000;await monitor.sample([{ id: 'a', pid: 1 }]);}
  time+=5000;
  const restarted = await monitor.sample([{ id: 'a', pid: 2 }]);
  assert.equal(restarted.a.points.length, 60);
  assert.equal(restarted.a.points.at(-1).cpu, null);
  const stopped = await monitor.sample([{ id: 'a', pid: null }]);
  assert.equal(stopped.a.running, false);
});

test('missing process never creates a fabricated zero sample', async () => {
  const monitor = createMonitor({ read: async () => [] });
  assert.deepEqual((await monitor.sample([{ id: 'a', pid: 1 }])).a.points, []);
});
