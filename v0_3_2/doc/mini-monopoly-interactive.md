# Mini Monopoly — interactive (keys + `$`/`$$` state)

Hot-seat **two-player** game: three **`comp [key]`** buttons drive one **`comp [logic] .game`**. Game state lives in dynamic **`$` / `$$`** facts ([inline-logic.md — Unique facts](inline-logic.md#unique-facts--and-keyed-facts-)); mutations use **`commit(…)`** inside named queries and rules. Builds on [mini-monopoly-logic.md](mini-monopoly-logic.md).

Prerequisites: [key.md](key.md), [comp-logic.md](comp-logic.md), [logic-runtime.md](logic-runtime.md), [inline-logic.md](inline-logic.md).

Open the script below in the doc viewer → **Load** → **RUN** → use panel keys **1**, **2**, **reset**. With **`randomSeed: 42`**, Player 1's first roll is always **4 + 3** → position **7** (**short**, buy **160**).

---

## Controls

| Key | Label | When |
|-----|-------|------|
| **1** | `1` | **`phase$(waitRoll)`** — roll + land · **`phase$(waitChoice)`** — pass turn |
| **2** | `2` | **`phase$(waitChoice)`** — buy offered property |
| **reset** | `reset` | Any time — **`initGame()`** |

Use **`type: 0`** on keys (pulse). Logic uses **`on: 1`** (level-triggered exec).

---

## Architecture (one logic component)

```text
comp [logic] .game  +  inline [logic] .mono
  phase$ / turn$             — single-valued phase and active player
  playerPos$$ / playerCash$$ — keyed by p1 | p2
  owns$$                     — keyed by square index
  communityDeck/1            — list fact (deck)

Keys (separate exec blocks; guards inside queries):
  .key1 → handlePassP1|P2  when phase$(waitChoice)
  .key1 → handleRollP1|P2  when phase$(waitRoll)
  .key2 → handleBuyP1|P2   when phase$(waitChoice)
  .resetGame → handleReset
```

| Idea | Detail |
|------|--------|
| **Boot** | **`welcomeBoot`** + **`bootStep`** one-shot so keys are not blocked at load |
| **Land vs buy** | **`smart_or(landAfterRollP*(), buyLandP*())`** |
| **Guards** | Each query starts with **`phase$(…)`** + **`turn$(…)`** |
| **Show** | **`show/N`** in queries and rules → run output |

Canonical verify copy: **`node/doc_verify/mini-monopoly-interactive.logts`**.

---

## Demo flow (seed 42)

```text
[Load]  → Game Reset, current Player 1
[key 1] → Player 1 dice: 4 3 · position 7 · buy menu (short / 160)
[key 1] → pass → Player 2 roll · position 7 · buy menu
[key 2] → Player 2 buys short
[key 1] → Player 1 roll …
```

---

## Full script

```logts-play
inline [logic] .mono:

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
    communityTax(50)

    playerLabel(p1, 1)
    playerLabel(p2, 2)

    otherPlayer(p1, p2)
    otherPlayer(p2, p1)

    communityDeck([payTax, go200, goToJail, payTax, go200])

    roll(D) <- random_between(1, 6, D)

    nextPos(Pos, Steps, NewPos) <-
        Sum is Pos + Steps,
        NewPos is Sum mod 9

    salaryIfGo(Pos, Steps, 0) <-
        Sum is Pos + Steps,
        Sum < 9

    salaryIfGo(Pos, Steps, G) <-
        Sum is Pos + Steps,
        Sum >= 9,
        goSalary(G)

    onCommunity(P) <-
        playerPos$(P, Idx),
        square(Idx, communityCard, _, _)

    onTax(P) <-
        playerPos$(P, Idx),
        square(Idx, tax, _, _)

    canBuy(P, Idx, Price, Name) <-
        playerPos$(P, Idx),
        square(Idx, Name, Price, _),
        Price > 0,
        \+ owns$(Idx, _)

    owesRent(P, Owner, Amount, _) <-
        playerPos$(P, Idx),
        square(Idx, _, _, Amount),
        owns$(Idx, Owner),
        Owner =\= P

    rotateDeck(Deck, NewDeck) <-
        Deck = [H|T],
        append(T, [H], NewDeck)

    showGoPay(P, OldPos, Steps) <-
        salaryIfGo(OldPos, Steps, G),
        G > 0,
        playerLabel(P, LP),
        playerCash$(P, Cash),
        show("Player", LP, "Go collected +200 . Money now:", Cash)

    showGoPay(_, _, _) <- true

    smart_or(Cond1, _) <- call(Cond1), !
    smart_or(_, Cond2) <- call(Cond2)

    initGame() <-
        set_random(42),
        commit(
            ~ greeted$(_),
            ~ phase$(_),
            ~ turn$(_),
            ~ playerPos$(_, _),
            ~ playerCash$(_, _),
            ~ owns$(_, _),
            ~ communityDeck(_),
            + phase$(waitRoll),
            + turn$(p1),
            + playerPos$(p1, 0),
            + playerPos$(p2, 0),
            + playerCash$(p1, 1500),
            + playerCash$(p2, 1500),
            + communityDeck([payTax, go200, goToJail, payTax, go200]),
            + greeted$()
        ),
        show("Game Reset"),
        show("Player 1 position 0. Money:", 1500),
        show("Player 2 position 0. Money:", 1500),
        show("current Player 1. Press 1 to roll dice")

    landAfterRollP1() <-
        onTax(p1),
        playerCash$(p1, Cash),
        taxAmount(T),
        NC is Cash - T,
        commit(+ playerCash$(p1, NC), + phase$(waitRoll), + turn$(p2)),
        show("Player 1 payTax -75 to community . Money now:", NC),
        show("current Player 2. Press 1 to roll dice")

    landAfterRollP1() <-
        owesRent(p1, p2, Amount, _),
        playerCash$(p1, PC),
        playerCash$(p2, OC),
        NP is PC - Amount,
        NO is OC + Amount,
        commit(
            + playerCash$(p1, NP),
            + playerCash$(p2, NO),
            + phase$(waitRoll),
            + turn$(p2)
        ),
        show("Player 1 payRent -", Amount, "to Player 2 . Money now:", NP),
        show("current Player 2. Press 1 to roll dice")

    landAfterRollP1() <-
        onCommunity(p1),
        communityDeck(Deck),
        rotateDeck(Deck, NewDeck),
        Deck = [payTax|_],
        playerCash$(p1, Cash),
        communityTax(T),
        NC is Cash - T,
        commit(
            + playerCash$(p1, NC),
            + communityDeck(NewDeck),
            + phase$(waitRoll),
            + turn$(p2)
        ),
        show("Player 1 found Community Card: payTax"),
        show("Player 1 payTax -", T, "to community . Money now:", NC),
        show("current Player 2. Press 1 to roll dice")

    landAfterRollP1() <-
        playerPos$(p1, 0),
        commit(+ phase$(waitRoll), + turn$(p2)),
        show("current Player 2. Press 1 to roll dice")

    landAfterRollP1() <-
        playerPos$(p1, 6),
        commit(+ phase$(waitRoll), + turn$(p2)),
        show("current Player 2. Press 1 to roll dice")

    buyLandP1() <-
        canBuy(p1, Idx, Price, Name),
        commit(+ phase$(waitChoice)),
        show("1 pass turn"),
        show("2 buy property", Name, ". cost:", Price)

    landAfterRollP2() <-
        onTax(p2),
        playerCash$(p2, Cash),
        taxAmount(T),
        NC is Cash - T,
        commit(+ playerCash$(p2, NC), + phase$(waitRoll), + turn$(p1)),
        show("Player 2 payTax -75 to community . Money now:", NC),
        show("current Player 1. Press 1 to roll dice")

    landAfterRollP2() <-
        owesRent(p2, p1, Amount, _),
        playerCash$(p2, PC),
        playerCash$(p1, OC),
        NP is PC - Amount,
        NO is OC + Amount,
        commit(
            + playerCash$(p2, NP),
            + playerCash$(p1, NO),
            + phase$(waitRoll),
            + turn$(p1)
        ),
        show("Player 2 payRent -", Amount, "to Player 1 . Money now:", NP),
        show("current Player 1. Press 1 to roll dice")

    landAfterRollP2() <-
        onCommunity(p2),
        communityDeck(Deck),
        rotateDeck(Deck, NewDeck),
        Deck = [payTax|_],
        playerCash$(p2, Cash),
        communityTax(T),
        NC is Cash - T,
        commit(
            + playerCash$(p2, NC),
            + communityDeck(NewDeck),
            + phase$(waitRoll),
            + turn$(p1)
        ),
        show("Player 2 found Community Card: payTax"),
        show("Player 2 payTax -", T, "to community . Money now:", NC),
        show("current Player 1. Press 1 to roll dice")

    landAfterRollP2() <-
        playerPos$(p2, 0),
        commit(+ phase$(waitRoll), + turn$(p1)),
        show("current Player 1. Press 1 to roll dice")

    landAfterRollP2() <-
        playerPos$(p2, 6),
        commit(+ phase$(waitRoll), + turn$(p1)),
        show("current Player 1. Press 1 to roll dice")

    buyLandP2() <-
        canBuy(p2, Idx, Price, Name),
        commit(+ phase$(waitChoice)),
        show("1 pass turn"),
        show("2 buy property", Name, ". cost:", Price)

    query welcomeBoot:
        \+ greeted$(),
        initGame()

    query handleReset:
        initGame()

    query handlePassP1:
        phase$(waitChoice),
        turn$(p1),
        commit(+ phase$(waitRoll), + turn$(p2)),
        show("current Player 2. Press 1 to roll dice")

    query handlePassP2:
        phase$(waitChoice),
        turn$(p2),
        commit(+ phase$(waitRoll), + turn$(p1)),
        show("current Player 1. Press 1 to roll dice")

    query handleRollP1:
        phase$(waitRoll),
        turn$(p1),
        playerPos$(p1, Pos),
        playerCash$(p1, Cash),
        roll(D1),
        roll(D2),
        S is D1 + D2,
        nextPos(Pos, S, NewPos),
        salaryIfGo(Pos, S, Bonus),
        NewCash is Cash + Bonus,
        commit(+ playerPos$(p1, NewPos), + playerCash$(p1, NewCash)),
        show("Player 1 dice:", D1, D2),
        show("Player 1 position now:", NewPos),
        showGoPay(p1, Pos, S),
        smart_or(landAfterRollP1(), buyLandP1())

    query handleRollP2:
        phase$(waitRoll),
        turn$(p2),
        playerPos$(p2, Pos),
        playerCash$(p2, Cash),
        roll(D1),
        roll(D2),
        S is D1 + D2,
        nextPos(Pos, S, NewPos),
        salaryIfGo(Pos, S, Bonus),
        NewCash is Cash + Bonus,
        commit(+ playerPos$(p2, NewPos), + playerCash$(p2, NewCash)),
        show("Player 2 dice:", D1, D2),
        show("Player 2 position now:", NewPos),
        showGoPay(p2, Pos, S),
        smart_or(landAfterRollP2(), buyLandP2())

    query handleBuyP1:
        phase$(waitChoice),
        turn$(p1),
        canBuy(p1, Idx, Price, Name),
        playerCash$(p1, Cash),
        NC is Cash - Price,
        commit(
            + playerCash$(p1, NC),
            + owns$(Idx, p1),
            + phase$(waitRoll),
            + turn$(p2)
        ),
        show("Player 1 buyProperty", Name, "at position", Idx, "cost -", Price, ". Money now:", NC),
        show("current Player 2. Press 1 to roll dice")

    query handleBuyP2:
        phase$(waitChoice),
        turn$(p2),
        canBuy(p2, Idx, Price, Name),
        playerCash$(p2, Cash),
        NC is Cash - Price,
        commit(
            + playerCash$(p2, NC),
            + owns$(Idx, p2),
            + phase$(waitRoll),
            + turn$(p1)
        ),
        show("Player 2 buyProperty", Name, "at position", Idx, "cost -", Price, ". Money now:", NC),
        show("current Player 1. Press 1 to roll dice")

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

comp [key] .resetGame:
    label: 'reset'
    type: 0
    nl
    :

comp [logic] .game:
    on: 1
    randomSeed: 42
    .mono { }
:

1wire failed = 0
1wire bootStep = 1

.game:{
    query = welcomeBoot
    set = bootStep
}

.game:{
    bootStep = 0
    set = 1
}

.game:{
    query = handlePassP1, handlePassP2
    mutationFailed >= failed
    set = .key1
}

.game:{
    query = handleRollP1, handleRollP2
    mutationFailed >= failed
    set = .key1
}

.game:{
    query = handleBuyP1, handleBuyP2
    mutationFailed >= failed
    set = .key2
}

.game:{
    query = handleReset
    mutationFailed >= failed
    set = .resetGame
}

```

**Load & Run**, then pulse keys. Extra checks: `node _verify_doc_examples.js mini-monopoly-interactive`.

---
