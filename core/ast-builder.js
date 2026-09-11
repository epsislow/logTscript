/**
 * F2c / F2f — parse tree IR → typed AST wire (semantic schema pack).
 */
(function (global) {
  'use strict';

  function ss() {
    if (typeof LogTScriptSemanticSchemas !== 'undefined') return LogTScriptSemanticSchemas;
    if (typeof global !== 'undefined' && global.LogTScriptSemanticSchemas) return global.LogTScriptSemanticSchemas;
    try {
      const m = require('./semantic-schemas.js');
      if (m && m.resolveSchema) return m;
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

  function wl() {
    if (typeof LogTScriptWireLiterals !== 'undefined') return LogTScriptWireLiterals;
    try {
      return require('./wire-literals.js');
    } catch (e) { /* ignore */ }
    throw new Error('wire-literals.js is not loaded');
  }

  function parseGrammarFn() {
    if (typeof parseGrammar === 'function') return parseGrammar;
    if (typeof global !== 'undefined' && typeof global.parseGrammar === 'function') return global.parseGrammar;
    try {
      const pe = require('./parser-engine.js');
      if (pe && pe.parseGrammar) return pe.parseGrammar;
    } catch (e) { /* ignore */ }
    return null;
  }

  function intToBits(value, width) {
    return (value >>> 0).toString(2).padStart(width, '0');
  }

  function wireStringToBin(str) {
    return wl().wireStringToBin(str == null ? '' : String(str));
  }

  function validateUnsigned(value, width, label) {
    if (!Number.isFinite(value) || value < 0 || Math.floor(value) !== value) {
      throw new Error(`Field '${label}': value must be a non-negative integer (got ${value})`);
    }
    const max = width >= 31 ? 0x7fffffff : ((1 << width) - 1);
    if (value > max) {
      throw new Error(`Field '${label}' overflow: value ${value} exceeds ${width}-bit capacity (max ${max})`);
    }
  }

  function validateAsciiText(text, label) {
    if (text == null || text === '') {
      throw new Error(`Field '${label}': text must not be empty`);
    }
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) > 127) {
        throw new Error(`Field '${label}': non-ASCII character at index ${i}`);
      }
    }
  }

  function schemaOptionalFields(schema) {
    if (!schema || !schema.structure) return [];
    return schema.structure.filter((n) => n.kind === 'optional_field');
  }

  function findBoundVarArrayNode(schema) {
    if (!schema || !schema.structure) return null;
    return schema.structure.find((n) => n.kind === 'bound_var_array') || null;
  }

  function resolveSchema(registry, name) {
    return ss().resolveSchema(registry, name);
  }

  function canonicalSchema(schema, registry) {
    if (schema && schema.name && registry && registry.has(schema.name)) {
      return resolveSchema(registry, schema.name);
    }
    return schema;
  }

  function assertMaxOneBranch(fieldValues, schema) {
    if (!schema.hasPresenceMask) return;
    let count = 0;
    for (const node of schemaOptionalFields(schema)) {
      const val = fieldValues[node.name];
      if (val != null && val !== '') count++;
    }
    if (count > 1) {
      throw new Error(`Schema '${schema.name}': at most one optional branch may be present (got ${count})`);
    }
  }

  function buildSchemaLiteralBitsChecked(schema, fieldValues) {
    if (schema.hasPresenceMask) assertMaxOneBranch(fieldValues, schema);
    return ss().buildSchemaLiteralBits(schema, fieldValues).bits;
  }

  function isIntCapture(cap) {
    return cap && cap.kind === 'token' && cap.name === 'INT';
  }

  function isTextCapture(cap) {
    return cap && cap.kind === 'token' && cap.name !== 'INT';
  }

  function cannotFillError(schemaName, fieldName) {
    throw new Error(`Schema '${schemaName}': field '${fieldName}' cannot be filled from capture`);
  }

  function getSingleLeaf(schema) {
    if (!schema || !schema.structure || schema.structure.length !== 1) return null;
    const node = schema.structure[0];
    return node.kind === 'leaf' ? node : null;
  }

  function isByteElementSchema(schema) {
    const leaf = getSingleLeaf(schema);
    return !!(leaf && leaf.width === 8);
  }

  function findBvaBytesField(schema) {
    if (!schema || !schema.structure) return null;
    for (const node of schema.structure) {
      if (node.kind !== 'bound_var_array') continue;
      const elem = node.schema || null;
      if (elem && isByteElementSchema(elem)) return node;
    }
    return null;
  }

  function tokenTextFromCapture(cap, label) {
    if (!cap || cap.kind !== 'token') {
      throw new Error(`Field '${label}': expected token capture`);
    }
    return cap.text;
  }

  function numericFromTokenText(text, label) {
    if (text == null || text === '') {
      throw new Error(`Field '${label}': missing numeric token text`);
    }
    const num = parseInt(text, 10);
    if (!Number.isFinite(num)) {
      throw new Error(`Field '${label}': invalid numeric text '${text}'`);
    }
    return num;
  }

  function replTruncSymbolText(text) {
    const s = text == null ? '' : String(text);
    return s.length > 5 ? s.substring(0, 5) : s;
  }

  function parseF64LiteralText(text, label) {
    if (text == null || text === '') {
      throw new Error(`Field '${label}': missing numeric text`);
    }
    const num = parseFloat(String(text));
    if (!Number.isFinite(num)) {
      throw new Error(`Field '${label}': invalid numeric text '${text}'`);
    }
    return num;
  }

  function encodeF64Leaf(value, label) {
    const NF = typeof LogTScriptNumericFormats !== 'undefined' ? LogTScriptNumericFormats : null;
    const nf = NF && typeof NF.encodeFromFloat === 'function' ? NF.encodeFromFloat : null;
    if (!nf) throw new Error(`Field '${label}': float encode is not available`);
    const bits = nf(Number(value), 'f64');
    if (!bits || bits.length !== 64) {
      throw new Error(`Field '${label}': f64 encode failed`);
    }
    return bits;
  }

  function numericFromTree(tree, label) {
    let text = null;
    if (tree && tree.kind === 'token') text = tree.text;
    else if (tree && tree.captures && tree.captures[label]) {
      const cap = tree.captures[label];
      text = cap.kind === 'token' ? cap.text : null;
    } else if (tree && tree.children && tree.children[label] != null) {
      const child = tree.children[label];
      text = typeof child === 'string' ? child : (child && child.text != null ? child.text : null);
    } else if (tree && tree.children && tree.children.value != null) {
      text = typeof tree.children.value === 'string' ? tree.children.value : (tree.children.value.text || null);
    } else if (tree && tree.captures && tree.captures.value) {
      const cap = tree.captures.value;
      text = cap.kind === 'token' ? cap.text : null;
    }
    return numericFromTokenText(text, label);
  }

  function packAsciiFixedWidth(text, width, schemaName, fieldName) {
    validateAsciiText(text, fieldName);
    if (width % 8 !== 0) {
      cannotFillError(schemaName, fieldName);
    }
    const maxChars = width / 8;
    if (text.length > maxChars) {
      throw new Error(
        `Schema '${schemaName}': field '${fieldName}' overflow: text length ${text.length} exceeds max ${maxChars} (${width} bit)`
      );
    }
    let bits = wireStringToBin(text);
    while (bits.length < width) bits += '00000000';
    return bits.substring(0, width);
  }

  function packTokenToLeafBits(cap, leafNode, schemaName, fieldName) {
    if (isIntCapture(cap)) {
      const num = numericFromTokenText(cap.text, fieldName);
      validateUnsigned(num, leafNode.width, fieldName);
      return intToBits(num, leafNode.width);
    }
    if (isTextCapture(cap) && leafNode.width % 8 === 0) {
      return packAsciiFixedWidth(cap.text, leafNode.width, schemaName, fieldName);
    }
    cannotFillError(schemaName, fieldName);
  }

  function packLeafNumeric(tree, leafNode, label, schemaName) {
    const cap = tree && tree.captures && tree.captures[label];
    if (cap && cap.kind === 'token') {
      return packTokenToLeafBits(cap, leafNode, schemaName || leafNode.name, label);
    }
    const num = numericFromTree(tree, label);
    validateUnsigned(num, leafNode.width, label);
    return intToBits(num, leafNode.width);
  }

  function packBvaTextFromCapture(text, schema, fieldName, parentSchemaName, registry, packOpts) {
    const SS = ss();
    const SB = sb();
    schema = canonicalSchema(schema, registry);
    if (packOpts && packOpts.replTruncSymbol5 && fieldName === 'name') {
      text = replTruncSymbolText(text);
    }
    validateAsciiText(text, fieldName);
    const bvaNode = findBvaBytesField(schema);
    if (!bvaNode) {
      cannotFillError(parentSchemaName || schema.name, fieldName);
    }
    const maxCount = bvaNode.maxCount;
    if (maxCount != null && text.length > maxCount) {
      throw new Error(`Field '${fieldName}' overflow: text length ${text.length} exceeds max ${maxCount}`);
    }
    const elemSchema = canonicalSchema(bvaNode.schema, registry);
    let bytesPayload = '';
    for (let i = 0; i < text.length; i++) {
      const byteBits = SS.buildSchemaLiteralBits(elemSchema, {
        value: intToBits(text.charCodeAt(i), 8),
      }).bits;
      bytesPayload += SB.packBoundPayload(byteBits);
    }
    return buildSchemaLiteralBitsChecked(schema, { [bvaNode.name]: bytesPayload });
  }

  function packCaptureIntoSchema(cap, subSchema, fieldName, parentSchemaName, registry, packOpts) {
    subSchema = canonicalSchema(subSchema, registry);
    const reportSchema = parentSchemaName || subSchema.name;

    const bvaNode = findBvaBytesField(subSchema);
    if (bvaNode) {
      if (isIntCapture(cap)) {
        cannotFillError(reportSchema, fieldName);
      }
      return packBvaTextFromCapture(
        tokenTextFromCapture(cap, fieldName),
        subSchema,
        fieldName,
        reportSchema,
        registry,
        packOpts
      );
    }

    if (subSchema.hasPresenceMask) {
      cannotFillError(reportSchema, fieldName);
    }

    const leaf = getSingleLeaf(subSchema);
    if (leaf) {
      const bits = packTokenToLeafBits(cap, leaf, subSchema.name, leaf.name);
      return buildSchemaLiteralBitsChecked(subSchema, { [leaf.name]: bits });
    }

    cannotFillError(reportSchema, fieldName);
  }

  function resolveCallFieldSource(tree, fieldName) {
    const child = tree.children && tree.children[fieldName];
    if (child != null) return child;
    if (tree.children) {
      if (fieldName === 'left' && tree.children.name != null) return tree.children.name;
      if (fieldName === 'right' && tree.children.arg != null) return tree.children.arg;
    }
    const cap = tree.captures && tree.captures[fieldName];
    if (cap == null) return null;
    if (cap.kind === 'token') return cap;
    return cap;
  }

  function packCallPayload(tree, schema, registry, packOpts) {
    schema = canonicalSchema(schema, registry);
    const fieldValues = {};
    const callName = tree && tree.call ? tree.call : '';

    if (callName === 'CallNumber') {
      const cap = tree.captures && tree.captures.text;
      const text = cap && cap.kind === 'token' ? cap.text : null;
      if (text != null) {
        const num = parseF64LiteralText(text, 'value');
        fieldValues.value = encodeF64Leaf(num, 'value');
        return buildSchemaLiteralBitsChecked(schema, fieldValues);
      }
    }

    for (const node of schema.structure) {
      if (node.kind === 'leaf') {
        const src = resolveCallFieldSource(tree, node.name);
        if (src != null && src.kind === 'token') {
          if (node.width === 64 && callName === 'CallNumber') {
            const num = parseF64LiteralText(src.text, node.name);
            fieldValues[node.name] = encodeF64Leaf(num, node.name);
          } else {
            fieldValues[node.name] = packTokenToLeafBits(src, node, schema.name, node.name);
          }
        } else {
          fieldValues[node.name] = packLeafNumeric(tree, node, node.name, schema.name);
        }
      } else if (node.kind === 'bound') {
        let packed = null;
        const src = resolveCallFieldSource(tree, node.name);
        const subSchema = canonicalSchema(node.schema, registry);
        if (src != null && src.kind === 'call') {
          packed = packTree(src, subSchema, registry, packOpts);
        } else if (src != null && src.kind === 'repeat') {
          packed = packTree(src, subSchema, registry, packOpts);
        } else if (src != null && src.kind === 'token') {
          packed = packCaptureIntoSchema(src, subSchema, node.name, schema.name, registry, packOpts);
        }
        if (packed == null) {
          throw new Error(`Missing field '${node.name}' for call '${tree.call}' in schema '${schema.name}'`);
        }
        fieldValues[node.name] = packed;
      } else if (node.kind === 'bound_var_array') {
        const src = resolveCallFieldSource(tree, node.name);
        if (src != null && src.kind === 'repeat') {
          const elemSchema = canonicalSchema(node.schema, registry);
          const SB = sb();
          let payload = '';
          for (const item of src.items) {
            payload += SB.packBoundPayload(packTree(item, elemSchema, registry, packOpts));
          }
          fieldValues[node.name] = payload;
        } else {
          throw new Error(`Missing field '${node.name}' for call '${tree.call}' in schema '${schema.name}'`);
        }
      } else if (node.kind === 'nested') {
        throw new Error(`Nested field '${node.name}' without bound is not supported in ast-builder for '${schema.name}'`);
      }
    }

    return buildSchemaLiteralBitsChecked(schema, fieldValues);
  }

  function packTree(tree, schema, registry, packOpts) {
    const SB = sb();
    schema = canonicalSchema(schema, registry);

    if (tree == null) {
      throw new Error(`Cannot pack null tree into schema '${schema.name}'`);
    }

    if (tree.kind === 'repeat') {
      const bvaNode = findBoundVarArrayNode(schema);
      if (!bvaNode) {
        throw new Error(`Repeat tree cannot map to schema '${schema.name}' (no bound variable array field)`);
      }
      const minCount = bvaNode.minCount || 0;
      if (tree.items.length < minCount) {
        throw new Error(`Schema '${schema.name}': expected at least ${minCount} elements, got ${tree.items.length}`);
      }
      if (bvaNode.maxCount != null && tree.items.length > bvaNode.maxCount) {
        throw new Error(`Schema '${schema.name}': at most ${bvaNode.maxCount} elements, got ${tree.items.length}`);
      }
      let payload = '';
      const elemSchema = canonicalSchema(bvaNode.schema, registry);
      for (const item of tree.items) {
        payload += SB.packBoundPayload(packTree(item, elemSchema, registry, packOpts));
      }
      return buildSchemaLiteralBitsChecked(schema, { [bvaNode.name]: payload });
    }

    if (tree.kind === 'call') {
      const callName = tree.call;

      if (schema.hasPresenceMask) {
        const optNode = schema.structure.find((n) => n.kind === 'optional_field' && n.name === callName);
        if (!optNode) {
          throw new Error(`Schema '${schema.name}' has no optional field for call '${callName}'`);
        }
        const innerBits = packCallPayload(tree, optNode.schema, registry, packOpts);
        const fieldValues = {};
        fieldValues[callName] = innerBits;
        return buildSchemaLiteralBitsChecked(schema, fieldValues);
      }

      if (schema.name === callName || schema.structure.length) {
        return packCallPayload(tree, schema, registry, packOpts);
      }
      throw new Error(`Cannot map call '${callName}' to schema '${schema.name}'`);
    }

    if (tree.kind === 'token') {
      const leaf = getSingleLeaf(schema);
      if (!leaf) {
        throw new Error(`Bare token cannot map to schema '${schema.name}'`);
      }
      const bits = packTokenToLeafBits(tree, leaf, schema.name, leaf.name);
      return buildSchemaLiteralBitsChecked(schema, { [leaf.name]: bits });
    }

    throw new Error(`Cannot pack tree kind '${tree.kind}' into schema '${schema.name}'`);
  }

  function buildAstWire(tree, schemaName, registry, options) {
    if (!registry) throw new Error('Schema registry required for buildAstWire');
    const name = String(schemaName || '').replace(/\+$/, '');
    const schema = validateAstSchemaHasPlus(name, registry);
    const packOpts = options && options.replTruncSymbol5 ? { replTruncSymbol5: true } : null;
    const bits = packTree(tree, schema, registry, packOpts);
    return { ok: 1, bits, schemaName: schema.name, bitWidth: bits.length };
  }

  function validateAstSchemaHasPlus(schemaName, registry) {
    const name = String(schemaName || '').replace(/\+$/, '');
    if (!name) throw new Error('AST schema name required');
    const schema = resolveSchema(registry, name);
    if (!schema.hasPresenceMask) {
      throw new Error(`AST schema '<${name}>+' required (declare schema with '+')`);
    }
    return schema;
  }

  function validateAstFieldValues(schemaName, fieldValues, registry) {
    const schema = validateAstSchemaHasPlus(schemaName, registry);
    assertMaxOneBranch(fieldValues, schema);
    return buildSchemaLiteralBitsChecked(schema, fieldValues);
  }

  function buildAstFromParse(grammar, src, schemaName, registry, options) {
    const parseFn = parseGrammarFn();
    if (!parseFn) throw new Error('parser-engine.js is not loaded');
    const rootName = String(schemaName || '').replace(/\+$/, '');
    validateAstSchemaHasPlus(rootName, registry);
    const startRule = options && options.startRule;
    const parsed = parseFn(grammar, src, startRule ? { startRule } : undefined);
    if (!parsed.ok && !parsed.tree) {
      return { ok: 0, error: parsed.error };
    }
    if (!parsed.tree) {
      return { ok: 0, error: parsed.error || { kind: 'syntax', message: 'parse failed' } };
    }
    try {
      const built = buildAstWire(parsed.tree, rootName, registry);
      const out = {
        ok: parsed.ok ? 1 : 0,
        bits: built.bits,
        bitWidth: built.bitWidth,
        tree: parsed.tree,
      };
      if (parsed.errors && parsed.errors.length) out.errors = parsed.errors;
      if (!parsed.ok && parsed.error) out.error = parsed.error;
      return out;
    } catch (err) {
      return { ok: 0, error: { kind: 'pack', message: String(err.message || err) } };
    }
  }

  const api = {
    buildAstWire,
    buildAstFromParse,
    validateAstSchemaHasPlus,
    validateAstFieldValues,
    packTree,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.buildAstWire = buildAstWire;
  global.buildAstFromParse = buildAstFromParse;
  global.validateAstSchemaHasPlus = validateAstSchemaHasPlus;
  global.validateAstFieldValues = validateAstFieldValues;
  global.packAstTree = packTree;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global);
