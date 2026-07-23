#!/usr/bin/env node
import { readFileSync } from 'fs';
import { globSync } from 'fs';

const srcFiles = globSync('src/**/*.{tsx,jsx}', { ignore: ['src/**/*.test.*', 'src/**/*.spec.*', 'src/**/*.stories.*'] });

let totalImages = 0;
let missingPriority = 0;

for (const file of srcFiles) {
  const content = readFileSync(file, 'utf-8');
  const imageRegex = /<Image\s/g;
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    totalImages++;
    const sliceStart = match.index;
    const sliceEnd = Math.min(sliceStart + 800, content.length);
    const snippet = content.slice(sliceStart, sliceEnd);
    if (!/priority\s*[=:]/.test(snippet)) {
      console.log(`${file}:${getLineNumber(content, sliceStart)} — <Image> without priority prop`);
      missingPriority++;
    }
  }
}

function getLineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

if (totalImages === 0) {
  console.log('No <Image> tags found.');
} else {
  console.log(`\n${missingPriority}/${totalImages} <Image> tags lack priority prop.`);
  if (missingPriority > 0) {
    console.log('Above-the-fold images should use priority={true}.');
  }
}
