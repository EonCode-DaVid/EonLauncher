const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const LIMIT = 1048576;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function editor(root) {
  root = fs.realpathSync(root);
  function resolve(relative = '') {
    if (typeof relative !== 'string' || /[:\x00]/.test(relative) || path.isAbsolute(relative)) throw new Error('Nieprawidłowa ścieżka.');
    const parts = relative.split(/[\\/]/).filter(Boolean);
    if (parts.some(p => p === '..' || p === '.' || /[. ]$/.test(p) || p.toLowerCase() === '.eon-editor')) throw new Error('Niedozwolona ścieżka.');
    let dest = root;
    for (const part of parts) {
      dest = path.join(dest, part);
      if (fs.lstatSync(dest).isSymbolicLink()) throw new Error('Dowiązania nie są obsługiwane.');
    }
    return dest;
  }
  function read(relative) {
    const dest = resolve(relative), stat = fs.statSync(dest);
    if (!stat.isFile() || stat.size > LIMIT) throw new Error('Edytor obsługuje pliki tekstowe do 1 MB.');
    const bytes = fs.readFileSync(dest);
    if (bytes.includes(0)) throw new Error('To plik binarny — nie można go edytować.');
    let content;
    try { content = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes); }
    catch { throw new Error('Plik nie jest tekstem UTF-8.'); }
    return {content, revision: hash(bytes), readonly: ['eon.json','ferro.json'].includes(path.basename(dest).toLowerCase())};
  }
  return {
    list(relative = '') {
      return fs.readdirSync(resolve(relative), {withFileTypes: true})
        .filter(e => !e.isSymbolicLink() && e.name !== '.eon-editor')
        .map(e => ({name: e.name, directory: e.isDirectory(), path: [relative, e.name].filter(Boolean).join('/')}))
        .sort((a,b) => Number(b.directory)-Number(a.directory) || a.name.localeCompare(b.name));
    },
    read,
    write(relative, content, revision) {
      const current = read(relative);
      if (current.readonly) throw new Error('Konfiguracja launchera jest tylko do odczytu.');
      if (current.revision !== revision) throw new Error('Plik został zmieniony poza edytorem. Wczytaj go ponownie przed zapisem.');
      if (typeof content !== 'string' || Buffer.byteLength(content) > LIMIT || content.includes('\0')) throw new Error('Nieprawidłowa zawartość lub przekroczony limit 1 MB.');
      if(current.content.includes('\r\n')) content=content.replace(/\r?\n/g,'\r\n');
      const dest = resolve(relative), backup = path.join(root, '.eon-editor');
      if (!fs.existsSync(backup)) fs.mkdirSync(backup);
      if (fs.lstatSync(backup).isSymbolicLink()) throw new Error('Nieprawidłowy katalog kopii.');
      fs.copyFileSync(dest, path.join(backup, crypto.randomUUID()+'.bak'));
      const temp = dest+'.'+crypto.randomUUID()+'.tmp';
      try { fs.writeFileSync(temp, content, {encoding:'utf8', flag:'wx'}); fs.renameSync(temp,dest); }
      finally { if(fs.existsSync(temp)) fs.unlinkSync(temp); }
      return read(relative);
    }
  };
}
module.exports = {editor};
