/* ================= WAVE LISTEN VALUE FORMATTING ================= */

const WAVE_LISTEN_EXPAND_THRESHOLD = 256;
const WAVE_LISTEN_INLINE_PREVIEW_MAX = 48;
const WAVE_LISTEN_FMT_CYCLE = ['hex', 'bin'];
const WAVE_LISTEN_BIN_GROUP_BITS = 8;

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

function _waveListenHexDisplay(rawValue, bitWidth, formatValueFn) {
  const DF = typeof LogTScriptDebugDisplayFormat !== 'undefined' ? LogTScriptDebugDisplayFormat : null;
  if (DF && typeof DF.formatDebugDisplayValue === 'function') {
    return DF.formatDebugDisplayValue(rawValue, bitWidth, { hex: true }, false, bitWidth);
  }
  if (formatValueFn) return formatValueFn(rawValue, bitWidth);
  return rawValue;
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

function _formatWaveListenValuePart(rawValue, bitWidth, fmt, formatValueFn) {
  if (fmt === 'bin') return formatWaveListenBinary(rawValue);
  return _waveListenHexDisplay(rawValue, bitWidth, formatValueFn);
}

function _formatWaveListenLargePreview(rawValue, bitWidth, fmt, formatValueFn) {
  const formatted = fmt === 'bin'
    ? formatWaveListenBinary(rawValue)
    : _waveListenHexDisplay(rawValue, bitWidth, formatValueFn);
  return _truncatePreview(formatted, WAVE_LISTEN_INLINE_PREVIEW_MAX);
}

function formatWaveListenInline(entry, fmt, formatValueFn) {
  const rawValue = entry.rawValue;
  if (rawValue == null) return '∅';
  const bitWidth = entry.bitWidth || rawValue.length;
  const mode = fmt === 'bin' ? 'bin' : 'hex';

  let valuePart;
  if (bitWidth <= WAVE_LISTEN_EXPAND_THRESHOLD) {
    valuePart = _formatWaveListenValuePart(rawValue, bitWidth, mode, formatValueFn);
  } else {
    valuePart = _formatWaveListenLargePreview(rawValue, bitWidth, mode, formatValueFn);
  }

  return `${valuePart} ${_bitsSuffix(entry)}`;
}

function formatWaveListenExpandLines(entry, fmt, interp) {
  const { rawValue, bitWidth, name, tensorMeta } = entry;
  if (rawValue == null) return ['∅'];

  const bw = bitWidth || rawValue.length;
  const mode = fmt === 'bin' ? 'bin' : 'hex';
  const formatValueFn = interp && typeof interp.formatValue === 'function'
    ? (v, w) => interp.formatValue(v, w)
    : null;

  if (tensorMeta && interp && typeof interp._formatVectorShowLines === 'function') {
    let opts = null;
    if (mode === 'hex') opts = { hex: true };
    else if (mode === 'bin') opts = { bin: true };
    const lines = interp._formatVectorShowLines(name, rawValue, opts);
    if (lines && lines.length) return lines;
  }

  if (mode === 'bin') {
    return wrapBinaryGroupLines(rawValue);
  }

  const formatted = _waveListenHexDisplay(rawValue, bw, formatValueFn);
  if (typeof wrapFormattedPacket === 'function') {
    return wrapFormattedPacket(formatted);
  }
  return [formatted];
}

function formatWaveListenFullText(entry, fmt, interp) {
  return formatWaveListenExpandLines(entry, fmt, interp).join('\n');
}

function nextWaveListenFmt(current) {
  const i = WAVE_LISTEN_FMT_CYCLE.indexOf(current);
  if (i < 0) return WAVE_LISTEN_FMT_CYCLE[0];
  return WAVE_LISTEN_FMT_CYCLE[(i + 1) % WAVE_LISTEN_FMT_CYCLE.length];
}

function normalizeWaveListenFmt(fmt) {
  if (fmt === 'bin') return 'bin';
  return 'hex';
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
    WAVE_LISTEN_FMT_CYCLE,
    formatWaveListenBinary,
    splitWaveListenBinaryGroups,
    wrapBinaryGroupLines,
    waveListenPayloadPrefix,
    waveListenPayloadToText,
    formatWaveListenInline,
    formatWaveListenExpandLines,
    formatWaveListenFullText,
    nextWaveListenFmt,
    normalizeWaveListenFmt,
    waveListenNeedsExpand,
  };
}
