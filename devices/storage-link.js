/* ================= STORAGE BACKEND RESOLVE (mem | cache) ================= */

const STORAGE_CHAIN_MAX = 8;

function storageAddrBits(length) {
  if (length <= 1) return 1;
  return 32 - Math.clz32(length - 1);
}

function resolveStorageBackend(ref, ctx, chainDepth) {
  const depth = chainDepth || 0;
  if (depth > STORAGE_CHAIN_MAX) {
    throw Error(`storage backend chain exceeds ${STORAGE_CHAIN_MAX} levels at ${ref}`);
  }
  if (!ref || !ctx || !ctx.components) {
    throw Error('storage link requires a component reference');
  }
  const comp = ctx.components.get(ref);
  if (!comp) {
    throw Error(`storage link ${ref} not found`);
  }
  if (!comp.deviceIds || !comp.deviceIds[0]) {
    throw Error(`storage link ${ref} has no device id`);
  }
  if (comp.type === 'mem') {
    const d = comp.attributes.depth !== undefined ? parseInt(comp.attributes.depth, 10) : 4;
    const length = comp.attributes.length !== undefined ? parseInt(comp.attributes.length, 10) : 3;
    if (isNaN(d) || d < 1 || isNaN(length) || length < 1) {
      throw Error(`storage link ${ref} has invalid depth/length`);
    }
    const readonly = !!(comp.attributes && comp.attributes.readonly);
    return {
      storageId: comp.deviceIds[0],
      kind: 'mem',
      compRef: ref,
      depth: d,
      length,
      readonly,
    };
  }
  if (comp.type === 'cache') {
    const d = comp.attributes.depth !== undefined ? parseInt(comp.attributes.depth, 10) : 4;
    const length = comp.attributes.length !== undefined ? parseInt(comp.attributes.length, 10) : 3;
    if (isNaN(d) || d < 1 || isNaN(length) || length < 1) {
      throw Error(`storage link ${ref} has invalid depth/length`);
    }
    return {
      storageId: comp.deviceIds[0],
      kind: 'cache',
      compRef: ref,
      depth: d,
      length,
      readonly: false,
    };
  }
  throw Error(`storage link ${ref} must be comp [mem] or comp [cache]`);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_CHAIN_MAX,
    storageAddrBits,
    resolveStorageBackend,
  };
}
