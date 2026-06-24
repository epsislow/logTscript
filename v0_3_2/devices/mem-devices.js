/* ================= MEMORY & MATH DEVICES ================= */

function addMem({ id, length = 3, depth = 4, default: defaultValue = null, ports = 1, readonly = false }) {
  if (!id) return;
  
  let defaultBin = defaultValue;
  if (defaultBin === null || defaultBin === undefined) {
    defaultBin = '0'.repeat(depth);
  }
  
  if (defaultBin.length !== depth) {
    defaultBin = defaultBin.padStart(depth, '0').substring(0, depth);
  }

  const portCount = Math.min(4, Math.max(1, ports));
  
  dm().memories.set(id, {
    length: length,
    depth: depth,
    default: defaultBin,
    data: new Map(),
    ports: portCount,
    readonly: !!readonly,
    writeQueue: new Map()
  });
}

function beginMemWritePhase(id) {
  const mem = dm().memories.get(id);
  if (mem) mem.writeQueue = new Map();
}

function beginAllMemWritePhases() {
  for (const [id] of dm().memories) {
    beginMemWritePhase(id);
  }
}

function queueMemWrite(id, port, startAddress, words) {
  const mem = dm().memories.get(id);
  if (!mem) return;
  for (let i = 0; i < words.length; i++) {
    const address = startAddress + i;
    const value = words[i];
    if (mem.writeQueue.has(address)) {
      const existing = mem.writeQueue.get(address);
      if (existing.port !== port) {
        throw Error(`Memory write collision at address ${address}`);
      }
    }
    mem.writeQueue.set(address, { port, value });
  }
}

function commitMemWrites(id) {
  const mem = dm().memories.get(id);
  if (!mem || mem.writeQueue.size === 0) return;
  for (const [address, entry] of mem.writeQueue.entries()) {
    setMem(id, address, entry.value);
  }
  mem.writeQueue.clear();
}

function commitAllMemWrites() {
  for (const [id] of dm().memories) {
    commitMemWrites(id);
  }
}

function setMem(id, address, value) {
  const mem = dm().memories.get(id);
  if (!mem) return;
  
  if (address < 0 || address >= mem.length) {
    throw Error(`Memory invalid address ${address} (length: ${mem.length} means address can be between 0 and ${mem.length - 1})`);
  }
  
  let binValue = value;
  if (binValue.length < mem.depth) {
    binValue = binValue.padStart(mem.depth, '0');
  } else if (binValue.length > mem.depth) {
    binValue = binValue.substring(0, mem.depth);
  }
  
  mem.data.set(address, binValue);
}

function getMem(id, address) {
  const mem = dm().memories.get(id);
  if (!mem) return null;
  
  if (address < 0 || address >= mem.length) {
    throw Error(`Memory invalid address ${address} (length: ${mem.length} means address can be between 0 and ${mem.length - 1})`);
  }
  
  if (mem.data.has(address)) {
    return mem.data.get(address);
  }
  
  return mem.default;
}


function addReg({ id, depth = 4, default: defaultValue = null }) {
  if (!id) return;
  
  let defaultBin = defaultValue;
  if (defaultBin === null || defaultBin === undefined) {
    defaultBin = '0'.repeat(depth);
  }
  
  if (defaultBin.length !== depth) {
    defaultBin = defaultBin.padStart(depth, '0').substring(0, depth);
  }
  
  dm().registers.set(id, {
    depth: depth,
    default: defaultBin,
    value: defaultBin
  });
}

function setReg(id, value) {
  const reg = dm().registers.get(id);
  if (!reg) return;
  
  let binValue = value;
  if (binValue.length < reg.depth) {
    binValue = binValue.padStart(reg.depth, '0');
  } else if (binValue.length > reg.depth) {
    binValue = binValue.substring(0, reg.depth);
  }
  
  reg.value = binValue;
}

function getReg(id) {
  const reg = dm().registers.get(id);
  if (!reg) return null;
  
  return reg.value || reg.default;
}


