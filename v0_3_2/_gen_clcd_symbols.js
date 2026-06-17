/**
 * Generate devices/clcd-symbols.js from _fa_index.json + curated selection (~500 FA + 4 canvas).
 * Run: node _gen_fa_index.js && node _gen_clcd_symbols.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const INDEX_PATH = path.join(ROOT, '_fa_index.json');
const OUT_PATH = path.join(ROOT, 'devices/clcd-symbols.js');

/** Legacy script names → FA icon name (kebab-case) */
const LEGACY_FA = {
  battery: 'battery-full',
  power: 'power-off',
  warning: 'exclamation-triangle',
  error: 'times-circle',
  check: 'check',
  cross: 'times',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  usb: 'usb',
  ethernet: 'ethernet',
  antenna: 'broadcast-tower',
  chip: 'microchip',
  memory: 'memory',
  clock: 'clock',
  arrowUp: 'arrow-up',
  arrowDown: 'arrow-down',
  arrowLeft: 'arrow-left',
  arrowRight: 'arrow-right',
  play: 'play',
  stop: 'stop',
  pause: 'pause',
  record: 'circle',
  charging: 'bolt',
  uart: 'plug',
};

const CANVAS_SYMBOLS = [
  { name: 'digit7', kind: 'canvas', renderer: 'digit7' },
  { name: 'digit14', kind: 'canvas', renderer: 'digit14' },
  { name: 'dp', kind: 'canvas', renderer: 'dp' },
  { name: 'colon', kind: 'canvas', renderer: 'colon' },
];

const TEXT_SYMBOLS = [
  { name: 'label', kind: 'text' },
];

const BRANDS_USEFUL = new Set([
  'bluetooth', 'usb', 'android', 'apple', 'raspberry-pi', 'windows', 'linux',
  'github', 'gitlab', 'docker', 'node-js', 'python', 'java', 'js', 'html5',
  'css3', 'react', 'angular', 'vuejs', 'npm', 'stack-overflow', 'google',
  'amazon', 'microsoft', 'ubuntu', 'centos', 'fedora', 'debian',
]);

const PRIORITY_PATTERNS = [
  /^(check|times|exclamation|info|question|bell|flag)/,
  /^(battery|bolt|plug|power|charging|solar)/,
  /^(wifi|ethernet|bluetooth|usb|satellite|broadcast|signal|network|rss|antenna)/,
  /^(play|pause|stop|forward|backward|step-|fast-|eject|volume|microphone|headphone)/,
  /^(arrow|chevron|caret|angle|long-arrow|arrows|location-arrow|exchange|sort|random)/,
  /^(file|folder|save|download|upload|database|table|archive|copy|paste)/,
  /^(cog|cogs|wrench|hammer|screwdriver|tools|sliders|filter|search|edit|pen)/,
  /^(microchip|memory|hdd|server|desktop|laptop|mobile|tablet|keyboard|mouse|tv|sim-card|sd-card)/,
  /^(clock|hourglass|calendar|stopwatch|history)/,
  /^(lock|unlock|key|shield|bug|code|terminal|project-diagram|sitemap)/,
  /^(home|building|industry|warehouse|store|truck|car|plane|ship|train|bus|robot|rocket)/,
  /^(sun|moon|star|heart|fire|snowflake|thermometer|tint|water|wind|fan|lightbulb)/,
  /^(eye|camera|video|image|print|envelope|comment|user|users)/,
  /^(minus|plus|equals|not-equal|divide|percentage|calculator|hashtag|link|unlink)/,
  /^(circle|square|dot|toggle|ban|sync|redo|undo|expand|compress|retweet)/,
  /^(cloud|globe|map|compass|magnet|atom|flask|biohazard|radiation|skull)/,
  /^(gamepad|dice|puzzle|trophy|medal|award|certificate)/,
  /^(shopping|cart|credit|dollar|euro|money|wallet|receipt)/,
  /^(thermometer|temperature|snow|icicles|umbrella)/,
  /^(wave|audio|music|podcast|radio)/,
  /^(align|border|crop|fill|palette|brush|paint|draw)/,
  /^(list|th-|bars|ellipsis|grip|tasks|stream)/,
  /^(prescription|stethoscope|heartbeat|medkit|syringe)/,
  /^(leaf|seedling|tree|recycle|trash|dumpster)/,
  /^(language|spell|font|bold|italic|underline|strikethrough)/,
  /^(hand|thumbs|smile|frown|meh)/,
  /^(wifi|bluetooth|nfc)/,
];

