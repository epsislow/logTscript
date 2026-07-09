/* ================= WAVE LISTEN VALUE FORMATTING ================= */

const WAVE_LISTEN_EXPAND_THRESHOLD = 256;
const WAVE_LISTEN_INLINE_PREVIEW_MAX = 48;
const WAVE_LISTEN_FMT_OPTIONS = ['auto', 'hex', 'bin', 'dec', 'ascii', 's8', 'q4p4', 'fp16', 'bf16'];
const WAVE_LISTEN_BIN_GROUP_BITS = 8;

function normalizeWaveListenFmt(fmt) {
  if (WAVE_LISTEN_FMT_OPTIONS.includes(fmt)) return fmt;
  if (fmt === 'short') return 'hex';
  return 'hex';
}

function waveListenFormatWidth(fmt) {
  switch (fmt) {
    case 'dec':
    case 's8':
    case 'q4p4':
    case 'ascii':
      return 8;
    case 'fp16':
    case 'bf16':
      return 16;
    default:
      return null;
  }
}

function waveListenFmtToShowOpts(fmt) {
  switch (fmt) {
    case 'bin': return { bin: true };
    case 'hex': return { hex: true };
    case 'dec': return { dec: true };
    case 's8': return { numericFormat: 's8' };
    case 'q4p4': return { numericFormat: 'q4p4' };
    case 'fp16': return { numericFormat: 'fp16' };
    case 'bf16': return { numericFormat: 'bf16' };
    case 'ascii': return { ascii: true };
    default: return { hex: true };
  }
}

function _tensorUsesShowLines(entry, fmt) {
  const meta = entry && entry.tensorMeta;
  const fw = waveListenFormatWidth(fmt);
  if (!meta || !fw) return false;
  return meta.elementWidth === fw;
}

function formatWaveListenBinary(binStr) {
  if (!binStr) return '';
  if (typeof LogicValue !== 'undefined'
    && typeof LogicValue.stringHasLogicXZ === 'function'
    && LogicValue.stringHasLogicXZ(binStr)) {
    return typeof LogicValue.groupBinaryDisplay === 'function'
      ? LogicValue.groupBinaryDisplay(binStr, WAVE_LISTEN_BIN_GROUP_BITS)
      : binStr.match(new RegExp(`.{1,${WAVE_LISTEN_BIN_GROUP_BITS}}`, 'g')).join(' ');
  }
  return binStr.match(new RegExp(`.{1,${WAVE_LISTEN_BIN_GROUP_BITS}}`, 'g')).join(' ');
}

function splitWaveListenBinaryGroups(binStr) {
  if (!binStr) return [];
  if (typeof LogicValue !== 'undefined'
    && typeof LogicValue.stringHasLogicXZ === 'function'
    && LogicValue.stringHasLogicXZ(binStr)) {
    const grouped = typeof LogicValue.groupBinaryDisplay === 'function'
      ? LogicValue.groupBinaryDisplay(binStr, WAVE_LISTEN_BIN_GROUP_BITS)
      : binStr.match(new RegExp(`.{1,${WAVE_LISTEN_BIN_GROUP_BITS}}`, 'g')).join(' ');
    return grouped.split(' ').filter(Boolean);
  }
  const groups = [];
  for (let i = 0; i < binStr.length; i += WAVE_LISTEN_BIN_GROUP_BITS) {
    groups.push(binStr.substring(i, i + WAVE_LISTEN_BIN_GROUP_BITS));
  }
  return groups;
}

