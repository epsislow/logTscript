# PROTOCOL

A protocol generator. A protocol definition transforms named parameters into one or more fixed-length bit sequences.

Unlike [ASM](asm.md), which generates a single binary blob, a protocol may generate **multiple output channels** (`tx`, `sda`, `scl`, `mosi`, etc.).

There is **no panel UI** in v1 — logic only.

---

## Naming rules

| Rule | Example |
|------|---------|
| Instance name must start with `.` | `.uart8n1` ✓ — `uart8n1` ✗ |
| Letters and digits only (no `_`) | `.uart8n1` ✓ — `.uart_8n1` ✗ |
| Same name at declaration and use | `inline [protocol] .uart8n1:` → `.uart8n1 { … }` |

Using a protocol without the leading dot is a parse error:

```text
Expected '.' before inline instance name
(use '.uart8n1' not 'uart8n1')
```

---

## Declare vs use

| Step | Syntax |
|------|--------|
| Define protocol | `inline [protocol] .name: … :` |
| Assign outputs | `10wire tx = .uart8n1 { data = ^41 }` |
| Assign multiple outputs | `8wire mosi, 8wire sclk, 8wire cs = .spi { data = ^A5 }` |

Multi-target assignments may span lines before `=`:

```logts
8wire mosi,
8wire sclk,
8wire cs
= .spi { data = ^A5 }
```

Use **`Nwire`** for assignable signal wires (same as [ASM](asm.md)). **`Nbit`** variables are also supported but are immutable bit values, not wires.

Protocol uses **`{ }`** with named parameters (`data = ^41`). ASM uses **`{ }`** with mnemonics. LUT uses **`(...)`** for lookup.

### Runnable — quick start

```logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

10wire tx = .uart8n1 { data = ^41 }
show(tx)
```

Single channel, one parameter — result on wire `tx`.

---

## Protocol structure

A protocol consists of:

* optional attributes
* one or more output channels

Example:

```logts
inline [protocol] .uart8n1:

  tx:
    0
    reverse(data 8b)
    1

:
```

---

## Output channels

Every label becomes an output channel.

Example:

```logts
inline [protocol] .spi:

  mosi:
    data 8b

  sclk:
    clock 8b

  cs:
    repeat 0 8b

:
```

This protocol produces three outputs: `mosi`, `sclk`, `cs`.

The compiler concatenates all channel outputs internally in declaration order:

```text
<mosi bits><sclk bits><cs bits>
```

Assignments split the result according to the widths on the left side (see **Runnable — SPI** below).

Multi-line assignment before `=` is supported:

```logts
8wire mosi,
8wire sclk,
8wire cs
= .spi { data = ^A5 }
```

---

## Protocol attributes

Attributes appear before output channels.

```logts
inline [protocol] .spi:

  clockType: lowFirst

  ...
:
```

| Attribute | Values |
|-----------|--------|
| `clockType` | `lowFirst`, `highFirst` |

`clockType: lowFirst` → `01010101…`

`clockType: highFirst` → `10101010…`

---

## Segments

Each channel contains a sequence of segments concatenated in order.

```logts
tx:
  0
  reverse(data 8b)
  1
```

→ `0 + reverse(data) + 1`

---

## Literal segments

| Form | Example |
|------|---------|
| Single bits | `0`, `1` |
| Binary | `01010101` |
| Hex | `^AA` |
| Decimal | `\42` |

---

## Parameters

Parameters are declared implicitly at first use.

```logts
data 8b
```

declares `data` with width 8 bits. Later uses may omit the width:

```logts
reverse(data)
parityEven(data)
```

Width mismatch on redeclaration is an error:

```text
Parameter 'data' was previously declared as 8b but is used here as 7b
```

---

## Built-in generators

Syntax reference:

| Generator | Example | Result |
|-----------|---------|--------|
| `reverse(param)` | `reverse(data 8b)` | bit-reversed parameter |
| `parityEven(param)` | `parityEven(data)` | `0` or `1` (even parity) |
| `parityOdd(param)` | `parityOdd(data)` | `0` or `1` (odd parity) |
| `clock Nb` | `clock 8b` | toggling waveform per `clockType` |
| `repeat bit Nb` | `repeat 0 8b` | constant bit repeated |

### Runnable — reverse()

```logts-play
inline [protocol] .revtest:
  out:
    reverse(data 8b)
  :

8wire out = .revtest { data = 01000001 }
show(out)
```

`01000001` → `10000010`.

### Runnable — parityEven() / parityOdd()

```logts-play
inline [protocol] .pareven:
  out:
    parityEven(data 8b)
  :

inline [protocol] .parodd:
  out:
    parityOdd(data 8b)
  :

1wire evenPar = .pareven { data = 01100110 }
1wire oddPar  = .parodd  { data = 01100110 }
show(evenPar)
show(oddPar)
```