function faToScriptName(faName) {
  for (const [script, fa] of Object.entries(LEGACY_FA)) {
    if (fa === faName) return script;
  }
  return faName.replace(/-/g, '_');
}

function scoreIcon(faName) {
  if (LEGACY_FA[faName] || Object.values(LEGACY_FA).includes(faName)) return 100000;
  if (BRANDS_USEFUL.has(faName)) return 50000;
  for (let i = 0; i < PRIORITY_PATTERNS.length; i++) {
    if (PRIORITY_PATTERNS[i].test(faName)) return 10000 - i * 100;
  }
  return 0;
}

function hexToChar(hex) {
  return String.fromCharCode(parseInt(hex, 16));
}

function buildGlyphs(faName, entry) {
  const ch = hexToChar(entry.unicode);
  const glyphs = {};
  let defaultStyle = 1;

  if (entry.brands && !entry.solid && !entry.regular) {
    glyphs[3] = ch;
    defaultStyle = 3;
  } else {
    if (entry.solid || (!entry.brands && !entry.regular)) glyphs[1] = ch;
    if (entry.regular) glyphs[2] = ch;
    if (entry.brands && BRANDS_USEFUL.has(faName)) {
      glyphs[3] = ch;
      if (!glyphs[1] && !glyphs[2]) defaultStyle = 3;
    }
  }

  if (!Object.keys(glyphs).length) return null;
  return { glyphs, defaultStyle };
}

