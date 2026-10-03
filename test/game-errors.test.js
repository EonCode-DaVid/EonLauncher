const test = require('node:test');
const assert = require('node:assert/strict');
const { explainGameError } = require('../core/gameErrors');
const { suggestRam } = require('../core/perfService');
const gb = n => n * 1073741824;
test('RAM reserves memory for the system and responds to low free memory', () => {
  const rich = {total:gb(16),free:gb(12)};
  assert.ok(suggestRam('fabric',rich).suggestedMb > suggestRam('vanilla',rich).suggestedMb);
  const low = suggestRam('forge',{total:gb(4),free:gb(1)});
  assert.equal(low.lowMemory,true);
  assert.ok(low.maxMb <= 2048);
  assert.ok(low.suggestedMb <= low.maxMb);
});
test('error explanations distinguish Java, mods, disk and unknown failures', () => {
  assert.match(explainGameError('UnsupportedClassVersionError').title,/Java/);
  assert.match(explainGameError('Incompatible mods found').title,/Mody/);
  assert.match(explainGameError('ENOSPC').title,/dysku/);
  assert.match(explainGameError('fetch failed').title,/pobrać/);
  assert.match(explainGameError('something unexpected').advice,/konsolę/);
});
