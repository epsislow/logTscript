var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var TERMINAL_PINS = ['set', 'append', 'insert', 'newline', 'clear', 'backDelete', 'frontDelete', 'moveCursor'];

var TerminalComponent = class TerminalComponent extends BuiltinComponent {
  static get type() { return 'terminal'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) { return 1; }

  getSupportedProperties() {
    return TERMINAL_PINS.slice();
  }

  getRedirectProperties() { return []; }

  getDef() {
    return {
      attrs: [
        { name: 'rows', value: 'integer' },
        { name: 'columns', value: 'integer' },
        { name: 'fontSize', value: 'integer' },
        { name: 'wordWrap', value: 'integer' },
        { name: 'lineNumbers', value: 'integer' },
        { name: 'cursorStyle', value: 'integer' },
        { name: 'color', value: 'string' },
        { name: 'nl', value: null }
      ],
      initValue: null,
      pins: [
        { bits: '1', name: 'set' },
        { bits: 'X', name: 'append' },
        { bits: 'X', name: 'insert' },
        { bits: '1', name: 'newline' },
        { bits: '1', name: 'clear' },
        { bits: '2', name: 'backDelete' },
        { bits: '2', name: 'frontDelete' },
        { bits: '3', name: 'moveCursor' }
      ],
      pouts: [],
      returns: null,
    };
  }

  _parseFlag(val, defaultOne) {
    if (val === undefined || val === null) return defaultOne ? 1 : 0;
    if (val === true || val === 'true') return 1;
    if (val === false || val === 'false') return 0;
    const n = parseInt(val, 10);
    if (n === 0 || n === 1) return n;
    return defaultOne ? 1 : 0;
  }

  _parseSmallInt(value, maxVal) {
    if (value === undefined || value === null || value === '') return 0;
    const n = parseInt(String(value), 2);
    if (isNaN(n) || n < 0) return 0;
    if (n > maxVal) return maxVal;
    return n;
  }

  _isAllZeroBytes(binaryValue) {
    if (!binaryValue || binaryValue.length < 8) return false;
    const padded = binaryValue.length % 8 === 0
      ? binaryValue
      : binaryValue.padStart(Math.ceil(binaryValue.length / 8) * 8, '0');
    for (let i = 0; i < padded.length; i += 8) {
      const code = parseInt(padded.substring(i, i + 8), 2);
      if (!isNaN(code) && code !== 0) return false;
    }
    return true;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const rows = attributes['rows'] !== undefined ? parseInt(attributes['rows'], 10) : 20;
    const columns = attributes['columns'] !== undefined ? parseInt(attributes['columns'], 10) : 80;
    const fontSize = attributes['fontSize'] !== undefined ? parseInt(attributes['fontSize'], 10) : 12;
    const wordWrap = this._parseFlag(attributes['wordWrap'], true);
    const lineNumbers = this._parseFlag(attributes['lineNumbers'], false);
    const cursorStyle = attributes['cursorStyle'] !== undefined ? parseInt(attributes['cursorStyle'], 10) : 0;
    const color = attributes['color'] || '#0f0';
    const nl = attributes['nl'] !== undefined;

    if (isNaN(rows) || rows <= 0) throw Error('rows must be greater than 0');
    if (isNaN(columns) || columns <= 0) throw Error('columns must be greater than 0');
    if (isNaN(fontSize) || fontSize <= 0) throw Error('fontSize must be greater than 0');
    if (isNaN(cursorStyle) || cursorStyle < 0 || cursorStyle > 2) {
      throw Error('cursorStyle must be 0, 1, or 2');
    }

    const termId = baseId;
    if (typeof addTerminal === 'function') {
      addTerminal({
        id: termId, rows, columns, fontSize, wordWrap, lineNumbers,
        cursorStyle, color, nl
      });
    }
    return { deviceIds: [termId], ref: null };
  }

  _validatePending(pending) {
    for (const key of Object.keys(pending)) {
      if (key === 'set') continue;
      if (!TERMINAL_PINS.includes(key)) {
        throw Error(`Unknown terminal property '${key}'`);
      }
    }
  }

  _isActive(value) {
    return value === '1' || (value && value.length > 0 && value[value.length - 1] === '1');
  }

  _termAndBuffer(comp, interpCtx) {
    const termId = comp.deviceIds[0];
    const maps = typeof getDeviceMapsForInterp === 'function'
      ? getDeviceMapsForInterp(interpCtx)
      : null;
    const termDisplays = maps ? maps.terminalDisplays : (typeof terminalDisplays !== 'undefined' ? terminalDisplays : null);
    const term = termDisplays ? termDisplays.get(termId) : null;
    const buffer = term ? term.buffer : (typeof getTerminalBuffer === 'function' ? getTerminalBuffer(termId) : null);
    return { term, buffer };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    if (pending.set === undefined) return;

    const setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
    if (!this._isActive(setValue)) return;

    this._validatePending(pending);

    const { term, buffer } = this._termAndBuffer(comp, ctx);

    if (pending.clear !== undefined) {
      const clearValue = this.reEvalPendingValue(pending, 'clear', reEvaluate, ctx);
      if (this._isActive(clearValue)) {
        if (term) term.clear();
        else if (buffer) buffer.clear();
      }
    }

    if (pending.backDelete !== undefined) {
      const mode = this._parseSmallInt(this.reEvalPendingValue(pending, 'backDelete', reEvaluate, ctx), 3);
      if (mode > 0) {
        if (term) term.backDelete(mode);
        else if (buffer) buffer.backDelete(mode);
      }
    }

    if (pending.frontDelete !== undefined) {
      const mode = this._parseSmallInt(this.reEvalPendingValue(pending, 'frontDelete', reEvaluate, ctx), 3);
      if (mode > 0) {
        if (term) term.frontDelete(mode);
        else if (buffer) buffer.frontDelete(mode);
      }
    }

    if (pending.moveCursor !== undefined) {
      const dir = this._parseSmallInt(this.reEvalPendingValue(pending, 'moveCursor', reEvaluate, ctx), 4);
      if (dir > 0) {
        if (term) term.moveCursor(dir);
        else if (buffer) buffer.moveCursor(dir);
      }
    }

    if (pending.newline !== undefined) {
      const nlValue = this.reEvalPendingValue(pending, 'newline', reEvaluate, ctx);
      if (this._isActive(nlValue)) {
        if (term) term.newline();
        else if (buffer) buffer.newline();
      }
    }

    if (pending.insert !== undefined) {
      const insertValue = this.reEvalPendingValue(pending, 'insert', reEvaluate, ctx);
      if (this._isAllZeroBytes(insertValue)) {
        // MUX disable branch (all-zero, ≥8 bits) — skip silently
      } else if (term) term.insertBinary(insertValue);
      else if (buffer) buffer.insertBinary(insertValue);
    }

    if (pending.append !== undefined) {
      const appendValue = this.reEvalPendingValue(pending, 'append', reEvaluate, ctx);
      if (this._isAllZeroBytes(appendValue)) {
        // MUX disable branch (all-zero, ≥8 bits) — skip silently
      } else if (term) term.appendBinary(appendValue);
      else if (buffer) buffer.appendBinary(appendValue);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TerminalComponent; }
