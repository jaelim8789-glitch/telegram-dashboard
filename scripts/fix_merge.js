const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CWD = path.resolve(__dirname, '..');
const LOG = path.join(__dirname, 'fix_merge_log.txt');

function log(m) {
  fs.appendFileSync(LOG, m + '\n', 'utf-8');
}

function run(cmd, timeout = 60000) {
  const r = execSync(cmd, { 
    cwd: CWD, 
    encoding: 'utf-8', 
    timeout,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_PAGER: 'cat', PAGER: 'cat' }
  });
  log('> ' + cmd.substring(0, 80));
  log(r.trim());
  return r.trim();
}

try {
  log('=== FIXED MERGE RUN ===\n');
  
  const headBefore = run('git rev-parse HEAD', 5000);
  run('git log --oneline -3', 5000);
  log('');

  const branches = [
    'feat/06-cheatsheet-modal',
    'feat/11-fullscreen-toggle',
    'feat/10-account-search-enhance',
    'feat/15-delivery-analytics-csv',
  ];

  for (const branch of branches) {
    log(`\n--- Merging ${branch} ---`);
    try {
      const r = execSync(`git --no-pager merge ${branch} --no-ff -m "Merge ${branch}" 2>&1`, {
        cwd: CWD,
        encoding: 'utf-8',
        timeout: 30000,
        env: { ...process.env, GIT_PAGER: 'cat' }
      });
      log(r);
      // Verify it actually merged
      const head = execSync('git rev-parse HEAD', { cwd: CWD, encoding: 'utf-8', timeout: 5000 }).trim();
      log(`HEAD now: ${head}`);
      log(`✅ ${branch} merged`);
    } catch(e) {
      const err = (e.stdout || '').substring(0, 500) + (e.stderr || '').substring(0, 500);
      log(`❌ ${branch} FAILED: ${err}`);
      log('Aborting merge sequence.');
      process.exit(1);
    }
  }

  log('\n=== FINAL STATE ===');
  run('git rev-parse HEAD', 5000);
  run('git log --oneline -5', 5000);
  log('\n✅ ALL MERGES COMPLETE');
} catch(e) {
  log('CRITICAL ERROR: ' + (e.message || 'unknown'));
  process.exit(1);
}