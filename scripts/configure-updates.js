// Usage: node scripts/configure-updates.js https://github.com/owner/repo
// Or: node scripts/configure-updates.js https://updates.example.com/launcher/
const fs = require('fs');
const path = require('path');
const url = new URL(process.argv[2]);
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Podaj publiczny adres HTTPS bez hasła i parametrów.');
let publish;
if (url.hostname === 'github.com') {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 2 || parts.some(p => !/^[A-Za-z0-9_.-]+$/.test(p))) throw new Error('Adres GitHub musi wskazywać właściciela i repozytorium.');
  publish = { provider: 'github', owner: parts[0], repo: parts[1].replace(/\.git$/, ''), releaseType: 'release' };
} else {
  publish = { provider: 'generic', url: url.href.replace(/\/?$/, '/') };
}
const file = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
pkg.build.publish = publish;
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
console.log('Zapisano kanał aktualizacji. Zbuduj ponownie instalator przed przekazaniem testerom.');
