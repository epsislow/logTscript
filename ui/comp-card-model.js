/**
 * Comp card model — parse / serialize / patch `comp [...]` blocks for CodeMirror widgets.
 * Testable in Node (LogTScriptCompCardModel) and browser.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LogTScriptCompCardModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ON_ENUM = ['raise', 'edge', '1'];

  function countBraces(line) {
    let open = 0;
    let close = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '{') open++;
      else if (line[i] === '}') close++;
    }
    return open - close;
  }

  function findCompBlockSpans(src) {
    const lines = src.split('\n');
    const spans = [];
    let i = 0;
    while (i < lines.length) {
      if (!/^\s*comp\s+\[/.test(lines[i])) {
        i++;
        continue;
      }
      const startLine = i;
      if (/::\s*$/.test(lines[i])) {
        spans.push({ startLine, endLine: i, startCh: 0, endCh: lines[i].length });
        i++;
        continue;
      }
      let braceDepth = 0;
      let j = i + 1;
      let found = false;
      for (; j < lines.length; j++) {
        braceDepth += countBraces(lines[j]);
        if (braceDepth === 0 && /^\s*:\s*$/.test(lines[j])) {
          spans.push({ startLine, endLine: j, startCh: 0, endCh: lines[j].length });
          i = j + 1;
          found = true;
          break;
        }
      }
      if (!found) {
        spans.push({
          startLine,
          endLine: lines.length - 1,
          startCh: 0,
          endCh: lines[lines.length - 1].length
        });
        i = lines.length;
      }
    }
    return spans;
  }

  function extractSpanText(src, span) {
    const lines = src.split('\n');
    return lines.slice(span.startLine, span.endLine + 1).join('\n');
  }

  function splitCompBlock(rawText) {
    const lines = rawText.split('\n');
    if (!lines.length) return null;
    const headerMatch = lines[0].match(/^(\s*)comp\s+\[([^\]]+)\]\s+(\S+)\s*(::|:)\s*$/);
    if (!headerMatch) return null;
    const emptyBody = headerMatch[4] === '::';
    if (emptyBody) {
      return {
        indent: headerMatch[1],
        type: headerMatch[2].trim(),
        name: headerMatch[3].trim(),
        emptyBody: true,
        bodyLines: [],
        closingLine: null
      };
    }
    if (lines.length < 2) return null;
    return {
      indent: headerMatch[1],
      type: headerMatch[2].trim(),
      name: headerMatch[3].trim(),
      emptyBody: false,
      bodyLines: lines.slice(1, lines.length - 1),
      closingLine: lines[lines.length - 1]
    };
  }

  function getSegAttrsSet(compType, registry) {
    const set = new Set();
    if (!registry || !compType) return set;
    const handler = registry.get(compType);
    const special = handler && handler.getSpecialParseAttributes
      ? handler.getSpecialParseAttributes()
      : null;
    if (special && Array.isArray(special.segAttributes)) {
      special.segAttributes.forEach(function (s) { set.add(s); });
    }
    return set;
  }

  function parseBodyItems(bodyLines, compType, registry) {
    const items = [];
    const segAttrs = getSegAttrsSet(compType, registry);
    let i = 0;

    while (i < bodyLines.length) {
      const line = bodyLines[i];
      const trimmed = line.trim();

      if (trimmed === '') {
        items.push({ kind: 'raw', rawLines: [line] });
        i++;
        continue;
      }

      if (/^\s*=/.test(line)) {
        const rawLines = [line];
        let braceDepth = countBraces(line.replace(/^\s*=\s*/, ''));
        i++;
        while (i < bodyLines.length && braceDepth > 0) {
          rawLines.push(bodyLines[i]);
          braceDepth += countBraces(bodyLines[i]);
          i++;
        }
        items.push({ kind: 'equals', rawLines: rawLines });
        continue;
      }

      const segMatch = line.match(/^\s*([a-zA-Z]\w*)\s*:\s*([01])\s*$/);
      if (segMatch && segAttrs.has(segMatch[1])) {
        items.push({
          kind: 'segment',
          name: segMatch[1],
          value: segMatch[2],
          rawLines: [line]
        });
        i++;
        continue;
      }

      const attrMatch = line.match(/^\s*([a-zA-Z]\w*)\s*:\s*(.*)$/);
      if (attrMatch) {
        const val = attrMatch[2].trim();
        const hasOpenBrace = val === '{' || (val.includes('{') && !val.includes('}'));
        if (hasOpenBrace) {
          const rawLines = [line];
          let braceDepth = val === '{' ? 1 : countBraces(val);
          i++;
          while (i < bodyLines.length && braceDepth > 0) {
            rawLines.push(bodyLines[i]);
            braceDepth += countBraces(bodyLines[i]);
            i++;
          }
          items.push({ kind: 'raw', rawLines: rawLines });
          continue;
        }
        if (val !== '') {
          items.push({ kind: 'attr', name: attrMatch[1], rawLines: [line] });
          i++;
          continue;
        }
      }

      const flagMatch = line.match(/^\s*([a-zA-Z]\w*)\s*$/);
      if (flagMatch) {
        items.push({ kind: 'flag', name: flagMatch[1], rawLines: [line] });
        i++;
        continue;
      }

      if (trimmed.includes('{') || /^\s*\./.test(line) || /^\s*\w+\s+\{/.test(line)) {
        const rawLines = [line];
        let braceDepth = countBraces(line);
        i++;
        while (i < bodyLines.length && braceDepth > 0) {
          rawLines.push(bodyLines[i]);
          braceDepth += countBraces(bodyLines[i]);
          i++;
        }
        items.push({ kind: 'raw', rawLines: rawLines });
        continue;
      }

      items.push({ kind: 'raw', rawLines: [line] });
      i++;
    }
    return items;
  }

  function detectBodyIndent(model) {
    for (const item of model.bodyItems) {
      if (item.rawLines && item.rawLines.length) {
        const m = item.rawLines[0].match(/^(\s+)/);
        if (m) return m[1];
      }
    }
    if (model.closingLine) {
      const m = model.closingLine.match(/^(\s*):/);
      if (m) return m[1] || '  ';
    }
    return '  ';
  }

  function serializeCompBlock(model) {
    const lines = [];
    const headerSuffix = model.emptyBody ? '::' : ':';
    lines.push((model.indent || '') + 'comp [' + model.type + '] ' + model.name + headerSuffix);
    for (const item of model.bodyItems) {
      for (let r = 0; r < item.rawLines.length; r++) {
        lines.push(item.rawLines[r]);
      }
    }
    if (!model.emptyBody) {
      lines.push(model.closingLine || (detectBodyIndent(model) + ':'));
    }
    return lines.join('\n');
  }

  function cloneModel(model) {
    return {
      id: model.id,
      type: model.type,
      name: model.name,
      span: model.span ? { startLine: model.span.startLine, endLine: model.span.endLine, startCh: model.span.startCh, endCh: model.span.endCh } : null,
      rawText: model.rawText,
      bodyItems: model.bodyItems.map(function (item) {
        return {
          kind: item.kind,
          name: item.name,
          value: item.value,
          rawLines: item.rawLines.slice()
        };
      }),
      emptyBody: model.emptyBody,
      closingLine: model.closingLine,
      indent: model.indent,
      viewMode: model.viewMode || 'card',
      parsed: model.parsed,
      initialValue: model.initialValue
    };
  }

  function spanKey(span) {
    return span.startLine + ':' + span.endLine + ':' + span.endCh;
  }

  function parseCompBlocks(src, registry) {
    const preprocessed = typeof preprocessLoop === 'function' ? preprocessLoop(src) : src;
    const spans = findCompBlockSpans(preprocessed);
    let comps = [];
    try {
      const p = new Parser(new Tokenizer(preprocessed), registry);
      const stmts = p.parse();
      comps = stmts.filter(function (s) { return s && s.comp; }).map(function (s) { return s.comp; });
    } catch (e) {
      comps = [];
    }

    return spans.map(function (span, idx) {
      const rawText = extractSpanText(preprocessed, span);
      const split = splitCompBlock(rawText);
      const parsed = comps[idx] || null;
      const type = split ? split.type : (parsed ? parsed.type : '');
      const name = split ? split.name : (parsed ? parsed.name : '');
      const bodyItems = split ? parseBodyItems(split.bodyLines, type, registry) : [];

      return {
        id: span.startLine + ':0',
        type: type,
        name: name,
        span: span,
        rawText: rawText,
        bodyItems: bodyItems,
        emptyBody: split ? split.emptyBody : false,
        closingLine: split ? split.closingLine : '  :',
        indent: split ? split.indent : '',
        viewMode: 'card',
        parsed: parsed,
        initialValue: parsed ? parsed.initialValue : null
      };
    });
  }

  function getAttrDef(compType, attrName, registry) {
    if (attrName === 'on') return { name: 'on', value: 'mode' };
    if (!registry) return null;
    const handler = registry.get(compType);
    if (!handler || !handler.getDef) return null;
    const def = handler.getDef();
    if (!def || !def.attrs) return null;
    return def.attrs.find(function (a) { return a.name === attrName; }) || null;
  }

  function getKnownAttrNames(compType, registry) {
    const names = new Set(['on', 'nl']);
    if (!registry || !compType) return names;
    const handler = registry.get(compType);
    if (handler && handler.getDef) {
      const def = handler.getDef();
      if (def && def.attrs) {
        def.attrs.forEach(function (a) { names.add(a.name); });
      }
      const special = handler.getSpecialParseAttributes ? handler.getSpecialParseAttributes() : null;
      if (special && special.segAttributes) {
        special.segAttributes.forEach(function (s) { names.add(s); });
      }
    }
    return names;
  }

  function getInvalidAttrs(model, registry) {
    const known = getKnownAttrNames(model.type, registry);
    const invalid = [];
    for (const item of model.bodyItems) {
      if (item.kind === 'attr' || item.kind === 'flag') {
        if (!known.has(item.name)) invalid.push(item.name);
      } else if (item.kind === 'segment') {
        if (!known.has(item.name)) invalid.push(item.name);
      }
    }
    return invalid;
  }

  function parseAttrValueFromLine(rawLine) {
    const m = rawLine.match(/^\s*\w+\s*:\s*(.*)$/);
    return m ? m[1] : '';
  }

  function getExplicitAttrs(model) {
    const attrs = [];
    for (const item of model.bodyItems) {
      if (item.kind === 'attr') {
        attrs.push({ name: item.name, value: parseAttrValueFromLine(item.rawLines[0]), kind: 'attr' });
      } else if (item.kind === 'flag') {
        attrs.push({ name: item.name, value: null, kind: 'flag' });
      } else if (item.kind === 'segment') {
        attrs.push({ name: item.name, value: item.value, kind: 'segment' });
      }
    }
    return attrs;
  }

  function getMissingAttrNames(model, registry) {
    const present = new Set(getExplicitAttrs(model).map(function (a) { return a.name; }));
    const missing = [];
    if (!registry) return missing;
    const handler = registry.get(model.type);
    if (handler && handler.getDef) {
      const def = handler.getDef();
      if (def && def.attrs) {
        def.attrs.forEach(function (a) {
          if (!present.has(a.name)) missing.push(a.name);
        });
      }
    }
    if (!present.has('on')) missing.push('on');
    return missing.filter(function (n, i, arr) { return arr.indexOf(n) === i && !present.has(n); });
  }

  function getEqualsItem(model) {
    return model.bodyItems.find(function (i) { return i.kind === 'equals'; }) || null;
  }

  function getEqualsRhsText(item) {
    if (!item || !item.rawLines.length) return '';
    const first = item.rawLines[0].replace(/^\s*=\s*/, '');
    if (item.rawLines.length === 1) return first;
    return [first].concat(item.rawLines.slice(1)).join('\n');
  }

  function defaultLineForAttr(attrName, compType, registry, indent) {
    const def = getAttrDef(compType, attrName, registry);
    if (attrName === 'on') return indent + 'on: 1';
    if (def && def.value === null) return indent + attrName;
    if (def && def.value === 'color') return indent + attrName + ': ^ffffff';
    if (def && def.value === 'integer') return indent + attrName + ': 0';
    if (def && def.value === 'string') return indent + attrName + ": ''";
    const enumOpts = getAttrEnumOptions(attrName, def);
    if (enumOpts) return indent + attrName + ': ' + enumOpts[0];
    return indent + attrName + ": ''";
  }

  function addAttr(model, attrName, registry) {
    const newModel = cloneModel(model);
    const indent = detectBodyIndent(newModel);
    const def = getAttrDef(newModel.type, attrName, registry);
    const line = defaultLineForAttr(attrName, newModel.type, registry, indent);
    const kind = def && def.value === null ? 'flag' : 'attr';
    newModel.bodyItems.push({ kind: kind, name: attrName, rawLines: [line] });
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeAttr(model, attrName) {
    const newModel = cloneModel(model);
    newModel.bodyItems = newModel.bodyItems.filter(function (item) {
      if (item.kind === 'attr' || item.kind === 'flag' || item.kind === 'segment') {
        return item.name !== attrName;
      }
      return true;
    });
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setAttrValue(model, attrName, newValue) {
    const newModel = cloneModel(model);
    let found = false;
    for (const item of newModel.bodyItems) {
      if ((item.kind === 'attr' || item.kind === 'segment') && item.name === attrName) {
        const indent = (item.rawLines[0].match(/^(\s*)/) || ['', '  '])[1];
        if (item.kind === 'segment') {
          item.value = newValue;
        }
        item.rawLines = [indent + attrName + ': ' + newValue];
        found = true;
      }
    }
    if (!found) {
      const indent = detectBodyIndent(newModel);
      newModel.bodyItems.push({ kind: 'attr', name: attrName, rawLines: [indent + attrName + ': ' + newValue] });
    }
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setCompType(model, newType) {
    const newModel = cloneModel(model);
    newModel.type = newType;
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setCompName(model, newName) {
    const newModel = cloneModel(model);
    newModel.name = newName;
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setEqualsRhs(model, rhsText) {
    const newModel = cloneModel(model);
    const indent = detectBodyIndent(newModel);
    const lines = String(rhsText).split('\n');
    const rawLines = [indent + '= ' + lines[0]];
    for (let i = 1; i < lines.length; i++) {
      rawLines.push(lines[i]);
    }
    const eqIdx = newModel.bodyItems.findIndex(function (i) { return i.kind === 'equals'; });
    if (eqIdx >= 0) {
      newModel.bodyItems[eqIdx] = { kind: 'equals', rawLines: rawLines };
    } else {
      newModel.bodyItems.push({ kind: 'equals', rawLines: rawLines });
    }
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function toggleSegment(model, segName) {
    for (const item of model.bodyItems) {
      if (item.kind === 'segment' && item.name === segName) {
        const next = item.value === '0' ? '1' : '0';
        return setAttrValue(model, segName, next);
      }
    }
    return model;
  }

  function getAttrEnumOptions(attrName, attrDef) {
    if (attrName === 'on') return ON_ENUM.slice();
    if (!attrDef || attrDef.value == null) return null;
    const v = String(attrDef.value).trim();
    if (v === 'mode') return ON_ENUM.slice();
    if (/^raise\|edge\|1$/i.test(v) || /^1\|raise\|edge$/i.test(v) || /^raise\/edge\/1$/i.test(v)) {
      return ON_ENUM.slice();
    }
    if (v.includes('/') && v.indexOf('raise') === -1 && v.indexOf('edge') === -1) {
      const parts = v.split('/').map(function (s) { return s.trim(); }).filter(Boolean);
      if (parts.length >= 2) return parts;
    }
    if (v.indexOf('|') !== -1) {
      const parts = v.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
      if (parts.length >= 2) return parts;
    }
    return null;
  }

  function getWidgetFieldType(attrName, attrDef) {
    if (getAttrEnumOptions(attrName, attrDef)) return 'enum';
    if (!attrDef) return 'text';
    if (attrDef.value === null) return 'flag';
    if (attrDef.value === 'integer') return 'integer';
    if (attrDef.value === 'string') return 'string';
    if (attrDef.value === 'color') return 'color';
    return 'text';
  }

  function buildTypeCatalog(registry) {
    const categories = {
      'Interactive inputs': ['switch', 'key', 'keyboard', 'dip', 'ioport', 'rotary', 'slider', 'sensor', 'scanner'],
      'Displays': ['led', 'bar', '7seg', '14seg', 'lcd', 'clcd', 'canvas', 'alu', 'terminal', 'dots', 'motor', 'servo'],
      'Arithmetic & logic': ['adder', 'subtract', 'multiplier', 'divider', 'shifter', 'counter', 'logic', 'lut'],
      'Storage & timing': ['mem', 'cpu', 'plc', 'dma', 'reg', 'queue', 'network', 'stack', 'osc', 'mmap', 'cache']
    };
    const allTypes = registry && registry.getAllTypes ? registry.getAllTypes() : [];
    const typeSet = new Set(allTypes);
    const result = {};
    for (const [cat, types] of Object.entries(categories)) {
      const present = types.filter(function (t) { return typeSet.has(t); });
      if (present.length) result[cat] = present;
    }
    const categorized = new Set(Object.values(result).flat());
    const other = allTypes.filter(function (t) { return !categorized.has(t); }).sort();
    if (other.length) result.Other = other;
    return result;
  }

  return {
    ON_ENUM: ON_ENUM,
    findCompBlockSpans: findCompBlockSpans,
    parseCompBlocks: parseCompBlocks,
    serializeCompBlock: serializeCompBlock,
    cloneModel: cloneModel,
    spanKey: spanKey,
    getAttrDef: getAttrDef,
    getKnownAttrNames: getKnownAttrNames,
    getInvalidAttrs: getInvalidAttrs,
    getExplicitAttrs: getExplicitAttrs,
    getMissingAttrNames: getMissingAttrNames,
    getEqualsItem: getEqualsItem,
    getEqualsRhsText: getEqualsRhsText,
    addAttr: addAttr,
    removeAttr: removeAttr,
    setAttrValue: setAttrValue,
    setCompType: setCompType,
    setCompName: setCompName,
    setEqualsRhs: setEqualsRhs,
    toggleSegment: toggleSegment,
    getWidgetFieldType: getWidgetFieldType,
    getAttrEnumOptions: getAttrEnumOptions,
    getSegAttrsSet: getSegAttrsSet,
    buildTypeCatalog: buildTypeCatalog
  };
});
