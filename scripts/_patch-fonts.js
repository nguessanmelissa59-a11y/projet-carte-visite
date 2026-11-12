const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'src', 'ui', 'card-canvas.js');
let source = fs.readFileSync(file, 'utf8');

const replacements = [
  ["'Syne', 'DM Sans', sans-serif", "'Fraunces', 'Figtree', serif"],
  ["'Syne', sans-serif", "'Fraunces', serif"],
  ["'Syne', serif", "'Fraunces', serif"],
  ["'DM Sans', sans-serif", "'Figtree', sans-serif"]
];

for (const [from, to] of replacements) {
  source = source.split(from).join(to);
}

fs.writeFileSync(file, source);
console.log('patched', file);
