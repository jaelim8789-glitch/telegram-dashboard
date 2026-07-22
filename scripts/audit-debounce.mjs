#!/usr/bin/env node
import { readFileSync } from 'fs';
import { globSync } from 'fs';

const srcFiles = globSync('src/**/*.{tsx,jsx}', { ignore: ['src/**/*.test.*', 'src/**/*.spec.*', 'src/**/*.stories.*'] });

let totalHandlers = 0;
let missingDebounce = 0;

for (const file of srcFiles) {
  const content = readFileSync(file, 'utf-8');
  const onChangeRegex = /onChange\s*[=:]\s*\{?(\w+)/g;
  let match;
  while ((match = onChangeRegex.exec(content)) !== null) {
    totalHandlers++;
    const handlerName = match[1];
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index);
    const line = content.slice(lineStart, lineEnd > 0 ? lineEnd : content.length).trim();

    if (
      !/debounce|Debounce|useDebounce|debounced|throttle|Throttle|onChange\s*[=:]\s*\(/.test(line) &&
      !content.slice(Math.max(0, match.index - 2000), match.index).includes(`debounce`) &&
      !content.slice(Math.max(0, match.index - 2000), match.index).includes(`useDebounce`)
    ) {
      console.log(`${file}: line ~${content.slice(0, match.index).split('\n').length} — onChange handler "${handlerName}" may need debounce`);
      missingDebounce++;
    }
  }
}

if (totalHandlers === 0) {
  console.log('No onChange handlers found.');
} else {
  console.log(`\n${missingDebounce}/${totalHandlers} onChange handlers may need debounce wrapping.`);
}
