/**
 * Doc viewer search index + ranking (browser + Node).
 */
(function (root) {
  'use strict';

  function primaryTokens(entry) {
    return (entry.primaryHaystack || '').split(/\s+/).filter(Boolean);
  }

  function buildEntryHaystacks(item) {
    const stem = item.file.replace(/\.md$/, '');
    const primaryRaw = item.searchPrimary ? String(item.searchPrimary) : '';
    const extra = item.searchExtra ? ' ' + item.searchExtra : '';
    const secondaryBase = (item.label + ' ' + stem + ' ' + stem.replace(/-/g, ' ') + extra).trim();
    const primaryHaystack = primaryRaw.toLowerCase().trim();
    const secondaryHaystack = secondaryBase.toLowerCase();
    return {
      file: item.file,
      label: item.label,
      primaryHaystack: primaryHaystack,
      secondaryHaystack: secondaryHaystack,
      haystack: (primaryHaystack + ' ' + secondaryHaystack).trim(),
    };
  }

  function buildIndex(sections, searchOnly) {
    const list = [];
    (sections || []).forEach(function (section) {
      (section.items || []).forEach(function (item) {
        list.push(Object.assign({ section: section.title }, buildEntryHaystacks(item)));
      });
    });
    (searchOnly || []).forEach(function (item) {
      list.push(Object.assign({ section: item.section || 'Other' }, buildEntryHaystacks(item)));
    });
    return list;
  }

  function primaryMatchesQuery(entry, query, mode) {
    const tokens = primaryTokens(entry);
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (mode === 'exact' && t === query) return true;
      if (mode === 'prefix' && t.startsWith(query)) return true;
      if (mode === 'includes' && t.indexOf(query) !== -1) return true;
    }
    return false;
  }

  function docSearchRank(entry, query) {
    const label = entry.label.toLowerCase();
    const stem = entry.file.replace(/\.md$/, '').toLowerCase();
    const secondary = entry.secondaryHaystack || entry.haystack || '';

    if (label === query || stem === query || primaryMatchesQuery(entry, query, 'exact')) return 0;
    if (label.startsWith(query) || stem.startsWith(query) || primaryMatchesQuery(entry, query, 'prefix')) return 1;
    if (label.includes(query) || stem.includes(query)) return 2;
    if (primaryMatchesQuery(entry, query, 'includes')) return 2;
    if (secondary.indexOf(query) !== -1) return 3;
    return 4;
  }

  function filterDocSearch(index, query) {
    const q = query.trim().toLowerCase();
    if (!q) return index.slice();
    const tokens = q.split(/\s+/).filter(Boolean);
    const list = index.filter(function (entry) {
      return tokens.every(function (token) {
        return entry.haystack.indexOf(token) !== -1;
      });
    });
    list.sort(function (a, b) {
      const ra = docSearchRank(a, q);
      const rb = docSearchRank(b, q);
      if (ra !== rb) return ra - rb;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
    return list;
  }

  const api = {
    buildEntryHaystacks: buildEntryHaystacks,
    buildIndex: buildIndex,
    docSearchRank: docSearchRank,
    filterDocSearch: filterDocSearch,
  };

  root.DocSearchIndex = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.DocSearchIndex;
}
