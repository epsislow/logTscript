/**
 * Extract canonical (primary) search keywords from doc/*.md — defined entities only.
 */
'use strict';

const INDEX_CATALOG_FILES = new Set([
  'builtin-functions.md',
  'builtin-tagged-index.md',
  'components.md',
  'arithmetic.md',
]);

const SYNTAX_STOP = new Set([
  'Xbit', 'Wbit', 'Nbit', 'Wwire', 'Nwire', '1bit', '1wire',
  'EOF', 'RUN', 'NEXT', 'TEST', 'LOAD',
]);

function dedupeKeywords(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const k = String(raw).trim();
    if (!k || SYNTAX_STOP.has(k)) continue;
    const lower = k.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(k);
  }
  return out;
}

const COMPONENT_DOC_FILES = new Set([
  'switch.md', 'key.md', 'keyboard.md', 'dip.md', 'ioport.md', 'rotary.md', 'slider.md',
  'led.md', 'led-bar.md', 'seven-seg.md', '14seg.md', 'lcd.md', 'clcd.md', 'alu.md', 'terminal.md', 'dots.md',
  'adder.md', 'subtract.md', 'multiplier.md', 'divider.md', 'shifter.md', 'counter.md',
  'mem.md', 'reg.md', 'queue.md', 'stack.md', 'network.md', 'oscillator.md', 'lut.md',
]);

function isComponentDocPage(file) {
  return COMPONENT_DOC_FILES.has(file);
}

function dedicatedBuiltinName(file) {
  const m = file.match(/^builtin-([A-Z0-9_]+)\.md$/);
  if (!m) return null;
  return m[1];
}

function isCategoryFunctionPage(file) {
  return /-functions\.md$/.test(file);
}

function extractFromH1(content) {
  const m = content.match(/^#\s+(.+)$/m);
  if (!m) return [];
  const title = m[1];
  const out = [];
  const backticks = title.match(/`([^`]+)`/g) || [];
  backticks.forEach(function (bt) {
    const inner = bt.slice(1, -1).trim().replace(/\(\)$/, '');
    if (/^[A-Za-z][A-Za-z0-9_.=~+\-:]*$/.test(inner)) out.push(inner);
  });
  const paren = title.match(/\(([A-Z][A-Z0-9_]*)\)/);
  if (paren) out.push(paren[1]);
  if (/^([A-Z][A-Z0-9_]*)$/.test(title.trim())) out.push(title.trim());
  return out;
}

const TENSOR_REFERENCE_PAGES = new Set([
  'wire-vectors.md',
  'matrix-reduction.md',
]);

function extractH3Defined(content) {
  const out = [];
  content.split('\n').forEach(function (line) {
    const trimmed = line.replace(/\r$/, '').trim();
    if (!trimmed.startsWith('### ')) return;
    const rest = trimmed.slice(4).trim();
    if (!/^[A-Z][A-Z0-9_]+$/.test(rest)) return;
    if (dedicatedBuiltinName('builtin-' + rest + '.md')) return;
    out.push(rest);
  });
  return out;
}

function extractCategoryH2(content) {
  const out = [];
  const re = /^##\s+(.+)$/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    const heading = m[1].replace(/`/g, '').replace(/\([^)]*\)/g, ' ').trim();
    if (/ in MODE /i.test(' ' + heading + ' ')) continue;
    if (!/[A-Z][A-Z0-9_]/.test(heading)) continue;
    const tokens = heading.match(/\b[A-Z][A-Z0-9_]*\b/g) || [];
    tokens.forEach(function (t) {
      out.push(t);
    });
  }
  return out;
}

function extractDefinedH2Backtick(content) {
  const out = [];
  const re = /^##\s+`([^`]+)`/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    const name = m[1].trim();
    if (name === 'Z' || name === 'X') continue;
    if (/^lutOf and exprOfLut$/i.test(name)) {
      out.push('lutOf', 'exprOfLut');
    } else {
      out.push(name);
    }
  }
  return out;
}

function extractCompTypes(content) {
  const out = [];
  const re = /comp\s+\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const type = m[1].trim();
    if (!type || type.length > 24) continue;
    out.push(type);
    out.push('comp.' + type);
    out.push('doc(comp.' + type + ')');
  }
  return out;
}

