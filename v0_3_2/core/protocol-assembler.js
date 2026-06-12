/* ================= PROTOCOL ASSEMBLER ================= */

const PROTOCOL_ATTRS = new Set(['clockType']);
const CLOCK_TYPES = new Set(['lowFirst', 'highFirst']);

function stripComment(line) {
  const hash = line.indexOf('#');
  if (hash >= 0) return line.slice(0, hash);
  return line;
}

function parseLiteralToken(token) {
  const t = token.trim();
  if (t === '0' || t === '1') return { kind: 'literal', bits: t };
  if (/^[01]+$/.test(t)) return { kind: 'literal', bits: t };
  if (t.startsWith('^')) {
    const hex = t.slice(1);
    if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error(`Invalid hex literal '${t}'`);
    return { kind: 'literal', bits: parseInt(hex, 16).toString(2) };
  }
  if (t.startsWith('\\')) {
    const num = t.slice(1);
    if (!/^\d+$/.test(num)) throw new Error(`Invalid decimal literal '${t}'`);
    return { kind: 'literal', bits: parseInt(num, 10).toString(2) };
  }
  throw new Error(`Invalid protocol literal '${t}'`);
}

function parseParamRef(text) {
  const m = /^(\w+)(?:\s+(\d+)b)?$/.exec(text.trim());
  if (!m) throw new Error(`Invalid parameter reference '${text}'`);
  return { name: m[1], width: m[2] !== undefined ? parseInt(m[2], 10) : null };
}

function registerParam(parameters, name, width) {
  if (parameters[name] !== undefined) {
    if (parameters[name] !== width) {
      throw new Error(
        `Parameter '${name}' was previously declared as ${parameters[name]}b but is used here as ${width}b`
      );
    }
    return;
  }
  parameters[name] = width;
}

function resolveParamWidth(parameters, name, width) {
  if (width !== null) {
    registerParam(parameters, name, width);
    return width;
  }
  if (parameters[name] === undefined) {
    throw new Error(`Parameter '${name}' used without prior width declaration`);
  }
  return parameters[name];
}

function parseSegmentLine(line, parameters) {
  const t = line.trim();
  if (!t) return null;

  const revM = /^reverse\s*\(\s*([^)]+)\s*\)$/i.exec(t);
  if (revM) {
    const ref = parseParamRef(revM[1]);
    if (!ref.name) throw new Error(`reverse() expects a parameter`);
    const width = resolveParamWidth(parameters, ref.name, ref.width);
    return { kind: 'reverse', param: ref.name, width };
  }

  const peM = /^parityEven\s*\(\s*([^)]+)\s*\)$/i.exec(t);
  if (peM) {
    const ref = parseParamRef(peM[1]);
    if (!ref.name) throw new Error(`parityEven() expects a parameter`);
    resolveParamWidth(parameters, ref.name, ref.width);
    return { kind: 'parityEven', param: ref.name };
  }

  const poM = /^parityOdd\s*\(\s*([^)]+)\s*\)$/i.exec(t);
  if (poM) {
    const ref = parseParamRef(poM[1]);
    if (!ref.name) throw new Error(`parityOdd() expects a parameter`);
    resolveParamWidth(parameters, ref.name, ref.width);
    return { kind: 'parityOdd', param: ref.name };
  }

  const clkM = /^clock\s+(\d+)b$/i.exec(t);
  if (clkM) return { kind: 'clock', width: parseInt(clkM[1], 10) };

  const repM = /^repeat\s+([01])\s+(\d+)b$/i.exec(t);
  if (repM) return { kind: 'repeat', bit: repM[1], width: parseInt(repM[2], 10) };

  const parM = /^(\w+)\s+(\d+)b$/.exec(t);
  if (parM) {
    const name = parM[1];
    const width = parseInt(parM[2], 10);
    registerParam(parameters, name, width);
    return { kind: 'param', param: name, width };
  }

  return parseLiteralToken(t);
}