Four set bits (even popcount) → `parityEven` = `0`, `parityOdd` = `1`.

### Runnable — clock (`lowFirst` / `highFirst`)

```logts-play
inline [protocol] .clklow:
  clockType: lowFirst
  out:
    clock 8b
  :

inline [protocol] .clkhigh:
  clockType: highFirst
  out:
    clock 8b
  :

8wire low  = .clklow  { }
8wire high = .clkhigh { }
show(low)
show(high)
```

`lowFirst` → `01010101`, `highFirst` → `10101010`.

### Runnable — repeat

```logts-play
inline [protocol] .rep0:
  out:
    repeat 0 4b
  :

inline [protocol] .rep1:
  out:
    repeat 1 4b
  :

4wire zeros = .rep0 { }
4wire ones  = .rep1 { }
show(zeros)
show(ones)
```

`repeat 0 4b` → `0000`, `repeat 1 4b` → `1111`.

---

## Runnable — UART 8N1

```logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

10wire tx = .uart8n1 { data = ^41 }
show(tx)
```

`^41` = `01000001`, reversed = `10000010`, with start `0` and stop `1` → **`0100000101`**.

---

## Runnable — UART 8E1 / 8O1

```logts-play
inline [protocol] .uart8e1:
  tx:
    0
    reverse(data 8b)
    parityEven(data)
    1
  :

inline [protocol] .uart8o1:
  tx:
    0
    reverse(data 8b)
    parityOdd(data)
    1
  :

11wire e1 = .uart8e1 { data = ^41 }
11wire o1 = .uart8o1 { data = ^41 }
show(e1)
show(o1)
```

11 bits: start + 8 data (reversed) + parity + stop. For `^41` (even popcount): 8E1 → `01000001001`, 8O1 → `01000001011`.

---

## Runnable — SPI (multi-output)

```logts-play
inline [protocol] .spi:
  clockType: lowFirst
  mosi:
    data 8b
  sclk:
    clock 8b
  cs:
    repeat 0 8b
  :

8wire mosi,
8wire sclk,
8wire cs
= .spi { data = ^A5 }

show(mosi)
show(sclk)
show(cs)
```

`^A5` → mosi `10100101`, sclk `01010101` (`lowFirst`), cs `00000000`.

Channels are concatenated in declaration order (`mosi` + `sclk` + `cs`); assignment widths split the 24-bit blob.

---

## Runnable — I2C (multi-output)

```logts-play
inline [protocol] .i2c:
  clockType: lowFirst
  sda:
    0
    address 7b
    rw 1b
    ack1 1b
    data 8b
    ack2 1b
    1
  scl:
    clock 20b
  :

20wire sda,
20wire scl
= .i2c {
  address = ^42
  rw = 0
  ack1 = 0
  data = ^55
  ack2 = 0
}

show(sda)
show(scl)
```

Invoke parameters may span multiple lines inside `{ }`. sda = 20 data bits; scl = 20-bit `lowFirst` clock.

---

## doc()

```logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

doc(inline.protocol)
doc(.uart8n1)
```

| Call | Output |
|------|--------|
| `doc(inline.protocol)` | Declaration template, built-in generators, attributes |
| `doc(.uart8n1)` | Outputs, channel segments, parameters for that instance |
| `doc(inline)` | Lists all inline instances including protocol |

Example `doc(.uart8n1)`:

```text
.uart8n1 (inline [protocol])

  outputs:
    tx

  tx:
    0
    reverse(data 8b)
    1

  parameters:
    data 8b
```

---

## Common errors

| Error | Cause |
|-------|--------|
| Expected '.' before inline instance name | Missing leading dot |
| Parameter 'data' was previously declared as 8b but is used here as 7b | Width mismatch |
| Unknown parameter 'data' | Missing required parameter at invoke |
| Protocol output width mismatch | Left-side width ≠ generated width |
| Unknown protocol attribute | Unsupported attribute |
| clockType must be 'lowFirst' or 'highFirst' | Invalid clock type |
| parityEven() expects a parameter | Invalid argument |
| reverse() expects a parameter | Invalid argument |

---

## vs ASM

| Feature | asm | protocol |
|---------|-----|----------|
| Generates bits | ✓ | ✓ |
| Multiple outputs | ✗ | ✓ |
| Labels | Opcodes | Channels |
| Parameters | Registers, immediates | Named fields |
| Built-in transforms | R2b, A4b, S4b | reverse, parityEven, clock, repeat |
| Typical use | Machine code | UART, SPI, I2C, custom serial |

A protocol definition is entirely generic. The compiler has no knowledge of UART, SPI, I2C, SDA, SCL, MOSI, or SCLK — these are user-defined channel and parameter names.