function addCounter({ id, depth = 4, default: defaultValue = null }) {
  if (!id) return;
  
  let defaultBin = defaultValue;
  if (defaultBin === null || defaultBin === undefined) {
    defaultBin = '0'.repeat(depth);
  }
  
  if (defaultBin.length !== depth) {
    defaultBin = defaultBin.padStart(depth, '0').substring(0, depth);
  }
  
  dm().counters.set(id, {
    depth: depth,
    default: defaultBin,
    value: defaultBin
  });
}

function setCounter(id, value) {
  const counter = dm().counters.get(id);
  if (!counter) return;
  
  let binValue = value;
  if (binValue.length < counter.depth) {
    binValue = binValue.padStart(counter.depth, '0');
  } else if (binValue.length > counter.depth) {
    binValue = binValue.substring(0, counter.depth);
  }
  
  counter.value = binValue;
}

function getCounter(id) {
  const counter = dm().counters.get(id);
  if (!counter) return null;
  
  return counter.value || counter.default;
}


function addAdder({ id, depth = 4 }) {
  if (!id) return;
  
  dm().adders.set(id, {
    depth: depth,
    a: '0'.repeat(depth),
    b: '0'.repeat(depth)
  });
}

function setAdderA(id, value) {
  const adder = dm().adders.get(id);
  if (!adder) return;
  
  let binValue = value;
  if (binValue.length < adder.depth) {
    binValue = binValue.padStart(adder.depth, '0');
  } else if (binValue.length > adder.depth) {
    binValue = binValue.substring(0, adder.depth);
  }
  
  adder.a = binValue;
}

function setAdderB(id, value) {
  const adder = dm().adders.get(id);
  if (!adder) return;
  
  let binValue = value;
  if (binValue.length < adder.depth) {
    binValue = binValue.padStart(adder.depth, '0');
  } else if (binValue.length > adder.depth) {
    binValue = binValue.substring(0, adder.depth);
  }
  
  adder.b = binValue;
}

function getAdder(id) {
  const adder = dm().adders.get(id);
  if (!adder) return null;
  
  const aNum = BigInt('0b' + adder.a);
  const bNum = BigInt('0b' + adder.b);
  const sum = aNum + bNum;
  
  const maxValue = (BigInt(1) << BigInt(adder.depth)) - BigInt(1);
  const result = sum & maxValue;
  
  let binStr = result.toString(2);
  if(binStr.length < adder.depth){
    binStr = binStr.padStart(adder.depth, '0');
  } else if(binStr.length > adder.depth){
    binStr = binStr.substring(binStr.length - adder.depth);
  }
  return binStr;
}

function getAdderCarry(id) {
  const adder = dm().adders.get(id);
  if (!adder) return null;
  
  const aNum = BigInt('0b' + adder.a);
  const bNum = BigInt('0b' + adder.b);
  const sum = aNum + bNum;
  
  const maxValue = (BigInt(1) << BigInt(adder.depth)) - BigInt(1);
  const hasCarry = sum > maxValue;
  
  return hasCarry ? '1' : '0';
}


function addSubtract({ id, depth = 4 }) {
  if (!id) return;
  
  dm().subtracts.set(id, {
    depth: depth,
    a: '0'.repeat(depth),
    b: '0'.repeat(depth)
  });
}

function setSubtractA(id, value) {
  const subtract = dm().subtracts.get(id);
  if (!subtract) return;
  
  let binValue = value;
  if (binValue.length < subtract.depth) {
    binValue = binValue.padStart(subtract.depth, '0');
  } else if (binValue.length > subtract.depth) {
    binValue = binValue.substring(0, subtract.depth);
  }
  
  subtract.a = binValue;
}

function setSubtractB(id, value) {
  const subtract = dm().subtracts.get(id);
  if (!subtract) return;
  
  let binValue = value;
  if (binValue.length < subtract.depth) {
    binValue = binValue.padStart(subtract.depth, '0');
  } else if (binValue.length > subtract.depth) {
    binValue = binValue.substring(0, subtract.depth);
  }
  
  subtract.b = binValue;
}

