'use strict';

const ia = require('../../core/interp-assembler.js');
if (typeof globalThis.LogTScriptNumericFormats === 'undefined') {
  globalThis.LogTScriptNumericFormats = require('../../core/numeric-formats.js');
}
const ie = require('../js/interp_doc_verify_globals.js');

const BUILTIN_CORE = [
  '<MapProbe>+:',
  '    pad: 8',
  ':',
  'inline [interp] .mapDemo {',
  '    MapProbe(pad/u8) {',
  '        inner = {};',
  '        inner["x"] = 1;',
  '        env["hits"] = 10;',
  '        env["nested"] = inner;',
  '        return vectorLen(getKeys(env));',
  '    }',
  '}',
  '8wire<MapProbe> w = ^00',
  '8wire result = .mapDemo:eval(w, <MapProbe>)',
  'show(result)',
].join('\n');

function execMethodBody(methodBody, method) {
  const inst = ia.parseInterpBody(methodBody);
  const env = { env: {} };
  const opts = {
    evaluationMap: new Map(),
    savedHandles: new Map(),
    registry: null,
    program: inst,
    sharedEnv: env,
  };
  let result;
  ie.interpRunWithContext(opts, () => {
    result = ie.interpExecuteMethod(inst.methods[method], [], inst, env, opts);
  });
  return { result, savedHandles: opts.savedHandles };
}

module.exports = {
  doc: 'interp-builtins.md',
  cases: [
    {
      name: 'getKeys env flat default',
      src: BUILTIN_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  inner = {}; inner["x"] = 1;',
          '  env["hits"] = 10; env["nested"] = inner;',
          '  return vectorLen(getKeys(env));',
          '}',
        ].join('\n'),
        'MapProbe',
      ).result === 1,
    },
    {
      name: 'getValues homogeneous map',
      src: BUILTIN_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  myList = {}; myList["x"] = 5; myList["y"] = 6;',
          '  return vectorLen(getValues(myList));',
          '}',
        ].join('\n'),
        'MapProbe',
      ).result === 2,
    },
    {
      name: 'unset map key',
      src: BUILTIN_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  myList = {}; myList["a"] = 1;',
          '  unset: myList["a"];',
          '  return vectorLen(getKeys(myList));',
          '}',
        ].join('\n'),
        'MapProbe',
      ).result === 0,
    },
    {
      name: 'hasKey env present and missing',
      src: BUILTIN_CORE,
      check: () => {
        const hit = execMethodBody(
          'MapProbe(pad/u8) { env["hits"] = 10; return hasKey(env, "hits"); }',
          'MapProbe',
        ).result === 1;
        const miss = execMethodBody(
          'MapProbe(pad/u8) { return hasKey(env, "hits"); }',
          'MapProbe',
        ).result === 0;
        return hit && miss;
      },
    },
    {
      name: 'hasIndex bounds',
      src: BUILTIN_CORE,
      check: () => {
        const inB = execMethodBody(
          'MapProbe(pad/u8) { arr = [1, 2]; return hasIndex(arr, 0); }',
          'MapProbe',
        ).result === 1;
        const oob = execMethodBody(
          'MapProbe(pad/u8) { arr = [1, 2]; return hasIndex(arr, 9); }',
          'MapProbe',
        ).result === 0;
        return inB && oob;
      },
    },
    {
      name: 'has slot present',
      src: BUILTIN_CORE,
      check: () => {
        const inst = ia.parseInterpBody('HasSlot(pad/u8) { return has:txBody; }');
        const savedHandles = new Map();
        savedHandles.set('txBody', ie.interpMakeNodeHandle({
          kind: 'leaf', schemaRef: 'byte', payloadBits: '00000001', pathKey: 'r/t', fieldName: 't',
        }));
        const env = { env: {} };
        const opts = {
          evaluationMap: new Map(),
          savedHandles,
          registry: null,
          program: inst,
          sharedEnv: env,
        };
        let result;
        ie.interpRunWithContext(opts, () => {
          result = ie.interpExecuteMethod(inst.methods.HasSlot, [], inst, env, opts);
        });
        return result === 1;
      },
    },
    {
      name: 'setKeysValues merge and return count',
      src: BUILTIN_CORE,
      check: () => {
        const r = execMethodBody(
          [
            'MapProbe(pad/u8) {',
            '  myList = {}; myList["old"] = 1;',
            '  n = setKeysValues(myList, ["new"], [2]);',
            '  return n + myList["old"] + myList["new"];',
            '}',
          ].join('\n'),
          'MapProbe',
        );
        return r.result === 5;
      },
    },
    {
      name: 'setKeysValues empty vectors no-op',
      src: BUILTIN_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  myList = {}; myList["a"] = 1;',
          '  setKeysValues(myList, [], []);',
          '  return vectorLen(getKeys(myList));',
          '}',
        ].join('\n'),
        'MapProbe',
      ).result === 1,
    },
    {
      name: 'toInt and toString cast',
      src: BUILTIN_CORE,
      check: () => {
        const r = execMethodBody(
          [
            'MapProbe(pad/u8) {',
            '  n = toInt("10");',
            '  b = toBool("false");',
            '  s = toString(n);',
            '  return toInt(s) + b;',
            '}',
          ].join('\n'),
          'MapProbe',
        );
        return r.result === 10;
      },
    },
    {
      name: 'typeOf map int string',
      src: BUILTIN_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  myList = {};',
          '  hits = 0;',
          '  if (typeOf(myList) == "map") { hits = hits + 1; }',
          '  if (typeOf(42) == "int") { hits = hits + 1; }',
          '  if (typeOf("x") == "string") { hits = hits + 1; }',
          '  return hits;',
          '}',
        ].join('\n'),
        'MapProbe',
      ).result === 3,
    },
    {
      name: 'split destructure',
      src: BUILTIN_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  a, b = split("hello", 2);',
          '  return vectorLen(explode(a + b, ""));',
          '}',
        ].join('\n'),
        'MapProbe',
      ).result === 5,
    },
    {
      name: 'implode explode round-trip',
      src: BUILTIN_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  blob = implode(["a", "b"], "\\0");',
          '  parts = explode(blob, "\\0");',
          '  return vectorLen(parts);',
          '}',
        ].join('\n'),
        'MapProbe',
      ).result === 2,
    },
    {
      name: 'explode empty text and implode empty vector',
      src: BUILTIN_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  e = implode([], "|");',
          '  z = explode("", "|");',
          '  return vectorLen(z) + vectorLen(explode("ab", ""));',
          '}',
        ].join('\n'),
        'MapProbe',
      ).result === 2,
    },
    {
      name: 'unset save slot',
      src: BUILTIN_CORE,
      check: () => {
        const inst = ia.parseInterpBody('ClearSlot(pad/u8) { unset: txBody; return 0; }');
        const savedHandles = new Map();
        savedHandles.set('txBody', ie.interpMakeNodeHandle({
          kind: 'leaf', schemaRef: 'byte', payloadBits: '00000001', pathKey: 'r/t', fieldName: 't',
        }));
        const env = { env: {} };
        const opts = {
          evaluationMap: new Map(),
          savedHandles,
          registry: null,
          program: inst,
          sharedEnv: env,
        };
        ie.interpRunWithContext(opts, () => {
          ie.interpExecuteMethod(inst.methods.ClearSlot, [], inst, env, opts);
        });
        return !savedHandles.has('txBody');
      },
    },
  ],
};