function parseProtocolBody(bodyRaw) {
  const attributes = {};
  const channels = [];
  const channelOrder = [];
  const parameters = {};
  let currentChannel = null;
  let seenChannel = false;

  for (const rawLine of bodyRaw.split('\n')) {
    const trimmed = stripComment(rawLine).trim();
    if (!trimmed || trimmed === ':') continue;

    const channelOnly = /^(\w+)\s*:\s*$/.exec(trimmed);
    if (channelOnly) {
      seenChannel = true;
      currentChannel = { name: channelOnly[1], segments: [], sourceLines: [] };
      channels.push(currentChannel);
      channelOrder.push(currentChannel.name);
      continue;
    }

    if (!seenChannel) {
      const attrM = /^(\w+)\s*:\s*(.+)$/.exec(trimmed);
      if (attrM) {
        const key = attrM[1];
        const val = attrM[2].trim();
        if (!PROTOCOL_ATTRS.has(key)) throw new Error(`Unknown protocol attribute '${key}'`);
        if (key === 'clockType' && !CLOCK_TYPES.has(val)) {
          throw new Error(`clockType must be 'lowFirst' or 'highFirst'`);
        }
        attributes[key] = val;
        continue;
      }
    }

    if (!currentChannel) throw new Error(`Protocol segment '${trimmed}' outside of any output channel`);
    const seg = parseSegmentLine(trimmed, parameters);
    if (seg) {
      currentChannel.segments.push(seg);
      currentChannel.sourceLines.push(trimmed);
    }
  }

  if (!channels.length) throw new Error('Protocol definition has no output channels');
  return { attributes, channels, parameters, channelOrder, bodyRaw };
}

function popcount(bits) {
  let n = 0;
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') n++;
  return n;
}

function padBinary(val, width) {
  if (val.length > width) return val.slice(val.length - width);
  return val.padStart(width, '0');
}

function evalSegment(seg, args, attributes) {
  switch (seg.kind) {
    case 'literal': return seg.bits;
    case 'param': {
      const val = args[seg.param];
      if (val === undefined || val === null) throw new Error(`Unknown parameter '${seg.param}'`);
      return padBinary(val, seg.width);
    }
    case 'reverse': {
      const val = args[seg.param];
      if (val === undefined || val === null) throw new Error(`Unknown parameter '${seg.param}'`);
      return padBinary(val, seg.width).split('').reverse().join('');
    }
    case 'parityEven': {
      const val = args[seg.param];
      if (val === undefined || val === null) throw new Error(`Unknown parameter '${seg.param}'`);
      return String(popcount(val) % 2 === 0 ? 0 : 1);
    }
    case 'parityOdd': {
      const val = args[seg.param];
      if (val === undefined || val === null) throw new Error(`Unknown parameter '${seg.param}'`);
      return String(popcount(val) % 2 === 0 ? 1 : 0);
    }
    case 'clock': {
      const pair = (attributes.clockType || 'lowFirst') === 'highFirst' ? '10' : '01';
      let out = '';
      while (out.length < seg.width) out += pair;
      return out.slice(0, seg.width);
    }
    case 'repeat':
      return seg.bit.repeat(seg.width);
    default:
      throw new Error(`Unknown protocol segment kind '${seg.kind}'`);
  }
}

function generateProtocol(inst, args) {
  const channelWidths = [];
  let blob = '';
  for (const chName of inst.channelOrder) {
    const channel = inst.channels.find(c => c.name === chName);
    if (!channel) throw new Error(`Missing channel '${chName}' in protocol instance`);
    const bits = channel.segments.map(s => evalSegment(s, args, inst.attributes || {})).join('');
    channelWidths.push(bits.length);
    blob += bits;
  }
  return { blob, channelWidths, totalWidth: blob.length };
}

