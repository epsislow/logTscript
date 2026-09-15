'use strict';

const ia = require('../../core/interp-assembler.js');
const ie = require('../js/interp_doc_verify_globals.js');

const MAP_CORE = [
  '<MapProbe>+:',
  '    pad: 8',
  ':',
  'inline [interp] .mapDemo {',
  '    MapProbe(pad/u8) {',
  '        myList = {};',
  '        myList["a"] = 42;',
  '        return myList["a"];',
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
  return result;
}

module.exports = {
  doc: 'interp-maps.md',
  cases: [
    {
      name: 'map init string key assign',
      src: MAP_CORE,
      check: () => execMethodBody(
        'MapProbe(pad/u8) { myList = {}; myList["a"] = 42; return myList["a"]; }',
        'MapProbe',
      ) === 42,
    },
    {
      name: 'auto-vivify on first assign',
      src: MAP_CORE,
      check: () => execMethodBody(
        'MapProbe(pad/u8) { myList["k"] = 7; return myList["k"]; }',
        'MapProbe',
      ) === 7,
    },
    {
      name: 'env nested map read',
      src: MAP_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  inner = {};',
          '  inner["x"] = 9;',
          '  env["nested"] = inner;',
          '  return env["nested"]["x"];',
          '}',
        ].join('\n'),
        'MapProbe',
      ) === 9,
    },
    {
      name: 'vector pop assign and clear',
      src: MAP_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  myVec = [1, 2];',
          '  x = myVec[-];',
          '  myVec[*];',
          '  return x + vectorLen(myVec);',
          '}',
        ].join('\n'),
        'MapProbe',
      ) === 2,
    },
    {
      name: 'map pop destructure',
      src: MAP_CORE,
      check: () => execMethodBody(
        [
          'MapProbe(pad/u8) {',
          '  myMap = {};',
          '  myMap["a"] = 1;',
          '  myMap["b"] = 2;',
          '  k, v = myMap[-];',
          '  return v + vectorLen(getKeys(myMap));',
          '}',
        ].join('\n'),
        'MapProbe',
      ) === 3,
    },
  ],
};
