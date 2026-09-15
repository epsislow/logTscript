/* ================= F11 — handle:field access & fieldRef decode ================= */

function interpIsFieldRef(v) {
  return v != null && typeof v === 'object' && v.__interpFieldRef === true;
}

function interpMakeFieldRef(spec) {
  return {
    __interpFieldRef: true,
    payloadBits: spec.payloadBits,
    schemaRef: spec.schemaRef,
    fieldName: spec.fieldName || '',
    fieldNode: spec.fieldNode || null,
    pathKey: spec.pathKey || '',
    parentSchemaRef: spec.parentSchemaRef || '',
  };
}

function interpMakeInvokeRootHandle(payloadBits, payloadSchema, registry, pathKeyPrefix) {
  const hasBva = (payloadSchema.structure || []).some(
    (n) => n.kind === 'bound_var_array' || n.isBoundVarArray
      || (n.kind === 'optional_field' && n.isBoundVarArray),
  );
  const navCount = interpListNavigableFields(payloadSchema, payloadBits, registry).length;
  return interpMakeNodeHandle({
    kind: (hasBva || navCount > 0) ? 'composite' : 'leaf',
    schemaRef: payloadSchema.name,
    payloadBits: payloadBits == null ? '' : String(payloadBits),
    pathKey: pathKeyPrefix || 'r',
    fieldName: '',
    fieldNode: null,
  });
}

function interpListNavigableFields(schema, payloadBits, registry) {
  const SB = interpSb();
  const bits = payloadBits == null ? '' : String(payloadBits);
  const out = [];
  if (!schema) return out;
  if (schema.hasPresenceMask) {
    const maskBits = schema.presenceMaskBits || 0;
    const maskInfo = SB.readPresenceMask(bits, maskBits, 0);
    let optIdx = 0;
    for (const node of schema.structure || []) {
      if (node.kind !== 'optional_field') continue;
      const present = maskInfo.mask.charAt(optIdx) === '1';
      optIdx++;
      if (present) out.push(interpNormalizeFieldNode(node));
    }
    return out;
  }
  for (const node of schema.structure || []) {
    if (node.kind === 'optional_field') continue;
    out.push(interpNormalizeFieldNode(node));
  }
  return out;
}

function interpFindNavigableField(schema, payloadBits, registry, seg) {
  const fields = interpListNavigableFields(schema, payloadBits, registry);
  if (seg.segKind === 'index') {
    const idx = seg.value;
    if (!Number.isInteger(idx) || idx < 0 || idx >= fields.length) {
      interpError('missing field');
    }
    return fields[idx];
  }
  for (const f of fields) {
    if (f.name === seg.value) return f;
  }
  interpError(`schema '${schema.name}' has no field '${seg.value}'`);
}

function interpUnwrapSingleUnionBranch(handle, registry, line) {
  const schema = interpResolveSchema(registry, handle.schemaRef);
  if (!schema || !schema.hasPresenceMask) return handle;
  const fields = interpListNavigableFields(schema, handle.payloadBits, registry);
  if (fields.length !== 1) return handle;
  return interpSliceFieldFromHandle(handle, fields[0], registry, line);
}

function interpSliceFieldFromHandle(handle, fieldNode, registry, line) {
  const schema = interpResolveSchema(registry, handle.schemaRef);
  if (!schema) interpError(`unknown schema '${handle.schemaRef}'`);
  const bits = interpExtractFieldBits(handle.payloadBits, schema, fieldNode.name);
  const kind = interpSchemaFieldKind(fieldNode, registry);
  const pathKey = `${handle.pathKey}/${fieldNode.name}`;
  if (kind === 'bound' || kind === 'expr' || kind === 'ascii-bva') {
    const subSchema = fieldNode.schema
      ? interpResolveSchema(registry, fieldNode.schema.name || fieldNode.schemaRef || fieldNode.schema)
      : null;
    let childSchemaRef = subSchema ? subSchema.name : handle.schemaRef;
    let childBits = bits;
    if (subSchema && subSchema.hasPresenceMask) {
      const active = interpListNavigableFields(subSchema, bits, registry);
      if (active.length === 1 && active[0].schema) {
        const branchSchema = interpResolveSchema(
          registry,
          active[0].schema.name || active[0].schemaRef || active[0].schema,
        );
        if (branchSchema && !branchSchema.hasPresenceMask) {
          childSchemaRef = branchSchema.name;
          childBits = interpExtractFieldBits(bits, subSchema, active[0].name);
        }
      }
    }
    const subHasBva = subSchema && (subSchema.structure || []).some(
      (n) => n.kind === 'bound_var_array' || n.isBoundVarArray,
    );
    const childNav = interpListNavigableFields(
      interpResolveSchema(registry, childSchemaRef),
      childBits,
      registry,
    ).length;
    return interpMakeNodeHandle({
      kind: (subHasBva || childNav > 0) ? 'composite' : 'leaf',
      schemaRef: childSchemaRef,
      payloadBits: childBits,
      pathKey,
      fieldName: fieldNode.name,
      fieldNode,
    });
  }
  if (kind === 'bva') {
    return interpMakeNodeHandle({
      kind: 'composite',
      schemaRef: handle.schemaRef,
      payloadBits: bits,
      pathKey,
      fieldName: fieldNode.name,
      fieldNode,
    });
  }
  if (kind === 'leaf') {
    return interpMakeFieldRef({
      payloadBits: bits,
      schemaRef: schema.name,
      fieldName: fieldNode.name,
      fieldNode,
      pathKey,
      parentSchemaRef: schema.name,
    });
  }
  interpError(`unsupported field shape for '${fieldNode.name}'`);
}

