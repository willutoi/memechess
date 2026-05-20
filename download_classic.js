const fs = require('fs');
const https = require('https');
const path = require('path');

const pieces = [
  { name: 'wP', url: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg' },
  { name: 'wN', url: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg' },
  { name: 'wB', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg' },
  { name: 'wR', url: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg' },
  { name: 'wQ', url: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg' },
  { name: 'wK', url: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg' },
  { name: 'bP', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg' },
  { name: 'bN', url: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Chess_ndt45.svg' },
  { name: 'bB', url: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg' },
  { name: 'bR', url: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg' },
  { name: 'bQ', url: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg' },
  { name: 'bK', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg' }
];

const dir = path.join(__dirname, 'public', 'skins', 'classic');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

pieces.forEach(p => {
  const file = fs.createWriteStream(path.join(dir, p.name + '.svg'));
  https.get(p.url, response => {
    response.pipe(file);
  });
});
