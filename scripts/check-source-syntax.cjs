'use strict';

// CRA/webpack in this deployment has reported syntax errors while returning exit 0.
// Treat parser failures as an unconditional deployment blocker.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');

const root = path.resolve(__dirname, '..', 'src');
let checked = 0;
const errors = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(filename);
    } else if (/\.(?:jsx?|tsx?)$/.test(entry.name)) {
      try {
        parse(fs.readFileSync(filename, 'utf8'), {
          sourceType: 'unambiguous',
          plugins: ['jsx', 'typescript']
        });
        checked += 1;
      } catch (error) {
        const relative = path.relative(path.resolve(__dirname, '..'), filename);
        errors.push(`${relative}:${error.loc?.line ?? '?'}:${error.loc?.column ?? '?'} ${error.message}`);
      }
    }
  }
}
if (!fs.existsSync(root)) {
  console.error('Missing frontend source directory.');
  process.exit(1);
}
scan(root);
if (errors.length) {
  console.error('Frontend syntax preflight failed:');
  for (const error of errors) console.error('  ' + error);
  process.exit(1);
}
console.log(`Syntax preflight passed for ${checked} source files.`);
