/* ================= INTERPRETER ================= */

class Interpreter {
  constructor(funcs,out,pcbs=null,componentRegistry=null){
    this.funcs=funcs;
    this.out=out;
    this.componentRegistry = componentRegistry;
    this.storage=[]; // Array of stored values: [{value: "101", index: 0}, ...]
    this.nextIndex=0;
    this.vars=new Map(); // Variable name -> {type, value, ref}
    this.wires=new Map(); // Wire name -> {type, ref}
    this.cycle=0;
    this.wireStatements=[]; // Statements that assign to wires (for NEXT)
    this.regStatements=[]; // REG statements (for NEXT)
    this.regStorageMap=new Map(); // Map from statement to REG storage index
    this.regPendingMap=new Map(); // Map from statement to REG pending input value (for next cycle)
    this.wireStorageMap=new Map(); // Map from wire name to storage index (for reuse during NEXT)
    this.mode='STRICT'; // Default mode: STRICT (wires immutable)
    this.aliases = new Map();
    this.components=new Map(); // Component name -> {type, componentType, attributes, initialValue, returnType, ref, deviceIds}
    this.componentConnections=new Map(); // Component name -> {source: ref or expr, bitRange}
    this.componentPendingProperties=new Map(); // Component name -> {property: {expr, value}} - properties waiting to be applied
    this.componentPendingSet=new Map(); // Component name -> 'immediate' | 'next' - when to apply pending properties
    this.componentPropertyBlocks=[]; // Array of {component, properties, dependencies} - property blocks for re-execution
    
    // PCB support
    this.pcbDefinitions = pcbs || new Map(); // name -> { pins, pouts, exec, on, body, nextSection, returnSpec }
    this.pcbInstances = new Map(); // .instanceName -> { pcbName, pinStorage, poutStorage, internalPrefix, context }
    this.insidePcbBody = false; // Flag to track if we're executing inside a PCB body
    this.currentPcbInstance = null; // Current PCB instance name when inside PCB body
    
    // Oscillator timers (for cleanup on re-run)
    this.oscTimers = [];
    
    // Initialize ~
    this.vars.set('~', {type: '1bit', value: '0', ref: null});
    
    // Initialize % (first run flag)
    this.firstRun = true; // Flag to track if this is the first run
    this.vars.set('%', {type: '1bit', value: '1', ref: null});
    
    // Initialize $ (random bit generator)
    // $ generates random bits at each NEXT(~)
    this.randomBitCache = new Map(); // Cache for random bits with ranges: 'default' or 'start-end' or 'start/length'
    this.generateRandomBit(); // Initialize with a random bit
    
    this.cycle=1;
  }

  getBitWidth(type){
    if(!type) return null;
    const m = type.match(/^(\d+)(bit|wire)$/);
    return m ? parseInt(m[1]) : null;
  }

  getComponentBits(compType, attributes){
    if(this.componentRegistry){
      const handler = this.componentRegistry.get(compType);
      if(handler) return handler.getWidthBits(attributes);
    }
    return 4;
  }

  isWire(type){
    return type && type.endsWith('wire');
  }
  
  isBuiltinREG(name) {
    if (/^REG\d+$/.test(name)) return true;
  }
  
  isBuiltinMUX(name) {
    return name === 'MUX';
  }
  
  isBuiltinDEMUX(name) {
    return name === 'DEMUX';
  }
  
  isBuiltinFunction(name) {
    if (name === 'show') return true;
  
    if (['NOT', 'AND', 'OR', 'XOR', 'NXOR', 'NAND', 'NOR', 'EQ', 'LATCH',
         'LSHIFT', 'RSHIFT',
         'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'].includes(name)) {
      return true;
    }
  
  return this.isBuiltinREG(name) 
    || this.isBuiltinMUX(name) 
    || this.isBuiltinDEMUX(name);
}

  // Format binary string as hex/binary display
  formatValue(binStr, bitWidth, truncateAt80=false){
    if(!binStr || binStr === '-') return binStr;
    
    // Truncate for display if > 80 bits (for variables panel)
    let displayStr = binStr;
    if(truncateAt80 && binStr.length > 80){
      displayStr = binStr.substring(0, 80);
    }
    
    // If 8 bits or less, show as binary
    if(bitWidth <= 8){
      return displayStr + (truncateAt80 && binStr.length > 80 ? ' ..' : '');
    }
    
    // For >= 32 bits, format hex in groups of 4 hex digits
    if(bitWidth >= 32){
      const parts = [];
      let remaining = displayStr;
      
      // Process in 8-bit chunks (2 hex digits each)
      let hexStr = '';
      while(remaining.length >= 8){
        const chunk = remaining.substring(0, 8);
        const hexVal = parseInt(chunk, 2).toString(16).toUpperCase().padStart(2, '0');
        hexStr += hexVal;
        remaining = remaining.substring(8);
      }
      
      // Group hex digits in groups of 4 with spaces
      if(hexStr){
        let grouped = '';
        for(let i = 0; i < hexStr.length; i++){
          grouped += hexStr[i];
          // Add space after every 4 hex digits (except at the end)
          if((i + 1) % 4 === 0 && i < hexStr.length - 1){
            grouped += ' ';
          }
        }
        parts.push(`^${grouped}`);
      }
      
      // Add remaining bits as binary
      if(remaining.length > 0){
        parts.push(remaining);
      }
      
      const result = parts.join(' + ');
      return result + (truncateAt80 && binStr.length > 80 ? ' ..' : '');
    }
    
    // For 9-31 bits, format as hex + binary
    const parts = [];
    let remaining = displayStr;
    
    // Process in 8-bit chunks (hex)
    while(remaining.length >= 8){
      const chunk = remaining.substring(0, 8);
      const hexVal = parseInt(chunk, 2).toString(16).toUpperCase().padStart(2, '0');
      parts.push(`^${hexVal}`);
      remaining = remaining.substring(8);
    }
    
    // Add remaining bits as binary
    if(remaining.length > 0){
      parts.push(remaining);
    }
    
    const result = parts.join(' + ');
    return result + (truncateAt80 && binStr.length > 80 ? ' ..' : '');
  }
  
  getVal(value, width){
    return (value ==='-') ? '0'.repeat(width) : value;
  }

  storeValue(value){
    const idx = this.nextIndex++;
    this.storage.push({value, index: idx});
    return idx;
  }

  // Set a value at a reference (update existing storage)
  setValueAtRef(refStr, value){
    if(!refStr || refStr === '&-') return false;
    
    // Extract storage index from ref like &0, &1, etc.
    const match = refStr.match(/^&(\d+)/);
    if(!match) return false;
    
    const idx = parseInt(match[1]);
    const stored = this.storage.find(s => s.index === idx);
    if(stored){
      stored.value = value;
      return true;
    }
    return false;
  }

  // Parse a complex reference string and return the value
  // Examples: &0, &1.0, &1.2-4, (101), &0&1, (11)&2, etc.
  getValueFromRef(refStr){
    if(!refStr || refStr === '&-') return null;
    
    // Handle complex references by parsing them piece by piece
    let result = '';
    let i = 0;
    
    while(i < refStr.length){
      // Literal in parentheses: (101)
      if(refStr[i] === '('){
        const end = refStr.indexOf(')', i);
        if(end === -1) return null;
        result += refStr.substring(i+1, end);
        i = end + 1;
        continue;
      }
      
      // Reference: &0, &1.0, &1.2-4
      if(refStr[i] === '&'){
        i++;
        let numStr = '';
        while(i < refStr.length && /[0-9]/.test(refStr[i])){
          numStr += refStr[i];
          i++;
        }
        
        if(numStr === '') return null;
        const idx = parseInt(numStr);
        const stored = this.storage.find(s => s.index === idx);
        if(!stored) {
          return null;
        }
        
        // Check for bit selection: .0 or .2-4
        if(i < refStr.length && refStr[i] === '.'){
          i++;
          let bitStr = '';
          while(i < refStr.length && /[0-9-]/.test(refStr[i])){
            bitStr += refStr[i];
            i++;
          }
          
          if(bitStr.includes('-')){
            // Range: 2-4
            const [start, end] = bitStr.split('-').map(x => parseInt(x));
            if(isNaN(start) || isNaN(end)) return null;
            result += stored.value.substring(start, end+1);
          } else {
            // Single bit: 0
            const bit = parseInt(bitStr);
            if(isNaN(bit) || bit >= stored.value.length) return null;
            result += stored.value[bit];
          }
        } else {
          // Full value
          result += stored.value;
        }
        continue;
      }
      
      i++;
    }
    
    return result || null;
  }

  generateRandomBit(){
    // Generate a single random bit (0 or 1) for default $
    const bit = Math.random() < 0.5 ? '0' : '1';
    this.randomBitCache.set('default', bit);
  }
  
  generateRandomBits(numBits){
    // Generate multiple random bits
    let bits = '';
    for(let i = 0; i < numBits; i++){
      bits += Math.random() < 0.5 ? '0' : '1';
    }
    return bits;
  }
  
  getRandomBitsForRange(bitRange){
    // Get random bits for a specific bit range
    if(!bitRange){
      // No bit range, return single random bit
      if(!this.randomBitCache.has('default')){
        this.generateRandomBit();
      }
      return this.randomBitCache.get('default');
    }
    
    // Calculate number of bits from range
    const {start, end} = bitRange;
    const actualEnd = end !== undefined && end !== null ? end : start;
    const numBits = Math.abs(actualEnd - start) + 1;
    
    // Generate random bits for this range
    const cacheKey = `${start}-${actualEnd}`;
    if(!this.randomBitCache.has(cacheKey)){
      this.randomBitCache.set(cacheKey, this.generateRandomBits(numBits));
    }
    return this.randomBitCache.get(cacheKey);
  }

  formatRef(ref, varName){
    // Special case: show(&~) shows cycle number
    if(varName === '~' && (ref === null || ref === '&-')){
      return `>${this.cycle}`;
    }
    if(!ref || ref === '&-') return '&-';
    return ref;
  }

  evalExpr(expr, computeRefs=false){
  const parts = [];

  for (const x of expr) {
      const v = this.evalAtom(x, computeRefs);

    if (Array.isArray(v)) {
      for (const part of v) parts.push(part);
    } else {
      parts.push(v);
    }
  }

  return parts;
}

  // Build a reference string from expression parts
  buildRefFromParts(parts, bitsNeeded, startOffset=0){
    let refStr = '';
    let bitsRemaining = bitsNeeded;
    let globalBitPos = 0;
    
    for(let partIdx = 0; partIdx < parts.length; partIdx++){
      const part = parts[partIdx];
      if(bitsRemaining <= 0) break;
      
      let partValue = '';
      let partRef = null;
      
      // Prioritize ref over value when building wire references
      if(part.ref && part.ref !== '&-'){
        partRef = part.ref;
        // First try to get value from the ref
        partValue = this.getValueFromRef(part.ref) || '';
        // If we have a ref but no value from getValueFromRef, try to get it directly from storage
        if(!partValue && partRef) {
          const refMatch = partRef.match(/^&(\d+)/);
          if(refMatch){
            const stored = this.storage.find(s => s.index === parseInt(refMatch[1]));
            if(stored) partValue = stored.value;
          }
        }
        // If still no value but part has a value property, use that (for function returns)
        // Also, if partValue exists but is shorter than part.value, prefer part.value (full value)
        if(part.value && part.value !== '-'){
          if(!partValue || part.value.length > partValue.length){
            partValue = part.value;
          }
        }
      } else if(part.value && part.value !== '-'){
        partValue = part.value;
      }
      
      // If we have a ref, we can build the reference even without value
      if(!partValue && !partRef) continue;
      
      const partBits = partValue ? partValue.length : 0;
      
      // Use bitWidth from the part if available (for bit ranges like data.0)
      let actualPartBits = part.bitWidth || partBits;
      
      // If we have a ref but no value, we need to know the bit width
      // Try to get it from the storage
      if(actualPartBits === 0 && partRef && partRef.startsWith('&')){
        const refMatch = partRef.match(/^&(\d+)/);
        if(refMatch){
          const stored = this.storage.find(s => s.index === parseInt(refMatch[1]));
          if(stored) {
            // Only use full storage value if this is NOT a bit range
            if(!partRef.includes('.')){
              partValue = stored.value;
              actualPartBits = stored.value.length;
            } else {
              // For bit ranges, use the extracted value length
              if(partValue) {
                actualPartBits = partValue.length;
              }
            }
          }
        }
      }
      
      // If we have a ref but partValue is shorter than expected, try to get full value from ref
      // This handles cases where getValueFromRef might have returned a partial value
      // BUT: Don't expand if this is a bit range (has . in the ref)
      if(partRef && partRef.startsWith('&') && partValue && actualPartBits < bitsNeeded && !partRef.includes('.')){
        const refMatch = partRef.match(/^&(\d+)/);
        if(refMatch){
          // Simple ref like &5 (not a bit range like &5.0)
          const stored = this.storage.find(s => s.index === parseInt(refMatch[1]));
          if(stored && stored.value.length > actualPartBits){
            partValue = stored.value;
            actualPartBits = stored.value.length;
          }
        }
      }
      
      if(actualPartBits === 0 && !partRef) continue;
      
      // Skip bits before startOffset
      if(globalBitPos + actualPartBits <= startOffset){
        globalBitPos += actualPartBits;
        continue;
      }
      
      // Calculate which bits we need from this part
      const partStart = Math.max(0, startOffset - globalBitPos);
      const partEnd = Math.min(actualPartBits, startOffset + bitsNeeded - globalBitPos);
      const bitsToTake = partEnd - partStart;
      
      if(bitsToTake <= 0){
        globalBitPos += actualPartBits;
        continue;
      }
      
      if(partRef){
        // Has a reference
        if(bitsToTake === actualPartBits && partStart === 0){
          // Use full reference
          refStr += partRef;
        } else {
          // Extract specific bits from reference
          if(partRef.startsWith('&')){
            const baseMatch = partRef.match(/^&(\d+)/);
            if(baseMatch){
              const baseIdx = baseMatch[1];
              if(bitsToTake === 1){
                // Single bit
                refStr += `&${baseIdx}.${partStart}`;
              } else {
                // Range
                refStr += `&${baseIdx}.${partStart}-${partEnd-1}`;
              }
            } else {
              // Complex reference, use literal
              const literalBits = partValue ? partValue.substring(partStart, partEnd) : '0'.repeat(bitsToTake);
              refStr += `(${literalBits})`;
            }
          } else {
            // Literal reference, extract bits
            const literalBits = partValue ? partValue.substring(partStart, partEnd) : '0'.repeat(bitsToTake);
            refStr += `(${literalBits})`;
          }
        }
      } else {
        // Literal value
        const literalBits = partValue.substring(partStart, partEnd);
        refStr += `(${literalBits})`;
      }
      
      bitsRemaining -= bitsToTake;
      globalBitPos += actualPartBits;
    }
    
    return refStr || '&-';
  }

  // Resolve a bitRange object to concrete {start, end} integers.
  // Handles both static {start, end} and dynamic {startExpr, endExpr/lenExpr, isDynamic}.
  resolveBitRange(bitRange) {
    if (!bitRange.isDynamic) {
      const end = (bitRange.end !== undefined && bitRange.end !== null)
        ? bitRange.end : bitRange.start;
      return { start: bitRange.start, end };
    }

    let start = bitRange.start !== undefined ? bitRange.start : null;
    let end   = bitRange.end   !== undefined ? bitRange.end   : null;

    if (bitRange.startExpr) {
      const parts = this.evalExpr(bitRange.startExpr, false);
      const v = parts.map(p => p.value || '0').join('');
      start = parseInt(v, 2);
    }

    if (bitRange.endExpr) {
      const parts = this.evalExpr(bitRange.endExpr, false);
      const v = parts.map(p => p.value || '0').join('');
      end = parseInt(v, 2);
    } else if (bitRange.lenExpr) {
      const parts = this.evalExpr(bitRange.lenExpr, false);
      const v = parts.map(p => p.value || '0').join('');
      end = start + parseInt(v, 2) - 1;
    } else if (bitRange.len !== undefined && bitRange.len !== null) {
      // Mixed case: dynamic start + static length (e.g. data.(start)/4)
      end = start + bitRange.len - 1;
    } else if (end === null) {
      end = start; // single bit
    }

    return { start, end };
  }

  applyPad(value, pad){
    if(pad && value && value.length < pad) return value.padStart(pad, '0');
    return value;
  }

