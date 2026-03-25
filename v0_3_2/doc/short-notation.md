# Short Notation (Notatie Scurta)

Notatia scurta permite scrierea expresiilor logice intr-un mod compact, folosind operatori simbolici in loc de apeluri explicite de functii.

Zona de notatie scurta este delimitata de **backtick-uri** (`` ` ``). Tot ce se afla intre doua backtick-uri este expandat automat in apeluri standard de functii inainte de tokenizare.

```
`expresie scurta`  →  expandare in apeluri de functii
```

---

## Operatori

| Operator | Functie | Tip        |
|----------|---------|------------|
| `&`      | AND     | prefix/infix |
| `\|`     | OR      | prefix/infix |
| `^`      | XOR     | prefix/infix |
| `=`      | EQ      | infix      |
| `!`      | NOT     | prefix     |
| `-&`     | NAND    | prefix/infix |
| `-\|`    | NOR     | prefix/infix |
| `-^`     | NXOR    | prefix/infix |

**Prefix** = operatorul apare inaintea operandului, cu un singur argument.
**Infix** = operatorul apare intre doi operanzi, cu doua argumente.

---

## AND (`&`)

Aplica functia AND pe unul sau doi operanzi.

### Prefix (un operand)

```
`& a`          →  AND(a)
`& a.0/4`      →  AND(a.0/4)
```

`AND(a)` cu un singur argument face AND pe toti bitii variabilei `a`, rezultand un singur bit.
`AND(a.0/4)` face AND pe bitii 0-3 (4 biti incepand de la pozitia 0) ai variabilei `a`.

### Infix (doi operanzi)

```
`a & b`        →  AND(a,b)
```

`AND(a,b)` face AND bit-cu-bit intre `a` si `b`.

---

## OR (`|`)

Aplica functia OR pe unul sau doi operanzi.

### Prefix

```
`| a`          →  OR(a)
`| a.0-3`      →  OR(a.0-3)
```

`OR(a)` cu un singur argument face OR pe toti bitii, rezultand un singur bit (1 daca cel putin un bit este 1).

### Infix

```
`a | b`        →  OR(a,b)
```

`OR(a,b)` face OR bit-cu-bit intre `a` si `b`.

---

## XOR (`^`)

Aplica functia XOR pe unul sau doi operanzi.

### Prefix

```
`^ a`          →  XOR(a)
`^ a.0-3`      →  XOR(a.0-3)
```

`XOR(a)` cu un singur argument face XOR pe toti bitii (paritate — 1 daca numarul de biti 1 este impar).

### Infix

```
`a ^ b`        →  XOR(a,b)
```

`XOR(a,b)` face XOR bit-cu-bit intre `a` si `b`.

**Atentie:** `^` in notatia scurta este intotdeauna XOR, nu literal hexadecimal. Pentru hex, foloseste `[^FF]` (vezi sectiunea Literali).

---

## EQ (`=`)

Compara doi operanzi bit-cu-bit. Rezulta un singur bit: 1 daca sunt egali, 0 daca nu.

```
`a = b`        →  EQ(a,b)
```

**Nota:** `=` este EQ doar in zona de backtick. In afara backtick-urilor, `=` ramane operator de atribuire (assignment).

---

## NOT (`!`)

Inverseaza toti bitii operandului.

```
`!a`           →  !a
`!a.0/4`       →  !a.0/4
`!(a | b)`     →  !OR(a,b)
```

`!` functioneaza si fara backtick-uri (este deja suportat nativ in limbaj). In notatia scurta poate fi combinat cu paranteze: `!(a | b)` inverseaza rezultatul OR-ului.

---

## NAND (`-&`)

AND inversat — rezultatul este NOT(AND(operanzi)).

### Prefix

```
`-& a`         →  NAND(a)
```

### Infix

```
`a -& b`       →  NAND(a,b)
```

---

## NOR (`-|`)

OR inversat — rezultatul este NOT(OR(operanzi)).

### Prefix

```
`-| a`         →  NOR(a)
`-| b.1/3`     →  NOR(b.1/3)
```

### Infix

```
`a -| b`       →  NOR(a,b)
```

---

## NXOR (`-^`)

XOR inversat (echivalenta) — rezulta 1 daca bitii sunt egali.

### Prefix

```
`-^ a`         →  NXOR(a)
```

### Infix

```
`a -^ b`       →  NXOR(a,b)
```

---

## Paranteze si grupare

Parantezele rotunde `()` grupeaza sub-expresii. Evaluarea este **stanga-la-dreapta** fara precedenta intre operatori.

```
`(a | b) & c`              →  AND(OR(a,b),c)
`(a | b) & (c | d)`        →  AND(OR(a,b),OR(c,d))
`(a.0/4 | b.0/4) & (a.4/4 | b.4/4)`
                            →  AND(OR(a.0/4,b.0/4),OR(a.4/4,b.4/4))
```

### Inlantuire stanga-la-dreapta

Cand mai multi operatori se inlantuie fara paranteze, evaluarea este de la stanga la dreapta:

```
`a | b | c`                →  OR(OR(a,b),c)
`a & b & c`                →  AND(AND(a,b),c)
```

---

## Expresii mixte

Operatorii prefix si infix pot fi combinati. Prefixul se aplica pe urmatorul atom, apoi rezultatul participa ca operand in expresia infix:

```
`& a -| b`                 →  NOR(AND(a),b)
```

Pas cu pas:
1. `& a` → `AND(a)` (prefix AND pe `a`)
2. `AND(a) -| b` → `NOR(AND(a),b)` (infix NOR intre rezultatul AND si `b`)

Alt exemplu:

```
`& (a | b)`                →  AND(OR(a,b))
```

1. `(a | b)` → `OR(a,b)` (grupare cu paranteze)
2. `& OR(a,b)` → `AND(OR(a,b))` (prefix AND pe rezultatul OR)

---

## Literali

### Literali binari

Functioneaza direct ca operanzi, fara delimitatori speciali:

```
`^ 111`                    →  XOR(111)
`a & 1010`                 →  AND(a,1010)
`a | 1010 | 111`           →  OR(OR(a,1010),111)
```

### Literali hexadecimali — `[^hex]`

Deoarece `^` este operator XOR in notatia scurta, literalii hexadecimali trebuie pusi intre paranteze patrate `[]`:

```
`^ [^F]`                   →  XOR(^F)
`a | [^FF]`                →  OR(a,^FF)
`a | [^FF] | 111`          →  OR(OR(a,^FF),111)
```

Parantezele patrate sunt delimitatori — se scot la expandare, continutul ajunge ca-atare la tokenizer.

### Literali decimali — `[\dec]`

Literalii decimali (cu `\`) pot fi folositi direct sau in `[]`:

```
`a | \31`                  →  OR(a,\31)
`a | [\31]`                →  OR(a,\31)
`a | [^FF] | [\31]`        →  OR(OR(a,^FF),\31)
```

---

## Utilizare in context

Notatia scurta poate fi folosita oriunde apare o expresie in codul sursa.

### In declaratii de variabile

```
8wire c = `& (a | b)`
```

Se expandeaza in:

```
8wire c = AND(OR(a,b))
```

### In atribuiri

```
e = `(a.0/4 | b.0/4)`
```

Se expandeaza in:

```
e = OR(a.0/4,b.0/4)
```

### In definitii de functii (def)

```
def q(8bit a, 8bit b):
   :4bit `(a.0/4 | b.0/4) & (a.4/4 | b.4/4)`
   :1bit `& (a | b)`
```

Se expandeaza in:

```
def q(8bit a, 8bit b):
   :4bit AND(OR(a.0/4,b.0/4),OR(a.4/4,b.4/4))
   :1bit AND(OR(a,b))
```

### Mai multe zone de backtick pe aceeasi linie

Backtick-urile delimiteaza zone independente. Pot fi combinate cu `+` (concatenare):

```
`a & b` + `c | d`
```

Se expandeaza in:

```
AND(a,b) + OR(c,d)
```

### Combinatie cu repeat

Notatia scurta functioneaza impreuna cu blocurile `repeat`. Placeholder-urile `?` sunt expandate de repeat dupa ce notatia scurta a fost procesata:

```
repeat 1..3[
   :1bit `a.? | b.?`
]
```

Se expandeaza in:

```
   :1bit OR(a.1,b.1)
   :1bit OR(a.2,b.2)
   :1bit OR(a.3,b.3)
```

---

## Variabile speciale

Variabilele speciale ale limbajului (`~`, `%`, `$`, `_`) functioneaza ca operanzi in notatia scurta:

```
`~ & a`                    →  AND(~,a)
`a | %`                    →  OR(a,%)
```

---

## Limitari

- `^` in backtick este intotdeauna **XOR**. Pentru literal hexadecimal, foloseste `[^FF]`.
- `()` in backtick sunt pentru **grupare**, nu pentru bit range dinamic. Expresii de tipul `a.(expr)/4` nu sunt suportate in notatia scurta.
- Backtick-urile nu pot fi nested (un backtick inchide zona deschisa de precedentul).
- Backtick-urile din comentarii (`#` sau `#> ... #<`) sunt ignorate.
