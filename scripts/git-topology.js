const { execSync } = require('child_process');
const path = require('path');

const repoDir = path.resolve(__dirname, '..');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: repoDir, encoding: 'utf-8' }).trim();
  } catch (e) {
    return '(error) ' + e.message;
  }
}

const branches = run('git branch').split('\n').map(b => b.replace('*', '').trim()).filter(Boolean);
const master = branches.find(b => b === 'master');
const features = branches.filter(b => b !== 'master');

console.log('=== BRANCH TOPOLOGY ===\n');

// For each feature branch, show commits not in master
features.forEach(b => {
  const log = run(`git log --oneline master..${b}`);
  console.log(`--- ${b} ---`);
  console.log(log || '(no new commits - already merged)');
  console.log('');
});

// Check if branches have dependencies on each other
console.log('=== BRANCH INTERDEPENDENCY CHECK ===\n');
for (let i = 0; i < features.length; i++) {
  for (let j = 0; j < features.length; j++) {
    if (i === j) continue;
    const ancestor = run(`git merge-base --is-ancestor ${features[i]} ${features[j]} && echo YES || echo NO`);
    if (ancestor.includes('YES')) {
      const ahead = run(`git rev-list --count ${features[i]}..${features[j]}`);
      const behind = run(`git rev-list --count ${features[j]}..${features[i]}`);
      console.log(`${features[j]} CONTAINS ${features[i]} (ahead by ${ahead}, behind by ${behind})`);
    }
  }
}

console.log('\n=== CONFLICT CHECK (attempt merge dry-run to master) ===\n');
features.forEach(b => {
  try {
    const result = run(`git merge --no-commit --no-ff ${b}`);
    run('git merge --abort');
    console.log(`${b}: ✅ No conflicts`);
  } catch(e) {
    run('git merge --abort');
    console.log(`${b}: ❌ Conflict detected`);
  }
});