'use strict';

// A Vercel/CRA build can occasionally exit successfully after "Compiled with type
// errors". Never deploy an empty CRA build as a successful release.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'build');
const html = path.join(root, 'index.html');
const scripts = path.join(root, 'static', 'js');
const validHtml = fs.existsSync(html)
  && fs.statSync(html).size > 100
  && /<div[^>]+id=["']root["']/.test(fs.readFileSync(html, 'utf8'));
const validScripts = fs.existsSync(scripts)
  && fs.readdirSync(scripts).some(name => /^main\..+\.js$/.test(name));
if (!validHtml || !validScripts) {
  console.error('Invalid production output: missing index.html or main JavaScript bundle.');
  process.exit(1);
}
console.log('Production bundle verified: index.html and main JavaScript present.');