function getSubtract(id) {
  const subtract = dm().subtracts.get(id);
  if (!subtract) return null;
  
  const aNum = BigInt('0b' + subtract.a);
  const bNum = BigInt('0b' + subtract.b);
  let diff = aNum - bNum;
  
  const maxValue = (BigInt(1) << BigInt(subtract.depth)) - BigInt(1);
  const wrapValue = BigInt(1) << BigInt(subtract.depth);
  if (diff < 0) {
    diff = diff + wrapValue;
  }
  
  const result = diff & maxValue;
  
  let binStr = result.toString(2);
  if(binStr.length < subtract.depth){
    binStr = binStr.padStart(subtract.depth, '0');
  } else if(binStr.length > subtract.depth){
    binStr = binStr.substring(binStr.length - subtract.depth);
  }
  return binStr;
}

function getSubtractCarry(id) {
  const subtract = dm().subtracts.get(id);
  if (!subtract) return null;
  
  const aNum = BigInt('0b' + subtract.a);
  const bNum = BigInt('0b' + subtract.b);
  const diff = aNum - bNum;
  
  const hasBorrow = diff < 0;
  
  return hasBorrow ? '1' : '0';
}


function addDivider({ id, depth = 4 }) {
  if (!id) return;
  
  dm().dividers.set(id, {
    depth: depth,
    a: '0'.repeat(depth),
    b: '0'.repeat(depth)
  });
}

function setDividerA(id, value) {
  const divider = dm().dividers.get(id);
  if (!divider) return;
  
  let binValue = value;
  if (binValue.length < divider.depth) {
    binValue = binValue.padStart(divider.depth, '0');
  } else if (binValue.length > divider.depth) {
    binValue = binValue.substring(0, divider.depth);
  }
  
  divider.a = binValue;
}

function setDividerB(id, value) {
  const divider = dm().dividers.get(id);
  if (!divider) return;
  
  let binValue = value;
  if (binValue.length < divider.depth) {
    binValue = binValue.padStart(divider.depth, '0');
  } else if (binValue.length > divider.depth) {
    binValue = binValue.substring(0, divider.depth);
  }
  
  divider.b = binValue;
}

function getDivider(id) {
  const divider = dm().dividers.get(id);
  if (!divider) return null;
  
  const aNum = BigInt('0b' + divider.a);
  const bNum = BigInt('0b' + divider.b);
  
  if (bNum === BigInt(0)) {
    return '0'.repeat(divider.depth);
  }
  
  const quotient = aNum / bNum;
  
  const maxValue = (BigInt(1) << BigInt(divider.depth)) - BigInt(1);
  const result = quotient & maxValue;
  
  let binStr = result.toString(2);
  if(binStr.length < divider.depth){
    binStr = binStr.padStart(divider.depth, '0');
  } else if(binStr.length > divider.depth){
    binStr = binStr.substring(binStr.length - divider.depth);
  }
  return binStr;
}

function getDividerMod(id) {
  const divider = dm().dividers.get(id);
  if (!divider) return null;
  
  const aNum = BigInt('0b' + divider.a);
  const bNum = BigInt('0b' + divider.b);
  
  if (bNum === BigInt(0)) {
    return '0'.repeat(divider.depth);
  }
  
  const remainder = aNum % bNum;
  
  const maxValue = (BigInt(1) << BigInt(divider.depth)) - BigInt(1);
  const result = remainder & maxValue;
  
  let binStr = result.toString(2);
  if(binStr.length < divider.depth){
    binStr = binStr.padStart(divider.depth, '0');
  } else if(binStr.length > divider.depth){
    binStr = binStr.substring(binStr.length - divider.depth);
  }
  return binStr;
}


function addMultiplier({ id, depth = 4 }) {
  if (!id) return;
  
  dm().multipliers.set(id, {
    depth: depth,
    a: '0'.repeat(depth),
    b: '0'.repeat(depth)
  });
}

function setMultiplierA(id, value) {
  const multiplier = dm().multipliers.get(id);
  if (!multiplier) return;
  
  let binValue = value;
  if (binValue.length < multiplier.depth) {
    binValue = binValue.padStart(multiplier.depth, '0');
  } else if (binValue.length > multiplier.depth) {
    binValue = binValue.substring(0, multiplier.depth);
  }
  
  multiplier.a = binValue;
}

