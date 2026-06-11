# Mini CPU 4-bit (Harvard, step-by-step)

Demonstrație didactică: CPU cu **ROM program**, **RAM date**, **PC**, **accumulator** și **ALU** — fără componente noi în engine. Implementarea folosește `chip +[alu4]` și `board +[cpu4]`.

Plan de fezabilitate: [mini-cpu-plan.md](mini-cpu-plan.md).

---

## Arhitectură

| Bloc | Rol |
|------|-----|
| `chip +[alu4]` | ADD/SUB pe 4 biți, select cu `op.1` |
| `board +[cpu4]` | Fetch-decode-execute la fiecare impuls `set` |
| `comp [mem] .prog` | ROM 8×4 (instrucțiuni 8 biți) |
| `comp [mem] .data` | RAM 4×16 |
| `comp [counter] .pcnt` | Program counter |
| `comp [reg] .accum` | Accumulator |
| `comp [7seg] .disp` | Afișaj hex ACC (în panoul UI) |

---

## ISA (8 biți per instrucțiune)

Format: `[opcode:4][operand:4]` — în memorie 8 biți, **biții 0–3 (MSB)** = opcode, **biții 4–7** = operand (`instr.0/4` / `instr.4/4` în LogTScript).

| Opcode | Mnemonic | Efect |
|--------|----------|-------|
| `0000` | NOP | Fără efect |
| `0001` | LOAD | `ACC ← RAM[operand]` |
| `0010` | STORE | `RAM[operand] ← ACC` |
| `0011` | ADDI | `ACC ← ACC + operand` |
| `0100` | SUBI | `ACC ← ACC - operand` |
| `0101` | JMP | `PC ← operand` |
| `0111` | HALT | Oprește incrementarea PC |

---

## Program demo (preîncărcat în ROM)

ROM: `= ^10334221` (4 cuvinte × 8 biți).

| PC | Instr | Efect |
|----|-------|-------|
| 0 | `LOAD 0` | ACC = RAM[0] (= 7) |
| 1 | `ADDI 3` | ACC = 10 |
| 2 | `SUBI 2` | ACC = 8 |
| 3 | `STORE 1` | RAM[1] = 8 |

Inițializare RAM: `= ^7` → adresa 0 conține `0111` (7).

După **4 pași** (`set = 1` de patru ori): **ACC = 8**, **PC = 4**.

---

## Exemplu rapid (toți pașii instant)

Apasă **Load & Run** — programul rulează **4 cicluri imediat** (util pentru teste). Pentru a **vedea 7seg schimbându-se lent**, folosește exemplul cu oscilator de mai jos.

În panoul din dreapta: **7seg** (ACC) + mem/counter/reg. În consolă: `probe` + `show`.

```logts-play
chip +[alu4]:
  4pin a
  4pin b
  2pin op
  1pin set
  4pout y
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  .sub:a = a
  .sub:b = b
  y = MUX(op.1, .add:get, .sub:get)
  carry = MUX(op.1, .add:carry, .sub:carry)
  :4bit y

board +[cpu4]:
  1pin set
  1pin rst
  4pout acc
  4pout pc
  8pout ir
  exec: set
  on: 1
  comp [mem] .prog:
    depth: 8
    length: 4
    = ^10334221
    on: raise
    :
  comp [mem] .data:
    depth: 4
    length: 16
    = ^7
    on: raise
    :
  comp [counter] .pcnt:
    depth: 4
    on: 1
    :
  comp [reg] .accum:
    depth: 4
    on: 1
    :
  comp [7seg] .disp:
    on: 1
    nl
    :
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  4wire pcval
  4wire pcout
  8wire instr
  4wire opc
  4wire opd
  4wire curacc
  4wire loadval
  4wire addres
  4wire subres
  1wire isload
  1wire isstore
  1wire isaddi
  1wire issubi
  1wire isjmp
  1wire ishalt
  4wire t0
  4wire t1
  4wire accnext
  1wire doinc
  1wire inc
  pcval = .pcnt:get
  .prog:{ at = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  curacc = .accum:get
  .data:at = opd
  .data:{ set = set }
  loadval = .data:get
  .add:a = curacc
  .add:b = opd
  .sub:a = curacc
  .sub:b = opd
  addres = .add:get
  subres = .sub:get
  isload = EQ(opc, 0001)
  isstore = EQ(opc, 0010)
  isaddi = EQ(opc, 0011)
  issubi = EQ(opc, 0100)
  isjmp = EQ(opc, 0101)
  ishalt = EQ(opc, 0111)
  t0 = MUX(issubi, curacc, subres)
  t1 = MUX(isaddi, t0, addres)
  accnext = MUX(isload, t1, loadval)
  doinc = AND(NOT(ishalt), NOT(isjmp))
  inc = AND(doinc, set)
  .pcnt:{ data = opd
    write = 1
    set = AND(isjmp, set) }
  .pcnt:{ dir = 1
    set = inc }
  pcout = .pcnt:get
  .data:at = opd
  .data:{ data = curacc
    write = AND(isstore, set)
    set = AND(isstore, set) }
  .accum:{ data = accnext
    set = set }
  .pcnt:{ data = 0000
    write = 1
    set = rst }
  .accum:{ data = 0000
    set = rst }
  .disp:{ hex = .accum:get
    set = set }
  acc = .accum:get
  pc = pcout
  ir = instr
  :4bit acc

board [cpu4] .cpu::

probe(.cpu:acc)
probe(.cpu:pc)
probe(.cpu:ir)

.cpu:{ set = 1 }
.cpu:{ set = 1 }
.cpu:{ set = 1 }
.cpu:{ set = 1 }

show(.cpu:acc)
show(.cpu:pc)
```

