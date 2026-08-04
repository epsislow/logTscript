---
name: PHZ each docs
overview: Extinde documentația PHZ cu semantica „each” din sketch-ul 2b (fără schimbări de motor), păstrând destinația `to = .<cont>:inside`, cu exemple Load / Load & Run.
todos:
  - id: expand-each-doc
    content: Extinde secțiunea each în phz.md (filozofie, exemple logts-play, on:, design notes)
    status: completed
  - id: regen-doc-data
    content: Regenerează doc-data_generated.js
    status: completed
isProject: false
---

# Documentație PHZ each (sketch 2b)

## Decizie
- **Păstrăm** forma implementată: `to = .container2:inside` (nu `to = .container2` din sketch).
- **Fără** schimbări de runtime — doar doc + exemple runnable.
- Sketch-ul = clarificări pe O7a/O8b deja în [`executePhzPropertyBlock`](v0_3_2/core/interpreter.js).

## Unde
Actualizează [`v0_3_2/doc/phz.md`](v0_3_2/doc/phz.md) — secțiunea existentă **„each + self-relative paths”** (înlocuire/extindere), nu un modul separat.

## Conținut de adăugat
1. **Filozofie scurtă:** fără `for`/`while`/`foreach`; iterația e internă în motor; scriptul descrie *ce* se întâmplă.
2. **`each`:** placeholder temporar (nu variabilă, nu stocat); există doar în timpul unui PHZ property block; snapshot pe colecție.
3. **`:inside` self-relativ** pe owner-ul block-ului.
4. **Exemple `logts-play wave`** (butoane Load / Load & Run), toate cu `to = …:inside`:
   - mută tot: `move = :inside:each`, `set = 1`
   - filtru tip (păstrează/adaptează exemplul truck existent)
   - asignare atribut: `:inside:each:km = ADD(...)` + `set` predicat
   - multi-op: set attr + `move` în același block
   - semnal extern: `1wire moveReady = …` apoi `set = moveReady`
5. **Notă `on:`:** `each` nu e disponibil în `on:1 {…}`; `on` doar produce semnale care activează property block-ul PHZ.
6. **Design notes** scurte: nu assign pe wire, nu acces în afara block-ului.

## După edit
- `node node/_gen_doc_data.js` ca viewer-ul să vadă markdown-ul nou.
- Nu e nevoie de teste noi dacă doar doc; suite neschimbată.

## Nu intră în scope
- Schimbări parser/interpreter
- Acceptarea `to = .container2` fără `:inside`
