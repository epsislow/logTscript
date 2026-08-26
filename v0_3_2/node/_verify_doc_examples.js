'use strict';
/**
 * Verify logts-play doc examples (blocks + optional extra checks).
 *
 * Usage:
 *   node v0_3_2/node/_verify_doc_examples.js inline-logic
 *   node v0_3_2/node/_verify_doc_examples.js comp-logic logic-query-exec
 *   node v0_3_2/node/_verify_doc_examples.js --all
 *   node v0_3_2/node/_verify_doc_examples.js --list
 *   node v0_3_2/node/_verify_doc_examples.js doc/comp-logic.md
 *   node v0_3_2/node/_verify_doc_examples.js --blocks-only servo
 *   node v0_3_2/node/_verify_doc_examples.js --include-blocks comp-logic
 *   node v0_3_2/node/_verify_doc_examples.js '*logic*'
 *   node v0_3_2/node/_verify_doc_examples.js -f '*logic*'
 *
 * PAGE patterns may use * as a wildcard (matched against doc slug / filename without .md):
 *   *logic*     → inline-logic, comp-logic, logic-runtime, …
 *
 * For each page:
 *   1. Runs every ```logts-play block (must not throw)
 *   2. Runs extra checks from node/doc_verify/<slug>.js when present
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { ROOT, DOC } = require('./js/paths');
const { TEST_RUNTIME_SCRIPTS } = require(path.join(ROOT, 'tests', 'test_runtime_bundle_generated.js'));
const { createTestNodeSandbox } = require('./js/test_node_sandbox');

// Opening fence may be LF or CRLF; closing ``` is matched literally.
const LOGTS_PLAY_RE = /```logts-play\r?\n([\s\S]*?)```/g;
const DOC_VERIFY_DIR = path.join(__dirname, 'doc_verify');

function printHelp() {
  console.log(`Verify logts-play examples from documentation pages.

Usage:
  node node/_verify_doc_examples.js [options] [PAGE...]

PAGE:
  Slug without .md (e.g. inline-logic, comp-logic, servo)
  Or path to a doc file (doc/foo.md or absolute path)
  Wildcard * in slug patterns (e.g. *logic*, comp-*)

Options:
  -h, --help         Show this help
  -l, --list         List doc pages that contain logts-play blocks
  -a, --all          Run all pages with logts-play blocks
  --blocks-only      Skip extra checks from node/doc_verify/<slug>.js
  --include-blocks   Run logts-play blocks even when doc_verify sets skipBlocks
  -f, --failures-only   Print only failed blocks/checks (hide OK lines; skip all-pass pages)

Examples:
  node v0_3_2/node/_verify_doc_examples.js inline-logic
  node v0_3_2/node/_verify_doc_examples.js comp-logic logic-runtime
  node v0_3_2/node/_verify_doc_examples.js '*logic*'
  node v0_3_2/node/_verify_doc_examples.js -f --include-blocks '*logic*'
  node v0_3_2/node/_verify_doc_examples.js --all
`);
}

function listAllDocSlugs() {
  return fs.readdirSync(DOC)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
    .sort((a, b) => a.localeCompare(b));
}

function globPatternToRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

function pagePatternHasWildcard(page) {
  return page.includes('*') && !page.includes('/') && !page.includes('\\') && !page.endsWith('.md');
}

function expandPagePatterns(patterns) {
  const allSlugs = listAllDocSlugs();
  const resolved = [];
  const seen = new Set();

  for (const pattern of patterns) {
    if (pagePatternHasWildcard(pattern)) {
      const re = globPatternToRegExp(pattern);
      const matches = allSlugs.filter((slug) => re.test(slug));
      if (!matches.length) {
        throw new Error(`No doc pages match pattern: ${pattern}`);
      }
      for (const slug of matches) {
        if (!seen.has(slug)) {
          seen.add(slug);
          resolved.push(slug);
        }
      }
      continue;
    }
    const slug = slugFromPage(pattern);
    if (!seen.has(slug)) {
      seen.add(slug);
      resolved.push(pattern);
    }
  }

  return resolved;
}

function createSandbox() {
  const sandbox = createTestNodeSandbox({ verbose: false });
  vm.createContext(sandbox);
  for (const script of TEST_RUNTIME_SCRIPTS) {
    const file = path.join(ROOT, script);
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  }
  return sandbox;
}

function slugFromPage(page) {
  const base = path.basename(page);
  return base.endsWith('.md') ? base.slice(0, -3) : base;
}

function resolveDocPath(page) {
  if (page.includes('/') || page.includes('\\') || page.endsWith('.md')) {
    if (path.isAbsolute(page)) return page;
    if (page.startsWith('doc/') || page.startsWith('doc\\')) {
      return path.join(ROOT, page.replace(/\\/g, '/'));
    }
    return path.resolve(process.cwd(), page);
  }
  return path.join(DOC, `${page}.md`);
}

function listDocPagesWithPlayBlocks() {
  const pages = [];
  for (const name of fs.readdirSync(DOC)) {
    if (!name.endsWith('.md')) continue;
    const full = path.join(DOC, name);
    const md = fs.readFileSync(full, 'utf8');
    const count = extractPlayBlocks(md).length;
    if (count > 0) {
      pages.push({ slug: name.slice(0, -3), file: full, blocks: count });
    }
  }
  pages.sort((a, b) => a.slug.localeCompare(b.slug));
  return pages;
}

function normalizeBlockText(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function extractPlayBlocks(md) {
  const blocks = [];
  let m;
  const re = new RegExp(LOGTS_PLAY_RE.source, 'g');
  while ((m = re.exec(md))) {
    blocks.push(normalizeBlockText(m[1]));
  }
  return blocks;
}

function loadExtraModule(slug) {
  const modPath = path.join(DOC_VERIFY_DIR, `${slug}.js`);
  if (!fs.existsSync(modPath)) return { cases: [], skipBlocks: false };
  const mod = require(modPath);
  return {
    cases: mod.cases || mod.explicit || [],
    skipBlocks: !!mod.skipBlocks,
  };
}

function runBlock(sandbox, src) {
  const session = sandbox.LogTScriptTestSuite.createSession();
  let err = null;
  let out = [];
  try {
    const r = session.run(src);
    out = r.out || session.out || [];
  } catch (e) {
    err = e;
  }
  const interp = session.interp;
  if (err && interp && interp.lastReportedError) {
    const lr = interp.lastReportedError;
    if (lr.message && lr.message !== err.message) {
      err = new Error(lr.message);
      err.lastReported = lr;
    }
  }
  return { session, err, out, interp };
}

function runCase(sandbox, caseDef) {
  const { session, err, out, interp } = runBlock(sandbox, caseDef.src);
  const text = out.join('\n');
  let pass = !err;
  const wireMap = caseDef.wires || caseDef.wire || null;
  if (pass && wireMap) {
    for (const [w, v] of Object.entries(wireMap)) {
      if (session.getWire(interp, w) !== v) pass = false;
    }
  }
  if (pass && typeof caseDef.check === 'function') {
    pass = caseDef.check(interp);
  }
  if (pass && caseDef.expect && caseDef.expect.length) {
    pass = caseDef.expect.every((s) => text.includes(s));
  }
  return { pass, err, out: text, session, interp };
}

function verifyPage(sandbox, page, opts) {
  const docPath = resolveDocPath(page);
  if (!fs.existsSync(docPath)) {
    throw new Error(`Doc file not found: ${docPath}`);
  }
  const slug = slugFromPage(page);
  const md = fs.readFileSync(docPath, 'utf8');
  const blocks = extractPlayBlocks(md);
  const extraMod = opts.blocksOnly ? { cases: [], skipBlocks: false } : loadExtraModule(slug);
  const extraCases = extraMod.cases;
  const runBlocks = blocks.length > 0 && (opts.includeBlocks || !extraMod.skipBlocks);

  let blockFails = 0;
  const blockResults = [];

  if (runBlocks) {
    blocks.forEach((src, i) => {
      const { err } = runBlock(sandbox, src);
      const firstLine = src.split('\n').find((l) => l.trim()) || '';
      const snippet = firstLine.slice(0, 60);
      const ok = !err;
      if (!ok) blockFails++;
      blockResults.push({ index: i + 1, ok, snippet, err, src });
    });
  }

  let extraFails = 0;
  const extraResults = [];
  if (extraCases.length) {
    for (const c of extraCases) {
      const r = runCase(sandbox, c);
      if (!r.pass) extraFails++;
      extraResults.push({ caseDef: c, result: r });
    }
  }

  const pageFails = blockFails + extraFails;
  if (opts.failuresOnly && pageFails === 0) {
    const summary = {
      slug,
      blocks: blocks.length,
      blockFails,
      extra: extraCases.length,
      extraFails,
      skippedOutput: true,
    };
    return summary;
  }

  console.log(`\n=== ${slug} (${path.relative(ROOT, docPath)}) ===`);
  if (runBlocks) {
    console.log(`--- logts-play blocks (${blocks.length}) ---`);
  } else if (extraMod.skipBlocks && !opts.includeBlocks) {
    console.log(`--- logts-play blocks: skipped (${blocks.length} in doc; use --include-blocks to run) ---`);
  }

  if (runBlocks) {
    for (const r of blockResults) {
      if (opts.failuresOnly && r.ok) continue;
      console.log(`${r.ok ? 'OK' : 'FAIL'} #${r.index} ${r.snippet}${r.err ? ' — ' + r.err.message : ''}`);
    }

    if (blockFails) {
      console.log('--- failed block sources ---');
      for (const r of blockResults.filter((x) => !x.ok)) {
        console.log(`\n#${r.index} ${r.err.message}\n${r.src}\n`);
      }
    }
  }

  if (extraCases.length) {
    console.log(`--- extra checks (${extraCases.length}) ---`);
    for (const { caseDef: c, result: r } of extraResults) {
      if (opts.failuresOnly && r.pass) continue;
      let detail = '';
      if (!r.pass) {
        detail = `\n  expect: ${JSON.stringify(c.expect || null)}`;
        if (c.wires || c.wire) detail += ` wires=${JSON.stringify(c.wires || c.wire)}`;
        if (r.out) detail += `\n  out: ${r.out.slice(0, 200)}`;
        if (r.err) detail += `\n  err: ${r.err.message}`;
        if (r.interp && r.interp.lastReportedError) {
          detail += `\n  last: ${r.interp.lastReportedError.message}`;
        }
      }
      console.log(`${r.pass ? 'OK' : 'FAIL'} ${c.name}${detail}`);
    }
  } else if (!opts.blocksOnly && !opts.failuresOnly) {
    console.log('--- extra checks: none (add node/doc_verify/' + slug + '.js optional) ---');
  }

  const summary = {
    slug,
    blocks: blocks.length,
    blockFails,
    extra: extraCases.length,
    extraFails,
  };
  const blockSummary = runBlocks
    ? `${blocks.length - blockFails}/${blocks.length}`
    : (blocks.length === 0 ? 'none found' : 'skipped');
  console.log(`Summary: blocks ${blockSummary}` +
    (extraCases.length ? `, extra ${extraCases.length - extraFails}/${extraCases.length}` : ''));
  return summary;
}

function parseArgs(argv) {
  const opts = {
    blocksOnly: false,
    includeBlocks: false,
    failuresOnly: false,
    list: false,
    all: false,
    pages: [],
  };
  for (const arg of argv) {
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '-l' || arg === '--list') {
      opts.list = true;
    } else if (arg === '-a' || arg === '--all') {
      opts.all = true;
    } else if (arg === '-f' || arg === '--failures-only') {
      opts.failuresOnly = true;
    } else if (arg === '--blocks-only') {
      opts.blocksOnly = true;
    } else if (arg === '--include-blocks') {
      opts.includeBlocks = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      opts.pages.push(arg);
    }
  }
  return opts;
}

function runCli(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  if (opts.help) {
    printHelp();
    return 0;
  }

  if (opts.list) {
    const pages = listDocPagesWithPlayBlocks();
    console.log(`Doc pages with logts-play (${pages.length}):`);
    for (const p of pages) {
      const extra = fs.existsSync(path.join(DOC_VERIFY_DIR, `${p.slug}.js`)) ? ' +extra' : '';
      console.log(`  ${p.slug.padEnd(28)} ${String(p.blocks).padStart(3)} blocks${extra}`);
    }
    return 0;
  }

  let pages = opts.pages;
  if (opts.all) {
    pages = listDocPagesWithPlayBlocks().map((p) => p.slug);
  } else {
    try {
      pages = expandPagePatterns(pages);
    } catch (e) {
      console.error(e.message);
      return 2;
    }
  }
  if (!pages.length) {
    printHelp();
    return 2;
  }

  const sandbox = createSandbox();
  let totalFails = 0;
  let pagesWithFails = 0;
  for (const page of pages) {
    const summary = verifyPage(sandbox, page, opts);
    totalFails += summary.blockFails + summary.extraFails;
    if (summary.blockFails + summary.extraFails > 0) pagesWithFails++;
  }

  if (opts.failuresOnly && totalFails === 0) {
    console.log(`\nAll ${pages.length} page(s): no failures.`);
  } else {
    console.log(`\nTotal pages: ${pages.length}, failures: ${totalFails}` +
      (opts.failuresOnly ? ` (${pagesWithFails} page(s) with failures)` : ''));
  }
  return totalFails > 0 ? 1 : 0;
}

module.exports = {
  runCli,
  verifyPage,
  createSandbox,
  listDocPagesWithPlayBlocks,
  listAllDocSlugs,
  expandPagePatterns,
  resolveDocPath,
};

if (require.main === module) {
  process.exit(runCli(process.argv.slice(2)));
}
