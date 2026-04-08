var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var SevenSegComponent = class SevenSegComponent extends BuiltinComponent {
  static get type() { return '7seg'; }
  static get shortnames() { return { '7': '7seg' }; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) { return 8; }
  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }
  getSpecialParseAttributes() { return { segAttributes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }; }

  getDef() {
    return {
      attrs: [{ name: 'text', value: 'string' }, { name: 'color', value: 'string' }, { name: 'nl', value: null }],
      initValue: '8bit',
      pins: [{ bits: '1', name: 'set' }, { bits: '4', name: 'hex' }, { bits: '1', name: 'a' }, { bits: '1', name: 'b' }, { bits: '1', name: 'c' }, { bits: '1', name: 'd' }, { bits: '1', name: 'e' }, { bits: '1', name: 'f' }, { bits: '1', name: 'g' }, { bits: '1', name: 'h' }],
      pouts: [{ bits: '8', name: 'get' }],
      returns: '8bit',
    };
  }

  static hexTo7Seg(hexValue) {
    const hexMap = {
      '0000': '1111110', '0001': '0110000', '0010': '1101101', '0011': '1111001',
      '0100': '0110011', '0101': '1011011', '0110': '1011111', '0111': '1110000',
      '1000': '1111111', '1001': '1111011', '1010': '1110111', '1011': '0011111',
      '1100': '1001110', '1101': '0111101', '1110': '1001111', '1111': '1000111'
    };
    let normalized = hexValue;
    if (normalized.length < 4) normalized = normalized.padStart(4, '0');
    else if (normalized.length > 4) normalized = normalized.substring(0, 4);
    return hexMap[normalized] || '0000000';
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    let val = comp.lastSegmentValue || '00000000';
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: 8 };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const text = attributes.text !== undefined ? String(attributes.text) : '';
    const color = attributes.color || '#ff0000';
    const nl = attributes.nl || false;

    let segInitialValue = initialValue || '0'.repeat(bits);
    if (attributes.segments) {
      const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const segArray = segInitialValue.split('');
      for (let i = 0; i < segments.length; i++) {
        if (attributes.segments[segments[i]] !== undefined) {
          segArray[i] = attributes.segments[segments[i]];
        }
      }
      segInitialValue = segArray.join('');
    }

    const segId = baseId;
    if (typeof addSevenSegment === 'function') {
      addSevenSegment({ id: segId, text, color, values: segInitialValue, nl });
    }
    if (attributes.segments && typeof setSegment === 'function') {
      const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      for (const segName of segments) {
        if (attributes.segments[segName] !== undefined) {
          setSegment(segId, segName, attributes.segments[segName] === '1');
        }
      }
    }
    return { deviceIds: [segId], ref: null };
  }

  finalizeCompInfo(compInfo, attributes, initialValue, bits) {
    let segValue = initialValue || '0'.repeat(bits);
    if (attributes.segments) {
      const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const segArray = segValue.split('');
      for (let i = 0; i < segments.length; i++) {
        if (attributes.segments[segments[i]] !== undefined) {
          segArray[i] = attributes.segments[segments[i]];
        }
      }
      segValue = segArray.join('');
    }
    compInfo.lastSegmentValue = segValue;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const segAttributes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    if (pending.hex !== undefined) {
      let hexValue = this.reEvalPendingValue(pending, 'hex', reEvaluate, ctx);
      const segPattern = SevenSegComponent.hexTo7Seg(hexValue);
      if (comp.deviceIds.length > 0) {
        const segId = comp.deviceIds[0];
        const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
        for (let i = 0; i < segments.length; i++) {
          if (typeof setSegment === 'function') setSegment(segId, segments[i], segPattern[i] === '1');
        }
        const currentH = comp.lastSegmentValue ? comp.lastSegmentValue[7] : '0';
        comp.lastSegmentValue = segPattern + currentH;
      }
    }

    let hasSegmentProperty = false;
    for (const segName of segAttributes) {
      if (pending[segName] !== undefined) { hasSegmentProperty = true; break; }
    }
    if (hasSegmentProperty && comp.deviceIds.length > 0) {
      const segId = comp.deviceIds[0];
      for (const segName of segAttributes) {
        if (pending[segName] !== undefined) {
          let segValue = this.reEvalPendingValue(pending, segName, reEvaluate, ctx);
          const segBit = segValue.length > 0 ? segValue[segValue.length - 1] : '0';
          if (segBit !== '0' && segBit !== '1') throw Error(`Segment ${segName} value must be 0 or 1, got ${segBit}`);
          if (typeof setSegment === 'function') setSegment(segId, segName, segBit === '1');
          if (!comp.lastSegmentValue) comp.lastSegmentValue = '00000000';
          const segArray = comp.lastSegmentValue.split('');
          const segIndex = segAttributes.indexOf(segName);
          if (segIndex >= 0) { segArray[segIndex] = segBit; comp.lastSegmentValue = segArray.join(''); }
        }
      }
    }

    if (comp.attributes && comp.attributes.segments) {
      if (comp.deviceIds.length > 0) {
        const segId = comp.deviceIds[0];
        const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for (const segName of segments) {
          if (comp.attributes.segments[segName] !== undefined) {
            if (typeof setSegment === 'function') setSegment(segId, segName, comp.attributes.segments[segName] === '1');
          }
        }
        let currentSegValue = comp.lastSegmentValue || '00000000';
        const segArr = currentSegValue.split('');
        for (let i = 0; i < segments.length; i++) {
          if (comp.attributes.segments[segments[i]] !== undefined) segArr[i] = comp.attributes.segments[segments[i]];
        }
        comp.lastSegmentValue = segArr.join('');
      }
    }

    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        if (pending.hex !== undefined) {
          let hexValue = this.reEvalPendingValue(pending, 'hex', reEvaluate, ctx);
          const segPattern = SevenSegComponent.hexTo7Seg(hexValue);
          if (comp.deviceIds.length > 0) {
            const segId = comp.deviceIds[0];
            const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
            for (let i = 0; i < segments.length; i++) {
              if (typeof setSegment === 'function') setSegment(segId, segments[i], segPattern[i] === '1');
            }
            const currentH = comp.lastSegmentValue ? comp.lastSegmentValue[7] : '0';
            comp.lastSegmentValue = segPattern + currentH;

            const segAttribs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            const hasIndividualSegs = segAttribs.some(s => pending[s] !== undefined);
            if (hasIndividualSegs) {
              for (const segName of segAttribs) {
                if (pending[segName] !== undefined) {
                  let sv = this.reEvalPendingValue(pending, segName, reEvaluate, ctx);
                  const segBit = sv.length > 0 ? sv[sv.length - 1] : '0';
                  if (typeof setSegment === 'function') setSegment(segId, segName, segBit === '1');
                  const segArr2 = comp.lastSegmentValue.split('');
                  const segIdx = segAttribs.indexOf(segName);
                  if (segIdx >= 0) { segArr2[segIdx] = segBit; comp.lastSegmentValue = segArr2.join(''); }
                }
              }
            }
          }
        }
      }
    }
  }

  updateDisplayValue(comp, value, bitRange) {
    let bitsToUse = value;
    if (bitRange) {
      const { start, end } = bitRange;
      const actualEnd = end !== undefined ? end : start;
      bitsToUse = value.substring(start, actualEnd + 1);
    }
    if (comp.deviceIds.length > 0) {
      const segId = comp.deviceIds[0];
      const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      for (let i = 0; i < segments.length && i < bitsToUse.length; i++) {
        if (typeof setSegment === 'function') setSegment(segId, segments[i], bitsToUse[i] === '1');
      }
      let segmentValue = bitsToUse;
      if (segmentValue.length < 8) segmentValue = segmentValue.padEnd(8, '0');
      else if (segmentValue.length > 8) segmentValue = segmentValue.substring(0, 8);
      comp.lastSegmentValue = segmentValue;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SevenSegComponent; }
