/* ================= BOOLEAN MINIMIZE (Quine-McCluskey v1) ================= */

function countOnes(n) {
  let c = 0;
  while (n) { c += n & 1; n >>= 1; }
  return c;
}

function combineTerms(a, b, numVars) {
  let diff = 0;
  let diffPos = -1;
  const ac = a.split('');
  const bc = b.split('');
  for (let i = 0; i < numVars; i++) {
    const ca = ac[i];
    const cb = bc[i];
    if (ca === '-' && cb === '-') continue;
    if (ca === cb) continue;
    if ((ca === '0' || ca === '1') && (cb === '0' || cb === '1') && ca !== cb) {
      diff++;
      diffPos = i;
    } else {
      return null;
    }
  }
  if (diff !== 1) return null;
  ac[diffPos] = '-';
  return ac.join('');
}

function findPrimeImplicants(minterms, numVars) {
  const groups = {};
  for (const m of minterms) {
    const bits = m.toString(2).padStart(numVars, '0').split('');
    const ones = countOnes(m);
    if (!groups[ones]) groups[ones] = [];
    groups[ones].push({ bits: bits.join(''), covered: new Set([m]) });
  }

  const primes = [];
  let current = Object.values(groups).flat();

  while (current.length > 0) {
    const next = [];
    const used = new Set();

    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const combined = combineTerms(current[i].bits, current[j].bits, numVars);
        if (!combined) continue;
        used.add(i);
        used.add(j);
        let entry = next.find(e => e.bits === combined);
        if (!entry) {
          entry = { bits: combined, covered: new Set() };
          next.push(entry);
        }
        for (const m of current[i].covered) entry.covered.add(m);
        for (const m of current[j].covered) entry.covered.add(m);
      }
    }

    for (let i = 0; i < current.length; i++) {
      if (!used.has(i)) primes.push(current[i]);
    }
    current = next;
  }

  return primes;
}

function selectCover(primes, minterms) {
  const table = primes.map(p => ({
    bits: p.bits,
    covered: [...p.covered]
  }));

  const essential = [];
  const covered = new Set();
  const remaining = new Set(minterms);

  for (const m of minterms) {
    const covering = table.filter(p => p.covered.includes(m));
    if (covering.length === 1) {
      const p = covering[0];
      if (!essential.includes(p)) essential.push(p);
    }
  }

  for (const p of essential) {
    for (const m of p.covered) {
      covered.add(m);
      remaining.delete(m);
    }
  }

  if (remaining.size === 0) return essential;

  const rest = [...remaining];
  let best = null;

  function search(idx, chosen, coveredSet) {
    if (rest.every(m => coveredSet.has(m))) {
      const total = chosen.length;
      if (!best || total < best.length) best = chosen.slice();
      return;
    }
    if (idx >= table.length) return;
    if (best && chosen.length >= best.length) return;

    search(idx + 1, chosen, coveredSet);

    const p = table[idx];
    const adds = p.covered.filter(m => rest.includes(m) && !coveredSet.has(m));
    if (adds.length > 0) {
      const nextCovered = new Set(coveredSet);
      for (const m of adds) nextCovered.add(m);
      chosen.push(p);
      search(idx + 1, chosen, nextCovered);
      chosen.pop();
    }
  }

  search(0, essential.slice(), covered);
  return best || essential;
}

/**
 * @param {string[]} inputBitLabels
 * @param {boolean[]} outputs - one per address 0..length-1
 * @returns {{ constant?: boolean, terms: { label: string, negated: boolean }[][] }}
 */
function minimizeBoolean(inputBitLabels, outputs) {
  const numVars = inputBitLabels.length;
  if (numVars > 8) throw new Error('minimizeBoolean: too many input bits');

  const minterms = [];
  for (let i = 0; i < outputs.length; i++) {
    if (outputs[i]) minterms.push(i);
  }

  if (minterms.length === 0) return { constant: false, terms: [] };
  if (minterms.length === outputs.length) return { constant: true, terms: [] };

  const primes = findPrimeImplicants(minterms, numVars);
  const selected = selectCover(primes, minterms);

  const terms = selected.map(p => {
    const literals = [];
    for (let i = 0; i < numVars; i++) {
      const ch = p.bits[i];
      if (ch === '-') continue;
      literals.push({ label: inputBitLabels[i], negated: ch === '0' });
    }
    return literals;
  });

  return { terms };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { minimizeBoolean };
}
