/**
 * Semantic schemas — named bit fields on wires (independent from numeric formats).
 */
(function (global) {
  'use strict';

  function buildSchemaDef(name, fieldSpecs) {
    const fields = [];
    let bitStart = 0;
    for (const spec of fieldSpecs) {
      const width = spec.width;
      if (!Number.isFinite(width) || width < 1) {
        throw new Error(`Invalid field width for '${spec.name}' in schema '${name}'`);
      }
      fields.push({
        name: spec.name,
        width,
        bitStart,
        bitEnd: bitStart + width - 1,
      });
      bitStart += width;
    }
    return { name, fields, totalWidth: bitStart };
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
    return schema.fields.find((f) => f.name === fieldName) || null;
  }

  function extractField(bits, schema, fieldName) {
    const field = getField(schema, fieldName);
    if (!field) throw new Error(`Unknown schema field '${fieldName}' in schema '${schema.name}'`);
    const s = bits == null ? '' : String(bits);
    const w = s.length;
    if (w < schema.totalWidth) {
      throw new Error(`Wire value shorter than schema '${schema.name}' (${w} < ${schema.totalWidth})`);
    }
    const slice = s.substring(field.bitStart, field.bitStart + field.width);
    return slice.padEnd(field.width, '0');
  }

  function packField(bits, schema, fieldName, fieldValue) {
    const field = getField(schema, fieldName);
    if (!field) throw new Error(`Unknown schema field '${fieldName}' in schema '${schema.name}'`);
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

  function buildSchemaLiteralBits(schema, fieldValues) {
    let bits = '0'.repeat(schema.totalWidth);
    for (const field of schema.fields) {
      if (Object.prototype.hasOwnProperty.call(fieldValues, field.name)) {
        const val = fieldValues[field.name];
        bits = packField(bits, schema, field.name, val);
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

  function formatSchemaShowLines(bits, schema, opts, formatValueFn, wireTypeLabel) {
    const lines = [];
    const header = wireTypeLabel
      ? `${wireTypeLabel}`
      : `${schema.totalWidth}wire<${schema.name}>`;
    lines.push(header);
    for (const field of schema.fields) {
      const fieldBits = extractField(bits, schema, field.name);
      const formatted = formatSchemaFieldValue(fieldBits, field.width, opts, formatValueFn);
      const padName = field.name.padEnd(10, ' ');
      lines.push(`  ${padName}= ${formatted}`);
    }
    return lines;
  }

  function formatSchemaShowInline(bits, schema, opts, formatValueFn) {
    const parts = [];
    for (const field of schema.fields) {
      const fieldBits = extractField(bits, schema, field.name);
      const formatted = formatSchemaFieldValue(fieldBits, field.width, opts, formatValueFn);
      parts.push(`${field.name}=${formatted}`);
    }
    return parts.join(' ');
  }

  function parseSchemaFieldLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return null;
    const m = /^(\w+)\s*:\s*(\d+)\s*$/.exec(trimmed);
    if (!m) throw new Error(`Invalid schema field line: '${trimmed}'`);
    return { name: m[1], width: parseInt(m[2], 10) };
  }

  function registerSchema(registry, schemaDef) {
    if (!registry) throw new Error('schema registry missing');
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
    return schema;
  }

  const api = {
    buildSchemaDef,
    validateSchemaWidth,
    validateSchemaWidthForShow,
    getField,
    extractField,
    packField,
    validateFieldBits,
    unsignedBitsToInt,
    buildSchemaLiteralBits,
    formatSchemaFieldValue,
    formatSchemaShowLines,
    formatSchemaShowInline,
    parseSchemaFieldLine,
    registerSchema,
    resolveSchema,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptSemanticSchemas = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global);
