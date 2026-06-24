/**
 * Parse Font Awesome CSS → res/fonts/fa_index_generated.json
 * Run: node node/_gen_fa_index.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { RES_CSS, RES_FONTS } = require('./js/paths');

const CSS_PATH = path.join(RES_CSS, 'fontawesome', 'all.min.css');
const OUT_PATH = path.join(RES_FONTS, 'fa_index_generated.json');
const META_CACHE = path.join(RES_FONTS, 'fa_icons_meta_generated.json');
const META_URL = 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/5.15.4/metadata/icons.json';

function parseCssIcons(css) {
  const icons = {};
  const re = /\.fa-([a-z0-9-]+):before\{content:"\\([0-9a-f]+)"\}/g;
  let m;
  while ((m = re.exec(css))) {
    icons[m[1]] = { unicode: m[2] };
  }
  return icons;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function loadMetadata() {
  if (fs.existsSync(META_CACHE)) {
    try {
      return JSON.parse(fs.readFileSync(META_CACHE, 'utf8'));
    } catch (e) { /* refetch */ }
  }
  try {
    const meta = await fetchJson(META_URL);
    fs.writeFileSync(META_CACHE, JSON.stringify(meta));
    console.log('Cached FA metadata →', META_CACHE);
    return meta;
  } catch (e) {
    console.warn('Could not fetch FA metadata:', e.message);
    return null;
  }
}

function stylesForIcon(meta, faName) {
  if (!meta || !meta[faName]) {
    return { solid: true, regular: false, brands: false };
  }
  const s = meta[faName].styles || [];
  return {
    solid: s.includes('solid'),
    regular: s.includes('regular'),
    brands: s.includes('brands'),
  };
}

async function main() {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const parsed = parseCssIcons(css);
  const meta = await loadMetadata();

  const out = {};
  for (const faName of Object.keys(parsed).sort()) {
    const hex = parsed[faName].unicode;
    const st = stylesForIcon(meta, faName);
    out[faName] = {
      unicode: hex,
      solid: st.solid || (!st.brands && !st.regular),
      regular: st.regular,
      brands: st.brands,
    };
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log('Wrote', Object.keys(out).length, 'icons →', OUT_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

module.exports = { parseCssIcons, stylesForIcon };