  evalAtom(a, computeRefs=false, varName=null){
    // Handle NOT prefix - if present, evaluate without it and then invert the result
    if(a.not){
      const atomWithoutNot = {...a};
      delete atomWithoutNot.not;
      const result = this.evalAtom(atomWithoutNot, computeRefs, varName);

      // Apply NOT to the result value (invert all bits)
      if(result.value && result.value !== '-'){
        const invertedValue = result.value.split('').map(bit =>
          bit === '0' ? '1' : bit === '1' ? '0' : bit
        ).join('');
        result.value = invertedValue;

        // For NOT results, the original ref is no longer valid
        // Store the new value and create a new ref if computeRefs is true
        if(computeRefs){
          const idx = this.storeValue(invertedValue);
          result.ref = `&${idx}`;
        } else {
          result.ref = null;
        }
      }
      return result;
    }

    if(a.bin){
      let binStr = a.bin;
      if(a.bitRange){
        const {start, end} = a.bitRange;
        binStr = binStr.substring(start, end + 1);
      }
      if(a.pad) binStr = this.applyPad(binStr, a.pad);
      if(a.bitRange || a.pad){
        return {value: binStr, ref: null, varName: null, bitWidth: binStr.length};
      }
      // If computeRefs is true (wire assignment), store in storage and return reference
      if(computeRefs){
        const idx = this.storeValue(binStr);
        return {value: binStr, ref: `&${idx}`, varName: null};
      }
      return {value: binStr, ref: null, varName: null};
    }
    if(a.hex){
      // Convert hex to binary
      const hexStr = a.hex;
      let binStr = '';
      for(let i = 0; i < hexStr.length; i++){
        const hexDigit = parseInt(hexStr[i], 16);
        binStr += hexDigit.toString(2).padStart(4, '0');
      }
      if(a.bitRange){
        const {start, end} = a.bitRange;
        binStr = binStr.substring(start, end + 1);
      }
      if(a.pad) binStr = this.applyPad(binStr, a.pad);
      if(a.bitRange || a.pad){
        return {value: binStr, ref: null, varName: null, bitWidth: binStr.length};
      }
      // If computeRefs is true (wire assignment), store in storage and return reference
      if(computeRefs){
        const idx = this.storeValue(binStr);
        return {value: binStr, ref: `&${idx}`, varName: null};
      }
      return {value: binStr, ref: null, varName: null};
    }
    if(a.dec){
      // Convert decimal number to binary
      const num = parseInt(a.dec, 10);
      const binStr = num.toString(2);
      if(computeRefs){
        const idx = this.storeValue(binStr);
        return {value: binStr, ref: `&${idx}`, varName: null};
      }
      return {value: binStr, ref: null, varName: null};
    }
    if(a.var){
      if(a.var === '~'){
        return {value: '1', ref: null, varName: '~'}; // ~ is always 1 during execution
      }
      
      if(a.var === '%'){
        // % is 1 only during first run, 0 afterwards
        const value = this.firstRun ? '1' : '0';
        return {value: value, ref: null, varName: '%'};
      }
      
      if(a.var === '$'){
        // $ generates random bits
        // Support bit range: $.0, $.2-5, $.0/4, etc.
        const randomBits = this.getRandomBitsForRange(a.bitRange);
        const bitWidth = randomBits.length;
        return {value: randomBits, ref: null, varName: '$', bitWidth: bitWidth};
      }
      
      // Check if it's a component (starts with .)
      if(a.var.startsWith('.')){
        // First check if it's a PCB instance
        const pcbInstance = this.pcbInstances.get(a.var);
        if(pcbInstance){
          // PCB instance access
          if(a.property){
            // Check if it's a pout (output)
            const poutInfo = pcbInstance.poutStorage.get(a.property);
            if(poutInfo){
              let val = this.getValueFromRef(poutInfo.ref) || '0'.repeat(poutInfo.bits);

              // Handle bit range if specified
              if(a.bitRange){
                const {start, end: actualEnd} = this.resolveBitRange(a.bitRange);
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:${a.property} (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                const extractedPadded = a.pad ? this.applyPad(extracted, a.pad) : extracted;
                return {value: extractedPadded, ref: null, varName: `${a.var}:${a.property}.${varNameSuffix}`, bitWidth: extractedPadded.length};
              }

              if(a.pad){
                const padded = this.applyPad(val, a.pad);
                return {value: padded, ref: null, varName: `${a.var}:${a.property}`, bitWidth: padded.length};
              }
              return {value: val, ref: poutInfo.ref, varName: `${a.var}:${a.property}`, bitWidth: poutInfo.bits};
            }
            
            // Check if it's a pin (input) - can also read pins
            const pinInfo = pcbInstance.pinStorage.get(a.property);
            if(pinInfo){
              let val = this.getValueFromRef(pinInfo.ref) || '0'.repeat(pinInfo.bits);

              // Handle bit range if specified
              if(a.bitRange){
                const {start, end: actualEnd} = this.resolveBitRange(a.bitRange);
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:${a.property} (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                const extractedPadded = a.pad ? this.applyPad(extracted, a.pad) : extracted;
                return {value: extractedPadded, ref: null, varName: `${a.var}:${a.property}.${varNameSuffix}`, bitWidth: extractedPadded.length};
              }

              if(a.pad){
                const padded = this.applyPad(val, a.pad);
                return {value: padded, ref: null, varName: `${a.var}:${a.property}`, bitWidth: padded.length};
              }
              return {value: val, ref: pinInfo.ref, varName: `${a.var}:${a.property}`, bitWidth: pinInfo.bits};
            }
            
            throw Error(`Unknown property '${a.property}' for PCB instance ${a.var}. Available: ${[...pcbInstance.pinStorage.keys(), ...pcbInstance.poutStorage.keys()].join(', ')}`);
          } else {
            // Access PCB instance directly - return value based on returnSpec
            const returnSpec = pcbInstance.def.returnSpec;
            if(returnSpec){
              // First check if return value is a declared pin/pout
              const pinInfo = pcbInstance.pinStorage.get(returnSpec.varName);
              const poutInfo = pcbInstance.poutStorage.get(returnSpec.varName);
              const info = pinInfo || poutInfo;
              if(info){
                let val = this.getValueFromRef(info.ref) || '0'.repeat(returnSpec.bits);
                if(a.pad) val = this.applyPad(val, a.pad);
                return {value: val, ref: a.pad ? null : info.ref, varName: a.var, bitWidth: val.length};
              }
              // Fallback: use cached returnValue from last executePcbBody (for internal wires like ret)
              if(pcbInstance.returnValue !== undefined && pcbInstance.returnValue !== null){
                let val = String(pcbInstance.returnValue).padStart(returnSpec.bits, '0').slice(-returnSpec.bits);
                if(a.pad) val = this.applyPad(val, a.pad);
                return {value: val, ref: null, varName: a.var, bitWidth: val.length};
              }
            }
            // No return spec or variable not found - return empty
            let emptyVal = '0'.repeat((returnSpec && returnSpec.bits) || 1);
            if(a.pad) emptyVal = this.applyPad(emptyVal, a.pad);
            return {value: emptyVal, ref: null, varName: a.var};
          }
        }
        
        const comp = this.components.get(a.var);
        if(comp){
          // Check if it's a property access (e.g., .component:get)
          if(a.property){
            if(this.componentRegistry){
              const handler = this.componentRegistry.get(comp.type);
              if(handler && handler.evalGetProperty){
                const result = handler.evalGetProperty(comp, a.property, a, this);
                if(result){
                  if(a.pad && result.value){
                    result.value = this.applyPad(result.value, a.pad);
                    result.ref = null;
                    result.bitWidth = result.value.length;
                  }
                  return result;
                }
              }
            }
            throw Error(`Property ${a.property} cannot be used in expressions for component ${a.var}`);
          }
          
          // Component found - get its value from ref
          let val = null;
          let ref = comp.ref;

          if(ref && ref !== '&-'){
            val = this.getValueFromRef(ref);
          }
          
          // If component has no value yet, use initial value or default to 0
          if(val === null){
            if(comp.initialValue){
              val = comp.initialValue;
            } else {
              const bits = this.getComponentBits(comp.type, comp.attributes);
              val = bits ? '0'.repeat(bits) : '0';
            }
          }
          
          // Handle bit range if specified
          if(a.bitRange){
            const {start, end: actualEnd} = this.resolveBitRange(a.bitRange);
            if(val === null || val === '-'){
              const bitWidth = actualEnd - start + 1;
              const zeros = '0'.repeat(bitWidth);
              const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
              return {value: zeros, ref: null, varName: `${a.var}.${varNameSuffix}`, bitWidth: bitWidth};
            }
            if(start < 0 || actualEnd >= val.length || start > actualEnd){
              throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var} (length: ${val.length})`);
            }
            const extracted = val.substring(start, actualEnd + 1);
            const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
            const refSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
            const extractedPadded = a.pad ? this.applyPad(extracted, a.pad) : extracted;
            return {value: extractedPadded, ref: a.pad ? null : (ref ? `${ref}.${refSuffix}` : null), varName: `${a.var}.${varNameSuffix}`, bitWidth: extractedPadded.length};
          }

          if(a.pad && val && val !== '-'){
            const paddedVal = this.applyPad(val, a.pad);
            return {value: paddedVal, ref: null, varName: a.var, bitWidth: paddedVal.length};
          }
          return {value: val, ref: ref, varName: a.var};
        }
      }
      
      const wire = this.wires.get(a.var);
      let val = null;
      let ref = null;
      let type = null;
      
      if(wire){
        // Always read the current value from storage (don't cache)
        // This ensures we get the updated value when storage is modified in WIREWRITE mode
        val = this.getValueFromRef(wire.ref);
        ref = wire.ref;
        type = wire.type;
        // If wire has no value yet, treat as 0 for computation (but show as -)
        if(val === null){
          if(wire.ref === null || wire.ref === '&-'){
            val = '-';
          } else {
            // Reference exists but value not computed yet - compute it
            val = '0'.repeat(this.getBitWidth(wire.type));
          }
        }
      } else {
        const varInfo = this.vars.get(a.var);
        if(!varInfo) throw Error('Undefined '+a.var);
        val = varInfo.value;
        ref = varInfo.ref;
        type = varInfo.type;
      }
      
      // Handle bit range if specified
      if(a.bitRange){
        const {start, end: actualEnd} = this.resolveBitRange(a.bitRange);
        if(val === null || val === '-'){
          // Return zeros for undefined value bit range
          const bitWidth = actualEnd - start + 1;
          const zeros = '0'.repeat(bitWidth);
          const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
          return {value: zeros, ref: null, varName: `${a.var}.${varNameSuffix}`, bitWidth: bitWidth};
        }
        if(start < 0 || actualEnd >= val.length || start > actualEnd){
          throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var} (length: ${val.length})`);
        }
        // Extract bits (bits are indexed from left to right, 0 is MSB)
        const extracted = val.substring(start, actualEnd + 1);
        const bitWidth = actualEnd - start + 1;
        // Format varName: use single bit notation if start === actualEnd, otherwise range notation
        const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
        const refSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
        const extractedPadded = a.pad ? this.applyPad(extracted, a.pad) : extracted;
        return {value: extractedPadded, ref: a.pad ? null : (ref ? `${ref}.${refSuffix}` : null), varName: `${a.var}.${varNameSuffix}`, bitWidth: extractedPadded.length};
      }
      
      if(a.pad && val && val !== '-'){
        const paddedVal = this.applyPad(val, a.pad);
        return {value: paddedVal, ref: null, varName: a.var, bitWidth: paddedVal.length};
      }
      return {value: val, ref: ref, varName: a.var};
    }
    if(a.ref){
      // Reference expression like &variable
      if(a.ref === '~'){
        return {value: null, ref: null, isRef: true, varName: '~'};
      }
      const wire = this.wires.get(a.ref);
      if(wire){
        return {value: null, ref: wire.ref, isRef: true, varName: a.ref};
      }
      const varInfo = this.vars.get(a.ref);
      if(varInfo){
        return {value: null, ref: varInfo.ref, isRef: true, varName: a.ref};
      }
      throw Error('Undefined reference '+a.ref);
    }
/*
if (a.refLiteral) {
  const idx = parseInt(a.refLiteral, 10);
  const stored = this.storage.find(s => s.index === idx);

  if (!stored || stored.value == null) {
    return { value: '-', ref: null };
  }

  let val = stored.value;

  // -------------------------
  // Apply slicing if present
  // -------------------------
  if (a.bitRange) {
    const { start, end } = a.bitRange;

    if (
      start < 0 ||
      end >= val.length ||
      start > end
    ) {
      return { value: '-', ref: null };
    }

    val = val.substring(start, end + 1);

    return {
      value: val,
      bitWidth: end - start + 1,
      varName:
        start === end
          ? `&${idx}.${start}`
          : `&${idx}.${start}-${end}`
    };
  }

  // -------------------------
  // Whole reference
  // -------------------------
  return {
    value: val,
    bitWidth: val.length,
    varName: `&${idx}`
  };
}*/
if (a.refLiteral) {
//  console.log('[evalAtom refLiteral]', a.refLiteral, a.bitRange, this.storage);
  
 // const idx = parseInt(a.refLiteral, 10);
const idx = parseInt(
  a.refLiteral.startsWith('&') ? a.refLiteral.slice(1) : a.refLiteral,
  10
);
  const stored = this.storage.find(s => s.index === idx);
  
  if (!stored || stored.value == null) {
    return { value: '-', bitWidth: null, varName: `&${idx}` };
  }
  
  let val = stored.value;
  
  if (a.bitRange) {
    const { start, end } = a.bitRange;
    
    if (start < 0 || end >= val.length || start > end) {
      return { value: '-', bitWidth: null, varName: `&${idx}` };
    }
    
    val = val.substring(start, end + 1);
    
    return {
      value: val,
      bitWidth: end - start + 1,
      varName: `&${idx}.${start === end ? start : `${start}-${end}`}`
    };
  }
  
  return {
    value: val,
    bitWidth: val.length,
    varName: `&${idx}`
  };
}    
    
    
    if(a.call) return this.call(a.call, a.args, computeRefs);
  }
  call(fn, args, computeRefs = false) {
  const { name, alias } = fn;

  const b = x => x === '1';

  // ================= Evaluate arguments =================
  const argValues = args.map(x => {
    const r = this.evalExpr(x, computeRefs);
    return r.map(p => {
      if (p.ref && p.ref !== '&-') {
        const v = this.getValueFromRef(p.ref);
        if (v != null) return v;
      }
      return p.value ?? '-';
    }).join('');
  });

  // ================= BUILTIN: LOGIC GATES =================
  // NOT(a): bitwise NOT each bit → same number of bits as input
  // NOT(111) = 000, NOT(101) = 010, NOT(1) = 0, NOT(0) = 1
  if (name === 'NOT') {
    const a = argValues[0];
    const v = a.split('').map(c => c === '1' ? '0' : '1').join('');
    return computeRefs
      ? { value: v, ref: `&${this.storeValue(v)}` }
      : { value: v, ref: null };
  }

  // AND/OR/XOR/NXOR/NAND/NOR: dual-mode
  //   1 arg  → fold/reduce all bits left-to-right → 1 bit result
  //   2 args → bitwise operation between matching bits → N bits result
  // EQ: always 2 args → bitwise EQ → 1 bit reduce
  if (['AND', 'OR', 'XOR', 'NXOR', 'NAND', 'NOR', 'EQ'].includes(name)) {
    const applyOp = (ai, bi) => {
      switch (name) {
        case 'AND':  return ai && bi;
        case 'OR':   return ai || bi;
        case 'XOR':  return ai !== bi;
        case 'NXOR': return ai === bi;
        case 'NAND': return !(ai && bi);
        case 'NOR':  return !(ai || bi);
        case 'EQ':   return ai === bi;
      }
    };

    if (argValues.length === 1 && name !== 'EQ') {
      // 1 arg: fold all bits left-to-right → 1 bit
      const bits = argValues[0].split('');
      let acc = bits[0] === '1';
      for (let i = 1; i < bits.length; i++) {
        acc = applyOp(acc, bits[i] === '1');
      }
      const v = acc ? '1' : '0';
      return computeRefs
        ? { value: v, ref: `&${this.storeValue(v)}` }
        : { value: v, ref: null };
    }

    // 2 args: bitwise operation → N bits
    const a = argValues[0];
    const bv = argValues[1];
    const len = Math.max(a.length, bv.length);
    const ap = a.padStart(len, '0');
    const bp = bv.padStart(len, '0');
    const resultBits = [];
    for (let i = 0; i < len; i++) {
      resultBits.push(applyOp(ap[i] === '1', bp[i] === '1') ? '1' : '0');
    }

    let v;
    if (name === 'EQ') {
      v = resultBits.includes('0') ? '0' : '1';
    } else {
      v = resultBits.join('');
    }
    return computeRefs
      ? { value: v, ref: `&${this.storeValue(v)}` }
      : { value: v, ref: null };
  }


  // ================= BUILTIN: REGn =================
  if (this.isBuiltinREG(name)) {
    const width = parseInt(name.slice(3), 10);

    if (argValues.length !== 3) {
      throw Error(`REG${width} expects 3 arguments`);
    }

    const data  = argValues[0];
    const clock = argValues[1];
    const clear = argValues[2];

    let output = '0'.repeat(width);

    if (this.currentStmt && this.regPendingMap?.has(this.currentStmt)) {
      output = this.regPendingMap.get(this.currentStmt);
    }

    let next = clear === '1' ? '0'.repeat(width) : data;

    if (this.currentStmt) {
      if (!this.regPendingMap) this.regPendingMap = new Map();
      this.regPendingMap.set(this.currentStmt, next);
    }

    return computeRefs
      ? { value: output, ref: `&${this.storeValue(output)}` }
      : { value: output, ref: null };
  }

  // ================= BUILTIN: MUXn =================
  if (0 && this.isBuiltinMUX(name)) {
    const selBits = parseInt(name.slice(3), 10);
    const inputs = 1 << selBits;

    if (argValues.length !== 1 + inputs) {
      throw Error(`${name} expects ${1 + inputs} arguments`);
    }

    const sel = parseInt(argValues[0], 2);
    const value = argValues[1 + sel];

    return computeRefs
      ? { value, ref: `&${this.storeValue(value)}` }
      : { value, ref: null };
  }
  
  
  // ================= BUILTIN: MUX =================
if (0 & 0 & this.isBuiltinMUX(name)) {
  const selectorBitWidth = argValues[0].length; // Get bit width from selector
  const expectedInputs = 1 << selectorBitWidth; // 2^selectorBitWidth

  if (argValues.length !== 1 + expectedInputs) {
    throw Error(
      `MUX with ${selectorBitWidth}-bit selector expects ${1 + expectedInputs} arguments, ` +
      `but got ${argValues.length}`
    );
  }

  const sel = parseInt(argValues[0], 2);
  const value = argValues[1 + sel];

  return computeRefs
    ? { value, ref: `&${this.storeValue(value)}` }
    : { value, ref: null };
}

// ================= BUILTIN: MUX =================
if (this.isBuiltinMUX(name)) {
  const selectorBitWidth = argValues[0].length; // Get bit width from selector
  const expectedInputs = 1 << selectorBitWidth; // 2^selectorBitWidth

  let inputs;

  // Case 1: Multiple arguments (existing behavior)
  if (argValues.length > 2) {
    inputs = argValues.slice(1);
    
    if (inputs.length !== expectedInputs) {
      throw Error(
        `MUX with ${selectorBitWidth}-bit selector expects ${expectedInputs} arguments, ` +
        `but got ${inputs.length}`
      );
    }
  }
  // Case 2: Single data argument that needs expansion
  else if (argValues.length === 2) {
    const data = argValues[1];
    
    if (data.length % expectedInputs !== 0) {
      throw Error(
        `MUX with ${selectorBitWidth}-bit selector expects data length divisible by ${expectedInputs}, ` +
        `but got ${data.length} bits`
      );
    }

    const dataWidth = data.length / expectedInputs;

    // Expand the data into separate inputs
    inputs = [];
    for (let i = 0; i < expectedInputs; i++) {
      inputs[i] = data.slice(i * dataWidth, (i + 1) * dataWidth);
    }
  }
  else {
    throw Error(`MUX expects at least 2 arguments`);
  }

  const sel = parseInt(argValues[0], 2);
  const value = inputs[sel];

  return computeRefs
    ? { value, ref: `&${this.storeValue(value)}` }
    : { value, ref: null };
}







  // ================= BUILTIN: DEMUXn =================
  if (0 && this.isBuiltinDEMUX(name)) {
    const selBits = parseInt(name.slice(5), 10);
    const outputs = 1 << selBits;

    if (argValues.length !== 2) {
      throw Error(`${name} expects 2 arguments`);
    }

    const sel = parseInt(argValues[0], 2);
    const data = argValues[1];

    const res = Array(outputs).fill('0'.repeat(data.length));
    res[sel] = data;

    return res.map(v =>
      computeRefs
        ? { value: v, ref: `&${this.storeValue(v)}` }
        : { value: v, ref: null }
    );
  }
  
  
  // ================= BUILTIN: DEMUX =================
if (this.isBuiltinDEMUX(name)) {
  const selectorBitWidth = argValues[0].length; // Get bit width from selector
  const outputs = 1 << selectorBitWidth; // 2^selectorBitWidth

  if (argValues.length !== 2) {
    throw Error(`DEMUX expects 2 arguments (selector, data), but got ${argValues.length}`);
  }

  const sel = parseInt(argValues[0], 2);
  const data = argValues[1];

  const res = Array(outputs).fill('0'.repeat(data.length));
  res[sel] = data;

  return res.map(v =>
    computeRefs
      ? { value: v, ref: `&${this.storeValue(v)}` }
      : { value: v, ref: null }
  );
}


  // ================= BUILTIN: LSHIFT / RSHIFT =================
  if (name === 'LSHIFT' || name === 'RSHIFT') {
    if (argValues.length < 2 || argValues.length > 3) {
      throw Error(`${name} expects 2 or 3 arguments`);
    }
    const data = argValues[0];
    const n = parseInt(argValues[1], 2);
    const fill = argValues.length === 3 ? argValues[2][0] : '0';
    const len = data.length;

    let v;
    if (name === 'LSHIFT') {
      // Append n fill bits on the right → data.length + n bits
      v = data + fill.repeat(n);
    } else {
      // RSHIFT: same width, shift right (MSBs filled with fill, LSBs discarded)
      if (n >= len) {
        v = fill.repeat(len);
      } else {
        v = fill.repeat(n) + data.slice(0, len - n);
      }
    }

    return computeRefs
      ? { value: v, ref: `&${this.storeValue(v)}` }
      : { value: v, ref: null };
  }

  // ================= BUILTIN: ADD =================
  if (name === 'ADD') {
    if (argValues.length !== 2) throw Error('ADD expects 2 arguments');
    const a = argValues[0], b = argValues[1];
    const depth = Math.max(a.length, b.length);
    const aNum = BigInt('0b' + a.padStart(depth, '0'));
    const bNum = BigInt('0b' + b.padStart(depth, '0'));
    const sum  = aNum + bNum;
    const mask = (BigInt(1) << BigInt(depth)) - BigInt(1);
    const carry  = sum > mask ? '1' : '0';
    const result = (sum & mask).toString(2).padStart(depth, '0');
    return [
      computeRefs ? { value: result, ref: `&${this.storeValue(result)}` } : { value: result, ref: null },
      computeRefs ? { value: carry,  ref: `&${this.storeValue(carry)}`  } : { value: carry,  ref: null },
    ];
  }

  // ================= BUILTIN: SUBTRACT =================
  if (name === 'SUBTRACT') {
    if (argValues.length !== 2) throw Error('SUBTRACT expects 2 arguments');
    const a = argValues[0], b = argValues[1];
    const depth = Math.max(a.length, b.length);
    const aNum = BigInt('0b' + a.padStart(depth, '0'));
    const bNum = BigInt('0b' + b.padStart(depth, '0'));
    let diff = aNum - bNum;
    const wrap = BigInt(1) << BigInt(depth);
    const mask = wrap - BigInt(1);
    const carry = diff < BigInt(0) ? '1' : '0';
    if (diff < BigInt(0)) diff = diff + wrap;
    const result = (diff & mask).toString(2).padStart(depth, '0');
    return [
      computeRefs ? { value: result, ref: `&${this.storeValue(result)}` } : { value: result, ref: null },
      computeRefs ? { value: carry,  ref: `&${this.storeValue(carry)}`  } : { value: carry,  ref: null },
    ];
  }

  // ================= BUILTIN: MULTIPLY =================
  if (name === 'MULTIPLY') {
    if (argValues.length !== 2) throw Error('MULTIPLY expects 2 arguments');
    const a = argValues[0], b = argValues[1];
    const depth = Math.max(a.length, b.length);
    const aNum = BigInt('0b' + a.padStart(depth, '0'));
    const bNum = BigInt('0b' + b.padStart(depth, '0'));
    const product = aNum * bNum;
    const mask = (BigInt(1) << BigInt(depth)) - BigInt(1);
    const result = (product & mask).toString(2).padStart(depth, '0');
    const over   = ((product >> BigInt(depth)) & mask).toString(2).padStart(depth, '0');
    return [
      computeRefs ? { value: result, ref: `&${this.storeValue(result)}` } : { value: result, ref: null },
      computeRefs ? { value: over,   ref: `&${this.storeValue(over)}`   } : { value: over,   ref: null },
    ];
  }

  // ================= BUILTIN: DIVIDE =================
  if (name === 'DIVIDE') {
    if (argValues.length !== 2) throw Error('DIVIDE expects 2 arguments');
    const a = argValues[0], b = argValues[1];
    const depth = Math.max(a.length, b.length);
    const aNum = BigInt('0b' + a.padStart(depth, '0'));
    const bNum = BigInt('0b' + b.padStart(depth, '0'));
    const mask = (BigInt(1) << BigInt(depth)) - BigInt(1);
    let quotient, remainder;
    if (bNum === BigInt(0)) {
      quotient  = BigInt(0);
      remainder = BigInt(0);
    } else {
      quotient  = aNum / bNum;
      remainder = aNum % bNum;
    }
    const result = (quotient  & mask).toString(2).padStart(depth, '0');
    const mod    = (remainder & mask).toString(2).padStart(depth, '0');
    return [
      computeRefs ? { value: result, ref: `&${this.storeValue(result)}` } : { value: result, ref: null },
      computeRefs ? { value: mod,    ref: `&${this.storeValue(mod)}`    } : { value: mod,    ref: null },
    ];
  }

  // ================= USER FUNCTIONS =================
  let funcs = this.funcs;

  // Alias resolution
  if (alias) {
    if (!this.aliases || !this.aliases.has(alias)) {
      throw Error(`Unknown alias ${alias}`);
    }
    funcs = this.aliases.get(alias);
  }

  if (!funcs.has(name)) {
    throw Error(`Function ${name} is not local; use ${name}@alias(...)`);
  }

  const f = funcs.get(name);

  if (argValues.length !== f.params.length) {
    throw Error(`Bad arity for ${name}`);
  }

  const local = new Interpreter(this.funcs, this.out, this.pcbDefinitions, this.componentRegistry);
  local.aliases = this.aliases;
  local.storage = this.storage;
  local.nextIndex = this.nextIndex;
  local.pcbInstances = this.pcbInstances;

  f.params.forEach((p, i) => {
    local.vars.set(p.id, {
      type: p.type,
      value: argValues[i],
      ref: null
    });
  });

  for (const s of f.body) {
    local.exec(s, computeRefs);
  }

  if (!f.returns.length) {
    return { value: '', ref: null };
  }

  const results = [];
  for (const r of f.returns) {
    const parts = local.evalExpr(r.expr, computeRefs);
    for (const p of parts) results.push(p);
  }

  this.nextIndex = local.nextIndex;
  return results;
}

  // Helper to get location info from statement or declaration
  getLocation(s, d=null){
    // Try to get location from statement
    if(s && s.line && s.col) return `${s.line}:${s.col}`;
    if(s && s.decls && s.decls.length > 0 && s.decls[0].line && s.decls[0].col) {
      return `${s.decls[0].line}:${s.decls[0].col}`;
    }
    // Try to get from declaration
    if(d && d.line && d.col) return `${d.line}:${d.col}`;
    // Fallback
    return 'unknown location';
  }

  exec(s, computeRefs=false){
    // Set current statement context for REG calls
    const prevStmt = this.currentStmt;
    this.currentStmt = s;
    
    try {
    if(s.watch){
      const name = s.watch;
      Interpreter.addToWatchList(name, this.components, this.componentRegistry, this);
      return;
    }
    if(s.doc){
      let name = s.doc;
      let alias = '.name';
      const comp = this.components.get(name);
      if(comp) {
        alias = name;
        name = 'comp.'+comp.type;
      }
      const pcb = this.pcbInstances.get(name);
      if(pcb) {
        alias = name;
        name = 'pcb.' + pcb.pcbName
      }
      
      if(alias.indexOf('_') > 0) {
        alias = '.'+  alias.split('_')[2];
      }
      
      const lines = Interpreter.getDocLines(name, alias, this.funcs, this.componentRegistry, this.pcbDefinitions);
      for (const line of lines) {
        this.out.push(line);
      }
      return;
    }

    if(s.show){
      const results = [];
      for(const e of s.show){
        // Extract variable name from expression if it's a simple variable reference
        let varName = null;
        let varType = null;
        let bitRange = null;
        if(e && e.length === 1 && e[0].var){
          varName = e[0].var;
          bitRange = e[0].bitRange;
          // Look up type from original variable (not the bit range)
          const wire = this.wires.get(varName);
          if(wire){
            varType = wire.type;
          } else {
            const varInfo = this.vars.get(varName);
            if(varInfo){
              varType = varInfo.type;
            }
          }
        } else if(e && e.length === 1 && e[0].ref){
          // Reference expression like &variable
          varName = e[0].ref;
          const wire = this.wires.get(varName);
          if(wire){
            varType = wire.type;
          } else {
            const varInfo = this.vars.get(varName);
            if(varInfo){
              varType = varInfo.type;
            }
          }
        }
        
        const r = this.evalExpr(e, computeRefs);
        for(const part of r){
          //console.log('[show part]', part);
          if(!part) continue; // Skip undefined parts
          
          // Use varName from part if it has bit range info, otherwise construct from bitRange if available
          let displayName = part.varName;
          if(!displayName && varName && bitRange){
            // Construct varName from bitRange if part.varName is not set
            const {start, end} = bitRange;
            const actualEnd = end !== undefined && end !== null ? end : start;
            if(start === actualEnd){
              displayName = `${varName}.${start}`;
            } else {
              displayName = `${varName}.${start}-${actualEnd}`;
            }
          }
          if(!displayName) displayName = varName;
          
          let displayType = varType;
          
          // If bit range, calculate type from bit width
          if(part.bitWidth){
            displayType = `${part.bitWidth}bit`;
          }
          
          if (part.isRef) {
  // Dereference
  const v = this.getValueFromRef(part.ref);
  let valueStr = (v == null) ? '-' : v;

  // 🔥 FORMAT: slice ALWAYS wins
  if (valueStr !== '-') {
    if (part.bitWidth) {
      // Slice width has absolute priority
      valueStr = this.formatValue(valueStr, part.bitWidth);
    } else if (displayType) {
      const bw = this.getBitWidth(displayType);
      if (bw) {
        valueStr = this.formatValue(valueStr, bw);
      }
    }
  }

 /* if (displayName && displayType) {
    results.push(`${displayName} (${displayType}) = ${valueStr}`);
  } else {
    results.push(valueStr);
  }*/
  if (displayName && displayType) {
  // Try to find a reference for named variables / wires
  let refStr = '';

  const wire = this.wires.get(displayName);
  const variable = this.vars.get(displayName);
  const ref = wire?.ref ?? variable?.ref;

  if (ref && ref !== '&-') {
    refStr = ` (ref: ${ref})`;
  }

  results.push(`${displayName} (${displayType}) = ${valueStr}${refStr}`);
} else {
  results.push(valueStr);
}
} else {
  // ---------- Normal value ----------
  let valueStr = part.value !== null ? part.value : '-';

  // 🔥 FORMAT: slice ALWAYS wins
  if (valueStr !== '-') {
    if (part.bitWidth) {
      // Slice width has absolute priority
      valueStr = this.formatValue(valueStr, part.bitWidth);
    } else if (displayType) {
      const bw = this.getBitWidth(displayType);
      if (bw) {
        valueStr = this.formatValue(valueStr, bw);
      }
    }
  }

  /*if (displayName && displayType) {
    results.push(`${displayName} (${displayType}) = ${valueStr}`);
  } else {
    results.push(valueStr);
  }*/
  if (displayName && displayType) {
  // Try to find a reference for named variables / wires
  let refStr = '';

  const wire = this.wires.get(displayName);
  const variable = this.vars.get(displayName);
  const ref = wire?.ref ?? variable?.ref;

  if (ref && ref !== '&-') {
    refStr = ` (ref: ${ref})`;
  }

  results.push(`${displayName} (${displayType}) = ${valueStr}${refStr}`);
} else {
  results.push(valueStr);
}
}
          
          
          
          
        }
      }
      this.out.push(results.join(', '));
      return;
    }

    if(s.mode !== undefined){
      // MODE statement: change the mode
      this.mode = s.mode;
      return;
    }

    if(s.comp){
      // Component declaration: comp [led] .power: ...
      // Inside a PCB body, skip re-declaration if the component already exists
      // (it was created on the first execution; re-creating would reset its state)
      if(this.insidePcbBody && this.components.has(s.comp.name)){
        return;
      }
      this.execComp(s.comp);
      return;
    }

    if(s.pcbInstance){
      // PCB instance: pcb [name] .var::
      this.execPcbInstance(s.pcbInstance);
      return;
    }

    if(s.componentPropertyBlock){
      // Property block: .component:{ property1 = expr1 \n property2 = expr2 \n ... }
      const { component, properties } = s.componentPropertyBlock;
      
      // Collect all dependencies from all expressions in the block
      const allDependencies = new Set();
      const allWireDependencies = new Set();
      let setExpr = null;
      let initialSetValue = null;
      let setExprDirectRef = null; // Direct component/wire referenced in setExpr
      
      for(const prop of properties){
        // Skip get> properties when collecting dependencies (they don't have expr)
        if(prop.property !== 'get>' && prop.property !== 'mod>' && prop.property !== 'carry>' && prop.property !== 'over>' && prop.property !== 'out>'){
          this.collectExprDependencies(prop.expr, allDependencies, allWireDependencies);
        }
        
        // Check if this property is 'set' and capture the expression
        if(prop.property === 'set'){
          setExpr = prop.expr;
          
          // Extract direct reference from setExpr (the component/wire that triggers this block)
          if(setExpr.length === 1){
            const atom = setExpr[0];
            if(atom.var && !atom.var.startsWith('.')){
              // Direct wire reference
              setExprDirectRef = { type: 'wire', name: atom.var };
            } else if(atom.var && atom.var.startsWith('.')){
              // Direct component reference
              setExprDirectRef = { type: 'component', name: atom.var };
            }
          }
          
          // Evaluate initial value for edge detection
          if(setExpr.length === 1 && setExpr[0].var === '~'){
            initialSetValue = '~';
          } else {
            const exprResult = this.evalExpr(setExpr, false);
            initialSetValue = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                initialSetValue += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) initialSetValue += val;
              }
            }
            // If no value was found, default to '0'
            if(initialSetValue === ''){
              initialSetValue = '0';
            }
          }
        }
      }
      
      // Extract getTarget if present
      let getTargetAtom = null;
      for(const prop of properties){
        if(prop.property === 'get>'){
          getTargetAtom = prop.target;
          break;
        }
      }
      
      // Get onMode from component attributes or PCB instance def (default: 'raise' for rising edge)
      const comp = this.components.get(component);
      const pcbInst = this.pcbInstances ? this.pcbInstances.get(component) : null;
      const onMode = (comp && comp.attributes && comp.attributes.on)
        ? String(comp.attributes.on)
        : (pcbInst && pcbInst.def && pcbInst.def.on)
          ? String(pcbInst.def.on)
          : 'raise';
      
      // Store the block for re-execution when dependencies change
      // BUT NOT when we're inside a PCB body (PCB internal blocks are executed inline)
      if(!this.insidePcbBody){
        const blockIndex = this.componentPropertyBlocks.length; // Unique index for this block
        this.componentPropertyBlocks.push({
          component,
          properties,
          dependencies: allDependencies,
          wireDependencies: allWireDependencies,
          setExpr: setExpr,
          setExprDirectRef: setExprDirectRef, // What directly triggers this block
          lastSetValue: initialSetValue,
          onMode: onMode,
          getTarget: getTargetAtom,  // Store get> target if present
          blockIndex: blockIndex // Add unique identifier
        });
      }
      
      // Execute properties in order (first run)
      // BUT: If component has on:1, only execute if set evaluates to 1
      // If component has on:raise/edge, don't execute on first run (wait for edge)
      let shouldExecuteFirstRun = true;
      if(onMode === '1' || onMode === 'level'){
        // Level triggered: only execute if set is 1
        if(setExpr){
          // initialSetValue should be evaluated above, but ensure it's not null
          const setBit = (initialSetValue && initialSetValue.length > 0) ? initialSetValue[initialSetValue.length - 1] : '0';
          shouldExecuteFirstRun = (setBit === '1');
        } else {
          // No set property, execute normally
          shouldExecuteFirstRun = true;
        }
      } else {
        // Edge triggered (raise/edge): don't execute on first run, wait for edge
        shouldExecuteFirstRun = false;
      }
      
      if(shouldExecuteFirstRun){
        this.executePropertyBlock(component, properties, false);
      }
      // Note: lastSetValue is already set in the block structure above (initialSetValue)
      // So even if block doesn't execute, lastSetValue is set correctly
      return;
    }

    if(s.next !== undefined){
      // NEXT(~) or NEXT(~, count) - recompute wire values
      // Set firstRun to false when NEXT is executed (first run is over)
      if(this.firstRun){
        this.firstRun = false;
        this.vars.set('%', {type: '1bit', value: '0', ref: null});
      }
      
      const count = s.next || 1;
      for(let i = 0; i < count; i++){
        this.cycle++;
        
        // Clear and regenerate random bits for $ at each NEXT(~)
        this.randomBitCache.clear();
        this.generateRandomBit();
        
        // Apply pending component properties marked for 'next' iteration (only on first iteration)
        if(i === 0){
          for(const [compName, when] of this.componentPendingSet.entries()){
            if(when === 'next'){
              this.applyComponentProperties(compName, 'immediate', true);
            }
          }
          
          // Re-execute property blocks that have pending 'next' properties
          // This includes blocks with set = ~ (which should execute at every NEXT(~))
          // Also includes blocks where set depends on ~ or $ (directly or indirectly through wires)
          // BUT: If block has wire dependencies that depend on $, defer to after wire updates
          for(const block of this.componentPropertyBlocks){
            const pendingWhen = this.componentPendingSet.get(block.component);
            // Check if block has set = ~ (setExpr is exactly ~)
            const hasSetTilde = block.setExpr && block.setExpr.length === 1 && block.setExpr[0].var === '~';
            // Check if set expression depends on ~ (directly or indirectly through wires)
            const setDependsOnTilde = block.setExpr && this.exprDependsOnTilde(block.setExpr);
            // Check if set expression depends on $ (random bits)
            const setDependsOnRandom = block.setExpr && this.exprDependsOnRandom(block.setExpr);
            
            if(pendingWhen === 'next' || hasSetTilde || setDependsOnTilde || setDependsOnRandom){
              // Check if any wire dependencies depend on $ (need to defer execution)
              let hasRandomWireDeps = false;
              if(block.wireDependencies && block.wireDependencies.size > 0){
                for(const wireName of block.wireDependencies){
                  // Check if this wire depends on $
                  const ws = this.wireStatements.find(ws => {
                    if(ws.assignment) return ws.assignment.target.var === wireName;
                    if(ws.decls) return ws.decls.some(d => d.name === wireName);
                    return false;
                  });
                  if(ws){
                    const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
                    if(wireExpr && this.exprDependsOnRandom(wireExpr)){
                      hasRandomWireDeps = true;
                      break;
                    }
                  }
                }
              }
              
              // If has wire dependencies on $, skip for now (will execute after wire updates)
              if(hasRandomWireDeps){
                continue;
              }
              
              // Re-execute the entire block with re-evaluation
              this.executePropertyBlock(block.component, block.properties, true);
              
              // After executing property block, update connections for the component itself
              // This ensures wires that reference the component are updated
              this.updateComponentConnections(block.component);
            }
          }
        }
        
        // Re-execute all wire statements in program order (they will recompute based on current storage state)
        // This ensures that assignments like "data = data.0 + data.1 + 00" can use the old value of data
        for(const ws of this.wireStatements){
          if(ws.assignment){
            // Handle assignment statement
            const name = ws.assignment.name;
            const wire = this.wires.get(name);
            if(wire){
              // During NEXT(~), evaluate expression without computeRefs to avoid creating new storage for literals
              // We'll compute the value directly and update existing storage
              const exprResult = this.evalExpr(ws.assignment.expr, false);
              const bits = this.getBitWidth(wire.type);
              
              // Compute total value from expression parts
              // Always prefer reading from ref to get current value (important for WIREWRITE mode)
              let wireValue = '';
              for(let i = 0; i < exprResult.length; i++){
                const part = exprResult[i];
                let partValue = '';
                
                if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) {
                    partValue = val;
                  }
                }
                // If we didn't get a value from ref, use part.value
                if(!partValue && part.value && part.value !== '-'){
                  partValue = part.value;
                }
                
                if(partValue){
                  wireValue += partValue;
                }
              }
              
              // Ensure we have the right number of bits
              if(wireValue.length < bits){
                wireValue = wireValue.padEnd(bits, '0');
              } else if(wireValue.length > bits){
                wireValue = wireValue.substring(0, bits);
              }
              
              // Reuse existing storage or create new one
              let storageIdx;
              let oldValue = null;
              let valueChanged = false;

              if(this.wireStorageMap.has(name)){
                // Reuse existing storage
                storageIdx = this.wireStorageMap.get(name);
                const stored = this.storage.find(s => s.index === storageIdx);
                if(stored){
                  oldValue = stored.value;
                  const newValue = wireValue || '0'.repeat(bits);
                  if(oldValue !== newValue){
                    stored.value = newValue;
                    valueChanged = true;
                  }
                } else {
                  // Storage was lost, create new one
                  storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
                  this.wireStorageMap.set(name, storageIdx);
                  valueChanged = true;
                }
              } else if(wire.ref && wire.ref !== '&-'){
                // Try to extract storage index from wire's ref
                const refMatch = wire.ref.match(/^&(\d+)/);
                if(refMatch){
                  storageIdx = parseInt(refMatch[1]);
                  const stored = this.storage.find(s => s.index === storageIdx);
                  if(stored){
                    // Update existing storage
                    oldValue = stored.value;
                    const newValue = wireValue || '0'.repeat(bits);
                    if(oldValue !== newValue){
                      stored.value = newValue;
                      valueChanged = true;
                    }
                    this.wireStorageMap.set(name, storageIdx);
                  } else {
                    // Storage was lost, create new one
                    storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
                    this.wireStorageMap.set(name, storageIdx);
                    valueChanged = true;
                  }
                } else {
                  // Create new storage
                  storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
                  this.wireStorageMap.set(name, storageIdx);
                  valueChanged = true;
                }
              } else {
                // Create new storage (shouldn't happen during NEXT, but handle it)
                storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
                this.wireStorageMap.set(name, storageIdx);
                valueChanged = true;
              }
              
              // Set wire reference to the storage index
              wire.ref = `&${storageIdx}`;

              // Only trigger updates if the value actually changed
              if(valueChanged){
                this.updateConnectedComponents(name, wireValue || '0'.repeat(bits));
              }
            }
          } else {
            // Handle declaration statement
            // Execute all declarations in program order, but for simple literal assignments,
            // skip updating if wire already has a value (to avoid resetting values)
            if(ws.decls && ws.decls.length > 0 && ws.decls[0].type && ws.expr){
              // Check if the expression is just a constant (BIN or HEX literal)
              let isSimpleLiteral = true;
              if(Array.isArray(ws.expr)){
                for(const atom of ws.expr){
                  // Special variables that change at each NEXT are not simple literals
                  if(atom.var === '$' || atom.var === '~' || atom.var === '%'){
                    isSimpleLiteral = false;
                    break;
                  }
                  // Function calls, regular variables, or refs are not simple literals
                  if(atom.call || atom.var || atom.ref){
                    isSimpleLiteral = false;
                    break;
                  }
                }
              }
              if(isSimpleLiteral){
                // This is a simple literal assignment like "4wire data = 1101"
                // Check if wire already has a value - if so, skip updating during NEXT(~)
                // This prevents resetting values that were changed by later assignments
                const wireName = ws.decls[0].name;
                if(wireName && this.wires.has(wireName)){
                  const wire = this.wires.get(wireName);
                  if(wire.ref !== null && wire.ref !== '&-'){
                    // Wire already has a value, skip this simple literal assignment during NEXT(~)
                    // This allows later assignments like "data = 1111" to persist
                    continue;
                  }
                }
              }
            }
            // Recompute all declarations (they will see updated values of dependencies)
            this.execWireStatement(ws);
          }
        }
        // REG statements are handled through wire statements that call them
        
        // Now execute property blocks that were deferred (have wire dependencies on $)
        for(const block of this.componentPropertyBlocks){
          const hasSetTilde = block.setExpr && block.setExpr.length === 1 && block.setExpr[0].var === '~';
          const setDependsOnTilde = block.setExpr && this.exprDependsOnTilde(block.setExpr);
          const setDependsOnRandom = block.setExpr && this.exprDependsOnRandom(block.setExpr);
          
          if(hasSetTilde || setDependsOnTilde || setDependsOnRandom){
            // Check if has wire dependencies on $ (was deferred)
            let hasRandomWireDeps = false;
            if(block.wireDependencies && block.wireDependencies.size > 0){
              for(const wireName of block.wireDependencies){
                const ws = this.wireStatements.find(ws => {
                  if(ws.assignment) return ws.assignment.target.var === wireName;
                  if(ws.decls) return ws.decls.some(d => d.name === wireName);
                  return false;
                });
                if(ws){
                  const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
                  if(wireExpr && this.exprDependsOnRandom(wireExpr)){
                    hasRandomWireDeps = true;
                    break;
                  }
                }
              }
            }
            
            // Execute only if was deferred (has random wire deps)
            if(hasRandomWireDeps){
              this.executePropertyBlock(block.component, block.properties, true);
              this.updateComponentConnections(block.component);
            }
          }
        }
        
        // Check wire-triggered property blocks for rising edge
        // Check all blocks that have setExpr (they will be selectively executed based on their trigger)
        for(const block of this.componentPropertyBlocks){
          // First check: blocks with setExpr and setExprDirectRef (wire/component triggered)
          if(block.setExpr && block.setExprDirectRef){
            // Skip if set expression is ~ (handled separately above)
            if(block.setExpr.length === 1 && block.setExpr[0].var === '~'){
              continue;
            }
            
            // Check if set expression depends on ~ (should execute at every NEXT)
            const setDependsOnTilde = block.setExpr && this.exprDependsOnTilde(block.setExpr);

            // Re-evaluate the set expression
            const exprResult = this.evalExpr(block.setExpr, false);
            let newSetValue = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                newSetValue += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) newSetValue += val;
              }
            }
            
