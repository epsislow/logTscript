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

function interpSchemaFieldKind(fieldNode, registry) {
  if (!fieldNode) return 'unknown';
  if (fieldNode.isBound || fieldNode.kind === 'bound') {
    const sub = fieldNode.schema ? interpResolveSchema(registry, fieldNode.schema.name || fieldNode.schema) : null;
    if (sub && sub.hasPresenceMask && sub.name === 'expr') return 'expr';
    if (sub && interpIsBvaBytesSchema(sub, registry)) return 'ascii-bva';
    return 'bound';
  }
  if (fieldNode.kind === 'leaf' || (fieldNode.width && fieldNode.kind !== 'bound_var_array')) return 'leaf';
  if (fieldNode.kind === 'bound_var_array') return 'bva';
  return 'unknown';
}

function interpValidateSchemaType(param, fieldNode, methodName, schemaName, cache) {
  if (!param.typeName) {
    interpError(`method '${methodName}' param '${param.name}' missing /type annotation`);
  }
  const key = `${schemaName}:${methodName}:${param.name}:${param.typeName}`;
  if (cache && cache.has(key)) return;
  const kind = interpSchemaFieldKind(fieldNode, cache && cache.registry);
  const tn = param.typeName;
  let ok = false;
  if (kind === 'expr') {
    ok = /^(u|s)\d+$/.test(tn) || tn === 'f32' || tn === 'f64' || tn === 'fp16' || tn === 'bf16' || /^q\d+p\d+$/.test(tn);
  } else if (kind === 'ascii-bva' || kind === 'bva') {
    ok = tn === 'ascii';
  } else if (kind === 'leaf') {
    ok = /^(u|s)\d+$/.test(tn) || tn === 'ascii' || tn === 'bool' || tn === 'u1';
  } else if (kind === 'bound') {
    ok = true;
  }
  if (!ok) {
    interpError(`schema '${schemaName}' field '${param.name}' incompatible with /${tn}`);
  }
  if (cache) cache.set(key, true);
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

function interpDecodeParamBits(bits, param, fieldNode, registry, program, env, options) {
  if (param.vector) {
    interpError('vector params decode not implemented in MVP');
  }
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
    const fieldBits = interpExtractFieldBits(payloadBits, payloadSchema, param.name);
    argValues.push(interpDecodeParamBits(fieldBits, param, fieldNode, registry, program, env, options));
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

function interpExecuteStmts(stmts, env, locals, program, callMethodFn, evalArg, sharedEnv, options) {
  for (const stmt of stmts || []) {
    if (stmt.kind === 'assign') {
      env[stmt.name] = interpEvalExpr(stmt.expr, env, callMethodFn, stmt.line);
      locals.add(stmt.name);
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
      const val = interpEvalExpr(stmt.expr, env, callMethodFn, stmt.line);
      throw { interpFlow: 'return', value: val };
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
    }
  }
}

function interpExecuteMethod(method, argValues, program, sharedEnv, options) {
  const frameEnv = Object.create(null);
  frameEnv.env = sharedEnv;
  for (let i = 0; i < method.params.length; i++) {
    const param = method.params[i];
    frameEnv[param.name] = argValues[i];
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
      return err.value;
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

if (typeof globalThis !== 'undefined') {
  globalThis.evalInterpWire = evalInterpWire;
  globalThis.evalInterpInline = evalInterpInline;
  globalThis.encodeInterpResult = encodeInterpResult;
  globalThis.INTERP_MAX_LOOP_ITERATIONS = INTERP_MAX_LOOP_ITERATIONS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    evalInterpWire,
    evalInterpInline,
    encodeInterpResult,
    INTERP_MAX_LOOP_ITERATIONS,
  };
}
