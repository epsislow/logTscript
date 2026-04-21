var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var FourteenSegComponent = class FourteenSegComponent extends BuiltinComponent {

    static get type() { return '14seg'; }
    static get shortnames() { return { '14': '14seg' }; }
    static get isReservedName() { return true; }

    getWidthBits() { return 15; }

    getSupportedProperties() {
        return ['get'];
    }

    getRedirectProperties() {
        return ['get'];
    }

    getSpecialParseAttributes() {
        return {
            segAttributes: [
                'a','b','c','d','e','f',
                'g1','g2',
                'h','i','j','k',
                'l','m',
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

                // same as 7seg
                { bits: '4', name: 'hex' },

                // NEW → binary char input
                { bits: '8', name: 'char' },

                // segments
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

            pouts: [
                { bits: '15', name: 'get' }
            ],

            returns: '15bit'
        };
    }

    createDevice(name, baseId, bits, attributes) {
        const color = attributes.color || "#6dff9c";

        if (typeof addFourteenSegment === "function") {
            addFourteenSegment({
                id: baseId,
                color
            });
        }

        return { deviceIds: [baseId], ref: null };
    }

    applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
        if (!pending) return;

        const segs = ["a","b","c","d","e","f","g1","g2","h","i","j","k","l","m","dp"];

        if (comp.deviceIds.length > 0) {
            const id = comp.deviceIds[0];

            for (const s of segs) {
                if (pending[s] !== undefined) {
                    let v = this.reEvalPendingValue(pending, s, reEvaluate, ctx);
                    const bit = v[v.length - 1] === '1';

                    if (typeof setSegment14 === "function") {
                        setSegment14(id, s, bit);
                    }
                }
            }
        }
    }

    updateDisplayValue(comp, value) {
        if (comp.deviceIds.length === 0) return;

        const id = comp.deviceIds[0];
        const segs = ["a","b","c","d","e","f","g1","g2","h","i","j","k","l","m","dp"];

        for (let i = 0; i < segs.length && i < value.length; i++) {
            if (typeof setSegment14 === "function") {
                setSegment14(id, segs[i], value[i] === '1');
            }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FourteenSegComponent;
}