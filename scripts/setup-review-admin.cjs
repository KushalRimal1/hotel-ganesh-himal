const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const { hashPassword } = require('../lib/admin-auth');
const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env');
let content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
const reset = process.argv.includes('--reset');
if (!reset && /^ADMIN_REVIEW_PASSWORD(?:_HASH)?=.+$/m.test(content)) {
  console.log('Review administrator is already configured. Use --reset only when changing its password.');
  process.exit(0);
}
const password = randomBytes(18).toString('base64url');
const hash = hashPassword(password);
const secret = randomBytes(32).toString('base64url');
content = content.replace(/^ADMIN_REVIEW_PASSWORD(?:_HASH)?=.*\r?\n?/gm, '').replace(/^ADMIN_SESSION_SECRET=.*\r?\n?/gm, '');
content = content.trimEnd() + `\n\n# Private review administration\nADMIN_REVIEW_PASSWORD_HASH=${hash}\nADMIN_SESSION_SECRET=${secret}\n`;
fs.writeFileSync(envFile, content);
const dataDir = path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const credentialsFile = path.join(dataDir, 'review-admin-login.txt');
fs.writeFileSync(credentialsFile, `Hotel Ganesh Himal - private review administrator\n\nPage: /admin/reviews\nPassword: ${password}\n\nKeep this file private. Do not upload it to public/ or commit it.\nFor hosting, copy ADMIN_REVIEW_PASSWORD_HASH and ADMIN_SESSION_SECRET from .env into the hosting environment settings.\n`, { mode: 0o600 });
console.log('Administrator configured. Password saved privately in data/review-admin-login.txt.');
console.log('Restart Next.js to apply the administrator configuration.');
