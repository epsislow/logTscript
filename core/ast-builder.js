/**
 * F2c — parse tree IR → typed AST wire (semantic schema pack).
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
      throw new Error(`Field '${label}': symbol text must not be empty`);
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

  function numericFromTree(tree, label) {
    let text = null;
    if (tree && tree.kind === 'token') text = tree.text;
    else if (tree && tree.children && tree.children.value != null) {
      text = typeof tree.children.value === 'string' ? tree.children.value : (tree.children.value.text || null);
    } else if (tree && tree.captures && tree.captures.value) {
      const cap = tree.captures.value;
      text = cap.kind === 'token' ? cap.text : null;
    }
    if (text == null || text === '') {
      throw new Error(`Field '${label}': missing numeric token text`);
    }
    const num = parseInt(text, 10);
    if (!Number.isFinite(num)) {
      throw new Error(`Field '${label}': invalid numeric text '${text}'`);
    }
    return num;
  }

  function tokenTextFromCapture(cap, label) {
    if (!cap || cap.kind !== 'token') {
      throw new Error(`Field '${label}': expected token capture`);
    }
    return cap.text;
  }

  function packLeafNumeric(tree, leafNode, label) {
    const num = numericFromTree(tree, label);
    validateUnsigned(num, leafNode.width, label);
    return intToBits(num, leafNode.width);
  }

  function packSymbolFromText(text, symbolSchema, registry) {
    const SS = ss();
    const SB = sb();
    symbolSchema = canonicalSchema(symbolSchema, registry);
    validateAsciiText(text, 'symbol');
    const bvaNode = symbolSchema.structure.find(
      (n) => n.kind === 'bound_var_array' || (n.kind === 'optional_field' && n.isBoundVarArray)
    );
    if (!bvaNode) {
      throw new Error(`Schema '${symbolSchema.name}': expected bound byte array field for symbol text`);
    }
    const elemSchema = bvaNode.schema;
    const maxCount = bvaNode.maxCount;
    if (maxCount != null && text.length > maxCount) {
      throw new Error(`Field 'symbol' overflow: text length ${text.length} exceeds max ${maxCount}`);
    }
    let bytesPayload = '';
    for (let i = 0; i < text.length; i++) {
      const byteBits = SS.buildSchemaLiteralBits(elemSchema, {
        value: intToBits(text.charCodeAt(i), 8),
      }).bits;
      bytesPayload += SB.packBoundPayload(byteBits);
    }
    return buildSchemaLiteralBitsChecked(symbolSchema, { [bvaNode.name]: bytesPayload });
  }

  function packCallPayload(tree, schema, registry) {
    schema = canonicalSchema(schema, registry);
    const fieldValues = {};

    for (const node of schema.structure) {
      if (node.kind === 'leaf') {
        fieldValues[node.name] = packLeafNumeric(tree, node, node.name);
      } else if (node.kind === 'bound') {
        let packed = null;
        const child = tree.children && tree.children[node.name];
        const cap = tree.captures && tree.captures[node.name];
        const subSchema = canonicalSchema(node.schema, registry);
        if (child != null) {
          packed = packTree(child, subSchema, registry);
        } else if (cap != null) {
          if (subSchema.name === 'symbol') {
            packed = packSymbolFromText(tokenTextFromCapture(cap, node.name), subSchema, registry);
          } else {
            packed = packTree(cap, subSchema, registry);
          }
        }
        if (packed == null) {
          throw new Error(`Missing field '${node.name}' for call '${tree.call}' in schema '${schema.name}'`);
        }
        fieldValues[node.name] = packed;
      } else if (node.kind === 'bound_var_array') {
        throw new Error(`Unexpected bound_var_array '${node.name}' inside call schema '${schema.name}'`);
      } else if (node.kind === 'nested') {
        throw new Error(`Nested field '${node.name}' without bound is not supported in ast-builder for '${schema.name}'`);
      }
    }

    return buildSchemaLiteralBitsChecked(schema, fieldValues);
  }

  function packTree(tree, schema, registry) {
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
        payload += SB.packBoundPayload(packTree(item, elemSchema, registry));
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
        const innerBits = packCallPayload(tree, optNode.schema, registry);
        const fieldValues = {};
        fieldValues[callName] = innerBits;
        return buildSchemaLiteralBitsChecked(schema, fieldValues);
      }

      if (schema.name === callName || schema.structure.length) {
        return packCallPayload(tree, schema, registry);
      }
      throw new Error(`Cannot map call '${callName}' to schema '${schema.name}'`);
    }

    if (tree.kind === 'token') {
      const leaf = schema.structure.find((n) => n.kind === 'leaf');
      if (!leaf || schema.structure.length !== 1) {
        throw new Error(`Bare token cannot map to schema '${schema.name}'`);
      }
      return buildSchemaLiteralBitsChecked(schema, {
        [leaf.name]: packLeafNumeric(tree, leaf, leaf.name),
      });
    }

    throw new Error(`Cannot pack tree kind '${tree.kind}' into schema '${schema.name}'`);
  }

  function buildAstWire(tree, schemaName, registry) {
    if (!registry) throw new Error('Schema registry required for buildAstWire');
    const name = String(schemaName || '').replace(/\+$/, '');
    const schema = validateAstSchemaHasPlus(name, registry);
    const bits = packTree(tree, schema, registry);
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
    if (!parsed.ok) {
      return { ok: 0, error: parsed.error };
    }
    try {
      const built = buildAstWire(parsed.tree, rootName, registry);
      return { ok: 1, bits: built.bits, bitWidth: built.bitWidth, tree: parsed.tree };
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
