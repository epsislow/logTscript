# doc() — Documentatie pentru functii

Instructiunea `doc` afiseaza sintaxa (semnatura) unei functii built-in sau definite de utilizator direct in panoul de output.

```
doc(NumeFunctie)
```

---

## Utilizare

### Sintaxa

```
doc(NumeFunctie)
```

`NumeFunctie` este scris **fara ghilimele** — este un identificator, nu un string.

### Exemplu simplu

```
doc(OR)
```

Output:

```
OR(Xbit)
OR(Xbit, Xbit)
```

---

## Functii built-in suportate

### Porti logice

| Apel | Output |
|------|--------|
| `doc(NOT)` | `NOT(Xbit) -> Xbit` |
| `doc(AND)` | `AND(Xbit) -> 1bit` / `AND(Xbit, Xbit) -> Xbit` |
| `doc(OR)` | `OR(Xbit) -> 1bit` / `OR(Xbit, Xbit) -> Xbit` |
| `doc(XOR)` | `XOR(Xbit) -> 1bit` / `XOR(Xbit, Xbit) -> Xbit` |
| `doc(NXOR)` | `NXOR(Xbit) -> 1bit` / `NXOR(Xbit, Xbit) -> Xbit` |
| `doc(NAND)` | `NAND(Xbit) -> 1bit` / `NAND(Xbit, Xbit) -> Xbit` |
| `doc(NOR)` | `NOR(Xbit) -> 1bit` / `NOR(Xbit, Xbit) -> Xbit` |
| `doc(EQ)` | `EQ(Xbit, Xbit) -> 1bit` |
| `doc(LATCH)` | `LATCH(Xbit data, 1bit clock) -> Xbit` |

**`Xbit`** inseamna ca functia accepta un sir de biti de orice latime.

**Mod 1 argument** (fold): `OR(a)` aplica OR pe toti bitii lui `a`, rezultand **1 bit**.

**Mod 2 argumente** (bitwise): `OR(a, b)` aplica OR bit-cu-bit intre `a` si `b`, rezultand **N biti**.

### Shift

| Apel | Output |
|------|--------|
| `doc(LSHIFT)` | `LSHIFT(Xbit data, Nbit n) -> Xbit` / `LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit` |
| `doc(RSHIFT)` | `RSHIFT(Xbit data, Nbit n) -> Xbit` / `RSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit` |

- `data` — sirul de biti de shiftat
- `n` — numarul de pozitii (in binar)
- `fill` *(optional)* — bitul de umplere (implicit `0`)

### Registri (REGn)

`REGn` accepta orice numar `n` (ex. `REG4`, `REG8`, `REG16`):

```
doc(REG4)
```

Output:

```
REG4(4bit data, 1bit clock, 1bit clear) -> 4bit
```

Parametri:
- `data` — valoarea de inregistrat (latimea = `n`)
- `clock` — front crescator inregistreaza `data`
- `clear` — `1` reseteaza registrul la zero

### Multiplexoare (MUX1 / MUX2 / MUX3)

```
doc(MUX1)
```

Output:

```
MUX1(1bit sel, Xbit data0, Xbit data1) -> Xbit
```

| Apel | Semnatura |
|------|-----------|
| `doc(MUX1)` | `MUX1(1bit sel, Xbit data0, Xbit data1) -> Xbit` |
| `doc(MUX2)` | `MUX2(2bit sel, Xbit data0, Xbit data1, Xbit data2, Xbit data3) -> Xbit` |
| `doc(MUX3)` | `MUX3(3bit sel, Xbit data0, ..., Xbit data7) -> Xbit` |

`sel` este selectorul: `MUX1` → 1 bit (2 intrari), `MUX2` → 2 biti (4 intrari), `MUX3` → 3 biti (8 intrari).

### Demultiplexoare (DEMUX1 / DEMUX2 / DEMUX3)

```
doc(DEMUX1)
```

Output:

```
DEMUX1(1bit sel, Xbit data) -> Xbit, Xbit
```

| Apel | Semnatura |
|------|-----------|
| `doc(DEMUX1)` | `DEMUX1(1bit sel, Xbit data) -> Xbit, Xbit` |
| `doc(DEMUX2)` | `DEMUX2(2bit sel, Xbit data) -> Xbit, Xbit, Xbit, Xbit` |
| `doc(DEMUX3)` | `DEMUX3(3bit sel, Xbit data) -> Xbit x8` |

DEMUX returneaza un **vector** de `2^n` iesiri: una contine `data`, restul sunt `0`.

---

## Functii definite de utilizator

`doc` functioneaza si pentru functii definite cu `def`:

```
def add(8bit a, 8bit b):
   :8bit OR(a, b)

doc(add)
```

Output:

```
add(8bit a, 8bit b) -> 8bit
```

Daca functia returneaza mai multe valori:

```
def split(8bit x):
   :4bit x.0/4
   :4bit x.4/4

doc(split)
```

Output:

```
split(8bit x) -> 4bit, 4bit
```

---

## Functii necunoscute

Daca numele nu este recunoscut:

```
doc(Foo)
```

Output:

```
Foo: funcție nedefinită
```

---

## Note

- `doc` este o **instructiune** (ca `show`), nu o expresie — nu poate fi folosita in dreapta unui `=`.
- Argumentul este un **identificator** (nu un string intre ghilimele).
- `doc` nu evalueaza nimic — afiseaza doar semnatura statica.
- Poate fi plasat oriunde in cod, inclusiv inainte sau dupa definitii de functii.