function wrapBinaryGroupLines(binStr, maxRowChars) {
  const max = maxRowChars != null ? maxRowChars : (
    typeof PACKET_WRAP_MAX_CHARS !== 'undefined' ? PACKET_WRAP_MAX_CHARS : 40
  );
  const groups = splitWaveListenBinaryGroups(binStr);
  if (!groups.length) return [];
  const lines = [];
  let line = '';
  for (const group of groups) {
    const sep = line ? ' ' : '';
    if (line.length + sep.length + group.length <= max) {
      line += sep + group;
    } else {
      if (line) lines.push(line);
      line = group;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function splitGroupedLiteralParts(formatted) {
  const s = String(formatted == null ? '' : formatted);
  let suffix = '';
  let body = s;
  const semiMatch = s.match(/;([a-z0-9]+)$/i);
  if (semiMatch) {
    suffix = ';' + semiMatch[1];
    body = s.slice(0, -suffix.length).trim();
  }
  let remainder = '';
  const plusIdx = body.lastIndexOf(' + ');
  if (plusIdx >= 0) {
    const tail = body.slice(plusIdx + 3);
    if (!tail.includes('\\') && /^[01XZxz+\s]+$/.test(tail)) {
      remainder = tail;
      body = body.slice(0, plusIdx).trim();
    }
  }
  const tokens = body.length ? body.split(/\s+/).filter(Boolean) : [];
  return { tokens, suffix, remainder };
}

function wrapLiteralTokenLines(formatted, maxRowChars) {
  const max = maxRowChars != null ? maxRowChars : (
    typeof PACKET_WRAP_MAX_CHARS !== 'undefined' ? PACKET_WRAP_MAX_CHARS : 40
  );
  const { tokens, suffix, remainder } = splitGroupedLiteralParts(formatted);
  if (!tokens.length && !remainder) return formatted ? [formatted] : [];
  const lines = [];
  let line = '';
  for (const token of tokens) {
    const sep = line ? ' ' : '';
    if (line.length + sep.length + token.length <= max) {
      line += sep + token;
    } else {
      if (line) lines.push(line);
      line = token;
    }
  }
  if (line) lines.push(line);
  if (lines.length && suffix) {
    lines[lines.length - 1] += suffix;
  } else if (suffix) {
    lines.push(suffix);
  }
  if (remainder) {
    if (lines.length) lines[lines.length - 1] += ' + ' + remainder;
    else lines.push(remainder);
  }
  return lines.length ? lines : [formatted];
}

function _formatFlatGrouped(rawValue, fmt) {
  const NF = typeof LogTScriptNumericFormats !== 'undefined' ? LogTScriptNumericFormats : null;
  if (!NF || typeof NF.formatGroupedShow !== 'function') return String(rawValue);
  if (fmt === 'dec') return NF.formatGroupedShow(rawValue, '8');
  if (fmt === 'ascii') return NF.formatGroupedShow(rawValue, 'ascii');
  return NF.formatGroupedShow(rawValue, fmt);
}

function _byteValFromBin(byteBin) {
  if (!byteBin || byteBin.length !== 8) return null;
  if (/[XZ]/i.test(byteBin)) return null;
  const val = parseInt(byteBin, 2);
  return Number.isNaN(val) ? null : val;
}

function _wireStringCharEncode(val) {
  switch (val) {
    case 0: return '\\0';
    case 8: return '\\b';
    case 9: return '\\t';
    case 10: return '\\n';
    case 13: return '\\r';
    case 92: return '\\\\';
    case 34: return '\\"';
    default:
      if (val >= 32 && val <= 126) return String.fromCharCode(val);
      return null;
  }
}

function _canEmbedInWireString(val) {
  return _wireStringCharEncode(val) != null;
}

function _isDecimalLiteralPart(part) {
  return /^\\-?\d+(?:\.\d+)?$/.test(String(part));
}

/**
 * Script-ready ASCII copy: coalesce printable runs into "abc", isolated bytes as \N,
 * join with + ;ascii only on pure decimal groups (2+ atoms). See wire-literals.md.
 */
function formatWaveListenAsciiCopy(rawValue, bitWidth, formatValueFn) {
  const bits = String(rawValue == null ? '' : rawValue);
  if (!bits) return '""';
  if (typeof LogicValue !== 'undefined'
    && typeof LogicValue.stringHasLogicXZ === 'function'
    && LogicValue.stringHasLogicXZ(bits)) {
    const displayed = _waveListenHexDisplay(rawValue, bitWidth, formatValueFn);
    return String(displayed).replace(/\s/g, '');
  }

  const parts = [];
  let strRun = [];

  function flushStrRun() {
    if (!strRun.length) return;
    let inner = '';
    for (const v of strRun) inner += _wireStringCharEncode(v);
    parts.push('"' + inner + '"');
    strRun = [];
  }

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const val = _byteValFromBin(bits.substring(i, i + 8));
    if (val != null && _canEmbedInWireString(val)) {
      strRun.push(val);
    } else {
      flushStrRun();
      if (val != null) parts.push('\\' + val);
      else parts.push(bits.substring(i, i + 8));
    }
  }
  flushStrRun();

  const remBits = bits.length % 8 ? bits.substring(Math.floor(bits.length / 8) * 8) : null;

  let result;
  if (parts.length === 1 && parts[0].startsWith('"')) {
    result = parts[0];
  } else if (parts.length > 0 && parts.every((p) => _isDecimalLiteralPart(p))) {
    result = parts.length === 1 ? parts[0] : parts.join(' ') + ';ascii';
  } else if (parts.length > 0) {
    result = parts.join(' + ');
  } else {
    result = '""';
  }

  if (remBits) result += (result ? ' + ' : '') + remBits;
  return result;
}

function _waveListenAsciiDisplay(rawValue, bitWidth) {
  const DF = typeof LogTScriptDebugDisplayFormat !== 'undefined' ? LogTScriptDebugDisplayFormat : null;
  const bw = bitWidth || (rawValue ? rawValue.length : 0);
  if (DF && typeof DF.formatDebugDisplayValue === 'function') {
    return DF.formatDebugDisplayValue(rawValue, bw, { ascii: true }, false, bw);
  }
  return rawValue;
}

function _waveListenHexDisplay(rawValue, bitWidth, formatValueFn) {
  const DF = typeof LogTScriptDebugDisplayFormat !== 'undefined' ? LogTScriptDebugDisplayFormat : null;
  const bw = bitWidth || (rawValue ? rawValue.length : 0);
  if (DF) {
    if (bw >= 32 && typeof DF.formatHexGroupedDisplay === 'function') {
      return DF.formatHexGroupedDisplay(rawValue, bw);
    }
    if (typeof DF.formatHexTagDisplay === 'function') {
      return DF.formatHexTagDisplay(rawValue, bw, bw >= 32);
    }
    if (typeof DF.formatDebugDisplayValue === 'function') {
      return DF.formatDebugDisplayValue(rawValue, bw, { hex: true }, false, bw);
    }
  }
  if (formatValueFn) return formatValueFn(rawValue, bw);
  return rawValue;
}

function _tensorUsesSchemaAuto(entry, fmt) {
  return fmt === 'auto' && entry && entry.schemaRef && entry.tensorMeta;
}

function _waveListenVectorSchemaLines(entry, rawValue, interp) {
  if (!entry || !entry.tensorMeta || !entry.schemaRef || !interp
      || typeof interp._formatVectorShowLines !== 'function') {
    return null;
  }
  return interp._formatVectorShowLines(entry.name, rawValue, null);
}

function _waveListenVectorSchemaInline(entry, rawValue, interp) {
  const lines = _waveListenVectorSchemaLines(entry, rawValue, interp);
  if (!lines || !lines.length) return null;
  const cells = lines.filter((l) => l.startsWith(':'));
  if (cells.length) return cells.join(' ');
  return lines.join(' ');
}

function _formatWaveListenScalarFormatted(rawValue, bitWidth, fmt, formatValueFn, interp, entry) {
  if (fmt === 'auto') {
    if (_tensorUsesSchemaAuto(entry, fmt)) {
      const summary = _waveListenVectorSchemaInline(entry, rawValue, interp);
      if (summary) return summary;
    }
    const SS = typeof LogTScriptSemanticSchemas !== 'undefined' ? LogTScriptSemanticSchemas : null;
    if (SS && entry && entry.schemaRef && interp && interp.schemaRegistry) {
      try {
        const schema = SS.resolveSchema(interp.schemaRegistry, entry.schemaRef);
        SS.validateSchemaWidthForShow(schema, bitWidth || rawValue.length);
        return SS.formatSchemaShowInline(rawValue, schema, null, formatValueFn);
      } catch (e) {
        return _waveListenHexDisplay(rawValue, bitWidth, formatValueFn);
      }
    }
    return _waveListenHexDisplay(rawValue, bitWidth, formatValueFn);
  }
  if (fmt === 'bin') return formatWaveListenBinary(rawValue);
  if (fmt === 'hex') return _waveListenHexDisplay(rawValue, bitWidth, formatValueFn);
  if (fmt === 'ascii') {
    if (_tensorUsesShowLines(entry, fmt) && interp
      && typeof interp._formatVectorShowLines === 'function') {
      const lines = interp._formatVectorShowLines(entry.name, rawValue, waveListenFmtToShowOpts(fmt));
      if (lines && lines.length) {
        const header = lines.find((l) => l.includes('=')) || lines[0];
        const eq = header.indexOf('=');
        return eq >= 0 ? header.slice(eq + 1).replace(/\s*\(\d+bit\)\s*$/, '').trim() : header;
      }
    }
    return _waveListenAsciiDisplay(rawValue, bitWidth);
  }
  if (['dec', 's8', 'q4p4', 'fp16', 'bf16'].includes(fmt)) {
    if (_tensorUsesShowLines(entry, fmt) && interp
      && typeof interp._formatVectorShowLines === 'function') {
      const lines = interp._formatVectorShowLines(entry.name, rawValue, waveListenFmtToShowOpts(fmt));
      if (lines && lines.length) {
        const header = lines.find((l) => l.includes('=')) || lines[0];
        const eq = header.indexOf('=');
        return eq >= 0 ? header.slice(eq + 1).replace(/\s*\(\d+bit\)\s*$/, '').trim() : header;
      }
    }
    return _formatFlatGrouped(rawValue, fmt);
  }
  return _waveListenHexDisplay(rawValue, bitWidth, formatValueFn);
}

function waveListenPayloadPrefix(payload) {
  const wave = payload.wave != null ? payload.wave : '?';
  const label = payload.label || 'commit';
  const name = payload.name != null ? payload.name : '?';
  return `[wave ${wave}] ${label} ${name}`;
}

function _bitsSuffix(entry) {
  const bw = entry.bitWidth || (entry.rawValue ? entry.rawValue.length : 0);
  let s = `(${bw}bits)`;
  if (entry.tensorMeta) {
    s += ` ${_tensorShapeLabel(entry.tensorMeta)}`;
  }
  return s;
}

function waveListenPayloadToText(payload, formatValueFn) {
  if (typeof payload === 'string') return payload;
  if (!payload || payload.name == null) return String(payload);
  const prefix = waveListenPayloadPrefix(payload);
  const inline = formatWaveListenInline(payload, 'hex', formatValueFn);
  return `${prefix} = ${inline}`;
}

function _truncatePreview(text, maxLen) {
  const s = String(text);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

function _tensorShapeLabel(tensorMeta) {
  if (!tensorMeta) return '';
  return tensorMeta.isMatrix
    ? `[${tensorMeta.rows}×${tensorMeta.cols}]`
    : `[${tensorMeta.elementCount}]`;
}

function formatWaveListenInline(entry, fmt, formatValueFn, interp) {
  const rawValue = entry.rawValue;
  if (rawValue == null) return '∅';
  const bitWidth = entry.bitWidth || rawValue.length;
  const mode = normalizeWaveListenFmt(fmt);

  let valuePart;
  if (bitWidth <= WAVE_LISTEN_EXPAND_THRESHOLD) {
    valuePart = _formatWaveListenScalarFormatted(
      rawValue, bitWidth, mode, formatValueFn, interp, entry
    );
  } else {
    valuePart = _truncatePreview(
      _formatWaveListenScalarFormatted(rawValue, bitWidth, mode, formatValueFn, interp, entry),
      WAVE_LISTEN_INLINE_PREVIEW_MAX
    );
  }

  return `${valuePart} ${_bitsSuffix(entry)}`;
}

function formatWaveListenExpandLines(entry, fmt, interp) {
  const { rawValue, bitWidth, name, tensorMeta } = entry;
  if (rawValue == null) return ['∅'];

  const bw = bitWidth || rawValue.length;
  const mode = normalizeWaveListenFmt(fmt);
  const formatValueFn = interp && typeof interp.formatValue === 'function'
    ? (v, w) => interp.formatValue(v, w)
    : null;

  if (mode === 'auto') {
    if (_tensorUsesSchemaAuto(entry, mode)) {
      const vlines = _waveListenVectorSchemaLines(entry, rawValue, interp);
      if (vlines && vlines.length) return vlines;
    }
    const SS = typeof LogTScriptSemanticSchemas !== 'undefined' ? LogTScriptSemanticSchemas : null;
    if (SS && entry.schemaRef && interp && interp.schemaRegistry) {
      try {
        const schema = SS.resolveSchema(interp.schemaRegistry, entry.schemaRef);
        SS.validateSchemaWidthForShow(schema, bw);
        return SS.formatSchemaShowLines(rawValue, schema, null, formatValueFn);
      } catch (e) {
        return wrapBinaryGroupLines(rawValue);
      }
    }
    return wrapBinaryGroupLines(rawValue);
  }

  if (tensorMeta && interp && typeof interp._formatVectorShowLines === 'function'
    && _tensorUsesShowLines(entry, mode)) {
    const lines = interp._formatVectorShowLines(name, rawValue, waveListenFmtToShowOpts(mode));
    if (lines && lines.length) return lines;
  }

  if (mode === 'bin') {
    return wrapBinaryGroupLines(rawValue);
  }

  if (mode === 'ascii') {
    const formatted = _waveListenAsciiDisplay(rawValue, bw);
    if (String(formatted).startsWith('"')) return [formatted];
    return wrapLiteralTokenLines(formatted);
  }

  if (['dec', 's8', 'q4p4', 'fp16', 'bf16'].includes(mode)) {
    return wrapLiteralTokenLines(_formatFlatGrouped(rawValue, mode));
  }

  const formatted = _waveListenHexDisplay(rawValue, bw, formatValueFn);
  if (typeof wrapFormattedPacket === 'function') {
    return wrapFormattedPacket(formatted);
  }
  return [formatted];
}

function formatWaveListenFullText(entry, fmt, interp) {
  return formatWaveListenCopyText(entry, fmt, interp);
}

function formatWaveListenCopyText(entry, fmt, interp) {
  if (!entry || entry.rawValue == null) return '';
  const rawValue = entry.rawValue;
  const bitWidth = entry.bitWidth || rawValue.length;
  const mode = normalizeWaveListenFmt(fmt);
  const formatValueFn = interp && typeof interp.formatValue === 'function'
    ? (v, w) => interp.formatValue(v, w)
    : null;

  if (mode === 'bin') return rawValue;

  if (mode === 'hex') {
    const displayed = _waveListenHexDisplay(rawValue, bitWidth, formatValueFn);
    return String(displayed).replace(/\s/g, '');
  }

  if (mode === 'ascii') {
    return formatWaveListenAsciiCopy(rawValue, bitWidth, formatValueFn);
  }

  if (['dec', 's8', 'q4p4', 'fp16', 'bf16'].includes(mode)) {
    return _formatFlatGrouped(rawValue, mode);
  }

  return rawValue;
}

function waveListenNeedsExpand(entry) {
  if (!entry || entry.rawValue == null) return false;
  const bw = entry.bitWidth || entry.rawValue.length;
  return bw > WAVE_LISTEN_EXPAND_THRESHOLD;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WAVE_LISTEN_EXPAND_THRESHOLD,
    WAVE_LISTEN_INLINE_PREVIEW_MAX,
    WAVE_LISTEN_FMT_OPTIONS,
    normalizeWaveListenFmt,
    waveListenFormatWidth,
    waveListenFmtToShowOpts,
    formatWaveListenBinary,
    splitWaveListenBinaryGroups,
    wrapBinaryGroupLines,
    wrapLiteralTokenLines,
    waveListenPayloadPrefix,
    waveListenPayloadToText,
    formatWaveListenInline,
    formatWaveListenExpandLines,
    formatWaveListenFullText,
    formatWaveListenCopyText,
    formatWaveListenAsciiCopy,
    waveListenNeedsExpand,
  };
}
