/* ================= SIGNAL PROPAGATION ================= */
/* Extracted from interpreter.js — dependency analysis and signal propagation logic */

Interpreter.prototype.exprReferencesComponent = function(expr, compName, compRef){
  if(!expr) return false;
  
  // Check if expression is a simple variable reference
  if(expr.length === 1){
    const atom = expr[0];
    if(atom.var === compName){
      return true;
    }
    // Check if it's a component property access (e.g., .mem:get)
    // For component properties, atom.var is the component name (e.g., .mem) and atom.property is the property name (e.g., get)
    if(atom.var && atom.var.startsWith('.') && atom.var === compName){
      return true;
    }
    // Check if it references the component's ref
    if(atom.ref && compRef && atom.ref === compRef){
      return true;
    }
    // Check if it's a function call - recursively check arguments
    if(atom.call){
      for(const argExpr of atom.args){
        if(this.exprReferencesComponent(argExpr, compName, compRef)){
          return true;
        }
      }
    }
  }
  
  // Check all atoms in the expression
  for(const atom of expr){
    if(atom.var === compName){
      return true;
    }
    // Check if atom is a component property access (e.g., .mem:get)
    // For component properties, atom.var is the component name and atom.property is the property name
    if(atom.var && atom.var.startsWith('.') && atom.var === compName){
      return true;
    }
    // Check if atom references the component's ref
    if(atom.ref && compRef && atom.ref === compRef){
      return true;
    }
    // Check if atom references the component's ref as part of a complex reference
    if(atom.ref && compRef && atom.ref.includes(compRef)){
      return true;
    }
    // Check if it's a function call - recursively check arguments
    if(atom.call){
      for(const argExpr of atom.args){
        if(this.exprReferencesComponent(argExpr, compName, compRef)){
          return true;
        }
      }
    }
  }
  
  return false;
};

Interpreter.prototype.exprReferencesWire = function(expr, wireName){
  if(!expr || !Array.isArray(expr)) return false;
  
  for(const atom of expr){
    // Check if atom directly references the wire
    if(atom.var === wireName && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$'){
      return true;
    }
    
    // Check if it's a function call - recursively check arguments
    if(atom.call){
      for(const argExpr of atom.args){
        if(this.exprReferencesWire(argExpr, wireName)){
          return true;
        }
      }
    }
    
    // Check if it's a user-defined function call - recursively check arguments
    if(atom.func && atom.args){
      for(const argExpr of atom.args){
        if(Array.isArray(argExpr) && this.exprReferencesWire(argExpr, wireName)){
          return true;
        }
      }
    }
  }
  
  return false;
};