**Rezultat așteptat** după RUN: ACC = `1000` (8), PC = `0100` (4). După primul pas: ACC = `0111` (7), PC = `0001`.

---

## Exemplu vizual — oscilator (~4 s / pas)

**Load & Run** o singură dată, apoi:

1. Pornește **switch**-ul `.run` din panou (enable).
2. Urmărește **7seg** `.disp` — la fiecare **~4 secunde** CPU execută **un** ciclu (frontiera rising a oscilatorului).
3. LED `.beat` e aprins când `tick = 1` (feedback vizual clock).

| Pas | ACC (7seg) | PC |
|-----|------------|-----|
| start | 0 | 0 |
| 1 | 7 | 1 |
| 2 | 10 | 2 |
| 3 | 8 | 3 |
| 4 | 8 | 4 |

Oscilator: `freq: 4`, `freqIsSec: 1` → perioadă **4 secunde** / ciclu complet. CPU avansează pe **rising edge** (`on: 1` + `.cpu:{ set = step }`).

```logts-play
chip +[alu4]:
  4pin a
  4pin b
  2pin op
  1pin set
  4pout y
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  .sub:a = a
  .sub:b = b
  y = MUX(op.1, .add:get, .sub:get)
  carry = MUX(op.1, .add:carry, .sub:carry)
  :4bit y

board +[cpu4]:
  1pin set
  1pin rst
  4pout acc
  4pout pc
  8pout ir
  exec: set
  on: 1
  comp [mem] .prog:
    depth: 8
    length: 4
    = ^10334221
    on: raise
    :
  comp [mem] .data:
    depth: 4
    length: 16
    = ^7
    on: raise
    :
  comp [counter] .pcnt:
    depth: 4
    on: 1
    :
  comp [reg] .accum:
    depth: 4
    on: 1
    :
  comp [7seg] .disp:
    on: 1
    nl
    :
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  4wire pcval
  4wire pcout
  8wire instr
  4wire opc
  4wire opd
  4wire curacc
  4wire loadval
  4wire addres
  4wire subres
  1wire isload
  1wire isstore
  1wire isaddi
  1wire issubi
  1wire isjmp
  1wire ishalt
  4wire t0
  4wire t1
  4wire accnext
  1wire doinc
  1wire inc
  pcval = .pcnt:get
  .prog:{ at = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  curacc = .accum:get
  .data:at = opd
  .data:{ set = set }
  loadval = .data:get
  .add:a = curacc
  .add:b = opd
  .sub:a = curacc
  .sub:b = opd
  addres = .add:get
  subres = .sub:get
  isload = EQ(opc, 0001)
  isstore = EQ(opc, 0010)
  isaddi = EQ(opc, 0011)
  issubi = EQ(opc, 0100)
  isjmp = EQ(opc, 0101)
  ishalt = EQ(opc, 0111)
  t0 = MUX(issubi, curacc, subres)
  t1 = MUX(isaddi, t0, addres)
  accnext = MUX(isload, t1, loadval)
  doinc = AND(NOT(ishalt), NOT(isjmp))
  inc = AND(doinc, set)
  .pcnt:{ data = opd
    write = 1
    set = AND(isjmp, set) }
  .pcnt:{ dir = 1
    set = inc }
  pcout = .pcnt:get
  .data:at = opd
  .data:{ data = curacc
    write = AND(isstore, set)
    set = AND(isstore, set) }
  .accum:{ data = accnext
    set = set }
  .pcnt:{ data = 0000
    write = 1
    set = rst }
  .accum:{ data = 0000
    set = rst }
  .disp:{ hex = .accum:get
    set = set }
  acc = .accum:get
  pc = pcout
  ir = instr
  :4bit acc

board [cpu4] .cpu::

comp [switch] .run::
comp [~] .tick:
  freq: 4
  freqIsSec: 1
  duration1: 1
  duration0: 3
  :
comp [led] .beat::

1wire enabled = .run:get
1wire tick = .tick:get
1wire step = AND(tick, enabled)

.cpu:{ set = step }

.beat = tick
```

---

## Exemplu vizual — tastă (un pas per click)

Copiază definițiile `chip +[alu4]` și `board +[cpu4]` din exemplul oscilator, apoi folosește coada de mai jos (sau înlocuiește blocul oscilator/switch/led):

```logts-play
board [cpu4] .cpu::

comp [key] .step::

.cpu:{ set = .step:get }
```

**Load & Run**, apoi apasă tasta **`.step`** din panou — fiecare apăsare = un ciclu CPU; **7seg** se actualizează imediat.

---

## Exemplu cu NEXT(~) — pas cu pas din toolbar

La fel, după definiții + `board [cpu4] .cpu::`:

```logts-play
board [cpu4] .cpu::

.cpu:{ set = ~ }
```

**Load & Run** (fără `NEXT` în script), apoi apasă butonul **NEXT** din toolbar de **4 ori** — fiecare NEXT = un ciclu. Urmărește **7seg** și panoul de variabile.

---

## Utilizare manuală

| Acțiune | Script |
|---------|--------|
| Instanțiere | `board [cpu4] .cpu::` |
| Un ciclu CPU | `.cpu:{ set = 1 }` |
| Citește ACC / PC / IR | `4wire a = .cpu:acc` etc. sau `probe(.cpu:acc)` |
| Reset | `.cpu:{ rst = 1 }` |

Cu panou interactiv: `comp [key]` pe pinul `set` al instanței `.cpu` (vezi [key.md](key.md)).

---

## Fișiere relevante

- Teste automate: `test_suite_ported.js` (859–866)
- Constante în teste: `CHIP_ALU4`, `BOARD_CPU4`
