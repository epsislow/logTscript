var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var FourteenSegComponent = class FourteenSegComponent extends BuiltinComponent {
    
    static get type() { return '14seg'; }
    static get shortnames() { return { '14': '14seg' }; }
    static get isReservedName() { return true; }
    
    getWidthBits() { return 15; }
    
    getSupportedProperties() { return ['get']; }
    getRedirectProperties() { return ['get']; }
    
    getSpecialParseAttributes() {
        return {
            segAttributes: [
                'a', 'b', 'c', 'd', 'e', 'f',
                'g1', 'g2',
                'h', 'i', 'j', 'k',
                'l', 'm',
                'dp'
            ]
        };
    }
    
    getDef() {
        return {
            attrs: [
                { name: 'text', value: 'string' },
                { name: 'color', value: 'string' },
                { name: 'nl', value: null }
            ],
            initValue: '15bit',
            pins: [
                { bits: '1', name: 'set' },
                { bits: '15', name: 'data' },
                { bits: '4', name: 'hex' },
                { bits: '8', name: 'chr' },
                
                { bits: '1', name: 'a' },
                { bits: '1', name: 'b' },
                { bits: '1', name: 'c' },
                { bits: '1', name: 'd' },
                { bits: '1', name: 'e' },
                { bits: '1', name: 'f' },
                
                { bits: '1', name: 'g1' },
                { bits: '1', name: 'g2' },
                
                { bits: '1', name: 'h' },
                { bits: '1', name: 'i' },
                { bits: '1', name: 'j' },
                { bits: '1', name: 'k' },
                
                { bits: '1', name: 'l' },
                { bits: '1', name: 'm' },
                
                { bits: '1', name: 'dp' }
            ],
            pouts: [{ bits: '15', name: 'get' }],
            returns: '15bit'
        };
    }
    
    /* ================= HEX → 14SEG ================= */
    static hexTo14Seg(hexValue) {
        const map = {
            '0000': '111111000000000',
            '0001': '011000000000000',
            '0010': '110110110000000',
            '0011': '111100110000000',
            '0100': '011001110000000',
            '0101': '101101110000000',
            '0110': '101111110000000',
            '0111': '111000000000000',
            '1000': '111111110000000',
            '1001': '111101110000000',
            '1010': '111011110000000',
            '1011': '001111110000000',
            '1100': '100111000000000',
            '1101': '011110110000000',
            '1110': '100111110000000',
            '1111': '100011110000000'
        };
        
        let n = hexValue;
        if (n.length < 4) n = n.padStart(4, '0');
        else if (n.length > 4) n = n.substring(0, 4);
        
        return map[n] || '000000000000000';
    }
    
    /* ================= BITS → CHAR → 14SEG ================= */
    static bitsTo14Seg(bitsValue) {
        let bits = bitsValue;
        if (bits.length < 8) bits = bits.padStart(8, '0');
        else if (bits.length > 8) bits = bits.substring(0, 8);
        
        const code = parseInt(bits, 2);
        const ch = String.fromCharCode(code);
        console.log('charr', ch);
        return FourteenSegComponent.charTo14Seg(ch);
    }
    
    static charTo14Seg(ch) {
        const map = {
            // digits
      '0': '111111000000000',
      '1': '011000000000000',
      '2': '110110110000000',
      '3': '111100110000000',
      '4': '011001110000000',
      '5': '101101110000000',
      '6': '101111110000000',
      '7': '111000000000000',
      '8': '111111110000000',
      '9': '111101110000000',

      // uppercase
      'A': '111011110011000', // \65
      'B': '001111110011000', // \66
      'C': '100111000000000',
      'D': '011110110011000',
      'E': '100111110000000',
      'F': '100011110000000',
      'G': '101111010000000',
      'H': '011011110011000',
      'I': '100100000011000',
      'J': '011110000000000',
      'K': '000011110101000',
      'L': '000111000000000',
      'M': '011011000101010',
      'N': '011011000100010',
      'O': '111111000000000',
      'P': '110011110000000',
      'Q': '111111000100010',
      'R': '110011110100010',
      'S': '101101110000000',
      'T': '100000000011000',
      'U': '011111000000000',
      'V': '000011000101000',
      'W': '011011000100101',
      'X': '000000001111111',
      'Y': '011001110000000',
      'Z': '110100000101000',

      // lowercase (fallback to uppercase)
      'a': '111011110011000', // \97
      'b': '001111110011000', // \98
      'c': '000110110000000',
      'd': '011110110011000',
      'e': '110111110000000',
      'f': '100011110000000',

      // special
      '-': '000000110000000',
      '_': '000100000000000',
      '=': '000100110000000',
      ' ': '000000000000000',
      '.': '000000000000001',
      '@': '111111111111110', // \64
        };
        
        return map[ch.toUpperCase()] || '000000000000000';
    }
    
    /* ================= GET ================= */
    evalGetProperty(comp, property, a, ctx) {
        if (property !== 'get') return null;
        
        let val = comp.lastSegmentValue || '000000000000000';
        
        const br = this.handleBitRange(a, val, a.var, 'get', ctx);
        if (br) return br;
        
        return {
            value: val,
            ref: null,
            varName: `${a.var}:get`,
            bitWidth: 15
        };
    }
    
    /* ================= CREATE ================= */
    createDevice(name, baseId, bits, attributes, initialValue) {
        
        const text = attributes.text !== undefined ? String(attributes.text) : '';
        const color = attributes.color || '#6dff9c';
        const nl = attributes.nl || false;
        
        let segInitialValue = initialValue || '0'.repeat(bits);
        
        if (attributes.segments) {
            const segments = this.getSpecialParseAttributes().segAttributes;
            const arr = segInitialValue.split('');
            
            for (let i = 0; i < segments.length; i++) {
                if (attributes.segments[segments[i]] !== undefined) {
                    arr[i] = attributes.segments[segments[i]];
                }
            }
            
            segInitialValue = arr.join('');
        }
        
        const segId = baseId;
        
        if (typeof addFourteenSegment === 'function') {
            addFourteenSegment({
                id: segId,
                text,
                color,
                values: segInitialValue,
                nl
            });
        }
        
        if (attributes.segments && typeof setSegment14 === 'function') {
            const segments = this.getSpecialParseAttributes().segAttributes;
            for (const s of segments) {
                if (attributes.segments[s] !== undefined) {
                    setSegment14(segId, s, attributes.segments[s] === '1');
                }
            }
        }
        
        return { deviceIds: [segId], ref: null };
    }
    
    /* ================= FINALIZE ================= */
    finalizeCompInfo(compInfo, attributes, initialValue, bits) {
        let segValue = initialValue || '0'.repeat(bits);
        
        if (attributes.segments) {
            const segments = this.getSpecialParseAttributes().segAttributes;
            const arr = segValue.split('');
            
            for (let i = 0; i < segments.length; i++) {
                if (attributes.segments[segments[i]] !== undefined) {
                    arr[i] = attributes.segments[segments[i]];
                }
            }
            
            segValue = arr.join('');
        }
        
        compInfo.lastSegmentValue = segValue;
    }
    
    /* ================= APPLY ================= */
    applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
        if (!pending) return;
        console.log('pending', pending);
        
        const segments = this.getSpecialParseAttributes().segAttributes;

        if (pending.data !== undefined) {
            const data = this.reEvalPendingValue(pending, 'data', reEvaluate, ctx);
            this._applyPattern(comp, data);
        } else if (pending.chr !== undefined) {
            const val = this.reEvalPendingValue(pending, 'chr', reEvaluate, ctx);
            const pattern = FourteenSegComponent.bitsTo14Seg(val);
            this._applyPattern(comp, pattern);
        } else if (pending.hex !== undefined) {
            const val = this.reEvalPendingValue(pending, 'hex', reEvaluate, ctx);
            const pattern = FourteenSegComponent.hexTo14Seg(val);
            this._applyPattern(comp, pattern);
        }
        
        for (const s of segments) {
            if (pending[s] !== undefined) {
                let v = this.reEvalPendingValue(pending, s, reEvaluate, ctx);
                const bit = v[v.length - 1] === '1';
                
                if (typeof setSegment14 === 'function') {
                    setSegment14(comp.deviceIds[0], s, bit);
                }
                
                if (!comp.lastSegmentValue) comp.lastSegmentValue = '0'.repeat(15);
                
                const arr = comp.lastSegmentValue.split('');
                const idx = segments.indexOf(s);
                arr[idx] = bit ? '1' : '0';
                comp.lastSegmentValue = arr.join('');
            }
        }
    }
    
    _applyPattern(comp, pattern) {
        if (comp.deviceIds.length === 0) return;
        
        const segId = comp.deviceIds[0];
        const segments = this.getSpecialParseAttributes().segAttributes;
        
        for (let i = 0; i < segments.length; i++) {
            if (typeof setSegment14 === 'function') {
                setSegment14(segId, segments[i], pattern[i] === '1');
            }
        }
        
        comp.lastSegmentValue = pattern;
    }
    
    /* ================= UPDATE DISPLAY ================= */
    updateDisplayValue(comp, value, bitRange) {
        let bitsToUse = value;
        
        if (bitRange) {
            const { start, end } = bitRange;
            const actualEnd = end !== undefined ? end : start;
            bitsToUse = value.substring(start, actualEnd + 1);
        }
        
        if (comp.deviceIds.length > 0) {
            const segId = comp.deviceIds[0];
            const segments = this.getSpecialParseAttributes().segAttributes;
            
            for (let i = 0; i < segments.length && i < bitsToUse.length; i++) {
                if (typeof setSegment14 === 'function') {
                    setSegment14(segId, segments[i], bitsToUse[i] === '1');
                }
            }
            
            let v = bitsToUse;
            if (v.length < 15) v = v.padEnd(15, '0');
            else if (v.length > 15) v = v.substring(0, 15);
            
            comp.lastSegmentValue = v;
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FourteenSegComponent;
}