---
name: Matrix multidimensional extensie
overview: Extindere progresivă de la vectori 1D la tensori 2D (`4wire[N,M]`), cu model unificat vector orizontal/vertical, builtin PIVOT, indexare `:dim` / `::dim`, și tag nou `; matrix` (exclusiv cu `; vector`) pentru built-in-uri element-wise — păstrând show/peek/Zlist compatibile.
todos:
  - id: f1-tensor-type
    content: "Faza 1: parser [N,M], wire.tensor, indexare :r / ::c, show/peek/Zlist, teste wire-tensor"
    status: in_progress
  - id: f2-pivot
    content: "Faza 2: builtin PIVOT + permutare blob + teste transpose și vector vertical"
    status: pending
  - id: f3-matrix-tag-infra
    content: "Faza 3: BUILTIN_MATRIX_TAG_FUNCS, matrix-reduce.js, broadcast matrix/scalar/row/col"
    status: pending
  - id: f4-vector-oriented
    content: "Faza 4: ; vector extins pentru perechi [1,N]+[N,1] (SUM/ADD rank-1)"
    status: pending
  - id: f5-matrix-builtins
    content: "Faza 5: ; matrix pe built-in-uri (fără DOT/ARGMAX/ARGMIN) — loturi A–D"
    status: pending
  - id: f5b-dot-arg
    content: "Faza 5b: DOT înmulțire matricială + ARGMAX/ARGMIN matrice (index i,j) — fără ; matrix"
    status: pending
  - id: f6-doc-matrix
    content: "Faza 6: wire-vectors.md, matrix-reduction, builtin-tagged-index, semnături doc"
    status: pending
isProject: false
---

# Plan: vectori multidimensionali, PIVOT și `; matrix`

## Model de date (decizii confirmate)

### Forme echivalente

| Sintaxă declarație | `dims` intern (rânduri × coloane) | Rol |
|--------------------|-----------------------------------|-----|
| `4wire` | — | scalar |
| `4wire[1]` | `[1, 1]` | **scalar echivalent** — același comportament ca `4wire` (fără indexare tensor `:0` obligatorie; tratare ca fir simplu) |
| `4wire[N]` | `[1, N]` | **vector orizontal** (compat V1) |
| `4wire[1,N]` | `[1, N]` | idem `4wire[N]` |
| `4wire[N,1]` | `[N, 1]` | **vector vertical** |
| `4wire[N,M]` (N>1, M>1) | `[N, M]` | **matrice** |

**Matrice** = ambele dimensiuni > 1. Vector = exact una dintre dimensiuni este 1.

### Stocare (blob)

- Un singur fir: `totalBits = rows × cols × elementWidth` (ex. `4wire[3,2]` → 24 biți).
- **Row-major**, aceeași convenție MSB-first ca azi în `interpreter.js`: celula `(r,c)` la index liniar `r × cols + c`.
- Metadata propusă (înlocuiește/extinde `wire.vector`):

```javascript
wire.tensor = { elementWidth: W, dims: [rows, cols] }
// rows=1, cols=N  →  afișare preferată 4wire[N]
// rows=N, cols=1  →  4wire[N,1]
```

Migrare: `wire.vector = { elementWidth, elementCount }` rămâne valid pentru `[1,N]`; noile declarații 2D folosesc `wire.tensor`.

### Indexare

| Sintaxă | Rezultat |
|---------|----------|
| `tensorA:r:c` / `tensorA:(r):(c)` | celulă scalară `(r,c)` |
| `tensorA:r` / `tensorA:(r)` | **slice dim 0 fixă** → vector de lungime `cols` (rândul `r`) |
| `tensorA::c` / `tensorA::(c)` | **slice dim 1 fixă** → vector de lungime `rows` (coloana `c`) |

- `::` este nou în atomi (nu se confundă cu `alias::name` din `parser.js` L433 — acolo e doar în `def`, nu în expresii).
- **Index liniar** `vectorB:3` rămâne valid pentru orice orientare (`[1,N]` sau `[N,1]`) — același element fizic.

### PIVOT

```logts
4wire[2,3] matrixB = PIVOT(matrixA)   # [3,2] → [2,3]
4wire[3,1] col = PIVOT(rowVec)        # [1,3] → [3,1]
4wire[3] row = PIVOT(col)             # [3,1] → [1,3] → afișat 4wire[3]
```

Builtin nou (fără tag): `PIVOT(Xtensor) -> Xtensor` — doar swap `dims[0] ↔ dims[1]`.

---

## Faze de implementare

### Faza 1 — Tip tensor 2D (fără tag-uri noi)

**Fișiere cheie:** `parser.js`, `interpreter.js`, `tensor-shape.js`, `watch-expand.js`

1. **`parseTensorShapeSuffix`**: parsează `[N]` și `[N,M]` **doar**; orice a treia dimensiune (`4wire[2,3,4]`) → **eroare de parse permanentă**.
2. **Normalizare declarație**: `4wire[N]` → `dims [1,N]`; `4wire[1]` → scalar echivalent (`[1,1]`).
3. **`_applyDeclTensorMeta`**: setează `wire.tensor`, `wire.type = (rows×cols×W)wire`.
4. **`getWireTypeLabel`**: `4wire[3]`, `4wire[3,2]`, `4wire[3,1]`.
5. **Rezolvare slice**: `:r`, `::c`, `:r:c`; slice write RMW pe blob.
6. **show / peek / Zlist**: format ierarhic; compat vectori 1D.
7. **watch-expand**: limită afișare ca la vectori.
8. **Teste** grup `wire-tensor`.

### Faza 2 — Builtin PIVOT

### Faza 3 — Infrastructură `; matrix`

### Faza 4 — `; vector` cu orientare (rank-1 broadcast)

### Faza 5 — `; matrix` pe built-in-uri

### Faza 5b — DOT și ARGMAX/ARGMIN pe tensori

### Faza 6 — Documentație

---

## Decizii de scope confirmate

| # | Subiect | Decizie |
|---|---------|---------|
| 1 | **3D+** | **Nu** — parser respinge explicit |
| 2 | **`4wire[1]` ≡ scalar** | **Da** |
| 3 | **`over` pe matrice** | **Per celulă** |
| 4 | **watch-expand** | Limită ca la vectori |
| 5 | **Performanță** | BigInt OK pentru perceptron |
