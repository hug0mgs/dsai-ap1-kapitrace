// High-confidence checks on Git content only. Never reads ignored .env files.
import { execFileSync } from 'node:child_process';
const all = process.argv.includes('--all');
const args = all ? ['ls-files', '-z'] : ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'];
const files = execFileSync('git', args, { encoding: 'utf8' }).split('\0').filter(Boolean);
const signatures = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/,
];
let failed = false;
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('/.env.example') && file !== '.env.example') {
    console.error(`Forbidden environment file staged: ${file}`); failed = true; continue;
  }
  const content = execFileSync('git', ['show', `:${file}`], { maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
  if (signatures.some(pattern => pattern.test(content))) { console.error(`Possible secret in Git content: ${file}`); failed = true; }
  if (file.endsWith('.env.example')) {
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD))\s*=\s*(.*)$/);
      if (match && match[2].replace(/^['"]|['"]$/g, '').trim()) { console.error(`Example contains a populated credential: ${file}`); failed = true; }
    }
  }
}
if (failed) process.exitCode = 1;
else console.log(`Secret checks passed for ${files.length} Git files (${all ? 'tracked' : 'staged'}).`);
