/* build-index.mjs — Génère index.html (entrée Vite) à partir de index.htm.
   - Retire le SDK Supabase CDN + l'init inline (remplacés par src/lib/supabase.js)
   - Retire le bloc <style> (CSS désormais dans src/styles/*, importé par main.js)
   - Retire le bloc <script> applicatif (désormais src/main.js)
   - Conserve verbatim le <head> SEO/OG/schema.org, le corps (pages) et les modales
   Lancement : node scripts/build-index.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const L = readFileSync(join(root, 'index.htm'), 'utf8').split('\n');
const slice = (a, b) => L.slice(a - 1, b).join('\n'); // [a..b] inclus, 1-indexé

const parts = [
  slice(1, 15),        // <head> jusqu'à <meta author> (avant le SDK Supabase)
  slice(34, 89),       // canonical, OG, Twitter, favicon, fonts, schema.org
  '</head>',           // remplace </head> (saute le <style> 90-3637)
  '',
  slice(3640, 4821),   // <body> + pages (saute le <script> applicatif)
  slice(7942, 7964),   // modale "Laisser un avis"
  '  <script type="module" src="/src/main.js"></script>',
  '</body>',
  '',
  '</html>',
  '',
];

writeFileSync(join(root, 'index.html'), parts.join('\n'), 'utf8');
console.log('écrit index.html');
