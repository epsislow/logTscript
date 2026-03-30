var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var LcdComponent = class LcdComponent extends BuiltinComponent {
  static get type() { return 'lcd'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) { return 8; }
  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    let val = comp.lastCharValue || '00000000';
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: 8 };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const rows = attributes['row'] !== undefined ? parseInt(attributes['row'], 10) : 8;
    const cols = attributes['cols'] !== undefined ? parseInt(attributes['cols'], 10) : 5;
    const pixelSize = attributes['pixelSize'] !== undefined ? parseInt(attributes['pixelSize'], 10) : 10;
    const pixelGap = attributes['pixelGap'] !== undefined ? parseInt(attributes['pixelGap'], 10) : 3;
    const glow = true;
    const round = true;
    const color = attributes['color'] || attributes['pixelOnColor'] || '#6dff9c';
    const bg = attributes['bg'] || attributes['backgroundColor'] || 'transparent';
    const nl = attributes['nl'] || false;
    const rgb = attributes['rgb'] !== undefined;
    const lcdId = baseId;

    if (typeof addCharacterLCD === 'function') {
      addCharacterLCD({ id: lcdId, rows, cols, pixelSize, pixelGap, glow, pixelOnColor: color, backgroundColor: bg, round, nl, rgb });
    }
    return { deviceIds: [lcdId], ref: null };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const lcdId = comp.deviceIds[0];

    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        if (typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)) {
          lcdDisplays.get(lcdId).setCurrentColor(null);
        }

        let shouldClear = false;
        if (pending.clear !== undefined) {
          let clearValue = this.reEvalPendingValue(pending, 'clear', reEvaluate, ctx);
          if (clearValue === '1' || clearValue[clearValue.length - 1] === '1') {
            shouldClear = true;
            if (typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)) lcdDisplays.get(lcdId).clear();
            delete pending.clear;
          }
        }

        if (pending.x !== undefined && pending.y !== undefined && pending.rowlen !== undefined) {
          let notValue = 0;
          let write0Value = 1;
          if (pending.not !== undefined) notValue = pending.not.value == '1' ? 1 : 0;
          if (pending.write0 !== undefined) write0Value = pending.write0.value == '1' ? 1 : 0;

          if (pending.chr !== undefined) {
            let chrValue = pending.chr.value;
            let isHex = false;
            if (pending.chr.expr && pending.chr.expr.length > 0) {
              for (const atom of pending.chr.expr) { if (atom.hex) { isHex = true; break; } }
            }
            chrValue = this.reEvalPendingValue(pending, 'chr', reEvaluate, ctx);
            let charCode = parseInt(chrValue, 2);
            if (typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)) {
              const lcdInstance = lcdDisplays.get(lcdId);
              if (typeof lcdInstance.getCharBitsString === 'function') {
                let charBits = lcdInstance.getCharBitsString(charCode);
                if (notValue) {
                  charBits = charBits.split('').map(bit => bit === '0' ? '1' : bit === '1' ? '0' : bit).join('');
                }
                if (!pending.data) pending.data = {};
                pending.data.value = charBits;
                pending.data.expr = null;
              }
            }
          }

          if (pending.data === undefined) return;

          let xValue = this.reEvalPendingValue(pending, 'x', reEvaluate, ctx);
          let yValue = this.reEvalPendingValue(pending, 'y', reEvaluate, ctx);
          let rowlenValue = this.reEvalPendingValue(pending, 'rowlen', reEvaluate, ctx);
          let dataValue = this.reEvalPendingValue(pending, 'data', reEvaluate, ctx);
          let cornerValue = '00';
          if (pending.corner !== undefined) cornerValue = this.reEvalPendingValue(pending, 'corner', reEvaluate, ctx);

          let x = parseInt(xValue, 2);
          let y = parseInt(yValue, 2);
          const rowlen = parseInt(rowlenValue, 2);
          const rows = comp.attributes['row'] !== undefined ? parseInt(comp.attributes['row'], 10) : 8;
          const rectMap = {};
          let numRows = 0;
          for (let r = 0; r < rows && r * rowlen < dataValue.length; r++) {
            const startIdx = r * rowlen;
            const endIdx = Math.min(startIdx + rowlen, dataValue.length);
            const rowBits = dataValue.substring(startIdx, endIdx);
            if (rowBits.length > 0) { rectMap[r] = rowBits; numRows = r + 1; }
          }

          const corner = cornerValue.length >= 2 ? cornerValue.substring(cornerValue.length - 2) : '00';
          const cornerBits = corner.padStart(2, '0');
          if (cornerBits[1] === '1') x = x - rowlen + 1;
          if (cornerBits[0] === '1') y = y - numRows + 1;

          let rgbColor = null;
          if (pending.rgb !== undefined) {
            let rgbValue = this.reEvalPendingValue(pending, 'rgb', reEvaluate, ctx);
            if (rgbValue && rgbValue.length > 0) {
              let isHex = false;
              if (pending.rgb.expr && pending.rgb.expr.length > 0) {
                for (const atom of pending.rgb.expr) { if (atom.hex) { isHex = true; break; } }
              }
              const hexNum = parseInt(rgbValue, 2);
              const hexStr = hexNum.toString(16).toUpperCase();
              if (isHex) {
                rgbColor = '#' + hexStr;
              } else {
                const paddedHex = hexStr.length <= 3 ? hexStr.padStart(3, '0') : hexStr.padStart(6, '0');
                rgbColor = '#' + paddedHex;
              }
              if (typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)) {
                lcdDisplays.get(lcdId).setCurrentColor(rgbColor);
              }
            }
          }

          if (typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)) {
            lcdDisplays.get(lcdId).setRect(x, y, rectMap, write0Value);
          }

          if (pending.chr !== undefined) {
            let chrBinary = pending.chr.value || '00000000';
            if (chrBinary.length < 8) chrBinary = chrBinary.padStart(8, '0');
            else if (chrBinary.length > 8) chrBinary = chrBinary.substring(chrBinary.length - 8);
            comp.lastCharValue = chrBinary;
          } else if (dataValue && dataValue.length > 0) {
            let dataBinary = dataValue.substring(0, Math.min(8, dataValue.length));
            if (dataBinary.length < 8) dataBinary = dataBinary.padStart(8, '0');
            comp.lastCharValue = dataBinary;
          }

          if (pending.chr !== undefined) delete pending.chr;
        }
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = LcdComponent; }