function extractAttributeTable(content) {
  const out = [];
  const attrIdx = content.search(/^## Attributes\b/m);
  if (attrIdx < 0) return out;
  const after = content.slice(attrIdx);
  const nextH2 = after.search(/\n## /);
  const slice = nextH2 > 0 ? after.slice(0, nextH2) : after.slice(0, 3000);
  const re = /^\|\s*`([a-zA-Z][a-zA-Z0-9_]*)`/gm;
  let m;
  while ((m = re.exec(slice)) !== null) {
    const name = m[1];
    if (/^[a-z][a-zA-Z0-9_]*$/.test(name)) out.push(name);
  }
  return out;
}

function extractNumberConversion(content, file) {
  if (file !== 'number-conversion.md') return [];
  const out = [];
  const re = /\b(CNTN10S|N2N10S|N10S2N|CNTN16S|N2N16S|N16S2N|ISDIGIT)\b/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractZstateBuiltins(content, file) {
  if (file !== 'zstate.md') return [];
  return ['ZSTATE', 'ZRELEASE', 'ZCONNECT', 'ZCONN'];
}

function extractDebugBuiltins(content, file) {
  if (file !== 'debug.md') return [];
  return extractDefinedH2Backtick(content);
}

function extractBooleanAnalysis(content, file) {
  if (file !== 'boolean-analysis.md') return [];
  return ['truthTableOf', 'simplify', 'equivalent', 'inputsOf', 'costOf'];
}

function extractBooleanLut(content, file) {
  if (file !== 'boolean-lut.md') return [];
  return ['lutOf', 'exprOfLut'];
}

function extractLoop(content, file) {
  if (file !== 'loop.md') return [];
  return ['loop'];
}

function extractDocFunction(content, file) {
  if (file !== 'doc-function.md') return [];
  return ['doc'];
}

function extractUserDef(content, file) {
  if (file !== 'user-functions.md') return [];
  return ['def'];
}

function extractModes(content, file) {
  if (file !== 'modes.md') return [];
  return ['MODE', 'STRICT', 'WIREWRITE', 'ZSTATE'];
}

/**
 * @returns {{ primary: string[], secondary: string[] }}
 */
function extractDocSearchKeywords(file, content) {
  const primary = [];
  const secondary = [];

  const dedicated = dedicatedBuiltinName(file);
  if (dedicated) {
    primary.push(dedicated);
  }

  primary.push.apply(primary, extractFromH1(content));

  if (isCategoryFunctionPage(file) && !INDEX_CATALOG_FILES.has(file)) {
    primary.push.apply(primary, extractCategoryH2(content));
  }

  if (TENSOR_REFERENCE_PAGES.has(file)) {
    primary.push.apply(primary, extractH3Defined(content));
  }

  if (file === 'debug.md') {
    primary.push.apply(primary, extractDebugBuiltins(content, file));
  } else if (file === 'zstate.md') {
    primary.push.apply(primary, extractZstateBuiltins(content, file));
  } else if (file === 'modes.md') {
    primary.push.apply(primary, extractModes(content, file));
  } else if (file === 'boolean-analysis.md') {
    primary.push.apply(primary, extractBooleanAnalysis(content, file));
  } else if (file === 'boolean-lut.md') {
    primary.push.apply(primary, extractBooleanLut(content, file));
  } else if (file === 'loop.md') {
    primary.push.apply(primary, extractLoop(content, file));
  } else if (file === 'doc-function.md') {
    primary.push.apply(primary, extractDocFunction(content, file));
  } else if (file === 'user-functions.md') {
    primary.push.apply(primary, extractUserDef(content, file));
  } else if (file === 'number-conversion.md') {
    primary.push.apply(primary, extractNumberConversion(content, file));
  }

  if (isComponentDocPage(file)) {
    const compTypes = extractCompTypes(content);
    if (compTypes.length) {
      primary.push.apply(primary, compTypes.slice(0, 6));
    }
    primary.push.apply(primary, extractAttributeTable(content));
  }

  if (file === 'oscillator.md') {
    secondary.push('osc', 'comp.osc', 'comp.~');
  }

  return {
    primary: dedupeKeywords(primary).slice(0, 40),
    secondary: dedupeKeywords(secondary).slice(0, 20),
  };
}

function mergeKeywordStrings(manual, autoList) {
  const parts = [];
  if (manual) parts.push(String(manual).trim());
  if (autoList && autoList.length) parts.push(autoList.join(' '));
  return dedupeKeywords(parts.join(' ').split(/\s+/)).join(' ');
}

function guessSearchOnlySection(file) {
  if (/^(builtin-ADD|builtin-SUBTRACT|builtin-MULTIPLY|builtin-DIVIDE|builtin-MAC|builtin-ABS|builtin-GT|builtin-LT|builtin-MIN|builtin-MAX|builtin-CLAMP)/.test(file)) {
    return 'Arithmetic';
  }
  if (/^(builtin-SUM|builtin-DOT|builtin-ARGMAX|builtin-ARGMIN)/.test(file)) {
    return 'Vector reduction';
  }
  if (file === 'builtin-EQ.md') return 'Logic gates';
  if (/^(builtin-RSHIFT|builtin-LSHIFT|builtin-LROTATE|builtin-RROTATE|builtin-REVERSE)/.test(file)) {
    return 'Bit transform';
  }
  if (/^(builtin-REPEAT|builtin-SHAPE|builtin-RANK|builtin-DIAG|builtin-FILL|builtin-FLIPLR|builtin-FLIPUD|builtin-IDENTITY|builtin-IOTA|builtin-L2|builtin-MCAT|builtin-MSLICE|builtin-NFORMAT|builtin-NORM|builtin-OUTER|builtin-SORT|builtin-TRACE|builtin-TRIL|builtin-TRIU|builtin-ZEROS)/.test(file)) {
    return 'Tensor / matrix';
  }
  return 'Built-in';
}

function expandSearchOnlyEntries(searchOnly, docFiles, contentByFile) {
  const assigned = new Set((searchOnly || []).map(function (item) {
    return item.file;
  }));
  const out = (searchOnly || []).slice();
  docFiles.forEach(function (file) {
    const name = dedicatedBuiltinName(file);
    if (!name || assigned.has(file)) return;
    const content = contentByFile.get(file) || '';
    const auto = extractDocSearchKeywords(file, content);
    out.push({
      file: file,
      label: name,
      section: guessSearchOnlySection(file),
      searchPrimary: mergeKeywordStrings(name, auto.primary),
    });
    assigned.add(file);
  });
  return out;
}

function enrichIndexItem(item, contentByFile) {
  const content = contentByFile.get(item.file) || '';
  const auto = extractDocSearchKeywords(item.file, content);
  const searchPrimary = mergeKeywordStrings(item.searchPrimary, auto.primary);
  const extraParts = [];
  if (item.searchExtra) extraParts.push(String(item.searchExtra).trim());
  if (auto.secondary.length) extraParts.push(auto.secondary.join(' '));
  const searchExtra = extraParts.length ? dedupeKeywords(extraParts.join(' ').split(/\s+/)).join(' ') : '';
  const next = Object.assign({}, item);
  if (searchPrimary) next.searchPrimary = searchPrimary;
  else delete next.searchPrimary;
  if (searchExtra) next.searchExtra = searchExtra;
  else delete next.searchExtra;
  return next;
}

function enrichDocIndex(index, docFiles, contentByFile) {
  const sections = (index.sections || []).map(function (section) {
    return {
      title: section.title,
      items: (section.items || []).map(function (item) {
        return enrichIndexItem(item, contentByFile);
      }),
    };
  });
  const searchOnly = expandSearchOnlyEntries(index.searchOnly, docFiles, contentByFile).map(function (item) {
    return enrichIndexItem(item, contentByFile);
  });
  return {
    sections: sections,
    searchOnly: searchOnly,
    autoSection: index.autoSection,
  };
}

module.exports = {
  extractDocSearchKeywords,
  extractH3Defined,
  mergeKeywordStrings,
  enrichDocIndex,
  enrichIndexItem,
  dedicatedBuiltinName,
  expandSearchOnlyEntries,
  dedupeKeywords,
};
