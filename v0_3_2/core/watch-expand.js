/**
 * Expand watch() expressions into per-bit timeline channels.
 */
(function (global) {
  'use strict';

  function parseWireTypeBits(type) {
    if (!type) return 1;
    const m = String(type).match(/^(\d+)wire$/);
    if (m) return parseInt(m[1], 10);
    if (type === '1wire') return 1;
    return 1;
  }

  function buildWireWidthMapFromStmts(stmts) {
    const map = new Map();
    if (!stmts) return map;
    for (const s of stmts) {
      if (!s.decls) continue;
      for (const d of s.decls) {
        if (d.name && d.type) map.set(d.name, parseWireTypeBits(d.type));
      }
    }
    return map;
  }

  function estimatePropertyBitWidth(type, property, attributes, registry) {
    const attrs = attributes || {};
    if (type === 'osc' && property === 'counter') {
      return parseInt(attrs.length, 10) || 4;
    }
    if (property === 'get') {
      if (attrs.length != null) return parseInt(attrs.length, 10) || 1;
      if (attrs.depth != null) return parseInt(attrs.depth, 10) || 1;
      return 1;
    }
    if (property === 'carry' || property === 'over' || property === 'reset') return 1;
    if ((property === 'mod' || property === 'out') && attrs.depth != null) {
      return parseInt(attrs.depth, 10) || 1;
    }
    const comp = registry && registry.get ? registry.get(type) : null;
    if (comp && typeof comp.getWidthBits === 'function') {
      try {
        const w = comp.getWidthBits(attrs);
        if (w > 0) return w;
      } catch (e) { /* ignore */ }
    }
    return 1;
  }

  function buildComponentPropertyWidthMap(stmts, registry) {
    const map = new Map();
    if (!stmts) return map;
    for (const s of stmts) {
      if (!s.comp || !s.comp.name || !s.comp.type) continue;
      const { name, type, attributes } = s.comp;
      const attrs = attributes || {};
      const handler = registry && registry.get ? registry.get(type) : null;
      const props = handler && handler.getSupportedProperties ? handler.getSupportedProperties() : [];
      for (const property of props) {
        if (registry && !registry.supportsProperty(type, property, attrs)) continue;
        const width = estimatePropertyBitWidth(type, property, attrs, registry);
        map.set(name + ':' + property, width);
      }
    }
    return map;
  }

  function makeBitWatchExpr(varName, bit) {
    return [{ var: varName, bitRange: { start: bit, end: bit } }];
  }

  function makeBitComponentPropertyExpr(compName, property, bit) {
    return [{ var: compName, property, bitRange: { start: bit, end: bit } }];
  }

  function resolveStaticBitRange(bitRange, resolveRange) {
    if (!bitRange) return null;
    if (resolveRange) return resolveRange(bitRange);
    const start = bitRange.start;
    const end = bitRange.end != null ? bitRange.end : start;
    return { start, end };
  }

  function isExpandableWireAtom(atom) {
    return atom && atom.var && !atom.property && !atom.internalWire && !atom.var.startsWith('.');
  }

  function isComponentPropertyAtom(atom) {
    return atom && atom.var && atom.var.startsWith('.') && atom.property && !atom.internalWire;
  }

  function resolveComponentPropertyWidth(compName, property, compPropWidths) {
    if (!compPropWidths || !compPropWidths.get) return 1;
    return compPropWidths.get(compName + ':' + property) || 1;
  }

  function expandWatchExpr(expr, wireWidths, resolveRange, compPropWidths) {
    if (!expr || !expr.length) return [expr];
    const a = expr[0];

    if (isComponentPropertyAtom(a)) {
      const width = resolveComponentPropertyWidth(a.var, a.property, compPropWidths);
      if (a.bitRange) {
        const range = resolveStaticBitRange(a.bitRange, resolveRange);
        if (!range) return [expr];
        const { start, end } = range;
        if (start > end) return [expr];
        if (start === end) return [expr];
        const out = [];
        for (let b = start; b <= end; b++) {
          out.push(makeBitComponentPropertyExpr(a.var, a.property, b));
        }
        return out;
      }
      if (width > 1) {
        const out = [];
        for (let b = 0; b < width; b++) {
          out.push(makeBitComponentPropertyExpr(a.var, a.property, b));
        }
        return out;
      }
      return [expr];
    }

    if (!isExpandableWireAtom(a)) return [expr];

    const width = wireWidths && wireWidths.get ? wireWidths.get(a.var) : null;

    if (a.bitRange) {
      const range = resolveStaticBitRange(a.bitRange, resolveRange);
      if (!range) return [expr];
      const { start, end } = range;
      if (start > end) return [expr];
      if (start === end) return [expr];
      const out = [];
      for (let b = start; b <= end; b++) out.push(makeBitWatchExpr(a.var, b));
      return out;
    }

    if (width != null && width > 1) {
      const out = [];
      for (let b = 0; b < width; b++) out.push(makeBitWatchExpr(a.var, b));
      return out;
    }
    return [expr];
  }

  function expandWatchExprs(exprs, wireWidths, resolveRange, compPropWidths) {
    const out = [];
    for (const e of exprs || []) {
      out.push(...expandWatchExpr(e, wireWidths, resolveRange, compPropWidths));
    }
    return out;
  }

  function labelFromWatchExpr(expr) {
    const a = expr && expr[0];
    if (!a) return '?';
    if (a.var) {
      if (a.property) {
        const base = `${a.var}:${a.property}`;
        if (a.bitRange) {
          const start = a.bitRange.start;
          const end = a.bitRange.end != null ? a.bitRange.end : start;
          return start === end ? `${base}.${start}` : `${base}.${start}-${end}`;
        }
        return base;
      }
      if (a.internalWire) return a.var + '.' + a.internalWire;
      if (a.bitRange) {
        const start = a.bitRange.start;
        const end = a.bitRange.end != null ? a.bitRange.end : start;
        return start === end ? `${a.var}.${start}` : `${a.var}.${start}-${end}`;
      }
      return a.var;
    }
    if (a.ref || a.refLiteral) return String(a.ref || a.refLiteral);
    return '?';
  }

  function watchTargetKeyFromExpr(expr, wireWidths, resolveRange, compPropWidths) {
    const a = expr && expr[0];
    if (!a) return '?';
    if (isComponentPropertyAtom(a)) {
      if (a.bitRange) {
        const range = resolveStaticBitRange(a.bitRange, resolveRange);
        if (!range) return 'cc:' + a.var + ':' + a.property;
        return 'ccs:' + a.var + ':' + a.property + ':' + range.start + '-' + range.end;
      }
      const width = resolveComponentPropertyWidth(a.var, a.property, compPropWidths);
      if (width > 1) return null;
      return 'cc:' + a.var + ':' + a.property;
    }
    if (isExpandableWireAtom(a)) {
      if (a.bitRange) {
        const range = resolveStaticBitRange(a.bitRange, resolveRange);
        if (!range) return 'w:' + a.var;
        return 'w:' + a.var + ':' + range.start + '-' + range.end;
      }
      const width = wireWidths && wireWidths.get ? wireWidths.get(a.var) : null;
      if (width != null && width > 1) return null;
      return 'w:' + a.var;
    }
    if (a.ref || a.refLiteral) return 'r:' + String(a.ref || a.refLiteral);
    if (a.var) return 'v:' + labelFromWatchExpr(expr);
    return 'expr:' + labelFromWatchExpr(expr);
  }

  function dedupeExpandedWatchExprs(exprs, wireWidths, resolveRange, compPropWidths) {
    const expanded = expandWatchExprs(exprs, wireWidths, resolveRange, compPropWidths);
    const seen = new Set();
    const out = [];
    for (const expr of expanded) {
      const key = watchTargetKeyFromExpr(expr, wireWidths, resolveRange, compPropWidths);
      if (key == null || seen.has(key)) continue;
      seen.add(key);
      out.push(expr);
    }
    return out;
  }

  function watchLabelsFromExprs(exprs, wireWidths, resolveRange, compPropWidths) {
    return dedupeExpandedWatchExprs(exprs, wireWidths, resolveRange, compPropWidths).map(labelFromWatchExpr);
  }

  const api = {
    parseWireTypeBits,
    buildWireWidthMapFromStmts,
    buildComponentPropertyWidthMap,
    estimatePropertyBitWidth,
    makeBitWatchExpr,
    makeBitComponentPropertyExpr,
    expandWatchExpr,
    expandWatchExprs,
    watchTargetKeyFromExpr,
    dedupeExpandedWatchExprs,
    labelFromWatchExpr,
    watchLabelsFromExprs
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptWatchExpand = api;
})(typeof window !== 'undefined' ? window : global);
