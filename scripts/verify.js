const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = [];
function log(m) { out.push(m); }

try {
  // git log
  const gitLog = execSync('git log --oneline -5', { cwd: __dirname + '/..', encoding: 'utf-8', timeout: 10000 });
  log('=== GIT LOG ===\n' + gitLog);

  // git status
  const gitStatus = execSync('git status --short', { cwd: __dirname + '/..', encoding: 'utf-8', timeout: 10000 });
  log('=== GIT STATUS ===\n' + (gitStatus || '(clean)'));

  // git branch
  const gitBranch = execSync('git branch', { cwd: __dirname + '/..', encoding: 'utf-8', timeout: 10000 });
  log('=== BRANCH ===\n' + gitBranch);

  // Run build
  log('\n=== BUILD START ===');
  const buildResult = execSync('npx next build', { cwd: __dirname + '/..', encoding: 'utf-8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
  const hasSuccess = buildResult.includes('Compiled successfully');
  const hasFail = buildResult.includes('Failed to compile');
  log('Build output (last 20 lines):');
  const lines = buildResult.split('\n');
  log(lines.slice(-20).join('\n'));
  log(`\n=== BUILD RESULT: ${hasSuccess && !hasFail ? '✅ PASSED' : '❌ FAILED'} ===`);

} catch(e) {
  log('=== ERROR ===\n' + (e.stderr || e.message));
}

fs.writeFileSync(path.join(__dirname, 'verify-output.txt'), out.join('\n'), 'utf-8');
console.log('Written to scripts/verify-output.txt');