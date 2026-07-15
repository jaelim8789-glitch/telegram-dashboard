const { execSync } = require('child_process');
const path = require('path');

const repoDir = path.resolve(__dirname, '..');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: repoDir, encoding: 'utf-8' }).trim();
  } catch (e) {
    return e.message;
  }
}

console.log('=== BRANCHES ===');
run('git branch').split('\n').forEach(b => console.log(b));

console.log('\n=== COMMIT LOG (all branches, top 50) ===');
console.log(run('git log --oneline --all --no-merges -50'));

console.log('\n=== CURRENT BRANCH ===');
console.log(run('git rev-parse --abbrev-ref HEAD'));

console.log('\n=== STATUS ===');
console.log(run('git status --short'));

console.log('\n=== MERGE BASE (master..HEAD) ===');
console.log(run('git merge-base master HEAD'));

console.log('\n=== DIFF STATS: master..HEAD ===');
console.log(run('git diff master --stat'));