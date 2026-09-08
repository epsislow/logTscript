/**
 * Bound substreams and presence_mask wire encoding for semantic schemas (F2a+).
 */
(function (global) {
  'use strict';

  const BOUND_LEN_BITS = 16;

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

  function packPresenceMask(presenceBits) {
    return presenceBits == null ? '' : String(presenceBits);
  }

  function readPresenceMask(wireBits, numBits, offset) {
    const off = offset || 0;
    const mask = wireBits.substring(off, off + numBits);
    return {
      mask,
      payloadStart: off + numBits,
    };
  }

  function buildPresenceMaskBits(optionalFields, fieldValues) {
    let mask = '';
    for (const field of optionalFields) {
      const val = fieldValues[field.name];
      const present = val != null && val !== '';
      mask += present ? '1' : '0';
    }
    return mask;
  }

  function schemaPayloadMinMax(schema) {
    if (!schema) return { min: 0, max: 0, open: false };
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

  function optionalFieldMinMax(subSchema, isBound) {
    if (isBound) {
      const mm = boundFieldMinMax(subSchema);
      return { minWidth: 0, maxWidth: mm.maxWidth, open: mm.open };
    }
    const mm = schemaPayloadMinMax(subSchema);
    return { minWidth: 0, maxWidth: mm.max, open: mm.open };
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
      out.push({
        name: decl.name,
        fields,
        hasPresenceMask: !!decl.hasPresenceMask,
      });
    }
    return out;
  }

  const api = {
    BOUND_LEN_BITS,
    padUInt,
    readUInt,
    packBoundPayload,
    readBoundSubstream,
    packPresenceMask,
    readPresenceMask,
    buildPresenceMaskBits,
    schemaPayloadMinMax,
    boundFieldMinMax,
    optionalFieldMinMax,
    expandInlineSchemaDecls,
  };

  global.LogTScriptSchemaBound = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
