'use strict';
const { createSandbox } = require('./_verify_doc_examples.js');

const SCRIPT = `inline [logic] .mono:

    square(0, go, 0, 0)
    square(1, park, 100, 50)
    square(2, lake, 120, 60)
    square(3, communityCard, 0, 0)
    square(4, tax, 0, 0)
    square(5, broad, 140, 70)
    square(6, jail, 0, 0)
    square(7, short, 160, 80)
    square(8, board, 200, 100)

    goSalary(200)
    taxAmount(75)

    playerLabel(p1, 1)
    playerLabel(p2, 2)

    roll(D) <- random_between(1, 6, D)

    nextPos(Pos, Steps, NewPos) <- Sum is Pos + Steps, NewPos is Sum mod 9

    passesGo(Pos, Steps) <- Sum is Pos + Steps, Sum >= 9

    salaryIfGo(Pos, Steps, 0) <- Sum is Pos + Steps, Sum < 9
    salaryIfGo(Pos, Steps, G) <- passesGo(Pos, Steps), goSalary(G)

    onTax(P) <- playerPos(P, Idx), square(Idx, tax, _, _)
    canBuy(P, Idx, Price, Name) <-
        playerPos(P, Idx), square(Idx, Name, Price, _),
        Price > 0, \+ owns(_, Idx)

    query bootGame:
        show("Game Reset"),
        show("Player 1 position 0. Money:", 1500),
        show("Player 2 position 0. Money:", 1500),
        show("current Player 1. Press 1 to roll dice")

    query rollPlanP1:
        phase(waitRoll), turn(p1), playerPos(p1, Pos),
        roll(D1), roll(D2), S is D1 + D2, nextPos(Pos, S, NewPos),
        playerCash(p1, Cash), salaryIfGo(Pos, S, Bonus), NewCash is Cash + Bonus,
        show("Player 1 dice:", D1, D2)

    query rollPlanP2:
        phase(waitRoll), turn(p2), playerPos(p2, Pos),
        roll(D1), roll(D2), S is D1 + D2, nextPos(Pos, S, NewPos),
        playerCash(p2, Cash), salaryIfGo(Pos, S, Bonus), NewCash is Cash + Bonus,
        show("Player 2 dice:", D1, D2)

    query showMoveP1:
        playerPos(p1, Pos), show("Player 1 position now:", Pos)

    query showMoveP2:
        playerPos(p2, Pos), show("Player 2 position now:", Pos)

    query showGoP1:
        playerCash(p1, Cash), passesGo(OldPos, Steps), Steps is D1 + D2,
        show("Player 1 Go collected +200 . Money now:", Cash)

    query showGoP2:
        playerCash(p2, Cash), passesGo(OldPos, Steps), Steps is D1 + D2,
        show("Player 2 Go collected +200 . Money now:", Cash)

    query landTaxP1:
        phase(landed), turn(p1), onTax(p1), playerCash(p1, Cash),
        taxAmount(T), NC is Cash - T

    query landBuyP1:
        phase(landed), turn(p1), canBuy(p1, Idx, Price, Name)

    query landFreeP1:
        phase(landed), turn(p1), \+ onTax(p1), \+ canBuy(p1, _, _, _)

    query showTaxP1:
        playerCash(p1, Cash), show("Player 1 payTax -75 to community . Money now:", Cash)

    query showBuyMenuP1:
        canBuy(p1, _, Price, Name),
        show("1 pass turn"), show("2 buy property", Name, ". cost:", Price)

    query showPromptP2:
        show("current Player 2. Press 1 to roll dice")

    query showPromptP1:
        show("current Player 1. Press 1 to roll dice")

    query canPassP1:
        phase(waitChoice), turn(p1)

    query canBuyP1:
        phase(waitChoice), turn(p1), canBuy(p1, Idx, Price, Name),
        playerCash(p1, Cash), NC is Cash - Price

    query showBuyDoneP1:
        playerPos(p1, Idx), square(Idx, Name, Price, _),
        playerCash(p1, Cash),
        show("Player 1 buyProperty", Name, "at position", Idx, "cost -", Price, ". Money now:", Cash)

:

comp [key] .key1:
    label: '1'
    type: 0
    nl
    :

comp [key] .key2:
    label: '2'
    type: 0
    nl
    :

comp [key] .keyReset:
    label: 'reset'
    type: 0
    nl
    :

comp [logic] .game:
    on: raise
    randomSeed: 42
    .mono {
        OldPos is number oldPosW
        NewPos is number newPosW
        D1 is number d1W
        D2 is number d2W
    }
:

1wire k1 = .key1
1wire k2 = .key2
1wire kReset = .keyReset
1wire rollReady = 0
1wire landReady = 0
16wire oldPosW := 0
16wire newPosW := 0
16wire oldCashW := 0
16wire newCashW := 0
16wire d1W := 0
16wire d2W := 0
16wire idxW := 0
16wire priceW := 0
1wire failed = 0

.game:{
    logic {
        - phase(waitRoll)
        - phase(waitChoice)
        - phase(landed)
        - turn(p1)
        - turn(p2)
        - playerPos(p1, 0)
        - playerPos(p2, 0)
        - playerCash(p1, 1500)
        - playerCash(p2, 1500)
        + phase(waitRoll)
        + turn(p1)
        + playerPos(p1, 0)
        + playerPos(p2, 0)
        + playerCash(p1, 1500)
        + playerCash(p2, 1500)
    }
    query = bootGame
    mutationFailed >= failed
    set = kReset
}

.game:{
    query = rollPlanP1
    rollPlanP1:0:0 >= oldPosW
    rollPlanP1:0:3 >= newPosW
    rollPlanP1:0:1 >= d1W
    rollPlanP1:0:2 >= d2W
    rollPlanP1:0:4 >= oldCashW
    rollPlanP1:0:6 >= newCashW
    rollPlanP1 >= rollReady
    set = k1
}

.game:{
    query = rollPlanP2
    rollPlanP2:0:0 >= oldPosW
    rollPlanP2:0:3 >= newPosW
    rollPlanP2:0:1 >= d1W
    rollPlanP2:0:2 >= d2W
    rollPlanP2:0:4 >= oldCashW
    rollPlanP2:0:6 >= newCashW
    rollPlanP2 >= rollReady
    set = k1
}

.game:{
    rollReady = rollReady
    logic {
        - phase(waitRoll)
        + phase(landed)
        - playerPos(p1, number oldPosW)
        + playerPos(p1, number newPosW)
        - playerCash(p1, number oldCashW)
        + playerCash(p1, number newCashW)
    }
    query = showMoveP1, showGoP1
    landReady = rollReady
    mutationFailed >= failed
    set = rollReady
}

.game:{
    rollReady = rollReady
    logic {
        - phase(waitRoll)
        + phase(landed)
        - playerPos(p2, number oldPosW)
        + playerPos(p2, number newPosW)
        - playerCash(p2, number oldCashW)
        + playerCash(p2, number newCashW)
    }
    query = showMoveP2, showGoP2
    landReady = rollReady
    mutationFailed >= failed
    set = rollReady
}

.game:{
    query = landTaxP1
    landTaxP1:0:4 >= oldCashW
    landTaxP1:0:5 >= newCashW
    landTaxP1 >= failed
    set = landReady
}

.game:{
    landReady = landReady
    failed = failed
    logic {
        - phase(landed)
        + phase(waitRoll)
        - playerCash(p1, number oldCashW)
        + playerCash(p1, number newCashW)
        - turn(p1)
        + turn(p2)
    }
    query = showTaxP1, showPromptP2
    mutationFailed >= failed
    set = landReady
}

.game:{
    query = landBuyP1
    landBuyP1:0:0 >= idxW
    landBuyP1:0:1 >= priceW
    landBuyP1 >= failed
    set = landReady
}

.game:{
    landReady = landReady
    failed = failed
    logic {
        - phase(landed)
        + phase(waitChoice)
    }
    query = showBuyMenuP1
    mutationFailed >= failed
    set = landReady
}

.game:{
    query = landFreeP1
    landFreeP1 >= failed
    set = landReady
}

.game:{
    landReady = landReady
    failed = failed
    logic {
        - phase(landed)
        + phase(waitRoll)
        - turn(p1)
        + turn(p2)
    }
    query = showPromptP2
    mutationFailed >= failed
    set = landReady
}

.game:{
    query = canPassP1
    canPassP1 >= failed
    set = k1
}

.game:{
    failed = failed
    logic {
        - phase(waitChoice)
        + phase(waitRoll)
        - turn(p1)
        + turn(p2)
    }
    query = showPromptP2
    mutationFailed >= failed
    set = k1
}

.game:{
    query = canBuyP1
    canBuyP1:0:0 >= idxW
    canBuyP1:0:1 >= priceW
    canBuyP1:0:3 >= oldCashW
    canBuyP1:0:4 >= newCashW
    canBuyP1 >= failed
    set = k2
}

.game:{
    failed = failed
    logic {
        - phase(waitChoice)
        + phase(waitRoll)
        - playerCash(p1, number oldCashW)
        + playerCash(p1, number newCashW)
        + owns(p1, number idxW)
        - turn(p1)
        + turn(p2)
    }
    query = showBuyDoneP1, showPromptP2
    mutationFailed >= failed
    set = k2
}`;

const s = createSandbox().LogTScriptTestSuite.createSession();
s.run(SCRIPT);

// reset
s.setComp(s.interp, '.keyReset', '1');
s.execNext(s.interp, 5);
s.setComp(s.interp, '.keyReset', '0');
console.log('reset:', s.outLines().slice(-4).join(' | '));

// roll p1
s.setComp(s.interp, '.key1', '0');
s.execNext(s.interp, 1);
s.setComp(s.interp, '.key1', '1');
s.execNext(s.interp, 20);
console.log('roll:', s.outLines().slice(-8).join(' | '));
console.log('rollReady', s.getWire(s.interp, 'rollReady'));
