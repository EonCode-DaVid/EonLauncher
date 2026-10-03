const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const publish = Array.isArray(pkg.build.publish) ? pkg.build.publish[0] : pkg.build.publish;
if (!publish) { console.log('Brak kanału aktualizacji — pominięto app-update.yml.'); process.exit(0); }
const dest = path.join(__dirname, '..', 'release', 'win-unpacked', 'resources', 'app-update.yml');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(publish, null, 2));
console.log('Konfiguracja aktualizacji zapisana.');
