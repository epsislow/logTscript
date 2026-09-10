/* ================= INTERP ENGINE (inline [interp] AST eval) ================= */

const INTERP_MAX_LOOP_ITERATIONS = 10000;

function interpSs() {
  if (typeof LogTScriptSemanticSchemas === 'undefined') {
    throw new Error('semantic-schemas.js is not loaded');
  }
  return LogTScriptSemanticSchemas;
}

function interpSb() {
  if (typeof LogTScriptSchemaBound === 'undefined') {
    throw new Error('schema-bound.js is not loaded');
  }
  return LogTScriptSchemaBound;
}

function interpResolveSchema(registry, name) {
  const n = String(name || '').replace(/\+$/, '');
  return interpSs().resolveSchema(registry, n);
}

function interpError(msg) {
  throw new Error(`interp: ${msg}`);
}

function interpUnsignedBitsToInt(bits) {
  if (!bits || !/^[01]+$/.test(bits)) return 0;
  return parseInt(bits, 2);
}

function interpSignedBitsToInt(bits) {
  if (!bits || !/^[01]+$/.test(bits)) return 0;
  const w = bits.length;
  const u = parseInt(bits, 2);
  if (bits.charAt(0) === '1') return u - (1 << w);
  return u;
}

function interpDecodeNumeric(bits, typeName) {
  const tn = String(typeName);
  if (tn === 'bool' || tn === 'u1') {
    return interpUnsignedBitsToInt(bits) ? 1 : 0;
  }
  const uMatch = /^u(\d+)$/.exec(tn);
  if (uMatch) {
    const w = parseInt(uMatch[1], 10);
    const slice = bits.length > w ? bits.substring(bits.length - w) : bits.padStart(w, '0');
    return interpUnsignedBitsToInt(slice);
  }
  const sMatch = /^s(\d+)$/.exec(tn);
  if (sMatch) {
    const w = parseInt(sMatch[1], 10);
    const slice = bits.length > w ? bits.substring(bits.length - w) : bits.padStart(w, '0');
    return interpSignedBitsToInt(slice);
  }
  if (/^q\d+p\d+$/.test(tn) || tn === 'f32' || tn === 'f64' || tn === 'fp16' || tn === 'bf16') {
    const nf = typeof decodeToFloat === 'function' ? decodeToFloat : null;
    const nfmt = typeof decodeNformatValue === 'function' ? decodeNformatValue : null;
    if (tn === 'f32' || tn === 'f64' || tn === 'fp16' || tn === 'bf16') {
      if (!nf) interpError('numeric-formats.js is not loaded');
      return nf(bits, tn, bits.length);
    }
    if (!nfmt) interpError('numeric-formats.js is not loaded');
    return nfmt(bits, bits.length, tn);
  }
  interpError(`unsupported decode type '/${typeName}'`);
}

function interpDecodeAscii(bits, fieldWidth) {
  let s = '';
  const w = fieldWidth || bits.length;
  const use = bits.length >= w ? bits.substring(bits.length - w) : bits.padStart(w, '0');
  for (let i = 0; i < use.length; i += 8) {
    const byte = use.substring(i, i + 8);
    if (byte.length < 8) break;
    const code = parseInt(byte, 2);
    if (code === 0) break;
    if (code > 127) interpError('non-ASCII byte in /ascii field');
    s += String.fromCharCode(code);
  }
  return s;
}

function interpDecodeBvaAscii(bits, registry, byteSchema) {
  const SB = interpSb();
  let offset = 0;
  let s = '';
  while (offset < bits.length) {
    const sub = SB.readBoundSubstream(bits, offset);
    if (sub.len === 0) break;
    const elem = sub.payloadBits;
    if (elem.length >= 8) {
      const code = parseInt(elem.substring(elem.length - 8), 2);
      if (code === 0) break;
      if (code > 127) interpError('non-ASCII byte in /ascii field');
      s += String.fromCharCode(code);
    }
    offset += sub.totalWidth;
  }
  return s;
}

function interpIsBvaBytesSchema(schema, registry) {
  if (!schema || !schema.structure) return false;
  for (const node of schema.structure) {
    if (node.kind === 'bound_var_array') {
      const elem = node.schema ? interpResolveSchema(registry, node.schema.name || node.schema) : node.schema;
      if (elem && elem.structure && elem.structure.length === 1 && elem.structure[0].kind === 'leaf'
          && elem.structure[0].width === 8) return true;
    }
  }
  return false;
}

function interpBvaElemLeafWidth(fieldNode, registry) {
  if (!fieldNode || fieldNode.kind !== 'bound_var_array') return null;
  const sub = fieldNode.schema
    ? interpResolveSchema(registry, fieldNode.schema.name || fieldNode.schemaRef || fieldNode.schema)
    : null;
  if (!sub || !sub.structure || sub.structure.length !== 1 || sub.structure[0].kind !== 'leaf') return null;
  return sub.structure[0].width || null;
}

function interpTypeElemWidth(param) {
  const tn = param.typeName;
  if (tn === 'ascii') {
    const chars = param.asciiCharsPerElem > 0 ? param.asciiCharsPerElem : 1;
    return chars * 8;
  }
  if (tn === 'bool' || tn === 'u1') return 1;
  const uMatch = /^u(\d+)$/.exec(tn);
  if (uMatch) return parseInt(uMatch[1], 10);
  const sMatch = /^s(\d+)$/.exec(tn);
  if (sMatch) return parseInt(sMatch[1], 10);
  if (tn === 'f32') return 32;
  if (tn === 'f64') return 64;
  if (tn === 'fp16' || tn === 'bf16') return 16;
  const qMatch = /^q(\d+)p(\d+)$/.exec(tn);
  if (qMatch) return parseInt(qMatch[1], 10) + parseInt(qMatch[2], 10);
  interpError(`unsupported vector element type '/${tn}'`);
}

function interpIsNumericTypeName(tn) {
  return /^(u|s)\d+$/.test(tn) || tn === 'bool' || tn === 'u1'
    || tn === 'f32' || tn === 'f64' || tn === 'fp16' || tn === 'bf16' || /^q\d+p\d+$/.test(tn);
}

function interpNormalizeFieldNode(fieldNode) {
  if (!fieldNode) return fieldNode;
  if (fieldNode.kind === 'optional_field') {
    if (fieldNode.isBoundVarArray) return Object.assign({}, fieldNode, { kind: 'bound_var_array' });
    if (fieldNode.isBound) return Object.assign({}, fieldNode, { kind: 'bound' });
  }
  return fieldNode;
}

