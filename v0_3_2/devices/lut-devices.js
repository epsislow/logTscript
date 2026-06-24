/* ================= LUT (lookup table) DEVICES ================= */

function lutAddrBits(length) {
  if (length <= 1) return 1;
  return Math.ceil(Math.log2(length));
}

function addLut({ id, length = 16, depth = 4, table = null, default: defaultValue = null }) {
  if (!id) return;
  const addrBits = lutAddrBits(length);
  let fill = defaultValue;
  if (fill === null || fill === undefined) fill = '0'.repeat(depth);
  if (fill.length !== depth) {
    fill = fill.padStart(depth, '0').substring(0, depth);
  }
  let tbl = table;
  if (!tbl) {
    tbl = new Array(length);
    for (let i = 0; i < length; i++) tbl[i] = fill;
  }
  dm().luts.set(id, {
    length,
    depth,
    table: tbl.slice(),
    default: fill,
    inValue: '0'.repeat(addrBits),
  });
}

function setLutIn(id, addressBin) {
  const lut = dm().luts.get(id);
  if (!lut) return;
  const addrBits = lutAddrBits(lut.length);
  let bin = addressBin == null ? '' : String(addressBin);
  if (bin.length < addrBits) bin = bin.padStart(addrBits, '0');
  else if (bin.length > addrBits) bin = bin.substring(bin.length - addrBits);
  lut.inValue = bin;
}

function getLutOut(id) {
  const lut = dm().luts.get(id);
  if (!lut) return null;
  const addr = parseInt(lut.inValue, 2);
  if (isNaN(addr) || addr < 0 || addr >= lut.length) return lut.default;
  return lut.table[addr];
}

function getLutTable(id) {
  const lut = dm().luts.get(id);
  return lut ? lut.table.slice() : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { addLut, setLutIn, getLutOut, getLutTable, lutAddrBits };
}
