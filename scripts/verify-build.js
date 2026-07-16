const { execSync } = require('child_process');
const path = require('path');

const repoDir = path.resolve(__dirname, '..');

try {
  console.log('=== BUILD START ===');
  const result = execSync('npx next build', {
    cwd: repoDir,
    encoding: 'utf-8',
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024
  });

  // Check for success indicators
  const hasSuccess = result.includes('Compiled successfully');
  const hasErrors = result.includes('Failed to compile') || result.includes('Error:');

  if (hasSuccess && !hasErrors) {
    console.log('=== ✅ BUILD PASSED ===');
  } else if (hasErrors) {
    console.log('=== ❌ BUILD FAILED ===');
    console.log(result);
    process.exit(1);
  } else {
    console.log('=== ⚠️  BUILD RESULT UNCLEAR ===');
    console.log(result);
    process.exit(1);
  }
} catch (e) {
  console.error('=== ❌ BUILD EXCEPTION ===');
  console.error(e.stderr || e.message);
  process.exit(1);
}