function interpSchemaFieldKind(fieldNode, registry) {
  fieldNode = interpNormalizeFieldNode(fieldNode);
  if (!fieldNode) return 'unknown';
  if (fieldNode.isBound || fieldNode.kind === 'bound') {
    const sub = fieldNode.schema ? interpResolveSchema(registry, fieldNode.schema.name || fieldNode.schema) : null;
    if (sub && sub.hasPresenceMask && sub.name === 'expr') return 'expr';
    if (sub && interpIsBvaBytesSchema(sub, registry)) return 'ascii-bva';
    return 'bound';
  }
  if (fieldNode.kind === 'var_array') return 'var_array';
  if (fieldNode.kind === 'leaf' || (fieldNode.width && fieldNode.kind !== 'bound_var_array')) return 'leaf';
  if (fieldNode.kind === 'bound_var_array') return 'bva';
  return 'unknown';
}

function interpValidateSchemaType(param, fieldNode, methodName, schemaName, cache) {
  if (!param.typeName) {
    interpError(`method '${methodName}' param '${param.name}' missing /type annotation`);
  }
  const key = `${schemaName}:${methodName}:${param.name}:${param.typeName}:${param.vector ? 1 : 0}:${param.asciiCharsPerElem || 0}:${param.vectorFixedCount || 0}:${param.asciiNullDelim ? 1 : 0}`;
  if (cache && cache.has(key)) return;
  const kind = interpSchemaFieldKind(fieldNode, cache && cache.registry);
  const tn = param.typeName;
  const registry = cache && cache.registry;
  if (param.vector) {
    if (kind === 'expr') {
      interpError(`schema '${schemaName}' field '${param.name}' cannot be vector /${tn} (expr subtree)`);
    }
    if (param.asciiNullDelim && kind === 'bva') {
      interpError(`schema '${schemaName}' field '${param.name}' incompatible with ~/ascii (bound array container)`);
    }
    const elemW = interpTypeElemWidth(param);
    if (kind === 'bva') {
      const leafW = interpBvaElemLeafWidth(fieldNode, registry);
      if (leafW != null && leafW !== elemW && !(tn === 'ascii' && leafW === 8 && elemW === 8)) {
        interpError(`schema '${schemaName}' field '${param.name}' element width ${leafW} incompatible with /${tn}`);
      }
    }
    if (param.vectorFixedCount > 0 && !param.asciiNullDelim && kind === 'leaf') {
      const need = param.vectorFixedCount * elemW;
      const w = fieldNode.width || 0;
      if (w !== need) {
        interpError(`schema '${schemaName}' field '${param.name}' width ${w} incompatible with [${param.vectorFixedCount}]/${tn} (needs ${need} bits)`);
      }
    }
    if (tn === 'ascii' && param.asciiCharsPerElem > 0 && param.asciiCharsPerElem !== 1) {
      /* []M/ascii — valid on any slice container */
    } else if (!interpIsNumericTypeName(tn) && tn !== 'ascii') {
      interpError(`schema '${schemaName}' field '${param.name}' incompatible with vector /${tn}`);
    }
    if (cache) cache.set(key, true);
    return;
  }
  let ok = false;
  if (kind === 'expr') {
    ok = interpIsNumericTypeName(tn);
  } else if (kind === 'ascii-bva' || kind === 'bva') {
    ok = tn === 'ascii';
  } else if (kind === 'leaf' || kind === 'var_array') {
    ok = interpIsNumericTypeName(tn) || tn === 'ascii';
  } else if (kind === 'bound') {
    ok = true;
  }
  if (!ok) {
    interpError(`schema '${schemaName}' field '${param.name}' incompatible with /${tn}`);
  }
  if (cache) cache.set(key, true);
}

function interpCopyVector(value) {
  if (!Array.isArray(value)) interpError('expected vector');
  const out = [];
  for (let i = 0; i < value.length; i++) {
    if (Array.isArray(value[i])) interpError('nested vector not allowed');
    out.push(value[i]);
  }
  return out;
}

function interpResolveVarArrayCounts(schema, bits, options) {
  const ss = interpSs();
  const base = { ...(options && options.varArrayCounts ? options.varArrayCounts : {}) };
  if (!schema.hasVarArray) return ss.effectiveVarArrayCountsForWire(schema, base);
  const declared = options && options.declaredWidth != null ? options.declaredWidth : bits.length;
  try {
    const resolved = ss.resolveFlatVarArrayCounts(schema, declared, bits);
    return ss.effectiveVarArrayCountsForWire(schema, { ...resolved, ...base });
  } catch (e) {
    return ss.effectiveVarArrayCountsForWire(schema, base);
  }
}

function interpWalkFieldOffset(payloadBits, payloadSchema, fieldName, options) {
  const bits = payloadBits == null ? '' : String(payloadBits);
  const SB = interpSb();
  const counts = interpResolveVarArrayCounts(payloadSchema, bits, options || {});
  const ss = interpSs();
  if (payloadSchema.hasPresenceMask && SB) {
    const maskBits = payloadSchema.presenceMaskBits || 0;
    const maskInfo = SB.readPresenceMask(bits, maskBits, 0);
    let offset = maskInfo.payloadStart;
    let optIdx = 0;
    for (const node of payloadSchema.structure || []) {
      if (node.kind === 'optional_field') {
        const present = maskInfo.mask.charAt(optIdx) === '1';
        optIdx++;
        if (!present) {
          if (node.name === fieldName) interpError(`schema field '${fieldName}' not present on wire`);
          continue;
        }
        if (node.name === fieldName) {
          return { node, offset, counts, bits };
        }
        if (node.isBoundVarArray || node.kind === 'bound_var_array') {
          let elemOff = offset;
          let count = 0;
          while (elemOff < bits.length) {
            const sub = SB.readBoundSubstream(bits, elemOff);
            if (sub.len === 0 && count >= (node.minCount || 0)) break;
            elemOff += sub.totalWidth;
            count++;
            if (node.maxCount != null && count >= node.maxCount) break;
          }
          offset = elemOff;
        } else if (node.isBound || node.kind === 'bound') {
          const sub = SB.readBoundSubstream(bits, offset);
          offset += sub.totalWidth;
        } else {
          offset += (node.schema && node.schema.totalWidth) || node.width || 0;
        }
      }
    }
    interpError(`schema '${payloadSchema.name}' has no field '${fieldName}'`);
  }
  if (payloadSchema.hasVarArray || payloadSchema.hasBound) {
    const offsets = ss.computeStructureOffsets(payloadSchema, counts);
    const off = offsets.get(fieldName);
    if (off == null) interpError(`schema '${payloadSchema.name}' has no field '${fieldName}'`);
    const node = interpFindFieldNode(payloadSchema, fieldName);
    return { node, offset: off, counts, bits };
  }
  const node = interpFindFieldNode(payloadSchema, fieldName);
  if (!node) interpError(`schema '${payloadSchema.name}' has no field '${fieldName}'`);
  if (node.kind === 'leaf') {
    return { node, offset: node.bitStart || 0, counts, bits };
  }
  return { node, offset: 0, counts, bits };
}

