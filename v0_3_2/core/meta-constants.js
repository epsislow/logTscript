/* ================= META CONSTANTS (per Run, wire init only) ================= */

const KNOWN_META_CONSTANTS = ['instance', 'signalStrategy'];

const META_INSTANCE_BITS = 4;

function clampInstanceForMeta(n) {
  if (typeof clampInstance === 'function') return clampInstance(n);
  const x = parseInt(n, 10);
  if (isNaN(x) || x < 1) return 1;
  if (x > 5) return 5;
  return x;
}

function resolveMetaConstant(name, interp, context) {
  if (name === 'instance') {
    const id = interp && interp._instanceId != null
      ? clampInstanceForMeta(interp._instanceId)
      : 1;
    return id.toString(2).padStart(META_INSTANCE_BITS, '0');
  }
  if (name === 'signalStrategy') {
    throw Error('Meta constant /signalStrategy/ is not implemented yet');
  }
  throw Error(`Unknown meta constant /${name}/`);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    KNOWN_META_CONSTANTS,
    META_INSTANCE_BITS,
    resolveMetaConstant,
  };
}
