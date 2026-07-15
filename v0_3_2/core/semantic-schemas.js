/**
 * Semantic schemas — named bit fields on wires (independent from numeric formats).
 * Supports flat fields, merge (<schema>), and nested (field:<schema>) composition.
 */
(function (global) {
  'use strict';

  const RESERVED_SCHEMA_NAMES = new Set(['none']);

  function assertSchemaNameAllowed(name) {
    if (RESERVED_SCHEMA_NAMES.has(name)) {
      throw new Error(`Reserved schema name '${name}' — choose another name for a user-defined schema`);
    }
  }

  function pathKeyFromSegments(segments) {
    return segments.join('.');
  }

  function normalizeRawFieldSpec(spec) {
    if (spec.kind === 'merge') return { kind: 'merge', ref: spec.ref };
    if (spec.kind === 'nested') return { kind: 'nested', name: spec.name, ref: spec.ref };
    if (spec.kind === 'array') return { kind: 'array', name: spec.name, elementWidth: spec.elementWidth, rows: spec.rows, cols: spec.cols, singleDim: spec.singleDim };
    if (spec.kind === 'var_array') {
      return {
        kind: 'var_array',
        name: spec.name,
        elementWidth: spec.elementWidth,
        minCount: spec.minCount,
        maxCount: spec.maxCount,
        countRef: spec.countRef,
        countRefDim: spec.countRefDim,
        singleDim: spec.singleDim,
        matrixVar: spec.matrixVar,
        rowsSpec: spec.rowsSpec,
        colsSpec: spec.colsSpec,
      };
    }
    if (spec.kind === 'schema_array') {
      return { kind: 'schema_array', name: spec.name, ref: spec.ref, rows: spec.rows, cols: spec.cols, singleDim: spec.singleDim };
    }
    if (spec.kind === 'schema_var_array') {
      return {
        kind: 'schema_var_array',
        name: spec.name,
        ref: spec.ref,
        minCount: spec.minCount,
        maxCount: spec.maxCount,
        countRef: spec.countRef,
        countRefDim: spec.countRefDim,
        singleDim: spec.singleDim,
        matrixVar: spec.matrixVar,
        rowsSpec: spec.rowsSpec,
        colsSpec: spec.colsSpec,
      };
    }
    if (spec.ref && spec.name && spec.kind !== 'leaf') {
      return { kind: 'nested', name: spec.name, ref: spec.ref };
    }
    return { kind: 'leaf', name: spec.name, width: spec.width };
  }

  function segmentAsIndex(seg) {
    const s = seg == null ? '' : String(seg);
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    return null;
  }

  function isMatrixArrayNode(node) {
    if (!node || node.kind !== 'array') return false;
    if (node.matrixVar || (node.rows != null && node.cols != null && !node.singleDim)) {
      return node.rows > 1 || node.cols > 1;
    }
    return node.rows > 1 && node.cols > 1;
  }

  function isVarMatrixNode(node) {
    return node && node.kind === 'var_array' && !!node.matrixVar;
  }

  function expandMatrixVarMeta(rowsSpec, colsSpec) {
    const rowsVar = !!(rowsSpec.var || rowsSpec.countRef);
    const colsVar = !!(colsSpec.var || colsSpec.countRef);
    const rowsFixed = rowsVar ? null : rowsSpec.fixed;
    const colsFixed = colsVar ? null : colsSpec.fixed;
    const rowsMin = rowsSpec.countRef ? 0 : (rowsSpec.var ? rowsSpec.min : rowsSpec.fixed);
    const rowsMax = rowsSpec.countRef ? null : (rowsSpec.var ? rowsSpec.max : rowsSpec.fixed);
    const colsMin = colsSpec.countRef ? 0 : (colsSpec.var ? colsSpec.min : colsSpec.fixed);
    const colsMax = colsSpec.countRef ? null : (colsSpec.var ? colsSpec.max : colsSpec.fixed);
    return {
      matrixVar: true,
      rowsVar,
      colsVar,
      rowsFixed,
      colsFixed,
      rowsMin,
      rowsMax,
      colsMin,
      colsMax,
      rows: rowsMin,
      cols: colsMin,
      singleDim: false,
    };
  }

  function findCountRefLeaf(structure, refName, schemaName) {
    const node = structure.find((n) => n.kind === 'leaf' && n.name === refName);
    if (!node) {
      throw new Error(`countRef '${refName}' is not a prior leaf field in schema '${schemaName}'`);
    }
    return node;
  }

  function countRefScalarMax(refLeaf) {
    return (1 << refLeaf.width) - 1;
  }

  function hasDualCountRef(node) {
    return node.countRefDim === 'both'
      || (node.rowsSpec && node.rowsSpec.countRef && node.colsSpec && node.colsSpec.countRef);
  }

  function hasAnyCountRef(node) {
    return !!(node.countRef || hasDualCountRef(node));
  }

  function resolveCountRefBounds(spec, structure, schemaName) {
    if (spec.matrixVar && spec.rowsSpec && spec.rowsSpec.countRef && spec.colsSpec && spec.colsSpec.countRef) {
      const rowsLeaf = findCountRefLeaf(structure, spec.rowsSpec.countRef, schemaName);
      const colsLeaf = findCountRefLeaf(structure, spec.colsSpec.countRef, schemaName);
      return {
        minCount: 0,
        maxCount: countRefScalarMax(rowsLeaf) * countRefScalarMax(colsLeaf),
        countRef: null,
        countRefDim: 'both',
        countRefRows: spec.rowsSpec.countRef,
        countRefCols: spec.colsSpec.countRef,
      };
    }
    if (!spec.countRef) return null;
    const refLeaf = findCountRefLeaf(structure, spec.countRef, schemaName);
    const scalarMax = countRefScalarMax(refLeaf);
    if (!spec.matrixVar) {
      return { minCount: 0, maxCount: scalarMax, countRef: spec.countRef, countRefDim: null };
    }
    const rowsSpec = spec.rowsSpec;
    const colsSpec = spec.colsSpec;
    if (spec.countRefDim === 'rows' || (rowsSpec && rowsSpec.countRef)) {
      const colsFixed = colsSpec && !colsSpec.var && !colsSpec.countRef ? colsSpec.fixed : null;
      if (!colsFixed) {
        throw new Error(`Matrix countRef on rows requires fixed column count in schema '${schemaName}'`);
      }
      return {
        minCount: 0,
        maxCount: scalarMax * colsFixed,
        countRef: spec.countRef,
        countRefDim: 'rows',
      };
    }
    if (spec.countRefDim === 'cols' || (colsSpec && colsSpec.countRef)) {
      const rowsFixed = rowsSpec && !rowsSpec.var && !rowsSpec.countRef ? rowsSpec.fixed : null;
      if (!rowsFixed) {
        throw new Error(`Matrix countRef on columns requires fixed row count in schema '${schemaName}'`);
      }
      return {
        minCount: 0,
        maxCount: scalarMax * rowsFixed,
        countRef: spec.countRef,
        countRefDim: 'cols',
      };
    }
    throw new Error(`Invalid matrix countRef in schema '${schemaName}'`);
  }

  function readLeafUInt(wireBits, leafNode, schemaName) {
    if (!wireBits || wireBits.length < leafNode.bitStart + leafNode.width) {
      throw new Error(`Wire too short to read '${leafNode.name}' in schema '${schemaName}'`);
    }
    const bits = wireBits.substring(leafNode.bitStart, leafNode.bitStart + leafNode.width);
    return parseInt(bits, 2);
  }

  function resolveMatrixCountFromDualRefs(node, wireBits, schemaName, structure) {
    const rowsRef = node.countRefRows || (node.rowsSpec && node.rowsSpec.countRef);
    const colsRef = node.countRefCols || (node.colsSpec && node.colsSpec.countRef);
    const rowsNode = findCountRefLeaf(structure, rowsRef, schemaName);
    const colsNode = findCountRefLeaf(structure, colsRef, schemaName);
    const rows = readLeafUInt(wireBits, rowsNode, schemaName);
    const cols = readLeafUInt(wireBits, colsNode, schemaName);
    if (rows < node.rowsMin || (node.rowsMax != null && rows > node.rowsMax)) {
      throw new Error(`Matrix row count ${rows} out of range for '${node.name}' in schema '${schemaName}'`);
    }
    if (cols < node.colsMin || (node.colsMax != null && cols > node.colsMax)) {
      throw new Error(`Matrix column count ${cols} out of range for '${node.name}' in schema '${schemaName}'`);
    }
    const count = rows * cols;
    validateVarArrayCount(node, count, schemaName);
    return { count, rows, cols };
  }

  function elementCountFromCountRef(node, refVal, schemaName) {
    if (!node.matrixVar) {
      validateVarArrayCount(node, refVal, schemaName);
      return refVal;
    }
    if (node.countRefDim === 'rows' || (node.rowsSpec && node.rowsSpec.countRef)) {
      const rows = refVal;
      if (rows < node.rowsMin || (node.rowsMax != null && rows > node.rowsMax)) {
        throw new Error(`Matrix row count ${rows} out of range for '${node.name}' in schema '${schemaName}'`);
      }
      const count = rows * node.colsFixed;
      validateVarArrayCount(node, count, schemaName);
      return count;
    }
    if (node.countRefDim === 'cols' || (node.colsSpec && node.colsSpec.countRef)) {
      const cols = refVal;
      if (cols < node.colsMin || (node.colsMax != null && cols > node.colsMax)) {
        throw new Error(`Matrix column count ${cols} out of range for '${node.name}' in schema '${schemaName}'`);
      }
      const count = cols * node.rowsFixed;
      validateVarArrayCount(node, count, schemaName);
      return count;
    }
    validateVarArrayCount(node, refVal, schemaName);
    return refVal;
  }

  function resolveMatrixShapeFromCount(node, totalCells, schemaName, runtimeOpts) {
    if (!node.matrixVar) {
      return { rows: 1, cols: totalCells, singleDim: true };
    }
    if (node.rowsVar && node.colsVar) {
      if (hasDualCountRef(node)) {
        const wireBits = runtimeOpts && runtimeOpts.wireBits;
        const structure = (runtimeOpts && runtimeOpts.schema && runtimeOpts.schema.structure)
          || (runtimeOpts && runtimeOpts.structure);
        if (!wireBits || !structure) {
          throw new Error(
            `Cannot resolve matrix shape for '${node.name}' in schema '${schemaName}' without wire data`
          );
        }
        const { rows, cols } = resolveMatrixCountFromDualRefs(node, wireBits, schemaName, structure);
        if (rows * cols !== totalCells) {
          throw new Error(
            `Matrix cell count ${totalCells} does not match shape [${rows},${cols}] for '${node.name}' in schema '${schemaName}'`
          );
        }
        return { rows, cols, singleDim: false };
      }
      throw new Error(
        `Ambiguous matrix shape for '${node.name}' in schema '${schemaName}' — use grouped literal shape [R,C]`
      );
    }
    if (node.colsFixed != null && !node.colsVar) {
      if (totalCells % node.colsFixed !== 0) {
        throw new Error(
          `Field '${node.name}' in schema '${schemaName}' expects a multiple of ${node.colsFixed} cells per row, got ${totalCells}`
        );
      }
      const rows = totalCells / node.colsFixed;
      if (rows < node.rowsMin || (node.rowsMax != null && rows > node.rowsMax)) {
        throw new Error(
          `Matrix row count ${rows} out of range for '${node.name}' in schema '${schemaName}'`
        );
      }
      return { rows, cols: node.colsFixed, singleDim: false };
    }
    if (node.rowsFixed != null && !node.rowsVar) {
      if (totalCells % node.rowsFixed !== 0) {
        throw new Error(
          `Field '${node.name}' in schema '${schemaName}' expects a multiple of ${node.rowsFixed} rows, got ${totalCells}`
        );
      }
      const cols = totalCells / node.rowsFixed;
      if (cols < node.colsMin || (node.colsMax != null && cols > node.colsMax)) {
        throw new Error(
          `Matrix column count ${cols} out of range for '${node.name}' in schema '${schemaName}'`
        );
      }
      return { rows: node.rowsFixed, cols, singleDim: false };
    }
    throw new Error(`Invalid matrix field '${node.name}' in schema '${schemaName}'`);
  }

  function validateGroupedLiteralShape(node, shape, elementCount, schemaName) {
    if (!shape) {
      if (isVarMatrixNode(node) && node.rowsVar && node.colsVar) {
        throw new Error(
          `Shape prefix or suffix [R,C] required for '${node.name}' in schema '${schemaName}'`
        );
      }
      return null;
    }
    let rows;
    let cols;
    if (shape.kind === 'vector') {
      if (isVarMatrixNode(node)) {
        throw new Error(`Expected matrix shape [R,C] for '${node.name}' in schema '${schemaName}'`);
      }
      rows = 1;
      cols = shape.count;
    } else {
      rows = shape.rows;
      cols = shape.cols;
    }
    if (elementCount !== rows * cols) {
      throw new Error(
        `Grouped literal shape [${rows},${cols}] expects ${rows * cols} elements, got ${elementCount} for '${node.name}' in schema '${schemaName}'`
      );
    }
    if (isVarMatrixNode(node)) {
      if (node.rowsVar) {
        if (rows < node.rowsMin || (node.rowsMax != null && rows > node.rowsMax)) {
          throw new Error(`Matrix row count ${rows} out of range for '${node.name}' in schema '${schemaName}'`);
        }
      } else if (rows !== node.rowsFixed) {
        throw new Error(`Matrix row count must be ${node.rowsFixed} for '${node.name}' in schema '${schemaName}', got ${rows}`);
      }
      if (node.colsVar) {
        if (cols < node.colsMin || (node.colsMax != null && cols > node.colsMax)) {
          throw new Error(`Matrix column count ${cols} out of range for '${node.name}' in schema '${schemaName}'`);
        }
      } else if (cols !== node.colsFixed) {
        throw new Error(`Matrix column count must be ${node.colsFixed} for '${node.name}' in schema '${schemaName}', got ${cols}`);
      }
    } else if (shape.kind === 'matrix') {
      throw new Error(`Expected vector shape [N] for '${node.name}' in schema '${schemaName}'`);
    }
    return { rows, cols, singleDim: shape.kind === 'matrix' ? false : true };
  }

  function isVarArrayNode(node) {
    return node && node.kind === 'var_array';
  }

  function validateVarArrayCount(node, count, schemaName) {
    if (!Number.isFinite(count) || count < 0 || Math.floor(count) !== count) {
      throw new Error(`Invalid element count for '${node.name}' in schema '${schemaName}'`);
    }
    if (count < node.minCount) {
      throw new Error(`Field '${node.name}' in schema '${schemaName}' requires at least ${node.minCount} elements, got ${count}`);
    }
    if (node.maxCount != null && count > node.maxCount) {
      throw new Error(`Field '${node.name}' in schema '${schemaName}' allows at most ${node.maxCount} elements, got ${count}`);
    }
  }

  function fixedWidthOfNode(node) {
    if (node.kind === 'leaf' || node.kind === 'nested' || node.kind === 'array') return node.width;
    if (node.kind === 'var_array') return node.minWidth;
    return 0;
  }

  function runtimeWidthOfNode(node, varArrayCounts) {
    if (node.kind === 'var_array') {
      const count = varArrayCounts[node.name];
      if (count == null) return node.minWidth;
      return node.elementWidth * count;
    }
    return node.width;
  }

  function computeStructureOffsets(schema, varArrayCounts) {
    const offsets = new Map();
    let offset = 0;
    for (const node of schema.structure) {
      offsets.set(node.name, offset);
      if (node.kind === 'var_array') {
        const count = varArrayCounts[node.name];
        offset += count != null ? node.elementWidth * count : node.minWidth;
      } else {
        offset += node.width;
      }
    }
    return offsets;
  }

  function assertPriorVarArrayCounts(schema, fieldName, varArrayCounts) {
    for (const node of schema.structure) {
      if (node.name === fieldName) break;
      if (node.kind === 'var_array' && varArrayCounts[node.name] == null) {
        throw new Error(
          `Assign to '${fieldName}' requires prior variable array '${node.name}' count in schema '${schema.name}'`
        );
      }
    }
  }

  function countFromFieldBits(node, bitLen, schemaName, shape) {
    if (bitLen % node.elementWidth !== 0) {
      throw new Error(
        `Field '${node.name}' in schema '${schemaName}' expects a multiple of ${node.elementWidth} bits, got ${bitLen}`
      );
    }
    const count = bitLen / node.elementWidth;
    validateVarArrayCount(node, count, schemaName);
    if (isVarMatrixNode(node)) {
      if (shape) {
        validateGroupedLiteralShape(node, shape, count, schemaName);
      }
      resolveMatrixShapeFromCount(node, count, schemaName);
    } else if (shape) {
      validateGroupedLiteralShape(node, shape, count, schemaName);
    }
    return count;
  }

  function resolveFlatVarArrayCounts(schema, declaredWidth, wireBits) {
    ensureSchemaShape(schema);
    const varNodes = schema.structure.filter((n) => n.kind === 'var_array');
    if (!varNodes.length) return {};

    const counts = {};
    const unresolved = [];

    for (const node of varNodes) {
      if (hasDualCountRef(node)) {
        if (!wireBits) {
          throw new Error(
            `Cannot resolve '${node.name}' from dual countRef without wire data in schema '${schema.name}'`
          );
        }
        const { count } = resolveMatrixCountFromDualRefs(node, wireBits, schema.name, schema.structure);
        counts[node.name] = count;
      } else if (node.countRef) {
        if (!wireBits) {
          throw new Error(
            `Cannot resolve '${node.name}' from countRef '${node.countRef}' without wire data in schema '${schema.name}'`
          );
        }
        const refNode = findCountRefLeaf(schema.structure, node.countRef, schema.name);
        const refVal = readLeafUInt(wireBits, refNode, schema.name);
        const count = elementCountFromCountRef(node, refVal, schema.name);
        counts[node.name] = count;
        if (isVarMatrixNode(node)) {
          resolveMatrixShapeFromCount(node, count, schema.name);
        }
      } else {
        unresolved.push(node);
      }
    }

    if (!unresolved.length) return counts;

    const prefixWidth = (beforeName, resolvedCounts) => {
      let w = 0;
      for (const node of schema.structure) {
        if (node.name === beforeName) break;
        w += runtimeWidthOfNode(node, resolvedCounts);
      }
      return w;
    };

    const suffixWidthAfter = (afterName) => {
      let found = false;
      let w = 0;
      for (const node of schema.structure) {
        if (node.name === afterName) {
          found = true;
          continue;
        }
        if (!found) continue;
        if (node.kind === 'var_array') break;
        w += node.width;
      }
      return w;
    };

    if (unresolved.length === 1) {
      const vf = unresolved[0];
      const prefix = prefixWidth(vf.name, counts);
      const suffix = suffixWidthAfter(vf.name);
      const payload = declaredWidth - prefix - suffix;
      if (payload < 0 || payload % vf.elementWidth !== 0) {
        throw new Error(
          `Cannot resolve variable array '${vf.name}' from ${declaredWidth} bits in schema '${schema.name}'`
        );
      }
      const count = payload / vf.elementWidth;
      validateVarArrayCount(vf, count, schema.name);
      if (isVarMatrixNode(vf)) {
        resolveMatrixShapeFromCount(vf, count, schema.name);
      }
      return { ...counts, [vf.name]: count };
    }

    const prefix = prefixWidth(unresolved[0].name, counts);
    const suffix = suffixWidthAfter(unresolved[unresolved.length - 1].name);
    const payload = declaredWidth - prefix - suffix;
    if (payload < 0) {
      throw new Error(`Wire width ${declaredWidth} too small for schema '${schema.name}'`);
    }

    const solutions = [];
    function enumerate(idx, remaining, current) {
      if (idx >= unresolved.length) {
        if (remaining === 0) solutions.push({ ...current });
        return;
      }
      const vf = unresolved[idx];
      const minW = vf.minCount * vf.elementWidth;
      const maxW = vf.maxCount != null ? vf.maxCount * vf.elementWidth : remaining;
      for (let w = minW; w <= Math.min(maxW, remaining); w += vf.elementWidth) {
        const c = w / vf.elementWidth;
        current[vf.name] = c;
        enumerate(idx + 1, remaining - w, current);
      }
    }
    enumerate(0, payload, {});

    if (solutions.length !== 1) {
      throw new Error(
        `Ambiguous variable array layout for schema '${schema.name}' at ${declaredWidth} bits`
      );
    }
    return { ...counts, ...solutions[0] };
  }

  function runtimeArrayNode(arrayNode, varArrayCounts, schemaName, runtimeOpts) {
    if (!isVarArrayNode(arrayNode)) return arrayNode;
    const count = varArrayCounts[arrayNode.name];
    if (count == null) {
      throw new Error(`Variable array '${arrayNode.name}' has no runtime count in schema '${schemaName}'`);
    }
    validateVarArrayCount(arrayNode, count, schemaName);
    const width = arrayNode.elementWidth * count;
    const bitStart = arrayNode.bitStart != null ? arrayNode.bitStart : 0;
    const result = {
      ...arrayNode,
      kind: 'array',
      elementCount: count,
      width,
      bitStart,
      bitEnd: bitStart + width - 1,
    };
    if (isVarMatrixNode(arrayNode)) {
      const shapeOpts = Object.assign({}, runtimeOpts || {}, {
        structure: (runtimeOpts && runtimeOpts.schema && runtimeOpts.schema.structure) || null,
      });
      const shape = resolveMatrixShapeFromCount(arrayNode, count, schemaName, shapeOpts);
      result.rows = shape.rows;
      result.cols = shape.cols;
      result.singleDim = false;
      result.matrixVar = true;
      return result;
    }
    if (arrayNode.singleDim && arrayNode.rows === 1) {
      result.cols = count;
      result.rows = 1;
      result.singleDim = true;
    } else if (arrayNode.singleDim && arrayNode.cols === 1) {
      result.rows = count;
      result.cols = 1;
      result.singleDim = true;
    }
    return result;
  }

  function applySchemaMinMaxMeta(schema) {
    let minWidth = 0;
    let maxWidth = 0;
    let maxOpen = false;
    for (const node of schema.structure) {
      if (node.kind === 'var_array') {
        minWidth += node.minWidth;
        if (node.maxWidth != null) maxWidth += node.maxWidth;
        else maxOpen = true;
      } else {
        minWidth += node.width;
        maxWidth += node.width;
      }
    }
    schema.minWidth = minWidth;
    schema.maxWidth = maxOpen ? null : maxWidth;
    schema.hasVarArray = schema.structure.some((n) => n.kind === 'var_array');
    schema.totalWidth = minWidth;
    return schema;
  }

  function appendSchemaArrayLeafPaths(leafPaths, arrayNode, bitStart, duplicateContext) {
    const sub = arrayNode.elementSchema;
    if (!sub) {
      appendArrayLeafPaths(leafPaths, arrayNode, bitStart, duplicateContext);
      return;
    }
    ensureSchemaShape(sub);
    const ew = arrayNode.elementWidth;
    const { rows, cols, name } = arrayNode;
    const registerElement = (indexPath, elStart) => {
      for (const info of sub.leafPaths.values()) {
        const path = [...indexPath, ...info.path];
        const key = pathKeyFromSegments(path);
        if (leafPaths.has(key)) {
          throw new Error(`Duplicate schema field '${path.join(':')}' in schema '${duplicateContext.schemaName}'`);
        }
        leafPaths.set(key, {
          path,
          name: info.name,
          width: info.width,
          bitStart: elStart + info.bitStart,
          bitEnd: elStart + info.bitEnd,
        });
      }
    };
    if (arrayNode.singleDim && rows === 1) {
      for (let i = 0; i < cols; i++) {
        registerElement([name, String(i)], bitStart + i * ew);
      }
      return;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        registerElement([name, String(r), String(c)], bitStart + idx * ew);
      }
    }
  }

  function appendArrayLeafPaths(leafPaths, arrayNode, bitStart, duplicateContext) {
    const ew = arrayNode.elementWidth;
    const { rows, cols, name } = arrayNode;
    if (arrayNode.singleDim && rows === 1) {
      for (let i = 0; i < cols; i++) {
        const elStart = bitStart + i * ew;
        const path = [name, String(i)];
        const key = pathKeyFromSegments(path);
        if (leafPaths.has(key)) {
          throw new Error(`Duplicate schema field '${name}:${i}' in schema '${duplicateContext.schemaName}'`);
        }
        leafPaths.set(key, {
          path,
          name: String(i),
          width: ew,
          bitStart: elStart,
          bitEnd: elStart + ew - 1,
        });
      }
      return;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const elStart = bitStart + idx * ew;
        const path = [name, String(r), String(c)];
        const key = pathKeyFromSegments(path);
        if (leafPaths.has(key)) {
          throw new Error(`Duplicate schema field '${name}:${r}:${c}' in schema '${duplicateContext.schemaName}'`);
        }
        leafPaths.set(key, {
          path,
          name: `${r}:${c}`,
          width: ew,
          bitStart: elStart,
          bitEnd: elStart + ew - 1,
        });
      }
    }
  }

  function ensureSchemaShape(schema) {
    if (!schema) return schema;
    if (!schema.structure && schema.fields) {
      schema.structure = schema.fields.map((f) => ({
        kind: 'leaf',
        name: f.name,
        width: f.width,
        bitStart: f.bitStart,
        bitEnd: f.bitEnd,
      }));
      const leafPaths = new Map();
      for (const f of schema.fields) {
        leafPaths.set(f.name, {
          path: [f.name],
          name: f.name,
          width: f.width,
          bitStart: f.bitStart,
          bitEnd: f.bitEnd,
        });
      }
      schema.leafPaths = leafPaths;
    }
    return schema;
  }

  function syncFieldsFromLeafPaths(schema) {
    const leaves = [];
    if (schema.leafPaths) {
      for (const info of schema.leafPaths.values()) {
        leaves.push({
          name: info.name,
          width: info.width,
          bitStart: info.bitStart,
          bitEnd: info.bitEnd,
          path: info.path.slice(),
          fullPath: pathKeyFromSegments(info.path),
        });
      }
      leaves.sort((a, b) => a.bitStart - b.bitStart);
    }
    schema.fields = leaves;
    return schema;
  }

  function getResolvedSchema(refName, ctx) {
    if (ctx.registry.has(refName)) {
      return ensureSchemaShape(ctx.registry.get(refName));
    }
    if (!ctx.pending || !ctx.pending.has(refName)) {
      throw new Error(`Unknown schema '${refName}'`);
    }
    if (ctx.visiting.has(refName)) {
      const chain = [...ctx.visiting, refName];
      throw new Error(`Circular schema reference: ${chain.join(' → ')}`);
    }
    ctx.visiting.add(refName);
    const rawFields = ctx.pending.get(refName);
    const def = buildResolvedSchema(refName, rawFields, ctx);
    ctx.visiting.delete(refName);
    if (!ctx.registry.has(refName)) {
      ctx.registry.set(refName, def);
    }
    return def;
  }

  function appendStructureNodes(targetStructure, targetLeafPaths, subSchema, bitOffset, pathPrefix, duplicateContext) {
    ensureSchemaShape(subSchema);
    for (const node of subSchema.structure) {
      if (node.kind === 'leaf') {
        const path = pathPrefix.length ? [...pathPrefix, node.name] : [node.name];
        const key = pathKeyFromSegments(path);
        if (targetLeafPaths.has(key)) {
          const msg = duplicateContext && duplicateContext.mergeRef
            ? `Duplicate schema field '${node.name}' in schema '${duplicateContext.schemaName}' (from merge of '${duplicateContext.mergeRef}')`
            : `Duplicate schema field '${node.name}' in schema '${duplicateContext.schemaName}'`;
          throw new Error(msg);
        }
        const bitStart = bitOffset + node.bitStart;
        const bitEnd = bitStart + node.width - 1;
        targetStructure.push({
          kind: 'leaf',
          name: node.name,
          width: node.width,
          bitStart,
          bitEnd,
        });
        targetLeafPaths.set(key, {
          path,
          name: node.name,
          width: node.width,
          bitStart,
          bitEnd,
        });
      } else if (node.kind === 'nested') {
        const path = pathPrefix.length ? [...pathPrefix, node.name] : [node.name];
        const bitStart = bitOffset + node.bitStart;
        const bitEnd = bitStart + node.width - 1;
        targetStructure.push({
          kind: 'nested',
          name: node.name,
          width: node.width,
          bitStart,
          bitEnd,
          schema: node.schema,
        });
        for (const info of node.schema.leafPaths.values()) {
          const subPath = [...path, ...info.path];
          const subKey = pathKeyFromSegments(subPath);
          if (targetLeafPaths.has(subKey)) {
            throw new Error(`Duplicate schema field '${info.name}' in schema '${duplicateContext.schemaName}'`);
          }
          targetLeafPaths.set(subKey, {
            path: subPath,
            name: info.name,
            width: info.width,
            bitStart: bitStart + info.bitStart,
            bitEnd: bitStart + info.bitEnd,
          });
        }
      }
    }
  }

  function buildResolvedSchema(name, rawFields, ctx) {
    assertSchemaNameAllowed(name);
    const structure = [];
    const leafPaths = new Map();
    let bitStart = 0;

    for (const raw of rawFields) {
      const spec = normalizeRawFieldSpec(raw);
      if (spec.kind === 'merge') {
        const sub = getResolvedSchema(spec.ref, ctx);
        appendStructureNodes(structure, leafPaths, sub, bitStart, [], {
          schemaName: name,
          mergeRef: spec.ref,
        });
        bitStart += sub.totalWidth;
        continue;
      }
      if (spec.kind === 'nested') {
        const sub = getResolvedSchema(spec.ref, ctx);
        const width = sub.totalWidth;
        if (!spec.name) {
          throw new Error(`Nested schema field requires a name in schema '${name}'`);
        }
        const containerPath = [spec.name];
        const containerKey = pathKeyFromSegments(containerPath);
        if (leafPaths.has(containerKey)) {
          throw new Error(`Duplicate schema field '${spec.name}' in schema '${name}'`);
        }
        const bitEnd = bitStart + width - 1;
        structure.push({
          kind: 'nested',
          name: spec.name,
          width,
          bitStart,
          bitEnd,
          schema: sub,
        });
        for (const info of sub.leafPaths.values()) {
          const subPath = [spec.name, ...info.path];
          const subKey = pathKeyFromSegments(subPath);
          if (leafPaths.has(subKey)) {
            throw new Error(`Duplicate schema field '${info.name}' in schema '${name}'`);
          }
          leafPaths.set(subKey, {
            path: subPath,
            name: info.name,
            width: info.width,
            bitStart: bitStart + info.bitStart,
            bitEnd: bitStart + info.bitEnd,
          });
        }
        bitStart += width;
        continue;
      }
      if (spec.kind === 'array') {
        const ew = spec.elementWidth;
        const rows = spec.rows || 1;
        const cols = spec.cols || 1;
        const count = rows * cols;
        const width = ew * count;
        if (!Number.isFinite(ew) || ew < 1 || !Number.isFinite(width) || width < 1) {
          throw new Error(`Invalid array field '${spec.name}' in schema '${name}'`);
        }
        if (leafPaths.has(spec.name)) {
          throw new Error(`Duplicate schema field '${spec.name}' in schema '${name}'`);
        }
        const bitEnd = bitStart + width - 1;
        const arrayNode = {
          kind: 'array',
          name: spec.name,
          elementWidth: ew,
          rows,
          cols,
          singleDim: !!spec.singleDim,
          elementCount: count,
          width,
          bitStart,
          bitEnd,
        };
        structure.push(arrayNode);
        appendSchemaArrayLeafPaths(leafPaths, arrayNode, bitStart, { schemaName: name });
        bitStart += width;
        continue;
      }
      if (spec.kind === 'schema_array') {
        const sub = getResolvedSchema(spec.ref, ctx);
        const ew = sub.totalWidth;
        const rows = spec.rows || 1;
        const cols = spec.cols || 1;
        const count = rows * cols;
        const width = ew * count;
        if (!Number.isFinite(ew) || ew < 1 || !Number.isFinite(width) || width < 1) {
          throw new Error(`Invalid schema array field '${spec.name}' in schema '${name}'`);
        }
        if (leafPaths.has(spec.name)) {
          throw new Error(`Duplicate schema field '${spec.name}' in schema '${name}'`);
        }
        const bitEnd = bitStart + width - 1;
        const arrayNode = {
          kind: 'array',
          name: spec.name,
          elementWidth: ew,
          elementSchema: sub,
          elementSchemaRef: spec.ref,
          rows,
          cols,
          singleDim: !!spec.singleDim,
          elementCount: count,
          width,
          bitStart,
          bitEnd,
        };
        structure.push(arrayNode);
        appendSchemaArrayLeafPaths(leafPaths, arrayNode, bitStart, { schemaName: name });
        bitStart += width;
        continue;
      }
      if (spec.kind === 'var_array' || spec.kind === 'schema_var_array') {
        const countRefBounds = resolveCountRefBounds(spec, structure, name);
        const minCount = countRefBounds ? countRefBounds.minCount : (spec.minCount != null ? spec.minCount : 0);
        const maxCount = countRefBounds ? countRefBounds.maxCount : (spec.maxCount != null ? spec.maxCount : null);
        let ew;
        let elementSchema = null;
        let elementSchemaRef = null;
        if (spec.kind === 'schema_var_array') {
          elementSchema = getResolvedSchema(spec.ref, ctx);
          ew = elementSchema.totalWidth;
          elementSchemaRef = spec.ref;
        } else {
          ew = spec.elementWidth;
        }
        if (!Number.isFinite(ew) || ew < 1) {
          throw new Error(`Invalid variable array field '${spec.name}' in schema '${name}'`);
        }
        if (leafPaths.has(spec.name)) {
          throw new Error(`Duplicate schema field '${spec.name}' in schema '${name}'`);
        }
        const minWidth = ew * minCount;
        const maxWidth = maxCount != null ? ew * maxCount : null;
        const matrixMeta = spec.matrixVar && spec.rowsSpec && spec.colsSpec
          ? expandMatrixVarMeta(spec.rowsSpec, spec.colsSpec)
          : { singleDim: spec.singleDim !== false, rows: 1, cols: minCount };
        if (countRefBounds && spec.matrixVar && countRefBounds.countRef) {
          const refLeaf = findCountRefLeaf(structure, countRefBounds.countRef, name);
          const scalarMax = countRefScalarMax(refLeaf);
          if (countRefBounds.countRefDim === 'rows') {
            matrixMeta.rowsMax = scalarMax;
          } else if (countRefBounds.countRefDim === 'cols') {
            matrixMeta.colsMax = scalarMax;
          }
        }
        if (countRefBounds && countRefBounds.countRefDim === 'both') {
          const rowsLeaf = findCountRefLeaf(structure, countRefBounds.countRefRows, name);
          const colsLeaf = findCountRefLeaf(structure, countRefBounds.countRefCols, name);
          matrixMeta.rowsMax = countRefScalarMax(rowsLeaf);
          matrixMeta.colsMax = countRefScalarMax(colsLeaf);
        }
        const arrayNode = {
          kind: 'var_array',
          name: spec.name,
          elementWidth: ew,
          minCount,
          maxCount,
          minWidth,
          maxWidth,
          countRef: countRefBounds ? countRefBounds.countRef : null,
          countRefDim: countRefBounds ? countRefBounds.countRefDim : null,
          countRefRows: countRefBounds ? countRefBounds.countRefRows : null,
          countRefCols: countRefBounds ? countRefBounds.countRefCols : null,
          matrixVar: !!spec.matrixVar,
          rowsVar: matrixMeta.rowsVar,
          colsVar: matrixMeta.colsVar,
          rowsFixed: matrixMeta.rowsFixed,
          colsFixed: matrixMeta.colsFixed,
          rowsMin: matrixMeta.rowsMin,
          rowsMax: matrixMeta.rowsMax,
          colsMin: matrixMeta.colsMin,
          colsMax: matrixMeta.colsMax,
          rowsSpec: spec.rowsSpec || null,
          colsSpec: spec.colsSpec || null,
          rows: matrixMeta.rows,
          cols: matrixMeta.cols,
          singleDim: matrixMeta.singleDim,
          elementSchema,
          elementSchemaRef,
          width: minWidth,
          bitStart,
          bitEnd: bitStart + minWidth - 1,
        };
        structure.push(arrayNode);
        bitStart += minWidth;
        continue;
      }
      const width = spec.width;
      if (!Number.isFinite(width) || width < 1) {
        throw new Error(`Invalid field width for '${spec.name}' in schema '${name}'`);
      }
      if (leafPaths.has(spec.name)) {
        throw new Error(`Duplicate schema field '${spec.name}' in schema '${name}'`);
      }
      const bitEnd = bitStart + width - 1;
      structure.push({
        kind: 'leaf',
        name: spec.name,
        width,
        bitStart,
        bitEnd,
      });
      leafPaths.set(spec.name, {
        path: [spec.name],
        name: spec.name,
        width,
        bitStart,
        bitEnd,
      });
      bitStart += width;
    }

    const schema = {
      name,
      totalWidth: bitStart,
      structure,
      leafPaths,
      rawFields: rawFields.map((raw) => {
        const spec = normalizeRawFieldSpec(raw);
        if (spec.kind === 'merge') return { kind: 'merge', ref: spec.ref };
        if (spec.kind === 'nested') return { kind: 'nested', name: spec.name, ref: spec.ref };
        if (spec.kind === 'array') {
          return {
            kind: 'array',
            name: spec.name,
            elementWidth: spec.elementWidth,
            rows: spec.rows,
            cols: spec.cols,
            singleDim: spec.singleDim,
          };
        }
        if (spec.kind === 'var_array') {
          return {
            kind: 'var_array',
            name: spec.name,
            elementWidth: spec.elementWidth,
            minCount: spec.minCount,
            maxCount: spec.maxCount,
            countRef: spec.countRef,
            countRefDim: spec.countRefDim,
            singleDim: spec.singleDim,
            matrixVar: spec.matrixVar,
            rowsSpec: spec.rowsSpec,
            colsSpec: spec.colsSpec,
          };
        }
        if (spec.kind === 'schema_array') {
          return {
            kind: 'schema_array',
            name: spec.name,
            ref: spec.ref,
            rows: spec.rows,
            cols: spec.cols,
            singleDim: spec.singleDim,
          };
        }
        if (spec.kind === 'schema_var_array') {
          return {
            kind: 'schema_var_array',
            name: spec.name,
            ref: spec.ref,
            minCount: spec.minCount,
            maxCount: spec.maxCount,
            countRef: spec.countRef,
            countRefDim: spec.countRefDim,
            singleDim: spec.singleDim,
            matrixVar: spec.matrixVar,
            rowsSpec: spec.rowsSpec,
            colsSpec: spec.colsSpec,
          };
        }
        return { kind: 'leaf', name: spec.name, width: spec.width };
      }),
    };
    applySchemaMinMaxMeta(schema);
    return syncFieldsFromLeafPaths(schema);
  }

  function resolveSchemaComposition(name, rawFields, registry, pending, visiting) {
    const ctx = {
      registry: registry || new Map(),
      pending: pending || new Map(),
      visiting: visiting || new Set(),
    };
    if (!ctx.pending.has(name)) {
      ctx.pending.set(name, rawFields);
    }
    return buildResolvedSchema(name, rawFields, ctx);
  }

  function collectSchemaDeclsFromStmts(stmts) {
    const decls = [];
    if (!stmts) return decls;
    for (const s of stmts) {
      if (s && s.schemaDecl) decls.push(s.schemaDecl);
    }
    return decls;
  }

  function resolveSchemaDecls(stmtsOrDecls, registry, options) {
    if (!registry) throw new Error('schema registry missing');
    const decls = Array.isArray(stmtsOrDecls) && stmtsOrDecls[0] && stmtsOrDecls[0].schemaDecl
      ? collectSchemaDeclsFromStmts(stmtsOrDecls)
      : stmtsOrDecls;
    const pending = new Map();
    for (const decl of decls) {
      if (!decl || !decl.name) continue;
      if (pending.has(decl.name)) {
        throw new Error(`Duplicate schema '${decl.name}'`);
      }
      pending.set(decl.name, decl.fields || decl.rawFields || []);
    }
    const ctx = {
      registry,
      pending,
      visiting: new Set(),
    };
    const resolved = [];
    for (const [name, rawFields] of pending) {
      if (registry.has(name) && !(options && options.overwrite)) {
        continue;
      }
      const def = buildResolvedSchema(name, rawFields, ctx);
      if (registry.has(name)) {
        if (options && options.overwrite) {
          registry.set(name, def);
        } else {
          throw new Error(`Duplicate schema '${name}'`);
        }
      } else {
        registry.set(name, def);
      }
      resolved.push(def);
    }
    return resolved;
  }

  function buildSchemaDef(name, fieldSpecs) {
    const rawFields = (fieldSpecs || []).map((spec) => {
      if (spec.kind) return spec;
      return { kind: 'leaf', name: spec.name, width: spec.width };
    });
    const registry = new Map();
    return resolveSchemaComposition(name, rawFields, registry, new Map([[name, rawFields]]));
  }

  function validateSchemaWidth(schema, wireWidth) {
    if (!schema) return;
    ensureSchemaShape(schema);
    if (schema.hasVarArray) {
      if (wireWidth < schema.minWidth) {
        throw new Error(
          `width mismatch between ${schema.name} (min ${schema.minWidth}bit) and definition (${wireWidth}bit)`
        );
      }
      return;
    }
    if (schema.totalWidth !== wireWidth) {
      throw new Error(
        `width mismatch between ${schema.name} (${schema.totalWidth}bit) and definition (${wireWidth}bit)`
      );
    }
  }

  function validateSchemaWidthForShow(schema, wireWidth) {
    if (!schema) return;
    ensureSchemaShape(schema);
    if (schema.hasVarArray) {
      if (wireWidth < schema.minWidth) {
        throw new Error(
          `${schema.name} (min ${schema.minWidth}bit) width incompatible with wire (${wireWidth}bit)`
        );
      }
      if (schema.maxWidth != null && wireWidth > schema.maxWidth) {
        throw new Error(
          `${schema.name} (max ${schema.maxWidth}bit) width incompatible with wire (${wireWidth}bit)`
        );
      }
      return;
    }
    if (schema.totalWidth !== wireWidth) {
      throw new Error(
        `${schema.name} (${schema.totalWidth}bit) width incompatible with wire (${wireWidth}bit)`
      );
    }
  }

  function getField(schema, fieldName) {
    if (!schema) return null;
    ensureSchemaShape(schema);
    const node = schema.structure.find((n) => n.kind === 'leaf' && n.name === fieldName);
    if (!node) return null;
    return {
      name: node.name,
      width: node.width,
      bitStart: node.bitStart,
      bitEnd: node.bitEnd,
    };
  }

  function findNestedContainer(schema, segment, schemaName) {
    ensureSchemaShape(schema);
    const node = schema.structure.find((n) => n.kind === 'nested' && n.name === segment);
    if (!node) return null;
    return node;
  }

  function findLeafPathInfo(schema, path) {
    ensureSchemaShape(schema);
    if (!path || !path.length) return null;
    const key = pathKeyFromSegments(path);
    return schema.leafPaths.get(key) || null;
  }

  function suggestWirePath(wireVar, path) {
    return wireVar ? `${wireVar}:${path.join(':')}` : path.join(':');
  }

  function resolveSchemaArrayColView(arrayNode, absBase, path, colIndex, wireVar, schemaName) {
    if (!isMatrixArrayNode(arrayNode)) {
      throw new Error(`Column slice '::' requires matrix field '${arrayNode.name}' in schema '${schemaName}'`);
    }
    if (colIndex < 0 || colIndex >= arrayNode.cols) {
      throw new Error(`Column index ${colIndex} out of range for '${arrayNode.name}' in schema '${schemaName}' (cols ${arrayNode.cols})`);
    }
    const absStart = absBase + arrayNode.bitStart;
    return {
      kind: 'array_col',
      name: arrayNode.name,
      width: arrayNode.rows * arrayNode.elementWidth,
      bitStart: absStart,
      bitEnd: absStart + arrayNode.width - 1,
      array: arrayNode,
      colIndex,
      path: path.slice(),
    };
  }

  function resolveSchemaFieldView(schema, path, opts) {
    const wireVar = opts && opts.wireVar;
    const arrayColIndex = opts && opts.arrayColIndex;
    const varArrayCounts = (opts && opts.varArrayCounts) || {};
    if (arrayColIndex != null && path && path.length >= 1) {
      ensureSchemaShape(schema);
      let currentSchema = schema;
      let absBase = 0;
      const offsets = schema.hasVarArray ? computeStructureOffsets(schema, varArrayCounts) : null;
      for (let i = 0; i < path.length; i++) {
        const seg = path[i];
        const nestedNode = currentSchema.structure.find((n) => n.kind === 'nested' && n.name === seg);
        if (nestedNode) {
          if (i === path.length - 1) {
            throw new Error(`Field '${seg}' is a nested schema in '${schema.name}'; column slice requires an array field`);
          }
          currentSchema = nestedNode.schema;
          absBase = nestedNode.bitStart;
          continue;
        }
        const arrayNode = currentSchema.structure.find(
          (n) => (n.kind === 'array' || n.kind === 'var_array') && n.name === seg
        );
        if (arrayNode && i === path.length - 1) {
          const arrayBitStart = offsets ? offsets.get(arrayNode.name) : absBase + (arrayNode.bitStart || 0);
          const resolvedNode = isVarArrayNode(arrayNode)
            ? runtimeArrayNode(
              { ...arrayNode, bitStart: arrayBitStart },
              varArrayCounts,
              currentSchema.name || schema.name,
              { wireBits: opts && opts.wireBits, schema }
            )
            : { ...arrayNode, bitStart: arrayBitStart };
          return resolveSchemaArrayColView(resolvedNode, 0, path, arrayColIndex, wireVar, schema.name);
        }
        break;
      }
      throw new Error(`Unknown schema array field for column slice in schema '${schema.name}'`);
    }
    return resolveSchemaView(schema, path, opts);
  }

  function resolveSchemaSubFieldView(subSchema, subPath, elBase, parentPath, wireVar, schemaName) {
    ensureSchemaShape(subSchema);
    if (!subPath || !subPath.length) {
      throw new Error(`Empty sub-field path in schema '${schemaName}'`);
    }
    let currentSchema = subSchema;
    let absBase = elBase;
    for (let i = 0; i < subPath.length; i++) {
      const seg = subPath[i];
      const nestedNode = currentSchema.structure.find((n) => n.kind === 'nested' && n.name === seg);
      if (nestedNode) {
        if (i === subPath.length - 1) {
          return {
            kind: 'nested',
            name: seg,
            width: nestedNode.width,
            bitStart: absBase + nestedNode.bitStart,
            bitEnd: absBase + nestedNode.bitEnd,
            schema: nestedNode.schema,
            path: parentPath.slice(),
          };
        }
        currentSchema = nestedNode.schema;
        absBase += nestedNode.bitStart;
        continue;
      }
      const remaining = subPath.slice(i);
      const key = pathKeyFromSegments(remaining);
      const leaf = currentSchema.leafPaths.get(key);
      if (leaf) {
        return {
          kind: 'leaf',
          name: leaf.name,
          width: leaf.width,
          bitStart: absBase + leaf.bitStart,
          bitEnd: absBase + leaf.bitEnd,
          path: parentPath.slice(),
        };
      }
      if (remaining.length === 1) {
        const segLeaf = currentSchema.structure.find((n) => n.kind === 'leaf' && n.name === seg);
        if (segLeaf) {
          return {
            kind: 'leaf',
            name: segLeaf.name,
            width: segLeaf.width,
            bitStart: absBase + segLeaf.bitStart,
            bitEnd: absBase + segLeaf.bitEnd,
            path: parentPath.slice(),
          };
        }
      }
      break;
    }
    const seg = subPath[0];
    for (const [, info] of subSchema.leafPaths.entries()) {
      if (info.name === seg && info.path.length > 1) {
        const parent = info.path[info.path.length - 2];
        throw new Error(
          `Field '${seg}' is nested under '${parent}' in schema '${subSchema.name}'; use ${suggestWirePath(wireVar, [...parentPath, ...info.path])}`
        );
      }
    }
    throw new Error(`Unknown schema field '${subPath[subPath.length - 1]}' in schema '${subSchema.name}'`);
  }

  function resolveArrayElementView(arrayNode, absBase, path, rem, wireVar, schemaName) {
    if (arrayNode.elementSchema && rem && rem.length) {
      const sub = arrayNode.elementSchema;
      if (isMatrixArrayNode(arrayNode)) {
        if (rem.length === 1) {
          const idx0 = segmentAsIndex(rem[0]);
          if (idx0 == null) {
            throw new Error(`Expected numeric row index for '${arrayNode.name}' in schema '${schemaName}'`);
          }
          if (idx0 < 0 || idx0 >= arrayNode.rows) {
            throw new Error(`Row index ${idx0} out of range for '${arrayNode.name}' in schema '${schemaName}' (rows ${arrayNode.rows})`);
          }
          const rowWidth = arrayNode.cols * arrayNode.elementWidth;
          const rowStart = absBase + arrayNode.bitStart + idx0 * rowWidth;
          return {
            kind: 'array_row',
            name: arrayNode.name,
            width: rowWidth,
            bitStart: rowStart,
            bitEnd: rowStart + rowWidth - 1,
            array: arrayNode,
            rowIndex: idx0,
            path: path.slice(),
          };
        }
        if (rem.length === 2) {
          const idx0 = segmentAsIndex(rem[0]);
          const idx1 = segmentAsIndex(rem[1]);
          if (idx0 == null || idx1 == null) {
            throw new Error(`Expected numeric matrix index for '${arrayNode.name}' in schema '${schemaName}'`);
          }
          if (idx0 < 0 || idx0 >= arrayNode.rows || idx1 < 0 || idx1 >= arrayNode.cols) {
            throw new Error(`Matrix index ${idx0}:${idx1} out of range for '${arrayNode.name}' in schema '${schemaName}' ([${arrayNode.rows},${arrayNode.cols}])`);
          }
          const linear = idx0 * arrayNode.cols + idx1;
          const elStart = absBase + arrayNode.bitStart + linear * arrayNode.elementWidth;
          return {
            kind: 'nested',
            name: `${idx0}:${idx1}`,
            width: arrayNode.elementWidth,
            bitStart: elStart,
            bitEnd: elStart + arrayNode.elementWidth - 1,
            schema: sub,
            path: path.slice(),
          };
        }
        if (rem.length >= 3) {
          const idx0 = segmentAsIndex(rem[0]);
          const idx1 = segmentAsIndex(rem[1]);
          if (idx0 == null || idx1 == null) {
            throw new Error(`Expected numeric matrix index for '${arrayNode.name}' in schema '${schemaName}'`);
          }
          if (idx0 < 0 || idx0 >= arrayNode.rows || idx1 < 0 || idx1 >= arrayNode.cols) {
            throw new Error(`Matrix index ${idx0}:${idx1} out of range for '${arrayNode.name}' in schema '${schemaName}' ([${arrayNode.rows},${arrayNode.cols}])`);
          }
          const linear = idx0 * arrayNode.cols + idx1;
          const elStart = absBase + arrayNode.bitStart + linear * arrayNode.elementWidth;
          return resolveSchemaSubFieldView(sub, rem.slice(2), elStart, path, wireVar, schemaName);
        }
        throw new Error(`Invalid path for matrix schema array '${arrayNode.name}' in schema '${schemaName}'`);
      }
      const idx0 = segmentAsIndex(rem[0]);
      if (idx0 == null) {
        throw new Error(`Expected numeric array index for '${arrayNode.name}' in schema '${schemaName}'`);
      }
      if (idx0 < 0 || idx0 >= arrayNode.elementCount) {
        throw new Error(`Index ${idx0} out of range for '${arrayNode.name}' in schema '${schemaName}' (length ${arrayNode.elementCount})`);
      }
      const elStart = absBase + arrayNode.bitStart + idx0 * arrayNode.elementWidth;
      if (rem.length === 1) {
        return {
          kind: 'nested',
          name: String(idx0),
          width: arrayNode.elementWidth,
          bitStart: elStart,
          bitEnd: elStart + arrayNode.elementWidth - 1,
          schema: sub,
          path: path.slice(),
        };
      }
      return resolveSchemaSubFieldView(sub, rem.slice(1), elStart, path, wireVar, schemaName);
    }
    if (!rem || !rem.length) {
      return {
        kind: 'array',
        name: arrayNode.name,
        width: arrayNode.width,
        bitStart: absBase + arrayNode.bitStart,
        bitEnd: absBase + arrayNode.bitEnd,
        array: arrayNode,
        path: path.slice(),
      };
    }
    const idx0 = segmentAsIndex(rem[0]);
    if (idx0 == null) {
      throw new Error(`Expected numeric array index for '${arrayNode.name}' in schema '${schemaName}'`);
    }
    if (isMatrixArrayNode(arrayNode)) {
      if (rem.length === 1) {
        if (idx0 < 0 || idx0 >= arrayNode.rows) {
          throw new Error(`Row index ${idx0} out of range for '${arrayNode.name}' in schema '${schemaName}' (rows ${arrayNode.rows})`);
        }
        const rowWidth = arrayNode.cols * arrayNode.elementWidth;
        const rowStart = absBase + arrayNode.bitStart + idx0 * rowWidth;
        return {
          kind: 'array_row',
          name: arrayNode.name,
          width: rowWidth,
          bitStart: rowStart,
          bitEnd: rowStart + rowWidth - 1,
          array: arrayNode,
          rowIndex: idx0,
          path: path.slice(),
        };
      }
      if (rem.length === 2) {
        const idx1 = segmentAsIndex(rem[1]);
        if (idx1 == null) {
          throw new Error(`Expected numeric column index for '${arrayNode.name}' in schema '${schemaName}'`);
        }
        if (idx0 < 0 || idx0 >= arrayNode.rows || idx1 < 0 || idx1 >= arrayNode.cols) {
          throw new Error(`Matrix index ${idx0}:${idx1} out of range for '${arrayNode.name}' in schema '${schemaName}' ([${arrayNode.rows},${arrayNode.cols}])`);
        }
        const linear = idx0 * arrayNode.cols + idx1;
        const elStart = absBase + arrayNode.bitStart + linear * arrayNode.elementWidth;
        return {
          kind: 'leaf',
          name: `${idx0}:${idx1}`,
          width: arrayNode.elementWidth,
          bitStart: elStart,
          bitEnd: elStart + arrayNode.elementWidth - 1,
          path: path.slice(),
        };
      }
      throw new Error(`Invalid path for matrix field '${arrayNode.name}' in schema '${schemaName}'; use ${suggestWirePath(wireVar, [arrayNode.name, '<row>', '<col>'])}`);
    }
    if (rem.length === 1) {
      if (idx0 < 0 || idx0 >= arrayNode.elementCount) {
        throw new Error(`Index ${idx0} out of range for '${arrayNode.name}' in schema '${schemaName}' (length ${arrayNode.elementCount})`);
      }
      const elStart = absBase + arrayNode.bitStart + idx0 * arrayNode.elementWidth;
      return {
        kind: 'leaf',
        name: String(idx0),
        width: arrayNode.elementWidth,
        bitStart: elStart,
        bitEnd: elStart + arrayNode.elementWidth - 1,
        path: path.slice(),
      };
    }
    throw new Error(`Invalid path for array field '${arrayNode.name}' in schema '${schemaName}'`);
  }

  function resolveSchemaView(schema, path, opts) {
    ensureSchemaShape(schema);
    if (!path || !path.length) {
      throw new Error(`Empty schema field path in schema '${schema.name}'`);
    }
    const wireVar = opts && opts.wireVar;
    const rootName = schema.name;
    const varArrayCounts = (opts && opts.varArrayCounts) || {};
    const offsets = schema.hasVarArray ? computeStructureOffsets(schema, varArrayCounts) : null;

    let currentSchema = schema;
    let absBase = 0;
    for (let i = 0; i < path.length; i++) {
      const seg = path[i];
      const nestedNode = currentSchema.structure.find((n) => n.kind === 'nested' && n.name === seg);
      if (nestedNode) {
        const nestedStart = offsets ? offsets.get(nestedNode.name) : nestedNode.bitStart;
        if (i === path.length - 1) {
          return {
            kind: 'nested',
            name: seg,
            width: nestedNode.width,
            bitStart: nestedStart,
            bitEnd: nestedStart + nestedNode.width - 1,
            schema: nestedNode.schema,
            path: path.slice(),
          };
        }
        currentSchema = nestedNode.schema;
        absBase = nestedStart;
        continue;
      }
      const arrayNode = currentSchema.structure.find(
        (n) => (n.kind === 'array' || n.kind === 'var_array') && n.name === seg
      );
      if (arrayNode) {
        const arrayBitStart = offsets ? offsets.get(arrayNode.name) : absBase + arrayNode.bitStart;
        const resolvedNode = isVarArrayNode(arrayNode)
          ? runtimeArrayNode(
            { ...arrayNode, bitStart: arrayBitStart },
            varArrayCounts,
            currentSchema.name || rootName,
            { wireBits: opts && opts.wireBits, schema }
          )
          : { ...arrayNode, bitStart: arrayBitStart };
        return resolveArrayElementView(resolvedNode, 0, path, path.slice(i + 1), wireVar, rootName);
      }
      const remaining = path.slice(i);
      const key = pathKeyFromSegments(remaining);
      const leaf = currentSchema.leafPaths.get(key);
      if (leaf && !offsets) {
        return {
          kind: 'leaf',
          name: leaf.name,
          width: leaf.width,
          bitStart: absBase + leaf.bitStart,
          bitEnd: absBase + leaf.bitEnd,
          path: path.slice(),
        };
      }
      if (remaining.length === 1) {
        const segLeaf = currentSchema.structure.find((n) => n.kind === 'leaf' && n.name === seg);
        if (segLeaf) {
          const bitStart = offsets ? offsets.get(segLeaf.name) : absBase + segLeaf.bitStart;
          return {
            kind: 'leaf',
            name: segLeaf.name,
            width: segLeaf.width,
            bitStart,
            bitEnd: bitStart + segLeaf.width - 1,
            path: path.slice(),
          };
        }
      }
      break;
    }

    const seg = path[0];
    const schemaName = rootName;
    for (const [, info] of schema.leafPaths.entries()) {
      if (info.name === seg && info.path.length > 1) {
        const parent = info.path[info.path.length - 2];
        throw new Error(
          `Field '${seg}' is nested under '${parent}' in schema '${schemaName}'; use ${suggestWirePath(wireVar, info.path)}`
        );
      }
    }
    const key = pathKeyFromSegments(path);
    throw new Error(`Unknown schema field '${path[path.length - 1]}' in path '${key}' (schema '${schemaName}')`);
  }

  function resolveFieldPath(schema, path, opts) {
    const view = resolveSchemaView(schema, path, opts);
    if (view.kind === 'nested') {
      const wireVar = opts && opts.wireVar;
      const schemaName = schema.name;
      throw new Error(
        `Field '${view.name}' is a nested schema in '${schemaName}'; use ${suggestWirePath(wireVar, [...view.path, '<field>'])}`
      );
    }
    if (view.kind === 'array' || view.kind === 'array_row' || view.kind === 'array_col') {
      return view;
    }
    return view;
  }

  function gatherSchemaArrayColumnBits(fullBits, schema, view) {
    const TS = typeof LogTScriptTensorShape !== 'undefined' ? LogTScriptTensorShape : null;
    if (!TS || !view || view.kind !== 'array_col') {
      throw new Error('gatherSchemaArrayColumnBits requires array_col view');
    }
    const s = fullBits == null ? '' : String(fullBits);
    const arrayNode = view.array;
    const arrayBits = s.substring(view.bitStart, view.bitStart + arrayNode.width);
    return TS.gatherColumnBits(arrayBits, view.colIndex, arrayNode.elementWidth, arrayNode.rows, arrayNode.cols);
  }

  function scatterSchemaArrayColumnBits(fullBits, schema, view, colValue) {
    const TS = typeof LogTScriptTensorShape !== 'undefined' ? LogTScriptTensorShape : null;
    if (!TS || !view || view.kind !== 'array_col') {
      throw new Error('scatterSchemaArrayColumnBits requires array_col view');
    }
    const s = fullBits == null ? '' : String(fullBits);
    const w = Math.max(s.length, schema.totalWidth);
    let base = s.length < w ? s.padStart(w, '0') : s.substring(s.length - w);
    const arrayNode = view.array;
    const arrayStart = view.bitStart;
    const arrayBits = base.substring(arrayStart, arrayStart + arrayNode.width);
    const fv = normalizeSliceBits(colValue, view.width);
    const updatedArray = TS.scatterColumnBits(
      arrayBits, view.colIndex, arrayNode.elementWidth, arrayNode.rows, arrayNode.cols, fv
    );
    return base.substring(0, arrayStart) + updatedArray + base.substring(arrayStart + arrayNode.width);
  }

  function normalizeSliceBits(fieldValue, width) {
    let fv = fieldValue == null ? '' : String(fieldValue);
    if (fv.length > width) fv = fv.substring(fv.length - width);
    else if (fv.length < width) fv = fv.padStart(width, '0');
    return fv;
  }

  function packViewBits(bits, schema, view, fieldValue) {
    if (view.kind === 'array_col') {
      return scatterSchemaArrayColumnBits(bits, schema, view, fieldValue);
    }
    const fv = normalizeSliceBits(fieldValue, view.width);
    if (view.kind === 'leaf') {
      validateFieldBits(view, fv);
    } else if (!/^[01]+$/.test(fv) || fv.length !== view.width) {
      throw new Error(`Expected ${view.width} bits, got ${fv.length} bits`);
    }
    const w = Math.max(bits == null ? 0 : String(bits).length, schema.totalWidth);
    let base = bits == null ? '' : String(bits);
    if (base.length < w) base = base.padStart(w, '0');
    else if (base.length > w) base = base.substring(base.length - w);
    return base.substring(0, view.bitStart) + fv + base.substring(view.bitStart + view.width);
  }

  function extractViewBits(bits, schema, view) {
    const s = bits == null ? '' : String(bits);
    if (s.length < schema.totalWidth) {
      throw new Error(`Wire value shorter than schema '${schema.name}' (${s.length} < ${schema.totalWidth})`);
    }
    if (view.kind === 'array_col') {
      return gatherSchemaArrayColumnBits(s, schema, view);
    }
    const slice = s.substring(view.bitStart, view.bitStart + view.width);
    return slice.padEnd(view.width, '0');
  }

  function extractFieldPath(bits, schema, path) {
    const view = resolveSchemaView(schema, path);
    return extractViewBits(bits, schema, view);
  }

  function packFieldPath(bits, schema, path, fieldValue, opts) {
    const view = resolveSchemaView(schema, path, opts);
    if (view.kind === 'nested') {
      throw new Error(`Field '${view.name}' is a nested schema; use a sub-field path`);
    }
    return packViewBits(bits, schema, view, fieldValue);
  }

  function extractField(bits, schema, fieldName) {
    return extractFieldPath(bits, schema, [fieldName]);
  }

  function packField(bits, schema, fieldName, fieldValue) {
    return packFieldPath(bits, schema, [fieldName], fieldValue);
  }

  function validateFieldBits(field, bitStr) {
    const s = bitStr == null ? '' : String(bitStr);
    if (s.length !== field.width) {
      throw new Error(`Field '${field.name}' expects ${field.width} bits, got ${s.length}`);
    }
    if (/^[01]+$/.test(s)) {
      const max = (1 << field.width) - 1;
      const val = parseInt(s, 2);
      if (val > max) {
        throw new Error(`Field '${field.name}' overflow: value exceeds ${field.width}-bit capacity`);
      }
    }
  }

  function unsignedBitsToInt(bitStr) {
    if (!bitStr || !/^[01]+$/.test(bitStr)) return null;
    return parseInt(bitStr, 2);
  }

  function packBlock(bits, schema, bitStart, width, blockValue) {
    let fv = blockValue == null ? '' : String(blockValue);
    if (fv.length > width) fv = fv.substring(fv.length - width);
    else if (fv.length < width) fv = fv.padStart(width, '0');
    const w = Math.max(bits == null ? 0 : String(bits).length, schema.totalWidth);
    let base = bits == null ? '' : String(bits);
    if (base.length < w) base = base.padStart(w, '0');
    else if (base.length > w) base = base.substring(base.length - w);
    return base.substring(0, bitStart) + fv + base.substring(bitStart + width);
  }

  function buildSchemaLiteralBits(schema, fieldValues, options) {
    ensureSchemaShape(schema);
    const varArrayCounts = {};
    const declaredWidth = options && options.declaredWidth;
    let bits = declaredWidth != null ? '0'.repeat(declaredWidth) : '0'.repeat(schema.totalWidth);
    for (const [key, val] of Object.entries(fieldValues || {})) {
      const path = key.includes('.') ? key.split('.') : [key];
      if (path.length === 1) {
        const node = schema.structure.find((n) => n.name === key);
        if (node && node.kind === 'var_array') {
          const bitLen = val == null ? 0 : String(val).length;
          const shape = options && options.fieldShapes && options.fieldShapes[key];
          const count = countFromFieldBits(node, bitLen, schema.name, shape);
          varArrayCounts[node.name] = count;
          const offset = computeStructureOffsets(schema, varArrayCounts).get(node.name);
          bits = packBlock(bits, schema, offset, node.elementWidth * count, val);
          continue;
        }
        if (node && (node.kind === 'nested' || node.kind === 'array')) {
          bits = packBlock(bits, schema, node.bitStart, node.width, val);
          continue;
        }
      }
      if (schema.leafPaths.has(pathKeyFromSegments(path))) {
        bits = packFieldPath(bits, schema, path, val, { varArrayCounts });
      } else if (path.length === 1) {
        const field = getField(schema, key);
        if (field) bits = packField(bits, schema, key, val);
      }
    }
    if (schema.hasVarArray) {
      for (const node of schema.structure) {
        if (node.kind === 'var_array' && varArrayCounts[node.name] == null) {
          throw new Error(`Missing value for variable array '${node.name}' in schema '${schema.name}'`);
        }
      }
    }
    return { bits, varArrayCounts };
  }

  function formatSchemaFieldValue(fieldBits, fieldWidth, opts, formatValueFn) {
    const DF = typeof LogTScriptDebugDisplayFormat !== 'undefined' ? LogTScriptDebugDisplayFormat : null;
    const NF = typeof LogTScriptNumericFormats !== 'undefined' ? LogTScriptNumericFormats : null;
    const bits = fieldBits == null ? '' : String(fieldBits);

    if (!opts || !(opts.dec || opts.decSigned || opts.hex || opts.bin || opts.signed || opts.ascii || opts.numericFormat)) {
      if (typeof formatValueFn === 'function') return formatValueFn(bits, fieldWidth);
      return bits;
    }

    if (opts.numericFormat && NF) {
      const formatW = NF.getFormatModeWidth(opts.numericFormat);
      if (formatW != null && formatW === fieldWidth) {
        return NF.formatGroupedShow(bits, opts.numericFormat, { elementWidth: formatW });
      }
      if (formatW != null && fieldWidth < formatW && DF) {
        return DF.formatDebugDisplayValue(bits, fieldWidth, opts, false, fieldWidth);
      }
      if (formatW != null && fieldWidth > formatW && NF) {
        return NF.formatGroupedShow(bits, opts.numericFormat, { elementWidth: formatW });
      }
    }

    if (DF) {
      const formatted = DF.formatDebugDisplayValue(bits, fieldWidth, opts, false, fieldWidth);
      if (formatted !== bits) return formatted;
    }

    if (typeof formatValueFn === 'function') return formatValueFn(bits, fieldWidth);
    return bits;
  }

  function appendSchemaArrayElementLines(lines, sliceBits, arrayNode, opts, formatValueFn, indent, subSchema) {
    const pad = '  '.repeat(indent);
    const ew = arrayNode.elementWidth;
    const emitElement = (indexLabel, elBits) => {
      const formatted = formatSchemaFieldValue(elBits, ew, opts, formatValueFn);
      lines.push(`${pad}:${indexLabel} = ${formatted} (${ew}bit)`);
      if (subSchema && subSchema.totalWidth === ew) {
        appendSchemaShowTreeLines(lines, elBits, subSchema, opts, formatValueFn, indent + 1);
      }
    };
    if (arrayNode.singleDim && arrayNode.rows === 1) {
      for (let i = 0; i < arrayNode.cols; i++) {
        emitElement(i, sliceBits.substring(i * ew, (i + 1) * ew));
      }
      return;
    }
    for (let r = 0; r < arrayNode.rows; r++) {
      for (let c = 0; c < arrayNode.cols; c++) {
        const idx = r * arrayNode.cols + c;
        emitElement(`${r}:${c}`, sliceBits.substring(idx * ew, (idx + 1) * ew));
      }
    }
  }

  function appendSchemaShowTreeLines(lines, bits, schema, opts, formatValueFn, indent) {
    ensureSchemaShape(schema);
    const pad = '  '.repeat(indent);
    const varArrayCounts = (opts && opts.varArrayCounts) || {};
    const offsets = schema.hasVarArray ? computeStructureOffsets(schema, varArrayCounts) : null;
    for (const node of schema.structure) {
      const nodeStart = offsets ? offsets.get(node.name) : node.bitStart;
      const nodeWidth = node.kind === 'var_array'
        ? node.elementWidth * (varArrayCounts[node.name] != null ? varArrayCounts[node.name] : node.minCount)
        : node.width;
      if (node.kind === 'leaf') {
        const fieldBits = bits.substring(nodeStart, nodeStart + node.width);
        const formatted = formatSchemaFieldValue(fieldBits, node.width, opts, formatValueFn);
        const padName = node.name.padEnd(Math.max(10 - indent * 2, 4), ' ');
        lines.push(`${pad}${padName}= ${formatted}`);
      } else if (node.kind === 'nested') {
        lines.push(`${pad}${node.name}`);
        const subBits = bits.substring(nodeStart, nodeStart + node.width);
        appendSchemaShowTreeLines(lines, subBits, node.schema, opts, formatValueFn, indent + 1);
      } else if (node.kind === 'array') {
        lines.push(`${pad}${node.name}`);
        const sliceBits = bits.substring(nodeStart, nodeStart + node.width);
        appendSchemaArrayElementLines(lines, sliceBits, node, opts, formatValueFn, indent + 1, node.elementSchema || null);
      } else if (node.kind === 'var_array') {
        lines.push(`${pad}${node.name}`);
        const count = varArrayCounts[node.name] != null ? varArrayCounts[node.name] : node.minCount;
        const sliceBits = bits.substring(nodeStart, nodeStart + nodeWidth);
        const runtimeNode = runtimeArrayNode(
          { ...node, bitStart: nodeStart },
          varArrayCounts,
          schema.name,
          { wireBits: bits, schema }
        );
        appendSchemaArrayElementLines(lines, sliceBits, runtimeNode, opts, formatValueFn, indent + 1, node.elementSchema || null);
        if (opts && opts.showVarArrayLength !== false) {
          if (isVarMatrixNode(node) || (runtimeNode.rows > 1 || runtimeNode.cols > 1) && !runtimeNode.singleDim) {
            lines.push(`${pad}${node.name} has shape [${runtimeNode.rows},${runtimeNode.cols}]`);
          } else {
            lines.push(`${pad}${node.name} has length [${count}]`);
          }
        }
      }
    }
  }

  function schemaArrayParentDisplayName(displayName, view) {
    if (view && view.parentDisplayName) return view.parentDisplayName;
    if (!displayName) return displayName;
    const lastColon = displayName.lastIndexOf(':');
    if (lastColon > 0) return displayName.substring(0, lastColon);
    return displayName;
  }

  function formatSchemaArrayRowSliceShow(bits, view, opts, formatValueFn, displayName) {
    const arrayNode = view.array;
    const lines = [];
    const headerValue = formatSchemaFieldValue(bits, view.width, opts, formatValueFn);
    lines.push(`${displayName} = ${headerValue} (${view.width}bit)`);
    const ew = arrayNode.elementWidth;
    const rowIdx = view.rowIndex;
    for (let c = 0; c < arrayNode.cols; c++) {
      const elBits = bits.substring(c * ew, (c + 1) * ew);
      const formatted = formatSchemaFieldValue(elBits, ew, opts, formatValueFn);
      lines.push(`:${rowIdx}:${c} = ${formatted} (${ew}bit)`);
      if (arrayNode.elementSchema) {
        appendSchemaShowTreeLines(lines, elBits, arrayNode.elementSchema, opts, formatValueFn, 1);
      }
    }
    const parentName = schemaArrayParentDisplayName(displayName, view);
    lines.push(`${parentName} has shape [${arrayNode.rows},${arrayNode.cols}]`);
    return lines;
  }

  function formatSchemaArrayColSliceShow(bits, view, opts, formatValueFn, displayName) {
    const arrayNode = view.array;
    const lines = [];
    const headerValue = formatSchemaFieldValue(bits, view.width, opts, formatValueFn);
    lines.push(`${displayName} = ${headerValue} (${view.width}bit)`);
    const ew = arrayNode.elementWidth;
    const colIdx = view.colIndex;
    for (let r = 0; r < arrayNode.rows; r++) {
      const elBits = bits.substring(r * ew, (r + 1) * ew);
      const formatted = formatSchemaFieldValue(elBits, ew, opts, formatValueFn);
      lines.push(`:${r}:${colIdx} = ${formatted} (${ew}bit)`);
      if (arrayNode.elementSchema) {
        appendSchemaShowTreeLines(lines, elBits, arrayNode.elementSchema, opts, formatValueFn, 1);
      }
    }
    const parentName = schemaArrayParentDisplayName(displayName, view);
    lines.push(`${parentName} has shape [${arrayNode.rows},${arrayNode.cols}]`);
    return lines;
  }

  function formatSchemaArraySliceShow(bits, view, opts, formatValueFn, displayName) {
    if (view.kind === 'array_row') {
      return formatSchemaArrayRowSliceShow(bits, view, opts, formatValueFn, displayName);
    }
    if (view.kind === 'array_col') {
      return formatSchemaArrayColSliceShow(bits, view, opts, formatValueFn, displayName);
    }
    const arrayNode = view.array;
    const lines = [];
    const headerValue = formatSchemaFieldValue(bits, view.width, opts, formatValueFn);
    lines.push(`${displayName} = ${headerValue} (${view.width}bit)`);
    appendSchemaArrayElementLines(lines, bits, arrayNode, opts, formatValueFn, 0, arrayNode.elementSchema || null);
    if (arrayNode.singleDim && arrayNode.rows === 1) {
      lines.push(`${displayName} has length [${arrayNode.elementCount}]`);
    } else {
      lines.push(`${displayName} has shape [${arrayNode.rows},${arrayNode.cols}]`);
    }
    return lines;
  }

  function formatSchemaShowTree(bits, schema, opts, formatValueFn, wireTypeLabel) {
    const lines = [];
    const header = wireTypeLabel
      ? `${wireTypeLabel}`
      : `${schema.totalWidth}wire<${schema.name}>`;
    lines.push(header);
    appendSchemaShowTreeLines(lines, bits, schema, opts, formatValueFn, 1);
    return lines;
  }

  function formatSchemaShowLines(bits, schema, opts, formatValueFn, wireTypeLabel) {
    ensureSchemaShape(schema);
    if (schema.structure.some((n) => n.kind === 'nested' || n.kind === 'array' || n.kind === 'var_array')) {
      return formatSchemaShowTree(bits, schema, opts, formatValueFn, wireTypeLabel);
    }
    const lines = [];
    const header = wireTypeLabel
      ? `${wireTypeLabel}`
      : `${schema.totalWidth}wire<${schema.name}>`;
    lines.push(header);
    for (const field of schema.fields) {
      const fieldBits = extractFieldPath(bits, schema, field.path || [field.name]);
      const formatted = formatSchemaFieldValue(fieldBits, field.width, opts, formatValueFn);
      const padName = field.name.padEnd(10, ' ');
      lines.push(`  ${padName}= ${formatted}`);
    }
    return lines;
  }

  function formatSchemaShowInlineFlat(bits, schema, opts, formatValueFn) {
    ensureSchemaShape(schema);
    const parts = [];
    const entries = [...schema.leafPaths.entries()].sort((a, b) => a[1].bitStart - b[1].bitStart);
    for (const [, info] of entries) {
      const fieldBits = bits.substring(info.bitStart, info.bitStart + info.width);
      const formatted = formatSchemaFieldValue(fieldBits, info.width, opts, formatValueFn);
      parts.push(`${info.name}=${formatted}`);
    }
    return parts.join(' ');
  }

  function formatSchemaShowInline(bits, schema, opts, formatValueFn) {
    return formatSchemaShowInlineFlat(bits, schema, opts, formatValueFn);
  }

  function formatLiteralFieldValue(bits, width) {
    if (!bits || !/^[01]+$/.test(bits)) return bits;
    if (width <= 1) return bits;
    const val = parseInt(bits, 2);
    if (width <= 6) return `\\${val}`;
    if (width % 4 === 0) {
      const hexLen = width / 4;
      const hex = val.toString(16).toUpperCase().padStart(hexLen, '0');
      return `^${hex}`;
    }
    return bits;
  }

  function appendCopyLiteralParts(parts, bits, schema) {
    ensureSchemaShape(schema);
    for (const node of schema.structure) {
      if (node.kind === 'leaf') {
        const fieldBits = bits.substring(node.bitStart, node.bitStart + node.width);
        parts.push(`${node.name}=${formatLiteralFieldValue(fieldBits, node.width)}`);
      } else if (node.kind === 'nested') {
        const subBits = bits.substring(node.bitStart, node.bitStart + node.width);
        const subParts = [];
        appendCopyLiteralParts(subParts, subBits, node.schema);
        parts.push(`${node.name}={ ${subParts.join(' ')} }<${node.schema.name}>`);
      }
    }
  }

  function formatSchemaCopyLiteral(bits, schema, opts) {
    ensureSchemaShape(schema);
    const parts = [];
    appendCopyLiteralParts(parts, bits, schema);
    const assignPrefix = opts && opts.wireName ? `${opts.wireName} = ` : '';
    return `${assignPrefix}{ ${parts.join(' ')} }<${schema.name}>`;
  }

  const SCHEMA_DOC_INDENT = '    ';

  function formatMatrixVarDimSuffix(rowsSpec, colsSpec) {
    const fmt = (d) => {
      if (!d) return '';
      if (d.var) return d.max != null ? `${d.min}-${d.max}` : `${d.min}-`;
      return String(d.fixed);
    };
    return `[${fmt(rowsSpec)},${fmt(colsSpec)}]`;
  }

  function formatVarArrayDimSuffix(spec) {
    if (spec.matrixVar && spec.rowsSpec && spec.colsSpec) {
      return formatMatrixVarDimSuffix(spec.rowsSpec, spec.colsSpec);
    }
    return spec.maxCount == null ? `[${spec.minCount}-]` : `[${spec.minCount}-${spec.maxCount}]`;
  }

  function schemaDocPad(depth) {
    return SCHEMA_DOC_INDENT.repeat(Math.max(0, depth));
  }

  function schemaRawFieldList(schema) {
    ensureSchemaShape(schema);
    if (schema.rawFields && schema.rawFields.length) return schema.rawFields;
    const fields = [];
    for (const node of schema.structure) {
      if (node.kind === 'leaf') fields.push({ kind: 'leaf', name: node.name, width: node.width });
      else if (node.kind === 'nested') fields.push({ kind: 'nested', name: node.name, ref: node.schema.name });
      else if (node.kind === 'array' && node.elementSchemaRef) {
        fields.push({
          kind: 'schema_array',
          name: node.name,
          ref: node.elementSchemaRef,
          rows: node.rows,
          cols: node.cols,
          singleDim: node.singleDim,
        });
      } else if (node.kind === 'array') {
        fields.push({
          kind: 'array',
          name: node.name,
          elementWidth: node.elementWidth,
          rows: node.rows,
          cols: node.cols,
          singleDim: node.singleDim,
        });
      } else if (node.kind === 'var_array') {
        fields.push({
          kind: 'var_array',
          name: node.name,
          elementWidth: node.elementWidth,
          minCount: node.minCount,
          maxCount: node.maxCount,
          singleDim: node.singleDim,
          matrixVar: node.matrixVar,
          rowsSpec: node.rowsSpec,
          colsSpec: node.colsSpec,
          ref: node.elementSchemaRef,
        });
      }
    }
    return fields;
  }

  function appendSchemaDocImportBlock(lines, refName, registry, depth, visited) {
    const blockPad = schemaDocPad(depth);
    if (visited.has(refName)) {
      lines.push(`${blockPad}<${refName}>: (already shown)`);
      return;
    }
    if (!registry || !registry.has(refName)) {
      lines.push(`${blockPad}<${refName}>: (not defined)`);
      return;
    }
    const sub = ensureSchemaShape(registry.get(refName));
    const subVisited = new Set(visited);
    subVisited.add(refName);
    lines.push(`${blockPad}<${refName}>:`);
    for (const subSpec of schemaRawFieldList(sub)) {
      appendSchemaDocFieldLines(lines, subSpec, registry, depth + 1, subVisited);
    }
    lines.push(`${blockPad}(${sub.totalWidth}bit)`);
  }

  function appendSchemaDocFieldLines(lines, spec, registry, depth, visited) {
    const pad = schemaDocPad(depth);
    if (spec.kind === 'leaf') {
      lines.push(`${pad}${spec.name}:${spec.width}`);
      return;
    }
    if (!registry || registry.size === 0) {
      if (spec.kind === 'merge') lines.push(`${pad}<${spec.ref}>`);
      else if (spec.kind === 'nested') lines.push(`${pad}${spec.name}:<${spec.ref}>`);
      return;
    }
    if (spec.kind === 'nested') {
      lines.push(`${pad}${spec.name}:`);
      appendSchemaDocImportBlock(lines, spec.ref, registry, depth + 1, visited);
      return;
    }
    if (spec.kind === 'schema_array') {
      const dim = spec.singleDim ? `[${spec.cols}]` : `[${spec.rows},${spec.cols}]`;
      lines.push(`${pad}${spec.name}:<${spec.ref}>${dim}`);
      return;
    }
    if (spec.kind === 'schema_var_array' || spec.kind === 'var_array') {
      const range = formatVarArrayDimSuffix(spec);
      if (spec.kind === 'schema_var_array' || spec.ref) {
        lines.push(`${pad}${spec.name}:<${spec.ref}>${range}`);
      } else {
        lines.push(`${pad}${spec.name}:${spec.elementWidth}${range}`);
      }
      return;
    }
    if (spec.kind === 'merge') {
      appendSchemaDocImportBlock(lines, spec.ref, registry, depth, visited);
    }
  }

  function formatSchemaDocLines(schema, registry) {
    ensureSchemaShape(schema);
    const lines = [`<${schema.name}>:`];
    const visited = new Set([schema.name]);
    for (const spec of schemaRawFieldList(schema)) {
      appendSchemaDocFieldLines(lines, spec, registry, 1, visited);
    }
    lines.push(':');
    lines.push(`(${schema.totalWidth}bit)`);
    return lines;
  }

  function formatSchemaIndexLines(registry) {
    const lines = [];
    if (!registry || registry.size === 0) {
      lines.push('(no schemas defined)');
    } else {
      const names = [...registry.keys()].sort();
      for (const n of names) lines.push(`schema.${n}`);
    }
    lines.push('');
    lines.push('schema.none — reserved (see doc(schema.none))');
    return lines;
  }

  function formatSchemaNoneDocLines() {
    return [
      '<none> is not a schema — reserved tag for show / peek / probe to use no schema information',
    ];
  }

  function parseSchemaFieldLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return null;
    const m = /^(\w+)\s*:\s*(\d+)\s*$/.exec(trimmed);
    if (!m) throw new Error(`Invalid schema field line: '${trimmed}'`);
    return { kind: 'leaf', name: m[1], width: parseInt(m[2], 10) };
  }

  function registerSchema(registry, schemaDef) {
    if (!registry) throw new Error('schema registry missing');
    assertSchemaNameAllowed(schemaDef.name);
    if (registry.has(schemaDef.name)) {
      throw new Error(`Duplicate schema '${schemaDef.name}'`);
    }
    ensureSchemaShape(schemaDef);
    registry.set(schemaDef.name, schemaDef);
    return schemaDef;
  }

  function mergeSchemaIntoRegistry(registry, schemaDef) {
    if (!registry) throw new Error('schema registry missing');
    ensureSchemaShape(schemaDef);
    if (registry.has(schemaDef.name)) {
      throw new Error(`Duplicate schema '${schemaDef.name}'`);
    }
    registry.set(schemaDef.name, schemaDef);
    return schemaDef;
  }

  function resolveSchema(registry, name) {
    if (!registry || !name) return null;
    const schema = registry.get(name);
    if (!schema) throw new Error(`Unknown schema '${name}'`);
    return ensureSchemaShape(schema);
  }

  function atomSchemaFieldPath(atom) {
    if (!atom) return null;
    if (atom.schemaFieldPath && atom.schemaFieldPath.length) return atom.schemaFieldPath;
    if (atom.schemaField) return [atom.schemaField];
    return null;
  }

  const api = {
    buildSchemaDef,
    resolveSchemaComposition,
    resolveSchemaDecls,
    collectSchemaDeclsFromStmts,
    validateSchemaWidth,
    validateSchemaWidthForShow,
    getField,
    resolveFieldPath,
    resolveSchemaView,
    resolveSchemaFieldView,
    gatherSchemaArrayColumnBits,
    scatterSchemaArrayColumnBits,
    findLeafPathInfo,
    extractField,
    extractFieldPath,
    packField,
    packFieldPath,
    validateFieldBits,
    unsignedBitsToInt,
    buildSchemaLiteralBits,
    formatSchemaFieldValue,
    formatSchemaShowLines,
    formatSchemaShowTree,
    formatSchemaArraySliceShow,
    formatSchemaArrayRowSliceShow,
    formatSchemaArrayColSliceShow,
    appendSchemaShowTreeLines,
    appendSchemaArrayElementLines,
    formatSchemaShowInline,
    formatSchemaShowInlineFlat,
    formatSchemaCopyLiteral,
    formatSchemaDocLines,
    formatSchemaIndexLines,
    formatSchemaNoneDocLines,
    parseSchemaFieldLine,
    registerSchema,
    mergeSchemaIntoRegistry,
    resolveSchema,
    atomSchemaFieldPath,
    ensureSchemaShape,
    assertSchemaNameAllowed,
    validateVarArrayCount,
    computeStructureOffsets,
    assertPriorVarArrayCounts,
    countFromFieldBits,
    resolveFlatVarArrayCounts,
    runtimeArrayNode,
    isVarArrayNode,
    isVarMatrixNode,
    validateGroupedLiteralShape,
    resolveMatrixShapeFromCount,
    applySchemaMinMaxMeta,
    RESERVED_SCHEMA_NAMES,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptSemanticSchemas = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global);
