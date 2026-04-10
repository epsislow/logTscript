# Oscillator

The `osc` component generates a periodic 1-bit digital signal with configurable frequency and duty cycle. It includes an internal counter that counts cycles.

The oscillator works in **real time** — once created, it oscillates independently of `NEXT(~)`, using internal browser timers.

---

## Syntax

```
comp [osc] .name:
  duration1: 4
  duration0: 4
  length: 4
  freq: 1
  freqIsSec: 0
  eachCycle: 1
  :
```

Short form using `~`:

```
comp [~] .name:
  ...
  :
```

Minimal form (no attributes, all values are default):

```
comp [osc] .name::
```

---

## Attributes

| Attribute    | Type  | Min | Max | Default | Description |
|--------------|-------|-----|-----|---------|-------------|
| `duration1`  | int   | 1   | 8   | 4       | Proportion of time the signal is `1` (HIGH) |
| `duration0`  | int   | 1   | 8   | 4       | Proportion of time the signal is `0` (LOW) |
| `length`     | int   | 1   | -   | 4       | Number of bits in the internal counter |
| `freq`       | float | >0  | -   | 1       | Frequency in Hz or period in seconds (see `freqIsSec`) |
| `freqIsSec`  | int   | 0   | 1   | 0       | How `freq` is interpreted: `0` = Hz (cycles/second), `1` = seconds (period of one cycle) |
| `eachCycle`  | int   | 0   | 1   | 1       | When the counter increments: `1` = once per full cycle, `0` = on every state change |

### Frequency and freqIsSec

The `freq` attribute controls the speed of the oscillator. Interpretation depends on `freqIsSec`:

- `freqIsSec: 0` (default) — `freq` is in **Hz** (cycles per second). Period = `1000 / freq` ms.
- `freqIsSec: 1` — `freq` is in **seconds** (duration of one full cycle). Period = `freq * 1000` ms.

**Examples:**

| freq | freqIsSec | Period   | Description |
|------|-----------|----------|-------------|
| 10   | 0         | 100ms    | 10 cycles per second |
| 1    | 0         | 1000ms   | 1 cycle per second |
| 0.5  | 0         | 2000ms   | 1 cycle every 2 seconds |
| 5    | 1         | 5000ms   | 1 cycle every 5 seconds |
| 30   | 1         | 30000ms  | 1 cycle every 30 seconds |
| 120  | 1         | 120000ms | 1 cycle every 2 minutes |

`freqIsSec: 1` is useful for long periods (over 1 second) where writing in Hz would require fractional values below 1.

### Duty Cycle

The HIGH/LOW ratio is calculated from `duration1` and `duration0`:

- HIGH time = `duration1 / (duration1 + duration0)` of the period
- LOW time = `duration0 / (duration1 + duration0)` of the period

**Example:** With `duration1: 1` and `duration0: 7` at `freq: 10` (`freqIsSec: 0`):
- Period = 100ms (10 cycles/second)
- HIGH = 1/8 of 100ms = 12.5ms
- LOW = 7/8 of 100ms = 87.5ms

**Example with freqIsSec: 1:** With `duration1: 4` and `duration0: 4` at `freq: 10` (`freqIsSec: 1`):
- Period = 10000ms (10 seconds per cycle)
- HIGH = 5000ms (5 seconds)
- LOW = 5000ms (5 seconds)

### Counter

The counter is a binary counter on `length` bits. It starts at `0` and increments according to the `eachCycle` attribute:

- `eachCycle: 1` — counter increments by 1 on each full cycle (after HIGH + LOW phase)
- `eachCycle: 0` — counter increments by 1 on each state change (twice per cycle: at 0→1 and at 1→0 transitions)

When the counter reaches its maximum value (all bits set to 1), it **wraps around** and returns to 0.

---

## Outputs

The oscillator exposes 3 readable properties:

### Direct value — `.osc1`

Returns the current signal value (1 bit: `0` or `1`).

```
1wire osc1 = .osc1
```

### `:get` — `.osc1:get`

