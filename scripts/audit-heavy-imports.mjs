#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { globSync } from 'fs';

const HEAVY_PATTERNS = [
  /from ['"]recharts['"]/,
  /from ['"]framer-motion['"]/,
  /from ['"]lucide-react['"]/,
  /from ['"]@\/components\/ui\/SplashScreen['"]/,
  /from ['"]@\/components\/LiveChat['"]/,
  /from ['"]recharts\/es\//,
  /from ['"]@\/components\/ui\/Mobile/,
  /import\s+\{?\s*(SplashScreen|LiveChat|GestureTour|PwaInstallPrompt)\s*\}?\s+from/,
];

const srcFiles = globSync('src/**/*.{ts,tsx}', { ignore: ['src/**/*.d.ts', 'src/**/*.test.*', 'src/**/*.spec.*'] });

let candidates = 0;

for (const file of srcFiles) {
  const content = readFileSync(file, 'utf-8');
  for (const pattern of HEAVY_PATTERNS) {
    if (pattern.test(content)) {
      console.log(`${file}: matches ${pattern}`);
      candidates++;
      break;
    }
  }
}

if (candidates === 0) {
  console.log('No heavy-import candidates found.');
} else {
  console.log(`\nFound ${candidates} file(s) with direct heavy imports. Consider using next/dynamic() for these.`);
}