function selectCuratedFa(index, maxFa) {
  const legacyFa = new Set(Object.values(LEGACY_FA));
  const scored = [];

  for (const faName of Object.keys(index)) {
    const s = scoreIcon(faName);
    if (s > 0 || legacyFa.has(faName)) {
      scored.push({ faName, score: s });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.faName.localeCompare(b.faName));

  const picked = new Set(legacyFa);
  const ordered = [];

  for (const { faName } of scored) {
    if (picked.has(faName)) continue;
    if (ordered.length >= maxFa - legacyFa.size) break;
    picked.add(faName);
    ordered.push(faName);
  }

  for (const fa of legacyFa) {
    if (index[fa]) ordered.unshift(fa);
  }

  const unique = [];
  const seen = new Set();
  for (const fa of [...legacyFa, ...ordered]) {
    if (!index[fa] || seen.has(fa)) continue;
    seen.add(fa);
    unique.push(fa);
  }

  return unique.slice(0, maxFa);
}

function formatGlyphs(glyphs) {
  const parts = [];
  for (const k of [1, 2, 3]) {
    if (glyphs[k] !== undefined) {
      const code = glyphs[k].charCodeAt(0).toString(16);
      parts.push(`${k}: '\\u${code.padStart(4, '0')}'`);
    }
  }
  return `{ ${parts.join(', ')} }`;
}

function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('Missing', INDEX_PATH, '— run: node _gen_fa_index.js');
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const MAX_FA = 500;
  const faNames = selectCuratedFa(index, MAX_FA);

  const faEntries = [];
  const scriptNames = new Set();

  for (const faName of faNames) {
    const entry = index[faName];
    const built = buildGlyphs(faName, entry);
    if (!built) continue;

    const scriptName = faToScriptName(faName);
    if (scriptNames.has(scriptName)) continue;
    scriptNames.add(scriptName);

    faEntries.push({
      name: scriptName,
      kind: 'fa',
      defaultStyle: built.defaultStyle,
      glyphs: built.glyphs,
      faName,
    });
  }

  faEntries.sort((a, b) => a.name.localeCompare(b.name));

  const lines = [];
  lines.push('/* AUTO-GENERATED by _gen_clcd_symbols.js — do not edit by hand */');
  lines.push('/* Regenerate: node _gen_fa_index.js && node _gen_clcd_symbols.js */');
  lines.push('');
  lines.push('var CLCD_SYMBOL_REGISTRY = [');

  for (const e of faEntries) {
    lines.push(`  { name: '${e.name}', kind: 'fa', defaultStyle: ${e.defaultStyle}, glyphs: ${formatGlyphs(e.glyphs)} },`);
  }
  for (const c of CANVAS_SYMBOLS) {
    lines.push(`  { name: '${c.name}', kind: 'canvas', renderer: '${c.renderer}' },`);
  }
  for (const t of TEXT_SYMBOLS) {
    lines.push(`  { name: '${t.name}', kind: 'text' },`);
  }
  lines.push('];');
  lines.push('');
  lines.push('var CLCD_SYMBOL_BY_NAME = Object.create(null);');
  lines.push('for (var i = 0; i < CLCD_SYMBOL_REGISTRY.length; i++) {');
  lines.push('  CLCD_SYMBOL_BY_NAME[CLCD_SYMBOL_REGISTRY[i].name] = CLCD_SYMBOL_REGISTRY[i];');
  lines.push('}');
  lines.push('');
  lines.push('var CLCD_KNOWN_SYMBOLS = CLCD_SYMBOL_REGISTRY.map(function (s) { return s.name; });');
  lines.push('');
  lines.push('function getClcdSymbolDef(name) {');
  lines.push('  return CLCD_SYMBOL_BY_NAME[name] || null;');
  lines.push('}');
  lines.push('');
  lines.push('function resolveClcdFaStyle(symDef, styleNum) {');
  lines.push('  if (!symDef || symDef.kind !== \'fa\') return null;');
  lines.push('  var s = styleNum !== undefined && styleNum !== null ? styleNum : symDef.defaultStyle;');
  lines.push('  var glyph = symDef.glyphs[s];');
  lines.push('  if (!glyph) return null;');
  lines.push('  if (s === 3) {');
  lines.push('    return { glyph: glyph, fontFamily: \'"Font Awesome 5 Brands"\', weight: \'400\' };');
  lines.push('  }');
  lines.push('  return {');
  lines.push('    glyph: glyph,');
  lines.push('    fontFamily: \'"Font Awesome 5 Free"\',');
  lines.push('    weight: s === 2 ? \'400\' : \'900\',');
  lines.push('  };');
  lines.push('}');
  lines.push('');
  lines.push('var CLCD_LABEL_FAMILIES = {');
  lines.push('  mono: \'Consolas, "Courier New", monospace\',');
  lines.push('  sans: \'system-ui, -apple-system, Segoe UI, sans-serif\',');
  lines.push('  serif: \'Georgia, "Times New Roman", serif\',');
  lines.push('};');
  lines.push('');
  lines.push('var CLCD_LABEL_WEIGHTS = {');
  lines.push('  normal: { fontWeight: \'400\', fontStyle: \'normal\' },');
  lines.push('  bold: { fontWeight: \'700\', fontStyle: \'normal\' },');
  lines.push('  italic: { fontWeight: \'400\', fontStyle: \'italic\' },');
  lines.push('  boldItalic: { fontWeight: \'700\', fontStyle: \'italic\' },');
  lines.push('};');
  lines.push('');
  lines.push('function resolveClcdLabelFont(sym) {');
  lines.push('  var family = (sym && sym.family) || \'mono\';');
  lines.push('  var size = (sym && sym.size) || 14;');
  lines.push('  var weightKey = (sym && sym.weight) || \'normal\';');
  lines.push('  var stack = CLCD_LABEL_FAMILIES[family] || CLCD_LABEL_FAMILIES.mono;');
  lines.push('  var w = CLCD_LABEL_WEIGHTS[weightKey] || CLCD_LABEL_WEIGHTS.normal;');
  lines.push('  return {');
  lines.push('    fontFamily: stack,');
  lines.push('    fontWeight: w.fontWeight,');
  lines.push('    fontStyle: w.fontStyle,');
  lines.push('    fontSize: size,');
  lines.push('  };');
  lines.push('}');
  lines.push('');
  lines.push('if (typeof module !== \'undefined\' && module.exports) {');
  lines.push('  module.exports.CLCD_SYMBOL_REGISTRY = CLCD_SYMBOL_REGISTRY;');
  lines.push('  module.exports.CLCD_KNOWN_SYMBOLS = CLCD_KNOWN_SYMBOLS;');
  lines.push('  module.exports.getClcdSymbolDef = getClcdSymbolDef;');
  lines.push('  module.exports.resolveClcdFaStyle = resolveClcdFaStyle;');
  lines.push('  module.exports.resolveClcdLabelFont = resolveClcdLabelFont;');
  lines.push('}');

  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');
  console.log('Wrote', faEntries.length, 'FA +', CANVAS_SYMBOLS.length, 'canvas +', TEXT_SYMBOLS.length, 'text →', OUT_PATH);
}

main();