function interpDecodeAsciiElem(bits, charCount) {
  const chars = charCount > 0 ? charCount : 1;
  const need = chars * 8;
  const slice = bits.length >= need ? bits.substring(0, need) : bits.padEnd(need, '0');
  if (chars === 1) {
    const code = parseInt(slice.substring(slice.length - 8), 2);
    if (code === 0) return '';
    if (code > 127) interpError('non-ASCII byte in /ascii field');
    return String.fromCharCode(code);
  }
  let s = '';
  for (let i = 0; i < need; i += 8) {
    const byte = slice.substring(i, i + 8);
    const code = parseInt(byte, 2);
    if (code > 127) interpError('non-ASCII byte in /ascii field');
    s += String.fromCharCode(code);
  }
  return s;
}

function interpDecodeElementBits(elemBits, param, fieldNode) {
  const tn = param.typeName;
  const w = interpTypeElemWidth(param);
  const slice = elemBits.length > w ? elemBits.substring(elemBits.length - w) : elemBits.padStart(w, '0');
  if (tn === 'ascii') {
    return interpDecodeAsciiElem(slice, param.asciiCharsPerElem > 0 ? param.asciiCharsPerElem : 1);
  }
  if (interpIsNumericTypeName(tn)) {
    const val = interpDecodeNumeric(slice, tn);
    const uMatch = /^u(\d+)$/.exec(tn);
    if (uMatch) {
      const max = (1 << parseInt(uMatch[1], 10)) - 1;
      if (val > max || val < 0) interpError(`overflow decoding /${tn}`);
    }
    return val;
  }
  interpError(`cannot decode vector element with /${tn}`);
}

function interpSliceVectorFromBlob(blob, param) {
  const elemW = interpTypeElemWidth(param);
  const bits = blob == null ? '' : String(blob);
  if (bits.length % elemW !== 0) {
    interpError('corrupt vector field bit length');
  }
  const out = [];
  for (let i = 0; i < bits.length; i += elemW) {
    out.push(interpDecodeElementBits(bits.substring(i, i + elemW), param));
  }
  return out;
}

function interpDecodeFixedCountVector(blob, param) {
  const n = param.vectorFixedCount;
  const elemW = interpTypeElemWidth(param);
  const need = n * elemW;
  const bits = blob == null ? '' : String(blob);
  if (bits.length !== need) {
    interpError('corrupt vector field bit length');
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(interpDecodeElementBits(bits.substring(i * elemW, (i + 1) * elemW), param));
  }
  return out;
}

function interpBitsToAsciiByteString(bits) {
  const b = bits == null ? '' : String(bits);
  if (b.length % 8 !== 0) {
    interpError('corrupt vector field bit length');
  }
  let s = '';
  for (let i = 0; i < b.length; i += 8) {
    const code = parseInt(b.substring(i, i + 8), 2);
    if (code > 127) interpError('non-ASCII byte in /ascii field');
    s += String.fromCharCode(code);
  }
  return s;
}

function interpParseNullDelimAscii(str, fixedCount) {
  const out = [];
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) === 0) {
      out.push(str.substring(start, i));
      start = i + 1;
    }
  }
  if (start < str.length) {
    out.push(str.substring(start));
  }
  if (fixedCount > 0) {
    if (out.length < fixedCount) {
      interpError('corrupt vector field bit length');
    }
    return out.slice(0, fixedCount);
  }
  return out;
}

function interpExtractVectorContainerBits(walk, kind, node, param, SB) {
  if (kind === 'bva') {
    return walk.bits.substring(walk.offset);
  }
  if (kind === 'var_array') {
    if (param.vectorFixedCount > 0 && !param.asciiNullDelim) {
      const elemW = node.elementWidth || interpTypeElemWidth(param);
      const need = param.vectorFixedCount * elemW;
      const seg = walk.bits.substring(walk.offset, walk.offset + need);
      if (seg.length !== need) interpError('corrupt vector field bit length');
      return seg;
    }
    const ss = interpSs();
    const count = walk.counts[node.name];
    if (count == null) interpError(`missing variable array count for '${param.name}'`);
    const elemW = node.elementWidth || interpTypeElemWidth(param);
    const need = count * elemW;
    const seg = walk.bits.substring(walk.offset, walk.offset + need);
    if (seg.length !== need) interpError('corrupt vector field bit length');
    return seg;
  }
  if (kind === 'bound') {
    const sub = SB.readBoundSubstream(walk.bits, walk.offset);
    return sub.payloadBits;
  }
  if (kind === 'leaf') {
    const w = node.width || 0;
    const seg = walk.bits.substring(walk.offset, walk.offset + w);
    if (seg.length !== w) interpError('corrupt vector field bit length');
    return seg;
  }
  interpError(`cannot decode vector param from field shape '${kind}'`);
}

function interpDecodeBvaVector(bits, fieldNode, param, registry) {
  const SB = interpSb();
  let offset = 0;
  const out = [];
  const bBits = bits == null ? '' : String(bits);
  while (offset < bBits.length) {
    const sub = SB.readBoundSubstream(bBits, offset);
    if (sub.len === 0 && out.length >= (fieldNode.minCount || 0)) break;
    if (sub.len === 0) break;
    out.push(interpDecodeElementBits(sub.payloadBits, param, fieldNode));
    offset += sub.totalWidth;
    if (fieldNode.maxCount != null && out.length >= fieldNode.maxCount) break;
  }
  return out;
}

function interpDecodeVectorParam(payloadBits, payloadSchema, param, fieldNode, registry, program, env, options) {
  const walk = interpWalkFieldOffset(payloadBits, payloadSchema, param.name, options);
  const node = interpNormalizeFieldNode(walk.node);
  const kind = interpSchemaFieldKind(node, registry);
  const SB = interpSb();
  if (param.asciiNullDelim) {
    const blob = interpExtractVectorContainerBits(walk, kind, node, param, SB);
    const str = interpBitsToAsciiByteString(blob);
    const fixed = param.vectorFixedCount > 0 ? param.vectorFixedCount : 0;
    return interpCopyVector(interpParseNullDelimAscii(str, fixed));
  }
  if (param.vectorFixedCount > 0) {
    const blob = interpExtractVectorContainerBits(walk, kind, node, param, SB);
    return interpCopyVector(interpDecodeFixedCountVector(blob, param));
  }
  if (kind === 'bva') {
    const seg = walk.bits.substring(walk.offset);
    return interpCopyVector(interpDecodeBvaVector(seg, node, param, registry));
  }
  if (kind === 'var_array') {
    const seg = interpExtractVectorContainerBits(walk, kind, node, param, SB);
    return interpCopyVector(interpSliceVectorFromBlob(seg, param));
  }
  if (kind === 'bound') {
    const sub = SB.readBoundSubstream(walk.bits, walk.offset);
    return interpCopyVector(interpSliceVectorFromBlob(sub.payloadBits, param));
  }
  if (kind === 'leaf') {
    const w = node.width || 0;
    const seg = walk.bits.substring(walk.offset, walk.offset + w);
    if (seg.length !== w) interpError('corrupt vector field bit length');
    return interpCopyVector(interpSliceVectorFromBlob(seg, param));
  }
  interpError(`cannot decode vector param '${param.name}' from field shape '${kind}'`);
}

