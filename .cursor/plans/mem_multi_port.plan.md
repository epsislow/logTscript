---
name: Mem multi-port ports
overview: Extindere `comp [mem]` cu `ports` (1–4), pinuri `adr`/`2adr`/…, `readonly`, write collision; migrare completă `at`→`adr` în cod, teste, fs.js și documentație; `reg` neschimbat.
todos:
  - id: tokenizer-port-props
    content: "Tokenizer: ID pentru 2adr..4get; parser readonly flag"
    status: pending
  - id: mem-devices-commit
    content: "mem-devices.js: writeQueue, beginMemWritePhase, queueMemWrite, commitMemWrites, collision"
    status: pending
  - id: mem-component-ports
    content: "Refactor mem.js: ports 1-4, adr (nu at), supportsPropertyName, evalGet/apply per port, readonly"
    status: pending
  - id: wave-commit-hook
    content: "signal-propagation + interpreter: commit phase; ștergere legacy mem branch"
    status: pending
  - id: migrate-at-adr
    content: "Migrare at→adr: mem.js, interpreter, test_suite_ported, test_repeat, test_manifest strings, fs.js (~80+ locuri), toate doc/*.md mem; NU reg/lut"
    status: pending
  - id: doc-mem-ports
    content: doc/mem.md multi-port + readonly EN; future-component-ideas; lut.md cross-ref; _gen_doc_data.js
    status: pending
  - id: tests-mem-ports
    content: test_suite_ported 984-996; _gen_manifest.js grup mem-ports; reg smoke; rerun _run_suite_node + test_repeat
    status: pending
isProject: false
---

# Plan: `comp [mem]` multi-port + readonly

## Obiectiv

Un singur array fizic de memorie, accesibil prin **1–4 porturi independente** în același pas de propagare. Atribut `readonly` pentru ROM. **`comp [reg]` rămâne neschimbat.**

Decizii confirmate:
- Port 1: **`adr`** (înlocuiește **`at`** peste tot la `mem`) — breaking change cu migrare completă
- **`ports` maxim 4**; default `ports: 1`

---

## Migrare obligatorie `at` → `adr` (mem only)

Această migrare este **pas explicit** în implementare, nu doar documentație nouă. Orice referință la pinul de adresă al `comp [mem]` devine `adr` (port 2+: `2adr`, etc.).

### Reguli de înlocuire

| Înainte | După | Exemplu |
|---------|------|---------|
| `at = …` în bloc `.mem:{` | `adr = …` | `.ram:{ adr = 0010 }` |
| `.mem:at = …` (inline pin) | `.mem:adr = …` | `.data:adr = opd` |
| `Xpin at` în doc | `Xpin adr` | `doc(comp.mem)` |
| `:at` + `:get` (text doc) | `:adr` + `:get` | „Reading (`:adr` + `:get`)" |
| `pending.at` în cod mem | `pending.adr` | `mem.js`, `interpreter.js` |
| comentarii `m:at`, `.rom:at` | `m:adr`, `.rom:adr` | test_repeat.js |

**Nu schimba** (nu sunt pin mem):
- `comp [reg]`, `lut:in`, `repeat`, `at` ca cuvânt în alte contexte
- `ui/doc-data.js` — **generat**; se actualizează doar via `node _gen_doc_data.js` după editarea `doc/*.md`

### Inventar fișiere — migrare `at` → `adr`

#### Cod runtime (implementare multi-port)

| Fișier | Acțiune |
|--------|---------|
| [`core/components/mem.js`](v0_3_2/core/components/mem.js) | `getDef`: `at` → `adr`; `evalGetProperty` / `applyProperties`: `pending.adr` |
| [`core/interpreter.js`](v0_3_2/core/interpreter.js) | Ramură legacy mem ~7391: `pending.at` → `pending.adr`; comentarii |

#### Teste existente (obligatoriu înainte/după implementare)

| Fișier | Locuri / note |
|--------|----------------|
| [`test_suite_ported.js`](v0_3_2/test_suite_ported.js) | Mini-CPU / board (~2331, 2337, 2363): `.prog:{ at` → `adr`; `.data:at` → `.data:adr` |
| [`test_repeat.js`](v0_3_2/test_repeat.js) | ~3502–3510: helper `getMemAt515` → `getMemAdr515`, string `\nat = __at` → `\nadr = __adr`; ~3569 comentariu `.m:at` → `.m:adr` |
| [`test_manifest.js`](v0_3_2/test_manifest.js) | **Regenerat** după migrare teste (`node _gen_manifest.js`) — conține scripturi embedded cu `at` (ex. test 515, mini-cpu) |

Teste `test_suite_ported.js` care folosesc doar `.m:get` fără `at` (514, 515 parțial, 899–906 asm) — **fără schimbare** dacă nu conțin `at`.

#### Demo-uri editor — [`files/fs.js`](v0_3_2/files/fs.js)

Migrare în masă a tuturor programelor demo mem (~**80+** apariții `at=` / `.rom:at` / `.mem:at`):

- `at=0`, `at=01`, `at = xp`, `at= crs`, `.rom:at = …`, `.mem:at = …`
- Liniile care sunt deja comentarii/documentație internă (`at= adr`) — unificare la `adr=`
- Verificare: `rg '\bat\s*=' v0_3_2/files/fs.js` → zero matches în context `comp [mem]` / `.rom` / `.ram` / `.mem` / `.prog` / `.data`

