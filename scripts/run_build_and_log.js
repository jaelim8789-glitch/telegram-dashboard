const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, 'build_verify.log');

function log(msg) {
  fs.appendFileSync(LOG, msg + '\n', 'utf-8');
  try { process.stdout.write(msg + '\n'); } catch(e) {}
}

function run(cmd) {
  try {
    const r = execSync(cmd, { cwd: path.resolve(__dirname, '..'), encoding: 'utf-8', timeout: 180000 });
    log(`[OK] ${cmd}`);
    return r;
  } catch(e) {
    log(`[ERR] ${cmd}: ${(e.stderr || e.message).substring(0, 200)}`);
    throw e;
  }
}

log('=== STATE CHECK at ' + new Date().toISOString() + ' ===');
log('');
log('-- git log -5 --');
log(run('git log --oneline -5'));
log('');
log('-- git status --');
log(run('git status --short') || '(clean)');
log('');
log('-- git branch --');
log(run('git branch'));
log('');
log('=== BUILD START ===');
log('');

try {
  const buildOut = run('npx next build');
  if (buildOut.includes('Compiled successfully')) {
    log('=== ✅ BUILD PASSED ===');
    process.exit(0);
  } else if (buildOut.includes('Failed to compile')) {
    log('=== ❌ BUILD FAILED ===');
    log(buildOut);
    process.exit(1);
  } else {
    log('=== ❓ BUILD RESULT UNCLEAR ===');
    log(buildOut.substring(Math.max(0, buildOut.length - 2000)));
    process.exit(1);
  }
} catch(e) {
  log('=== ❌ BUILD EXCEPTION ===');
  log(e.message);
  process.exit(1);
}