function interpFindFieldNode(schema, fieldName) {
  if (!schema || !schema.structure) return null;
  for (const node of schema.structure) {
    if (node.name === fieldName) return node;
    if (node.kind === 'optional_field' && node.name === fieldName) return node;
  }
  return null;
}

function interpMethodHasTypedParams(method) {
  return (method.params || []).some((p) => p.typeName);
}

function interpAssertAstMethod(method, methodName) {
  if (!method) interpError(`unknown AST method '${methodName}'`);
  if (!interpMethodHasTypedParams(method)) {
    interpError(`method '${methodName}' missing /type annotations on params`);
  }
}

function interpDecodeParamValue(payloadBits, payloadSchema, param, fieldNode, registry, program, env, options) {
  if (param.vector) {
    return interpDecodeVectorParam(payloadBits, payloadSchema, param, fieldNode, registry, program, env, options);
  }
  const bits = interpExtractFieldBits(payloadBits, payloadSchema, param.name);
  return interpDecodeParamBits(bits, param, fieldNode, registry, program, env, options);
}

function interpDecodeParamBits(bits, param, fieldNode, registry, program, env, options) {
  const tn = param.typeName;
  const kind = interpSchemaFieldKind(fieldNode, registry);
  if (kind === 'expr') {
    const subSchema = fieldNode.schema ? interpResolveSchema(registry, fieldNode.schema.name || fieldNode.schema) : null;
    if (!subSchema) interpError(`missing expr sub-schema for '${param.name}'`);
    return evalInterpWire(bits, subSchema.name, registry, program, env, options);
  }
  if (tn === 'ascii') {
    if (kind === 'ascii-bva' || kind === 'bva') {
      const sub = fieldNode.schema ? interpResolveSchema(registry, fieldNode.schema.name || fieldNode.schema) : null;
      return interpDecodeBvaAscii(bits, registry, sub);
    }
    return interpDecodeAscii(bits, fieldNode.width || bits.length);
  }
  if (/^(u|s)\d+$/.test(tn) || tn === 'bool' || tn === 'u1' || tn === 'f32' || tn === 'f64' || tn === 'fp16' || tn === 'bf16' || /^q\d+p\d+$/.test(tn)) {
    const w = fieldNode.width || bits.length;
    const slice = bits.length > w ? bits.substring(bits.length - w) : bits.padStart(w, '0');
    const val = interpDecodeNumeric(slice, tn);
    const uMatch = /^u(\d+)$/.exec(tn);
    if (uMatch) {
      const max = (1 << parseInt(uMatch[1], 10)) - 1;
      if (val > max || val < 0) interpError(`overflow decoding /${tn}`);
    }
    return val;
  }
  interpError(`cannot decode param '${param.name}' with /${tn}`);
}

function interpExtractFieldBits(payloadBits, payloadSchema, fieldName) {
  const bits = payloadBits == null ? '' : String(payloadBits);
  const ss = interpSs();
  if (!payloadSchema.hasDynamicWidth && !payloadSchema.hasBound) {
    if (typeof ss.extractField !== 'function') {
      interpError('semantic-schemas extractField is not available');
    }
    return ss.extractField(bits, payloadSchema, fieldName);
  }
  const SB = interpSb();
  let offset = 0;
  for (const node of payloadSchema.structure || []) {
    if (node.name !== fieldName) {
      if (node.kind === 'bound' || node.isBound) {
        const sub = SB.readBoundSubstream(bits, offset);
        offset += sub.totalWidth;
      } else if (node.kind === 'leaf') {
        offset += node.width;
      } else if (node.kind === 'bound_var_array') {
        while (offset < bits.length) {
          const sub = SB.readBoundSubstream(bits, offset);
          if (sub.len === 0) break;
          offset += sub.totalWidth;
        }
      } else if (node.kind !== 'optional_field') {
        offset += node.width || 0;
      }
      continue;
    }
    if (node.kind === 'bound' || node.isBound) {
      const sub = SB.readBoundSubstream(bits, offset);
      return sub.payloadBits;
    }
    if (node.kind === 'leaf') {
      const w = node.width || 0;
      return bits.substring(offset, offset + w);
    }
    interpError(`unsupported field shape for '${fieldName}' in schema '${payloadSchema.name}'`);
  }
  interpError(`schema '${payloadSchema.name}' has no field '${fieldName}'`);
}

function interpInvokeAstMethod(methodName, payloadBits, payloadSchema, registry, program, env, options) {
  const method = program.methods[methodName];
  interpAssertAstMethod(method, methodName);
  const cache = options.typeCheckCache || (options.typeCheckCache = new Map());
  cache.registry = registry;
  const argValues = [];
  for (const param of method.params) {
    const fieldNode = interpFindFieldNode(payloadSchema, param.name);
    if (!fieldNode) interpError(`schema '${payloadSchema.name}' has no field '${param.name}'`);
    interpValidateSchemaType(param, fieldNode, methodName, payloadSchema.name, cache);
    argValues.push(interpDecodeParamValue(payloadBits, payloadSchema, param, fieldNode, registry, program, env, options));
  }
  return interpExecuteMethod(method, argValues, program, env, options);
}

function evalInterpWire(wireBits, schemaName, registry, program, env, options) {
  const bits = wireBits == null ? '' : String(wireBits);
  const schema = interpResolveSchema(registry, schemaName);
  if (!schema) interpError(`unknown schema '${schemaName}'`);
  return evalInterpSchemaPayload(bits, schema, registry, program, env, options || {});
}

function interpFindProgramStatementsNode(schema) {
  if (!schema || !schema.structure) return null;
  for (const node of schema.structure) {
    if (node.name === 'statements'
        && (node.kind === 'bound_var_array' || (node.kind === 'optional_field' && node.isBoundVarArray))) {
      return node;
    }
  }
  return null;
}