Identical to the direct value. Returns the current 1-bit signal.

```
1wire osc1b = .osc1:get
```

`.osc1` and `.osc1:get` are always synchronized — they have the same value at any moment.

### `:counter` — `.osc1:counter`

Returns the value of the internal counter on `length` bits.

```
4wire counter1 = .osc1:counter
```

With `length: 4`, the counter has values from `0000` to `1111` (0–15), then wraps back to `0000`.

---

## Inputs

### `:reset` — reset counter

The `:reset` property allows resetting the internal counter to `0`. It is used inside a block with `set` as trigger:

```
.osc1:{
  reset = 1
  set = EQ(cnt, 1010)
}
```

When the expression in `set` transitions from `0` to `1` (rising edge), the block executes and the counter is reset to `0...0` (all bits zero).

**Behavior:**

- `reset = 1` — counter is reset to `0` (on `length` bits)
- `reset = 0` — nothing happens (counter continues normally)
- After reset, the counter resumes counting from `0`
- The oscillator signal (HIGH/LOW) is not affected — only the counter is reset

---

## Examples

### Simple oscillator with 50% duty cycle

```
comp [~] .clk:
  freq: 2
  :

1wire clock = .clk
```

The signal oscillates at 2 Hz (once per second HIGH, once LOW), with 50% duty cycle (duration1 and duration0 are both 4 by default).

### Fast oscillator with asymmetric duty cycle

```
comp [osc] .fast:
  duration1: 1
  duration0: 7
  length: 4
  freq: 10
  :

1wire pulse = .fast
4wire cnt = .fast:counter
```

The signal pulses 10 times per second. It is `1` for 12.5ms and `0` for 87.5ms in each cycle. The counter counts cycles on 4 bits (0–15).

### Slow oscillator (period in seconds)

```
comp [~] .heartbeat:
  freq: 5
  freqIsSec: 1
  duration1: 1
  duration0: 4
  :

1wire pulse = .heartbeat
```

One cycle lasts 5 seconds. The signal is `1` for 1 second and `0` for 4 seconds (20% duty cycle).

### Counter that counts every state change

```
comp [~] .osc2:
  freq: 5
  eachCycle: 0
  length: 8
  :

8wire transitions = .osc2:counter
```

The counter increments twice per cycle (on each state change), so it counts 10 times per second at `freq: 5`.

### Counter with reset at value 10

```
comp [~] .osc1:
  duration1: 4
  duration0: 4
  length: 6
  freq: 2
  eachCycle: 1
  :

1wire o1 = .osc1:get
6wire cnt = .osc1:counter

.osc1:{
  reset = 1
  set = EQ(cnt, 001010)
}

show(o1, cnt)
```

The counter counts from `000000` up to `001010` (10 in decimal), then resets to `000000` and starts again. The oscillator continues to oscillate normally.

### Complete program

```
comp [~] .osc1:
  duration1: 1
  duration0: 7
  length: 4
  freq: 10
  eachCycle: 1
  :

1wire osc1 = .osc1
1wire osc1b = .osc1:get
4wire counter1 = .osc1:counter

show(osc1, osc1b, counter1)
```

---

## Restrictions

- A value cannot be assigned directly to an oscillator: `.osc1 = 1` produces an error.
- The oscillator has no visual representation in the devices panel (it can be connected to LEDs or other components for visualization).
- When the program is re-run (`RUN`), all oscillator timers are stopped automatically and recreated.
- The oscillator works independently of `NEXT(~)` — it does not require simulation cycles to oscillate.

---

## Timing diagram

```
freq: 10, duration1: 1, duration0: 7
Period = 100ms

Value:    0  1  0        1  0        1  0
          |  |  |        |  |        |  |
Time:     0 12.5 100    112.5 200   212.5 300  (ms)
          |<-->|<------>|
          HIGH   LOW
          12.5ms 87.5ms

Counter:  0000  0001     0001 0010   0010 0011
                  ^               ^            ^
              increment       increment    increment
```