Interpreter.prototype.updateComponentConnections = function(compName, _visited = null){
  // Update all components and wires connected to this component
  if(!_visited) _visited = new Set();
  if(_visited.has(compName)) return;
  _visited.add(compName);

  // If no pending map exists, this is a top-level entry point (e.g. from key.onPress).
  // Create one so all blocks triggered during this call are collected and executed
  // in program order (blockIndex) at the end, not immediately out of order.
  const isUccTopLevel = !this._uccPendingBlocks;
  if(isUccTopLevel){
    this._uccPendingBlocks = new Map();
  }

  const comp = this.components.get(compName);
  if(!comp){
    if(isUccTopLevel) this._uccPendingBlocks = null;
    return;
  }
  
  // Get component value if ref exists
  let value = null;
  if(comp.ref){
    value = this.getValueFromRef(comp.ref);
  }
  // Note: Even if component has no ref (like mem), we still need to update wires that reference it
  // So we continue execution even if comp.ref is null
  
  // Update all components that are connected to this one
  if(comp.ref && value !== null){
    for(const [name, conn] of this.componentConnections.entries()){
      if(typeof conn.source === 'string'){
        // Check if connection references this component's ref
        if(conn.source === comp.ref || conn.source.includes(comp.ref)){
          const connValue = this.getValueFromRef(conn.source);
          if(connValue !== null){
            this.updateComponentValue(name, connValue, conn.bitRange);
          }
        }
      } else if(typeof conn.source === 'object'){
        // Expression reference - check if it references this component
        if(conn.source.var === compName){
          this.updateComponentValue(name, value, conn.bitRange);
        }
      }
      // Also check if connection has an expr property that references this component
      if(conn.expr && this.exprReferencesComponent(conn.expr, compName, comp.ref)){
        // Re-evaluate the connection expression
        try {
          const exprResult = this.evalExpr(conn.expr, false);
          const connComp = this.components.get(name);
          const bits = this.getComponentBits(connComp.type, connComp.attributes);
          const ref = this.buildRefFromParts(exprResult, bits, 0);
          if(ref && ref !== '&-'){
            const connValue = this.getValueFromRef(ref);
            if(connValue !== null){
              this.updateComponentValue(name, connValue, conn.bitRange);
            }
          }
        } catch(e){
          // Ignore errors during update
        }
      }
    }
  }
  
  // Track components whose inputs were modified (for cascading updates)
  const _affectedComponents = new Set();

  // Check pending component properties that reference this component
  for(const [propCompName, pending] of this.componentPendingProperties.entries()){
    const propComp = this.components.get(propCompName);
    const setWhen = this.componentPendingSet.get(propCompName);
    
    // First, check if this component has a constant set=1 block with no dependencies
    // If it does, skip re-applying properties when the component itself changes
    // (because constant blocks should only execute during initial RUN())
    let hasConstantSetBlock = false;
    for(const block of this.componentPropertyBlocks){
      if(block.component !== propCompName || !block.setExpr) continue;
      if(block.setExpr.length === 1){
        const atom = block.setExpr[0];
        if((atom.bin === '1') || (atom.hex === '1') || (atom.dec === '1')){
          const hasWireDep = block.wireDependencies && block.wireDependencies.size > 0;
          const hasDep = block.dependencies && block.dependencies.size > 0;
          const setExprRefsComp = block.setExpr && this.exprReferencesComponent(block.setExpr, compName, comp.ref);
          if(!hasWireDep && !hasDep && !setExprRefsComp){
            hasConstantSetBlock = true;
            break;
          }
        }
      }
    }
    
    // If component has a constant block and the changed component is the same as propCompName,
    // skip re-applying (constant blocks should only execute during RUN())
    if(hasConstantSetBlock && compName === propCompName){
      continue; // Skip all properties for this component
    }
    
    // Check each property
    for(const [propName, propData] of Object.entries(pending)){
      if(propData.expr && this.exprReferencesComponent(propData.expr, compName, comp.ref)){
        // This property references the changed component
        
        // For adder, .a and .b properties are applied immediately (not through applyComponentProperties)
        if(propComp && propComp.type === 'adder' && (propName === 'a' || propName === 'b')){
          // Re-evaluate and re-apply immediately
          const exprResult = this.evalExpr(propData.expr, false);
          let value = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              value += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) value += val;
            }
          }
          
          // Update pending value
          propData.value = value;
          
          // Apply immediately
          const adderId = propComp.deviceIds[0];
          const depth = propComp.attributes['depth'] !== undefined ? parseInt(propComp.attributes['depth'], 10) : 4;
          
          // Ensure value has correct length
          let binValue = value;
          if(binValue.length < depth){
            binValue = binValue.padStart(depth, '0');
          } else if(binValue.length > depth){
            binValue = binValue.substring(0, depth);
          }
          
          // Apply immediately
          if(propName === 'a' && typeof setAdderA === 'function'){
            setAdderA(adderId, binValue);
          } else if(propName === 'b' && typeof setAdderB === 'function'){
            setAdderB(adderId, binValue);
          }
          _affectedComponents.add(propCompName);
        } else if(propComp && propComp.type === 'subtract' && (propName === 'a' || propName === 'b')){
          // For subtract, .a and .b properties are applied immediately (not through applyComponentProperties)
          // Re-evaluate and re-apply immediately
          const exprResult = this.evalExpr(propData.expr, false);
          let value = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              value += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) value += val;
            }
          }
          
          // Update pending value
          propData.value = value;
          
          // Apply immediately
          const subtractId = propComp.deviceIds[0];
          const depth = propComp.attributes['depth'] !== undefined ? parseInt(propComp.attributes['depth'], 10) : 4;
          
          // Ensure value has correct length
          let binValue = value;
          if(binValue.length < depth){
            binValue = binValue.padStart(depth, '0');
          } else if(binValue.length > depth){
            binValue = binValue.substring(0, depth);
          }
          
          // Apply immediately
          if(propName === 'a' && typeof setSubtractA === 'function'){
            setSubtractA(subtractId, binValue);
          } else if(propName === 'b' && typeof setSubtractB === 'function'){
            setSubtractB(subtractId, binValue);
          }
          _affectedComponents.add(propCompName);
        } else if(propComp && propComp.type === 'divider' && (propName === 'a' || propName === 'b')){
          // For divider, .a and .b properties are applied immediately (not through applyComponentProperties)
          // Re-evaluate and re-apply immediately
          const exprResult = this.evalExpr(propData.expr, false);
          let value = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              value += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) value += val;
            }
          }
          
          // Update pending value
          propData.value = value;
          
          // Apply immediately
          const dividerId = propComp.deviceIds[0];
          const depth = propComp.attributes['depth'] !== undefined ? parseInt(propComp.attributes['depth'], 10) : 4;
          
          // Ensure value has correct length
          let binValue = value;
          if(binValue.length < depth){
            binValue = binValue.padStart(depth, '0');
          } else if(binValue.length > depth){
            binValue = binValue.substring(0, depth);
          }
          
          // Apply immediately
          if(propName === 'a' && typeof setDividerA === 'function'){
            setDividerA(dividerId, binValue);
          } else if(propName === 'b' && typeof setDividerB === 'function'){
            setDividerB(dividerId, binValue);
          }
          _affectedComponents.add(propCompName);
        } else if(propComp && propComp.type === 'multiplier' && (propName === 'a' || propName === 'b')){
          // For multiplier, .a and .b properties are applied immediately (not through applyComponentProperties)
          // Re-evaluate and re-apply immediately
          const exprResult = this.evalExpr(propData.expr, false);
          let value = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              value += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) value += val;
            }
          }
          
          // Update pending value
          propData.value = value;
          
          // Apply immediately
          const multiplierId = propComp.deviceIds[0];
          const depth = propComp.attributes['depth'] !== undefined ? parseInt(propComp.attributes['depth'], 10) : 4;
          
          // Ensure value has correct length
          let binValue = value;
          if(binValue.length < depth){
            binValue = binValue.padStart(depth, '0');
          } else if(binValue.length > depth){
            binValue = binValue.substring(0, depth);
          }
          
          // Apply immediately
          if(propName === 'a' && typeof setMultiplierA === 'function'){
            setMultiplierA(multiplierId, binValue);
          } else if(propName === 'b' && typeof setMultiplierB === 'function'){
            setMultiplierB(multiplierId, binValue);
          }
          _affectedComponents.add(propCompName);
        } else if(propComp && propComp.type === 'shifter' && (propName === 'value' || propName === 'dir' || propName === 'in')){
          // For shifter, .value, .dir, and .in properties are applied immediately (not through applyComponentProperties)
          // Re-evaluate and re-apply immediately
          const exprResult = this.evalExpr(propData.expr, false);
          let value = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              value += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) value += val;
            }
          }
          
          // Update pending value
          propData.value = value;
          
          // Apply immediately
          const shifterId = propComp.deviceIds[0];
          const depth = propComp.attributes['depth'] !== undefined ? parseInt(propComp.attributes['depth'], 10) : 4;
          
          if(propName === 'value'){
            // Ensure value has correct length
            let binValue = value;
            if(binValue.length < depth){
              binValue = binValue.padStart(depth, '0');
            } else if(binValue.length > depth){
              binValue = binValue.substring(0, depth);
            }
            
            // Apply immediately
            if(typeof setShifterValue === 'function'){
              setShifterValue(shifterId, binValue);
            }
          } else if(propName === 'dir'){
            // Direction: 1 = right, 0 = left
            const dirValue = parseInt(value, 2);
            if(typeof setShifterDir === 'function'){
              setShifterDir(shifterId, dirValue);
            }
          } else if(propName === 'in'){
            // Input bit: '0' or '1'
            const inValue = value.length > 0 ? value[value.length - 1] : '0'; // Take last bit if multiple bits
            if(typeof setShifterIn === 'function'){
              setShifterIn(shifterId, inValue);
            }
          }
          _affectedComponents.add(propCompName);
        } else {
          // For other components, use the standard apply mechanism
          // BUT: Skip if this component has a property block with a setExpr that directly references
          // the changed component - those are handled separately by the componentPropertyBlocks loop
          // to properly handle on: mode (raise/edge/1)
          const hasPropertyBlockWithSetExpr = this.componentPropertyBlocks.some(
            block => block.component === propCompName && block.setExpr && block.setExprDirectRef
          );

          // Check if the property that's changing (propName) comes from a constant set=1 block with no dependencies
          // These blocks should only execute during initial RUN(), not when components change
          // We check if there's a constant block that contains this property
          let propComesFromConstantBlock = false;
          for(const block of this.componentPropertyBlocks){
            if(block.component !== propCompName || !block.setExpr) continue;
            if(block.setExpr.length === 1){
              const atom = block.setExpr[0];
              // Check if it's a constant value (bin, hex, or dec with value '1')
              if((atom.bin === '1') || (atom.hex === '1') || (atom.dec === '1')){
                // Check if it has no dependencies
                const hasWireDep = block.wireDependencies && block.wireDependencies.size > 0;
                const hasDep = block.dependencies && block.dependencies.size > 0;
                const setExprRefsComp = block.setExpr && this.exprReferencesComponent(block.setExpr, compName, comp.ref);
                // If no dependencies at all, check if this property is in this block
                if(!hasWireDep && !hasDep && !setExprRefsComp){
                  // Check if this property exists in this block
                  const blockHasProp = block.properties.some(p => p.property === propName);
                  if(blockHasProp){
                    propComesFromConstantBlock = true;
                    break;
                  }
                }
              }
            }
          }

          if(hasPropertyBlockWithSetExpr){
            // Skip - will be handled by componentPropertyBlocks loop
            // Just update the pending property value for when the block executes
            const exprResult = this.evalExpr(propData.expr, false);
            let value = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                value += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) value += val;
              }
            }
            propData.value = value;
          } else if(propComesFromConstantBlock){
            // Skip - this property comes from a constant set=1 block with no dependencies
            // These blocks should only execute during initial RUN(), not when components change
            // Just update the pending property value (in case it references the changed component)
            const exprResult = this.evalExpr(propData.expr, false);
            let value = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                value += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) value += val;
              }
            }
            propData.value = value;
          } else if(setWhen === 'immediate' || setWhen === undefined){
            // Check if this block was just executed - if so, skip to avoid re-execution
            if(this.justExecutedBlocks){
              // Find all blocks for this component that include this property
              let blockWasJustExecuted = false;
              for(const block of this.componentPropertyBlocks){
                if(block.component === propCompName){
                  const blockHasProp = block.properties.some(p => p.property === propName);
                  if(blockHasProp){
                    const blockKey = `${block.component}:${block.blockIndex}`;
                    if(this.justExecutedBlocks.has(blockKey)){
                      blockWasJustExecuted = true;
                      break;
                    }
                  }
                }
              }
              if(!blockWasJustExecuted){
                // Apply immediately
                this.applyComponentProperties(propCompName, 'immediate', true);
                _affectedComponents.add(propCompName);
              }
            } else {
              // No tracking active, apply immediately as normal
              this.applyComponentProperties(propCompName, 'immediate', true);
              _affectedComponents.add(propCompName);
            }
          } else if(setWhen === 'next'){
            // Mark for next iteration (already marked, but don't apply now)
            // Will be applied in NEXT
          }
        }
      }
    }
  }
  
  // Also update wires that reference this component
  // Re-execute wire statements that might depend on this component