function setMultiplierB(id, value) {
  const multiplier = dm().multipliers.get(id);
  if (!multiplier) return;
  
  let binValue = value;
  if (binValue.length < multiplier.depth) {
    binValue = binValue.padStart(multiplier.depth, '0');
  } else if (binValue.length > multiplier.depth) {
    binValue = binValue.substring(0, multiplier.depth);
  }
  
  multiplier.b = binValue;
}

function getMultiplier(id) {
  const multiplier = dm().multipliers.get(id);
  if (!multiplier) return null;
  
  const aNum = BigInt('0b' + multiplier.a);
  const bNum = BigInt('0b' + multiplier.b);
  const product = aNum * bNum;
  
  const maxValue = (BigInt(1) << BigInt(multiplier.depth)) - BigInt(1);
  const result = product & maxValue;
  
  let binStr = result.toString(2);
  if(binStr.length < multiplier.depth){
    binStr = binStr.padStart(multiplier.depth, '0');
  } else if(binStr.length > multiplier.depth){
    binStr = binStr.substring(binStr.length - multiplier.depth);
  }
  return binStr;
}

function getMultiplierOver(id) {
  const multiplier = dm().multipliers.get(id);
  if (!multiplier) return null;
  
  const aNum = BigInt('0b' + multiplier.a);
  const bNum = BigInt('0b' + multiplier.b);
  const product = aNum * bNum;
  
  const overflow = product >> BigInt(multiplier.depth);
  
  const maxValue = (BigInt(1) << BigInt(multiplier.depth)) - BigInt(1);
  const result = overflow & maxValue;
  
  let binStr = result.toString(2);
  if(binStr.length < multiplier.depth){
    binStr = binStr.padStart(multiplier.depth, '0');
  } else if(binStr.length > multiplier.depth){
    binStr = binStr.substring(binStr.length - multiplier.depth);
  }
  return binStr;
}


function addShifter({ id, depth = 4, circular = false }) {
  if (!id) return;
  
  dm().shifters.set(id, {
    depth: depth,
    circular: circular,
    value: '0'.repeat(depth),
    direction: 1,
    in: '0',
    out: '0'
  });
}

function setShifterValue(id, value) {
  const shifter = dm().shifters.get(id);
  if (!shifter) return;
  
  let binValue = value;
  if (binValue.length < shifter.depth) {
    binValue = binValue.padStart(shifter.depth, '0');
  } else if (binValue.length > shifter.depth) {
    binValue = binValue.substring(0, shifter.depth);
  }
  
  shifter.value = binValue;
}

function setShifterDir(id, direction) {
  const shifter = dm().shifters.get(id);
  if (!shifter) return;
  
  shifter.direction = direction === 1 ? 1 : 0;
}

function setShifterIn(id, inBit) {
  const shifter = dm().shifters.get(id);
  if (!shifter) return;
  
  shifter.in = inBit === '1' ? '1' : '0';
}

function shiftShifter(id) {
  const shifter = dm().shifters.get(id);
  if (!shifter) return;
  
  const currentValue = shifter.value;
  let newValue = '';
  let outBit = '0';
  
  if (shifter.direction === 1) {
    outBit = currentValue[currentValue.length - 1];
    if (shifter.circular) {
      newValue = outBit + currentValue.substring(0, currentValue.length - 1);
    } else {
      newValue = shifter.in + currentValue.substring(0, currentValue.length - 1);
    }
  } else {
    outBit = currentValue[0];
    if (shifter.circular) {
      newValue = currentValue.substring(1) + outBit;
    } else {
      newValue = currentValue.substring(1) + shifter.in;
    }
  }
  
  shifter.value = newValue;
  shifter.out = outBit;
}

function getShifter(id) {
  const shifter = dm().shifters.get(id);
  if (!shifter) return null;
  
  return shifter.value;
}

function getShifterOut(id) {
  const shifter = dm().shifters.get(id);
  if (!shifter) return null;
  
  return shifter.out;
}