function decodeChannel(channel, bits, attributes, paramOutputs) {
  let pos = 0;
  let lastParamBits = null;

  for (const seg of channel.segments) {
    switch (seg.kind) {
      case 'literal': {
        const expected = seg.bits;
        const actual = bits.substr(pos, expected.length);
        if (actual !== expected) {
          const expBit = expected.length === 1 ? expected : `literal '${expected}'`;
          const gotBit = actual.length ? actual[0] : '?';
          throw new Error(`Protocol decode failed:\nexpected ${expBit}\nbut received '${gotBit}'`);
        }
        pos += expected.length;
        break;
      }
      case 'param': {
        const val = bits.substr(pos, seg.width);
        if (val.length !== seg.width) {
          throw new Error('Protocol decode failed:\nunexpected end of channel data');
        }
        pos += seg.width;
        lastParamBits = val;
        paramOutputs.push(val);
        break;
      }
      case 'reverse': {
        const raw = bits.substr(pos, seg.width);
        if (raw.length !== seg.width) {
          throw new Error('Protocol decode failed:\nunexpected end of channel data');
        }
        const val = raw.split('').reverse().join('');
        pos += seg.width;
        lastParamBits = val;
        paramOutputs.push(val);
        break;
      }
      case 'parityEven': {
        if (lastParamBits == null) throw new Error('Protocol decode failed:\nparity without prior parameter');
        const expected = String(popcount(lastParamBits) % 2 === 0 ? 0 : 1);
        const actual = bits[pos];
        if (actual !== expected) {
          throw new Error(`Protocol decode failed:\nexpected parity bit '${expected}'\nbut received '${actual || '?'}'`);
        }
        pos++;
        break;
      }
      case 'parityOdd': {
        if (lastParamBits == null) throw new Error('Protocol decode failed:\nparity without prior parameter');
        const expected = String(popcount(lastParamBits) % 2 === 0 ? 1 : 0);
        const actual = bits[pos];
        if (actual !== expected) {
          throw new Error(`Protocol decode failed:\nexpected parity bit '${expected}'\nbut received '${actual || '?'}'`);
        }
        pos++;
        break;
      }
      case 'clock': {
        const pair = (attributes.clockType || 'lowFirst') === 'highFirst' ? '10' : '01';
        let wave = '';
        while (wave.length < seg.width) wave += pair;
        const expected = wave.slice(0, seg.width);
        const actual = bits.substr(pos, seg.width);
        if (actual !== expected) {
          throw new Error('Protocol decode failed:\nexpected clock waveform');
        }
        pos += seg.width;
        break;
      }
      case 'repeat': {
        const expected = seg.bit.repeat(seg.width);
        const actual = bits.substr(pos, seg.width);
        if (actual !== expected) {
          throw new Error(`Protocol decode failed:\nexpected repeat bit '${seg.bit}'`);
        }
        pos += seg.width;
        break;
      }
      default:
        throw new Error(`Unknown protocol segment kind '${seg.kind}'`);
    }
  }

  if (pos !== bits.length) {
    throw new Error('Protocol output width mismatch');
  }
}

function decodeProtocol(inst, channelBitStrings) {
  const order = inst.channelOrder || [];
  if (!Array.isArray(channelBitStrings)) {
    throw new Error(`Expected ${order.length} protocol channels but received 0`);
  }
  if (channelBitStrings.length !== order.length) {
    throw new Error(`Expected ${order.length} protocol channels but received ${channelBitStrings.length}`);
  }

  const paramOutputs = [];
  for (let i = 0; i < order.length; i++) {
    const chName = order[i];
    const channel = inst.channels.find(c => c.name === chName);
    if (!channel) throw new Error(`Missing channel '${chName}' in protocol instance`);
    decodeChannel(channel, String(channelBitStrings[i]), inst.attributes || {}, paramOutputs);
  }

  const blob = paramOutputs.join('');
  return { params: paramOutputs, blob, totalWidth: blob.length };
}

function formatProtocolInstanceDoc(alias, inst) {
  const lines = [];
  lines.push(`${alias} (inline [protocol])`);
  lines.push('');
  lines.push('  decode:');
  lines.push('    supported');
  lines.push('');
  lines.push('  channels:');
  for (const name of inst.channelOrder || []) lines.push(`    ${name}`);
  for (const ch of inst.channels || []) {
    lines.push('');
    lines.push(`  ${ch.name}:`);
    for (const src of ch.sourceLines || []) lines.push(`    ${src}`);
  }
  const names = Object.keys(inst.parameters || {});
  if (names.length) {
    lines.push('');
    lines.push('  parameters:');
    for (const name of names) lines.push(`    ${name} ${inst.parameters[name]}b`);
  }
  return lines;
}

function formatProtocolTypeDoc() {
  return [
    'inline [protocol] .name:',
    '',
    '  clockType: lowFirst',
    '',
    '  tx:',
    '    0',
    '    reverse(data 8b)',
    '    1',
    '',
    '  sclk:',
    '    clock 8b',
    '',
    '  cs:',
    '    repeat 0 8b',
    '',
    '  :',
    '',
    'Built-in generators:',
    '  reverse(param)     parityEven(param)     parityOdd(param)',
    '  clock Nb           repeat bit Nb',
    '',
    'Attributes:',
    '  clockType: lowFirst | highFirst',
    '',
    'Invoke (assignment only):',
    '  10bit tx = .name { data = ^41 }',
    '  8bit mosi, 8bit sclk = .name { data = ^A5 }',
  ];
}

const protocolAssemblerExports = {
  parseProtocolBody,
  generateProtocol,
  decodeProtocol,
  formatProtocolInstanceDoc,
  formatProtocolTypeDoc,
};

if (typeof module !== 'undefined' && module.exports) module.exports = protocolAssemblerExports;
if (typeof globalThis !== 'undefined') {
  for (const [k, v] of Object.entries(protocolAssemblerExports)) globalThis[k] = v;
}