//  console.log(`[DEBUG updateCompConn] ${compName}: scanning ${this.wireStatements.length} wireStatements`);
  for(const ws of this.wireStatements){
    // Handle assignment statements: name = expr
    if(ws.assignment){
      const wireName = ws.assignment.target.var;
      const wire = this.wires.get(wireName);
      if(wire && wire.ref){
        // Check if wire expression references this component
        const references = this.exprReferencesComponent(ws.assignment.expr, compName, comp.ref);
        // console.log(`[DEBUG updateCompConn] assignment wire '${wireName}' refs '${compName}'? ${references}`);
        if(references){
          // Re-evaluate the expression
          try {
            const exprResult = this.evalExpr(ws.assignment.expr, false);
            const bits = this.getBitWidth(wire.type);
            let wireValue = '';
            for(const part of exprResult){
              if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) wireValue += val;
              } else if(part.value){
                wireValue += part.value;
              }
            }
            if(wireValue.length < bits){
              wireValue = wireValue.padEnd(bits, '0');
            } else if(wireValue.length > bits){
              wireValue = wireValue.substring(0, bits);
            }
            
            // Update wire storage
            const refMatch = wire.ref.match(/^&(\d+)/);
            if(refMatch){
              const storageIdx = parseInt(refMatch[1]);
              const stored = this.storage.find(s => s.index === storageIdx);
              if(stored){
                const oldValue = stored.value;
                // console.log(`[DEBUG updateCompConn] wire '${wireName}' oldValue=${oldValue} newValue=${wireValue}`);
                if(oldValue !== wireValue){
                  stored.value = wireValue;
                  // Update connected components only if value changed
                  this.updateConnectedComponents(wireName, wireValue);
                }
              }
            }
          } catch(e){
            // console.log(`[DEBUG updateCompConn] ERROR updating assignment wire '${wireName}':`, e.message);
          }
        }
      }
    }
    // Handle declaration statements with assignment: type name = expr
    else if(ws.decls && ws.expr){
      // Check each declared wire
      for(const decl of ws.decls){
        if(this.isWire(decl.type)){
          const wireName = decl.name;
          const wire = this.wires.get(wireName);
          if(wire){
            // Check if wire expression references this component
            const references = this.exprReferencesComponent(ws.expr, compName, comp.ref);
            // console.log(`[DEBUG updateCompConn] decl wire '${wireName}' refs '${compName}'? ${references}`);
            if(references){
              // Re-evaluate the expression and update the wire
              try {
                const exprResult = this.evalExpr(ws.expr, false);
                const bits = this.getBitWidth(wire.type);
                
                // Find the bit offset for this wire in the declaration
                let bitOffset = 0;
                for(const d of ws.decls){
                  if(d.name === wireName) break;
                  const dBits = this.getBitWidth(d.type);
                  bitOffset += dBits;
                }
                
                // Build reference from expression parts, starting at bitOffset
                const wireRef = this.buildRefFromParts(exprResult, bits, bitOffset);
                
                // Compute the actual value from the reference
                // For component properties like .mem:get, wireRef might be null but part.value contains the value
                let wireValue = '';
                if(wireRef && wireRef !== '&-'){
                  wireValue = this.getValueFromRef(wireRef) || '0'.repeat(bits);
                } else {
                  // No ref - get value directly from expression parts
                  for(const part of exprResult){
                    if(part.value && part.value !== '-'){
                      wireValue += part.value;
                    } else if(part.ref && part.ref !== '&-'){
                      const val = this.getValueFromRef(part.ref);
                      if(val) wireValue += val;
                    }
                  }
                  if(wireValue.length < bits){
                    wireValue = wireValue.padEnd(bits, '0');
                  } else if(wireValue.length > bits){
                    wireValue = wireValue.substring(0, bits);
                  }
                }
                
                // Update wire storage
                if(wire.ref){
                  const refMatch = wire.ref.match(/^&(\d+)/);
                  if(refMatch){
                    const storageIdx = parseInt(refMatch[1]);
                    const stored = this.storage.find(s => s.index === storageIdx);
                    if(stored){
                      const oldValue = stored.value;
                      // console.log(`[DEBUG updateCompConn] decl wire '${wireName}' oldValue=${oldValue} newValue=${wireValue}`);
                      if(oldValue !== wireValue){
                        stored.value = wireValue;
                        // Update connected components only if value changed
                        this.updateConnectedComponents(wireName, wireValue);
                      } else {
                        // console.log(`[DEBUG updateCompConn] decl wire '${wireName}' value unchanged (${oldValue}), skipping cascade`);
                      }
                    }
                  }
                } else {
                  // Wire has no ref yet - create storage and set ref
                  const storageIdx = this.storeValue(wireValue);
                  wire.ref = `&${storageIdx}`;
                  // Also update wireStorageMap for NEXT support
                  if(!this.wireStorageMap.has(wireName)){
                    this.wireStorageMap.set(wireName, storageIdx);
                  }
                  // Update connected components (new wire, always trigger)
                  this.updateConnectedComponents(wireName, wireValue);
                }
              } catch(e){
                // console.log(`[DEBUG updateCompConn] ERROR updating decl wire '${wireName}':`, e.message);
              }
            }
          }
        }
      }
    }
  }
  
  // Check wire-triggered property blocks for rising edge
  // This happens AFTER wires have been updated above
  // BUT: Skip blocks that were already executed in updateConnectedComponents
  // to avoid double execution
  const executedBlocks = new Set();
  // Note: Blocks executed in updateConnectedComponents are tracked there, not here
  // So we need to be careful not to execute them again
  for(const block of this.componentPropertyBlocks){
    if(block.setExpr && block.setExprDirectRef){
      // Skip if set expression is ~ (handled separately)
      if(block.setExpr.length === 1 && block.setExpr[0] && block.setExpr[0].var === '~'){
        continue;
      }
      
      // Skip if this block was already executed in updateConnectedComponents
      // We can identify blocks by their component and properties
      const blockKey = `${block.component}:${block.blockIndex}`;
      if(executedBlocks.has(blockKey)){
        continue;
      }
      
      // Only check this block if its setExpr directly references the changed component
      // SKIP blocks with wire triggers - they will be handled in updateConnectedComponents when the wire changes
      let shouldCheckBlock = false;
      
      // Check if this block's setExpr directly references the changed component
      if(block.setExprDirectRef.type === 'component'){
        // Direct component match
        if(block.setExprDirectRef.name === compName){
          shouldCheckBlock = true;
        }
      } else if(block.setExprDirectRef.type === 'wire'){
        // SKIP: Wire-triggered blocks will be handled in updateConnectedComponents
        // when the wire itself changes. This avoids double execution.
        continue;
      }
      
      if(!shouldCheckBlock){
        continue; // Skip this block - its trigger didn't change
      }
      
      // Save old value before re-evaluating
      const oldSetValue = block.lastSetValue;
      
      // Re-evaluate the set expression
      const exprResult = this.evalExpr(block.setExpr, false);
      let newSetValue = '';
      for(const part of exprResult){
        // Prefer value over ref (value is more up-to-date)
        if(part.value !== undefined && part.value !== null && part.value !== '-'){
          newSetValue += part.value;
        } else if(part.ref && part.ref !== '&-'){
          const val = this.getValueFromRef(part.ref);
          if(val && val !== '-' && val !== null){
            newSetValue += val;
          }
        }
      }
      // If no value was found, default to '0'
      if(newSetValue === ''){
        newSetValue = '0';
      }
      
      // Get last bit of new and previous values
      const newBit = newSetValue.length > 0 ? newSetValue[newSetValue.length - 1] : '0';
      // Ensure oldSetValue is not null/undefined - use '0' as default
      const prevSetValue = oldSetValue || '0';
      const prevBit = prevSetValue.length > 0 ? prevSetValue[prevSetValue.length - 1] : '0';
      
      // Determine if we should execute based on onMode
      let shouldExecute = false;
      const onMode = block.onMode || 'raise';
      
      if(onMode === 'raise' || onMode === 'rising'){
        shouldExecute = (prevBit === '0' && newBit === '1');
      } else if(onMode === 'edge' || onMode === 'falling'){
        shouldExecute = (prevBit === '1' && newBit === '0');
      } else if(onMode === '1' || onMode === 'level'){
        // Level triggered: execute when set is 1 AND value has changed
        shouldExecute = (newBit === '1') && (newSetValue !== prevSetValue);
      }

      if(shouldExecute){
        const blockKey = `${block.component}:${block.blockIndex}`;
        executedBlocks.add(blockKey);
        
        this.executePropertyBlock(block.component, block.properties, true, block);
        
        // After executing property block, update connections for the component itself
        // This ensures wires that reference the component (like b = .mem:get) are updated
        this.updateComponentConnections(block.component, _visited);
        
        // Update UI after executing property block
        if(typeof showVars === 'function'){
          showVars();
        }
      }
      
      // Always update lastSetValue (even if block didn't execute)
      block.lastSetValue = newSetValue;
    }
  }
  
  // Check property blocks that have dependencies on the changed component
  // This handles cases where a block has dependencies (like a = .as) but setExprDirectRef is null or constant
  for(const block of this.componentPropertyBlocks){
    // Skip blocks that were already checked above (they have setExprDirectRef)
    if(block.setExpr && block.setExprDirectRef){
      continue;
    }
    
    // Skip if this block was already executed
    const blockKey = `${block.component}:${block.blockIndex}`;
    if(executedBlocks.has(blockKey)){
      continue;
    }
    
    // Check if this block has dependencies that include the changed component
    let hasDependency = false;
    if(block.dependencies && block.dependencies.has(compName)){
      hasDependency = true;
    }
    
    // Also check wire dependencies
    if(!hasDependency && block.wireDependencies){
      // Check if any wire dependency depends on the changed component
      for(const wireName of block.wireDependencies){
        const wire = this.wires.get(wireName);
        if(wire && wire.ref){
          const ws = this.wireStatements.find(ws => {
            if(ws.assignment) return ws.assignment.target.var === wireName;
            if(ws.decls) return ws.decls.some(d => d.name === wireName);
            return false;
          });
          if(ws){
            const expr = ws.assignment ? ws.assignment.expr : ws.expr;
            if(expr && this.exprReferencesComponent(expr, compName, comp.ref)){
              hasDependency = true;
              break;
            }
          }
        }
      }
    }
    
    if(!hasDependency){
      continue; // Skip this block - it doesn't depend on the changed component
    }
    
    // For blocks with dependencies, check if component has on:1 (level triggered)
    // If on:1, execute the block when set is 1 AND the value has changed
    const onMode = block.onMode || 'raise';
    if(onMode === '1' || onMode === 'level'){
      // Save old value before re-evaluating
      const oldSetValue = block.lastSetValue;

      // Re-evaluate the set expression to check if it's 1
      let setValue = '0';
      if(block.setExpr){
        const exprResult = this.evalExpr(block.setExpr, false);
        setValue = '';
        for(const part of exprResult){
          if(part.value !== undefined && part.value !== null && part.value !== '-'){
            setValue += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val && val !== '-' && val !== null){
              setValue += val;
            }
          }
        }
        if(setValue === ''){
          setValue = '0';
        }
      }
      
      const setBit = setValue.length > 0 ? setValue[setValue.length - 1] : '0';
      const prevSetValue = oldSetValue || '0';
      const prevBit = prevSetValue.length > 0 ? prevSetValue[prevSetValue.length - 1] : '0';

      // Only execute if value is 1 AND it has changed (or this is the first run)
      const valueChanged = (setValue !== prevSetValue);

      if(setBit === '1' && valueChanged){
        const blockKey = `${block.component}:${block.blockIndex}`;

        // Check if this block was just executed in updateConnectedComponents
        if(this.justExecutedBlocks && this.justExecutedBlocks.has(blockKey)){
          // Still update lastSetValue even if we skip execution
          block.lastSetValue = setValue;
          continue;
        }
        
        if(!executedBlocks.has(blockKey)){
          executedBlocks.add(blockKey);
          
          // If a top-level updateConnectedComponents is active, defer to pending
          // so all blocks execute together in blockIndex (program) order.
          if(this._uccPendingBlocks){
            this._uccPendingBlocks.set(block.blockIndex, block);
          } else {
            // Execute the block immediately (no active top-level cascade)
            this.executePropertyBlock(block.component, block.properties, true, block);
            if(typeof showVars === 'function'){
              showVars();
            }
          }
        }
      }

      // Always update lastSetValue (even if block didn't execute)
      block.lastSetValue = setValue;
    }
  }

  // Cascade: propagate updates to components whose inputs were modified
  for(const affectedName of _affectedComponents){
    this.updateComponentConnections(affectedName, _visited);
  }

  // TOP-LEVEL ONLY: execute all pending blocks in program order
  if(isUccTopLevel && this._uccPendingBlocks){
    const executedBlockKeys = new Set();
    const seenComponents = new Set();
    const executedComponents = [];

    while(this._uccPendingBlocks && this._uccPendingBlocks.size > 0){
      const pendingBlocks = this._uccPendingBlocks;
      this._uccPendingBlocks = new Map();

      const sortedPending = [...pendingBlocks.values()]
        .sort((a, b) => a.blockIndex - b.blockIndex);

      for(const block of sortedPending){
        const blockKey = `${block.component}:${block.blockIndex}`;
        if(!executedBlockKeys.has(blockKey)){
          executedBlockKeys.add(blockKey);
          this.executePropertyBlock(block.component, block.properties, true, block);
          // Update lastSetValue after execution so next trigger sees correct previous state
          if(block.setExpr){
            const res = this.evalExpr(block.setExpr, false);
            let sv = '';
            for(const p of res){
              if(p.value !== undefined && p.value !== null && p.value !== '-') sv += p.value;
              else if(p.ref && p.ref !== '&-'){ const v = this.getValueFromRef(p.ref); if(v) sv += v; }
            }
            block.lastSetValue = sv || '0';
          }
          if(!seenComponents.has(block.component)){
            seenComponents.add(block.component);
            executedComponents.push(block.component);
          }
        }
      }
    }

    this._uccPendingBlocks = null;

    if(executedBlockKeys.size > 0){
      if(!this.justExecutedBlocks) this.justExecutedBlocks = new Set();
      for(const key of executedBlockKeys) this.justExecutedBlocks.add(key);
      for(const compName of executedComponents) this.updateComponentConnections(compName);
      this.justExecutedBlocks = null;
      if(typeof showVars === 'function') showVars();
    }
  }
};