function evalInterpProgramFromMaskedRoot(bits, schema, stmtsNode, registry, program, env, options) {
  const SB = interpSb();
  const maskBits = schema.presenceMaskBits || 0;
  const maskInfo = SB.readPresenceMask(bits, maskBits, 0);
  if (maskBits > 0 && !maskInfo.mask.includes('1')) {
    interpError('program has no statements');
  }
  return evalInterpProgramStatements(bits.substring(maskInfo.payloadStart), stmtsNode, registry, program, env, options);
}

function evalInterpSchemaPayload(bits, schema, registry, program, env, options) {
  if (program.methods[schema.name]) {
    return interpInvokeAstMethod(schema.name, bits, schema, registry, program, env, options);
  }
  const stmtsNode = interpFindProgramStatementsNode(schema);
  if (stmtsNode && schema.hasPresenceMask) {
    return evalInterpProgramFromMaskedRoot(bits, schema, stmtsNode, registry, program, env, options);
  }
  if (schema.hasPresenceMask) {
    return evalInterpUnionRoot(bits, schema, registry, program, env, options);
  }
  if (schema.structure && schema.structure.length === 1) {
    const node = schema.structure[0];
    if (node.kind === 'leaf') {
      const method = program.methods[schema.name.replace(/^Call/, 'Call')];
      const callName = schema.name.startsWith('Call') ? schema.name : null;
      if (callName && program.methods[callName]) {
        return interpInvokeAstMethod(callName, bits, schema, registry, program, env, options);
      }
      return interpDecodeNumeric(bits.substring(bits.length - node.width), 'u' + node.width);
    }
  }
  if (stmtsNode && stmtsNode.kind === 'bound_var_array') {
    return evalInterpProgramStatements(bits, stmtsNode, registry, program, env, options);
  }
  interpError(`unsupported schema payload shape '${schema.name}'`);
}

function evalInterpUnionRoot(bits, schema, registry, program, env, options) {
  const SB = interpSb();
  const maskBits = schema.presenceMaskBits || 0;
  const maskInfo = SB.readPresenceMask(bits, maskBits, 0);
  let optIdx = 0;
  let offset = maskInfo.payloadStart;
  for (const node of schema.structure) {
    if (node.kind !== 'optional_field') continue;
    const present = maskInfo.mask.charAt(optIdx) === '1';
    optIdx++;
    if (!present) continue;
    let payloadBits;
    let payloadSchema;
    if (node.isBound) {
      const sub = SB.readBoundSubstream(bits, offset);
      payloadBits = sub.payloadBits;
      offset += sub.totalWidth;
      payloadSchema = node.schema || interpResolveSchema(registry, node.schemaRef || node.schema);
    } else {
      payloadSchema = node.schema || interpResolveSchema(registry, node.schemaRef || node.schema);
      const w = node.width || payloadSchema.totalWidth;
      payloadBits = bits.substring(offset, offset + w);
      offset += w;
    }
    const methodName = node.name;
    if (!program.methods[methodName]) {
      interpError(`unknown AST method '${methodName}'`);
    }
    return interpInvokeAstMethod(methodName, payloadBits, payloadSchema, registry, program, env, options);
  }
  interpError('empty union — no active AST branch');
}

function evalInterpProgramStatements(bits, stmtsNode, registry, program, env, options) {
  const SB = interpSb();
  let offset = 0;
  let last = 0;
  let count = 0;
  while (offset < bits.length) {
    const sub = SB.readBoundSubstream(bits, offset);
    if (sub.len === 0 && count >= (stmtsNode.minCount || 1)) break;
    if (sub.len === 0) break;
    const stmtSchema = interpResolveSchema(registry, stmtsNode.schema.name || stmtsNode.schema);
    last = evalInterpUnionRoot(sub.payloadBits, stmtSchema, registry, program, env, options);
    offset += sub.totalWidth;
    count++;
    if (stmtsNode.maxCount != null && count >= stmtsNode.maxCount) break;
  }
  if (count === 0) interpError('program has no statements');
  return last;
}

function interpTruthy(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
  if (typeof v === 'string') return v.length > 0;
  return !!v;
}

function interpCompare(op, left, right) {
  if (op === '==' || op === '!=') {
    const eq = String(left) === String(right);
    return op === '==' ? eq : !eq;
  }
  const ln = Number(left);
  const rn = Number(right);
  switch (op) {
    case '<': return ln < rn;
    case '>': return ln > rn;
    case '<=': return ln <= rn;
    case '>=': return ln >= rn;
    default: interpError(`unknown compare operator '${op}'`);
  }
}

function interpEvalCond(expr, env, callMethodFn, line) {
  if (!expr) return false;
  if (expr.kind === 'binop' && (expr.op === '&&' || expr.op === '||')) {
    if (expr.op === '&&') {
      if (!interpTruthy(interpEvalCond(expr.left, env, callMethodFn, line))) return false;
      return interpTruthy(interpEvalCond(expr.right, env, callMethodFn, line));
    }
    if (interpTruthy(interpEvalCond(expr.left, env, callMethodFn, line))) return true;
    return interpTruthy(interpEvalCond(expr.right, env, callMethodFn, line));
  }
  if (expr.kind === 'unary' && expr.op === '!') {
    return !interpTruthy(interpEvalCond(expr.expr, env, callMethodFn, line));
  }
  if (expr.kind === 'binop' && (expr.op === '==' || expr.op === '!=' || expr.op === '<' || expr.op === '>' || expr.op === '<=' || expr.op === '>=')) {
    const l = interpEvalExpr(expr.left, env, callMethodFn, line);
    const r = interpEvalExpr(expr.right, env, callMethodFn, line);
    return interpCompare(expr.op, l, r);
  }
  return interpTruthy(interpEvalExpr(expr, env, callMethodFn, line));
}

function interpVectorIndex(obj, idx, line) {
  if (!Array.isArray(obj)) interpError(`not a vector${line != null ? ` (line ${line})` : ''}`);
  const i = Number(idx);
  if (!Number.isFinite(i) || i < 0 || i >= obj.length) {
    interpError(`vector index out of range${line != null ? ` (line ${line})` : ''}`);
  }
  return obj[i];
}

