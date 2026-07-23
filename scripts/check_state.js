const { execSync } = require('child_process');
const fs = require('fs');

const results = [];

function run(cmd) {
  try {
    return execSync(cmd, { cwd: 'C:\\Dev\\TeleMon', encoding: 'utf-8', timeout: 15000 }).trim();
  } catch(e) {
    return 'ERROR: ' + (e.stderr || e.message).substring(0, 200);
  }
}

results.push('=== GIT LOG -5 ===');
results.push(run('git log --oneline -5'));
results.push('');
results.push('=== GIT STATUS ===');
results.push(run('git status --short') || '(clean)');
results.push('');
results.push('=== GIT BRANCH ===');
results.push(run('git branch'));
results.push('');

// Check if we're on master
const branch = run('git rev-parse --abbrev-ref HEAD');
results.push('=== CURRENT BRANCH: ' + branch + ' ===');

// Check if working tree is clean
const status = run('git status --porcelain');
results.push('=== WORKING TREE: ' + (status ? 'DIRTY' : 'CLEAN') + ' ===');

fs.writeFileSync('C:\\Dev\\TeleMon\\scripts\\state.txt', results.join('\n'), 'utf-8');
console.log('DONE');