/**
 * Post-build verification script.
 * Checks that the Next.js build produced at least one app route.
 * Without this, a misconfigured .dockerignore (e.g. not excluding /app)
 * silently produces zero routes and the site serves 404 on every page.
 *
 * Usage: node scripts/verify-build.js
 * Expected to run after `next build` completes.
 */
const fs = require('fs');
const path = require('path');

const BUILD_MANIFEST = path.join(__dirname, '..', '.next', 'build-manifest.json');
const APP_PATH_MANIFEST = path.join(__dirname, '..', '.next', 'server', 'app-paths-manifest.json');
const STANDALONE_DIR = path.join(__dirname, '..', '.next', 'standalone');

let routeCount = 0;

if (fs.existsSync(APP_PATH_MANIFEST)) {
  const manifest = JSON.parse(fs.readFileSync(APP_PATH_MANIFEST, 'utf-8'));
  routeCount = Object.keys(manifest).length;
  console.log(`[verify-build] App routes found: ${routeCount}`);
  Object.keys(manifest).forEach(r => console.log(`  Route: ${r}`));
} else {
  console.error('[verify-build] ERROR: app-paths-manifest.json not found — no App Router routes built');
  console.error('[verify-build] Check that .dockerignore excludes /app and /backend directories');
  process.exit(1);
}

if (routeCount === 0) {
  console.error('[verify-build] FATAL: Zero App Router routes detected.');
  console.error('[verify-build] The site will serve 404 on every page.');
  console.error('[verify-build] This is likely caused by a root /app directory shadowing src/app.');
  console.error('[verify-build] Verify .dockerignore contains "/app" and "/backend" entries.');
  process.exit(1);
}

// 개선: .next/standalone 디렉토리의 실제 라우트 수 확인 및 더 자세한 오류 메시지
if (fs.existsSync(STANDALONE_DIR)) {
  try {
    const standaloneFiles = fs.readdirSync(STANDALONE_DIR, { recursive: true })
      .filter(file => typeof file === 'string')
      .filter(file => file.endsWith('.html') || file.includes('/app/') || file.includes('pages/'));
    
    console.log(`[verify-build] Standalone routes found: ${standaloneFiles.length}`);
    if (standaloneFiles.length > 0) {
      standaloneFiles.slice(0, 10).forEach(file => console.log(`  Standalone file: ${file}`)); // 최대 10개까지만 출력
    }
    
    if (standaloneFiles.length === 0) {
      console.warn('[verify-build] WARNING: No standalone route files found in .next/standalone');
      console.warn('[verify-build] This may indicate an incomplete build or incorrect output mode configuration.');
      
      // 디버깅 정보 추가
      const standaloneContents = fs.readdirSync(STANDALONE_DIR, { recursive: true });
      console.warn(`[verify-build] Contents of .next/standalone: ${standaloneContents.length} items`);
      standaloneContents.slice(0, 15).forEach(item => console.warn(`  Standalone item: ${item}`));
    }
  } catch (error) {
    console.error(`[verify-build] ERROR: Could not read standalone directory: ${error.message}`);
    console.error('[verify-build] This may indicate a permissions issue or incomplete build process.');
    process.exit(1);
  }
} else {
  console.log('[verify-build] INFO: .next/standalone directory not found (not in standalone mode)');
  console.log('[verify-build] Check that output: "standalone" is configured in next.config.ts');
}

console.log(`[verify-build] ✅ ${routeCount} route(s) verified.`);