// Collect all component and wire dependencies from an expression
Interpreter.prototype.collectExprDependencies = function(expr, deps, wireDeps = null){
  if(!expr || !Array.isArray(expr)) return;
  
  for(const atom of expr){
    if(atom.var && atom.var.startsWith('.')){
      // Extract component name (without property)
      const compName = atom.var.split(':')[0];
      deps.add(compName);
    } else if(atom.var && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$' && wireDeps){
      // Wire variable (not component, not ~, %, or $)
      wireDeps.add(atom.var);
    }
    
    // Also check nested expressions in function calls (like MUX)
    if(atom.func && atom.args){
      for(const arg of atom.args){
        if(Array.isArray(arg)){
          this.collectExprDependencies(arg, deps, wireDeps);
        }
      }
    }
    
    // Also check user-defined function calls (atom.call)
    if(atom.call && atom.args){
      for(const arg of atom.args){
        if(Array.isArray(arg)){
          this.collectExprDependencies(arg, deps, wireDeps);
        }
      }
    }
  }
};

// Check if an expression depends on ~ (directly or indirectly through wires)
Interpreter.prototype.exprDependsOnTilde = function(expr, visitedWires = new Set()){
  if(!expr || !Array.isArray(expr)) return false;
  
  for(const atom of expr){
    // Direct reference to ~
    if(atom.var === '~'){
      return true;
    }
    
    // Check if wire depends on ~
    if(atom.var && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$'){
      // Avoid infinite recursion by tracking visited wires
      if(visitedWires.has(atom.var)){
        return false; // Already checked this wire, assume it doesn't depend on ~ to avoid cycles
      }
      
      const wire = this.wires.get(atom.var);
      if(wire){
        // Check wire's expression for ~ dependency
        const ws = this.wireStatements.find(ws => {
          if(ws.assignment) return ws.assignment.target.var === atom.var;
          if(ws.decls) return ws.decls.some(d => d.name === atom.var);
          return false;
        });
        if(ws){
          const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
          if(wireExpr){
            visitedWires.add(atom.var);
            if(this.exprDependsOnTilde(wireExpr, visitedWires)){
              return true;
            }
            visitedWires.delete(atom.var);
          }
        }
      }
    }
    
    // Check nested expressions in function calls (like MUX)
    if(atom.func && atom.args){
      for(const arg of atom.args){
        if(Array.isArray(arg)){
          if(this.exprDependsOnTilde(arg, visitedWires)){
            return true;
          }
        }
      }
    }
  }
  
  return false;
};