function interpEvalExpr(expr, env, callMethodFn, line) {
  if (!expr) return 0;
  switch (expr.kind) {
    case 'number':
      return Number(expr.value);
    case 'string':
      return expr.value;
    case 'array': {
      const out = [];
      for (const el of expr.elements || []) out.push(interpEvalExpr(el, env, callMethodFn, line));
      return out;
    }
    case 'var': {
      if (!Object.prototype.hasOwnProperty.call(env, expr.name)) {
        interpError(`undefined variable '${expr.name}'${line != null ? ` (line ${line})` : ''}`);
      }
      return env[expr.name];
    }
    case 'index': {
      const obj = interpEvalExpr(expr.object, env, callMethodFn, line);
      const idx = interpEvalExpr(expr.index, env, callMethodFn, line);
      if (Array.isArray(obj)) {
        return interpVectorIndex(obj, idx, expr.line != null ? expr.line : line);
      }
      if (obj && typeof obj === 'object') {
        const key = String(idx);
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
          interpError(`undefined variable '${key}'${line != null ? ` (line ${line})` : ''}`);
        }
        return obj[key];
      }
      interpError(`not indexable${line != null ? ` (line ${line})` : ''}`);
    }
    case 'unary': {
      const v = interpEvalExpr(expr.expr, env, callMethodFn, line);
      return expr.op === '-' ? -v : v;
    }
    case 'binop': {
      const l = interpEvalExpr(expr.left, env, callMethodFn, line);
      const r = interpEvalExpr(expr.right, env, callMethodFn, line);
      switch (expr.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': {
          if (r === 0) interpError(`division by zero${line != null ? ` (line ${line})` : ''}`);
          return l / r;
        }
        default: interpError(`unknown operator '${expr.op}'`);
      }
    }
    case 'call':
      if (expr.name === 'vectorLen') {
        const arr = interpEvalExpr(expr.args[0], env, callMethodFn, line);
        if (!Array.isArray(arr)) interpError(`vectorLen expects vector${line != null ? ` (line ${line})` : ''}`);
        return arr.length;
      }
      return callMethodFn(expr.name, expr.args, line);
    default:
      interpError('invalid expression node');
  }
}

function interpExecuteDestructuringAssign(stmt, env, locals, program, callMethodFn, sharedEnv, options) {
  if (stmt.expr.kind !== 'call') {
    interpError(`destructuring assignment requires a helper call${stmt.line != null ? ` (line ${stmt.line})` : ''}`);
  }
  const m = program.methods[stmt.expr.name];
  if (!m) {
    interpError(`unknown method '${stmt.expr.name}'${stmt.line != null ? ` (line ${stmt.line})` : ''}`);
  }
  const vals = (stmt.expr.args || []).map((a) => interpEvalExpr(a, env, callMethodFn, stmt.line));
  const result = interpExecuteMethod(m, vals, program, sharedEnv, options);
  const values = m.returnArity > 1 ? result : [result];
  if (!Array.isArray(values) || values.length !== stmt.names.length) {
    interpError(
      `return arity mismatch: expected ${stmt.names.length}, got ${Array.isArray(values) ? values.length : 1}${stmt.line != null ? ` (line ${stmt.line})` : ''}`,
    );
  }
  for (let i = 0; i < stmt.names.length; i++) {
    env[stmt.names[i]] = values[i];
    locals.add(stmt.names[i]);
  }
}

function interpCompParamFromDecl(decl) {
  return {
    name: decl.channel,
    vector: !!decl.vector,
    typeName: decl.typeName,
    vectorFixedCount: decl.vectorFixedCount || 0,
    asciiCharsPerElem: decl.asciiCharsPerElem || 0,
    asciiNullDelim: !!decl.asciiNullDelim,
  };
}

function interpCompDeclBitWidth(decl) {
  const fn = typeof interpCompPinPoutBitWidth === 'function' ? interpCompPinPoutBitWidth : null;
  if (fn) return fn(decl);
  return null;
}

function decodeInterpCompPinBits(bits, decl, execAlias) {
  const alias = execAlias || decl.execAlias;
  const param = interpCompParamFromDecl(decl);
  const raw = bits == null ? '' : String(bits);
  try {
    if (decl.vector) {
      if (param.asciiNullDelim) {
        const str = interpBitsToAsciiByteString(raw);
        const fixed = param.vectorFixedCount > 0 ? param.vectorFixedCount : 0;
        return interpCopyVector(interpParseNullDelimAscii(str, fixed));
      }
      const elemW = interpTypeElemWidth(param);
      if (!elemW || raw.length % elemW !== 0) {
        throw new Error('wire width mismatch');
      }
      const out = [];
      for (let i = 0; i < raw.length; i += elemW) {
        out.push(interpDecodeElementBits(raw.substring(i, i + elemW), param));
      }
      return out;
    }
    const w = interpCompDeclBitWidth(decl) || raw.length;
    const slice = raw.length > w ? raw.substring(raw.length - w) : raw.padStart(w, '0');
    return interpDecodeElementBits(slice, param);
  } catch (err) {
    const detail = err && err.message ? err.message : String(err);
    throw new Error(`cannot decode value from type /${decl.typeName} on ${alias}: ${detail}`);
  }
}

function interpEncodeScalarValue(value, typeName, targetBits, alias) {
  const label = alias || 'pout';
  const fail = (v) => {
    throw new Error(`cannot encode value ${JSON.stringify(v)} for type /${typeName} on ${label}`);
  };
  if (typeName === 'u1' || typeName === 'bool') {
    const v = value ? 1 : 0;
    if (typeof value === 'string' && value !== '0' && value !== '1' && value.length > 1) fail(value);
    const w = targetBits && targetBits > 0 ? targetBits : 1;
    return (v ? 1 : 0).toString(2).padStart(w, '0');
  }
  const uMatch = /^u(\d+)$/.exec(typeName);
  if (uMatch) {
    const w = parseInt(uMatch[1], 10);
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > (1 << w) - 1 || Math.trunc(n) !== n) fail(value);
    return Math.trunc(n).toString(2).padStart(w, '0');
  }
  const sMatch = /^s(\d+)$/.exec(typeName);
  if (sMatch) {
    const w = parseInt(sMatch[1], 10);
    const n = Number(value);
    if (!Number.isFinite(n) || Math.trunc(n) !== n) fail(value);
    const max = (1 << (w - 1)) - 1;
    const min = -(1 << (w - 1));
    if (n > max || n < min) fail(value);
    const u = n < 0 ? (1 << w) + n : n;
    return u.toString(2).padStart(w, '0');
  }
  if (typeName === 'ascii') {
    const s = value == null ? '' : String(value);
    const w = targetBits && targetBits > 0 ? targetBits : s.length * 8;
    if (w % 8 !== 0) fail(value);
    const maxChars = w / 8;
    if (s.length > maxChars) fail(value);
    for (let i = 0; i < s.length; i++) {
      if (s.charCodeAt(i) > 127) fail(value);
    }
    let bits = '';
    for (let i = 0; i < s.length; i++) {
      bits += s.charCodeAt(i).toString(2).padStart(8, '0');
    }
    while (bits.length < w) bits += '00000000';
    return bits;
  }
  if (typeName === 'f32' || typeName === 'f64' || typeName === 'fp16' || typeName === 'bf16' || /^q\d+p\d+$/.test(typeName)) {
    const encFn = typeof encodeNformatValue === 'function' ? encodeNformatValue : null;
    const nf = typeof encodeFromFloat === 'function' ? encodeFromFloat : null;
    const w = targetBits && targetBits > 0 ? targetBits : interpCompDeclBitWidth({ typeName });
    if (!w) fail(value);
    if ((typeName === 'f32' || typeName === 'f64' || typeName === 'fp16' || typeName === 'bf16') && nf) {
      const bits = nf(Number(value), typeName, w);
      if (!bits || bits.length !== w) fail(value);
      return bits;
    }
    if (encFn && /^q\d+p\d+$/.test(typeName)) {
      const bits = encFn(Number(value), typeName, w);
      if (!bits || bits.length !== w) fail(value);
      return bits;
    }
    fail(value);
  }
  fail(value);
}

