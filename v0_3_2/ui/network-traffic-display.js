/* ================= NETWORK TRAFFIC DISPLAY HELPERS ================= */

const NETWORK_TRAFFIC_PAGE_SIZE = 5;
const PACKET_WRAP_MAX_CHARS = 40;

function trafficCellValue(entry, column) {
  switch (column) {
    case 'id': return String(entry.id);
    case 'source': return String(entry.source);
    case 'target': return String(entry.target);
    case 'channel': return String(entry.channel);
    case 'size': return String(entry.size);
    case 'status': return String(entry.status);
    default: return '';
  }
}

function parseNumericFilter(query) {
  const q = (query || '').trim();
  if (!q) return null;
  const rangeMatch = q.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (rangeMatch) {
    let min = parseInt(rangeMatch[1], 10);
    let max = parseInt(rangeMatch[2], 10);
    if (min > max) {
      const swap = min;
      min = max;
      max = swap;
    }
    return { type: 'range', min, max };
  }
  const singleMatch = q.match(/^(\d+)$/);
  if (singleMatch) {
    return { type: 'single', value: parseInt(singleMatch[1], 10) };
  }
  return { type: 'invalid' };
}

const parseIdFilter = parseNumericFilter;

function parseTargetFilter(query) {
  const q = (query || '').trim();
  if (!q) return null;
  if (q === '*') return { type: 'literal', value: '*' };
  return parseNumericFilter(q);
}

function matchNumericValue(value, parsed) {
  if (!parsed) return true;
  if (parsed.type === 'invalid') return false;
  const num = typeof value === 'number' ? value : parseInt(value, 10);
  if (Number.isNaN(num)) return false;
  if (parsed.type === 'single') return num === parsed.value;
  return num >= parsed.min && num <= parsed.max;
}

const matchEntryId = matchNumericValue;

function matchTargetValue(value, parsed) {
  if (!parsed) return true;
  if (parsed.type === 'literal') return String(value) === parsed.value;
  return matchNumericValue(value, parsed);
}

const TRAFFIC_NUMERIC_FILTER_COLS = ['id', 'source', 'size'];

function applyTrafficFilters(log, filters) {
  if (!log || !log.length) return [];
  const f = filters || {};
  return log.filter((entry) => {
    for (const col of TRAFFIC_NUMERIC_FILTER_COLS) {
      const parsed = parseNumericFilter(f[col]);
      if (parsed && !matchNumericValue(entry[col], parsed)) return false;
    }
    const targetParsed = parseTargetFilter(f.target);
    if (targetParsed && !matchTargetValue(entry.target, targetParsed)) return false;
    for (const col of ['channel']) {
      const q = (f[col] || '').trim();
      if (!q) continue;
      const cell = trafficCellValue(entry, col);
      if (cell.toLowerCase().indexOf(q.toLowerCase()) < 0) return false;
    }
    const statusQ = (f.status || '').trim();
    if (statusQ && trafficCellValue(entry, 'status') !== statusQ) return false;
    return true;
  });
}

function getFilteredTrafficLog(log, filters) {
  return applyTrafficFilters(log, filters).sort((a, b) => b.id - a.id);
}

function getDisplayPage(filtered, pageIndex) {
  const list = filtered || [];
  const total = list.length;
  const offset = Math.max(0, pageIndex || 0) * NETWORK_TRAFFIC_PAGE_SIZE;
  const entries = list.slice(offset, offset + NETWORK_TRAFFIC_PAGE_SIZE);
  const shown = entries.length;
  const rowStart = shown ? offset + 1 : 0;
  const rowEnd = offset + shown;
  return {
    entries,
    total,
    shown,
    rowStart,
    rowEnd,
    pageIndex: pageIndex || 0,
    pageSize: NETWORK_TRAFFIC_PAGE_SIZE,
  };
}

function formatPagerSummary(page) {
  if (!page.total) return 'Rows: 0 - 0 . Shown 0 of 0.';
  return `Rows: ${page.rowStart} - ${page.rowEnd} . Shown ${page.shown} of ${page.total}.`;
}

function wrapFormattedPacket(formatted, maxRowChars) {
  const max = maxRowChars != null ? maxRowChars : PACKET_WRAP_MAX_CHARS;
  if (!formatted) return [];
  const lines = [];
  let line = '';

  function flush() {
    if (line) {
      lines.push(line);
      line = '';
    }
  }

  function appendChunk(chunk, indentContinuation) {
    let rest = chunk;
    while (rest.length > 0) {
      const prefix = line ? '' : (indentContinuation && !rest.startsWith('^') ? '  ' : '');
      const avail = max - line.length;
      if (prefix.length + rest.length <= avail) {
        line += prefix + rest;
        rest = '';
      } else {
        const take = Math.max(1, avail - prefix.length);
        if (take <= 0 || (line.length >= max)) {
          flush();
          continue;
        }
        line += prefix + rest.slice(0, take);
        rest = rest.slice(take);
        flush();
      }
    }
  }

  const parts = formatted.split(/\s+\+\s+/);
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) {
      const sep = ' + ';
      if (line.length + sep.length <= max) {
        line += sep;
      } else {
        flush();
        line = '  + ';
        if (line.length > max) {
          flush();
          line = '';
        }
      }
    }
    appendChunk(parts[i], i > 0);
  }
  flush();
  return lines;
}

function formatPacketLines(packetBits, size, formatValueFn) {
  let formatted = packetBits;
  if (typeof formatValueFn === 'function') {
    formatted = formatValueFn(packetBits, size);
  }
  return wrapFormattedPacket(formatted, PACKET_WRAP_MAX_CHARS);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NETWORK_TRAFFIC_PAGE_SIZE,
    PACKET_WRAP_MAX_CHARS,
    applyTrafficFilters,
    getFilteredTrafficLog,
    getDisplayPage,
    formatPagerSummary,
    wrapFormattedPacket,
    formatPacketLines,
    trafficCellValue,
    parseNumericFilter,
    parseIdFilter,
    matchNumericValue,
    matchEntryId,
    parseTargetFilter,
    matchTargetValue,
    TRAFFIC_NUMERIC_FILTER_COLS,
  };
}