// Check if expression depends on special variables that change ($ and % only, NOT ~)
Interpreter.prototype.exprDependsOnSpecialVars = function(expr, visitedWires = new Set()){
  if(!expr || !Array.isArray(expr)) return false;
  
  for(const atom of expr){
    // Direct reference to special vars that change ($ = random, % = first run)
    // Note: ~ is always 1 and never changes, so we don't include it
    if(atom.var === '$' || atom.var === '%'){
      return true;
    }
    
    // Check if wire depends on special vars
    if(atom.var && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$'){
      // Avoid infinite recursion by tracking visited wires
      if(visitedWires.has(atom.var)){
        return false;
      }
      
      const wire = this.wires.get(atom.var);
      if(wire){
        const ws = this.wireStatements.find(ws => {
          if(ws.assignment) return ws.assignment.target.var === atom.var;
          if(ws.decls) return ws.decls.some(d => d.name === atom.var);
          return false;
        });
        if(ws){
          const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
          if(wireExpr){
            visitedWires.add(atom.var);
            if(this.exprDependsOnSpecialVars(wireExpr, visitedWires)){
              return true;
            }
            visitedWires.delete(atom.var);
          }
        }
      }
    }
    
    // Check nested expressions in function calls
    if(atom.func && atom.args){
      for(const arg of atom.args){
        if(Array.isArray(arg)){
          if(this.exprDependsOnSpecialVars(arg, visitedWires)){
            return true;
          }
        }
      }
    }
  }
  
  return false;
};

