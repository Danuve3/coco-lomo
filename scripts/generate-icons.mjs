/**
 * Script opcional para generar los PNGs de iconos desde el SVG.
 * Requiere: npm install sharp (solo para development)
 * Uso: node scripts/generate-icons.mjs
 *
 * Alternativa: usa cualquier conversor SVG→PNG (squoosh.app, etc.)
 * y guarda los archivos como public/icons/icon-192.png y icon-512.png.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Para generar los iconos PNG, ejecuta:');
console.log('  npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-192.png -f png --width 192 --height 192');
console.log('  npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-512.png -f png --width 512 --height 512');
console.log('');
console.log('O usa https://squoosh.app para convertir el SVG manualmente.');
