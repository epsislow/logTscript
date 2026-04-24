var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var ClockDotsComponent = class ClockDotsComponent extends BuiltinComponent {
    
    static get type() { return 'dots'; }
    static get shortnames() { return { ':': 'dots' }; }
    static get isReservedName() { return true; }
    
    getWidthBits() { return 2; }
    
    getSupportedProperties() { return ['get']; }
    getRedirectProperties() { return ['get']; }
    
    getSpecialParseAttributes() {
        return {
            segAttributes: ['up', 'down']
        };
    }
    
    getDef() {
        return {
            attrs: [
                { name: 'color', value: 'string' },
                { name: 'bgColor', value: 'string' },
                { name: 'lgColor', value: 'string' },
                { name: 'tranSec', value: 'integer' },
                { name: 'scale', value: 'integer' },
                { name: 'nl', value: null }
            ],
            initValue: '2bit',
            pins: [
                { bits: '1', name: 'set' },
                { bits: '2', name: 'data' },
                { bits: '8', name: 'chr' }, // For passing ':' or '.'
                
                { bits: '1', name: 'up' },
                { bits: '1', name: 'down' }
            ],
            pouts: [{ bits: '2', name: 'get' }],
            returns: '2bit'
        };
    }

    /* ================= BITS → CHAR → DOTS ================= */
    static bitsToClockDots(bitsValue) {
        let bits = bitsValue;
        if (bits.length < 8) bits = bits.padStart(8, '0');
        const code = parseInt(bits, 2);
        const ch = String.fromCharCode(code);
        return ClockDotsComponent.charToClockDots(ch);
    }
    
    static charToClockDots(ch) {
        const map = {
            ':': '11',
            '.': '01',
            '-': '00',
            ' ': '00'
        };
        return map[ch] || '00';
    }
    
    /* ================= GET ================= */
    evalGetProperty(comp, property, a, ctx) {
        if (property !== 'get') return null;
        let val = comp.lastSegmentValue || '00';
        const br = this.handleBitRange(a, val, a.var, 'get', ctx);
        if (br) return br;
        
        return {
            value: val,
            ref: null,
            varName: `${a.var}:get`,
            bitWidth: 2
        };
    }
    
    /* ================= CREATE ================= */
    createDevice(name, baseId, bits, attributes, initialValue) {
        const color = attributes.color || '#6dff9c';
        const lgColor = attributes.lgColor || '#444444';
        const bgColor = attributes.bgColor || '#1a1a1a';
        const tranSec = attributes.tranSec || 2;
        const scale = 0.35 + (attributes.scale || 5) * 0.05;
        const nl = attributes.nl || false;
        
        let segInitialValue = initialValue || '00';
        
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
        
        if (typeof addClockDots === 'function') {
            addClockDots({
                id: segId,
                color,
                values: segInitialValue,
                nl,
                bgColor,
                lgColor,
                tranSec,
                scale
            });
        }
        
        if (attributes.segments && typeof setClockDots === 'function') {
            const segments = this.getSpecialParseAttributes().segAttributes;
            for (const s of segments) {
                if (attributes.segments[s] !== undefined) {
                    setClockDots(segId, s, attributes.segments[s] === '1');
                }
            }
        }
        
        return { deviceIds: [segId], ref: null };
    }
    
    /* ================= FINALIZE ================= */
    finalizeCompInfo(compInfo, attributes, initialValue, bits) {
        let segValue = initialValue || '00';
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
};

if (typeof module !== 'undefined') module.exports = ClockDotsComponent;