function interpEvalFieldAccess(expr, env, callMethodFn, line) {
  const lineNo = expr.line != null ? expr.line : line;
  let cur = interpEvalExpr(expr.base, env, callMethodFn, lineNo);
  const registry = interpInterpRegistryFromCtx();
  if (!registry) interpError('field access requires active interpreter session');
  for (const seg of expr.segments || []) {
    if (interpIsFieldRef(cur)) {
      interpError('cannot navigate into leaf field — decode with /type first');
    }
    if (!interpIsNodeHandle(cur)) {
      interpError('field access requires node handle');
    }
    let schema = interpResolveSchema(registry, cur.schemaRef);
    let fieldNode;
    try {
      fieldNode = interpFindNavigableField(schema, cur.payloadBits, registry, seg);
    } catch (findErr) {
      const unwrapped = interpUnwrapSingleUnionBranch(cur, registry, lineNo);
      if (unwrapped !== cur) {
        cur = unwrapped;
        schema = interpResolveSchema(registry, cur.schemaRef);
        fieldNode = interpFindNavigableField(schema, cur.payloadBits, registry, seg);
      } else {
        throw findErr;
      }
    }
    cur = interpSliceFieldFromHandle(cur, fieldNode, registry, lineNo);
  }
  if (expr.decode) {
    if (interpIsFieldRef(cur)) {
      return interpDecodeFieldRef(cur, expr.decode, registry, lineNo);
    }
    if (interpIsNodeHandle(cur)) {
      const kind = cur.fieldNode ? interpSchemaFieldKind(cur.fieldNode, registry) : 'unknown';
      if (kind === 'bound' || kind === 'expr' || kind === 'bva') {
        if (expr.decode.typeName !== 'ascii') {
          interpError('decode /type requires leaf field');
        }
      }
      return interpDecodeHandleField(cur, expr.decode, registry, lineNo);
    }
    interpError('decode /type requires node or field handle');
  }
  return cur;
}

function interpDecodeHandleField(handle, decode, registry, line) {
  const fieldNode = handle.fieldNode;
  if (!fieldNode) {
    interpError(`decode /type requires field slice${line != null ? ` (line ${line})` : ''}`);
  }
  const param = {
    name: fieldNode.name,
    typeName: decode.typeName,
    vector: false,
    asciiCharsPerElem: decode.asciiCharsPerElem || 0,
    asciiNullDelim: !!decode.asciiNullDelim,
    vectorFixedCount: decode.vectorFixedCount || 0,
  };
  const bits = handle.payloadBits == null ? '' : String(handle.payloadBits);
  return interpDecodeParamBits(bits, param, fieldNode, registry, null, null, {});
}

