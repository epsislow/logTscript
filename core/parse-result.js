/**
 * F2d — parse → <parseResult>+ envelope + builtin infra schemas.
 */
(function (global) {
  'use strict';

  function ss() {
    if (typeof LogTScriptSemanticSchemas !== 'undefined') return LogTScriptSemanticSchemas;
    if (typeof global !== 'undefined' && global.LogTScriptSemanticSchemas) return global.LogTScriptSemanticSchemas;
    try {
      const m = require('./semantic-schemas.js');
      if (m && m.buildSchemaDef) return m;
    } catch (e) { /* not in node bundle */ }
    throw new Error('semantic-schemas.js is not loaded');
  }

  function sb() {
    if (typeof LogTScriptSchemaBound !== 'undefined') return LogTScriptSchemaBound;
    if (typeof global !== 'undefined' && global.LogTScriptSchemaBound) return global.LogTScriptSchemaBound;
    try {
      const m = require('./schema-bound.js');
      if (m && m.packBoundPayload) return m;
    } catch (e) { /* not in node bundle */ }
    throw new Error('schema-bound.js is not loaded');
  }

  function ab() {
    if (typeof buildAstFromParse === 'function') return { buildAstFromParse };
    if (typeof global !== 'undefined' && typeof global.buildAstFromParse === 'function') {
      return { buildAstFromParse: global.buildAstFromParse };
    }
    try {
      return require('./ast-builder.js');
    } catch (e) { /* ignore */ }
    throw new Error('ast-builder.js is not loaded');
  }

  function wl() {
    if (typeof LogTScriptWireLiterals !== 'undefined') return LogTScriptWireLiterals;
    try {
      return require('./wire-literals.js');
    } catch (e) { /* ignore */ }
    throw new Error('wire-literals.js is not loaded');
  }

  function intToBits(value, width) {
    const v = Math.max(0, value | 0);
    let bits = v.toString(2);
    if (bits.length > width) bits = bits.substring(bits.length - width);
    return bits.padStart(width, '0');
  }

  function wireStringToBin(str) {
    const fn = wl().wireStringToBin;
    return fn(str == null ? '' : String(str));
  }

  function registerParseBuiltinSchemas(registry) {
    if (!registry) throw new Error('schema registry missing');
    if (registry.has('parseResult')) return;

    const SS = ss();
    const builtinOpts = { allowReserved: true };

    SS.buildSchemaDefIntoRegistry(registry, 'asciiText256', [
      { kind: 'leaf', name: 'text', width: 2048 },
    ], builtinOpts);

    SS.buildSchemaDefIntoRegistry(registry, 'parseAstOpaque', [], builtinOpts);

    SS.buildSchemaDefIntoRegistry(registry, 'parseError', [
      { kind: 'leaf', name: 'kind', width: 4 },
      { kind: 'leaf', name: 'offset', width: 32 },
      { kind: 'leaf', name: 'line', width: 32 },
      { kind: 'leaf', name: 'column', width: 32 },
      { kind: 'bound', name: 'message', ref: 'asciiText256' },
    ], builtinOpts);

    SS.buildSchemaDefIntoRegistry(registry, 'parseResult', [
      { kind: 'bound', name: 'ast', ref: 'parseAstOpaque', optional: true },
      { kind: 'bound', name: 'error', ref: 'parseError', optional: true },
      { kind: 'bound_var_array', name: 'errors', ref: 'parseError', optional: true, minCount: 1 },
      { kind: 'leaf', name: 'ok', width: 1 },
    ], { hasPresenceMask: true, allowReserved: true });
  }

  function parseErrorKindCode(kind) {
    const map = { lex: 0, syntax: 1, pack: 2 };
    if (kind != null && map[kind] != null) return map[kind];
    if (typeof kind === 'number' && kind >= 0 && kind <= 15) return kind | 0;
    return 1;
  }

  function buildParseErrorBits(error, registry) {
    const SS = ss();
    const err = error || {};
    const msg = String(err.message == null ? '' : err.message).slice(0, 256);
    const messagePayload = wireStringToBin(msg);
    const errSchema = SS.resolveSchema(registry, 'parseError');
    return SS.buildSchemaLiteralBits(errSchema, {
      kind: intToBits(parseErrorKindCode(err.kind), 4),
      offset: intToBits(err.offset != null ? err.offset : 0, 32),
      line: intToBits(err.line != null ? err.line : 0, 32),
      column: intToBits(err.col != null ? err.col : (err.column != null ? err.column : 0), 32),
      message: messagePayload,
    }).bits;
  }

  function packParseResultEnvelope(fieldValues, registry) {
    const SS = ss();
    const schema = SS.resolveSchema(registry, 'parseResult');
    const packed = SS.buildSchemaLiteralBits(schema, fieldValues);
    return { bits: packed.bits, bitWidth: packed.bits.length };
  }

  function packParseSuccess(astBits, astSchemaName, registry) {
    const packed = packParseResultEnvelope({
      ok: '1',
      ast: astBits,
    }, registry);
    return {
      ok: 1,
      bits: packed.bits,
      bitWidth: packed.bitWidth,
      parseAstSchemaRef: String(astSchemaName || '').replace(/\+$/, ''),
    };
  }

  function packParseFailure(error, registry) {
    const errBits = buildParseErrorBits(error, registry);
    const packed = packParseResultEnvelope({
      ok: '0',
      error: errBits,
    }, registry);
    return { ok: 0, bits: packed.bits, bitWidth: packed.bitWidth };
  }

  function packBoundVarArrayPayload(errorList, registry) {
    const SB = sb();
    let payload = '';
    for (const err of errorList || []) {
      payload += SB.packBoundPayload(buildParseErrorBits(err, registry));
    }
    return payload;
  }

  function packParsePartialSuccess(astBits, astSchemaName, errors, registry) {
    const errList = errors && errors.length ? errors : [];
    const primary = errList[0] || { kind: 'syntax', message: 'syntax error' };
    const fields = {
      ok: '0',
      ast: astBits,
      error: buildParseErrorBits(primary, registry),
    };
    if (errList.length) {
      fields.errors = packBoundVarArrayPayload(errList, registry);
    }
    const packed = packParseResultEnvelope(fields, registry);
    return {
      ok: 0,
      bits: packed.bits,
      bitWidth: packed.bitWidth,
      parseAstSchemaRef: String(astSchemaName || '').replace(/\+$/, ''),
    };
  }

  function buildParseResultFromCall(grammar, src, astSchemaName, registry, options) {
    registerParseBuiltinSchemas(registry);
    const rootName = String(astSchemaName || '').replace(/\+$/, '');
    if (!rootName) throw new Error('parse requires schema reference as second argument (e.g. <expr>)');

    const { buildAstFromParse } = ab();
    const built = buildAstFromParse(grammar, src, rootName, registry, options || {});
    if (!built.ok) {
      if (built.bits) {
        return packParsePartialSuccess(built.bits, rootName, built.errors || (built.error ? [built.error] : []), registry);
      }
      return packParseFailure(built.error, registry);
    }
    return packParseSuccess(built.bits, rootName, registry);
  }

  function formatParseTextOutput(result, formatTreeFn) {
    const fmt = typeof formatTreeFn === 'function' ? formatTreeFn : null;
    const formatTree = fmt || (typeof formatParseTree === 'function' ? formatParseTree : null);
    if (result.tree != null) {
      let text = formatTree ? formatTree(result.tree) : JSON.stringify(result.tree);
      const errs = result.errors && result.errors.length
        ? result.errors
        : (!result.ok && result.error ? [result.error] : []);
      if (errs.length) {
        text += '\n--- errors (' + errs.length + ') ---\n';
        for (let i = 0; i < errs.length; i++) {
          const err = errs[i];
          const kind = err.kind || 'syntax';
          const line = err.line != null ? err.line : 0;
          const col = err.col != null ? err.col : (err.column != null ? err.column : 0);
          text += '[' + i + '] ' + kind + ' at ' + line + ':' + col + ': ' + (err.message || '') + '\n';
        }
      }
      return text.replace(/\n$/, '');
    }
    if (result.ok) {
      return formatTree ? formatTree(result.tree) : JSON.stringify(result.tree);
    }
    const err = result.error || {};
    const kind = err.kind || 'syntax';
    const line = err.line != null ? err.line : 0;
    const col = err.col != null ? err.col : (err.column != null ? err.column : 0);
    return 'parse error (' + kind + ' at ' + line + ':' + col + '): ' + (err.message || '');
  }

  function buildParseTextWire(grammar, src, startRule, formatTreeFn) {
    const parseFn = typeof parseGrammar === 'function' ? parseGrammar : null;
    if (!parseFn) throw new Error('parser-engine.js is not loaded');
    const result = parseFn(grammar, src, startRule ? { startRule } : undefined);
    const text = formatParseTextOutput(result, formatTreeFn);
    const bits = wireStringToBin(text);
    return { bits, bitWidth: bits.length, text };
  }

  const api = {
    registerParseBuiltinSchemas,
    buildParseErrorBits,
    buildParseResultFromCall,
    buildParseTextWire,
    packParseFailure,
    packParseSuccess,
    wireStringToBin,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.registerParseBuiltinSchemas = registerParseBuiltinSchemas;
  global.buildParseResultFromCall = buildParseResultFromCall;
  global.buildParseTextWire = buildParseTextWire;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global);
