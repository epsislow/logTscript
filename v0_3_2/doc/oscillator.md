# Oscillator (Oscilator)

Componenta `osc` genereaza un semnal digital periodic de 1 bit, cu frecventa si duty cycle configurabile. Include un counter intern care numara ciclurile.

Oscilatorul functioneaza in **timp real** — odata creat, oscileaza independent de `NEXT(~)`, folosind timere interne ale browser-ului.

---

## Sintaxa

```
comp [osc] .nume:
  duration1: 4
  duration0: 4
  length: 4
  freq: 1
  freqIsSec: 0
  eachCycle: 1
  :
```

Forma scurta cu `~`:

```
comp [~] .nume:
  ...
  :
```

Forma minimala (fara atribute, toate valorile sunt default):

```
comp [osc] .nume::
```

---

## Atribute

| Atribut     | Tip   | Min | Max | Default | Descriere |
|-------------|-------|-----|-----|---------|-----------|
| `duration1` | int   | 1   | 8   | 4       | Proportia de timp in care semnalul este `1` (HIGH) |
| `duration0` | int   | 1   | 8   | 4       | Proportia de timp in care semnalul este `0` (LOW) |
| `length`    | int   | 1   | -   | 4       | Numarul de biti ai counter-ului intern |
| `freq`      | float | >0  | -   | 1       | Frecventa in Hz sau perioada in secunde (vezi `freqIsSec`) |
| `freqIsSec` | int   | 0   | 1   | 0       | Modul de interpretare a lui `freq`: `0` = Hz (cicluri/secunda), `1` = secunde (perioada unui ciclu) |
| `eachCycle`  | int   | 0   | 1   | 1       | Cand se incrementeaza counter-ul: `1` = la fiecare ciclu complet, `0` = la fiecare schimbare de stare |

### Frecventa si freqIsSec

Atributul `freq` controleaza viteza oscilatorului. Modul de interpretare depinde de `freqIsSec`:

- `freqIsSec: 0` (default) — `freq` este in **Hz** (cicluri pe secunda). Perioada = `1000 / freq` ms.
- `freqIsSec: 1` — `freq` este in **secunde** (durata unui ciclu complet). Perioada = `freq * 1000` ms.

**Exemple:**

| freq | freqIsSec | Perioada | Descriere |
|------|-----------|----------|-----------|
| 10   | 0         | 100ms    | 10 cicluri pe secunda |
| 1    | 0         | 1000ms   | 1 ciclu pe secunda |
| 0.5  | 0         | 2000ms   | 1 ciclu la 2 secunde |
| 5    | 1         | 5000ms   | 1 ciclu la 5 secunde |
| 30   | 1         | 30000ms  | 1 ciclu la 30 secunde |
| 120  | 1         | 120000ms | 1 ciclu la 2 minute |

`freqIsSec: 1` este util pentru perioade lungi (peste 1 secunda) unde scrierea in Hz ar necesita valori fractionare sub 1.

### Duty Cycle

Proportia HIGH/LOW este calculata din `duration1` si `duration0`:

- Timp HIGH = `duration1 / (duration1 + duration0)` din perioada
- Timp LOW = `duration0 / (duration1 + duration0)` din perioada

**Exemplu:** Cu `duration1: 1` si `duration0: 7` la `freq: 10` (`freqIsSec: 0`):
- Perioada = 100ms (10 cicluri/secunda)
- HIGH = 1/8 din 100ms = 12.5ms
- LOW = 7/8 din 100ms = 87.5ms

**Exemplu cu freqIsSec: 1:** Cu `duration1: 4` si `duration0: 4` la `freq: 10` (`freqIsSec: 1`):
- Perioada = 10000ms (10 secunde per ciclu)
- HIGH = 5000ms (5 secunde)
- LOW = 5000ms (5 secunde)

### Counter

Counter-ul este un numarator binar pe `length` biti. Porneste de la `0` si se incrementeaza conform atributului `eachCycle`:

- `eachCycle: 1` — counter-ul creste cu 1 la fiecare ciclu complet (dupa faza HIGH + LOW)
- `eachCycle: 0` — counter-ul creste cu 1 la fiecare schimbare de stare (de 2 ori per ciclu: la tranzitia 0→1 si la 1→0)

