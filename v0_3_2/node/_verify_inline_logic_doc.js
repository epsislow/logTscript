'use strict';
/**
 * Run logts-play examples from doc/inline-logic.md and report pass/fail.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { ROOT } = require('./js/paths');
const { TEST_RUNTIME_SCRIPTS } = require(path.join(ROOT, 'tests', 'test_runtime_bundle_generated.js'));
const { createTestNodeSandbox } = require('./js/test_node_sandbox');

const md = fs.readFileSync(path.join(ROOT, 'doc', 'inline-logic.md'), 'utf8');
const blocks = [];
const re = /```logts-play\n([\s\S]*?)```/g;
let m;
while ((m = re.exec(md))) {
  blocks.push(m[1].trim());
}

const sandbox = createTestNodeSandbox({ verbose: false });
vm.createContext(sandbox);
for (const script of TEST_RUNTIME_SCRIPTS) {
  vm.runInContext(fs.readFileSync(script, 'utf8'), sandbox, { filename: script });
}

const results = [];
let index = 0;

for (const src of blocks) {
  index++;
  const label = `block-${index}`;
  const firstLine = src.split('\n').find((l) => l.trim()) || '';
  const session = sandbox.LogTScriptTestSuite.createSession();
  let err = null;
  let out = [];
  try {
    session.run(src);
    out = session.out || [];
  } catch (e) {
    err = e;
  }
  const snippet = firstLine.slice(0, 60);
  results.push({ index, label, snippet, err, out, src });
}

// Focus checks on list + compound sections (blocks 7–35 approx) with expected output hints
const explicit = [
  {
    name: 'list-unify [A,B]',
    src: `inline [logic] .world:
    query q: [A, B] = [red, green], show(A, B)
:
comp [logic] .worldLogic: on: 1 .world { } :
1wire trigger = 1
.worldLogic:{ query = q set = trigger }`,
    expect: ['red green'],
  },
  {
    name: 'member allColors',
    src: `inline [logic] .world:
    colors([red, green, blue])
    query allColors: colors(L), member(C, L), show(C)
:
comp [logic] .worldLogic: on: 1 .world { } :
1wire trigger = 1
.worldLogic:{ query = allColors set = trigger }`,
    expect: ['red', 'green', 'blue'],
  },
  {
    name: 'mono firstProp',
    src: `inline [logic] .mono:
    proprietati([prop(mediterranean, rents(2, 10, 30, 90, 160, 250), 50, 50)])
    query firstProp: proprietati([prop(N, _, _, _) | _]), show(N)
:
comp [logic] .monoLogic: on: 1 .mono { } :
1wire trigger = 1
.monoLogic:{ query = firstProp set = trigger }`,
    expect: ['mediterranean'],
  },
  {
    name: 'head-tail split',
    src: `inline [logic] .world:
    route([n, e, s, w])
    query split: route([Head | Tail]), show(Head, Tail)
:
comp [logic] .worldLogic: on: 1 .world { } :
1wire trigger = 1
.worldLogic:{ query = split set = trigger }`,
    expect: ['n'],
  },
  {
    name: 'middle [_,X,_]',
    src: `inline [logic] .world:
    items([alpha, beta, gamma])
    query middle: items([_, X, _]), show(X)
:
comp [logic] .worldLogic: on: 1 .world { } :
1wire trigger = 1
.worldLogic:{ query = middle set = trigger }`,
    expect: ['beta'],
  },
  {
    name: 'walk recursive',
    src: `inline [logic] .world:
    colors([red, green, blue])
    walk([]) <- show("done")
    walk([H | T]) <- show(H), walk(T)
    query demo: colors(L), walk(L)
:
comp [logic] .worldLogic: on: 1 .world { } :
1wire trigger = 1
.worldLogic:{ query = demo set = trigger }`,
    expect: ['red', 'green', 'blue', 'done'],
  },
  {
    name: 'sumList',
    src: `inline [logic] .world:
    sumList([], 0)
    sumList([H | T], Total) <- sumList(T, Rest), Total is H + Rest
    data([1, 2, 3, 4])
    query total: data(L), sumList(L, S), show(S)
:
comp [logic] .worldLogic: on: 1 .world { } :
1wire trigger = 1
.worldLogic:{ query = total set = trigger }`,
    expect: ['10'],
  },
  {
    name: 'last recursive',
    src: `inline [logic] .world:
    last([X], X)
    last([_ | T], X) <- last(T, X)
    route([n, e, s])
:
1wire ok = .world:query({ route(L), last(L, X), show(X) })`,
    expect: ['s'],
  },
  {
    name: 'nested pairs',
    src: `inline [logic] .world:
    pairs([pair(a, [1, 2]), pair(b, [3])])
:
1wire ok = .world:query({ pairs([pair(N, Ls) | _]), show(N, Ls) })`,
    expect: ['a [1, 2]'],
  },
  {
    name: 'carInfo toyotaYears',
    src: `inline [logic] .world:
    carInfo(toyota, red, 2020, sedan)
    carInfo(ford, blue, 2018, truck)
    carInfo(toyota, silver, 2020, coupe)
    query toyotaYears: carInfo(toyota, _, Year, _), show(Year)
:
comp [logic] .worldLogic: on: 1 .world { } :
1wire trigger = 1
.worldLogic:{ query = toyotaYears set = trigger }`,
    expect: ['2020'],
  },
  {
    name: 'located zone nested',
    src: `inline [logic] .world:
    located(box1, zone(2, east))
    located(box2, zone(5, west))
:
1wire ok = .world:query({ located(Box, zone(Id, Name)), show(Box, Id, Name) })`,
    expect: ['box1 2 east', 'box2 5 west'],
  },
  {
    name: 'board firstRent',
    src: `inline [logic] .mono:
    board([prop(mediterranean, rents(2, 10, 30, 90, 160, 250), 50, 50)])
    query firstRent: board([prop(Name, rents(R1, R2, _, _, _, _), _, _) | _]), show(Name, R1, R2)
:
comp [logic] .monoLogic: on: 1 .mono { } :
1wire trigger = 1
.monoLogic:{ query = firstRent set = trigger }`,
    expect: ['mediterranean 2 10'],
  },
  {
    name: 'shape rect',
    src: `inline [logic] .world:
    shape(rect(w(10), h(20)))
:
1wire ok = .world:query({ shape(rect(w(W), h(H))), show(W, H) })`,
    expect: ['10 20'],
  },
  {
    name: 'twoHop edges',
    src: `inline [logic] .world:
    edge(from(a), to(b))
    edge(from(b), to(c))
    edge(from(a), to(d))
:
1wire ok = .world:query({ edge(from(a), to(M)), edge(from(M), to(Goal)), show(Goal) })`,
    expect: ['c'],
  },
  {
    name: 'nodeVal tree',
    src: `inline [logic] .world:
    node(leaf(3))
    node(leaf(7))
    node(branch(leaf(1), leaf(9)))
    nodeVal(leaf(V), V)
    nodeVal(branch(L, R), Sum) <- nodeVal(L, A), nodeVal(R, B), Sum is A + B
:
1wire ok = .world:query({ node(T), nodeVal(T, S), show(S) })`,
    expect: ['3', '7', '10'],
  },
  {
    name: 'inside show compound',
    src: `inline [logic] .world:
    inside(john, johnsCar)
:
1wire ok = .world:query({ inside(Person, Place), show(inside(Person, Place)) })`,
    expect: ['inside(john, johnsCar)'],
  },
  {
    name: 'dataPacket rule',
    src: `inline [logic] .world:
    packet(header(type(data)), payload([1, 2, 3]))
    packet(header(type(ack)), payload([]))
    dataPacket(P) <- packet(header(type(data)), P)
:
1wire ok = .world:query({ dataPacket(Body), show(Body) })`,
    expect: ['[1, 2, 3]'],
  },
  {
    name: 'warehouse constraint',
    src: `inline [logic] .warehouse:
    object(box1)
    container(c1)
    inside(box1, c1)
    constraint inside(Object, Container) <= object(Object), container(Container)
    query hasInside: inside(box1, c1)
:
comp [logic] .whLogic: on: 1 .warehouse { } :
1wire flag = 0
1wire trigger = 1
.whLogic:{ hasInside >= flag set = trigger }`,
    expect: [],
    wire: { flag: '1' },
  },
];

function runExplicit(caseDef) {
  const session = sandbox.LogTScriptTestSuite.createSession();
  let err = null;
  let out = [];
  try {
    const r = session.run(caseDef.src);
    out = r.out || session.out || [];
  } catch (e) {
    err = e;
  }
  const text = out.join('\n');
  let pass = !err;
  if (pass && caseDef.expect && caseDef.expect.length) {
    pass = caseDef.expect.every((s) => text.includes(s));
  }
  if (pass && caseDef.wire) {
    for (const [w, v] of Object.entries(caseDef.wire)) {
      const got = session.getWire(session.interp, w);
      if (got !== v) pass = false;
    }
  }
  return { name: caseDef.name, pass, err, out: text, expect: caseDef.expect, wire: caseDef.wire };
}

console.log('=== All logts-play blocks (parse + run, no throw) ===');
let blockFails = 0;
for (const r of results) {
  const ok = !r.err;
  if (!ok) blockFails++;
  console.log(`${ok ? 'OK' : 'FAIL'} #${r.index} ${r.snippet}${r.err ? ' — ' + r.err.message : ''}`);
}
console.log(`Blocks: ${blocks.length - blockFails}/${blocks.length} ran without throw\n`);
if (blockFails) {
  console.log('--- Failed block sources ---');
  for (const r of results.filter((x) => x.err)) {
    console.log(`\n#${r.index} ${r.err.message}\n${r.src}\n`);
  }
}

console.log('=== Explicit output checks ===');
let explicitFails = 0;
const explicitResults = [];
for (const c of explicit) {
  const r = runExplicit(c);
  explicitResults.push(r);
  if (!r.pass) explicitFails++;
  console.log(`${r.pass ? 'OK' : 'FAIL'} ${r.name}${!r.pass ? '\n  expect: ' + JSON.stringify(c.expect) + (c.wire ? ' wire=' + JSON.stringify(c.wire) : '') + '\n  out: ' + r.out.slice(0, 200) + (r.err ? '\n  err: ' + r.err.message : '') : ''}`);
}

console.log(`\nExplicit: ${explicit.length - explicitFails}/${explicit.length} passed`);
process.exit(blockFails + explicitFails > 0 ? 1 : 0);