`fs.js` este sursa programelor din file browser; trebuie actualizat odată cu breaking change-ul.

#### Documentație EN (surse markdown)

| Fișier | Conținut de migrat |
|--------|-------------------|
| [`doc/mem.md`](v0_3_2/doc/mem.md) | Secțiuni property block, pins table, `doc(comp.mem)` example (`Xpin at` → `Xpin adr`), note `:at` |
| [`doc/mini-cpu.md`](v0_3_2/doc/mini-cpu.md) | Toate `.prog:{ at`, `.data:at` (4 blocuri) |
| [`doc/lut.md`](v0_3_2/doc/lut.md) | Tabel comparativ: `` `:{ at = … }` `` → `` `:{ adr = … }` `` |
| [`doc/future-component-ideas.md`](v0_3_2/doc/future-component-ideas.md) | `.rom:{ at = pc }` → `adr` |

După editare: **`node v0_3_2/_gen_doc_data.js`** (regenerează [`ui/doc-data.js`](v0_3_2/ui/doc-data.js)).

#### Verificare finală migrare

```bash
# În v0_3_2 — nu trebuie să rămână pin mem "at" în surse (excl. node_modules, minified)
rg '\b(at\s*=|:at\b|Xpin at|pending\.at)' --glob '!ui/doc-data.js' --glob '!test_manifest.js' --glob '!marked.min.js' --glob '!codemirror.min.js'
```

Așteptat: zero în `mem.js`, `fs.js`, `doc/mem.md`, `test_suite_ported.js`, `test_repeat.js` (exceptând variabile wire `__at` redenumite `__adr`).

### Notă breaking change (în doc)

Adăugare în [`doc/mem.md`](v0_3_2/doc/mem.md):

> **v0.3.x:** The address pin was renamed from `at` to **`adr`**. Update all `comp [mem]` property blocks and inline assignments.

---

## 1. Model porturi și nume pinuri

```javascript
// port 1: adr, data, write, get
// port 2+: 2adr, 2data, 2write, 2get … ports ≤ 4
parseMemPortProperty(name) → { port, pin } | null
```

`getDef(attributes)` dinamic — listează toate pinurile pentru `ports: N`.

Atribute noi: `ports` (1–4), `readonly` (flag).

---

## 2. Tokenizer — `2adr`, `2get`, …

[`core/tokenizer.js`](v0_3_2/core/tokenizer.js):

```javascript
if (/^[2-9](adr|data|write|get)$/.test(v)) {
  return this.token('ID', v);
}
```

---

## 3. Storage și fază commit (write collision)

[`devices/mem-devices.js`](v0_3_2/devices/mem-devices.js): `writeQueue`, `beginMemWritePhase`, `queueMemWrite`, `commitMemWrites`.

- Read combinational din storage comis
- Write în coadă; commit la sfârșitul pasului wave/legacy
- Coliziune: `Memory write collision at address N`

---

## 4. Refactor `MemComponent`

[`core/components/mem.js`](v0_3_2/core/components/mem.js): ports, `adr`, readonly, `supportsPropertyName`, `evalGetProperty` / `applyProperties` per port, pending cleanup între blocuri.

---

## 5. Registry + interpreter

[`component-registry.js`](v0_3_2/core/components/component-registry.js): `supportsProperty(type, prop, attributes)`.

[`interpreter.js`](v0_3_2/core/interpreter.js): eliminare duplicat legacy mem; commit hooks.

[`signal-propagation.js`](v0_3_2/core/signal-propagation.js): fază commit mem.

---

## 6. Documentație multi-port (EN)

Extindere [`doc/mem.md`](v0_3_2/doc/mem.md) cu secțiunea **Multi-port memory** (spec utilizator): `ports`, `2adr`/`2get`, simultan read/write, collision, readonly, exemple `logts-play`.

[`doc/future-component-ideas.md`](v0_3_2/doc/future-component-ideas.md): A5 dual-port → parțial acoperit.

---

## 7. Teste noi (grup `mem-ports`, id **984+**)

| ID | Titlu |
|----|-------|
| 984 | ports default 1 + `adr`/`get` |
| 985 | parse ports:2 + tokenizer 2get |
| 986 | dual simultaneous read |
| 987 | read port1 + write port2 |
| 988 | write collision |
| 989 | port 3 inexistent |
| 990 | multi-word 2write |
| 991–993 | readonly |
| 994 | doc(comp.mem) pins |
| 995 | reg unchanged |
| 996 | wave dual read |

[`_gen_manifest.js`](v0_3_2/_gen_manifest.js): `{ id: 'mem-ports', label: 'Memory multi-port' }`

---

## 8. Ordine implementare

1. **Migrare `at`→`adr`** în `mem.js` + teste existente + `fs.js` + `doc/*.md` (poate fi PR separat sau primul commit)
2. Tokenizer + `parseMemPortProperty`
3. `mem-devices` write queue + commit
4. `MemComponent` multi-port + readonly
5. Wave commit + registry/interpreter cleanup
6. Doc multi-port + exemple noi
7. Teste 984–996
8. `node _gen_doc_data.js` + `node _gen_manifest.js`
9. `node _run_suite_node.js` + smoke `test_repeat.js` (test 515, mini-cpu)

**Neschimbat:** [`core/components/reg.js`](v0_3_2/core/components/reg.js), secțiunea `registers` din `mem-devices.js`.
