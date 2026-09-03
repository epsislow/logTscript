/* ================= USER FUNCTION TAG OVERLOADS ================= */

(function () {
  'use strict';

  function displayNameFromKey(key) {
    const i = key.lastIndexOf('::');
    return i >= 0 ? key.slice(i + 2) : key;
  }

  function paramsEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].type !== b[i].type || a[i].id !== b[i].id) return false;
    }
    return true;
  }

  function tagMapFromList(tagList) {
    const map = {};
    for (const t of tagList) {
      if (map[t.name] !== undefined) {
        throw Error(`Duplicate tag '${t.name}' in tag list`);
      }
      map[t.name] = t.bool ? 1 : t.value;
    }
    return map;
  }

  function tagMapKey(tags) {
    return Object.keys(tags).sort().map(k => `${k}=${tags[k]}`).join('|');
  }

  function tagsMatch(a, b) {
    return tagMapKey(a) === tagMapKey(b);
  }

  function tagMapToList(tags, tagKinds) {
    return Object.keys(tags).sort().map(name => {
      const kind = tagKinds && tagKinds.get ? tagKinds.get(name) : null;
      if (kind === 'bool') return { name, bool: true, value: 1 };
      return { name, value: tags[name] };
    });
  }

  function ensureGroup(entry) {
    if (!entry) return null;
    if (entry.overloads) return entry;
    return {
      params: entry.params || [],
      tagKinds: new Map(),
      overloads: [{
        tags: {},
        body: entry.body || [],
        returns: entry.returns || []
      }]
    };
  }

  function formatTagsForError(tagList) {
    if (!tagList || !tagList.length) return '';
    return tagList.map(t => {
      if (t.bool) return t.name;
      return `${t.name}=${t.value}`;
    }).join(' ');
  }

  function formatTagsForSignature(tags, tagKinds) {
    const keys = Object.keys(tags).sort();
    if (!keys.length) return '';
    return keys.map(name => {
      const kind = tagKinds && tagKinds.get ? tagKinds.get(name) : 'int';
      if (kind === 'bool') return name;
      return `${name}=${tags[name]}`;
    }).join(' ');
  }

  function formatNoUserFuncMatch(name, tagList) {
    const tagStr = formatTagsForError(tagList);
    return tagStr
      ? `no user function defined \`${name}\` and: ${tagStr}`
      : `no user function defined \`${name}\``;
  }

  function registerUserFuncOverload(funcs, key, spec) {
    const displayName = displayNameFromKey(key);
    const params = spec.params;
    const tagList = spec.tagList || [];
    const body = spec.body || [];
    const returns = spec.returns || [];

    for (const t of tagList) {
      if (params.some(p => p.id === t.name)) {
        throw Error(`Tag name '${t.name}' conflicts with parameter in user function: ${displayName}`);
      }
    }

    const tags = tagMapFromList(tagList);
    let group = funcs.get(key);

    if (!group) {
      group = { params, tagKinds: new Map(), overloads: [] };
      funcs.set(key, group);
    } else {
      group = ensureGroup(group);
      funcs.set(key, group);
      if (!paramsEqual(group.params, params)) {
        throw Error(`Parameter list mismatch for user function: ${displayName}`);
      }
    }

    for (const t of tagList) {
      const newKind = t.bool ? 'bool' : 'int';
      const prev = group.tagKinds.get(t.name);
      if (prev && prev !== newKind) {
        if (prev === 'bool') {
          throw Error(`Error ${t.name} already used as bool tag for user function: ${displayName}`);
        }
        throw Error(`Error ${t.name} already used as int tag for user function: ${displayName}`);
      }
      if (!prev) group.tagKinds.set(t.name, newKind);
    }

    for (const ov of group.overloads) {
      if (tagsMatch(ov.tags, tags)) {
        throw Error(`Duplicate tag signature for user function: ${displayName}`);
      }
    }

    group.overloads.push({ tags, body, returns });
    return group;
  }

  function mergeUserFuncMaps(target, source) {
    if (!source) return;
    for (const [fname, srcEntry] of source.entries()) {
      const group = ensureGroup(srcEntry);
      for (const ov of group.overloads) {
        registerUserFuncOverload(target, fname, {
          params: group.params,
          tagList: tagMapToList(ov.tags, group.tagKinds),
          body: ov.body,
          returns: ov.returns
        });
      }
    }
  }

  function resolveUserFuncOverload(group, callTagList) {
    const g = ensureGroup(group);
    const callTags = tagMapFromList(callTagList || []);
    for (const ov of g.overloads) {
      if (tagsMatch(ov.tags, callTags)) {
        return { group: g, overload: ov };
      }
    }
    return null;
  }

  function getUserFuncDocLines(name, group) {
    const g = ensureGroup(group);
    const lines = [];
    for (const ov of g.overloads) {
      const paramStr = g.params.map(p => `${p.type} ${p.id}`).join(', ');
      const tagStr = formatTagsForSignature(ov.tags, g.tagKinds);
      const sig = tagStr
        ? `${name}(${paramStr}; ${tagStr})`
        : `${name}(${paramStr})`;
      if (ov.returns && ov.returns.length > 0) {
        const retStr = ov.returns.map(r => r.type).join(', ');
        lines.push(`${sig} -> ${retStr}`);
      } else {
        lines.push(sig);
      }
    }
    return lines;
  }

  const api = {
    ensureGroup,
    registerUserFuncOverload,
    mergeUserFuncMaps,
    resolveUserFuncOverload,
    formatNoUserFuncMatch,
    formatTagsForError,
    formatTagsForSignature,
    getUserFuncDocLines,
    tagsMatch,
    tagMapFromList
  };

  if (typeof window !== 'undefined') window.UserFuncOverloads = api;
  if (typeof globalThis !== 'undefined') globalThis.UserFuncOverloads = api;
})();
