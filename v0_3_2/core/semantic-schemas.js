/**
 * Semantic schemas — named bit fields on wires (independent from numeric formats).
 * Supports flat fields, merge (<schema>), and nested (field:<schema>) composition.
 */
(function (global) {
  'use strict';

  const RESERVED_SCHEMA_NAMES = new Set(['none']);

  function assertSchemaNameAllowed(name) {
    if (RESERVED_SCHEMA_NAMES.has(name)) {
      throw new Error(`Reserved schema name '${name}' — choose another name for a user-defined schema`);
    }
  }

  function pathKeyFromSegments(segments) {
    return segments.join('.');
  }

  function normalizeRawFieldSpec(spec) {
    if (spec.kind === 'merge') return { kind: 'merge', ref: spec.ref };
    if (spec.kind === 'nested') return { kind: 'nested', name: spec.name, ref: spec.ref };
    if (spec.ref && spec.name && spec.kind !== 'leaf') {
      return { kind: 'nested', name: spec.name, ref: spec.ref };
    }
    return { kind: 'leaf', name: spec.name, width: spec.width };
  }

  function ensureSchemaShape(schema) {
    if (!schema) return schema;
    if (!schema.structure && schema.fields) {
      schema.structure = schema.fields.map((f) => ({
        kind: 'leaf',
        name: f.name,
        width: f.width,
        bitStart: f.bitStart,
        bitEnd: f.bitEnd,
      }));
      const leafPaths = new Map();
      for (const f of schema.fields) {
        leafPaths.set(f.name, {
          path: [f.name],
          name: f.name,
          width: f.width,
          bitStart: f.bitStart,
          bitEnd: f.bitEnd,
        });
      }
      schema.leafPaths = leafPaths;
    }
    return schema;
  }

  function syncFieldsFromLeafPaths(schema) {
    const leaves = [];
    if (schema.leafPaths) {
      for (const info of schema.leafPaths.values()) {
        leaves.push({
          name: info.name,
          width: info.width,
          bitStart: info.bitStart,
          bitEnd: info.bitEnd,
          path: info.path.slice(),
          fullPath: pathKeyFromSegments(info.path),
        });
      }
      leaves.sort((a, b) => a.bitStart - b.bitStart);
    }
    schema.fields = leaves;
    return schema;
  }

  function getResolvedSchema(refName, ctx) {
    if (ctx.registry.has(refName)) {
      return ensureSchemaShape(ctx.registry.get(refName));
    }
    if (!ctx.pending || !ctx.pending.has(refName)) {
      throw new Error(`Unknown schema '${refName}'`);
    }
    if (ctx.visiting.has(refName)) {
      const chain = [...ctx.visiting, refName];
      throw new Error(`Circular schema reference: ${chain.join(' → ')}`);
    }
    ctx.visiting.add(refName);
    const rawFields = ctx.pending.get(refName);
    const def = buildResolvedSchema(refName, rawFields, ctx);
    ctx.visiting.delete(refName);
    if (!ctx.registry.has(refName)) {
      ctx.registry.set(refName, def);
    }
    return def;
  }

  function appendStructureNodes(targetStructure, targetLeafPaths, subSchema, bitOffset, pathPrefix, duplicateContext) {
    ensureSchemaShape(subSchema);
    for (const node of subSchema.structure) {
      if (node.kind === 'leaf') {
        const path = pathPrefix.length ? [...pathPrefix, node.name] : [node.name];
        const key = pathKeyFromSegments(path);
        if (targetLeafPaths.has(key)) {
          const msg = duplicateContext && duplicateContext.mergeRef
            ? `Duplicate schema field '${node.name}' in schema '${duplicateContext.schemaName}' (from merge of '${duplicateContext.mergeRef}')`
            : `Duplicate schema field '${node.name}' in schema '${duplicateContext.schemaName}'`;
          throw new Error(msg);
        }
        const bitStart = bitOffset + node.bitStart;
        const bitEnd = bitStart + node.width - 1;
        targetStructure.push({
          kind: 'leaf',
          name: node.name,
          width: node.width,
          bitStart,
          bitEnd,
        });
        targetLeafPaths.set(key, {
          path,
          name: node.name,
          width: node.width,
          bitStart,
          bitEnd,
        });
      } else if (node.kind === 'nested') {
        const path = pathPrefix.length ? [...pathPrefix, node.name] : [node.name];
        const bitStart = bitOffset + node.bitStart;
        const bitEnd = bitStart + node.width - 1;
        targetStructure.push({
          kind: 'nested',
          name: node.name,
          width: node.width,
          bitStart,
          bitEnd,
          schema: node.schema,
        });
        for (const info of node.schema.leafPaths.values()) {
          const subPath = [...path, ...info.path];
          const subKey = pathKeyFromSegments(subPath);
          if (targetLeafPaths.has(subKey)) {
            throw new Error(`Duplicate schema field '${info.name}' in schema '${duplicateContext.schemaName}'`);
          }
          targetLeafPaths.set(subKey, {
            path: subPath,
            name: info.name,
            width: info.width,
            bitStart: bitStart + info.bitStart,
            bitEnd: bitStart + info.bitEnd,
          });
        }
      }
    }
  }

  function buildResolvedSchema(name, rawFields, ctx) {
    assertSchemaNameAllowed(name);
    const structure = [];
    const leafPaths = new Map();
    let bitStart = 0;

    for (const raw of rawFields) {
      const spec = normalizeRawFieldSpec(raw);
      if (spec.kind === 'merge') {
        const sub = getResolvedSchema(spec.ref, ctx);
        appendStructureNodes(structure, leafPaths, sub, bitStart, [], {
          schemaName: name,
          mergeRef: spec.ref,
        });
        bitStart += sub.totalWidth;
        continue;
      }
      if (spec.kind === 'nested') {
        const sub = getResolvedSchema(spec.ref, ctx);
        const width = sub.totalWidth;
        if (!spec.name) {
          throw new Error(`Nested schema field requires a name in schema '${name}'`);
        }
        const containerPath = [spec.name];
        const containerKey = pathKeyFromSegments(containerPath);
        if (leafPaths.has(containerKey)) {
          throw new Error(`Duplicate schema field '${spec.name}' in schema '${name}'`);
        }
        const bitEnd = bitStart + width - 1;
        structure.push({
          kind: 'nested',
          name: spec.name,
          width,
          bitStart,
          bitEnd,
          schema: sub,
        });
        for (const info of sub.leafPaths.values()) {
          const subPath = [spec.name, ...info.path];
          const subKey = pathKeyFromSegments(subPath);
          if (leafPaths.has(subKey)) {
            throw new Error(`Duplicate schema field '${info.name}' in schema '${name}'`);
          }
          leafPaths.set(subKey, {
            path: subPath,
            name: info.name,
            width: info.width,
            bitStart: bitStart + info.bitStart,
            bitEnd: bitStart + info.bitEnd,
          });
        }
        bitStart += width;
        continue;
      }
      const width = spec.width;
      if (!Number.isFinite(width) || width < 1) {
        throw new Error(`Invalid field width for '${spec.name}' in schema '${name}'`);
      }
      if (leafPaths.has(spec.name)) {
        throw new Error(`Duplicate schema field '${spec.name}' in schema '${name}'`);
      }
      const bitEnd = bitStart + width - 1;
      structure.push({
        kind: 'leaf',
        name: spec.name,
        width,
        bitStart,
        bitEnd,
      });
      leafPaths.set(spec.name, {
        path: [spec.name],
        name: spec.name,
        width,
        bitStart,
        bitEnd,
      });
      bitStart += width;
    }

    const schema = {
      name,
      totalWidth: bitStart,
      structure,
      leafPaths,
    };
    return syncFieldsFromLeafPaths(schema);
  }

  function resolveSchemaComposition(name, rawFields, registry, pending, visiting) {
    const ctx = {
      registry: registry || new Map(),
      pending: pending || new Map(),
      visiting: visiting || new Set(),
    };
    if (!ctx.pending.has(name)) {
      ctx.pending.set(name, rawFields);
    }
    return buildResolvedSchema(name, rawFields, ctx);
  }

  function collectSchemaDeclsFromStmts(stmts) {
    const decls = [];
    if (!stmts) return decls;
    for (const s of stmts) {
      if (s && s.schemaDecl) decls.push(s.schemaDecl);
    }
    return decls;
  }

  function resolveSchemaDecls(stmtsOrDecls, registry, options) {
    if (!registry) throw new Error('schema registry missing');
    const decls = Array.isArray(stmtsOrDecls) && stmtsOrDecls[0] && stmtsOrDecls[0].schemaDecl
      ? collectSchemaDeclsFromStmts(stmtsOrDecls)
      : stmtsOrDecls;
    const pending = new Map();
    for (const decl of decls) {
      if (!decl || !decl.name) continue;
      if (pending.has(decl.name)) {
        throw new Error(`Duplicate schema '${decl.name}'`);
      }
      pending.set(decl.name, decl.fields || decl.rawFields || []);
    }
    const ctx = {
      registry,
      pending,
      visiting: new Set(),
    };
    const resolved = [];
    for (const [name, rawFields] of pending) {
      if (registry.has(name) && !(options && options.overwrite)) {
        continue;
      }
      const def = buildResolvedSchema(name, rawFields, ctx);
      if (registry.has(name)) {
        if (options && options.overwrite) {
          registry.set(name, def);
        } else {
          throw new Error(`Duplicate schema '${name}'`);
        }
      } else {
        registry.set(name, def);
      }
      resolved.push(def);
    }
    return resolved;
  }

  function buildSchemaDef(name, fieldSpecs) {
    const rawFields = (fieldSpecs || []).map((spec) => {
      if (spec.kind) return spec;
      return { kind: 'leaf', name: spec.name, width: spec.width };
    });
    const registry = new Map();
    return resolveSchemaComposition(name, rawFields, registry, new Map([[name, rawFields]]));
  }

  function validateSchemaWidth(schema, wireWidth) {
    if (!schema) return;
    if (schema.totalWidth !== wireWidth) {
      throw new Error(
        `width mismatch between ${schema.name} (${schema.totalWidth}bit) and definition (${wireWidth}bit)`
      );
    }
  }

  function validateSchemaWidthForShow(schema, wireWidth) {
    if (!schema) return;
    if (schema.totalWidth !== wireWidth) {
      throw new Error(
        `${schema.name} (${schema.totalWidth}bit) width incompatible with wire (${wireWidth}bit)`
      );
    }
  }

  function getField(schema, fieldName) {
    if (!schema) return null;
    ensureSchemaShape(schema);
    const node = schema.structure.find((n) => n.kind === 'leaf' && n.name === fieldName);
    if (!node) return null;
    return {
      name: node.name,
      width: node.width,
      bitStart: node.bitStart,
      bitEnd: node.bitEnd,
    };
  }

  function findNestedContainer(schema, segment, schemaName) {
    ensureSchemaShape(schema);
    const node = schema.structure.find((n) => n.kind === 'nested' && n.name === segment);
    if (!node) return null;
    return node;
  }

  function findLeafPathInfo(schema, path) {
    ensureSchemaShape(schema);
    if (!path || !path.length) return null;
    const key = pathKeyFromSegments(path);
    return schema.leafPaths.get(key) || null;
  }

  function suggestWirePath(wireVar, path) {
    return wireVar ? `${wireVar}:${path.join(':')}` : path.join(':');
  }

  function resolveSchemaView(schema, path, opts) {
    ensureSchemaShape(schema);
    if (!path || !path.length) {
      throw new Error(`Empty schema field path in schema '${schema.name}'`);
    }
    const wireVar = opts && opts.wireVar;
    const rootName = schema.name;

    let currentSchema = schema;
    let absBase = 0;
    for (let i = 0; i < path.length; i++) {
      const seg = path[i];
      const nestedNode = currentSchema.structure.find((n) => n.kind === 'nested' && n.name === seg);
      if (nestedNode) {
        if (i === path.length - 1) {
          return {
            kind: 'nested',
            name: seg,
            width: nestedNode.width,
            bitStart: nestedNode.bitStart,
            bitEnd: nestedNode.bitEnd,
            schema: nestedNode.schema,
            path: path.slice(),
          };
        }
        currentSchema = nestedNode.schema;
        absBase = nestedNode.bitStart;
        continue;
      }
      const remaining = path.slice(i);
      const key = pathKeyFromSegments(remaining);
      const leaf = currentSchema.leafPaths.get(key);
      if (leaf) {
        return {
          kind: 'leaf',
          name: leaf.name,
          width: leaf.width,
          bitStart: absBase + leaf.bitStart,
          bitEnd: absBase + leaf.bitEnd,
          path: path.slice(),
        };
      }
      if (remaining.length === 1) {
        const segLeaf = currentSchema.structure.find((n) => n.kind === 'leaf' && n.name === seg);
        if (segLeaf) {
          return {
            kind: 'leaf',
            name: segLeaf.name,
            width: segLeaf.width,
            bitStart: absBase + segLeaf.bitStart,
            bitEnd: absBase + segLeaf.bitEnd,
            path: path.slice(),
          };
        }
      }
      break;
    }

    const seg = path[0];
    const schemaName = rootName;
    for (const [, info] of schema.leafPaths.entries()) {
      if (info.name === seg && info.path.length > 1) {
        const parent = info.path[info.path.length - 2];
        throw new Error(
          `Field '${seg}' is nested under '${parent}' in schema '${schemaName}'; use ${suggestWirePath(wireVar, info.path)}`
        );
      }
    }
    const key = pathKeyFromSegments(path);
    throw new Error(`Unknown schema field '${path[path.length - 1]}' in path '${key}' (schema '${schemaName}')`);
  }

  function resolveFieldPath(schema, path, opts) {
    const view = resolveSchemaView(schema, path, opts);
    if (view.kind === 'nested') {
      const wireVar = opts && opts.wireVar;
      const schemaName = schema.name;
      throw new Error(
        `Field '${view.name}' is a nested schema in '${schemaName}'; use ${suggestWirePath(wireVar, [...view.path, '<field>'])}`
      );
    }
    return view;
  }

  function extractFieldPath(bits, schema, path) {
    const field = resolveFieldPath(schema, path);
    const s = bits == null ? '' : String(bits);
    if (s.length < schema.totalWidth) {
      throw new Error(`Wire value shorter than schema '${schema.name}' (${s.length} < ${schema.totalWidth})`);
    }
    const slice = s.substring(field.bitStart, field.bitStart + field.width);
    return slice.padEnd(field.width, '0');
  }

  function packFieldPath(bits, schema, path, fieldValue) {
    const field = resolveFieldPath(schema, path);
    let fv = fieldValue == null ? '' : String(fieldValue);
    if (fv.length > field.width) {
      fv = fv.substring(fv.length - field.width);
    } else if (fv.length < field.width) {
      fv = fv.padStart(field.width, '0');
    }
    validateFieldBits(field, fv);
    const w = Math.max(bits == null ? 0 : String(bits).length, schema.totalWidth);
    let base = bits == null ? '' : String(bits);
    if (base.length < w) base = base.padStart(w, '0');
    else if (base.length > w) base = base.substring(base.length - w);
    return base.substring(0, field.bitStart) + fv + base.substring(field.bitStart + field.width);
  }

  function extractField(bits, schema, fieldName) {
    return extractFieldPath(bits, schema, [fieldName]);
  }

  function packField(bits, schema, fieldName, fieldValue) {
    return packFieldPath(bits, schema, [fieldName], fieldValue);
  }

  function validateFieldBits(field, bitStr) {
    const s = bitStr == null ? '' : String(bitStr);
    if (s.length !== field.width) {
      throw new Error(`Field '${field.name}' expects ${field.width} bits, got ${s.length}`);
    }
    if (/^[01]+$/.test(s)) {
      const max = (1 << field.width) - 1;
      const val = parseInt(s, 2);
      if (val > max) {
        throw new Error(`Field '${field.name}' overflow: value exceeds ${field.width}-bit capacity`);
      }
    }
  }

  function unsignedBitsToInt(bitStr) {
    if (!bitStr || !/^[01]+$/.test(bitStr)) return null;
    return parseInt(bitStr, 2);
  }

  function packBlock(bits, schema, bitStart, width, blockValue) {
    let fv = blockValue == null ? '' : String(blockValue);
    if (fv.length > width) fv = fv.substring(fv.length - width);
    else if (fv.length < width) fv = fv.padStart(width, '0');
    const w = Math.max(bits == null ? 0 : String(bits).length, schema.totalWidth);
    let base = bits == null ? '' : String(bits);
    if (base.length < w) base = base.padStart(w, '0');
    else if (base.length > w) base = base.substring(base.length - w);
    return base.substring(0, bitStart) + fv + base.substring(bitStart + width);
  }

  function buildSchemaLiteralBits(schema, fieldValues) {
    ensureSchemaShape(schema);
    let bits = '0'.repeat(schema.totalWidth);
    for (const [key, val] of Object.entries(fieldValues || {})) {
      const path = key.includes('.') ? key.split('.') : [key];
      if (path.length === 1) {
        const node = schema.structure.find((n) => n.name === key);
        if (node && node.kind === 'nested') {
          bits = packBlock(bits, schema, node.bitStart, node.width, val);
          continue;
        }
      }
      if (schema.leafPaths.has(pathKeyFromSegments(path))) {
        bits = packFieldPath(bits, schema, path, val);
      } else if (path.length === 1) {
        const field = getField(schema, key);
        if (field) bits = packField(bits, schema, key, val);
      }
    }
    return bits;
  }

  function formatSchemaFieldValue(fieldBits, fieldWidth, opts, formatValueFn) {
    const DF = typeof LogTScriptDebugDisplayFormat !== 'undefined' ? LogTScriptDebugDisplayFormat : null;
    const NF = typeof LogTScriptNumericFormats !== 'undefined' ? LogTScriptNumericFormats : null;
    const bits = fieldBits == null ? '' : String(fieldBits);

    if (!opts || !(opts.dec || opts.decSigned || opts.hex || opts.bin || opts.signed || opts.ascii || opts.numericFormat)) {
      if (typeof formatValueFn === 'function') return formatValueFn(bits, fieldWidth);
      return bits;
    }

    if (opts.numericFormat && NF) {
      const formatW = NF.getFormatModeWidth(opts.numericFormat);
      if (formatW != null && formatW === fieldWidth) {
        return NF.formatGroupedShow(bits, opts.numericFormat, { elementWidth: formatW });
      }
      if (formatW != null && fieldWidth < formatW && DF) {
        return DF.formatDebugDisplayValue(bits, fieldWidth, opts, false, fieldWidth);
      }
      if (formatW != null && fieldWidth > formatW && NF) {
        return NF.formatGroupedShow(bits, opts.numericFormat, { elementWidth: formatW });
      }
    }

    if (DF) {
      const formatted = DF.formatDebugDisplayValue(bits, fieldWidth, opts, false, fieldWidth);
      if (formatted !== bits) return formatted;
    }

    if (typeof formatValueFn === 'function') return formatValueFn(bits, fieldWidth);
    return bits;
  }

  function appendSchemaShowTreeLines(lines, bits, schema, opts, formatValueFn, indent) {
    ensureSchemaShape(schema);
    const pad = '  '.repeat(indent);
    for (const node of schema.structure) {
      if (node.kind === 'leaf') {
        const fieldBits = bits.substring(node.bitStart, node.bitStart + node.width);
        const formatted = formatSchemaFieldValue(fieldBits, node.width, opts, formatValueFn);
        const padName = node.name.padEnd(Math.max(10 - indent * 2, 4), ' ');
        lines.push(`${pad}${padName}= ${formatted}`);
      } else if (node.kind === 'nested') {
        lines.push(`${pad}${node.name}`);
        const subBits = bits.substring(node.bitStart, node.bitStart + node.width);
        appendSchemaShowTreeLines(lines, subBits, node.schema, opts, formatValueFn, indent + 1);
      }
    }
  }

  function formatSchemaShowTree(bits, schema, opts, formatValueFn, wireTypeLabel) {
    const lines = [];
    const header = wireTypeLabel
      ? `${wireTypeLabel}`
      : `${schema.totalWidth}wire<${schema.name}>`;
    lines.push(header);
    appendSchemaShowTreeLines(lines, bits, schema, opts, formatValueFn, 1);
    return lines;
  }

  function formatSchemaShowLines(bits, schema, opts, formatValueFn, wireTypeLabel) {
    ensureSchemaShape(schema);
    if (schema.structure.some((n) => n.kind === 'nested')) {
      return formatSchemaShowTree(bits, schema, opts, formatValueFn, wireTypeLabel);
    }
    const lines = [];
    const header = wireTypeLabel
      ? `${wireTypeLabel}`
      : `${schema.totalWidth}wire<${schema.name}>`;
    lines.push(header);
    for (const field of schema.fields) {
      const fieldBits = extractFieldPath(bits, schema, field.path || [field.name]);
      const formatted = formatSchemaFieldValue(fieldBits, field.width, opts, formatValueFn);
      const padName = field.name.padEnd(10, ' ');
      lines.push(`  ${padName}= ${formatted}`);
    }
    return lines;
  }

  function formatSchemaShowInlineFlat(bits, schema, opts, formatValueFn) {
    ensureSchemaShape(schema);
    const parts = [];
    const entries = [...schema.leafPaths.entries()].sort((a, b) => a[1].bitStart - b[1].bitStart);
    for (const [, info] of entries) {
      const fieldBits = bits.substring(info.bitStart, info.bitStart + info.width);
      const formatted = formatSchemaFieldValue(fieldBits, info.width, opts, formatValueFn);
      parts.push(`${info.name}=${formatted}`);
    }
    return parts.join(' ');
  }

  function formatSchemaShowInline(bits, schema, opts, formatValueFn) {
    return formatSchemaShowInlineFlat(bits, schema, opts, formatValueFn);
  }

  function formatLiteralFieldValue(bits, width) {
    if (!bits || !/^[01]+$/.test(bits)) return bits;
    if (width <= 1) return bits;
    const val = parseInt(bits, 2);
    if (width <= 6) return `\\${val}`;
    if (width % 4 === 0) {
      const hexLen = width / 4;
      const hex = val.toString(16).toUpperCase().padStart(hexLen, '0');
      return `^${hex}`;
    }
    return bits;
  }

  function appendCopyLiteralParts(parts, bits, schema) {
    ensureSchemaShape(schema);
    for (const node of schema.structure) {
      if (node.kind === 'leaf') {
        const fieldBits = bits.substring(node.bitStart, node.bitStart + node.width);
        parts.push(`${node.name}=${formatLiteralFieldValue(fieldBits, node.width)}`);
      } else if (node.kind === 'nested') {
        const subBits = bits.substring(node.bitStart, node.bitStart + node.width);
        const subParts = [];
        appendCopyLiteralParts(subParts, subBits, node.schema);
        parts.push(`${node.name}={ ${subParts.join(' ')} }<${node.schema.name}>`);
      }
    }
  }

  function formatSchemaCopyLiteral(bits, schema, opts) {
    ensureSchemaShape(schema);
    const parts = [];
    appendCopyLiteralParts(parts, bits, schema);
    const assignPrefix = opts && opts.wireName ? `${opts.wireName} = ` : '';
    return `${assignPrefix}{ ${parts.join(' ')} }<${schema.name}>`;
  }

  function parseSchemaFieldLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return null;
    const m = /^(\w+)\s*:\s*(\d+)\s*$/.exec(trimmed);
    if (!m) throw new Error(`Invalid schema field line: '${trimmed}'`);
    return { kind: 'leaf', name: m[1], width: parseInt(m[2], 10) };
  }

  function registerSchema(registry, schemaDef) {
    if (!registry) throw new Error('schema registry missing');
    assertSchemaNameAllowed(schemaDef.name);
    if (registry.has(schemaDef.name)) {
      throw new Error(`Duplicate schema '${schemaDef.name}'`);
    }
    ensureSchemaShape(schemaDef);
    registry.set(schemaDef.name, schemaDef);
    return schemaDef;
  }

  function mergeSchemaIntoRegistry(registry, schemaDef) {
    if (!registry) throw new Error('schema registry missing');
    ensureSchemaShape(schemaDef);
    if (registry.has(schemaDef.name)) {
      throw new Error(`Duplicate schema '${schemaDef.name}'`);
    }
    registry.set(schemaDef.name, schemaDef);
    return schemaDef;
  }

  function resolveSchema(registry, name) {
    if (!registry || !name) return null;
    const schema = registry.get(name);
    if (!schema) throw new Error(`Unknown schema '${name}'`);
    return ensureSchemaShape(schema);
  }

  function atomSchemaFieldPath(atom) {
    if (!atom) return null;
    if (atom.schemaFieldPath && atom.schemaFieldPath.length) return atom.schemaFieldPath;
    if (atom.schemaField) return [atom.schemaField];
    return null;
  }

  const api = {
    buildSchemaDef,
    resolveSchemaComposition,
    resolveSchemaDecls,
    collectSchemaDeclsFromStmts,
    validateSchemaWidth,
    validateSchemaWidthForShow,
    getField,
    resolveFieldPath,
    resolveSchemaView,
    findLeafPathInfo,
    extractField,
    extractFieldPath,
    packField,
    packFieldPath,
    validateFieldBits,
    unsignedBitsToInt,
    buildSchemaLiteralBits,
    formatSchemaFieldValue,
    formatSchemaShowLines,
    formatSchemaShowTree,
    formatSchemaShowInline,
    formatSchemaShowInlineFlat,
    formatSchemaCopyLiteral,
    parseSchemaFieldLine,
    registerSchema,
    mergeSchemaIntoRegistry,
    resolveSchema,
    atomSchemaFieldPath,
    ensureSchemaShape,
    assertSchemaNameAllowed,
    RESERVED_SCHEMA_NAMES,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptSemanticSchemas = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global);
