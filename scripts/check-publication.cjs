const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const worktree = process.argv.includes('--worktree');
const root = process.cwd();
function git(args) { return execFileSync('git', args, { cwd: root, maxBuffer: 150 * 1024 * 1024, windowsHide: true }); }
const files = [...new Set(git(worktree ? ['ls-files','--cached','--others','--exclude-standard','-z'] : ['ls-files','--cached','-z']).toString('utf8').split('\0').filter(Boolean))];
const publicHotel = JSON.parse(fs.readFileSync(path.join(root,'data','hotel.json'),'utf8')).hotel;
const publicEmails = new Set([publicHotel.email].filter(Boolean).map(email=>email.toLowerCase()));
const privateValues = new Set();
function remember(value) {
  const text = String(value || '').trim();
  if (text.length < 8 || publicEmails.has(text.toLowerCase())) return;
  privateValues.add(text);
  if (!text.includes('@') && /\s/.test(text)) privateValues.add(text.replace(/\s/g,''));
}
for (const name of fs.readdirSync(root).filter(name=>/^\.env(?:\..+)?$/.test(name) && name!=='.env.example')) {
  const content = fs.readFileSync(path.join(root,name),'utf8');
  for (const match of content.matchAll(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/gm)) {
    if (!/^(?:SMTP_PASS|SMTP_PASSWORD|SMTP_USER|FEEDBACK_TO|ADMIN_REVIEW_PASSWORD(?:_HASH)?|ADMIN_SESSION_SECRET|GH_TOKEN|GITHUB_TOKEN|.*_(?:API_KEY|SECRET|TOKEN|PRIVATE_KEY))$/.test(match[1])) continue;
    remember(match[2].trim().replace(/^(['"])(.*)\1$/,'$2').replace(/\s+#.*$/,''));
  }
}
const loginFile = path.join(root,'data','review-admin-login.txt');
if (fs.existsSync(loginFile)) remember(fs.readFileSync(loginFile,'utf8').match(/^Password:\s*(.+)$/m)?.[1]);
for (const name of ['feedback.json','subscribers.json','reservations.json']) {
  const file = path.join(root,'data',name); if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file,'utf8'));
  for (const record of Array.isArray(data) ? data : data.bookings || []) {
    if (record.email && !/@(?:example\.com|example\.org|example\.net)$/i.test(record.email)) remember(record.email);
  }
}
function forbidden(file) {
  const value=file.toLowerCase();
  return (value.startsWith('data/') && value!=='data/hotel.json') ||
    /(^|\/)\.env(?:\..*)?$/.test(value) && value!=='.env.example' ||
    /(^|\/)(node_modules|\.next|out|dist|coverage|\.vercel|\.netlify|backups|exports)\//.test(value) ||
    /\.(pem|key|p12|pfx|log|bak|tmp)$/.test(value) ||
    /(^|\/)(\.npmrc|review-admin-login\.txt)$/.test(value) ||
    /^public\/images\/(coverrr\.jpg|signature\.jpg|stamp\.png)$/.test(value) ||
    /(^|\/)hotel-(website-backup.*\.json|reservations.*\.csv|newsletter-subscribers.*\.csv)$/.test(value);
}
const secretSignatures = [
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /https?:\/\/[^\s'"/:]+:[^\s'"@]+@/
];
const failures=[]; let totalBytes=0;
for (const file of files) {
  if (forbidden(file)) { failures.push({file,reason:'Private or generated file is included.'}); continue; }
  const filepath=path.join(root,file);
  if (worktree && !fs.existsSync(filepath)) continue;
  const bytes=worktree ? fs.readFileSync(filepath) : git(['show',`:${file}`]);
  totalBytes+=bytes.length;
  if (bytes.length>100*1024*1024) failures.push({file,reason:'File exceeds the GitHub size limit.'});
  if ([...privateValues].some(value=>bytes.includes(Buffer.from(value)))) failures.push({file,reason:'A locally configured credential or private email address appears in the file.'});
  if (secretSignatures.some(pattern=>pattern.test(bytes.toString('utf8')))) failures.push({file,reason:'A credential/private-key signature appears in the file.'});
}
if (failures.length) { console.error('Publication check failed. Values are intentionally not printed.'); for(const failure of failures) console.error(`${failure.file}: ${failure.reason}`); process.exitCode=1; }
else console.log(`Publication check passed: ${files.length} files, ${(totalBytes/1024/1024).toFixed(1)} MB; no private files, configured credentials, or private guest emails found.`);