function interpDecodeFieldRef(fieldRef, decode, registry, line) {
  const param = {
    name: fieldRef.fieldName,
    typeName: decode.typeName,
    vector: false,
    asciiCharsPerElem: decode.asciiCharsPerElem || 0,
    asciiNullDelim: !!decode.asciiNullDelim,
    vectorFixedCount: decode.vectorFixedCount || 0,
  };
  const bits = fieldRef.payloadBits == null ? '' : String(fieldRef.payloadBits);
  const fieldNode = fieldRef.fieldNode;
  const kind = interpSchemaFieldKind(fieldNode, registry);
  if (kind === 'bva' || (fieldNode && (fieldNode.kind === 'bound_var_array' || fieldNode.isBoundVarArray))) {
    if (decode.typeName === 'ascii') {
      if (decode.asciiNullDelim) {
        const raw = interpBitsToAsciiByteString(bits);
        const idx = raw.indexOf('\0');
        return idx >= 0 ? raw.substring(0, idx) : raw;
      }
      if (decode.vectorFixedCount > 0) {
        return interpDecodeAsciiElem(bits, decode.vectorFixedCount);
      }
      return interpBitsToAsciiByteString(bits);
    }
  }
  return interpDecodeParamBits(bits, param, fieldNode, registry, null, null, {});
}

function interpBuiltinIsNode(args, env, callMethodFn, line) {
  if (!args || args.length !== 1) {
    interpError(`isNode expects 1 argument${line != null ? ` (line ${line})` : ''}`);
  }
  const v = interpEvalExpr(args[0], env, callMethodFn, line);
  return interpIsNodeHandle(v) ? 1 : 0;
}

function interpBuiltinNodeName(args, env, callMethodFn, line) {
  if (!args || args.length !== 1) {
    interpError(`nodeName expects 1 argument${line != null ? ` (line ${line})` : ''}`);
  }
  const v = interpEvalExpr(args[0], env, callMethodFn, line);
  if (interpIsFieldRef(v)) return v.fieldName;
  if (interpIsNodeHandle(v)) {
    if (!v.fieldName) interpError(`nodeName expects field slice${line != null ? ` (line ${line})` : ''}`);
    return v.fieldName;
  }
  interpError(`nodeName expects handle or field slice${line != null ? ` (line ${line})` : ''}`);
}

function interpBuiltinFieldCount(args, env, callMethodFn, line) {
  if (!args || args.length !== 1) {
    interpError(`fieldCount expects 1 argument${line != null ? ` (line ${line})` : ''}`);
  }
  const v = interpEvalExpr(args[0], env, callMethodFn, line);
  if (!interpIsNodeHandle(v)) {
    interpError(`fieldCount expects node handle${line != null ? ` (line ${line})` : ''}`);
  }
  const registry = interpInterpRegistryFromCtx();
  if (!registry) interpError('fieldCount requires active interpreter session');
  const schema = interpResolveSchema(registry, v.schemaRef);
  return interpListNavigableFields(schema, v.payloadBits, registry).length;
}

function interpAssertNodeHandleForEval(v, line) {
  if (interpIsFieldRef(v)) {
    interpError(`eval requires deferred node handle${line != null ? ` (line ${line})` : ''}`);
  }
  if (!interpIsNodeHandle(v)) {
    interpError(`eval requires deferred node handle${line != null ? ` (line ${line})` : ''}`);
  }
}

function interpShowFieldRefPath(fieldRef, registry) {
  const schema = fieldRef.schemaRef || '';
  const w = fieldRef.fieldNode && fieldRef.fieldNode.width ? fieldRef.fieldNode.width : '?';
  return `field ${fieldRef.fieldName} (${schema}.${fieldRef.fieldName}, ${w} bit)`;
}

function interpShowBvaCompositeMultiLine(handle, registry, indent) {
  const fieldNode = handle.fieldNode;
  const elemSchema = fieldNode && fieldNode.schema
    ? interpResolveSchema(registry, fieldNode.schema.name || fieldNode.schemaRef || fieldNode.schema)
    : null;
  if (!elemSchema) return [String(handle.schemaRef || 'node')];
  const len = interpCompositeNodeLen(handle, null);
  const elemName = elemSchema.name || handle.schemaRef || 'node';
  const lines = [`${elemName}[${len}]`];
  for (let i = 0; i < len; i++) {
    const child = interpSliceCompositeChild(handle, i, registry, null);
    let tag = elemName;
    try {
      tag = interpPeekUnionTag(child.payloadBits, elemSchema, registry);
    } catch (_) { /* keep element schema name */ }
    lines.push(indent + '[' + i + '] = ' + tag);
  }
  return lines;
}