            // Get last bit of new and previous values
            const newBit = newSetValue.length > 0 ? newSetValue[newSetValue.length - 1] : '0';
            const prevSetValue = block.lastSetValue || '0';
            const prevBit = prevSetValue.length > 0 ? prevSetValue[prevSetValue.length - 1] : '0';

            // Determine if we should execute based on onMode
            let shouldExecute = false;
            const onMode = block.onMode || 'raise';
            
            if(onMode === 'raise' || onMode === 'rising'){
              // Rising edge: 0 -> 1
              shouldExecute = (prevBit === '0' && newBit === '1');
            } else if(onMode === 'edge' || onMode === 'falling'){
              // Falling edge: 1 -> 0
              shouldExecute = (prevBit === '1' && newBit === '0');
            } else if(onMode === '1' || onMode === 'level'){
              // Level triggered: execute when set is 1
              // If set depends on ~ (like set = k where k = MUX1(clr, 1, ~)),
              // execute every NEXT() when set is 1 (no value change check)
              if(setDependsOnTilde){
                shouldExecute = (newBit === '1');
              } else {
                // Otherwise, only execute when value has changed
                shouldExecute = (newBit === '1') && (newSetValue !== prevSetValue);
              }
            }
            
            if(shouldExecute){
              this.executePropertyBlock(block.component, block.properties, true);
            }
            
            // Always update lastSetValue (even if block didn't execute)
            block.lastSetValue = newSetValue;
          }
          // Second check: blocks with constant set (like set = 1) but with wire dependencies
          // These should re-execute whenever their wire dependencies change (during NEXT step)
          else if(block.setExpr && !block.setExprDirectRef){
            // Check if this is a constant set (like set = 1)
            const isConstantSet = block.setExpr.length === 1 && 
              (block.setExpr[0].bin || block.setExpr[0].hex || block.setExpr[0].dec);
            
            // If constant set with any wire dependencies, re-evaluate on every NEXT when set=1
            if(isConstantSet && block.wireDependencies && block.wireDependencies.size > 0){
              // Evaluate the constant set expression
              const exprResult = this.evalExpr(block.setExpr, false);
              let setValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  setValue += part.value;
                }
              }
              
              const setBit = setValue.length > 0 ? setValue[setValue.length - 1] : '0';
              const onMode = block.onMode || 'raise';
              
              // Execute if set is 1 — wire deps may have changed during this NEXT step
              if((onMode === '1' || onMode === 'level') && setBit === '1'){
                this.executePropertyBlock(block.component, block.properties, true);
              }

              // Always update lastSetValue
              block.lastSetValue = setValue;
            }
          }
        }
      }
      
      // Execute PCB ~~ sections for instances that were triggered
      for(const [instanceName, instance] of this.pcbInstances){
        if(instance.pendingNextSection){
          this.executePcbBody(instanceName, instance.def.nextSection, true);
          instance.pendingNextSection = false; // Reset flag after execution
        }
      }
      return;
    }

    if(s.test){
      const nameResult = this.evalExpr(s.test.name, true);
      const expectedResult = this.evalExpr(s.test.expected, true);
      
      if(nameResult.length === 0 || expectedResult.length === 0){
        throw Error(`TEST: Invalid expression result`);
      }
      
      const namePart = nameResult[0];
      const expectedPart = expectedResult[0];
      
      if(!namePart || !expectedPart){
        throw Error(`TEST: Missing expression parts`);
      }
      
      // Extract variable name from test expression
      let varName = 'variable';
      if(s.test.name && s.test.name.length > 0){
        const firstAtom = s.test.name[0];
        if(firstAtom.var){
          varName = firstAtom.var;
        } else if(firstAtom.ref){
          varName = firstAtom.ref;
        }
      }
      // Also try to get from namePart if available
      if(namePart.varName){
        varName = namePart.varName;
      }
      
      // Check if testing reference (if namePart is a reference, expected must also be a reference)
      if(namePart.isRef){
        if(!expectedPart.isRef){
          throw Error(`Error testing ${varName} reference: expected reference but got a literal`);
        }
        const nameRef = this.formatRef(namePart.ref, namePart.varName);
        const expectedRef = this.formatRef(expectedPart.ref, expectedPart.varName);
        if(nameRef !== expectedRef){
          throw Error(`Error testing ${varName} reference expected to be: ${expectedRef} but was: ${nameRef}`);
        }
      } else if(expectedPart.isRef){
        // Testing value but expected is reference - convert name to string
        const nameVal = namePart.value !== null && namePart.value !== undefined ? String(namePart.value) : '-';
        const expectedRef = this.formatRef(expectedPart.ref, expectedPart.varName);
        if(nameVal !== expectedRef){
          throw Error(`Error testing ${varName} value expected to be: ${expectedRef} but was: ${nameVal}`);
        }
      } else {
        // Testing value
        const nameVal = namePart.value !== null && namePart.value !== undefined ? namePart.value : '-';
        const expectedVal = expectedPart.value !== null && expectedPart.value !== undefined ? expectedPart.value : '-';
        if(nameVal !== expectedVal){
          throw Error(`Error testing ${varName} value expected to be: ${expectedVal} but was: ${nameVal}`);
        }
      }
      return;
    }

