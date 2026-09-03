# JSON subset — protocol example

Minimal JSON on a **single bitstream** (no whitespace, no numbers). Demonstrates **tentative choice**, **section repeat**, **anchor strings**, and **wire string literals** together.

Mechanisms: [protocol-tentative.md](protocol-tentative.md), [protocol-repeat.md](protocol-repeat.md), [protocol-parse.md](protocol-parse.md#wire-literals-in-parse-protocol).

---

## Target document

```json
{"active":true,"tags":["x","y"],"meta":{"ok":false}}
```

---

## Protocol `.jsonSubset`

```logts-play legacy
inline [protocol] .jsonSubset:
  mode: parse
  parseView: tree

  def trueLit:
    "true"
  def falseLit:
    "false"
  def jsonBool:
    trueLit?
    falseLit?

  def jsonChar:
    byte 8b

  def jsonString:
    "\""
    jsonChar[0-]
    "\""

  def jsonValue:
    jsonObject?
    jsonArray?
    jsonString?
    jsonBool?

  def jsonPair:
    jsonString
    ":"
    jsonValue

  def pairEntry:
    ","
    jsonPair

  def pairList:
    jsonPair
    pairEntry*

  def jsonObject:
    "{"
    pairList?
    "}"

  def arrayEntry:
    ","
    jsonValue

  def valueList:
    jsonValue
    arrayEntry*

  def jsonArray:
    "["
    valueList?
    "]"

  out:
    jsonValue
  :
```

| Fragment | Mechanism |
|----------|-----------|
| `trueLit?` / `falseLit?` | tentative choice between defs |
| `jsonObject?` / … | `jsonValue` dispatch |
| `pairEntry*` | unbounded repeat (comma-separated pairs) |
| `"\"` … `"\""` | wire-string anchor for `jsonChar[0-]` |
| `pairList?` | empty object `{}` allowed |

**Limits:** no `\` escapes inside strings; no numbers; no whitespace between tokens.

---

## Runnable — minimal object

```logts-play legacy
inline [protocol] .jsonSubset:
  mode: parse
  parseView: tree
  def trueLit:
    "true"
  def falseLit:
    "false"
  def jsonBool:
    trueLit?
    falseLit?
  def jsonChar:
    byte 8b
  def jsonString:
    "\""
    jsonChar[0-]
    "\""
  def jsonValue:
    jsonObject?
    jsonArray?
    jsonString?
    jsonBool?
  def jsonPair:
    jsonString
    ":"
    jsonValue
  def pairEntry:
    ","
    jsonPair
  def pairList:
    jsonPair
    pairEntry*
  def jsonObject:
    "{"
    pairList?
    "}"
  def arrayEntry:
    ","
    jsonValue
  def valueList:
    jsonValue
    arrayEntry*
  def jsonArray:
    "["
    valueList?
    "]"
  out:
    jsonValue
  :

# ASCII bits for {"active":true} — build in script or paste from encoder
# Example: assign via external tool; here we show parseView after manual bit wire:
```

For a full bit-exact demo in tests, see suite tests **2169–2170** (`asciiWireBits` pattern).

---

## parseView (conceptual)

```text
jsonObject
  pairList
    jsonPair[0] → "active" : true
    jsonPair[1] → "tags" : jsonArray …
    jsonPair[2] → "meta" : jsonObject …
```

Access uses **0-based** indices on repeated sections: `parsed:jsonPair:0:…` (see [protocol-repeat.md](protocol-repeat.md)).
