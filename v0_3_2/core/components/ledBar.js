var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var LedBarComponent = class LedBarComponent extends BuiltinComponent {
    
    static get type() { return 'bar'; }
    static get shortnames() { return { '': 'bar' }; }
    static get isReservedName() { return true; }
    
    // The width is dynamic based on the 'length' attribute
    getWidthBits(attributes) { 
        return attributes && attributes.length ? parseInt(attributes.length) : 8; 
    }
    
    getSupportedProperties() { return ['get']; }
    getRedirectProperties() { return ['get']; }
    
    getDef(attributes) {
        const len = this.getWidthBits(attributes);
        return {
            attrs: [
                { name: 'length', value: 'integer' },
                { name: 'width', value: 'integer' },
                { name: 'gap', value: 'integer' },
                { name: 'color', value: 'string' },
                { name: 'bgColor', value: 'string' },
                { name: 'lgColor', value: 'string' },
                { name: 'orientation', value: 'integer' },
                { name: 'barWidth', value: 'integer' },
                { name: 'tranSec', value: 'integer' },
                { name: 'scale', value: 'integer' },
                { name: 'nl', value: null }
            ],
            initValue: len + 'bit',
            pins: [
                { bits: '1', name: 'set' },
                { bits: len, name: 'data' }
                // Individual pins could be added here dynamically if needed
            ],
            pouts: [{ bits: len, name: 'get' }],
            returns: len + 'bit'
        };
    }
    
    /* ================= FINALIZE ================= */
    finalizeCompInfo(compInfo, attributes, initialValue, bits) {
        const len = this.getWidthBits(attributes);
        compInfo.lastSegmentValue = initialValue || '0'.repeat(len);
    }
    
    /* ================= APPLY ================= */
    applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
        if (!pending) return;
        
        // Handle the entire bar update via 'data' pin
        if (pending.data !== undefined) {
            const data = this.reEvalPendingValue(pending, 'data', reEvaluate, ctx);
            this._applyPattern(comp, data);
        }
        
        // Individual segment logic can be added here if you define pins for them
    }
    
    _applyPattern(comp, pattern) {
        if (comp.deviceIds.length === 0) return;
        
        const barId = comp.deviceIds[0];
        if (typeof setBarState === 'function') {
            setBarState(barId, pattern);
        }
        
        comp.lastSegmentValue = pattern;
    }
    
    /* ================= UPDATE DISPLAY ================= */
    updateDisplayValue(comp, value, bitRange) {
        let bitsToUse = value;
        const len = comp.lastSegmentValue ? comp.lastSegmentValue.length : 8;
        
        if (bitRange) {
            const { start, end } = bitRange;
            const actualEnd = end !== undefined ? end : start;
            bitsToUse = value.substring(start, actualEnd + 1);
        }
        
        if (comp.deviceIds.length > 0) {
            const barId = comp.deviceIds[0];
            
            let v = bitsToUse;
            if (typeof LogicValue !== 'undefined' && LogicValue.normalizeDeviceDisplayBits) {
              v = LogicValue.normalizeDeviceDisplayBits(bitsToUse, len);
            } else {
              if (v.length < len) v = v.padEnd(len, '0');
              else if (v.length > len) v = v.substring(0, len);
            }
            
            if (typeof setBarState === 'function') {
            //    if(barId =='bar2') {
                //  console.log(len);
                //  console.log('=', bitsToUse);
              //  }
                setBarState(barId, v);
            }
            
            comp.lastSegmentValue = v;
        }
    }
    
    /* ================= CREATE ================= */
    createDevice(name, baseId, bits, attributes, initialValue) {
        const length = attributes.length || 8;
        const width = attributes.width || 10;
        const barWidth = attributes.barWidth || 20;
        const gap = attributes.gap || 2;
        const color = attributes.color || '#6dff9c';
        const lgColor = attributes.lgColor || '#444444';
        const bgColor = attributes.bgColor || '#1a1a1a';
        const orientation = attributes.orientation || 0;
        const tranSec = attributes.tranSec || 2;
        const scale = 0.35 + (attributes.scale || 5) * 0.05;
        const nl = attributes.nl || false;
        
        let barInitialValue = initialValue || '0'.repeat(length);
        const barId = baseId;
        
        if (typeof addBarDevice === 'function') {
            addBarDevice({
                id: barId,
                length,
                width,
                barWidth,
                gap,
                color,
                values: barInitialValue,
                nl,
                bgColor,
                lgColor,
                tranSec,
                scale,
                orientation
            });
        }
        
        return { deviceIds: [barId], ref: null };
    }
};

if (typeof module !== 'undefined') module.exports = LedBarComponent;
