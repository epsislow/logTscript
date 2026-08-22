'use strict';

/** Extra output/wire checks for doc/inline-logic.md (lists, compound, constraints). */
module.exports = {
  cases: [
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
      wires: { flag: '1' },
    },
  ],
};
