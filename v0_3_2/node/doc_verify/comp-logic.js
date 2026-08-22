'use strict';

/** Extra wire/output checks for doc/comp-logic.md (beyond logts-play no-throw). */
module.exports = {
  // Many comp-logic logts-play blocks are partial Load & Run snippets (matrix dims, etc.).
  skipBlocks: true,
  cases: [
    {
      name: 'scalar bool text number pins',
      src: `inline [logic] .plant:
    level(tank1, 75)
    mode(tank1, auto)
    sensor(alarm, 0)
    query levelOk: level(tank1, N), N =< 80
    query modeMatch: mode(tank1, M)
    query alarmOff: sensor(alarm, F), F = 0
:
comp [logic] .plantLogic:
    on: 1
    .plant {
        N is number levelPin
        M is text modePin
        F is bool sensePin
    }
:
8wire levelWire = 01001011
32wire modeWire = 01100001011101010111010001101111
1wire senseWire = 0
1wire okLevel = 0
1wire okMode = 0
1wire okAlarm = 0
1wire trigger = 1
.plantLogic:{
    levelPin = levelWire
    modePin = modeWire
    sensePin = senseWire
    levelOk >= okLevel
    modeMatch >= okMode
    alarmOff >= okAlarm
    set = trigger
}`,
      wires: { okLevel: '1', okMode: '1', okAlarm: '1' },
    },
    {
      name: 'chained text number comps',
      src: `inline [logic] .world:
    age(john, 25)
    age(mary, 30)
    query allAges: age(X, Y)
    query lookupAge: age(X, Y)
:
comp [logic] .worldFetch: on: 1 .world { } :
comp [logic] .worldLookup: on: 1 .world { X is text myX } :
32wire nameSlot = 00000000000000000000000000000000
8wire ageOut = 00000000
1wire trigger = 1
.worldFetch:{ allAges:0:0 >= nameSlot set = trigger }
.worldLookup:{ myX = nameSlot lookupAge:0 >= ageOut set = trigger }`,
      wires: { ageOut: '00011001' },
    },
    {
      name: 'text list pin',
      src: `inline [logic] .routes:
    path(a, [n, e, s])
    query route: path(a, Nodes)
:
comp [logic] .routeLogic:
    on: 1
    .routes { Nodes is text list routePin }
:
8wire[4] routeIn = 01101110011001010111001100000000
8wire[4] routeOut = 00000000000000000000000000000000
1wire trigger = 1
.routeLogic:{ routePin = routeIn route >= routeOut set = trigger }`,
      check: (i) => i.getWireEffectiveValue('routeOut').slice(0, 8) === '01101110',
    },
    {
      name: 'number list pin',
      src: `inline [logic] .scores:
    batch(a, [10, 20, 30])
    query batchQ: batch(a, Scores)
:
comp [logic] .scoreLogic:
    on: 1
    .scores { Scores is number list scorePin }
:
16wire[3] scoreIn = 000000000000101000000000000101000000000000011110
16wire[3] scoreOut = 000000000000000000000000000000000000000000000000
1wire trigger = 1
.scoreLogic:{ scorePin = scoreIn batchQ >= scoreOut set = trigger }`,
      check: (i) => i.getWireEffectiveValue('scoreOut').slice(0, 16) === '0000000000001010',
    },
    {
      name: 'bool list pin verify',
      src: `inline [logic] .flags:
    flags(unit1, [1, 0, 1, 1])
    query match: flags(unit1, F)
:
comp [logic] .flagLogic:
    on: 1
    .flags { F is bool list flagPin }
:
4wire flagWire = 1011
1wire ok = 0
1wire trigger = 1
.flagLogic:{ flagPin = flagWire match >= ok set = trigger }`,
      wires: { ok: '1' },
    },
    {
      name: 'bool list vector out',
      src: `inline [logic] .flags:
    flags(unit1, [1, 0, 1, 1])
    query match: flags(unit1, F)
:
comp [logic] .flagLogic:
    on: 1
    .flags { F is bool list flagPin }
:
4wire flagWire = 1011
1wire[4] flagOut = 0000
1wire trigger = 1
.flagLogic:{ flagPin = flagWire match >= flagOut set = trigger }`,
      check: (i) => i.getWireEffectiveValue('flagOut') === '1011',
    },
    {
      name: 'compound zone query',
      src: `inline [logic] .yard:
    located(crate1, zone(3, east))
    query zoneId: located(crate1, zone(Z, Name))
:
comp [logic] .yardLogic:
    on: 1
    .yard { }
:
8wire zoneOut = 00000000
32wire nameOut = 00000000000000000000000000000000
1wire trigger = 1
.yardLogic:{ zoneId:0 >= zoneOut zoneId:0:1 >= nameOut set = trigger }`,
      check: (i) => i.getWireEffectiveValue('zoneOut') === '00000011',
    },
    {
      name: 'constraint mutation',
      src: `inline [logic] .warehouse:
    object(box1)
    object(box2)
    container(c1)
    container(c2)
    inside(box1, c1)
    constraint inside(Object, Container) <= object(Object), container(Container)
    query hasBox2: inside(box2, c1)
:
comp [logic] .whLogic: on: 1 .warehouse { } :
1wire ok = 0
1wire failed = 0
1wire trigger = 1
.whLogic:{
    logic { + inside(box2, c1) }
    hasBox2 >= ok
    mutationFailed >= failed
    set = trigger
}`,
      wires: { ok: '1', failed: '0' },
    },
    {
      name: 'use as alias',
      src: `inline [logic] .vehicles:
    wheeled(car)
:
inline [logic] .fleet:
    use .vehicles as veh
    query hasCar: veh.wheeled(car)
    query hasBike: veh.wheeled(bike)
:
comp [logic] .fleetLogic: on: 1 .fleet { } :
1wire carOk = 0
1wire bikeOk = 0
1wire trigger = 1
.fleetLogic:{ hasCar >= carOk hasBike >= bikeOk set = trigger }`,
      wires: { carOk: '1', bikeOk: '0' },
    },
  ],
};
