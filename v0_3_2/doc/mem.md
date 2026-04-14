# Memory Component (mem)

The `mem` component implements a RAM memory with configurable number of addresses (`length`) and bits per address (`depth`). Each address stores one binary word of `depth` bits.

---

## Syntax

```
comp [mem] .name:
  depth: 8
  length: 16
  on: raise
  :
```

Minimal form (all defaults):

```
comp [mem] .name::
```

---

## Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `depth`   | integer | `4`     | Number of bits per address (word size) |
| `length`  | integer | `3`     | Number of addresses |
| `on`      | mode    | `raise` | Trigger mode for property blocks: `raise`, `edge`, `1`, `0` |

---

## Initialization

Memory can be initialized at declaration time using `=`. The initializer is split into chunks of `depth` bits, one per address starting from address 0. All other addresses are set to `0`.

### Binary literal

```
comp [mem] .rom:
  depth: 4
  length: 8
  = 10110011
  :
```

`10110011` is 8 bits, `depth` is 4 → two addresses:
- address 0 = `1011`
- address 1 = `0011`
- addresses 2–7 = `0000`

### Hex literal

```
16wire init = ^ffff

comp [mem] .ram:
  depth: 8
  length: 16
  = ^ffff
  :
```

`^ffff` = `1111111111111111` (16 bits), `depth` is 8 → two addresses:
- address 0 = `11111111`
- address 1 = `11111111`
- addresses 2–15 = `00000000`

### Variable reference

```
16wire d = ^ffff

comp [mem] .ram:
  depth: 8
  length: 16
  = d
  :
```

The variable `d` must already be declared before the `comp` statement. The value is read at the time of declaration. Same splitting behavior as a literal.

### Padding

If the initializer is shorter than `depth`, it is padded with leading zeros:

```
4wire short = 11

comp [mem] .m:
  depth: 8
  length: 4
  = short
  :
# address 0 = 00000011
```

---

## Bulk assignment — `.mem = value`

After declaration, memory can be re-initialized using direct assignment. This **resets all addresses to `0`** first, then writes the new value starting at address 0.

```
comp [mem] .ram:
  depth: 8
  length: 16
  :

16wire d = ^f0f0
.ram = d
# address 0 = 11110000
# address 1 = 11110000
# addresses 2–15 = 00000000
```

The value is split into `depth`-bit chunks exactly like initialization. The number of chunks must not exceed `length`.

> **Note:** `.mem = value` always resets the entire memory before writing. To write a single address without affecting others, use the `:at`, `:data`, `:write` property block.

---

## Property block — read and write

### Reading (`:at` + `:get`)

Set the address in a property block, then read via `:get`:

```
.ram:{
  at = 0010    # address 2
}

8wire val = .ram:get   # reads address 2
```

### Writing (`:at` + `:data` + `:write`)

```
.ram:{
  at   = 0001    # address 1
  data = 10101010
  write = 1
}
```

When `write = 1`, the value in `data` is written to address `at`.

### Writing multiple addresses at once

If `data` is a multiple of `depth`, multiple consecutive addresses are written starting from `at`:

```
.ram:{
  at   = 0000
  data = 1111000011110000   # 16 bits, depth=8 → 2 addresses
  write = 1
}
# address 0 = 11110000
# address 1 = 11110000
```

---

## Pins and pouts

| Name    | Type | Description |
|---------|------|-------------|
| `at`    | pin  | Address to read or write (binary, `log2(length)` bits) |
| `data`  | pin  | Data to write (one or more `depth`-bit words) |
| `write` | pin  | `1` = write `data` to `at`; `0` = do nothing |
| `get`   | pout | Value at the current address (`at`) |

---

## Direct value (`:get` at address 0)

Reading the component directly (without `:at`) returns the value at address 0:

```
8wire x = .ram:get       # address is 0 by default
8wire y = .ram:get;16    # padded to 16 bits
```

---

## Bit range and padding on reads

The `;p` padding operator and bitrange work on memory reads:

```
8wire a = .ram:get;16        # pad address-0 value to 16 bits
4wire b = .ram:get.0-3       # bits 0–3 of address-0 value
8wire c = .ram:get.0-3;8     # bits 0–3, then pad to 8
```

---

## Component type documentation

```
doc(comp.mem)
```

Output:

```
comp [mem] .name:
  length: integer
  depth: integer
  on: raise/edge/1/0
  = Xbit
  :{
    Xpin at
    1pin write
    Xpin data
    Xpout get
  }
  -> Xbit
```

The `= Xbit` line indicates that `mem` accepts an initializer. The value is split into `depth`-bit chunks — see the **Initialization** section above for the full behavior.

---

## Notes

- `depth` is the **word size** — the number of bits stored per address.
- `length` is the **number of addresses** — the total number of words.
- The initializer (`= value`) splits the value into `depth`-bit chunks. The last chunk is padded with leading zeros if shorter than `depth`.
- `.mem = value` resets **all** addresses to `0` before writing, even those not covered by the value.
- To write individual addresses without resetting others, always use the `:at`, `:data`, `:write` property block.
- `getMem`/`setMem` are browser-side functions. In the test environment (Node.js), address 0 is accessible via `comp.initialValue`; other addresses require the browser runtime.