Interpreter.prototype.exprDependsOnRandom = function(expr, visitedWires = new Set()){
  if(!expr || !Array.isArray(expr)) return false;
  
  for(const atom of expr){
    // Direct reference to $
    if(atom.var === '$'){
      return true;
    }
    
    // Check if wire depends on $
    if(atom.var && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$'){
      // Avoid infinite recursion by tracking visited wires
      if(visitedWires.has(atom.var)){
        return false; // Already checked this wire, assume it doesn't depend on $ to avoid cycles
      }
      
      const wire = this.wires.get(atom.var);
      if(wire){
        // Check wire's expression for $ dependency
        const ws = this.wireStatements.find(ws => {
          if(ws.assignment) return ws.assignment.target.var === atom.var;
          if(ws.decls) return ws.decls.some(d => d.name === atom.var);
          return false;
        });
        if(ws){
          const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
          if(wireExpr){
            visitedWires.add(atom.var);
            if(this.exprDependsOnRandom(wireExpr, visitedWires)){
              return true;
            }
            visitedWires.delete(atom.var);
          }
        }
      }
    }
    
    // Check nested expressions in function calls (like MUX)
    if(atom.func && atom.args){
      for(const arg of atom.args){
        if(Array.isArray(arg)){
          if(this.exprDependsOnRandom(arg, visitedWires)){
            return true;
          }
        }
      }
    }
  }
  
  return false;
};

Interpreter.prototype.updateComponentValue = function(compName, value, bitRange){
  const comp = this.components.get(compName);
  if(!comp) return;
  
  if(this.componentRegistry){
    const handler = this.componentRegistry.get(comp.type);
    if(handler && handler.updateDisplayValue){
      handler.updateDisplayValue(comp, value, bitRange);
      return;
    }
  }

  /*
  if(comp.type === 'led'){
    let bitsToUse = value;
    if(bitRange){
      const {start, end} = bitRange;
      const actualEnd = end !== undefined ? end : start;
      bitsToUse = value.substring(start, actualEnd + 1);
    }
    for(let i = 0; i < comp.deviceIds.length && i < bitsToUse.length; i++){
      const ledId = comp.deviceIds[i];
      const ledValue = bitsToUse[i] === '1';
      if(typeof setLed === 'function') setLed(ledId, ledValue);
    }
  } else if(comp.type === '7seg'){
    let bitsToUse = value;
    if(bitRange){
      const {start, end} = bitRange;
      const actualEnd = end !== undefined ? end : start;
      bitsToUse = value.substring(start, actualEnd + 1);
    }
    if(comp.deviceIds.length > 0){
      const segId = comp.deviceIds[0];
      const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      for(let i = 0; i < segments.length && i < bitsToUse.length; i++){
        if(typeof setSegment === 'function') setSegment(segId, segments[i], bitsToUse[i] === '1');
      }
      let segmentValue = bitsToUse;
      if(segmentValue.length < 8) segmentValue = segmentValue.padEnd(8, '0');
      else if(segmentValue.length > 8) segmentValue = segmentValue.substring(0, 8);
      comp.lastSegmentValue = segmentValue;
    }
  }*/
};

