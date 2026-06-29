/**
 * Vector reduction helpers (SUM, DOT operand expand + unsigned math).
 */
(function (global) {
  'use strict';

  function unsignedBinToBigInt(binStr) {
    const s = binStr == null ? '' : String(binStr);
    if (!s.length) return 0n;
    return BigInt('0b' + s);
  }

  function isReductionWireAtom(atom) {
    return atom && atom.var && !atom.property && !atom.internalWire
      && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$';
  }

  function isWholeVectorWireArg(argExpr, getWire) {
    if (!argExpr || argExpr.length !== 1) return false;
    const a = argExpr[0];
    if (!isReductionWireAtom(a)) return false;
    if (a.vectorIndex !== undefined && a.vectorIndex !== null) return false;
    if (a.vectorIndexExpr) return false;
    if (a.bitRange) return false;
    const wire = getWire ? getWire(a.var) : null;
    return !!(wire && wire.vector);
  }

  function isVectorSliceArg(argExpr) {
    if (!argExpr || argExpr.length !== 1) return false;
    const a = argExpr[0];
    if (!isReductionWireAtom(a)) return false;
    if (a.vectorIndex !== undefined && a.vectorIndex !== null) return true;
    return !!a.vectorIndexExpr;
  }

  function getWholeVectorMeta(argExpr, getWire) {
    if (!isWholeVectorWireArg(argExpr, getWire)) return null;
    const wire = getWire(argExpr[0].var);
    return wire ? wire.vector : null;
  }

  function requireSameBitWidth(values, opName) {
    if (!values.length) return 0;
    const w = values[0].length;
    for (let i = 1; i < values.length; i++) {
      if (values[i].length !== w) {
        throw new Error(`${opName}: all arguments must have the same bit width`);
      }
    }
    return w;
  }

  function signedBinToBigInt(binStr) {
    const s = binStr == null ? '' : String(binStr);
    if (!s.length) return 0n;
    const w = s.length;
    if (s[0] === '1') {
      const unsigned = BigInt('0b' + s);
      return unsigned - (BigInt(1) << BigInt(w));
    }
    return BigInt('0b' + s);
  }

  function sumExpanded(values, X, signed) {
    let acc = 0n;
    for (const v of values) {
      const s = String(v).padStart(X, '0');
      acc += signed ? signedBinToBigInt(s) : unsignedBinToBigInt(s);
    }
    const totalBits = 2 * X;
    if (!signed) {
      const maxVal = (BigInt(1) << BigInt(totalBits)) - BigInt(1);
      if (acc > maxVal) {
        const need = acc.toString(2).length;
        throw new Error(
          `SUM: result requires ${totalBits} bits (X=${X}); value needs ${need} bits`
        );
      }
    } else {
      const minVal = -(BigInt(1) << BigInt(totalBits - 1));
      const maxSigned = (BigInt(1) << BigInt(totalBits - 1)) - BigInt(1);
      if (acc < minVal || acc > maxSigned) {
        throw new Error(
          `SUM: signed result requires ${totalBits} bits (X=${X}); value out of range`
        );
      }
    }
    const maskX = (BigInt(1) << BigInt(X)) - BigInt(1);
    const result = (acc & maskX).toString(2).padStart(X, '0');
    const over = ((acc >> BigInt(X)) & maskX).toString(2).padStart(X, '0');
    return { result, over };
  }

  function sumUnsignedExpanded(values, X) {
    return sumExpanded(values, X, false);
  }

  function dotExpanded(aVals, bVals, X, signed) {
    if (aVals.length !== bVals.length) {
      throw new Error('DOT: vectors must have the same number of elements');
    }
    let acc = 0n;
    for (let i = 0; i < aVals.length; i++) {
      const ap = String(aVals[i]).padStart(X, '0');
      const bp = String(bVals[i]).padStart(X, '0');
      const a = signed ? signedBinToBigInt(ap) : unsignedBinToBigInt(ap);
      const b = signed ? signedBinToBigInt(bp) : unsignedBinToBigInt(bp);
      acc += a * b;
    }
    const totalBits = 3 * X;
    if (!signed) {
      const maxVal = (BigInt(1) << BigInt(totalBits)) - BigInt(1);
      if (acc > maxVal) {
        const need = acc.toString(2).length;
        throw new Error(
          `DOT: result requires ${totalBits} bits (X=${X}); value needs ${need} bits`
        );
      }
    } else {
      const minVal = -(BigInt(1) << BigInt(totalBits - 1));
      const maxSigned = (BigInt(1) << BigInt(totalBits - 1)) - BigInt(1);
      if (acc < minVal || acc > maxSigned) {
        throw new Error(
          `DOT: signed result requires ${totalBits} bits (X=${X}); value out of range`
        );
      }
    }
    const maskX = (BigInt(1) << BigInt(X)) - BigInt(1);
    const maskOver = (BigInt(1) << BigInt(2 * X)) - BigInt(1);
    const result = (acc & maskX).toString(2).padStart(X, '0');
    const over = ((acc >> BigInt(X)) & maskOver).toString(2).padStart(2 * X, '0');
    return { result, over };
  }

  function dotUnsignedExpanded(aVals, bVals, X) {
    return dotExpanded(aVals, bVals, X, false);
  }

  /** One vector + one scalar, or two vectors of the same shape → element-wise pairing. */
  function getVectorBroadcastPair(args, getWire) {
    if (!args || args.length !== 2) return null;
    const v0 = isWholeVectorWireArg(args[0], getWire);
    const v1 = isWholeVectorWireArg(args[1], getWire);
    if (v0 && !v1) {
      return { mode: 'vectorScalar', vectorArg: 0, scalarArg: 1, meta: getWire(args[0][0].var).vector };
    }
    if (!v0 && v1) {
      return { mode: 'vectorScalar', vectorArg: 1, scalarArg: 0, meta: getWire(args[1][0].var).vector };
    }
    if (v0 && v1) {
      const m0 = getWire(args[0][0].var).vector;
      const m1 = getWire(args[1][0].var).vector;
      if (m0.elementWidth !== m1.elementWidth || m0.elementCount !== m1.elementCount) return null;
      return { mode: 'vectorVector', meta: m0 };
    }
    return null;
  }

  function addUnsignedAtWidth(a, b, width) {
    const depth = width;
    const aNum = unsignedBinToBigInt(String(a).padStart(depth, '0'));
    const bNum = unsignedBinToBigInt(String(b).padStart(depth, '0'));
    const sum = aNum + bNum;
    const mask = (BigInt(1) << BigInt(depth)) - BigInt(1);
    const carry = sum > mask ? '1' : '0';
    const result = (sum & mask).toString(2).padStart(depth, '0');
    return { result, carry };
  }

  const SHAPE_ERR =
    'vector arguments must have the same shape; scalars must match element width W';

  function classifyVectorTaggedOperands(args, getWire) {
    const classified = [];
    let meta = null;
    let hasWholeVector = false;
    for (let i = 0; i < (args || []).length; i++) {
      const wholeVector = isWholeVectorWireArg(args[i], getWire);
      if (wholeVector) {
        hasWholeVector = true;
        const m = getWholeVectorMeta(args[i], getWire);
        if (!meta) meta = m;
      }
      classified.push({ argIndex: i, wholeVector });
    }
    return { classified, meta, hasWholeVector };
  }

  function requireVectorTaggedOperands(args, getWire, fnName) {
    if (!args || args.length < 2) {
      throw new Error(`${fnName}: with '; vector' expects at least 2 arguments`);
    }
    const info = classifyVectorTaggedOperands(args, getWire);
    if (!info.hasWholeVector) {
      throw new Error(`${fnName}: remove '; vector' — no argument is a whole vector`);
    }
    if (!info.meta) {
      throw new Error(`${fnName}: internal error (vector meta missing)`);
    }
    const W = info.meta.elementWidth;
    const N = info.meta.elementCount;
    for (const c of info.classified) {
      if (!c.wholeVector) continue;
      const m = getWholeVectorMeta(args[c.argIndex], getWire);
      if (m.elementWidth !== W || m.elementCount !== N) {
        throw new Error(`${fnName}: ${SHAPE_ERR}`);
      }
    }
    return { classified: info.classified, meta: info.meta };
  }

  function elementValuesAtIndex(args, classified, index, evalElement, evalScalar) {
    const values = [];
    for (const c of classified) {
      if (c.wholeVector) {
        const atom = args[c.argIndex][0];
        values.push(evalElement(atom.var, index));
      } else {
        values.push(evalScalar(args[c.argIndex]));
      }
    }
    return values;
  }

  function requireValuesElementWidth(values, W, fnName) {
    for (const v of values) {
      const s = v == null ? '' : String(v);
      if (s.length !== W) {
        throw new Error(`${fnName}: ${SHAPE_ERR}`);
      }
    }
  }

  function pickMinMaxUnsigned(values, pickMin) {
    const op = pickMin ? 'MIN' : 'MAX';
    const w = requireSameBitWidth(values, op);
    let best = String(values[0]).padStart(w, '0');
    let bestN = unsignedBinToBigInt(best);
    for (let i = 1; i < values.length; i++) {
      const s = String(values[i]).padStart(w, '0');
      const n = unsignedBinToBigInt(s);
      if (pickMin ? n < bestN : n > bestN) {
        bestN = n;
        best = s;
      }
    }
    return best;
  }

  function minMaxVectorTagged(args, getWire, fnName, pickMin, signed, evalFns, pickMinMaxSigned) {
    const { classified, meta } = requireVectorTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const N = meta.elementCount;
    const results = [];
    for (let i = 0; i < N; i++) {
      const vals = elementValuesAtIndex(
        args, classified, i, evalFns.evalElement, evalFns.evalScalar
      );
      requireValuesElementWidth(vals, W, fnName);
      const padded = vals.map((v) => String(v).padStart(W, '0'));
      const best = signed && pickMinMaxSigned
        ? pickMinMaxSigned(padded, pickMin)
        : pickMinMaxUnsigned(padded, pickMin);
      results.push(best);
    }
    return results.join('');
  }

  function sumVectorTagged(args, getWire, fnName, signed, evalFns) {
    const { classified, meta } = requireVectorTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const N = meta.elementCount;
    const results = [];
    const overs = [];
    for (let i = 0; i < N; i++) {
      const vals = elementValuesAtIndex(
        args, classified, i, evalFns.evalElement, evalFns.evalScalar
      );
      requireValuesElementWidth(vals, W, fnName);
      const padded = vals.map((v) => String(v).padStart(W, '0'));
      const step = sumExpanded(padded, W, signed);
      results.push(step.result);
      overs.push(step.over);
    }
    return { resultBlob: results.join(''), overBlob: overs.join('') };
  }

  function subtractUnsignedAtWidth(a, b, width) {
    const depth = width;
    const aNum = unsignedBinToBigInt(String(a).padStart(depth, '0'));
    const bNum = unsignedBinToBigInt(String(b).padStart(depth, '0'));
    let diff = aNum - bNum;
    const wrap = BigInt(1) << BigInt(depth);
    const mask = wrap - BigInt(1);
    const flag = diff < BigInt(0) ? '1' : '0';
    if (diff < BigInt(0)) diff = diff + wrap;
    const result = (diff & mask).toString(2).padStart(depth, '0');
    return { result, flag };
  }

  function addSubtractVectorElementwise(W, N, getAbAtIndex, fnName, applyAtWidth) {
    const results = [];
    const flags = [];
    for (let i = 0; i < N; i++) {
      const { a, b } = getAbAtIndex(i);
      requireValuesElementWidth([a, b], W, fnName);
      const step = applyAtWidth(String(a).padStart(W, '0'), String(b).padStart(W, '0'), W);
      results.push(step.result);
      flags.push(String(step.flag).padStart(W, '0'));
    }
    return { resultBlob: results.join(''), flagBlob: flags.join('') };
  }

  function addSubtractVectorTagged(args, getWire, fnName, evalFns, applyAtWidth) {
    if (args.length !== 2) {
      throw new Error(`${fnName}: expects 2 arguments`);
    }
    const { classified, meta } = requireVectorTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const N = meta.elementCount;
    return addSubtractVectorElementwise(W, N, (i) => {
      const vals = elementValuesAtIndex(
        args, classified, i, evalFns.evalElement, evalFns.evalScalar
      );
      return { a: vals[0], b: vals[1] };
    }, fnName, applyAtWidth);
  }

  function addSubtractVectorBroadcastPair(pair, args, fnName, evalFns, applyAtWidth) {
    const W = pair.meta.elementWidth;
    const N = pair.meta.elementCount;
    if (pair.mode === 'vectorScalar') {
      const scalar = String(evalFns.evalScalar(args[pair.scalarArg])).padStart(W, '0');
      if (scalar.length !== W) {
        throw new Error(`${fnName}: ${SHAPE_ERR}`);
      }
      const varName = args[pair.vectorArg][0].var;
      return addSubtractVectorElementwise(W, N, (i) => ({
        a: evalFns.evalElement(varName, i),
        b: scalar,
      }), fnName, applyAtWidth);
    }
    const varA = args[0][0].var;
    const varB = args[1][0].var;
    return addSubtractVectorElementwise(W, N, (i) => ({
      a: evalFns.evalElement(varA, i),
      b: evalFns.evalElement(varB, i),
    }), fnName, applyAtWidth);
  }

  function clampVectorTagged(args, getWire, fnName, evalFns, clampAtWidth) {
    if (args.length !== 3) {
      throw new Error(`${fnName}: expects 3 arguments`);
    }
    const { classified, meta } = requireVectorTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const N = meta.elementCount;
    const results = [];
    for (let i = 0; i < N; i++) {
      const vals = elementValuesAtIndex(
        args, classified, i, evalFns.evalElement, evalFns.evalScalar
      );
      requireValuesElementWidth(vals, W, fnName);
      const x = String(vals[0]).padStart(W, '0');
      const lo = String(vals[1]).padStart(W, '0');
      const hi = String(vals[2]).padStart(W, '0');
      results.push(clampAtWidth(x, lo, hi));
    }
    return results.join('');
  }

  function multiplyUnsignedAtWidth(a, b, width) {
    const ap = String(a).padStart(width, '0');
    const bp = String(b).padStart(width, '0');
    const product = unsignedBinToBigInt(ap) * unsignedBinToBigInt(bp);
    const mask = (BigInt(1) << BigInt(width)) - BigInt(1);
    const result = (product & mask).toString(2).padStart(width, '0');
    const over = ((product >> BigInt(width)) & mask).toString(2).padStart(width, '0');
    return { result, over };
  }

  function multiplyVectorTagged(args, getWire, fnName, signed, evalFns, multiplyAtWidthFn) {
    if (args.length !== 2) {
      throw new Error(`${fnName}: expects 2 arguments`);
    }
    const { classified, meta } = requireVectorTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const N = meta.elementCount;
    const results = [];
    const overs = [];
    for (let i = 0; i < N; i++) {
      const vals = elementValuesAtIndex(
        args, classified, i, evalFns.evalElement, evalFns.evalScalar
      );
      requireValuesElementWidth(vals, W, fnName);
      const step = multiplyAtWidthFn(
        String(vals[0]).padStart(W, '0'),
        String(vals[1]).padStart(W, '0'),
        W,
        signed
      );
      results.push(step.result);
      overs.push(step.over);
    }
    return { resultBlob: results.join(''), overBlob: overs.join('') };
  }

  function macVectorTagged(args, getWire, fnName, signed, evalFns, macAtWidthFn) {
    if (args.length !== 3) {
      throw new Error(`${fnName}: expects 3 arguments`);
    }
    const { classified, meta } = requireVectorTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const N = meta.elementCount;
    const results = [];
    const overs = [];
    for (let i = 0; i < N; i++) {
      const vals = elementValuesAtIndex(
        args, classified, i, evalFns.evalElement, evalFns.evalScalar
      );
      requireValuesElementWidth(vals, W, fnName);
      const acc = String(vals[0]).padStart(W, '0');
      const a = String(vals[1]).padStart(W, '0');
      const b = String(vals[2]).padStart(W, '0');
      const step = macAtWidthFn(acc, a, b, signed);
      results.push(step.result);
      overs.push(step.over);
    }
    return { resultBlob: results.join(''), overBlob: overs.join('') };
  }

  function divideVectorTagged(args, getWire, fnName, signed, evalFns, divideAtWidthFn) {
    if (args.length !== 2) {
      throw new Error(`${fnName}: expects 2 arguments`);
    }
    const { classified, meta } = requireVectorTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const N = meta.elementCount;
    const results = [];
    const mods = [];
    for (let i = 0; i < N; i++) {
      const vals = elementValuesAtIndex(
        args, classified, i, evalFns.evalElement, evalFns.evalScalar
      );
      requireValuesElementWidth(vals, W, fnName);
      const step = divideAtWidthFn(
        String(vals[0]).padStart(W, '0'),
        String(vals[1]).padStart(W, '0'),
        W,
        signed
      );
      results.push(step.result);
      mods.push(step.mod);
    }
    return { resultBlob: results.join(''), modBlob: mods.join('') };
  }

  function requireVectorTaggedUnaryOperand(args, getWire, fnName) {
    if (!args || args.length !== 1) {
      throw new Error(`${fnName}: expects 1 argument`);
    }
    const info = classifyVectorTaggedOperands(args, getWire);
    if (!info.hasWholeVector) {
      throw new Error(`${fnName}: remove '; vector' — no argument is a whole vector`);
    }
    if (!info.meta) {
      throw new Error(`${fnName}: internal error (vector meta missing)`);
    }
    return { classified: info.classified, meta: info.meta };
  }

  function requireVectorTaggedSameCount(args, getWire, fnName, minArgs, maxArgs) {
    if (!args || args.length < minArgs || args.length > maxArgs) {
      const range = minArgs === maxArgs ? String(minArgs) : `${minArgs} to ${maxArgs}`;
      throw new Error(`${fnName}: expects ${range} arguments`);
    }
    const info = classifyVectorTaggedOperands(args, getWire);
    if (!info.hasWholeVector) {
      throw new Error(`${fnName}: remove '; vector' — no argument is a whole vector`);
    }
    let elementCount = null;
    for (const c of info.classified) {
      if (!c.wholeVector) continue;
      const m = getWholeVectorMeta(args[c.argIndex], getWire);
      if (elementCount == null) elementCount = m.elementCount;
      else if (elementCount !== m.elementCount) {
        throw new Error(`${fnName}: vector arguments must have the same element count`);
      }
    }
    if (elementCount == null) {
      throw new Error(`${fnName}: internal error (vector meta missing)`);
    }
    return { classified: info.classified, elementCount };
  }

  function resolveValueAtIndex(args, classified, argIndex, index, evalFns) {
    const c = classified[argIndex];
    if (c.wholeVector) {
      const atom = args[argIndex][0];
      return evalFns.evalElement(atom.var, index);
    }
    return evalFns.evalScalar(args[argIndex]);
  }

  function parseShiftCount(countVal) {
    return Math.max(0, parseInt(String(countVal), 2) || 0);
  }

  function logicalLshift(data, n, fill) {
    const fillBit = fill == null || fill === '' ? '0' : String(fill)[0];
    const amount = Math.max(0, parseInt(String(n), 2) || 0);
    return String(data) + fillBit.repeat(amount);
  }

  function logicalRshift(data, n, fill) {
    const d = String(data);
    const len = d.length;
    const fillBit = fill == null || fill === '' ? '0' : String(fill)[0];
    const amount = Math.max(0, parseInt(String(n), 2) || 0);
    if (amount >= len) return fillBit.repeat(len);
    return fillBit.repeat(amount) + d.slice(0, len - amount);
  }

  function rotateLeft(data, count) {
    const d = String(data);
    const len = d.length;
    if (len === 0) return '';
    const n = parseInt(String(count), 2) % len;
    return d.slice(n) + d.slice(0, n);
  }

  function rotateRight(data, count) {
    const d = String(data);
    const len = d.length;
    if (len === 0) return '';
    const n = parseInt(String(count), 2) % len;
    return d.slice(len - n) + d.slice(0, len - n);
  }

  function reverseBitsString(data) {
    return String(data).split('').reverse().join('');
  }

  function resolveDataWidth(args, classified, evalFns) {
    if (classified[0].wholeVector) {
      const atom = args[0][0];
      const sample = evalFns.evalElement(atom.var, 0);
      return String(sample).length;
    }
    const scalar = String(evalFns.evalScalar(args[0]));
    return scalar.length;
  }

  function compareVectorTagged(args, getWire, fnName, op, signed, evalFns, compareFns) {
    if (args.length !== 2) {
      throw new Error(`${fnName}: expects 2 arguments`);
    }
    const { classified, meta } = requireVectorTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const N = meta.elementCount;
    const bits = [];
    for (let i = 0; i < N; i++) {
      const vals = elementValuesAtIndex(
        args, classified, i, evalFns.evalElement, evalFns.evalScalar
      );
      requireValuesElementWidth(vals, W, fnName);
      const a = String(vals[0]).padStart(W, '0');
      const b = String(vals[1]).padStart(W, '0');
      if (op === 'EQ') {
        bits.push(a === b ? '1' : '0');
      } else {
        const cmp = signed && compareFns.signed
          ? compareFns.signed(a, b)
          : compareFns.unsigned(a, b);
        if (op === 'GT') bits.push(cmp > 0 ? '1' : '0');
        else if (op === 'LT') bits.push(cmp < 0 ? '1' : '0');
      }
    }
    return bits.join('');
  }

  function shiftVectorTagged(args, getWire, fnName, op, signed, evalFns, shiftFns) {
    const { classified, elementCount } = requireVectorTaggedSameCount(
      args, getWire, fnName, 2, 3
    );
    const N = elementCount;
    const W = resolveDataWidth(args, classified, evalFns);
    if (op === 'LSHIFT' && classified[1].wholeVector) {
      throw new Error(`${fnName}: with '; vector', shift count must be a scalar (broadcast)`);
    }
    const scalarCount = !classified[1].wholeVector
      ? parseShiftCount(evalFns.evalScalar(args[1]))
      : null;
    const fill = args.length === 3
      ? String(evalFns.evalScalar(args[2]))[0] || '0'
      : '0';
    const results = [];
    for (let i = 0; i < N; i++) {
      const dataVal = String(resolveValueAtIndex(args, classified, 0, i, evalFns)).padStart(W, '0');
      if (dataVal.length !== W) {
        throw new Error(`${fnName}: ${SHAPE_ERR}`);
      }
      const countVal = classified[1].wholeVector
        ? resolveValueAtIndex(args, classified, 1, i, evalFns)
        : args[1];
      const n = classified[1].wholeVector
        ? parseShiftCount(countVal)
        : scalarCount;
      let out;
      if (op === 'LSHIFT') {
        out = shiftFns.lshift(dataVal, n, fill);
      } else if (signed && shiftFns.arithmeticRshift) {
        out = shiftFns.arithmeticRshift(dataVal, n);
      } else {
        out = shiftFns.rshift(dataVal, n, fill);
      }
      results.push(out);
    }
    return results.join('');
  }

  function rotateVectorTagged(args, getWire, fnName, op, evalFns) {
    const { classified, elementCount } = requireVectorTaggedSameCount(
      args, getWire, fnName, 2, 2
    );
    const N = elementCount;
    const W = resolveDataWidth(args, classified, evalFns);
    const results = [];
    for (let i = 0; i < N; i++) {
      const dataVal = String(resolveValueAtIndex(args, classified, 0, i, evalFns)).padStart(W, '0');
      if (dataVal.length !== W) {
        throw new Error(`${fnName}: ${SHAPE_ERR}`);
      }
      const countVal = resolveValueAtIndex(args, classified, 1, i, evalFns);
      const out = op === 'LROTATE'
        ? rotateLeft(dataVal, countVal)
        : rotateRight(dataVal, countVal);
      results.push(out);
    }
    return results.join('');
  }

  function reverseVectorTagged(args, getWire, fnName, evalFns) {
    const { meta } = requireVectorTaggedUnaryOperand(args, getWire, fnName);
    const W = meta.elementWidth;
    const N = meta.elementCount;
    const atom = args[0][0];
    const results = [];
    for (let i = 0; i < N; i++) {
      const dataVal = String(evalFns.evalElement(atom.var, i)).padStart(W, '0');
      if (dataVal.length !== W) {
        throw new Error(`${fnName}: ${SHAPE_ERR}`);
      }
      results.push(reverseBitsString(dataVal));
    }
    return results.join('');
  }

  function findVectorExtremumIndex(values, W, pickMax, signed, compareFns, fnName) {
    const N = values.length;
    if (N === 0) {
      throw new Error(`${fnName}: vector has zero elements`);
    }
    let bestIdx = 0;
    let best = String(values[0]).padStart(W, '0');
    if (best.length !== W) {
      throw new Error(`${fnName}: ${SHAPE_ERR}`);
    }
    for (let i = 1; i < N; i++) {
      const v = String(values[i]).padStart(W, '0');
      if (v.length !== W) {
        throw new Error(`${fnName}: ${SHAPE_ERR}`);
      }
      const cmp = signed && compareFns.signed
        ? compareFns.signed(v, best)
        : compareFns.unsigned(v, best);
      if (pickMax ? cmp > 0 : cmp < 0) {
        bestIdx = i;
        best = v;
      }
    }
    const oneHot = '0'.repeat(bestIdx) + '1' + '0'.repeat(N - bestIdx - 1);
    return { bestIdx, oneHot, elementCount: N };
  }

  function argExtremumFromWholeVector(args, getWire, fnName, pickMax, signed, evalFns, compareFns) {
    if (!args || args.length !== 1) {
      throw new Error(`${fnName}: expects 1 argument`);
    }
    if (!isWholeVectorWireArg(args[0], getWire)) {
      throw new Error(`${fnName}: expects one whole vector argument`);
    }
    const meta = getWholeVectorMeta(args[0], getWire);
    const N = meta.elementCount;
    const W = meta.elementWidth;
    const varName = args[0][0].var;
    const values = [];
    for (let i = 0; i < N; i++) {
      values.push(evalFns.evalElement(varName, i));
    }
    return findVectorExtremumIndex(values, W, pickMax, signed, compareFns, fnName);
  }

  const api = {
    unsignedBinToBigInt,
    isReductionWireAtom,
    isWholeVectorWireArg,
    isVectorSliceArg,
    getWholeVectorMeta,
    requireSameBitWidth,
    sumUnsignedExpanded,
    sumExpanded,
    dotUnsignedExpanded,
    dotExpanded,
    getVectorBroadcastPair,
    addUnsignedAtWidth,
    subtractUnsignedAtWidth,
    classifyVectorTaggedOperands,
    requireVectorTaggedOperands,
    elementValuesAtIndex,
    minMaxVectorTagged,
    sumVectorTagged,
    addSubtractVectorTagged,
    addSubtractVectorBroadcastPair,
    clampVectorTagged,
    multiplyUnsignedAtWidth,
    multiplyVectorTagged,
    macVectorTagged,
    divideVectorTagged,
    requireVectorTaggedUnaryOperand,
    requireVectorTaggedSameCount,
    logicalLshift,
    logicalRshift,
    rotateLeft,
    rotateRight,
    reverseBitsString,
    compareVectorTagged,
    shiftVectorTagged,
    rotateVectorTagged,
    reverseVectorTagged,
    findVectorExtremumIndex,
    argExtremumFromWholeVector,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptVectorReduce = api;
})(typeof window !== 'undefined' ? window : global);
