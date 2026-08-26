'use strict';

/** Extra checks for doc/mini-monopoly-logic.md */
module.exports = {
  cases: [
    {
      name: 'turn swap p1 to p2',
      src: `inline [logic] .mono:

    turn(p1)

    query who:
        turn(P)

:

comp [logic] .monoTurn:
    on: 1
    .mono { }
:

1wire trigger = 1
1wire failed = 0
1wire ok = 0

.monoTurn:{
    logic {
        - turn(p1)
        + turn(p2)
    }
    who >= ok
    mutationFailed >= failed
    set = trigger
}`,
      wires: { ok: '1', failed: '0' },
    },
    {
      name: 'community payTax draw',
      src: `inline [logic] .mono:

    taxAmount(75)

    communityDeck([payTax, go200, goToJail, payTax, go200])
    playerPos(p1, 3)
    playerCash(p1, 1500)

    query cash:
        playerCash(p1, Cash)

:

comp [logic] .commApply:
    on: 1
    .mono { }
:

16wire cashOut := 0
1wire trigger = 1
1wire failed = 0

.commApply:{
    logic {
        - playerCash(p1, 1500)
        + playerCash(p1, 1425)
        - communityDeck([payTax, go200, goToJail, payTax, go200])
        + communityDeck([go200, goToJail, payTax, go200, payTax])
    }
    cash >= cashOut
    mutationFailed >= failed
    set = trigger
}`,
      wires: { cashOut: '0000010110010001', failed: '0' },
    },
  ],
};