Interpreter.prototype.updateConnectedComponents = function(varName, newValue){
  // Track if this is the top-level call (not a recursive cascade call).
  // All blocks collected from any cascade depth are stored in _uccPendingBlocks
  // and executed in program order (by blockIndex) only at the top level.
  const isTopLevel = !this._uccPendingBlocks;
  if(isTopLevel){
    this._uccPendingBlocks = new Map(); // blockIndex → block
  }

  // Update all components connected to this variable/wire
  const varRef = this.vars.has(varName) ? this.vars.get(varName).ref : 
                 (this.wires.has(varName) ? this.wires.get(varName).ref : null);
  
  //console.log(`[DEBUG updateConnected] called for '${varName}' newValue=${newValue} varRef=${varRef} isTopLevel=${isTopLevel}`);
  
  if(!varRef || varRef === '&-'){
    //console.log(`[DEBUG updateConnected] EARLY RETURN: varRef is null or &- for '${varName}'`);
    if(isTopLevel) this._uccPendingBlocks = null;
    return;
  }
  
  // Check all component connections
  for(const [compName, conn] of this.componentConnections.entries()){
    // Check if connection references this variable
    if(typeof conn.source === 'string'){
      // Simple reference string
      if(conn.source === varRef || conn.source.includes(varRef)){
        // Re-evaluate the connection
        const value = this.getValueFromRef(conn.source);
        if(value !== null){
          this.updateComponentValue(compName, value, conn.bitRange);
        }
      }
    } else if(typeof conn.source === 'object' && conn.source.var === varName){
      // Expression reference
      const value = newValue;
      this.updateComponentValue(compName, value, conn.bitRange);
    }
  }
  
  // Check componentPendingProperties for inline property assignments that reference this wire
  // (e.g. .sev0:set = o1, where o1 is a wire that just changed)
  for(const [propCompName, pending] of this.componentPendingProperties.entries()){
    for(const [propName, propData] of Object.entries(pending)){
      if(propData.expr && this.exprReferencesWire(propData.expr, varName)){
        try {
          const exprResult = this.evalExpr(propData.expr, false);
          let value = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              value += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) value += val;
            }
          }
          
          const oldValue = propData.value;
          propData.value = value;
          
          if(propName === 'set'){
            const oldBit = (oldValue && oldValue.length > 0) ? oldValue[oldValue.length - 1] : '0';
            const newBit = (value && value.length > 0) ? value[value.length - 1] : '0';
            
            if(oldBit === '0' && newBit === '1'){
              this.applyComponentProperties(propCompName, 'immediate', true);
            }
          }
        } catch(e){
          // Ignore errors during re-evaluation
        }
      }
    }
  }
  
  // Find all wires that depend on this wire (cascade propagation)
  const dependentWires = new Set();
  const isWire = this.wires.has(varName);
  
  //console.log(`[DEBUG updateConnected] '${varName}' isWire=${isWire}, wireStatements.length=${this.wireStatements.length}`);
  
  if(isWire){
    // Find all wires that depend on varName
    for(const ws of this.wireStatements){
      const expr = ws.assignment ? ws.assignment.expr : ws.expr;
      const wsName = ws.assignment ? ws.assignment.target.var : (ws.decls ? ws.decls.map(d=>d.name).join(',') : '?');
      const refs = expr ? this.exprReferencesWire(expr, varName) : false;
      // console.log(`[DEBUG updateConnected] checking ws '${wsName}' refs '${varName}'? ${refs}`);
      if(expr && refs){
        if(ws.assignment){
          // Single wire assignment: wireName = expr
          const wireName = ws.assignment.target.var;
          if(wireName){
            dependentWires.add(wireName);
          }
        } else if(ws.decls && ws.expr){
          // Multiple wire declaration: type wire1 wire2 wire3 = expr
          // All declared wires depend on varName
          for(const decl of ws.decls){
            if(decl.name){
              dependentWires.add(decl.name);
            }
          }
        }
      }
    }
    
    //console.log(`[DEBUG updateConnected] dependentWires for '${varName}':`, [...dependentWires]);
    
    // Re-execute wire statements for dependent wires
    // This ensures that when db changes, q = ANDA4(!db.12/4) is re-executed
    for(const depWireName of dependentWires){
      const depWire = this.wires.get(depWireName);
      if(!depWire) continue;
      
      // Find the wire statement for this dependent wire
      for(const ws of this.wireStatements){
        let shouldReexecute = false;
        let wireName = null;
        
        if(ws.assignment){
          // Single wire assignment: wireName = expr
          wireName = ws.assignment.target.var;
          if(wireName === depWireName){
            shouldReexecute = true;
          }
        } else if(ws.decls && ws.expr){
          // Multiple wire declaration: type wire1 wire2 wire3 = expr
          for(const decl of ws.decls){
            if(decl.name === depWireName){
              shouldReexecute = true;
              wireName = depWireName;
              break;
            }
          }
        }
        
        if(shouldReexecute){
          //console.log(`[DEBUG updateConnected] re-executing wire statement for '${depWireName}'`);
          // Re-execute the wire statement
          this.execWireStatement(ws);
          
          // Get the new value
          if(depWire.ref){
            const refMatch = depWire.ref.match(/^&(\d+)/);
            if(refMatch){
              const storageIdx = parseInt(refMatch[1]);
              const stored = this.storage.find(s => s.index === storageIdx);
              if(stored){
                //console.log(`[DEBUG updateConnected] after re-exec, '${depWireName}' = ${stored.value}`);
                // Recursively update connected components for this dependent wire
                this.updateConnectedComponents(depWireName, stored.value);
              }
            }
          } else {
            //console.log(`[DEBUG updateConnected] depWire '${depWireName}' has no ref after re-exec!`);
          }
          break; // Found and re-executed, move to next dependent wire
        }
      }
    }
  }
  
  
  // Check property blocks that have dependencies on this wire/variable or dependent wires
  // This handles cases where a block depends on a wire (like hex = da.3/4) but setExprDirectRef is null or constant
  // Group blocks by component to execute them in order for each component
  // componentPropertyBlocks is already in program order, so we maintain that order
  const blocksByComponent = new Map();
  for(const block of this.componentPropertyBlocks){
    // Skip blocks that were already checked in updateComponentConnections (they have setExprDirectRef pointing to components)
    if(block.setExpr && block.setExprDirectRef && block.setExprDirectRef.type === 'component'){
      continue;
    }
    
    if(!blocksByComponent.has(block.component)){
      blocksByComponent.set(block.component, []);
    }
    blocksByComponent.get(block.component).push(block);
  }
  
  // Process blocks for each component in order
  for(const [compName, blocks] of blocksByComponent.entries()){
    // Sort blocks by their original order in componentPropertyBlocks to maintain program order
    const blockIndices = new Map();
    for(let i = 0; i < this.componentPropertyBlocks.length; i++){
      const block = this.componentPropertyBlocks[i];
      if(block.component === compName && !blockIndices.has(block)){
        blockIndices.set(block, i);
      }
    }
    const sortedBlocks = [...blocks].sort((a, b) => {
      const idxA = blockIndices.get(a) ?? Infinity;
      const idxB = blockIndices.get(b) ?? Infinity;
      return idxA - idxB;
    });
    
    const blocksToExecute = [];
    
    // First, check if any block for this component should execute based on wire dependencies
    let hasAnyWireDependentBlock = false;
    for(const block of sortedBlocks){
      // Skip blocks that were already checked in updateComponentConnections (they have setExprDirectRef pointing to components)
      if(block.setExpr && block.setExprDirectRef && block.setExprDirectRef.type === 'component'){
        continue;
      }
      
      // Check if this block has dependencies that include this wire/variable or any dependent wire
      let hasDependency = false;
      if(isWire && block.wireDependencies){
        // Check direct dependency
        if(block.wireDependencies.has(varName)){
          hasDependency = true;
        }
        // Check indirect dependency (through dependent wires)
        if(!hasDependency){
          for(const depWire of dependentWires){
            if(block.wireDependencies.has(depWire)){
              hasDependency = true;
              break;
            }
          }
        }
      } else if(!isWire && block.dependencies && block.dependencies.has(varName)){
        hasDependency = true;
      }
      
      // Also check if setExprDirectRef points to this wire or a dependent wire
      if(!hasDependency && block.setExprDirectRef && block.setExprDirectRef.type === 'wire'){
        if(block.setExprDirectRef.name === varName){
          hasDependency = true;
        } else if(dependentWires.has(block.setExprDirectRef.name)){
          hasDependency = true;
        }
      }
      
      // Also check if setExpr references this wire or dependent wires (for user-defined functions)
      if(block.setExpr){
        if(this.exprReferencesWire(block.setExpr, varName)){
          hasDependency = true;
        } else {
          for(const depWire of dependentWires){
            if(this.exprReferencesWire(block.setExpr, depWire)){
              hasDependency = true;
              break;
            }
          }
        }
      }
      
      if(hasDependency){
        hasAnyWireDependentBlock = true;
        break;
      }
    }
    
    // If any block depends on the wire, process all blocks in program order
    // This ensures constant blocks execute before wire-dependent blocks
    if(hasAnyWireDependentBlock){
      for(const block of sortedBlocks){
        // Skip blocks that were already checked in updateComponentConnections
        if(block.setExpr && block.setExprDirectRef && block.setExprDirectRef.type === 'component'){
          continue;
        }
        
        // Check if this block should execute
        let shouldExecute = false;
        
        // Check if it's a constant set=1 block
        // A block is considered "constant set=1" if setExpr is constant '1', regardless of other dependencies
        // But it should only execute if its properties (not 'set') depend on the changed variable
        let isConstantBlock = false;
        if(block.setExpr && block.setExpr.length === 1){
          const atom = block.setExpr[0];
          if((atom.bin === '1') || (atom.hex === '1') || (atom.dec === '1')){
            // Check if setExpr itself has no dependencies (it's just a constant '1')
            const setExprHasWireDep = this.exprReferencesWire(block.setExpr, varName) || 
                                      Array.from(dependentWires).some(dw => this.exprReferencesWire(block.setExpr, dw));
            const setExprHasDep = !isWire && block.dependencies && block.dependencies.has(varName);
            if(!setExprHasWireDep && !setExprHasDep){
              // This is a constant set=1 block
              isConstantBlock = true;
              
              // Check if any of the block's properties (excluding 'set') depend on the changed variable
              let hasPropertyDependency = false;
              if(isWire && block.wireDependencies && block.wireDependencies.has(varName)){
                hasPropertyDependency = true;
              } else if(isWire && block.wireDependencies){
                for(const depWire of dependentWires){
                  if(block.wireDependencies.has(depWire)){
                    hasPropertyDependency = true;
                    break;
                  }
                }
              } else if(!isWire && block.dependencies && block.dependencies.has(varName)){
                hasPropertyDependency = true;
              }
              
              if(hasPropertyDependency){
                shouldExecute = true;
              }
            }
          }
        }
        
        // If not a constant block, check if it has dependencies
        if(!shouldExecute){
          let hasDependency = false;
          if(isWire && block.wireDependencies){
            if(block.wireDependencies.has(varName)){
              hasDependency = true;
            } else {
              for(const depWire of dependentWires){
                if(block.wireDependencies.has(depWire)){
                  hasDependency = true;
                  break;
                }
              }
            }
          } else if(!isWire && block.dependencies && block.dependencies.has(varName)){
            hasDependency = true;
          }
          
          if(!hasDependency && block.setExprDirectRef && block.setExprDirectRef.type === 'wire'){
            if(block.setExprDirectRef.name === varName || dependentWires.has(block.setExprDirectRef.name)){
              hasDependency = true;
            }
          }
          
          if(block.setExpr){
            if(this.exprReferencesWire(block.setExpr, varName)){
              hasDependency = true;
            } else {
              for(const depWire of dependentWires){
                if(this.exprReferencesWire(block.setExpr, depWire)){
                  hasDependency = true;
                  break;
                }
              }
            }
          }
          
          if(!hasDependency){
            continue; // Skip this block
          }
        }
        
        // For blocks that should execute, check if set is 1
        const onMode = block.onMode || 'raise';
        if(onMode === '1' || onMode === 'level'){
          // Save old value before re-evaluating
          const oldSetValue = block.lastSetValue;

          // Re-evaluate the set expression to check if it's 1
          let setValue = '0';
          if(block.setExpr){
            const exprResult = this.evalExpr(block.setExpr, false);
            setValue = '';
            for(const part of exprResult){
              if(part.value !== undefined && part.value !== null && part.value !== '-'){
                setValue += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val && val !== '-' && val !== null){
                  setValue += val;
                }
              }
            }
            if(setValue === ''){
              setValue = '0';
            }
          }
          
          const setBit = setValue.length > 0 ? setValue[setValue.length - 1] : '0';
          const prevSetValue = oldSetValue || '0';

          // Determine if the wire that triggered this call (varName) is the set wire
          // itself or a data wire (like 'a', 'b' inputs).
          // If a data wire changed and set=1, execute without requiring set to have changed.
          const setWireName = block.setExprDirectRef && block.setExprDirectRef.type === 'wire'
            ? block.setExprDirectRef.name
            : null;
          const isSetWireTrigger = setWireName &&
            (varName === setWireName || dependentWires.has(setWireName));

          const valueChanged = (setValue !== prevSetValue);

          // Execute if set=1 AND:
          // - the set value itself changed (covers both set-wire trigger and data-wire trigger
          //   when set stays 1 because a data dependency changed), OR
          // - this was triggered by a non-set wire AND set is still 1 AND the triggering
          //   wire is an actual data dependency of the block (not just any wire change)
          const triggeredByDataWire = !isSetWireTrigger &&
            block.wireDependencies && block.wireDependencies.has(varName);
          if(setBit === '1' && (valueChanged || triggeredByDataWire)){
            // Add to shared pending map (keyed by blockIndex for deduplication)
            // Top-level call will execute all pending in program order
            this._uccPendingBlocks.set(block.blockIndex, block);
          }

          // Always update lastSetValue
          block.lastSetValue = setValue;
        } else if(onMode === 'raise' || onMode === 'rising'){
          // For edge-triggered blocks, check if value changed from 0 to 1
          if(newValue && newValue.length > 0 && newValue[newValue.length - 1] === '1'){
            // Re-evaluate the set expression
            let setValue = '0';
            if(block.setExpr){
              const exprResult = this.evalExpr(block.setExpr, false);
              setValue = '';
              for(const part of exprResult){
                if(part.value !== undefined && part.value !== null && part.value !== '-'){
                  setValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val && val !== '-' && val !== null){
                    setValue += val;
                  }
                }
              }
              if(setValue === ''){
                setValue = '0';
              }
            }
            
            const setBit = setValue.length > 0 ? setValue[setValue.length - 1] : '0';
            if(setBit === '1'){
              this._uccPendingBlocks.set(block.blockIndex, block);
            }
          }
        }
      }
    }
    
    // (blocks are collected into _uccPendingBlocks above, not executed here)
  }

  // TOP-LEVEL ONLY: execute all pending blocks in program order (by blockIndex).
  // Keep _uccPendingBlocks active during execution so any newly triggered blocks
  // (from cascades inside executePropertyBlock) are also collected and sorted,
  // not executed immediately out of order.
  if(isTopLevel){
    const executedBlockKeys = new Set();
    const seenComponents = new Set();
    const executedComponents = [];

    // Loop until no new pending blocks are added (handles cascades)
    while(this._uccPendingBlocks && this._uccPendingBlocks.size > 0){
      // Snapshot current pending and reset map so cascades fill a fresh one
      const pendingBlocks = this._uccPendingBlocks;
      this._uccPendingBlocks = new Map();

      // Sort by blockIndex (= program order)
      const sortedPending = [...pendingBlocks.values()]
        .sort((a, b) => a.blockIndex - b.blockIndex);

      for(const block of sortedPending){
        const blockKey = `${block.component}:${block.blockIndex}`;
        if(!executedBlockKeys.has(blockKey)){
          executedBlockKeys.add(blockKey);
          this.executePropertyBlock(block.component, block.properties, true, block);
          // Update lastSetValue after execution so next trigger sees correct previous state
          if(block.setExpr){
            const res = this.evalExpr(block.setExpr, false);
            let sv = '';
            for(const p of res){
              if(p.value !== undefined && p.value !== null && p.value !== '-') sv += p.value;
              else if(p.ref && p.ref !== '&-'){ const v = this.getValueFromRef(p.ref); if(v) sv += v; }
            }
            block.lastSetValue = sv || '0';
          }
          if(!seenComponents.has(block.component)){
            seenComponents.add(block.component);
            executedComponents.push(block.component);
          }
        }
      }
    }

    this._uccPendingBlocks = null;

    if(executedBlockKeys.size > 0){
      // Prevent re-execution in updateComponentConnections callbacks
      if(!this.justExecutedBlocks){
        this.justExecutedBlocks = new Set();
      }
      for(const key of executedBlockKeys){
        this.justExecutedBlocks.add(key);
      }

      // Update visual connections for every component that had blocks executed
      for(const compName of executedComponents){
        this.updateComponentConnections(compName);
      }

      // Clear justExecutedBlocks synchronously so next event loop tick starts fresh
      this.justExecutedBlocks = null;

      if(typeof showVars === 'function') showVars();
    }
  }
};