function encodeInterpCompPoutValue(value, decl, wireBits, execAlias) {
  const alias = execAlias || decl.execAlias;
  const param = interpCompParamFromDecl(decl);
  const targetBits = wireBits != null ? wireBits.length : interpCompDeclBitWidth(decl);
  if (decl.vector) {
    if (!Array.isArray(value)) {
      throw new Error(`cannot encode value ${JSON.stringify(value)} for type /${decl.typeName} on ${alias}`);
    }
    if (param.asciiNullDelim) {
      let str = '';
      for (const el of value) {
        const s = el == null ? '' : String(el);
        for (let i = 0; i < s.length; i++) {
          if (s.charCodeAt(i) > 127) {
            throw new Error(`cannot encode value ${JSON.stringify(value)} for type /${decl.typeName} on ${alias}`);
          }
        }
        str += s + '\0';
      }
      return interpEncodeScalarValue(str, 'ascii', targetBits, alias);
    }
    const elemW = interpTypeElemWidth(param);
    let bits = '';
    for (const el of value) {
      bits += interpEncodeScalarValue(el, decl.typeName, elemW, alias);
    }
    if (targetBits != null && bits.length > targetBits) {
      throw new Error(`cannot encode value ${JSON.stringify(value)} for type /${decl.typeName} on ${alias}`);
    }
    if (targetBits != null && bits.length < targetBits) {
      bits = bits.padStart(targetBits, '0');
    }
    return bits;
  }
  return interpEncodeScalarValue(value, decl.typeName, targetBits, alias);
}

function interpExecutePush(stmt, env, callMethodFn, options) {
  const buffer = options && options.poutBuffer;
  const defs = options && options.poutChannelDefs;
  if (!buffer || !defs) {
    interpError('push requires comp [interp] execution context', stmt.line);
  }
  for (const entry of stmt.entries || []) {
    const def = defs[entry.channel];
    if (!def) {
      interpError(`unknown pout channel '${entry.channel}'`, entry.line || stmt.line);
    }
    const val = interpEvalExpr(entry.expr, env, callMethodFn, entry.line || stmt.line);
    const wireBits = def.wireBits != null ? def.wireBits : null;
    const encoded = encodeInterpCompPoutValue(val, def, wireBits, def.execAlias);
    buffer[entry.channel] = encoded;
  }
}

function interpExecuteRemove(stmt, options) {
  const buffer = options && options.poutBuffer;
  const defs = options && options.poutChannelDefs;
  if (!buffer || !defs) {
    interpError('remove requires comp [interp] execution context', stmt.line);
  }
  if (!defs[stmt.channel]) {
    interpError(`unknown pout channel '${stmt.channel}'`, stmt.line);
  }
  delete buffer[stmt.channel];
}

function interpExecuteStmts(stmts, env, locals, program, callMethodFn, evalArg, sharedEnv, options) {
  for (const stmt of stmts || []) {
    if (stmt.kind === 'assign') {
      env[stmt.name] = interpEvalExpr(stmt.expr, env, callMethodFn, stmt.line);
      locals.add(stmt.name);
    } else if (stmt.kind === 'destructureAssign') {
      interpExecuteDestructuringAssign(stmt, env, locals, program, callMethodFn, sharedEnv, options);
    } else if (stmt.kind === 'indexAssign') {
      const idx = interpEvalExpr(stmt.index, env, callMethodFn, stmt.line);
      const val = interpEvalExpr(stmt.expr, env, callMethodFn, stmt.line);
      if (stmt.name === 'env' && sharedEnv) {
        sharedEnv[String(idx)] = val;
      } else {
        const arr = env[stmt.name];
        if (!Array.isArray(arr)) {
          interpError(`not a vector${stmt.line != null ? ` (line ${stmt.line})` : ''}`);
        }
        const i = Number(idx);
        if (!Number.isFinite(i) || i < 0 || i >= arr.length) {
          interpError(`vector index out of range${stmt.line != null ? ` (line ${stmt.line})` : ''}`);
        }
        arr[i] = val;
      }
    } else if (stmt.kind === 'return') {
      const values = (stmt.exprs || []).map((ex) => interpEvalExpr(ex, env, callMethodFn, stmt.line));
      throw { interpFlow: 'return', values };
    } else if (stmt.kind === 'call') {
      const vals = (stmt.args || []).map((a) => evalArg(a));
      const m = program.methods[stmt.name];
      if (!m) interpError(`unknown method '${stmt.name}'${stmt.line != null ? ` (line ${stmt.line})` : ''}`);
      interpExecuteMethod(m, vals, program, sharedEnv || env, options);
    } else if (stmt.kind === 'if') {
      if (interpEvalCond(stmt.cond, env, callMethodFn, stmt.line)) {
        interpExecuteStmts(stmt.then, env, locals, program, callMethodFn, evalArg, sharedEnv);
      } else if (stmt.else) {
        interpExecuteStmts(stmt.else, env, locals, program, callMethodFn, evalArg, sharedEnv);
      }
    } else if (stmt.kind === 'for') {
      if (stmt.init && stmt.init.kind === 'assign') {
        env[stmt.init.name] = interpEvalExpr(stmt.init.expr, env, callMethodFn, stmt.line);
        locals.add(stmt.init.name);
      }
      let iter = 0;
      while (true) {
        if (stmt.cond != null && !interpEvalCond(stmt.cond, env, callMethodFn, stmt.line)) break;
        if (iter >= INTERP_MAX_LOOP_ITERATIONS) {
          interpError(`loop iteration limit (${INTERP_MAX_LOOP_ITERATIONS}) exceeded${stmt.line != null ? ` (line ${stmt.line})` : ''}`);
        }
        try {
          interpExecuteStmts(stmt.body, env, locals, program, callMethodFn, evalArg, sharedEnv, options);
        } catch (err) {
          if (err && err.interpFlow === 'break') break;
          if (err && err.interpFlow === 'continue') { /* fall through to step */ }
          else if (err && err.interpFlow === 'return') throw err;
          else throw err;
        }
        if (stmt.step && stmt.step.kind === 'assign') {
          env[stmt.step.name] = interpEvalExpr(stmt.step.expr, env, callMethodFn, stmt.line);
        }
        iter++;
      }
    } else if (stmt.kind === 'while') {
      let iter = 0;
      while (interpEvalCond(stmt.cond, env, callMethodFn, stmt.line)) {
        if (iter >= INTERP_MAX_LOOP_ITERATIONS) {
          interpError(`loop iteration limit (${INTERP_MAX_LOOP_ITERATIONS}) exceeded${stmt.line != null ? ` (line ${stmt.line})` : ''}`);
        }
        try {
          interpExecuteStmts(stmt.body, env, locals, program, callMethodFn, evalArg, sharedEnv, options);
        } catch (err) {
          if (err && err.interpFlow === 'break') break;
          if (err && err.interpFlow === 'continue') continue;
          if (err && err.interpFlow === 'return') throw err;
          throw err;
        }
        iter++;
      }
    } else if (stmt.kind === 'break') {
      throw { interpFlow: 'break' };
    } else if (stmt.kind === 'continue') {
      throw { interpFlow: 'continue' };
    } else if (stmt.kind === 'push') {
      interpExecutePush(stmt, env, callMethodFn, options);
    } else if (stmt.kind === 'remove') {
      interpExecuteRemove(stmt, options);
    } else if (stmt.kind === 'removeall') {
      const buffer = options && options.poutBuffer;
      if (!buffer) {
        interpError('removeall requires comp [interp] execution context', stmt.line);
      }
      for (const key of Object.keys(buffer)) delete buffer[key];
    }
  }
}

