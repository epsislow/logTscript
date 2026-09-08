/**
 * Bound substreams and union-variant wire encoding for semantic schemas (F2a).
 */
(function (global) {
  'use strict';

  const BOUND_LEN_BITS = 16;
  const UNION_TAG_BITS = 4;

  function padUInt(value, width) {
    const v = Math.max(0, value | 0);
    let bits = v.toString(2);
    if (bits.length > width) bits = bits.substring(bits.length - width);
    return bits.padStart(width, '0');
  }

  function readUInt(bits, start, width) {
    const slice = bits.substring(start, start + width);
    if (!slice.length) return 0;
    return parseInt(slice, 2);
  }

  function packBoundPayload(payloadBits) {
    const payload = payloadBits == null ? '' : String(payloadBits);
    return padUInt(payload.length, BOUND_LEN_BITS) + payload;
  }

  function readBoundSubstream(wireBits, offset) {
    const off = offset || 0;
    const len = readUInt(wireBits, off, BOUND_LEN_BITS);
    const payloadStart = off + BOUND_LEN_BITS;
    const payloadEnd = payloadStart + len;
    return {
      len,
      payloadBits: wireBits.substring(payloadStart, payloadEnd),
      totalWidth: BOUND_LEN_BITS + len,
      nextOffset: payloadEnd,
    };
  }

  function packUnionPayload(variantIndex, payloadBits) {
    return padUInt(variantIndex, UNION_TAG_BITS) + (payloadBits == null ? '' : String(payloadBits));
  }

  function readUnionTag(wireBits, offset) {
    const off = offset || 0;
    return {
      tag: readUInt(wireBits, off, UNION_TAG_BITS),
      payloadStart: off + UNION_TAG_BITS,
    };
  }

  function schemaPayloadMinMax(schema) {
    if (!schema) return { min: 0, max: 0, open: false };
    if (schema.isUnionRoot) {
      let min = Infinity;
      let max = 0;
      let open = false;
      for (const v of schema.unionVariants || []) {
        const sub = v.schema;
        const mm = schemaPayloadMinMax(sub);
        if (mm.min < min) min = mm.min;
        if (mm.open) open = true;
        else if (mm.max > max) max = mm.max;
      }
      if (!Number.isFinite(min)) min = 0;
      return { min, max: open ? null : max, open };
    }
    if (schema.hasDynamicWidth) {
      return {
        min: schema.minWidth != null ? schema.minWidth : schema.totalWidth,
        max: schema.maxWidth,
        open: schema.maxWidth == null,
      };
    }
    const w = schema.totalWidth != null ? schema.totalWidth : 0;
    return { min: w, max: w, open: false };
  }

  function boundFieldMinMax(subSchema) {
    const mm = schemaPayloadMinMax(subSchema);
    return {
      minWidth: BOUND_LEN_BITS + mm.min,
      maxWidth: mm.open ? null : BOUND_LEN_BITS + mm.max,
      open: mm.open,
    };
  }

  function countUnionBranches(fieldValues, unionVariants) {
    let count = 0;
    let lastName = null;
    for (const v of unionVariants) {
      if (fieldValues[v.name] != null && fieldValues[v.name] !== '') {
        count++;
        lastName = v.name;
      }
    }
    return { count, lastName };
  }

  function validateUnionLiteral(fieldValues, unionVariants, schemaName) {
    const { count, lastName } = countUnionBranches(fieldValues, unionVariants);
    if (count === 0) {
      throw new Error(`Union schema '${schemaName}' requires exactly one branch; none provided`);
    }
    if (count > 1) {
      throw new Error(`Union schema '${schemaName}' allows at most one branch; multiple provided`);
    }
    return lastName;
  }

  function findUnionVariant(schema, name) {
    if (!schema || !schema.unionVariants) return null;
    return schema.unionVariants.find((v) => v.name === name) || null;
  }

  function findUnionVariantByIndex(schema, index) {
    if (!schema || !schema.unionVariants) return null;
    return schema.unionVariants[index] || null;
  }

  function expandInlineSchemaDecls(decls) {
    const out = [];
    const names = new Set();
    for (const decl of decls) {
      if (decl && decl.name) names.add(decl.name);
    }
    for (const decl of decls) {
      if (!decl || !decl.name) continue;
      const fields = (decl.fields || []).map((f) => ({ ...f }));
      for (const field of fields) {
        if (!field.inlineFields || !field.inlineFields.length) continue;
        const refName = field.ref;
        if (!names.has(refName)) {
          out.push({ name: refName, fields: field.inlineFields.map((x) => ({ ...x })) });
          names.add(refName);
        }
        delete field.inlineFields;
      }
      out.push({ name: decl.name, fields });
    }
    return out;
  }

  function detectUnionRoot(fields) {
    if (!fields || !fields.length) return false;
    return fields.every((f) => f.kind === 'union_variant');
  }

  const api = {
    BOUND_LEN_BITS,
    UNION_TAG_BITS,
    padUInt,
    readUInt,
    packBoundPayload,
    readBoundSubstream,
    packUnionPayload,
    readUnionTag,
    schemaPayloadMinMax,
    boundFieldMinMax,
    countUnionBranches,
    validateUnionLiteral,
    findUnionVariant,
    findUnionVariantByIndex,
    expandInlineSchemaDecls,
    detectUnionRoot,
  };

  global.LogTScriptSchemaBound = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