if (s.assignment) {
  const { target, expr } = s.assignment;
  const name = target.var;
  const range = target.bitRange || null;
  const property = target.property || null;

  // Check if it's a PCB instance first
  if (this.pcbInstances.has(name)) {
    const instance = this.pcbInstances.get(name);
    
    if(property){
      // PCB pin/pout assignment: .instance:pin = value or .instance:pout = value
      const pinInfo = instance.pinStorage.get(property);
      const poutInfo = instance.poutStorage.get(property);
      
      if(pinInfo){
        // Assign to input pin
        const exprResult = this.evalExpr(expr, computeRefs);
        let value = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }
        
        // Pad/trim to correct bit width
        if(value.length < pinInfo.bits){
          value = value.padStart(pinInfo.bits, '0');
        } else if(value.length > pinInfo.bits){
          value = value.substring(value.length - pinInfo.bits);
        }
        
        // Store the value
        this.setValueAtRef(pinInfo.ref, value);
        
        // Check if this is the exec trigger
        if(property === instance.def.exec){
          // Get the last bit for edge detection
          const newBit = value[value.length - 1] || '0';
          const prevBit = instance.lastExecValue || '0';
          
          let shouldExecute = false;
          const onMode = instance.def.on || 'raise';
          
          if(onMode === 'raise' || onMode === 'rising'){
            shouldExecute = (prevBit === '0' && newBit === '1');
          } else if(onMode === 'edge' || onMode === 'falling'){
            shouldExecute = (prevBit === '1' && newBit === '0');
          } else if(onMode === '1' || onMode === 'level'){
            // Level triggered: execute when set is 1 AND value has changed
            shouldExecute = (newBit === '1') && (newBit !== prevBit);
          }
          
          if(shouldExecute){
            this.executePcbBody(name, instance.def.body, false);
            // Mark that ~~ section should be executed at NEXT(~)
            if(instance.def.nextSection && instance.def.nextSection.length > 0){
              instance.pendingNextSection = true;
            }
          }
          
          instance.lastExecValue = newBit;
        }
        return;
      } else if(poutInfo){
        // Assignment to output pin (less common but allowed)
        const exprResult = this.evalExpr(expr, computeRefs);
        let value = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }
        
        if(value.length < poutInfo.bits){
          value = value.padStart(poutInfo.bits, '0');
        } else if(value.length > poutInfo.bits){
          value = value.substring(value.length - poutInfo.bits);
        }
        
        this.setValueAtRef(poutInfo.ref, value);
        return;
      } else {
        throw Error(`Unknown property '${property}' for PCB instance ${name}`);
      }
    } else {
      // Direct assignment to PCB instance (if no property)
      throw Error(`Cannot assign directly to PCB instance ${name}. Use ${name}:pinName = value`);
    }
  }

  // Check if it's a component first
  if (this.components.has(name)) {
    const comp = this.components.get(name);
    
    // Check if it's a property assignment: .component:property = value
    if(property){
      // Handle property assignments
      if(property === 'set'){
        // .component:set = value
        // Store the expression for re-evaluation when dependencies change
        // Special handling: if expr is exactly [SPECIAL '~'], treat it as '~' not as variable value
        let value = '';
        if(expr.length === 1 && expr[0].var === '~'){
          // Expression is exactly ~ (special variable)
          value = '~';
        } else {
          // Evaluate expression normally
          const exprResult = this.evalExpr(expr, computeRefs);
          // Get the value (should be 1 for immediate, or ~ for next iteration)
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              value += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) value += val;
            }
          }
        }
        
        // Store as pending property with expression for re-evaluation
        if(!this.componentPendingProperties.has(name)){
          this.componentPendingProperties.set(name, {});
        }
        const pending = this.componentPendingProperties.get(name);
        pending[property] = {
          expr: expr, // Store expression for re-evaluation
          value: value // Store current value
        };
        
        // Check if value is '~' (next iteration) or '1' (immediate)
        if(value === '~' || value === '1'){
          // Mark when to apply properties
          const when = value === '~' ? 'next' : 'immediate';
          this.componentPendingSet.set(name, when);
          // Apply pending properties (if immediate, apply now; if next, just mark)
          this.applyComponentProperties(name, when);
        } else {
          // Value is not '1' or '~', but we still store it for re-evaluation
          // This allows .c:set = .on to work, where .on can be '0' or '1'
          // We'll check the value in applyComponentProperties
          // Mark as 'immediate' so it can be re-evaluated when dependencies change
          this.componentPendingSet.set(name, 'immediate');
          // Apply pending properties to check if value is '1'
          this.applyComponentProperties(name, 'immediate');
        }
      } else {
        // Other property assignments: .component:hex = value, etc.
        // Store as pending property with expression (will be applied when :set = 1 is executed)
        // Store both the expression (for re-evaluation) and current value
        const exprResult = this.evalExpr(expr, computeRefs);
        // Get the value
        let value = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }
        
        // Store pending property with expression for re-evaluation
        if(!this.componentPendingProperties.has(name)){
          this.componentPendingProperties.set(name, {});
        }
        const pending = this.componentPendingProperties.get(name);
        pending[property] = {
          expr: expr, // Store expression for re-evaluation
          value: value // Store current value
        };
        
        if(comp && this.componentRegistry){
          const handler = this.componentRegistry.get(comp.type);
          if(handler && handler.handleImmediateAssignment){
            handler.handleImmediateAssignment(comp, property, value, this);
          }
        }
      }
      
      return;
    }
    
    if(this.componentRegistry){
      const handler = this.componentRegistry.get(comp.type);
      if(handler){
        // Check if handler supports direct assignment (e.g. mem bulk init)
        if(handler.handleDirectAssign){
          const exprResultForDirect = this.evalExpr(expr, false);
          let directValue = '';
          for(const part of exprResultForDirect){
            if(part.value && part.value !== '-') directValue += part.value;
            else if(part.ref && part.ref !== '&-'){
              const v = this.getValueFromRef(part.ref);
              if(v) directValue += v;
            }
          }
          const handled = handler.handleDirectAssign(comp, directValue, this);
          if(handled !== false && handled !== null && handled !== undefined) return;
        }
        const forbidMsg = handler.getForbidDirectAssign();
        if(forbidMsg) throw Error(forbidMsg);
      }
    }
    
    // Components with returnType (switches) cannot be assigned to
    if(comp.returnType){
      throw Error(`Component ${name} has return type and cannot be assigned to`);
    }
    
    const exprResult = this.evalExpr(expr, computeRefs);
    
    // Build reference from expression
    const bits = this.getComponentBits(comp.type, comp.attributes);
    const ref = this.buildRefFromParts(exprResult, bits, 0);
    
    // Store connection info - store the expression parts for re-evaluation
    this.componentConnections.set(name, {
      source: ref,
      bitRange: range,
      expr: expr // Store expression for re-evaluation
    });
    
    // Update component's ref and display
    if(ref && ref !== '&-'){
      // Get value from reference
      const value = this.getValueFromRef(ref);
      if(value !== null){
        // Update component display
        this.updateComponentValue(name, value, range);
        
        // Store reference for future updates
        comp.ref = ref;
      } else {
        // Reference doesn't have value yet, but store it anyway
        comp.ref = ref;
      }
    }
    
    return;
  }

  // Resolve variable or wire
  let entry, isWire = false;

  if (this.wires.has(name)) {
    entry = this.wires.get(name);
    isWire = true;
  } else if (this.vars.has(name)) {
    entry = this.vars.get(name);
  } else {
    throw Error(`Undefined ${name}`);
  }

  const bitWidth = this.getBitWidth(entry.type);
  let currentValue;

  // Read current value
  if (isWire) {
    currentValue = this.getValueFromRef(entry.ref);
    if (!currentValue) {
      currentValue = '0'.repeat(bitWidth);
    }
  } else {
    currentValue = entry.value;
  }

  // Evaluate RHS
  const exprResult = this.evalExpr(expr, computeRefs);
  let rhs = '';

  for (const part of exprResult) {
    if (part.ref) {
      const v = this.getValueFromRef(part.ref);
      if (v) rhs += v;
    } else if (part.value) {
      rhs += part.value;
    }
  }

  // Determine slice
  let start, end;
  if (range) {
    start = range.start;
    end = range.end ?? range.start;
  } else {
    start = 0;
    end = bitWidth - 1;
  }

  const sliceWidth = end - start + 1;

  if (rhs.length !== sliceWidth) {
    throw Error(
      `Bit-width mismatch: assigning ${rhs.length} bits to ${sliceWidth}-bit slice ${name}.${start}-${end}`
    );
  }

  // Construct new value
  const newValue =
    currentValue.substring(0, start) +
    rhs +
    currentValue.substring(end + 1);

  // Store result
  if (isWire) {
    // STRICT check — skip if this wire was initialized with := (first real assignment is allowed)
    if (this.mode === 'STRICT' && entry.ref !== null && entry.ref !== '&-' && !entry.initOnly) {
      throw Error(`Cannot reassign wire ${name} in STRICT mode`);
    }
    // Clear initOnly flag after first real assignment
    if(entry.initOnly) entry.initOnly = false;

    let idx;
    if (entry.ref && entry.ref.startsWith('&')) {
      idx = parseInt(entry.ref.slice(1));
      const stored = this.storage.find(s => s.index === idx);
      if (stored) {
        stored.value = newValue;
      } else {
        idx = this.storeValue(newValue);
      }
    } else {
      idx = this.storeValue(newValue);
    }

    entry.ref = `&${idx}`;
    // Cache in wireStorageMap so execWireStatement can reuse this slot on cascade re-execution
    this.wireStorageMap.set(name, idx);
    // Track this assignment statement for reactive cascade re-execution (not inside PCB body)
    if(!this.insidePcbBody && !this.wireStatements.includes(s)){
      this.wireStatements.push(s);
    }
    
    // Update connected components
    this.updateConnectedComponents(name, newValue);
  } else {
    // Variable (immutable unless slice)
    const idx = this.storeValue(newValue);
    this.vars.set(name, {
      type: entry.type,
      value: newValue,
      ref: `&${idx}`
    });
    
    // Update connected components
    this.updateConnectedComponents(name, newValue);
  }

  return;
}
/*
    if(s.assignment){
      // Assignment to existing variable/wire: name = expr
      const name = s.assignment.name;
      const expr = s.assignment.expr;
      
      // Check if it's a wire
      const wire = this.wires.get(name);
      if(wire){
        // Wire assignment - check mode only if wire was already assigned (ref is not null and not '&-')
        if(this.mode === 'STRICT' && wire.ref !== null && wire.ref !== '&-'){
          throw Error(`Cannot reassign wire ${name} in STRICT mode`);
        }
        // Wire assignment
        const exprResult = this.evalExpr(expr, computeRefs);
        const bits = this.getBitWidth(wire.type);
        const wireRef = this.buildRefFromParts(exprResult, bits, 0);
        
        // Compute the actual value from the reference
        const wireValue = this.getValueFromRef(wireRef) || '0'.repeat(bits);
        
        // In WIREWRITE mode, if wire already has storage, update it instead of creating new reference
        if(this.mode === 'WIREWRITE' && wire.ref !== null && wire.ref !== '&-'){
          // Check if wire has existing storage index
          if(this.wireStorageMap.has(name)){
            const storageIdx = this.wireStorageMap.get(name);
            const stored = this.storage.find(s => s.index === storageIdx);
            if(stored){
              // Update existing storage value
              stored.value = wireValue;
              // Keep the same reference - wire.ref stays the same (pointing to the updated storage)
              // Track for NEXT (not inside PCB body)
              if(!this.insidePcbBody && !this.wireStatements.includes(s)){
                this.wireStatements.push(s);
              }
              return;
            }
          }
          // If wire has a ref but no storage entry, try to extract storage index from ref
          const refMatch = wire.ref.match(/^&(\d+)/);
          if(refMatch){
            const storageIdx = parseInt(refMatch[1]);
            const stored = this.storage.find(s => s.index === storageIdx);
            if(stored){
              // Update existing storage value
              stored.value = wireValue;
              // Keep the same reference - wire.ref stays the same
              // Update wireStorageMap
              this.wireStorageMap.set(name, storageIdx);
              // Track for NEXT (not inside PCB body)
              if(!this.insidePcbBody && !this.wireStatements.includes(s)){
                this.wireStatements.push(s);
              }
              return;
            }
          }
        }
        
        // Default behavior: create new reference (or first assignment)
        // Reuse existing storage or create new one
        let storageIdx;
        if(this.wireStorageMap.has(name)){
          // Reuse existing storage
          storageIdx = this.wireStorageMap.get(name);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = wireValue;
          } else {
            // Storage was lost, create new one
            storageIdx = this.storeValue(wireValue);
            this.wireStorageMap.set(name, storageIdx);
          }
        } else {
          // Create new storage
          storageIdx = this.storeValue(wireValue);
          this.wireStorageMap.set(name, storageIdx);
        }
        
        // Set wire reference to the storage index
        wire.ref = `&${storageIdx}`;
        
        // Track for NEXT (not inside PCB body)
        if(!this.insidePcbBody && !this.wireStatements.includes(s)){
          this.wireStatements.push(s);
        }
        return;
      }
      
      // Check if it's a variable (bits are immutable, so this should error)
      if(this.vars.has(name)){
        throw Error(`Cannot reassign immutable variable ${name}`);
      }
      
      throw Error(`Undefined variable/wire ${name}`);
    }*/

    // Variable/wire declaration
    if(!s.expr){
      // Declaration with := (wire initialization literal, e.g. 1wire q := 1)
      if(s.initExpr){
        for(const d of s.decls){
          const bits = this.getBitWidth(d.type);
          const loc = this.getLocation(s, d);
          if(!bits) throw Error(`Invalid type ${d.type} at ${loc}`);
          if(!this.isWire(d.type)) throw Error(`Wire initialization := only allowed for wire types at ${loc}`);
          if(d.name === '_') continue;
          if(this.wires.has(d.name)) throw Error(`Wire ${d.name} already declared at ${loc}`);
          // Evaluate the literal atom to get initial binary value
          const initPart = this.evalAtom(s.initExpr, false);
          let initValue = initPart.value || '0'.repeat(bits);
          // Pad or truncate to wire width
          if(initValue.length < bits){
            initValue = initValue.padStart(bits, '0');
          } else if(initValue.length > bits){
            initValue = initValue.substring(initValue.length - bits);
          }
          // Store initial value and set ref — mark initOnly so first := assignment is allowed
          const storageIdx = this.storeValue(initValue);
          this.wireStorageMap.set(d.name, storageIdx);
          this.wires.set(d.name, {type: d.type, ref: `&${storageIdx}`, initOnly: true});
        }
        // Do NOT add to wireStatements — no cascading re-execution for literal init
        return;
      }
      // Declaration without assignment (only wires)
      for(const d of s.decls){
        const bits = this.getBitWidth(d.type);
        const loc = this.getLocation(s, d);
        if(!bits) throw Error(`Invalid type ${d.type} at ${loc}`);
        if(!this.isWire(d.type)) throw Error(`Only wires can be declared without assignment at ${loc} (found ${d.type} for ${d.name})`);
        if(d.name === '_') continue;
        if(this.wires.has(d.name)) throw Error(`Wire ${d.name} already declared at ${loc}`);
        this.wires.set(d.name, {type: d.type, ref: null});
      }
      return;
    }

    const exprResult = this.evalExpr(s.expr, computeRefs);
    
    // Compute total value from expression
    let totalValue = '';
    for(const part of exprResult){
      if(part.value){
        totalValue += part.value;
      } else if(part.ref && part.ref !== '&-'){
        const val = this.getValueFromRef(part.ref);
        if(val) totalValue += val;
      }
    }
    
    let bitOffset = 0;

  for (const d of s.decls) {
      // Handle existing variables/wires (no type in declaration)
      let actualType = d.type;
      if(d.existing){
        // Look up existing variable/wire to get its type
        const wire = this.wires.get(d.name);
        if(wire){
          actualType = wire.type;
        } else {
          const varInfo = this.vars.get(d.name);
          if(varInfo){
            actualType = varInfo.type;
          } else {
            throw Error(`Undefined variable/wire ${d.name}`);
          }
        }
        // Ensure we got a valid type
        if(!actualType){
          throw Error(`Variable/wire ${d.name} has no type information`);
        }
      }
      
      const bits = this.getBitWidth(actualType);
      if(!bits) throw Error(`Invalid type ${actualType || d.type}`);

      if(d.name === '~'){
        // Special handling for ~
        if(exprResult.length > 0 && exprResult[0].value){
          this.vars.set('~', {type: '1bit', value: exprResult[0].value, ref: null});
        }
        bitOffset += bits;
        continue;
      }

      if(d.name === '%'){
        // Skip assignment for % (special read-only variable)
        bitOffset += bits;
        continue;
      }

      if(d.name === '$'){
        // Skip assignment for $ (special random variable)
        bitOffset += bits;
        continue;
      }

      if(d.name === '_'){
        // Skip assignment for _ (wildcard)
        bitOffset += bits;
        continue;
      }

      if(this.isWire(actualType)){
        // Wire assignment
        if(this.wires.has(d.name)){
          const existing = this.wires.get(d.name);
          if(existing.initOnly){
            // initOnly: PCB-injected wire — allow assignment, clear flag
            existing.initOnly = false;
          } else if(existing.ref !== null && existing.ref !== '&-'){
            // Already assigned
            if(this.mode === 'STRICT'){
              throw Error(`Cannot reassign wire ${d.name} in STRICT mode`);
            }
            throw Error(`Wire ${d.name} already assigned`);
          }
        }
        
        // Build reference from expression parts, starting at bitOffset
        const wireRef = this.buildRefFromParts(exprResult, bits, bitOffset);
        
        // Compute the actual value from the reference
        let wireValue = this.getValueFromRef(wireRef);
        
        // Bit-width enforcement: pad literals, reject wire-to-wire mismatch
        if(wireValue && wireValue.length !== bits){
          // Check if expression references any user-defined wires
          const hasWireRef = exprResult.some(p => p.varName && this.wires.has(p.varName));
          if(hasWireRef){
            throw Error(`Bit-width mismatch: ${d.name} is ${bits}bit but expression provides ${wireValue.length} bits`);
          }
          // Pure literals / special vars: left-pad or truncate to wire width
          if(wireValue.length < bits){
            wireValue = wireValue.padStart(bits, '0');
          } else {
            wireValue = wireValue.substring(wireValue.length - bits);
          }
          // Update storage with padded/truncated value
          if(wireRef && wireRef.startsWith('&')){
            const refMatch = wireRef.match(/^&(\d+)/);
            if(refMatch){
              const stored = this.storage.find(st => st.index === parseInt(refMatch[1]));
              if(stored) stored.value = wireValue;
            }
          }
        }
        
        // In WIREWRITE mode, if wire already has storage, update it instead of creating new reference
        let storageIdx;
        if(this.mode === 'WIREWRITE' && this.wires.has(d.name)){
          const existing = this.wires.get(d.name);
          if(existing.ref !== null && existing.ref !== '&-'){
            // Check if wire has existing storage index
            if(this.wireStorageMap.has(d.name)){
              storageIdx = this.wireStorageMap.get(d.name);
              const stored = this.storage.find(s => s.index === storageIdx);
              if(stored){
                // Update existing storage value
                stored.value = wireValue || '0'.repeat(bits);
                // Keep the same reference - don't change existing.ref
                // Track for NEXT (not inside PCB body)
                if(!this.insidePcbBody && !this.wireStatements.includes(s)){
                  this.wireStatements.push(s);
                }
                bitOffset += bits;
                continue;
              }
            }
            // If wire has a ref but no storage entry, try to extract storage index from ref
            const refMatch = existing.ref.match(/^&(\d+)/);
            if(refMatch){
              storageIdx = parseInt(refMatch[1]);
              const stored = this.storage.find(s => s.index === storageIdx);
              if(stored){
                // Update existing storage value
                stored.value = wireValue || '0'.repeat(bits);
                // Keep the same reference - don't change existing.ref
                // Update wireStorageMap
                this.wireStorageMap.set(d.name, storageIdx);
                // Track for NEXT (not inside PCB body)
                if(!this.insidePcbBody && !this.wireStatements.includes(s)){
                  this.wireStatements.push(s);
                }
                bitOffset += bits;
                continue;
              }
            }
          }
        }
        
        // Default behavior: reuse existing storage or create new one
        if(this.wireStorageMap.has(d.name)){
          // Reuse existing storage slot for this wire
          storageIdx = this.wireStorageMap.get(d.name);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = wireValue || '0'.repeat(bits);
            // Remove any temporary storage slot created by expression evaluation (e.g. NOT, functions)
            // that is different from the slot we are reusing.
            if(wireRef && wireRef.startsWith('&')){
              const tmpMatch = wireRef.match(/^&(\d+)$/);
              if(tmpMatch){
                const tmpIdx = parseInt(tmpMatch[1]);
                if(tmpIdx !== storageIdx){
                  const tmpPos = this.storage.findIndex(s => s.index === tmpIdx);
                  if(tmpPos !== -1) this.storage.splice(tmpPos, 1);
                }
              }
            }
          } else {
            // Storage was lost, create new one
            storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
            this.wireStorageMap.set(d.name, storageIdx);
          }
        } else {
          // Create new storage
          storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
          this.wireStorageMap.set(d.name, storageIdx);
        }
        
        // Set wire reference to the storage index
        const simpleRef = `&${storageIdx}`;
        if(!this.wires.has(d.name)){
          this.wires.set(d.name, {type: actualType, ref: simpleRef});
        } else {
          this.wires.get(d.name).ref = simpleRef;
        }
        
        // Track wire statement for NEXT (not inside PCB body)
        if(!this.insidePcbBody && !this.wireStatements.includes(s)){
          this.wireStatements.push(s);
        }
      } else {
        // Bit assignment - store value
        const valueBits = totalValue.substring(bitOffset, bitOffset + bits);
        
        if(valueBits.length !== bits){
          throw Error(`Bit-width mismatch: ${d.name} is ${bits}bit but got ${valueBits.length} bits`);
        }
        
        if(this.vars.has(d.name)){
          throw Error('Immutable '+d.name);
        }
        
        const idx = this.storeValue(valueBits);
        this.vars.set(d.name, {type: d.type, value: valueBits, ref: `&${idx}`});
      }
      
      bitOffset += bits;
    }
    } finally {
      // Restore previous statement context
      this.currentStmt = prevStmt;
    }
  }

  execWireStatement(s){
    // Re-execute a wire assignment statement
    // Set current statement context for REG calls
    const prevStmt = this.currentStmt;
    this.currentStmt = s;

    // Handle pure assignment statements: name = expr  (no type declaration)
    if(s.assignment){
      const wireName = s.assignment.target.var;
      const wire = this.wires.get(wireName);
      if(!wire){ this.currentStmt = prevStmt; return; }
      const bits = this.getBitWidth(wire.type);
      if(!bits){ this.currentStmt = prevStmt; return; }
      try {
        const exprResult = this.evalExpr(s.assignment.expr, false);
        let totalValue = '';
        for(const part of exprResult){
          if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val){ totalValue += val; continue; }
          }
          if(part.value) totalValue += part.value;
        }
        let wireValue = totalValue.substring(0, bits);
        if(wireValue.length < bits) wireValue = wireValue.padStart(bits, '0');
        //console.log(`[DEBUG execWireStmt] assignment '${wireName}' computed='${wireValue}'`);
        // Reuse existing storage slot (registered by wireStorageMap at first assignment)
        let storageIdx;
        if(this.wireStorageMap.has(wireName)){
          storageIdx = this.wireStorageMap.get(wireName);
          const stored = this.storage.find(st => st.index === storageIdx);
          if(stored){
            stored.value = wireValue;
          } else {
            storageIdx = this.storeValue(wireValue);
            this.wireStorageMap.set(wireName, storageIdx);
          }
        } else if(wire.ref && wire.ref.startsWith('&')){
          storageIdx = parseInt(wire.ref.slice(1));
          const stored = this.storage.find(st => st.index === storageIdx);
          if(stored){
            stored.value = wireValue;
            this.wireStorageMap.set(wireName, storageIdx);
          } else {
            storageIdx = this.storeValue(wireValue);
            this.wireStorageMap.set(wireName, storageIdx);
          }
        } else {
          storageIdx = this.storeValue(wireValue);
          this.wireStorageMap.set(wireName, storageIdx);
        }
        wire.ref = `&${storageIdx}`;
      } catch(e){
        //console.log(`[DEBUG execWireStmt] ERROR in assignment '${wireName}':`, e.message);
      } finally {
        this.currentStmt = prevStmt;
      }
      return;
    }
    
    const wsName = s.decls ? s.decls.map(d=>d.name).join(',') : '?';
    //console.log(`[DEBUG execWireStmt] re-executing for '${wsName}'`);
    
    try {
    // During NEXT(~) recomputation, use computeRefs=false to avoid creating new storage for literals
    const exprResult = this.evalExpr(s.expr, false);
    
    // Compute total value from expression
    // Always prefer reading from ref to get current value (important for WIREWRITE mode)
    let totalValue = '';
    for(const part of exprResult){
      if(part.ref && part.ref !== '&-'){
        const val = this.getValueFromRef(part.ref);
        if(val) {
          totalValue += val;
          continue;
        }
      }
      // Fallback to part.value if no ref or ref didn't yield a value
      if(part.value){
        totalValue += part.value;
      }
    }
    //console.log(`[DEBUG execWireStmt] '${wsName}' computed totalValue='${totalValue}'`);
    
    let bitOffset = 0;
    for (const d of s.decls) {
      // Handle existing variables/wires
      let actualType = d.type;
      if(d.existing){
        const wire = this.wires.get(d.name);
        if(wire){
          actualType = wire.type;
        } else {
          const varInfo = this.vars.get(d.name);
          if(varInfo){
            actualType = varInfo.type;
          }
        }
        if(!actualType) continue;
      }
      
      if(d.name === '_' || d.name === '~' || d.name === '%' || d.name === '$') {
        bitOffset += this.getBitWidth(actualType);
        continue;
      }
      if(!this.isWire(actualType)) {
        bitOffset += this.getBitWidth(actualType);
        continue;
      }
      
      const bits = this.getBitWidth(actualType);
      
      // Extract value directly from expression parts (no need to build ref and then get value)
      const valueBits = totalValue.substring(bitOffset, bitOffset + bits);
      let wireValue = valueBits;
      
      // Ensure we have the right number of bits (left-pad with zeros for numeric correctness)
      if(wireValue.length < bits){
        wireValue = wireValue.padStart(bits, '0');
      } else if(wireValue.length > bits){
        wireValue = wireValue.substring(wireValue.length - bits);
      }
      
      // Reuse existing storage or create new one
      let storageIdx;
      if(this.wireStorageMap.has(d.name)){
        // Reuse existing storage
        storageIdx = this.wireStorageMap.get(d.name);
        const stored = this.storage.find(s => s.index === storageIdx);
        if(stored){
          stored.value = wireValue || '0'.repeat(bits);
        } else {
          // Storage was lost, create new one
          storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
          this.wireStorageMap.set(d.name, storageIdx);
        }
      } else {
        // Create new storage
        storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
        this.wireStorageMap.set(d.name, storageIdx);
      }
      
      // Set wire reference to the storage index
      const simpleRef = `&${storageIdx}`;
      if(this.wires.has(d.name)){
        this.wires.get(d.name).ref = simpleRef;
      }
      //console.log(`[DEBUG execWireStmt] wire '${d.name}' stored value='${wireValue}' at ref=${simpleRef}`);
      
      bitOffset += bits;
    }
    } finally {
      this.currentStmt = prevStmt;
    }
  }

  execComp(comp){
    // Execute component declaration: comp [led] .power: ...
    const {type, componentType, name, attributes, returnType} = comp;
    let initialValue = comp.initialValue;
    let dipRef = null; // For DIP switches
    let switchRef = null; // For switches, store the output reference
    let rotaryRef = null; // For rotary knobs, store the output reference
    let keyRef = null; // For keys, store the output reference

    // Resolve variable reference for initialValue (e.g. = d in comp declaration)
    if(initialValue && typeof initialValue === 'object' && initialValue.varRef){
      const varName = initialValue.varRef;
      const wire = this.wires.get(varName);
      if(wire && wire.ref){
        const resolved = this.getValueFromRef(wire.ref);
        if(resolved !== null) initialValue = resolved;
        else throw Error(`Wire '${varName}' has no value yet at component declaration '${name}'`);
      } else {
        throw Error(`Undefined variable '${varName}' used in component declaration '${name}'`);
      }
    }
    
    // Calculate bits from component type and attributes (componentType is now null)
    const bits = this.getComponentBits(type, attributes);
    if(!bits){
      throw Error(`Invalid component type ${type} for component ${name}`);
    }
    
    // Generate unique ID for component
    const baseId = name.substring(1); // Remove leading '.'
    
    if(this.componentRegistry){
      const handler = this.componentRegistry.get(type);
      if(handler){
        const result = handler.createDevice(name, baseId, bits, attributes, initialValue, returnType, this);
        if(result.earlyReturn && result.compInfo){
          this.components.set(name, result.compInfo);
          return;
        }
        const compInfo = {
          type: type,
          componentType: null,
          attributes: attributes,
          initialValue: result.initialValueAddr0 !== undefined ? result.initialValueAddr0 : initialValue,
          returnType: returnType,
          ref: result.ref || null,
          deviceIds: result.deviceIds
        };
        if(!compInfo.ref && initialValue && !result.ref){
          const storageIdx = this.storeValue(initialValue);
          compInfo.ref = `&${storageIdx}`;
        }
        handler.finalizeCompInfo(compInfo, attributes, initialValue, bits);
        this.components.set(name, compInfo);
        return;
      }
      throw Error(`Unknown component type: ${type}`);
    }

    const deviceIds = [];
    
    if(type === 'led'){
      // Create LED(s) - if bits > 1, create multiple LEDs
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const color = attributes.color || '#ff0000';
      const square = attributes.square || false;
      const nl = attributes.nl || false;
      
      const value = initialValue || '0'.repeat(bits);
      
      for(let i = 0; i < bits; i++){
        const ledId = bits === 1 ? baseId : `${baseId}.${i + 1}`;
        const ledValue = value[i] === '1';
        const isLast = (i === bits - 1);
        
        // Only add text to first LED
        const ledText = (i === 0) ? text : '';
        const ledNl = (isLast && nl) ? true : false;
        
        if(typeof addLed === 'function'){
          const ledParams = {
            id: ledId,
            text: ledText,
            color: color,
            value: ledValue,
            nl: ledNl
          };
          // Only add round attribute if square is true
          if(square){
            ledParams.round = 0;
          }
          addLed(ledParams);
        }
        
        deviceIds.push(ledId);
      }
    } else if(type === 'switch'){
      // Create switch
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const nl = attributes.nl || false;
      const value = initialValue ? (initialValue[0] === '1') : false;
      
      // Create storage for switch output (always create storage for switches)
      const switchInitialValue = initialValue || '0';
      const storageIdx = this.storeValue(switchInitialValue);
      switchRef = `&${storageIdx}`;
      
      // Create onChange handler that will update connected references
      const switchId = baseId;
      const onChange = (checked) => {
        // Update the component's value in storage
        const compInfo = this.components.get(name);
        if(compInfo && compInfo.ref){
          const storageIdx = parseInt(compInfo.ref.substring(1));
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = checked ? '1' : '0';
            // Update all connected components
            this.updateComponentConnections(name);
            console.log(`[DEBUG on change] after updateComponentConnections, wires:`, [...this.wires.entries()].map(([k,v]) => `${k}=${this.getValueFromRef(v.ref)}`).join(', '));
            showVars();
          }
        }
      };
      
      if(typeof addSwitch === 'function'){
        addSwitch({
          text: text,
          value: value,
          nl: nl,
          onChange: onChange
        });
      }
      
      deviceIds.push(switchId);
    } else if(type === 'dip'){
      // Create DIP switch
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const nl = attributes.nl || false;
      const noLabels = attributes.noLabels || false;
      const visual = attributes.visual !== undefined ? parseInt(attributes.visual, 10) : 0;
      const count = bits; // Number of switches = bit width
      
      // Parse initial value: convert binary string to array of booleans
      let initial = [];
      if(initialValue){
        // initialValue is a binary string like "10100101"
        for(let i = 0; i < initialValue.length && i < count; i++){
          initial.push(initialValue[i] === '1');
        }
      }
      // Pad with false if needed
      while(initial.length < count){
        initial.push(false);
      }
      
      // Create storage for DIP switch output
      const dipInitialValue = initialValue || '0'.repeat(count);
      const storageIdx = this.storeValue(dipInitialValue);
      dipRef = `&${storageIdx}`;
      
      // Create onChange handler that will update connected references
      const dipId = baseId;
      const onChange = (index, checked) => {
        // Update the component's value in storage
        const compInfo = this.components.get(name);
        if(compInfo && compInfo.ref){
          const storageIdx = parseInt(compInfo.ref.substring(1));
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            // Update the bit at the given index
            let currentValue = stored.value || '0'.repeat(count);
            // Ensure value has correct length
            if(currentValue.length < count){
              currentValue = currentValue.padEnd(count, '0');
            } else if(currentValue.length > count){
              currentValue = currentValue.substring(0, count);
            }
            // Update the bit
            const bits = currentValue.split('');
            bits[index] = checked ? '1' : '0';
            stored.value = bits.join('');
            // Update all connected components
            this.updateComponentConnections(name);
            showVars();
          }
        }
      };
      
      if(typeof addDipSwitch === 'function'){
        addDipSwitch({
          id: dipId,
          text: text,
          count: count,
          initial: initial,
          nl: nl,
          noLabels: noLabels,
          visual: visual,
          onChange: onChange
        });
      }
      
      deviceIds.push(dipId);
    } else if(type === 'key'){
      // Create key (momentary button)
      const label = attributes.label !== undefined ? String(attributes.label) : '';
      const size = attributes.size !== undefined ? parseInt(attributes.size, 10) : 36;
      const nl = attributes.nl || false;
      
      // Create storage for key output (1 bit) - keys start unpressed
      const keyInitialValue = '0';
      const storageIdx = this.storeValue(keyInitialValue);
      keyRef = `&${storageIdx}`;
      
      const keyId = baseId;
      
      // Create onPress handler (sets to 1 immediately)
      // Capture keyRef directly in closure
      const onPress = (pressedLabel) => {
        const keyStorageIdx = parseInt(keyRef.substring(1));
        const stored = this.storage.find(s => s.index === keyStorageIdx);
        if(stored){
          stored.value = '1';
          this.updateComponentConnections(name);
          showVars();
        }
      };
      
      // Create onRelease handler (sets to 0 after pressDuration)
      // Capture keyRef directly in closure
      const onRelease = () => {
        const keyStorageIdx = parseInt(keyRef.substring(1));
        const stored = this.storage.find(s => s.index === keyStorageIdx);
        if(stored){
          stored.value = '0';
          this.updateComponentConnections(name);
          showVars();
        }
      };
      
      if(typeof addKey === 'function'){
        addKey({
          id: keyId,
          label: label,
          size: size,
          nl: nl,
          onPress: onPress,
          onRelease: onRelease
        });
      }
      
      deviceIds.push(keyId);
      // keyRef will be assigned to compInfo.ref later
    } else if(type === '7seg'){
      // Create 7-segment display
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const color = attributes.color || '#ff0000';
      const nl = attributes.nl || false;
      
      // Build initial value from segment attributes if present, otherwise use initialValue or default
      let segInitialValue = initialValue || '0'.repeat(bits);
      if(attributes.segments){
        // Build 8-bit value from segment attributes (a, b, c, d, e, f, g, h)
        const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const segArray = segInitialValue.split('');
        for(let i = 0; i < segments.length; i++){
          const segName = segments[i];
          if(attributes.segments[segName] !== undefined){
            segArray[i] = attributes.segments[segName];
          }
        }
        segInitialValue = segArray.join('');
      }
      
      const segId = baseId;
      
      if(typeof addSevenSegment === 'function'){
        const segParams = {
          id: segId,
          text: text,
          color: color,
          values: segInitialValue,
          nl: nl
        };
        addSevenSegment(segParams);
      }
      
      // Apply segment attributes if present (after component is created)
      if(attributes.segments && typeof setSegment === 'function'){
        const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for(const segName of segments){
          if(attributes.segments[segName] !== undefined){
            const segValue = attributes.segments[segName] === '1';
            setSegment(segId, segName, segValue);
          }
        }
      }
      
      deviceIds.push(segId);
    } else if(type === '14seg'){
      // Create 14-segment display
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const color = attributes.color || '#6dff9c';
      const nl = attributes.nl || false;

      // Build initial value (15 segments)
      let segInitialValue = initialValue || '0'.repeat(bits);

      if(attributes.segments){
        const segments = [
          'a','b','c','d','e','f',
          'g1','g2',
          'h','i','j','k',
          'l','m',
          'dp'
        ];

        const segArray = segInitialValue.split('');

        for(let i = 0; i < segments.length; i++){
          const segName = segments[i];
          if(attributes.segments[segName] !== undefined){
            segArray[i] = attributes.segments[segName];
          }
        }

        segInitialValue = segArray.join('');
      }

      const segId = baseId;

      // Create device
      if(typeof addFourteenSegment === 'function'){
        const segParams = {
          id: segId,
          text: text,
          color: color,
          values: segInitialValue,
          nl: nl
        };
        addFourteenSegment(segParams);
      }

      // Apply individual segment values
      if(attributes.segments && typeof setSegment14 === 'function'){
        const segments = [
          'a','b','c','d','e','f',
          'g1','g2',
          'h','i','j','k',
          'l','m',
          'dp'
        ];

        for(const segName of segments){
          if(attributes.segments[segName] !== undefined){
            const segValue = attributes.segments[segName] === '1';
            setSegment14(segId, segName, segValue);
          }
        }
      }

      deviceIds.push(segId);
    } else if(type === 'mem'){
      // Create memory component
      // Use bracket notation to avoid conflict with JavaScript's built-in 'length' property
      //console.log('[DEBUG] mem attributes:', JSON.stringify(attributes));
      const length = attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 3;
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      //console.log('[DEBUG] mem parsed length:', length, 'depth:', depth);
      const defaultValue = initialValue || '0'.repeat(depth);
      
      // Validate default value length matches depth
      if(defaultValue.length !== depth){
        throw Error(`Memory default value length (${defaultValue.length}) must match depth (${depth}) for component ${name}`);
      }
      
      // Validate length and depth are positive
      if(length <= 0 || depth <= 0){
        throw Error(`Memory length and depth must be positive for component ${name}`);
      }
      
      const memId = baseId;
      
      if(typeof addMem === 'function'){
        addMem({
          id: memId,
          length: length,
          depth: depth,
          default: defaultValue
        });
      }
      
      deviceIds.push(memId);
      // Memory components don't have a ref (they can't be assigned to directly)
    } else if(type === 'reg'){
      // Create register component (simplified memory with length=1, no address)
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      const defaultValue = initialValue || '0'.repeat(depth);
      
      // Validate default value length matches depth
      if(defaultValue.length !== depth){
        throw Error(`Register default value length (${defaultValue.length}) must match depth (${depth}) for component ${name}`);
      }
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Register depth must be positive for component ${name}`);
      }
      
      const regId = baseId;
      
      if(typeof addReg === 'function'){
        addReg({
          id: regId,
          depth: depth,
          default: defaultValue
        });
      }
      
      deviceIds.push(regId);
      // Register components don't have a ref (they can't be assigned to directly)
    } else if(type === 'counter'){
      // Create counter component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      const defaultValue = initialValue || '0'.repeat(depth);
      
      // Validate default value length matches depth
      if(defaultValue.length !== depth){
        throw Error(`Counter default value length (${defaultValue.length}) must match depth (${depth}) for component ${name}`);
      }
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Counter depth must be positive for component ${name}`);
      }
      
      const counterId = baseId;
      
      if(typeof addCounter === 'function'){
        addCounter({
          id: counterId,
          depth: depth,
          default: defaultValue
        });
      }
      
      deviceIds.push(counterId);
      // Counter components don't have a ref (they can't be assigned to directly)
    } else if(type === 'osc'){
      const duration1 = attributes['duration1'] !== undefined ? parseInt(attributes['duration1'], 10) : 4;
      const duration0 = attributes['duration0'] !== undefined ? parseInt(attributes['duration0'], 10) : 4;
      const length = attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 4;
      const freq = attributes['freq'] !== undefined ? parseFloat(attributes['freq']) : 1;
      const freqIsSec = attributes['freqIsSec'] !== undefined ? parseInt(attributes['freqIsSec'], 10) : 0;
      const eachCycle = attributes['eachCycle'] !== undefined ? parseInt(attributes['eachCycle'], 10) : 1;

      if(duration1 < 1 || duration1 > 8){
        throw Error(`Oscillator duration1 must be between 1 and 8 for component ${name}`);
      }
      if(duration0 < 1 || duration0 > 8){
        throw Error(`Oscillator duration0 must be between 1 and 8 for component ${name}`);
      }
      if(length < 1){
        throw Error(`Oscillator length must be positive for component ${name}`);
      }
      if(freq <= 0){
        throw Error(`Oscillator freq must be positive for component ${name}`);
      }
      if(freqIsSec !== 0 && freqIsSec !== 1){
        throw Error(`Oscillator freqIsSec must be 0 (Hz) or 1 (seconds) for component ${name}`);
      }
      if(eachCycle !== 0 && eachCycle !== 1){
        throw Error(`Oscillator eachCycle must be 0 (each state) or 1 (each cycle) for component ${name}`);
      }

      const storageIdx = this.storeValue('0');
      const oscRef = `&${storageIdx}`;

      const oscState = {
        counterValue: '0'.repeat(length),
        length: length,
        eachCycle: eachCycle
      };

      const period = freqIsSec === 1 ? freq * 1000 : 1000 / freq;
      const highTime = period * duration1 / (duration1 + duration0);
      const lowTime = period * duration0 / (duration1 + duration0);

      const self = this;
      const compName = name;

      function incrementCounter(){
        const maxVal = (1 << oscState.length) - 1;
        let current = parseInt(oscState.counterValue, 2);
        current = (current + 1) > maxVal ? 0 : current + 1;
        oscState.counterValue = current.toString(2).padStart(oscState.length, '0');
      }

      function goHigh(){
        const stored = self.storage.find(s => s.index === storageIdx);
        if(stored) stored.value = '1';
        if(eachCycle === 0) incrementCounter();
        self.updateComponentConnections(compName);
        if(typeof showVars === 'function') showVars();
        const tid = setTimeout(goLow, highTime);
        self.oscTimers.push(tid);
      }

      function goLow(){
        const stored = self.storage.find(s => s.index === storageIdx);
        if(stored) stored.value = '0';
        incrementCounter();
        self.updateComponentConnections(compName);
        if(typeof showVars === 'function') showVars();
        const tid = setTimeout(goHigh, lowTime);
        self.oscTimers.push(tid);
      }

      const startTid = setTimeout(goHigh, lowTime);
      this.oscTimers.push(startTid);

      // Osc has a ref (1-bit value accessible via .osc1 or .osc1:get)
      const compInfo = {
        type: type,
        componentType: null,
        name: name,
        attributes: attributes,
        initialValue: '0',
        returnType: returnType,
        ref: oscRef,
        deviceIds: [],
        oscState: oscState
      };
      this.components.set(name, compInfo);
      return;
    } else if(type === 'adder'){
      // Create adder component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Adder depth must be positive for component ${name}`);
      }
      
      const adderId = baseId;
      
      if(typeof addAdder === 'function'){
        addAdder({
          id: adderId,
          depth: depth
        });
      }
      
      deviceIds.push(adderId);
      // Adder components don't have a ref (they can't be assigned to directly)
    } else if(type === 'subtract'){
      // Create subtract component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Subtract depth must be positive for component ${name}`);
      }
      
      const subtractId = baseId;
      
      if(typeof addSubtract === 'function'){
        addSubtract({
          id: subtractId,
          depth: depth
        });
      }
      
      deviceIds.push(subtractId);
      // Subtract components don't have a ref (they can't be assigned to directly)
    } else if(type === 'divider'){
      // Create divider component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Divider depth must be positive for component ${name}`);
      }
      
      const dividerId = baseId;
      
      if(typeof addDivider === 'function'){
        addDivider({
          id: dividerId,
          depth: depth
        });
      }
      
      deviceIds.push(dividerId);
      // Divider components don't have a ref (they can't be assigned to directly)
    } else if(type === 'multiplier'){
      // Create multiplier component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Multiplier depth must be positive for component ${name}`);
      }
      
      const multiplierId = baseId;
      
      if(typeof addMultiplier === 'function'){
        addMultiplier({
          id: multiplierId,
          depth: depth
        });
      }
      
      deviceIds.push(multiplierId);
      // Multiplier components don't have a ref (they can't be assigned to directly)
    } else if(type === 'shifter'){
      // Create shifter component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      const circular = attributes['circular'] !== undefined;
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Shifter depth must be positive for component ${name}`);
      }
      
      const shifterId = baseId;
      
      if(typeof addShifter === 'function'){
        addShifter({
          id: shifterId,
          depth: depth,
          circular: circular
        });
      }
      
      deviceIds.push(shifterId);
      // Shifter components don't have a ref (they can't be assigned to directly)
    } else if(type === 'rotary'){
      // Create rotary knob component
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const states = attributes.states !== undefined ? parseInt(attributes.states, 10) : 8;
      const color = attributes.color || '#6dff9c';
      const nl = attributes.nl || false;
      
      // Extract forLabels if present (for.X attributes)
      const forLabels = attributes.forLabels || {};
      
      // Validate states is positive and at least 2
      if(states < 2){
        throw Error(`Rotary states must be at least 2 for component ${name}`);
      }
      
      // Calculate bit width from states
      const calculatedBits = Math.ceil(Math.log2(states));
      // Use the bit width from component type if specified, otherwise use calculated
      const actualBits = bits || calculatedBits;
      
      // Create storage for rotary knob output
      const rotaryInitialValue = initialValue || '0'.repeat(actualBits);
      const storageIdx = this.storeValue(rotaryInitialValue);
      const rotaryRef = `&${storageIdx}`;
      
      // Create onChange handler that will update connected references
      const rotaryId = baseId;
      // Store rotaryRef in a variable that will be accessible in onChange
      const onChange = (binValue) => {
        // Use the stored rotaryRef directly instead of getting it from compInfo
        // This ensures it works even if compInfo.ref is not set yet
        if(!rotaryRef){
          return;
        }
        const storageIdx = parseInt(rotaryRef.substring(1));
        const stored = this.storage.find(s => s.index === storageIdx);
        if(!stored){
          return;
        }
        // Get compInfo for attributes
        const compInfo = this.components.get(name);
        if(!compInfo){
          return;
        }
        // Ensure compInfo.ref is set (it should be set when component is created)
        if(!compInfo.ref){
          compInfo.ref = rotaryRef;
        }
        // Ensure value has correct length
        // Use calculatedBits (number of bits needed to represent states) not componentType bits
        // For states=4, we need 2 bits (00, 01, 10, 11), not 4 bits
        const states = compInfo.attributes['states'] !== undefined ? parseInt(compInfo.attributes['states'], 10) : 8;
        const calculatedBits = Math.ceil(Math.log2(states));
        // Always use calculatedBits for the value returned by onChange
        // The componentType is just for storage/display, but the actual value should match the number of states
        const finalBits = calculatedBits;
        
        let value = binValue;
        if(value.length < finalBits){
          value = value.padStart(finalBits, '0');
        } else if(value.length > finalBits){
          value = value.substring(0, finalBits);
        }
        stored.value = value;
        // Update all connected components and wires
        this.updateComponentConnections(name);
        showVars();
      };
      
      if(typeof addRotaryKnob === 'function'){
        addRotaryKnob({
          id: rotaryId,
          label: text,
          states: states,
          color: color,
          forLabels: forLabels,
          onChange: onChange
        });
      }
      
      deviceIds.push(rotaryId);
      // rotaryRef will be set to compInfo.ref below
    } else if(type === 'lcd'){
      // Create LCD component
      const rows = attributes['row'] !== undefined ? parseInt(attributes['row'], 10) : 8;
      const cols = attributes['cols'] !== undefined ? parseInt(attributes['cols'], 10) : 5;
      const pixelSize = attributes['pixelSize'] !== undefined ? parseInt(attributes['pixelSize'], 10) : 10;
      const pixelGap = attributes['pixelGap'] !== undefined ? parseInt(attributes['pixelGap'], 10) : 3;
      const glow = attributes['glow'] !== undefined ? true : true; // Default true
      const round = attributes['round'] !== undefined ? true : true; // Default true
      const color = attributes['color'] || attributes['pixelOnColor'] || '#6dff9c';
      const bg = attributes['bg'] || attributes['backgroundColor'] || 'transparent';
      const nl = attributes['nl'] || false;
      const rgb = attributes['rgb'] !== undefined;
      
      const lcdId = baseId;
      
      if(typeof addCharacterLCD === 'function'){
        addCharacterLCD({
          id: lcdId,
          rows: rows,
          cols: cols,
          pixelSize: pixelSize,
          pixelGap: pixelGap,
          glow: glow,
          pixelOnColor: color,
          backgroundColor: bg,
          round: round,
          nl: nl,
          rgb: rgb
        });
      }
      
      deviceIds.push(lcdId);
    } else {
      throw Error(`Unknown component type: ${type}`);
    }
    
    // Store component info
    const compInfo = {
      type: type,
      componentType: null,  // No longer used - bits derived from type and attributes
      attributes: attributes,
      initialValue: initialValue,
      returnType: returnType,
      ref: null,
      deviceIds: deviceIds
    };
    
    // For switches, dip switches, and rotary knobs, ref is already set above
    if(type === 'switch'){
      compInfo.ref = switchRef;
    } else if(type === 'dip'){
      // DIP switch ref was set in the dip block above
      compInfo.ref = dipRef;
    } else if(type === 'rotary'){
      // Rotary knob ref was set in the rotary block above
      compInfo.ref = rotaryRef;
    } else if(type === 'key'){
      // Key ref was set in the key block above
      compInfo.ref = keyRef;
    } else if(initialValue){
      // For other components (LEDs, 7seg), create storage only if initial value is set
      const storageIdx = this.storeValue(initialValue);
      compInfo.ref = `&${storageIdx}`;
    }
    
    // Store initial segment value for 7seg :get property
    if(type === '7seg'){
      // Rebuild value from segment attributes if present
      let segValue = initialValue || '0'.repeat(bits);
      if(attributes.segments){
        const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const segArray = segValue.split('');
        for(let i = 0; i < segments.length; i++){
          const segName = segments[i];
          if(attributes.segments[segName] !== undefined){
            segArray[i] = attributes.segments[segName];
          }
        }
        segValue = segArray.join('');
      }
      compInfo.lastSegmentValue = segValue;
    } else if(type === '14seg'){
      // Rebuild value from segment attributes if present
      let segValue = initialValue || '0'.repeat(bits);

      if(attributes.segments){
        const segments = [
          'a','b','c','d','e','f',
          'g1','g2',
          'h','i','j','k',
          'l','m',
          'dp'
        ];

        const segArray = segValue.split('');

        for(let i = 0; i < segments.length; i++){
          const segName = segments[i];
          if(attributes.segments[segName] !== undefined){
            segArray[i] = attributes.segments[segName];
          }
        }

        segValue = segArray.join('');
      }

      compInfo.lastSegmentValue = segValue;
    }
    
    this.components.set(name, compInfo);
  }
  
  execPcbInstance(inst){
    // Execute PCB instance: pcb [name] .var::
    const { pcbName, instanceName } = inst;
    
    // Get PCB definition
    const def = this.pcbDefinitions.get(pcbName);
    if(!def){
      throw Error(`PCB '${pcbName}' is not defined. Available PCBs: ${[...this.pcbDefinitions.keys()].join(', ')}`);
    }
    
    const prefix = instanceName.substring(1); // Remove leading '.'
    
    // Create storage for pins and pouts
    const pinStorage = new Map(); // pinName -> { bits, storageIdx, ref }
    const poutStorage = new Map(); // poutName -> { bits, storageIdx, ref }
    
    // Initialize pin storage
    for(const pin of def.pins){
      const initialValue = '0'.repeat(pin.bits);
      const storageIdx = this.storeValue(initialValue);
      pinStorage.set(pin.name, {
        bits: pin.bits,
        storageIdx: storageIdx,
        ref: `&${storageIdx}`
      });
    }
    
    // Initialize pout storage
    for(const pout of def.pouts){
      const initialValue = '0'.repeat(pout.bits);
      const storageIdx = this.storeValue(initialValue);
      poutStorage.set(pout.name, {
        bits: pout.bits,
        storageIdx: storageIdx,
        ref: `&${storageIdx}`
      });
    }
    
    // Store instance info
    const instanceInfo = {
      pcbName,
      def,
      pinStorage,
      poutStorage,
      internalPrefix: `_${prefix}`,
      lastExecValue: '0', // For edge detection
      pendingNextSection: false // Flag to indicate ~~ section should run at NEXT(~)
    };
    this.pcbInstances.set(instanceName, instanceInfo);
    
    // Execute initial body statements in isolated context
    this.executePcbBody(instanceName, def.body, false);
  }
  
  executePcbBody(instanceName, statements, isNextSection = false){
    // Execute PCB body statements with variable isolation
    const instance = this.pcbInstances.get(instanceName);
    if(!instance) return;
    
    const { def, pinStorage, poutStorage, internalPrefix } = instance;
    
    // Save current context
    const savedVars = new Map(this.vars);
    const savedWires = new Map(this.wires);
    const savedComponents = new Map(this.components);
    const savedInsidePcbBody = this.insidePcbBody;
    const savedCurrentPcbInstance = this.currentPcbInstance;
    
    // Mark that we're inside PCB body
    this.insidePcbBody = true;
    this.currentPcbInstance = instanceName;
    
    // Inject pins as wires so assignments like "reg1 = .s:get" reuse storage slots.
    // initOnly=true allows re-assignment each time the body executes.
    for(const [pinName, pinInfo] of pinStorage){
      this.wires.set(pinName, {
        type: `${pinInfo.bits}wire`,
        ref: pinInfo.ref,
        initOnly: true
      });
      if(pinInfo.ref && pinInfo.ref.startsWith('&')){
        this.wireStorageMap.set(pinName, parseInt(pinInfo.ref.slice(1)));
      }
    }

    // Inject pouts as wires so assignments like "reg1 = .s:get" reuse storage slots.
    // initOnly=true allows re-assignment each time the body executes.
    for(const [poutName, poutInfo] of poutStorage){
      this.wires.set(poutName, {
        type: `${poutInfo.bits}wire`,
        ref: poutInfo.ref,
        initOnly: true
      });
      if(poutInfo.ref && poutInfo.ref.startsWith('&')){
        this.wireStorageMap.set(poutName, parseInt(poutInfo.ref.slice(1)));
      }
    }
    
    // Re-inject internal body wires from previous executions so typed wire
    // declarations (e.g. "4wire tmp = NOT(data)") reuse existing storage slots.
    // initOnly=true allows re-declaration/assignment each time the body executes.
    if(instance.internalBodyWires){
      for(const [k, v] of instance.internalBodyWires){
        this.wires.set(k, {type: v.type, ref: v.ref, initOnly: true});
        if(v.ref && v.ref.startsWith('&')){
          this.wireStorageMap.set(k, parseInt(v.ref.slice(1)));
        }
      }
    }

    // Execute statements, renaming internal components
    for(const stmt of statements){
      const renamedStmt = this.renamePcbStatement(stmt, internalPrefix);
      this.exec(renamedStmt, true);
    }
    
    // Update pout storage from current wire values
    for(const [poutName, poutInfo] of poutStorage){
      const currentWire = this.wires.get(poutName);
      const value = currentWire ? this.getValueFromRef(currentWire.ref) : null;
      if(value) this.setValueAtRef(poutInfo.ref, value);
    }

    // Save return value (wire/var named in returnSpec) so .q direct access works
    if(def.returnSpec){
      const retVarName = def.returnSpec.varName;
      const retWire = this.wires.get(retVarName) || null;
      const retVar = this.vars.get(retVarName) || null;
      let retValue = null;
      if(retWire && retWire.ref) retValue = this.getValueFromRef(retWire.ref);
      else if(retVar && retVar.value) retValue = retVar.value;
      if(retValue !== null){
        instance.returnValue = retValue;
      }
    }
    
    // Restore original context (keeping internal components)
    // Merge new components with prefix to original (format: ._prefix_name)
    instance.internalComponentName = [];
    for(const [compName, compInfo] of this.components){
      if(compName.startsWith('.' + internalPrefix + '_')){
        savedComponents.set(compName, compInfo);
        instance.internalComponentName.push(compName);
      }
    }
    
    // Save internal body wires (not in outer context, not pin/pout) for reuse next run.
    // Always rebuild the map so refs are up-to-date after this execution.
    instance.internalBodyWires = new Map();
    for(const [k, v] of this.wires){
      if(!savedWires.has(k) && !pinStorage.has(k) && !poutStorage.has(k)){
        instance.internalBodyWires.set(k, {type: v.type, ref: v.ref});
      }
    }

    this.vars = savedVars;
    this.wires = savedWires;
    // Clean up wireStorageMap entries added for pins/pouts/internal wires during body execution
    for(const pinName of pinStorage.keys()) this.wireStorageMap.delete(pinName);
    for(const poutName of poutStorage.keys()) this.wireStorageMap.delete(poutName);
    if(instance.internalBodyWires){
      for(const k of instance.internalBodyWires.keys()) this.wireStorageMap.delete(k);
    }
    this.components = savedComponents;
    this.insidePcbBody = savedInsidePcbBody;
    this.currentPcbInstance = savedCurrentPcbInstance;
  }
  
  renamePcbStatement(stmt, prefix){
    // Deep clone and rename component references
    if(!stmt) return stmt;
    
    const renamed = JSON.parse(JSON.stringify(stmt));
    
    // Helper to rename component: .ram -> ._prefix_ram (keeps the leading .)
    const renameComp = (name) => {
      if(name.startsWith('.')){
        return '.' + prefix + '_' + name.substring(1);
      }
      return prefix + '_' + name;
    };
    
    // Rename comp declarations
    if(renamed.comp && renamed.comp.name){
      renamed.comp.name = renameComp(renamed.comp.name);
    }
    
    // Rename component property assignments
    if(renamed.compAssign && renamed.compAssign.component){
      if(renamed.compAssign.component.startsWith('.')){
        renamed.compAssign.component = renameComp(renamed.compAssign.component);
      }
    }
    
    // Rename component property blocks
    if(renamed.componentPropertyBlock && renamed.componentPropertyBlock.component){
      if(renamed.componentPropertyBlock.component.startsWith('.')){
        renamed.componentPropertyBlock.component = renameComp(renamed.componentPropertyBlock.component);
      }
    }
    
    // Recursively rename expressions
    this.renamePcbExpressions(renamed, prefix);
    
    return renamed;
  }
  
  renamePcbExpressions(obj, prefix){
    if(!obj || typeof obj !== 'object') return;
    
    if(Array.isArray(obj)){
      for(const item of obj){
        this.renamePcbExpressions(item, prefix);
      }
      return;
    }
    
    // Helper to rename component: .ram -> ._prefix_ram or .ram:get -> ._prefix_ram:get
    const renameCompVar = (varName) => {
      if(varName.startsWith('.')){
        const parts = varName.split(':');
        const compName = parts[0]; // .ram
        const rest = parts.slice(1).join(':'); // get (if any)
        const newCompName = '.' + prefix + '_' + compName.substring(1);
        return rest ? newCompName + ':' + rest : newCompName;
      }
      return varName;
    };
    
    // Rename .component references in expressions
    if(obj.var && typeof obj.var === 'string' && obj.var.startsWith('.')){
      // Check if it's a component reference (not a pin/pout)
      const parts = obj.var.split(':');
      const compName = parts[0];
      // Only rename if it's not a pin or pout name
      const instance = [...this.pcbInstances.values()].find(i => i.internalPrefix === prefix);
      if(instance){
        const isPinOrPout = instance.pinStorage.has(compName.substring(1)) || 
                           instance.poutStorage.has(compName.substring(1));
        if(!isPinOrPout){
          obj.var = renameCompVar(obj.var);
        }
      } else {
        obj.var = renameCompVar(obj.var);
      }
    }
    
    // Recurse into nested objects
    for(const key of Object.keys(obj)){
      this.renamePcbExpressions(obj[key], prefix);
    }
  }
  
  // Convert hex digit (4 bits) to 7-segment pattern
  hexTo7Seg(hexValue){
    const hexMap = {
      '0000': '1111110', // 0: a b c d e f = 1, g = 0
      '0001': '0110000', // 1: b c = 1, rest = 0
      '0010': '1101101', // 2: a b d e g = 1, rest = 0
      '0011': '1111001', // 3: a b c d g = 1, rest = 0
      '0100': '0110011', // 4: b c f g = 1, rest = 0
      '0101': '1011011', // 5: a c d f g = 1, rest = 0
      '0110': '1011111', // 6: a c d e f g = 1, rest = 0
      '0111': '1110000', // 7: a b c = 1, rest = 0
      '1000': '1111111', // 8: all = 1
      '1001': '1111011', // 9: a b c d f g = 1, rest = 0
      '1010': '1110111', // A: a b c e f g = 1, rest = 0
      '1011': '0011111', // b: c d e f g = 1, rest = 0
      '1100': '1001110', // C: a d e f = 1, rest = 0
      '1101': '0111101', // d: b c d e g = 1, rest = 0
      '1110': '1001111', // E: a d e f g = 1, rest = 0
      '1111': '1000111'  // F: a e f g = 1, rest = 0
    };
    
    let normalized = hexValue;
    if(normalized.length < 4){
      normalized = normalized.padStart(4, '0');
    } else if(normalized.length > 4){
      normalized = normalized.substring(0, 4);
    }
    
    return hexMap[normalized] || '0000000';
  }


  // Convert hex digit (4 bits) to 14-segment pattern
  hexTo14Seg(hexValue){
    const hexMap = {
      // a b c d e f g1 g2 h i j k l m dp
      '0000': '111111000000000', // 0
      '0001': '011000000000000', // 1
      '0010': '110110110000000', // 2
      '0011': '111100110000000', // 3
      '0100': '011001110000000', // 4
      '0101': '101101110000000', // 5
      '0110': '101111110000000', // 6
      '0111': '111000000000000', // 7
      '1000': '111111110000000', // 8
      '1001': '111101110000000', // 9

      '1010': '111011110000000', // A
      '1011': '001111110000000', // b
      '1100': '100111000000000', // C
      '1101': '011110110000000', // d
      '1110': '100111110000000', // E
      '1111': '100011110000000'  // F
    };

    let normalized = hexValue;

    if(normalized.length < 4){
      normalized = normalized.padStart(4, '0');
    } else if(normalized.length > 4){
      normalized = normalized.substring(0, 4);
    }

    return hexMap[normalized] || '000000000000000';
  }

  bitsTo14Seg(bitsValue){
    // Normalize to 8 bits (ASCII-like)
    let bits = bitsValue;
    if(bits.length < 8) bits = bits.padStart(8, '0');
    else if(bits.length > 8) bits = bits.substring(0, 8);

    const code = parseInt(bits, 2);

    // Convert to character
    let ch = String.fromCharCode(code);

    return this.charTo14Seg(ch);
  }

  charTo14Seg(ch){
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
      'A': '111011110011000',
      'B': '001111110011000',
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
      'a': '111011110011000',
      'b': '001111110011000',
      'c': '000110110000000',
      'd': '011110110011000',
      'e': '110111110000000',
      'f': '100011110000000',

      // special
      '-': '000000110000000',
      '_': '000100000000000',
      '=': '000100110000000',
      ' ': '000000000000000',
      '.': '000000000000001'
    };

    return map[ch] || '000000000000000';
  }
  
  // Execute a property block - set all properties in order
  // block: the componentPropertyBlocks entry (optional, passed during re-execution)
  executePropertyBlock(component, properties, reEvaluate, block){
    // Check if it's a PCB instance first
    const pcbInstance = this.pcbInstances.get(component);
    if(pcbInstance){
      return this.executePcbPropertyBlock(component, pcbInstance, properties, reEvaluate, block);
    }

    const comp = this.components.get(component);
    if(!comp){
      return;
    }
    
    // If reEvaluate is true, check if this block is a constant set=1 block with no dependencies
    // These blocks should only execute during initial RUN(), not when re-evaluating
    if(reEvaluate){
      for(const block of this.componentPropertyBlocks){
        if(block.component !== component) continue;
        // Check if this is the same block by comparing properties
        if(block.properties.length === properties.length){
          let isSameBlock = true;
          for(let i = 0; i < properties.length; i++){
            if(block.properties[i].property !== properties[i].property){
              isSameBlock = false;
              break;
            }
          }
          if(isSameBlock && block.setExpr && block.setExpr.length === 1){
            const atom = block.setExpr[0];
            if((atom.bin === '1') || (atom.hex === '1') || (atom.dec === '1')){
              const hasWireDep = block.wireDependencies && block.wireDependencies.size > 0;
              const hasDep = block.dependencies && block.dependencies.size > 0;
              if(!hasWireDep && !hasDep){
                return; // Skip execution
              }
            }
          }
        }
      }
    }
    
    // Execute each property assignment in order
    for(const prop of properties){
      const property = prop.property;
      
      // Skip get>, mod>, carry>, over>, out>, and pout> properties - they are processed after all properties are applied
      if(property === 'get>' || property === 'mod>' || property === 'carry>' || property === 'over>' || property === 'out>' || property === 'pout>'){
        continue;
      }
      
      const expr = prop.expr;
      
      // Evaluate expression
      let value = '';
      if(expr.length === 1 && expr[0].var === '~'){
        // Expression is exactly ~ (special variable)
        value = '~';
      } else {
        const exprResult = this.evalExpr(expr, false);
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }
      }
      
      // Store pending property with expression for re-evaluation
      // When reEvaluate is true, we're executing a block due to a change, so we should clear old properties
      // from other blocks to avoid mixing properties from different blocks
      if(!this.componentPendingProperties.has(component)){
        this.componentPendingProperties.set(component, {});
      }
      const pending = this.componentPendingProperties.get(component);
      
      // For LCD components, clear chr/data if not in current block to prevent interference
      // between blocks that use chr vs data independently
      const comp = this.components.get(component);
      if(comp && comp.type === 'lcd'){
        const currentBlockPropNames = new Set(properties.map(p => p.property));
        if(!currentBlockPropNames.has('chr') && pending.chr !== undefined){
          delete pending.chr;
        }
        if(!currentBlockPropNames.has('data') && pending.data !== undefined){
          delete pending.data;
        }
      }
      
      // If reEvaluate is true, clear properties that are not in the current block
      // This ensures that only properties from the executing block are applied
      if(reEvaluate){
        const currentBlockPropNames = new Set(properties.map(p => p.property));
        // Remove properties that are not in the current block
        for(const propName of Object.keys(pending)){
          if(!currentBlockPropNames.has(propName)){
            delete pending[propName];
          }
        }
      }
      
      pending[property] = {
        expr: expr,
        value: value
      };
      
      // Note: Segment properties (a, b, c, d, e, f, g, h) are NOT processed immediately here
      // They will be processed in applyComponentProperties when 'set' is executed
      // This avoids double processing (once here, once in applyComponentProperties)
      
      // If property is 'set', apply the properties
      if(property === 'set'){
        const when = value === '~' ? 'next' : 'immediate';
        this.componentPendingSet.set(component, when);
        this.applyComponentProperties(component, when, reEvaluate);
      }
    }
    
    // Process get> property if present (after all properties are applied)
    let getTarget = null;
    for(const prop of properties){
      if(prop.property === 'get>'){
        if(getTarget){
          throw Error(`Only one get> property allowed per block`);
        }
        getTarget = prop.target;
      }
    }
    
    if(getTarget){
      // Validate component supports :get
      const comp = this.components.get(component);
      if(!comp){
        return;
      }
      
      const supportsGet = this.componentRegistry ? this.componentRegistry.supportsProperty(comp.type, 'get') : true;
      if(!supportsGet){
        throw Error(`Component ${component} (type: ${comp.type}) does not support :get property`);
      }
      
      // Evaluate component:get
      const getAtom = {
        var: component,
        property: 'get'
      };
      const getResult = this.evalAtom(getAtom, false);
      
      // Assign result to target wire
      const targetName = getTarget.var;
      const wire = this.wires.get(targetName);
      if(!wire){
        throw Error(`Wire ${targetName} not found for get> assignment`);
      }
      
      // Get bit width for target wire
      const bits = this.getBitWidth(wire.type);
      let getValue = getResult.value || '0'.repeat(bits);
      
      // Ensure value has correct length
      if(getValue.length < bits){
        getValue = getValue.padEnd(bits, '0');
      } else if(getValue.length > bits){
        getValue = getValue.substring(0, bits);
      }
      
      // Update wire storage
      let storageIdx = null;
      if(wire.ref){
        const refMatch = wire.ref.match(/^&(\d+)/);
        if(refMatch){
          storageIdx = parseInt(refMatch[1]);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            const oldValue = stored.value;
            if(oldValue !== getValue){
              stored.value = getValue;
              // Update connected components only if value changed
              this.updateConnectedComponents(targetName, getValue);
            }
          }
        }
      } else {
        // Wire has no ref yet - create storage and set ref
        storageIdx = this.storeValue(getValue);
        wire.ref = `&${storageIdx}`;
        // Also update wireStorageMap for NEXT support
        if(!this.wireStorageMap.has(targetName)){
          this.wireStorageMap.set(targetName, storageIdx);
        }
        // Update connected components (new wire, always trigger)
        this.updateConnectedComponents(targetName, getValue);
      }
    }
    
    // Process mod> property if present (for divider)
    let modTarget = null;
    for(const prop of properties){
      if(prop.property === 'mod>'){
        if(modTarget){
          throw Error(`Only one mod> property allowed per block`);
        }
        modTarget = prop.target;
      }
    }
    
    if(modTarget){
      // Validate component supports :mod
      const comp = this.components.get(component);
      if(!comp){
        return;
      }
      
      if(!this.componentRegistry || !this.componentRegistry.supportsRedirect(comp.type, 'mod')){
        throw Error(`Component ${component} (type: ${comp.type}) does not support :mod property`);
      }
      
      // Evaluate component:mod
      const modAtom = {
        var: component,
        property: 'mod'
      };
      const modResult = this.evalAtom(modAtom, false);
      
      // Assign result to target wire
      const targetName = modTarget.var;
      const wire = this.wires.get(targetName);
      if(!wire){
        throw Error(`Wire ${targetName} not found for mod> assignment`);
      }
      
      // Get bit width for target wire
      const bits = this.getBitWidth(wire.type);
      let modValue = modResult.value || '0'.repeat(bits);
      
      // Ensure value has correct length
      if(modValue.length < bits){
        modValue = modValue.padEnd(bits, '0');
      } else if(modValue.length > bits){
        modValue = modValue.substring(0, bits);
      }
      
      // Update wire storage
      let storageIdx = null;
      if(wire.ref){
        const refMatch = wire.ref.match(/^&(\d+)/);
        if(refMatch){
          storageIdx = parseInt(refMatch[1]);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            const oldValue = stored.value;
            if(oldValue !== modValue){
              stored.value = modValue;
              // Update connected components only if value changed
              this.updateConnectedComponents(targetName, modValue);
            }
          }
        }
      } else {
        // Wire has no ref yet - create storage and set ref
        storageIdx = this.storeValue(modValue);
        wire.ref = `&${storageIdx}`;
        // Also update wireStorageMap for NEXT support
        if(!this.wireStorageMap.has(targetName)){
          this.wireStorageMap.set(targetName, storageIdx);
        }
        // Update connected components (new wire, always trigger)
        this.updateConnectedComponents(targetName, modValue);
      }
    }
    
    // Process carry> property if present (for adder/subtract)
    let carryTarget = null;
    for(const prop of properties){
      if(prop.property === 'carry>'){
        if(carryTarget){
          throw Error(`Only one carry> property allowed per block`);
        }
        carryTarget = prop.target;
      }
    }
    
    if(carryTarget){
      // Validate component supports :carry
      const comp = this.components.get(component);
      if(!comp){
        return;
      }
      
      if(!this.componentRegistry || !this.componentRegistry.supportsRedirect(comp.type, 'carry')){
        throw Error(`Component ${component} (type: ${comp.type}) does not support :carry property`);
      }
      
      // Evaluate component:carry
      const carryAtom = {
        var: component,
        property: 'carry'
      };
      const carryResult = this.evalAtom(carryAtom, false);
      
      // Assign result to target wire
      const targetName = carryTarget.var;
      const wire = this.wires.get(targetName);
      if(!wire){
        throw Error(`Wire ${targetName} not found for carry> assignment`);
      }
      
      // Get bit width for target wire
      const bits = this.getBitWidth(wire.type);
      let carryValue = carryResult.value || '0'.repeat(bits);
      
      // Ensure value has correct length
      if(carryValue.length < bits){
        carryValue = carryValue.padEnd(bits, '0');
      } else if(carryValue.length > bits){
        carryValue = carryValue.substring(0, bits);
      }
      
      // Update wire storage
      let storageIdx = null;
      if(wire.ref){
        const refMatch = wire.ref.match(/^&(\d+)/);
        if(refMatch){
          storageIdx = parseInt(refMatch[1]);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            const oldValue = stored.value;
            if(oldValue !== carryValue){
              stored.value = carryValue;
              // Update connected components only if value changed
              this.updateConnectedComponents(targetName, carryValue);
            }
          }
        }
      } else {
        // Wire has no ref yet - create storage and set ref
        storageIdx = this.storeValue(carryValue);
        wire.ref = `&${storageIdx}`;
        // Also update wireStorageMap for NEXT support
        if(!this.wireStorageMap.has(targetName)){
          this.wireStorageMap.set(targetName, storageIdx);
        }
        // Update connected components (new wire, always trigger)
        this.updateConnectedComponents(targetName, carryValue);
      }
    }
    
    // Process over> property if present (for multiplier)
    let overTarget = null;
    for(const prop of properties){
      if(prop.property === 'over>'){
        if(overTarget){
          throw Error(`Only one over> property allowed per block`);
        }
        overTarget = prop.target;
      }
    }
    
    if(overTarget){
      // Validate component supports :over
      const comp = this.components.get(component);
      if(!comp){
        return;
      }
      
      if(!this.componentRegistry || !this.componentRegistry.supportsRedirect(comp.type, 'over')){
        throw Error(`Component ${component} (type: ${comp.type}) does not support :over property`);
      }
      
      // Evaluate component:over
      const overAtom = {
        var: component,
        property: 'over'
      };
      const overResult = this.evalAtom(overAtom, false);
      
      // Assign result to target wire
      const targetName = overTarget.var;
      const wire = this.wires.get(targetName);
      if(!wire){
        throw Error(`Wire ${targetName} not found for over> assignment`);
      }
      
      // Get bit width for target wire
      const bits = this.getBitWidth(wire.type);
      let overValue = overResult.value || '0'.repeat(bits);
      
      // Ensure value has correct length
      if(overValue.length < bits){
        overValue = overValue.padEnd(bits, '0');
      } else if(overValue.length > bits){
        overValue = overValue.substring(0, bits);
      }
      
      // Update wire storage
      let storageIdx = null;
      if(wire.ref){
        const refMatch = wire.ref.match(/^&(\d+)/);
        if(refMatch){
          storageIdx = parseInt(refMatch[1]);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            const oldValue = stored.value;
            if(oldValue !== overValue){
              stored.value = overValue;
              // Update connected components only if value changed
              this.updateConnectedComponents(targetName, overValue);
            }
          }
        }
      } else {
        // Wire has no ref yet - create storage and set ref
        storageIdx = this.storeValue(overValue);
        wire.ref = `&${storageIdx}`;
        // Also update wireStorageMap for NEXT support
        if(!this.wireStorageMap.has(targetName)){
          this.wireStorageMap.set(targetName, storageIdx);
        }
        // Update connected components (new wire, always trigger)
        this.updateConnectedComponents(targetName, overValue);
      }
    }
    
    // Process out> property if present (for shifter)
    let outTarget = null;
    for(const prop of properties){
      if(prop.property === 'out>'){
        if(outTarget){
          throw Error(`Only one out> property allowed per block`);
        }
        outTarget = prop.target;
      }
    }
    
    if(outTarget){
      // Validate component supports :out
      const comp = this.components.get(component);
      if(!comp){
        return;
      }
      
      if(!this.componentRegistry || !this.componentRegistry.supportsRedirect(comp.type, 'out')){
        throw Error(`Component ${component} (type: ${comp.type}) does not support :out property`);
      }
      
      // Evaluate component:out
      const outAtom = {
        var: component,
        property: 'out'
      };
      const outResult = this.evalAtom(outAtom, false);
      
      // Assign result to target wire
      const targetName = outTarget.var;
      const wire = this.wires.get(targetName);
      if(!wire){
        throw Error(`Wire ${targetName} not found for out> assignment`);
      }
      
      // Get bit width for target wire
      const bits = this.getBitWidth(wire.type);
      let outValue = outResult.value || '0'.repeat(bits);
      
      // Ensure value has correct length (out is always 1 bit, but wire might be wider)
      if(outValue.length < bits){
        outValue = outValue.padEnd(bits, '0');
      } else if(outValue.length > bits){
        outValue = outValue.substring(0, bits);
      }
      
      // Update wire storage
      let storageIdx = null;
      if(wire.ref){
        const refMatch = wire.ref.match(/^&(\d+)/);
        if(refMatch){
          storageIdx = parseInt(refMatch[1]);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = outValue;
            // Update connected components
            this.updateConnectedComponents(targetName, outValue);
          }
        }
      } else {
        // Wire has no ref yet - create storage and set ref
        storageIdx = this.storeValue(outValue);
        wire.ref = `&${storageIdx}`;
        // Also update wireStorageMap for NEXT support
        if(!this.wireStorageMap.has(targetName)){
          this.wireStorageMap.set(targetName, storageIdx);
        }
        // Update connected components
        this.updateConnectedComponents(targetName, outValue);
      }
    }
  }
  
  // Execute a PCB property block - handle pin assignments, pout>= and set trigger
  // block: the componentPropertyBlocks entry — used for per-block lastExecValue tracking
  executePcbPropertyBlock(instanceName, instance, properties, reEvaluate, block){
    const def = instance.def;
    let shouldTriggerExec = false;

    // Execute each property assignment in order
    for(const prop of properties){
      const property = prop.property;

      // Skip pout> properties - they are processed after all properties are applied
      if(property === 'pout>'){
        continue;
      }

      // Handle 'set' property - triggers PCB exec
      if(property === 'set'){
        const expr = prop.expr;
        let value = '';
        if(expr && expr.length === 1 && expr[0].var === '~'){
          value = '~';
        } else if(expr) {
          const exprResult = this.evalExpr(expr, false);
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              value += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) value += val;
            }
          }
        }

        // Check if set is '1' (trigger exec)
        if(value === '1' || (value.length > 0 && value[value.length - 1] === '1')){
          shouldTriggerExec = true;
        }
        continue;
      }

      // Check if this property is a pin name
      const pinInfo = instance.pinStorage.get(property);
      if(pinInfo){
        // Assign to input pin
        const expr = prop.expr;
        const exprResult = this.evalExpr(expr, false);
        let value = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }

        // Pad/trim to correct bit width
        if(value.length < pinInfo.bits){
          value = value.padStart(pinInfo.bits, '0');
        } else if(value.length > pinInfo.bits){
          value = value.substring(value.length - pinInfo.bits);
        }

        // Store the value
        this.setValueAtRef(pinInfo.ref, value);
        continue;
      }

      // Check if it's a pout name (allow assignment to pout as well)
      const poutInfo = instance.poutStorage.get(property);
      if(poutInfo){
        const expr = prop.expr;
        const exprResult = this.evalExpr(expr, false);
        let value = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }

        if(value.length < poutInfo.bits){
          value = value.padStart(poutInfo.bits, '0');
        } else if(value.length > poutInfo.bits){
          value = value.substring(value.length - poutInfo.bits);
        }

        this.setValueAtRef(poutInfo.ref, value);
        continue;
      }

      // Unknown property for PCB instance
      throw Error(`Unknown property '${property}' for PCB instance ${instanceName}. Available pins: ${[...instance.pinStorage.keys()].join(', ')}. Available pouts: ${[...instance.poutStorage.keys()].join(', ')}`);
    }

    // Trigger exec if set = 1 was specified
    if(shouldTriggerExec){
      const onMode = def.on || 'raise';
      let shouldExecute = false;

      if(onMode === '1' || onMode === 'level'){
        // Level triggered: execute whenever set=1 (no edge tracking needed)
        shouldExecute = true;
      } else if(onMode === 'raise' || onMode === 'rising'){
        // Rising edge: execute only on 0→1 transition, tracked per block
        const prevBit = block ? (block.lastExecValue || '0') : (instance.lastExecValue || '0');
        shouldExecute = (prevBit === '0');
        if(block) block.lastExecValue = '1';
        else instance.lastExecValue = '1';
      } else if(onMode === 'edge' || onMode === 'falling'){
        shouldExecute = false;
      }

      if(shouldExecute){
        this.executePcbBody(instanceName, def.body, false);
        // Mark that ~~ section should be executed at NEXT(~)
        if(def.nextSection && def.nextSection.length > 0){
          instance.pendingNextSection = true;
        }
        // Re-evaluate wire statements that reference this PCB instance
        // so that wires like "8wire q = .q" reflect the updated pout/return values
        this.reEvalWiresDependingOnPcb(instanceName);
        if(typeof showVars === 'function') showVars();
      }
    }

    // Process pout> properties (after all pin assignments and exec)
    for(const prop of properties){
      if(prop.property === 'pout>'){
        const poutName = prop.poutName;
        const target = prop.target;

        // Get pout value
        const poutInfo = instance.poutStorage.get(poutName);
        if(!poutInfo){
          throw Error(`Unknown pout '${poutName}' for PCB instance ${instanceName}. Available pouts: ${[...instance.poutStorage.keys()].join(', ')}`);
        }

        const poutValue = this.getValueFromRef(poutInfo.ref) || '0'.repeat(poutInfo.bits);

        // Assign to target wire
        const targetName = target.var;
        const wire = this.wires.get(targetName);
        if(!wire){
          throw Error(`Wire ${targetName} not found for ${poutName}>= assignment`);
        }

        // Get bit width for target wire
        const bits = this.getBitWidth(wire.type);
        let getValue = poutValue;

        // Ensure value has correct length
        if(getValue.length < bits){
          getValue = getValue.padStart(bits, '0');
        } else if(getValue.length > bits){
          getValue = getValue.substring(getValue.length - bits);
        }

        // Update wire storage
        if(wire.ref){
          const refMatch = wire.ref.match(/^&(\d+)/);
          if(refMatch){
            const storageIdx = parseInt(refMatch[1]);
            const stored = this.storage.find(s => s.index === storageIdx);
            if(stored){
              stored.value = getValue;
              this.updateConnectedComponents(targetName, getValue);
            }
          }
        } else {
          // Wire has no ref yet - create storage and set ref
          const storageIdx = this.storeValue(getValue);
          wire.ref = `&${storageIdx}`;
          if(!this.wireStorageMap.has(targetName)){
            this.wireStorageMap.set(targetName, storageIdx);
          }
          this.updateConnectedComponents(targetName, getValue);
        }
      }
    }
  }

  // Re-evaluate all wire statements that reference a PCB instance by name
  // Called after executePcbBody to propagate updated pout values to dependent wires
  reEvalWiresDependingOnPcb(instanceName){
    const checkExpr = (expr) => {
      if(!Array.isArray(expr)) return false;
      for(const atom of expr){
        if(atom.var === instanceName) return true;
        if(atom.args && atom.args.some(arg => checkExpr(arg))) return true;
      }
      return false;
    };

    for(const ws of this.wireStatements){
      // Wire statements have shape: { decls: [{name, type}], expr: [...] }
      if(!ws.decls || !ws.expr) continue;
      if(!checkExpr(ws.expr)) continue;

      // Re-evaluate for each declared wire in this statement
      for(const d of ws.decls){
        const wireName = d.name;
        const wire = this.wires.get(wireName);
        if(!wire) continue;

        const bits = this.getBitWidth(wire.type);
        const exprResult = this.evalExpr(ws.expr, false);
        let wireValue = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            wireValue += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const v = this.getValueFromRef(part.ref);
            if(v) wireValue += v;
          }
        }
        if(!wireValue) continue;
        if(wireValue.length < bits) wireValue = wireValue.padStart(bits, '0');
        else if(wireValue.length > bits) wireValue = wireValue.substring(wireValue.length - bits);

        if(wire.ref){
          this.setValueAtRef(wire.ref, wireValue);
        } else {
          const idx = this.storeValue(wireValue);
          wire.ref = `&${idx}`;
          this.wireStorageMap.set(wireName, idx);
        }
      }
    }
  }

  // Apply pending properties to a component
  applyComponentProperties(compName, when, reEvaluate = false){
    const comp = this.components.get(compName);
    if(!comp) {
      return;
    }
    
    const pending = this.componentPendingProperties.get(compName);
    
    // Check if we should apply now
    if(when === 'next'){
      // Mark for next iteration, but don't apply now
      this.componentPendingSet.set(compName, 'next');
      // For mem components, we must not apply properties when when === 'next'
      if(comp.type === 'mem'){
        return;
      }
      return;
    }
    
      // If reEvaluate is true, check if there's a constant set=1 block with no dependencies
      // If there is, we should skip applying properties that come from that constant block
      // But we need to allow properties from other blocks (like the one with set=ANDA4(...))
      if(reEvaluate && pending){
        // Find constant blocks for this component
        const constantBlocks = [];
        for(const block of this.componentPropertyBlocks){
          if(block.component !== compName || !block.setExpr) continue;
          if(block.setExpr.length === 1){
            const atom = block.setExpr[0];
            if((atom.bin === '1') || (atom.hex === '1') || (atom.dec === '1')){
              const hasWireDep = block.wireDependencies && block.wireDependencies.size > 0;
              const hasDep = block.dependencies && block.dependencies.size > 0;
              if(!hasWireDep && !hasDep){
                constantBlocks.push(block);
              }
            }
          }
        }
        
        // If there are constant blocks, check if ALL pending properties come from constant blocks
        // If they do, skip applying (constant blocks should only execute during RUN())
        if(constantBlocks.length > 0){
          const constantBlockPropNames = new Set();
          for(const block of constantBlocks){
            for(const prop of block.properties){
              constantBlockPropNames.add(prop.property);
            }
          }
          
          const pendingPropNames = new Set(Object.keys(pending));
          // Check if all pending properties (except 'set') come from constant blocks
          let allFromConstantBlocks = true;
          for(const propName of pendingPropNames){
            if(propName === 'set') continue; // Skip 'set' property for now
            if(!constantBlockPropNames.has(propName)){
              allFromConstantBlocks = false;
              break;
            }
          }
          
          // Also check if 'set' property comes from a constant block
          if(allFromConstantBlocks && pending.set){
            const setExpr = pending.set.expr;
            if(setExpr && setExpr.length === 1){
              const setAtom = setExpr[0];
              if((setAtom.bin === '1') || (setAtom.hex === '1') || (setAtom.dec === '1')){
                return; // Skip applying properties from constant blocks
              }
            }
          }
          
          // If not all properties come from constant blocks, we need to filter out properties from constant blocks
          // and only apply properties from non-constant blocks
          if(!allFromConstantBlocks){
            // Remove properties that come from constant blocks
            for(const propName of constantBlockPropNames){
              if(pending[propName] && propName !== 'set'){
                delete pending[propName];
              }
            }
            // Also remove 'set' if it comes from a constant block
            if(pending.set){
              const setExpr = pending.set.expr;
              if(setExpr && setExpr.length === 1){
                const setAtom = setExpr[0];
                if((setAtom.bin === '1') || (setAtom.hex === '1') || (setAtom.dec === '1')){
                  delete pending.set;
                }
              }
            }
            // If no properties remain, return early
            if(Object.keys(pending).length === 0){
              return;
            }
          }
        }
      }
    
    // If no pending properties and not re-evaluating, nothing to do
    if(!pending && !reEvaluate){
      return;
    }
    
    if(this.componentRegistry){
      const handler = this.componentRegistry.get(comp.type);
      if(handler && handler.applyProperties){
        handler.applyProperties(comp, compName, pending, when, reEvaluate, this);
        if(!reEvaluate) this.componentPendingSet.delete(compName);
        return;
      }
    }

    if(comp.type === 'shifter'){
      // Process pending properties first (value, dir, in) if they exist
      // Then execute shift at the end
      const shifterId = comp.deviceIds[0];
      
      if(pending){
        // Get direction (stored in pending.dir or use current direction from shifter)
        let direction = 1; // Default: right
        if(pending.dir !== undefined){
          let dirValue = pending.dir.value;
          
          // If re-evaluating, re-evaluate the expression
          if(reEvaluate && pending.dir.expr){
            const exprResult = this.evalExpr(pending.dir.expr, false);
            dirValue = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                dirValue += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) dirValue += val;
              }
            }
            pending.dir.value = dirValue;
          }
          
          // Convert direction value to number (0 = left, 1 = right)
          direction = parseInt(dirValue, 2);
          if(direction !== 0 && direction !== 1){
            throw Error(`Shifter direction must be 0 (left) or 1 (right), got ${dirValue}`);
          }
          
          // Update direction
          if(typeof setShifterDir === 'function'){
            setShifterDir(shifterId, direction);
          }
        }
        
        // Apply value if set
        if(pending.value !== undefined){
          let valueStr = pending.value.value;
          
          // If re-evaluating, re-evaluate the expression
          if(reEvaluate && pending.value.expr){
            const exprResult = this.evalExpr(pending.value.expr, false);
            valueStr = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                valueStr += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) valueStr += val;
              }
            }
            pending.value.value = valueStr;
          }
          
          const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
          
          // Ensure value has correct length
          let binValue = valueStr;
          if(binValue.length < depth){
            binValue = binValue.padStart(depth, '0');
          } else if(binValue.length > depth){
            binValue = binValue.substring(0, depth);
          }
          
          // Set value
          if(typeof setShifterValue === 'function'){
            setShifterValue(shifterId, binValue);
          }
        }
        
        // Apply .in if set
        if(pending.in !== undefined){
          let inStr = pending.in.value;
          
          // If re-evaluating, re-evaluate the expression
          if(reEvaluate && pending.in.expr){
            const exprResult = this.evalExpr(pending.in.expr, false);
            inStr = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                inStr += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) inStr += val;
              }
            }
            pending.in.value = inStr;
          }
          
          // Take last bit if multiple bits
          const inValue = inStr.length > 0 ? inStr[inStr.length - 1] : '0';
          
          // Set input bit
          if(typeof setShifterIn === 'function'){
            setShifterIn(shifterId, inValue);
          }
        }
      }
      
      // Always execute shift when :set is called (even if pending is empty)
      // This allows multiple .sh:set = 1 calls to shift multiple times
      if(typeof shiftShifter === 'function'){
        shiftShifter(shifterId);
      }
      
      // After shift, update pending.value with the new shifted value
      // This ensures that if .sh:set = 1 is called again, it uses the updated value
      if(!pending){
        this.componentPendingProperties.set(compName, {});
      }
      const updatedPending = this.componentPendingProperties.get(compName);
      if(typeof getShifter === 'function'){
        const newValue = getShifter(shifterId);
        if(newValue !== null){
          updatedPending.value = {
            expr: null,
            value: newValue
          };
        }
      }
      
      return;
    }
    
    if(!pending) return;
    
    // Apply properties immediately
    if(comp.type === '7seg'){
      // Handle hex property
      if(pending.hex !== undefined){
        let hexValue = pending.hex.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.hex.expr){
          const exprResult = this.evalExpr(pending.hex.expr, false);
          // Get the value from expression
          hexValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              hexValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) hexValue += val;
            }
          }
          // Update stored value
          pending.hex.value = hexValue;
        }
        
        // Convert hex (4 bits) to 7-segment pattern
        const segPattern = this.hexTo7Seg(hexValue);
        
        // Update segments a-g (first 7 bits), keep h unchanged
          if(comp.deviceIds.length > 0){
          const segId = comp.deviceIds[0];
          const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
          for(let i = 0; i < segments.length; i++){
            const segName = segments[i];
            const segValue = segPattern[i] === '1';
            if(typeof setSegment === 'function'){
              setSegment(segId, segName, segValue);
            }
          }
          // h segment is not changed by hex property
          // Store lastSegmentValue (7 bits from pattern + current h bit)
          const currentH = comp.lastSegmentValue ? comp.lastSegmentValue[7] : '0';
          comp.lastSegmentValue = segPattern + currentH;
        }
      }
      
      // Handle individual segment properties (a, b, c, d, e, f, g, h) from property blocks
      const segAttributes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      let hasSegmentProperty = false;
      for(const segName of segAttributes){
        if(pending[segName] !== undefined){
          hasSegmentProperty = true;
          break;
        }
      }
      
      if(hasSegmentProperty && comp.deviceIds.length > 0){
        const segId = comp.deviceIds[0];
        
        // Update each segment that was specified in property block
        for(const segName of segAttributes){
          if(pending[segName] !== undefined){
            let segValue = pending[segName].value;
            
            // If re-evaluating, re-evaluate the expression
            if(reEvaluate && pending[segName].expr){
              const exprResult = this.evalExpr(pending[segName].expr, false);
              segValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  segValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) segValue += val;
                }
              }
              // Update stored value
              pending[segName].value = segValue;
            }
            
            // Extract last bit (should be 0 or 1)
            const segBit = segValue.length > 0 ? segValue[segValue.length - 1] : '0';
            if(segBit !== '0' && segBit !== '1'){
              throw Error(`Segment ${segName} value must be 0 or 1, got ${segBit}`);
            }
            
            const segBool = segBit === '1';
            if(typeof setSegment === 'function'){
              setSegment(segId, segName, segBool);
            }
            
            // Update lastSegmentValue
            if(!comp.lastSegmentValue){
              comp.lastSegmentValue = '00000000';
            }
            const segArray = comp.lastSegmentValue.split('');
            const segIndex = segAttributes.indexOf(segName);
            if(segIndex >= 0){
              segArray[segIndex] = segBit;
              comp.lastSegmentValue = segArray.join('');
            }
          }
        }
      }
      
      // Handle individual segment attributes (a, b, c, d, e, f, g, h) from component definition
      if(comp.attributes && comp.attributes.segments){
        if(comp.deviceIds.length > 0){
          const segId = comp.deviceIds[0];
          const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          // Update each segment that was specified
          for(const segName of segments){
            if(comp.attributes.segments[segName] !== undefined){
              const segValue = comp.attributes.segments[segName] === '1';
              if(typeof setSegment === 'function'){
                setSegment(segId, segName, segValue);
              }
            }
          }
          
          // Update lastSegmentValue to reflect current state
          // Get current segment states
          let currentSegValue = comp.lastSegmentValue || '00000000';
          const segArray = currentSegValue.split('');
          for(let i = 0; i < segments.length; i++){
            const segName = segments[i];
            if(comp.attributes.segments[segName] !== undefined){
              segArray[i] = comp.attributes.segments[segName];
            }
          }
          comp.lastSegmentValue = segArray.join('');
        }
      }
      
      // Handle set property
      if(pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          // Get the value from expression
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          // Update stored value
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (enable) or '0' (disable)
        // If set is '1', apply the hex value to the display
        // If set is '0', don't update the display
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply hex value if it exists
          if(pending.hex !== undefined){
            let hexValue = pending.hex.value;
            
            // Re-evaluate hex if needed
            if(reEvaluate && pending.hex.expr){
              const exprResult = this.evalExpr(pending.hex.expr, false);
              hexValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  hexValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) hexValue += val;
                }
              }
              pending.hex.value = hexValue;
            }
            
            // Convert hex (4 bits) to 7-segment pattern
            const segPattern = this.hexTo7Seg(hexValue);
            
            // Update segments a-g (first 7 bits), keep h unchanged
            if(comp.deviceIds.length > 0){
              const segId = comp.deviceIds[0];
              const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
              for(let i = 0; i < segments.length; i++){
                const segName = segments[i];
                const segValue = segPattern[i] === '1';
                if(typeof setSegment === 'function'){
                  setSegment(segId, segName, segValue);
                }
              }
              // Store lastSegmentValue (7 bits from pattern + current h bit)
              const currentH = comp.lastSegmentValue ? comp.lastSegmentValue[7] : '0';
              comp.lastSegmentValue = segPattern + currentH;

              // If individual segment properties also exist in pending, re-apply them now
              // so they override the hex value (individual segments have higher priority)
              const segAttribs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
              const hasIndividualSegs = segAttribs.some(s => pending[s] !== undefined);
              if(hasIndividualSegs){
                for(const segName of segAttribs){
                  if(pending[segName] !== undefined){
                    let segValue = pending[segName].value;
                    if(reEvaluate && pending[segName].expr){
                      const exprResult = this.evalExpr(pending[segName].expr, false);
                      segValue = '';
                      for(const part of exprResult){
                        if(part.value && part.value !== '-') segValue += part.value;
                        else if(part.ref && part.ref !== '&-'){
                          const val = this.getValueFromRef(part.ref);
                          if(val) segValue += val;
                        }
                      }
                      pending[segName].value = segValue;
                    }
                    const segBit = segValue.length > 0 ? segValue[segValue.length - 1] : '0';
                    if(typeof setSegment === 'function'){
                      setSegment(segId, segName, segBit === '1');
                    }
                    const segArray = comp.lastSegmentValue.split('');
                    const segIdx = segAttribs.indexOf(segName);
                    if(segIdx >= 0){ segArray[segIdx] = segBit; comp.lastSegmentValue = segArray.join(''); }
                  }
                }
              }
            }
          }
        }
      }
    } else if(comp.type === '14seg'){
      const segments = [
        'a','b','c','d','e','f',
        'g1','g2',
        'h','i','j','k',
        'l','m',
        'dp'
      ];

      /* ================= HEX PROPERTY ================= */
      if(pending.hex !== undefined){
        let hexValue = pending.hex.value;

        if(reEvaluate && pending.hex.expr){
          const exprResult = this.evalExpr(pending.hex.expr, false);
          hexValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-') hexValue += part.value;
            else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) hexValue += val;
            }
          }
          pending.hex.value = hexValue;
        }

        const segPattern = this.hexTo14Seg(hexValue);

        if(comp.deviceIds.length > 0){
          const segId = comp.deviceIds[0];

          for(let i = 0; i < segments.length; i++){
            if(typeof setSegment14 === 'function'){
              setSegment14(segId, segments[i], segPattern[i] === '1');
            }
          }

          comp.lastSegmentValue = segPattern;
        }
      }

      /* ================= CHAR PROPERTY ================= */
      if(pending.chr !== undefined){
        let charValue = pending.char.value;

        if(reEvaluate && pending.char.expr){
          const exprResult = this.evalExpr(pending.char.expr, false);
          charValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-') charValue += part.value;
            else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) charValue += val;
            }
          }
          pending.char.value = charValue;
        }

        const segPattern = this.bitsTo14Seg(charValue);

        if(comp.deviceIds.length > 0){
          const segId = comp.deviceIds[0];

          for(let i = 0; i < segments.length; i++){
            if(typeof setSegment14 === 'function'){
              setSegment14(segId, segments[i], segPattern[i] === '1');
            }
          }

          comp.lastSegmentValue = segPattern;
        }
      }

      /* ================= INDIVIDUAL SEGMENTS ================= */
      let hasSegmentProperty = segments.some(s => pending[s] !== undefined);

      if(hasSegmentProperty && comp.deviceIds.length > 0){
        const segId = comp.deviceIds[0];

        for(const segName of segments){
          if(pending[segName] !== undefined){

            let segValue = pending[segName].value;

            if(reEvaluate && pending[segName].expr){
              const exprResult = this.evalExpr(pending[segName].expr, false);
              segValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-') segValue += part.value;
                else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) segValue += val;
                }
              }
              pending[segName].value = segValue;
            }

            const segBit = segValue.length > 0 ? segValue[segValue.length - 1] : '0';

            if(segBit !== '0' && segBit !== '1'){
              throw Error(`Segment ${segName} must be 0 or 1`);
            }

            if(typeof setSegment14 === 'function'){
              setSegment14(segId, segName, segBit === '1');
            }

            if(!comp.lastSegmentValue){
              comp.lastSegmentValue = '0'.repeat(15);
            }

            const arr = comp.lastSegmentValue.split('');
            const idx = segments.indexOf(segName);
            if(idx >= 0){
              arr[idx] = segBit;
              comp.lastSegmentValue = arr.join('');
            }
          }
        }
      }

      /* ================= SET PROPERTY ================= */
      if(pending.set !== undefined){
        let setValue = pending.set.value;

        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-') setValue += part.value;
            else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }

        if(setValue === '1' || setValue[setValue.length - 1] === '1'){

          let segPattern = null;

          if(pending.chr !== undefined){
            segPattern = this.bitsTo14Seg(pending.chr.value);
          } else if(pending.hex !== undefined){
            segPattern = this.hexTo14Seg(pending.hex.value);
          }

          if(segPattern && comp.deviceIds.length > 0){
            const segId = comp.deviceIds[0];

            for(let i = 0; i < segments.length; i++){
              if(typeof setSegment14 === 'function'){
                setSegment14(segId, segments[i], segPattern[i] === '1');
              }
            }

            comp.lastSegmentValue = segPattern;
          }
        }
      }
    } else if(comp.type === 'mem'){
      // Handle memory properties: at, data, set
      // Note: when === 'next' is already handled at the start of this function
      // Double-check: Only apply if when === 'immediate' (not 'next')
      // This is a safety check in case the early return didn't work
      if(when !== 'immediate'){
        // Should not reach here if when === 'next' (should have returned earlier)
        // But just in case, return here too
        return;
      }
      
      const memId = comp.deviceIds[0];
      // Use bracket notation to avoid conflict with JavaScript's built-in 'length' property
      const length = comp.attributes['length'] !== undefined ? parseInt(comp.attributes['length'], 10) : 3;
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Get current address (stored in pending.at)
      // IMPORTANT: Always re-evaluate the address expression when :set is executed
      // This ensures that if .rom:at = .c:get, it uses the current value of .c:get
      let currentAddress = 0;
      if(pending && pending.at !== undefined){
        let addressValue = pending.at.value;
        
        // Always re-evaluate the expression when applying properties (not just when reEvaluate is true)
        // This ensures that references like .c:get are re-read with their current values
        // IMPORTANT: The expression stored in pending.at.expr contains the original atoms (like .c:get)
        // When we re-evaluate it, evalAtom will be called again for .c:get, which will get the current value
        // So we don't need to worry about old refs - the atoms will be re-evaluated
        if(pending.at.expr){
          // Re-evaluate the expression - this will re-evaluate all atoms including component properties
          const exprResult = this.evalExpr(pending.at.expr, false);
          addressValue = '';
          for(const part of exprResult){
            // For component properties like .c:get, part.value will contain the current value
            // and part.ref will be null (component properties don't create refs when computeRefs=false)
            if(part.value && part.value !== '-'){
              addressValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              // This is a reference to storage - get current value
              const val = this.getValueFromRef(part.ref);
              if(val) addressValue += val;
            }
          }
          // Update stored value for future use
          pending.at.value = addressValue;
        }
        
        // Convert address value to number
        currentAddress = parseInt(addressValue, 2);
        
        // Validate address
        if(currentAddress < 0 || currentAddress >= length){
          throw Error(`Memory invalid address ${currentAddress} (length: ${length} means address can be between 0 and ${length - 1})`);
        }
      }
      
      // Check if :write is set to 1
      let shouldWrite = false;
      if(pending && pending.write !== undefined){
        let writeValue = pending.write.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.write.expr){
          const exprResult = this.evalExpr(pending.write.expr, false);
          writeValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              writeValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) writeValue += val;
            }
          }
          pending.write.value = writeValue;
        }
        
        // Check if write is set to 1
        shouldWrite = (writeValue === '1');
      }
      
      // Apply data if :write = 1
      if(shouldWrite){
        if(pending && pending.data !== undefined){
          let dataValue = pending.data.value;
          
          // Always re-evaluate the expression when applying properties (not just when reEvaluate is true)
          // This ensures that references like .c:get are re-read with their current values
          const Q = pending;
          if(pending.data.expr){
            const exprResult = this.evalExpr(pending.data.expr, false);
         //   Q = exprResult;
            dataValue = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                dataValue += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) dataValue += val;
              }
            }
            // Update stored value for future use
            pending.data.value = dataValue;
          }
          
          // Pad data to next multiple of depth if shorter, else validate divisibility
          if(dataValue.length < depth){
            dataValue = dataValue.padStart(depth, '0');
            pending.data.value = dataValue;
          } else if(dataValue.length % depth !== 0){
            throw Error(`Memory data length (${dataValue.length}) must be divisible by depth (${depth}). [expr] ` + JSON.stringify(Q, null, 4));
          }
          
          // Split data into chunks of depth bits and set each address
          const numAddresses = dataValue.length / depth;
          if(currentAddress + numAddresses > length){
            throw Error(`Memory write would exceed memory length. Starting at address ${currentAddress}, trying to write ${numAddresses} addresses, but memory length is ${length}`);
          }
          
          // Set each address
          for(let i = 0; i < numAddresses; i++){
            const address = currentAddress + i;
            const value = dataValue.substring(i * depth, (i + 1) * depth);
            if(typeof setMem === 'function'){
              setMem(memId, address, value);
            }
          }
          
          // Clear :write after writing (it should not persist)
          if(!reEvaluate){
            delete pending.write;
          }
        } else {
          throw Error(`Memory :write = 1 requires :data to be set`);
        }
      }
      // If :write is not set to 1, don't write data (just update address for reading)
    } else if(comp.type === 'reg'){
      // Handle register properties: data, write, set
      // Note: Register doesn't have :at property (always address 0)
      // Note: when === 'next' is already handled at the start of this function
      // For registers, :set = 1 is sufficient to write (unlike mem which requires :write = 1)
      // But :write = 1 can still be used for consistency with mem syntax
      if(when !== 'immediate'){
        return;
      }
      
      const regId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Check if :set is set to 1
      let shouldApply = false;
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (enable)
        shouldApply = (setValue === '1' || setValue[setValue.length - 1] === '1');
      }
      
      // Apply data if :set = 1
      if(shouldApply){
        if(pending && pending.data !== undefined){
          let dataValue = pending.data.value;
          
          // Always re-evaluate the expression when applying properties
          if(pending.data.expr){
            const exprResult = this.evalExpr(pending.data.expr, false);
            dataValue = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                dataValue += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) dataValue += val;
              }
            }
            // Update stored value for future use
            pending.data.value = dataValue;
          }
          
          // Pad or truncate data to match depth
          if(dataValue.length < depth){
            dataValue = dataValue.padStart(depth, '0');
            pending.data.value = dataValue;
          } else if(dataValue.length > depth){
            throw Error(`Register data length (${dataValue.length}) must match depth (${depth})`);
          }
          
          // Set register value (no address needed)
          if(typeof setReg === 'function'){
            setReg(regId, dataValue);
          }
          
          // Clear :write after writing if it was set (it should not persist)
          if(!reEvaluate && pending.write !== undefined){
            delete pending.write;
          }
        } else {
          throw Error(`Register :set = 1 requires :data to be set`);
        }
      }
      // If :set is not set to 1, don't write data
    } else if(comp.type === 'counter'){
      // Handle counter properties: dir, data, write, set
      const counterId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;

        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }

        // Check if set is '1' (apply counter operation)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Check if :write is set to 1
          let shouldWrite = false;
          if(pending.write !== undefined){
            let writeValue = pending.write.value;

            // If re-evaluating, re-evaluate the expression
            if(reEvaluate && pending.write.expr){
              const exprResult = this.evalExpr(pending.write.expr, false);
              writeValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  writeValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) writeValue += val;
                }
              }
              pending.write.value = writeValue;
            }

            // Check if write is set to 1
            shouldWrite = (writeValue === '1');
          }

          if(shouldWrite){
            // :write = 1: Write the value from :data directly to counter
            if(pending.data === undefined){
              throw Error(`Counter :write = 1 requires :data to be set`);
            }

            let dataValue = pending.data.value;

            // If re-evaluating, re-evaluate the expression
            if(reEvaluate && pending.data.expr){
              const exprResult = this.evalExpr(pending.data.expr, false);
              dataValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  dataValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) dataValue += val;
                }
              }
              pending.data.value = dataValue;
            }

            // Ensure data value has correct length
            if(dataValue.length < depth){
              dataValue = dataValue.padStart(depth, '0');
            } else if(dataValue.length > depth){
              dataValue = dataValue.substring(0, depth);
            }

            // Write the value directly to counter
            if(typeof setCounter === 'function'){
              setCounter(counterId, dataValue);
            }

            // Clear :write, :dir, and :data after writing (they should not persist)
            if(!reEvaluate){
              delete pending.write;
              delete pending.dir;
              delete pending.data;
            }
          } else {
            // :write is not set to 1: Use :dir for increment/decrement
            // Get direction (stored in pending.dir, or use last set direction if not in pending)
            let direction = 1; // Default: increment
            if(pending.dir !== undefined){
              let dirValue = pending.dir.value;

              // If re-evaluating, re-evaluate the expression
              if(reEvaluate && pending.dir.expr){
                const exprResult = this.evalExpr(pending.dir.expr, false);
                dirValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    dirValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) dirValue += val;
                  }
                }
                pending.dir.value = dirValue;
              }

              // Convert direction value to number (0 = decrement, 1 = increment)
              direction = parseInt(dirValue, 2);
              if(direction !== 0 && direction !== 1){
                throw Error(`Counter direction must be 0 (decrement) or 1 (increment), got ${dirValue}`);
              }
            }

            // Apply increment/decrement when :set is executed
            // When :write is not set, always use current counter value (ignore :data)
            // :data is only used when :write = 1
            let baseValue = null;

            // Always use current counter value when :write is not set
            if(typeof getCounter === 'function'){
              baseValue = getCounter(counterId);
              // If no value exists, use default
              if(!baseValue || baseValue === comp.initialValue){
                baseValue = comp.initialValue || '0'.repeat(depth);
              }
            } else {
              // Fallback to initial value
              baseValue = comp.initialValue || '0'.repeat(depth);
            }

            // Apply increment or decrement based on direction
            let numValue = parseInt(baseValue, 2);
            const maxValue = Math.pow(2, depth) - 1;

            if(direction === 1){
              // Increment
              numValue = (numValue + 1) % (maxValue + 1);
            } else {
              // Decrement
              numValue = (numValue - 1 + maxValue + 1) % (maxValue + 1);
            }

            // Convert back to binary string
            const newValue = numValue.toString(2).padStart(depth, '0');

            // Set the counter value
            if(typeof setCounter === 'function'){
              setCounter(counterId, newValue);
            }

            // Do NOT clear :dir after increment/decrement (it should persist for future :set calls)
            // :data is not used for increment/decrement, so we don't need to clear it here
            // (it will only be used when :write = 1, and then it will be cleared)
          }
        }
      }
    } else if(comp.type === 'rotary'){
      // Handle rotary knob properties: data, set
      const rotaryId = comp.deviceIds[0];
      const states = comp.attributes['states'] !== undefined ? parseInt(comp.attributes['states'], 10) : 8;
      const calculatedBits = Math.ceil(Math.log2(states));
      const actualBits = this.getComponentBits(comp.type, comp.attributes);

      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply data) or '0' (don't apply)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply data value if it exists
          if(pending && pending.data !== undefined){
            let dataValue = pending.data.value;
            
            // If re-evaluating, re-evaluate the expression
            if(reEvaluate && pending.data.expr){
              const exprResult = this.evalExpr(pending.data.expr, false);
              dataValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  dataValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) dataValue += val;
                }
              }
              pending.data.value = dataValue;
            }
            
            // Ensure data value has correct length
            if(dataValue.length < actualBits){
              dataValue = dataValue.padStart(actualBits, '0');
            } else if(dataValue.length > actualBits){
              dataValue = dataValue.substring(0, actualBits);
            }
            
            // Set the rotary knob state
            if(typeof setRotaryKnob === 'function'){
              setRotaryKnob(rotaryId, dataValue);
            }
          }
        }
      }
    } else if(comp.type === 'adder'){
      // Handle adder properties: a, b, set
      const adderId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply :a if set
          if(pending.a !== undefined){
            let aValue = pending.a.value;
            
            if(reEvaluate && pending.a.expr){
              const exprResult = this.evalExpr(pending.a.expr, false);
              aValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  aValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) aValue += val;
                }
              }
              pending.a.value = aValue;
            }
            
            // Ensure value has correct length
            if(aValue.length < depth){
              aValue = aValue.padStart(depth, '0');
            } else if(aValue.length > depth){
              aValue = aValue.substring(0, depth);
            }
            
            if(typeof setAdderA === 'function'){
              setAdderA(adderId, aValue);
            }
          }
          
          // Apply :b if set
          if(pending.b !== undefined){
            let bValue = pending.b.value;
            
            if(reEvaluate && pending.b.expr){
              const exprResult = this.evalExpr(pending.b.expr, false);
              bValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  bValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) bValue += val;
                }
              }
              pending.b.value = bValue;
            }
            
            // Ensure value has correct length
            if(bValue.length < depth){
              bValue = bValue.padStart(depth, '0');
            } else if(bValue.length > depth){
              bValue = bValue.substring(0, depth);
            }
            
            if(typeof setAdderB === 'function'){
              setAdderB(adderId, bValue);
            }
          }
        }
      }
    } else if(comp.type === 'subtract'){
      // Handle subtract properties: a, b, set
      const subtractId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply :a if set
          if(pending.a !== undefined){
            let aValue = pending.a.value;
            
            if(reEvaluate && pending.a.expr){
              const exprResult = this.evalExpr(pending.a.expr, false);
              aValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  aValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) aValue += val;
                }
              }
              pending.a.value = aValue;
            }
            
            // Ensure value has correct length
            if(aValue.length < depth){
              aValue = aValue.padStart(depth, '0');
            } else if(aValue.length > depth){
              aValue = aValue.substring(0, depth);
            }
            
            if(typeof setSubtractA === 'function'){
              setSubtractA(subtractId, aValue);
            }
          }
          
          // Apply :b if set
          if(pending.b !== undefined){
            let bValue = pending.b.value;
            
            if(reEvaluate && pending.b.expr){
              const exprResult = this.evalExpr(pending.b.expr, false);
              bValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  bValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) bValue += val;
                }
              }
              pending.b.value = bValue;
            }
            
            // Ensure value has correct length
            if(bValue.length < depth){
              bValue = bValue.padStart(depth, '0');
            } else if(bValue.length > depth){
              bValue = bValue.substring(0, depth);
            }
            
            if(typeof setSubtractB === 'function'){
              setSubtractB(subtractId, bValue);
            }
          }
        }
      }
    } else if(comp.type === 'divider'){
      // Handle divider properties: a, b, set
      const dividerId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply :a if set
          if(pending.a !== undefined){
            let aValue = pending.a.value;
            
            if(reEvaluate && pending.a.expr){
              const exprResult = this.evalExpr(pending.a.expr, false);
              aValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  aValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) aValue += val;
                }
              }
              pending.a.value = aValue;
            }
            
            // Ensure value has correct length
            if(aValue.length < depth){
              aValue = aValue.padStart(depth, '0');
            } else if(aValue.length > depth){
              aValue = aValue.substring(0, depth);
            }
            
            if(typeof setDividerA === 'function'){
              setDividerA(dividerId, aValue);
            }
          }
          
          // Apply :b if set
          if(pending.b !== undefined){
            let bValue = pending.b.value;
            
            if(reEvaluate && pending.b.expr){
              const exprResult = this.evalExpr(pending.b.expr, false);
              bValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  bValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) bValue += val;
                }
              }
              pending.b.value = bValue;
            }
            
            // Ensure value has correct length
            if(bValue.length < depth){
              bValue = bValue.padStart(depth, '0');
            } else if(bValue.length > depth){
              bValue = bValue.substring(0, depth);
            }
            
            if(typeof setDividerB === 'function'){
              setDividerB(dividerId, bValue);
            }
          }
        }
      }
    } else if(comp.type === 'multiplier'){
      // Handle multiplier properties: a, b, set
      const multiplierId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply :a if set
          if(pending.a !== undefined){
            let aValue = pending.a.value;
            
            if(reEvaluate && pending.a.expr){
              const exprResult = this.evalExpr(pending.a.expr, false);
              aValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  aValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) aValue += val;
                }
              }
              pending.a.value = aValue;
            }
            
            // Ensure value has correct length
            if(aValue.length < depth){
              aValue = aValue.padStart(depth, '0');
            } else if(aValue.length > depth){
              aValue = aValue.substring(0, depth);
            }
            
            if(typeof setMultiplierA === 'function'){
              setMultiplierA(multiplierId, aValue);
            }
          }
          
          // Apply :b if set
          if(pending.b !== undefined){
            let bValue = pending.b.value;
            
            if(reEvaluate && pending.b.expr){
              const exprResult = this.evalExpr(pending.b.expr, false);
              bValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  bValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) bValue += val;
                }
              }
              pending.b.value = bValue;
            }
            
            // Ensure value has correct length
            if(bValue.length < depth){
              bValue = bValue.padStart(depth, '0');
            } else if(bValue.length > depth){
              bValue = bValue.substring(0, depth);
            }
            
            if(typeof setMultiplierB === 'function'){
              setMultiplierB(multiplierId, bValue);
            }
          }
        }
      }
    } else if(comp.type === 'lcd'){
      // Handle LCD properties: clear, set, x, y, rowlen, data
      const lcdId = comp.deviceIds[0];
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Reset RGB color when :set = 1
          if(typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)){
            lcdDisplays.get(lcdId).setCurrentColor(null);
          }
          
          // Check if clear is set
          let shouldClear = false;
          if(pending && pending.clear !== undefined){
            let clearValue = pending.clear.value;
            
            // If re-evaluating, re-evaluate the expression
            if(reEvaluate && pending.clear.expr){
              const exprResult = this.evalExpr(pending.clear.expr, false);
              clearValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  clearValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) clearValue += val;
                }
              }
              pending.clear.value = clearValue;
            }
            
            // If clear is '1', clear the LCD
            if(clearValue === '1' || clearValue[clearValue.length - 1] === '1'){
              shouldClear = true;
              if(typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)){
                lcdDisplays.get(lcdId).clear();
              }
              // Clear the clear property after use
              delete pending.clear;
            }
          }
          
          // Execute setRect if we have x, y, rowlen, and data
          // If clear was executed, it will run first, then setRect will execute
          // If :chr is set, generate :data from it
          if(pending && pending.x !== undefined && pending.y !== undefined && pending.rowlen !== undefined){
            // Check if :chr is set - if so, generate :data from it
            let notValue = 0
            let write0Value = 1;
            if(pending.not !== undefined) {
              notValue = pending.not.value == '1' ? 1:0;
            }
            if(pending.write0 !== undefined) {
              write0Value = pending.write0.value == '1' ? 1:0;
            }
            if(pending.chr !== undefined){
              let chrValue = pending.chr.value;
              
              // Check if the original expression is hex by examining the expr
              let isHex = false;
              if(pending.chr.expr && pending.chr.expr.length > 0){
                // Check if expression contains hex literal
                for(const atom of pending.chr.expr){
                  if(atom.hex){
                    isHex = true;
                    break;
                  }
                }
              }
              
              // If re-evaluating, re-evaluate the expression
              if(reEvaluate && pending.chr.expr){
                const exprResult = this.evalExpr(pending.chr.expr, false);
                chrValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    chrValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) chrValue += val;
                  }
                }
                pending.chr.value = chrValue;
              }
              
              // Convert chrValue to number
              // If original expression was hex, value is binary representation of hex
              // If original expression was binary, value is already binary
              let charCode = 0;
              if(isHex){
                // Value is binary representation of hex, convert back to number
                charCode = parseInt(chrValue, 2);
              } else {
                // Value is binary, parse as binary
                charCode = parseInt(chrValue, 2);
              }
              debug.ex = debug.ex === undefined? 0: debug.ex+1; 
              console.log(debug.ex, pending, (pending.data)? 'y': 'n');
              // Get character bits from LCD instance
              if(typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)){
                const lcdInstance = lcdDisplays.get(lcdId);
                if(typeof lcdInstance.getCharBitsString === 'function'){
                  let charBits = lcdInstance.getCharBitsString(charCode);
                  if(notValue) {
                    charBits = charBits.split('').map(bit =>
                        bit === '0' ? '1' : bit === '1' ? '0' : bit
                    ).join('');
                  }
                  // Set the generated data in pending.data
                  if(!pending.data){
                    pending.data = {};
                  }
                  pending.data.value = charBits;
                  pending.data.expr = null; // No expression, it's generated
                }
              }
            }
            
            // Check if we have data (either set directly or generated from chr)
            if(pending.data === undefined){
              // No data available, skip setRect
              return;
            }
            
            // Re-evaluate expressions if needed
            let xValue = pending.x.value;
            let yValue = pending.y.value;
            let rowlenValue = pending.rowlen.value;
            let dataValue = pending.data.value;
            let cornerValue = '00'; // Default: top-left
            
            // Get corner value if specified
            if(pending.corner !== undefined){
              cornerValue = pending.corner.value;
              
              // If re-evaluating, re-evaluate the expression
              if(reEvaluate && pending.corner.expr){
                const exprResult = this.evalExpr(pending.corner.expr, false);
                cornerValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    cornerValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) cornerValue += val;
                  }
                }
                pending.corner.value = cornerValue;
              }
            }
            
            if(reEvaluate){
              if(pending.x.expr){
                const exprResult = this.evalExpr(pending.x.expr, false);
                xValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    xValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) xValue += val;
                  }
                }
                pending.x.value = xValue;
              }
              
              if(pending.y.expr){
                const exprResult = this.evalExpr(pending.y.expr, false);
                yValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    yValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) yValue += val;
                  }
                }
                pending.y.value = yValue;
              }
              
              if(pending.rowlen.expr){
                const exprResult = this.evalExpr(pending.rowlen.expr, false);
                rowlenValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    rowlenValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) rowlenValue += val;
                  }
                }
                pending.rowlen.value = rowlenValue;
              }
              
              if(pending.data.expr){
                const exprResult = this.evalExpr(pending.data.expr, false);
                dataValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    dataValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) dataValue += val;
                  }
                }
                pending.data.value = dataValue;
              }
            }
            
            // Convert to integers
            let x = parseInt(xValue, 2);
            let y = parseInt(yValue, 2);
            const rowlen = parseInt(rowlenValue, 2);
            
            // Parse data into rows to calculate actual dimensions
            // rowlen is the number of bits per row
            // data contains all bits concatenated
            const rows = comp.attributes['row'] !== undefined ? parseInt(comp.attributes['row'], 10) : 8;
            const rectMap = {};
            let numRows = 0;
            
            // Split data into rows of rowlen bits each
            for(let r = 0; r < rows && r * rowlen < dataValue.length; r++){
              const startIdx = r * rowlen;
              const endIdx = Math.min(startIdx + rowlen, dataValue.length);
              const rowBits = dataValue.substring(startIdx, endIdx);
              if(rowBits.length > 0){
                rectMap[r] = rowBits;
                numRows = r + 1;
              }
            }
            
            // Adjust x and y based on corner
            // corner: 00 = top-left, 01 = top-right, 10 = bottom-left, 11 = bottom-right
            const corner = cornerValue.length >= 2 ? cornerValue.substring(cornerValue.length - 2) : '00';
            const cornerBits = corner.padStart(2, '0');
            
            if(cornerBits[1] === '1'){ // Right side (01 or 11)
              // Adjust x: x should be the right edge, so subtract width
              x = x - rowlen + 1;
            }
            
            if(cornerBits[0] === '1'){ // Bottom side (10 or 11)
            // Adjust y: y should be the bottom edge, so subtract height
            y = y - numRows + 1;
            }
            
            // Handle :rgb property if set
            let rgbColor = null;
            if(pending && pending.rgb !== undefined){
              let rgbValue = pending.rgb.value;
              
              // If re-evaluating, re-evaluate the expression
              if(reEvaluate && pending.rgb.expr){
                const exprResult = this.evalExpr(pending.rgb.expr, false);
                rgbValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    rgbValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) rgbValue += val;
                  }
                }
                pending.rgb.value = rgbValue;
              }
              
              // Convert hex value to #hex format
              // rgbValue is binary representation of hex (e.g., "111111" for ^3F)
              // We need to convert it back to hex string
              if(rgbValue && rgbValue.length > 0){
                // Check if the original expression is hex by examining the expr
                let isHex = false;
                if(pending.rgb.expr && pending.rgb.expr.length > 0){
                  for(const atom of pending.rgb.expr){
                    if(atom.hex){
                      isHex = true;
                      break;
                    }
                  }
                }
                
                if(isHex){
                  // Value is binary representation of hex, convert back to hex number then to string
                  const hexNum = parseInt(rgbValue, 2);
                  const hexStr = hexNum.toString(16).toUpperCase();
                  // Format as #RGB or #RRGGBB
                  if(hexStr.length <= 3){
                    // Expand short form (e.g., "3F3" -> "#3F3")
                    rgbColor = '#' + hexStr;
                  } else {
                    // Full form (e.g., "FF33FF" -> "#FF33FF")
                    rgbColor = '#' + hexStr;
                  }
                } else {
                  // If not hex, treat as binary and convert to hex
                  const hexNum = parseInt(rgbValue, 2);
                  const hexStr = hexNum.toString(16).toUpperCase();
                  // Determine padding based on expected length
                  const paddedHex = hexStr.length <= 3 ? hexStr.padStart(3, '0') : hexStr.padStart(6, '0');
                  rgbColor = '#' + paddedHex;
                }
                
                // Set the current color on LCD instance
                if(typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)){
                  lcdDisplays.get(lcdId).setCurrentColor(rgbColor);
                }
              }
            }
            
            // Call setRect with adjusted coordinates
            if(typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)){
              lcdDisplays.get(lcdId).setRect(x, y, rectMap, write0Value);
            }

            // Store lastCharValue for :get property
            // If :chr was used, use its value (8 bits); otherwise use first 8 bits of :data
            if(pending.chr !== undefined){
              let chrBinary = pending.chr.value || '00000000';
              // Ensure 8 bits
              if(chrBinary.length < 8){
                chrBinary = chrBinary.padStart(8, '0');
              } else if(chrBinary.length > 8){
                chrBinary = chrBinary.substring(chrBinary.length - 8);
              }
              comp.lastCharValue = chrBinary;
            } else if(dataValue && dataValue.length > 0){
              // No :chr, use first 8 bits of data as a fallback
              let dataBinary = dataValue.substring(0, Math.min(8, dataValue.length));
              if(dataBinary.length < 8){
                dataBinary = dataBinary.padStart(8, '0');
              }
              comp.lastCharValue = dataBinary;
            }
            
            if(pending.chr !== undefined) {
              delete pending.chr;
            }
          }
        }
      }
    } else if(comp.type === 'led'){
      // Handle LED properties: value, set
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;

        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }

        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply :value if set
          if(pending.value !== undefined){
            let ledValue = pending.value.value;

            if(reEvaluate && pending.value.expr){
              const exprResult = this.evalExpr(pending.value.expr, false);
              ledValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  ledValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) ledValue += val;
                }
              }
              pending.value.value = ledValue;
            }

            // Get bit width from component type and attributes
            const bits = this.getComponentBits(comp.type, comp.attributes) || 1;

            // Ensure value has correct length
            if(ledValue.length < bits){
              ledValue = ledValue.padStart(bits, '0');
            } else if(ledValue.length > bits){
              ledValue = ledValue.substring(ledValue.length - bits);
            }

            // Store value in component's ref
            if(comp.ref){
              this.setValueAtRef(comp.ref, ledValue);
            } else {
              // Create storage if needed
              const storageIdx = this.storeValue(ledValue);
              comp.ref = `&${storageIdx}`;
            }

            // Update LED display
            for(let i = 0; i < comp.deviceIds.length && i < ledValue.length; i++){
              const ledId = comp.deviceIds[i];
              const bitValue = ledValue[i] === '1';
              if(typeof setLed === 'function'){
                setLed(ledId, bitValue);
              }
            }
          }
        }
      }
    }
    
    // Only clear pending properties if not re-evaluating (they should persist for future updates)
    if(!reEvaluate){
      // Don't clear - keep them for future re-evaluations
      // this.componentPendingProperties.delete(compName);
      this.componentPendingSet.delete(compName);
    }
  }

}

Interpreter.EXEC_DISPATCH = {
  show: '_execShow',
  mode: '_execMode',
  comp: '_execComp',
  pcbInstance: '_execPcbInstance',
  componentPropertyBlock: '_execPropertyBlock',
  next: '_execNext',
  test: '_execTest',
  assignment: '_execAssignment',
};


Interpreter.addToWatchList = function (name, components, componentRegistry, ctx) {
    const comp = components.get(name);
    if(!comp) {
       return;
    }
    if(!componentRegistry) {
      return;
    }
    const handler = componentRegistry.get(comp.type);
    if(!handler) {
      return;
    }
    
    let winfo = {
      name,
      comp,
      handler,
      ctx
    }
    
    if(0){
            if(this.componentRegistry){
              const props = handler.getSupportedProperties();
              for(pid in props) {
                const property = props[pid];
                a = {
                  property
                };
              if(handler && handler.evalGetProperty){
                const result = handler.evalGetProperty(comp, a.property, a, ctx);
                if(result){
                  if(a.pad && result.value){
                    result.value = this.applyPad(result.value, a.pad);
                    result.ref = null;
                    result.bitWidth = result.value.length;
                  }
                  return result;
                }
             
             }
             }
            }
            throw Error(`Property ${a.property} cannot be used in expressions for component ${a.var}`);
    }
        
    watchList.push(winfo);
}

// ================= BUILTIN DOC TABLE =================
Interpreter.BUILTIN_DOC = {
  NOT:   ['NOT(Xbit) -> Xbit'],
  AND:   ['AND(Xbit) -> 1bit', 'AND(Xbit, Xbit) -> Xbit'],
  OR:    ['OR(Xbit) -> 1bit',  'OR(Xbit, Xbit) -> Xbit'],
  XOR:   ['XOR(Xbit) -> 1bit', 'XOR(Xbit, Xbit) -> Xbit'],
  NXOR:  ['NXOR(Xbit) -> 1bit', 'NXOR(Xbit, Xbit) -> Xbit'],
  NAND:  ['NAND(Xbit) -> 1bit', 'NAND(Xbit, Xbit) -> Xbit'],
  NOR:   ['NOR(Xbit) -> 1bit',  'NOR(Xbit, Xbit) -> Xbit'],
  EQ:    ['EQ(Xbit, Xbit) -> 1bit'],
  LATCH: ['LATCH(Xbit data, 1bit clock) -> Xbit'],
  LSHIFT:['LSHIFT(Xbit data, Nbit n) -> Xbit', 'LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit'],
  RSHIFT:['RSHIFT(Xbit data, Nbit n) -> Xbit', 'RSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit'],
  MUX:  ['MUX(Nbit sel, Xbit data0, Xbit data1, ..) -> Xbit'],
//  MUX2:  ['MUX(2bit sel, Xbit data0, Xbit data1, Xbit data2, Xbit data3) -> Xbit'],
//  MUX3:  ['MUX(3bit sel, Xbit data0, Xbit data1, Xbit data2, Xbit data3, Xbit data4, Xbit data5, Xbit data6, Xbit data7) -> Xbit'],
  DEMUX:['DEMUX(Nbit sel, Xbit data) -> Xbit, Xbit, ..'],
//  DEMUX2:['DEMUX(2bit sel, Xbit data) -> Xbit, Xbit, Xbit, Xbit'],
//  DEMUX3:['DEMUX(3bit sel, Xbit data) -> Xbit, Xbit, Xbit, Xbit, Xbit, Xbit, Xbit, Xbit'],
  ADD:      ['ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry'],
  SUBTRACT: ['SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry'],
  MULTIPLY: ['MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over'],
  DIVIDE:   ['DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod'],
};

Interpreter.getDocLines = function(name, alias,  funcs, registry, pcbDefinitions) {
  // ---- doc(def) — list all built-in functions and user-defined functions ----
  if (name === 'def') {
    const builtinNames = Object.keys(Interpreter.BUILTIN_DOC);
    // Include REGn, MUXn, DEMUXn patterns as representative examples
    const extraBuiltins = ['REG<N>', 'MUX1', 'MUX2', 'MUX3', 'DEMUX1', 'DEMUX2', 'DEMUX3'];
    // Filter out MUX/DEMUX already in BUILTIN_DOC to avoid duplicates
    const allBuiltins = builtinNames.concat(
      extraBuiltins.filter(x => !builtinNames.includes(x))
    );
    const lines = ['built-in:'];
    
    for (let i = 0; i < allBuiltins.length; i += 4) {
      chunk = allBuiltins.slice(i, i + 4);
      lines.push(chunk.join(', '));
    }

    lines.push('');
    lines.push('user defined:');
    if (funcs && funcs.size > 0) {
      lines.push([...funcs.keys()].join(', '));
    } else {
      lines.push('(none)');
    }
    return lines;
  }

  // ---- doc(comp) — list all builtin component types ----
  if (name === 'comp') {
    if (!registry) return ['(no component registry available)'];
    const allTypes = registry.getAllTypes ? registry.getAllTypes() : [];
    const shortnames = registry.getShortnames ? registry.getShortnames() : {};
    // build reverse map: canonicalType -> [shortkey, ...]
    const reverseShort = {};
    for (const [sk, canonical] of Object.entries(shortnames)) {
      if (!reverseShort[canonical]) reverseShort[canonical] = [];
      reverseShort[canonical].push(sk);
    }
    const lines = allTypes.map(type => {
      const keys = reverseShort[type] || [];
      let line = `comp.${type}`;
      if (keys.length > 0) line += ', ' + keys.map(k => `comp.${k}`).join(', ');
      return line;
    });
    return lines.length > 0 ? lines : ['(no components registered)'];
  }

  // ---- doc(comp.type) or doc(comp.shortname) ----
  if (name.startsWith('comp.')) {
    if (!registry) return [`${name}: (no component registry available)`];
    const typeName = name.slice(5);
    // resolve shortname → canonical type via getShortnames
    let canonicalType = typeName;
    if (!registry.has(typeName)) {
      const shortnames = registry.getShortnames ? registry.getShortnames() : {};
      if (shortnames[typeName]) canonicalType = shortnames[typeName];
    }
    const handler = registry.get(canonicalType);
    if (!handler) return [`${name}: tip de componentă nedefinit`];
    const def = handler.getDef ? handler.getDef() : null;
    if (!def) return [`comp.${canonicalType}: (no doc available)`];
    return Interpreter.formatCompDef(alias, canonicalType, def);
  }

  // ---- doc(pcb) — list all user-defined PCB types ----
  if (name === 'pcb') {
    if (!pcbDefinitions || pcbDefinitions.size === 0) return ['(no PCB types defined)'];
    return [...pcbDefinitions.keys()].map(k => `pcb.${k}`);
  }

  // ---- doc(pcb.type) ----
  if (name.startsWith('pcb.')) {
    const pcbName = name.slice(4);
    if (!pcbDefinitions || !pcbDefinitions.has(pcbName)) return [`${name}: tip PCB nedefinit`];
    const def = pcbDefinitions.get(pcbName);
    return Interpreter.formatPcbDef(alias, pcbName, def);
  }

  // ---- Static builtin function table ----
  if (Interpreter.BUILTIN_DOC[name]) {
    return Interpreter.BUILTIN_DOC[name];
  }

  // ---- REGn pattern (e.g. REG4, REG8, REG16) ----
  if (/^REG\d+$/.test(name)) {
    const n = name.slice(3);
    return [`${name}(${n}bit data, 1bit clock, 1bit clear) -> ${n}bit`];
  }

  // ---- MUXn pattern (e.g. MUX1, MUX2, MUX3) ----
  /*if (/^MUX(\d+)$/.test(name)) {
    const n = parseInt(name.slice(3), 10);
    const inputs = 1 << n;
    const dataParams = Array.from({length: inputs}, (_, i) => `Xbit data${i}`).join(', ');
    return [`${name}(${n}bit sel, ${dataParams}) -> Xbit`];
  }

  // ---- DEMUXn pattern (e.g. DEMUX1, DEMUX2, DEMUX3) ----
  if (/^DEMUX(\d+)$/.test(name)) {
    const n = parseInt(name.slice(5), 10);
    const outputs = 1 << n;
    const retStr = Array.from({length: outputs}, () => 'Xbit').join(', ');
    return [`${name}(${n}bit sel, Xbit data) -> ${retStr}`];
  }*/

  // ---- User-defined functions ----
  if (funcs && funcs.has(name)) {
    const f = funcs.get(name);
    const paramStr = f.params.map(p => `${p.type} ${p.id}`).join(', ');
    const sig = `${name}(${paramStr})`;
    if (f.returns && f.returns.length > 0) {
      const retStr = f.returns.map(r => r.type).join(', ');
      return [`${sig} -> ${retStr}`];
    }
    return [sig];
  }

  return [`${name}: funcție nedefinită`];
};

Interpreter.formatCompDef = function(alias, type, def) {
  const lines = [];
  lines.push(`comp [${type}] ${alias}:`);
  for (const attr of def.attrs) {
    if (attr.value === null) {
      lines.push(`  ${attr.name}`);
    } else {
      lines.push(`  ${attr.name}: ${attr.value}`);
    }
  }
  if (def.initValue !== null) {
    lines.push(`  = ${def.initValue}`);
  }
  lines.push('  :{');
  for (const pin of def.pins) {
    lines.push(`    ${pin.bits}pin ${pin.name}`);
  }
  for (const pout of def.pouts) {
    lines.push(`    ${pout.bits}pout ${pout.name}`);
  }
  lines.push('  }');
  if (def.returns !== null) {
    lines.push(`  -> ${def.returns}`);
  }
  return lines;
};

Interpreter.formatPcbDef = function(alias, name, def) {
  const lines = [];
  lines.push(`pcb [${name}] ${alias}:`);
  if (def.exec) lines.push(`  exec: ${def.exec}`);
  lines.push(`  on: raise/edge/1/0`);
  lines.push('  :{');
  for (const pin of (def.pins || [])) {
    lines.push(`    ${pin.bits}pin ${pin.name}`);
  }
  for (const pout of (def.pouts || [])) {
    lines.push(`    ${pout.bits}pout ${pout.name}`);
  }
  lines.push('  }');
  if (def.returnSpec) {
    lines.push(`  -> ${def.returnSpec.bits}bit`);
  }
  return lines;
};