const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CWD = path.resolve(__dirname, '..');
const LOG = path.join(__dirname, 'merge_result.txt');
const lines = [];

function log(m) {
  lines.push(m);
  fs.appendFileSync(LOG, m + '\n', 'utf-8');
}

function run(cmd) {
  const r = execSync(cmd, { cwd: CWD, encoding: 'utf-8', timeout: 30000 });
  log('$ ' + cmd);
  log(r);
  return r.trim();
}

function mergeBranch(branch, msg) {
  log(`\n--- Merging ${branch} ---`);
  try {
    const r = execSync(`git merge ${branch} --no-ff -m "${msg}"`, {
      cwd: CWD, encoding: 'utf-8', timeout: 30000
    });
    log(r);
    log(`✅ ${branch} merged successfully`);
    return true;
  } catch(e) {
    log(`❌ ${branch} FAILED: ${(e.stderr || e.message).substring(0,500)}`);
    return false;
  }
}

log('=== MERGE CHAIN A ===\n');

run('git rev-parse HEAD');
run('git log --oneline -3');

const chainA = [
  ['feat/06-cheatsheet-modal', 'Merge feat/06-cheatsheet-modal: keyboard shortcut cheatsheet modal'],
  ['feat/11-fullscreen-toggle', 'Merge feat/11-fullscreen-toggle: fullscreen toggle button in header'],
  ['feat/10-account-search-enhance', 'Merge feat/10-account-search-enhance: account search enhance'],
  ['feat/15-delivery-analytics-csv', 'Merge feat/15-delivery-analytics-csv: generic CSV export utility'],
];

chainA.forEach(([branch, msg]) => {
  if (!mergeBranch(branch, msg)) process.exit(1);
});

run('git rev-parse HEAD');
run('git log --oneline -5');

log('\n✅ CHAIN A MERGE COMPLETE');
console.log('Done. Check scripts/merge_result.txt');