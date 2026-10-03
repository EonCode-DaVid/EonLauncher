const path = require('path');
const { execFileSync } = require('child_process');

module.exports = async context => {
  if (context.electronPlatformName !== 'win32') return;
  const icon = await context.packager.getIconPath();
  if (!icon) throw new Error('Brak ikony EonCode — przerwano pakowanie.');
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const rcedit = path.join(__dirname, '..', 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');
  execFileSync(rcedit, [exe, '--set-icon', icon, '--set-version-string', 'FileDescription', 'EonLauncher', '--set-version-string', 'ProductName', 'EonLauncher', '--set-version-string', 'CompanyName', 'EonCode'], { stdio: 'inherit' });
};