function interpShowNodeFieldsMultiLine(handle, registry, indent) {
  if (handle.kind === 'composite' && handle.fieldNode) {
    const fKind = interpSchemaFieldKind(handle.fieldNode, registry);
    if (fKind === 'bva') {
      return interpShowBvaCompositeMultiLine(handle, registry, indent);
    }
  }
  const lines = [];
  const schema = interpResolveSchema(registry, handle.schemaRef);
  if (!schema) return [`${handle.schemaRef}`];
  if (schema.hasPresenceMask) {
    const active = interpListNavigableFields(schema, handle.payloadBits, registry);
    if (active.length === 1 && active[0].schema) {
      const branchBits = interpExtractFieldBits(handle.payloadBits, schema, active[0].name);
      const sub = interpResolveSchema(registry, active[0].schema.name || active[0].schemaRef || active[0].schema);
      if (sub && !sub.hasPresenceMask) {
        return interpShowNodeFieldsMultiLine({
          kind: handle.kind,
          schemaRef: sub.name,
          payloadBits: branchBits,
          pathKey: handle.pathKey,
          fieldName: handle.fieldName,
          fieldNode: handle.fieldNode,
        }, registry, indent);
      }
    }
  }
  let tag = handle.schemaRef;
  try {
    if (schema.hasPresenceMask) tag = interpPeekUnionTag(handle.payloadBits, schema, registry);
  } catch (_) { /* keep schema name */ }
  lines.push(String(tag));
  const fields = interpListNavigableFields(schema, handle.payloadBits, registry);
  const SB = interpSb();
  for (const fieldNode of fields) {
    const kind = interpSchemaFieldKind(fieldNode, registry);
    const prefix = indent + fieldNode.name + ' = ';
    if (kind === 'leaf') {
      const bits = interpExtractFieldBits(handle.payloadBits, schema, fieldNode.name);
      const w = fieldNode.width || bits.length;
      let val = '?';
      try {
        if (w <= 16) {
          const uTn = 'u' + w;
          val = String(interpDecodeNumeric(bits.length > w ? bits.substring(bits.length - w) : bits.padStart(w, '0'), uTn));
        }
      } catch (_) { val = '?'; }
      lines.push(prefix + val);
    } else if (kind === 'bva') {
      const bits = interpExtractFieldBits(handle.payloadBits, schema, fieldNode.name);
      const tmp = interpMakeNodeHandle({
        kind: 'composite', schemaRef: schema.name, payloadBits: bits,
        pathKey: handle.pathKey, fieldName: fieldNode.name, fieldNode,
      });
      lines.push(prefix + '[' + interpCompositeNodeLen(tmp, null) + ']');
    } else {
      let childTag = fieldNode.schema && fieldNode.schema.name ? fieldNode.schema.name : 'node';
      try {
        const bits = interpExtractFieldBits(handle.payloadBits, schema, fieldNode.name);
        const sub = fieldNode.schema
          ? interpResolveSchema(registry, fieldNode.schema.name || fieldNode.schemaRef || fieldNode.schema)
          : null;
        if (sub && sub.hasPresenceMask) childTag = interpPeekUnionTag(bits, sub, registry);
      } catch (_) { /* tag from schema */ }
      lines.push(prefix + childTag);
    }
  }
  return lines;
}

if (typeof globalThis !== 'undefined') {
  globalThis.interpIsFieldRef = interpIsFieldRef;
  globalThis.interpMakeFieldRef = interpMakeFieldRef;
  globalThis.interpMakeInvokeRootHandle = interpMakeInvokeRootHandle;
  globalThis.interpEvalFieldAccess = interpEvalFieldAccess;
  globalThis.interpBuiltinIsNode = interpBuiltinIsNode;
  globalThis.interpBuiltinNodeName = interpBuiltinNodeName;
  globalThis.interpBuiltinFieldCount = interpBuiltinFieldCount;
  globalThis.interpAssertNodeHandleForEval = interpAssertNodeHandleForEval;
  globalThis.interpShowFieldRefPath = interpShowFieldRefPath;
  globalThis.interpShowNodeFieldsMultiLine = interpShowNodeFieldsMultiLine;
  globalThis.interpListNavigableFields = interpListNavigableFields;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    interpIsFieldRef,
    interpMakeFieldRef,
    interpMakeInvokeRootHandle,
    interpEvalFieldAccess,
    interpBuiltinIsNode,
    interpBuiltinNodeName,
    interpBuiltinFieldCount,
    interpAssertNodeHandleForEval,
    interpShowFieldRefPath,
    interpShowNodeFieldsMultiLine,
    interpListNavigableFields,
  };
}