Cand counter-ul ajunge la valoarea maxima (toti bitii pe 1), face **wrap-around** si revine la 0.

---

## Iesiri

Oscilatorul expune 3 proprietati de citire:

### Valoarea directa — `.osc1`

Returneaza valoarea curenta a semnalului (1 bit: `0` sau `1`).

```
1wire osc1 = .osc1
```

### `:get` — `.osc1:get`

Identic cu valoarea directa. Returneaza semnalul curent de 1 bit.

```
1wire osc1b = .osc1:get
```

`.osc1` si `.osc1:get` sunt intotdeauna sincronizate — au aceeasi valoare in orice moment.

### `:counter` — `.osc1:counter`

Returneaza valoarea counter-ului intern pe `length` biti.

```
4wire counter1 = .osc1:counter
```

Cu `length: 4`, counter-ul are valori de la `0000` la `1111` (0-15), apoi revine la `0000`.

---

## Intrari

### `:reset` — resetare counter

Proprietatea `:reset` permite resetarea counter-ului intern la `0`. Se utilizeaza in cadrul unui bloc cu `set` ca trigger:

```
.osc1:{
  reset = 1
  set = EQ(cnt, 1010)
}
```

Cand expresia din `set` face tranzitia de la `0` la `1` (rising edge), blocul se executa si counter-ul este resetat la `0...0` (toti bitii pe `0`).

**Comportament:**

- `reset = 1` — counter-ul este resetat la valoarea `0` (pe `length` biti)
- `reset = 0` — nu se intampla nimic (counter-ul continua normal)
- Dupa reset, counter-ul reia numararea de la `0`
- Semnalul oscilatorului (HIGH/LOW) nu este afectat — doar counter-ul este resetat

---

## Exemple

### Oscilator simplu cu duty cycle 50%

```
comp [~] .clk:
  freq: 2
  :

1wire clock = .clk
```

Semnalul oscileaza la 2 Hz (o data pe secunda HIGH, o data LOW), cu duty cycle de 50% (duration1 si duration0 sunt ambele 4 implicit).

### Oscilator rapid cu duty cycle asimetric

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

Semnalul pulseaza de 10 ori pe secunda. Este `1` pentru 12.5ms si `0` pentru 87.5ms in fiecare ciclu. Counter-ul numara ciclurile pe 4 biti (0-15).

### Oscilator lent (perioada in secunde)

```
comp [~] .heartbeat:
  freq: 5
  freqIsSec: 1
  duration1: 1
  duration0: 4
  :

1wire pulse = .heartbeat
```

Un ciclu dureaza 5 secunde. Semnalul este `1` pentru 1 secunda si `0` pentru 4 secunde (duty cycle 20%).

### Counter care numara fiecare tranzitie

```
comp [~] .osc2:
  freq: 5
  eachCycle: 0
  length: 8
  :

8wire transitions = .osc2:counter
```

Counter-ul se incrementeaza de 2 ori per ciclu (la fiecare schimbare de stare), deci numara de 10 ori pe secunda la `freq: 5`.

### Counter cu reset la valoarea 10

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

Counter-ul numara de la `000000` pana la `001010` (10 in decimal), apoi este resetat la `000000` si reia numararea. Oscilatorul continua sa oscileze normal.

### Program complet

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

## Restrictii

- Nu se poate atribui o valoare direct la un oscilator: `.osc1 = 1` produce eroare.
- Oscilatorul nu are reprezentare vizuala in panoul de dispozitive (se poate conecta la LED-uri sau alte componente pentru vizualizare).
- La re-rularea programului (`RUN`), toate timerele oscilatorilor sunt oprite automat si recreate.
- Oscilatorul functioneaza independent de `NEXT(~)` — nu necesita cicluri de simulare pentru a oscila.

---

## Diagrama de functionare

```
freq: 10, duration1: 1, duration0: 7
Perioada = 100ms

Valoare:  0  1  0        1  0        1  0
          |  |  |        |  |        |  |
Timp:     0 12.5 100    112.5 200   212.5 300  (ms)
          |<-->|<------>|
          HIGH   LOW
          12.5ms 87.5ms

Counter:  0000  0001     0001 0010   0010 0011
                  ^               ^            ^
              increment       increment    increment
```