function interpExecuteMethod(method, argValues, program, sharedEnv, options) {
  const frameEnv = Object.create(null);
  frameEnv.env = sharedEnv;
  for (let i = 0; i < method.params.length; i++) {
    const param = method.params[i];
    let val = argValues[i];
    if (param && param.vector && Array.isArray(val)) {
      val = interpCopyVector(val);
    }
    frameEnv[param.name] = val;
  }
  const locals = new Set(method.params.map((p) => p.name));
  const callMethodFn = (name, args, line) => {
    const m = program.methods[name];
    if (!m) interpError(`unknown method '${name}'${line != null ? ` (line ${line})` : ''}`);
    const vals = (args || []).map((a) => interpEvalExpr(a, frameEnv, callMethodFn, line));
    return interpExecuteMethod(m, vals, program, sharedEnv, options);
  };
  const evalArg = (a) => interpEvalExpr(a, frameEnv, callMethodFn, null);
  try {
    interpExecuteStmts(method.body, frameEnv, locals, program, callMethodFn, evalArg, sharedEnv, options);
  } catch (err) {
    if (err && err.interpFlow === 'return') {
      const values = err.values || (err.value != null ? [err.value] : [0]);
      if (method.returnArity > 1) {
        if (values.length !== method.returnArity) {
          interpError(`return arity mismatch in '${method.name}'`);
        }
        return values;
      }
      return values[0];
    }
    throw err;
  }
  return 0;
}

function encodeInterpResult(value, bitWidth) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.trunc(value);
    const w = bitWidth && bitWidth > 0 ? bitWidth : 8;
    if (n < 0) interpError('negative result cannot encode as unsigned wire');
    const max = (1 << w) - 1;
    if (n > max) interpError(`result ${n} overflow for ${w}-bit wire`);
    return n.toString(2).padStart(w, '0');
  }
  const w = bitWidth || 8;
  if (typeof value === 'boolean') {
    return value ? '1'.padStart(w, '0') : '0'.padStart(w, '0');
  }
  interpError('eval result type cannot encode to wire');
}

function evalInterpInline(inst, wireBits, schemaName, registry, options) {
  if (!inst || !inst.methods) interpError('invalid inline [interp] instance');
  const env = options && options.env ? Object.assign({}, options.env) : {};
  return evalInterpWire(wireBits, schemaName, registry, inst, env, options || {});
}

function evalInterpCompExec(wireBits, schemaName, registry, program, pinEnv, compOptions) {
  const env = Object.assign({}, pinEnv || {});
  if (!env.env || typeof env.env !== 'object') env.env = {};
  const options = Object.assign({}, compOptions || {});
  options.poutBuffer = options.poutBuffer || {};
  try {
    evalInterpWire(wireBits, schemaName, registry, program, env, options);
  } catch (err) {
    if (err && err.message && err.message.indexOf('interp:') === 0) {
      const detail = err.message.replace(/^interp:\s*/, '');
      throw new Error(`ast binary is invalid for schema ${schemaName}: ${detail}`);
    }
    throw err;
  }
  return options.poutBuffer;
}

function validateInterpAstWire(wireBits, schemaName, registry) {
  const SS = interpSs();
  const schema = interpResolveSchema(registry, schemaName);
  if (!schema) throw new Error(`unknown schema '${schemaName}'`);
  const bits = wireBits == null ? '' : String(wireBits);
  if (schema.hasDynamicWidth || schema.hasVarArray || schema.hasBound) {
    if (!bits.length) throw new Error('empty wire');
    return;
  }
  const expected = schema.totalWidth;
  if (expected > 0 && bits.length < expected) {
    throw new Error(`wire has ${bits.length} bits, schema '${schemaName}' needs at least ${expected}`);
  }
  if (SS && typeof SS.schemaWireUsedWidth === 'function') {
    const used = SS.schemaWireUsedWidth(schema, bits, null);
    if (used > bits.length) {
      throw new Error(`wire has ${bits.length} bits, payload needs ${used}`);
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.evalInterpWire = evalInterpWire;
  globalThis.evalInterpInline = evalInterpInline;
  globalThis.evalInterpCompExec = evalInterpCompExec;
  globalThis.encodeInterpResult = encodeInterpResult;
  globalThis.decodeInterpCompPinBits = decodeInterpCompPinBits;
  globalThis.encodeInterpCompPoutValue = encodeInterpCompPoutValue;
  globalThis.validateInterpAstWire = validateInterpAstWire;
  globalThis.INTERP_MAX_LOOP_ITERATIONS = INTERP_MAX_LOOP_ITERATIONS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    evalInterpWire,
    evalInterpInline,
    evalInterpCompExec,
    encodeInterpResult,
    decodeInterpCompPinBits,
    encodeInterpCompPoutValue,
    validateInterpAstWire,
    INTERP_MAX_LOOP_ITERATIONS,
  };
}
