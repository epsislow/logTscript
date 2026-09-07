/* Comp card CodeMirror widgets — DOM layer over LogTScriptCompCardModel */
(function (root) {
  'use strict';

  const CCM = root.LogTScriptCompCardModel;
  if (!CCM) return;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildTypeSelectHtml(catalog, currentType) {
    let html = '<select class="cm-comp-card-type-select">';
    for (const [category, items] of Object.entries(catalog)) {
      html += '<optgroup label="' + escapeHtml(category) + '">';
      items.forEach(function (item) {
        const sel = item === currentType ? ' selected' : '';
        html += '<option value="' + escapeHtml(item) + '"' + sel + '>[' + escapeHtml(item) + ']</option>';
      });
      html += '</optgroup>';
    }
    html += '</select>';
    return html;
  }

  function blockReplaceTo(editor, span) {
    return { line: span.endLine, ch: editor.getLine(span.endLine).length };
  }

  function applyPatch(editor, model, newText, onPatched, internalEditFlag, clearBlockMarker) {
    const span = model.span;
    const scroll = editor.getScrollInfo();
    const focusEl = document.activeElement;
    if (clearBlockMarker) clearBlockMarker(model.id);
    if (internalEditFlag) internalEditFlag.value = true;
    try {
      editor.operation(function () {
        editor.replaceRange(
          newText,
          { line: span.startLine, ch: 0 },
          blockReplaceTo(editor, span)
        );
      });
    } finally {
      if (internalEditFlag) internalEditFlag.value = false;
    }
    if (typeof onPatched === 'function') onPatched();
    requestAnimationFrame(function () {
      editor.scrollTo(scroll.left, scroll.top);
      if (focusEl && typeof focusEl.focus === 'function' && focusEl.isConnected) {
        try { focusEl.focus({ preventScroll: true }); } catch (e) {
          try { focusEl.focus(); } catch (e2) { /* ignore */ }
        }
      }
    });
  }

  function changeTouchesSpan(change, span) {
    const from = change.from;
    const to = change.to || change.from;
    const lineLo = Math.min(from.line, to.line);
    const lineHi = Math.max(from.line, to.line);
    if (lineHi < span.startLine || lineLo > span.endLine) return false;
    return true;
  }

  function cursorInsideSpan(cursor, span) {
    return cursor.line >= span.startLine && cursor.line <= span.endLine;
  }

  function moveCursorOutsideSpan(editor, span) {
    const afterLine = span.endLine + 1;
    if (afterLine < editor.lineCount()) {
      editor.setCursor({ line: afterLine, ch: 0 });
      return true;
    }
    if (span.startLine > 0) {
      const prev = span.startLine - 1;
      editor.setCursor({ line: prev, ch: editor.getLine(prev).length });
      return true;
    }
    return false;
  }

  function isUserEditOrigin(origin) {
    return origin === '+input' || origin === '+delete' || origin === 'paste' || origin === 'cut';
  }

  function isCaretEditableInput(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return false;
    const t = (el.type || 'text').toLowerCase();
    return t === 'text' || t === 'search' || t === 'tel' || t === 'url' ||
      t === 'email' || t === 'password' || t === 'number';
  }

  function caretIndexFromMouse(el, clientX) {
    const text = el.value || '';
    if (!text.length) return 0;
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const padL = parseFloat(style.paddingLeft) || 0;
    const borderL = parseFloat(style.borderLeftWidth) || 0;
    let x = clientX - rect.left - padL - borderL;
    if (x <= 0) return 0;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = style.font || (style.fontSize + ' ' + style.fontFamily);
    const fullW = ctx.measureText(text).width;
    if (x >= fullW) return text.length;

    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (ctx.measureText(text.slice(0, mid)).width <= x) lo = mid;
      else hi = mid - 1;
    }
    if (lo < text.length) {
      const wLo = ctx.measureText(text.slice(0, lo)).width;
      const wHi = ctx.measureText(text.slice(0, lo + 1)).width;
      if ((x - wLo) > (wHi - x)) lo += 1;
    }
    return lo;
  }

  function setInputCaretFromMouse(el, e) {
    if (!isCaretEditableInput(el) || typeof el.setSelectionRange !== 'function') return;
    try {
      const pos = caretIndexFromMouse(el, e.clientX);
      el.setSelectionRange(pos, pos);
    } catch (err) { /* ignore */ }
  }

  function bindInputNativeCaret(el) {
    if (!isCaretEditableInput(el)) return;
    let pointerDown = null;

    el.addEventListener('mousedown', function (e) {
      pointerDown = { x: e.clientX, y: e.clientY, button: e.button };
    });

    el.addEventListener('mouseup', function (e) {
      e.stopPropagation();
      const down = pointerDown;
      pointerDown = null;
      if (e.button !== 0 || !down || down.button !== 0) return;
      const dragged = Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4;
      let selStart = 0;
      let selEnd = 0;
      try {
        selStart = el.selectionStart;
        selEnd = el.selectionEnd;
      } catch (err) { /* ignore */ }
      if (dragged && selStart !== selEnd) return;
      requestAnimationFrame(function () {
        setInputCaretFromMouse(el, e);
      });
    });
  }

  function renderAttrField(model, attr, registry, invalidSet) {
    const def = CCM.getAttrDef(model.type, attr.name, registry);
    const fieldType = CCM.getWidgetFieldType(attr.name, def);
    const invalid = invalidSet.has(attr.name);
    const invalidClass = invalid ? ' cm-comp-card-item--invalid' : '';
    const title = invalid ? ' title="Unknown for [' + model.type + ']"' : '';

    if (fieldType === 'flag') {
      return (
        '<div class="cm-comp-card-item cm-comp-card-item--flag' + invalidClass + '"' + title + '>' +
        '<label><input type="checkbox" class="cm-comp-card-flag-input" data-attr="' + escapeHtml(attr.name) + '" checked>' +
        escapeHtml(attr.name) + '</label>' +
        '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-remove" data-attr="' + escapeHtml(attr.name) + '">✕</button>' +
        '</div>'
      );
    }

    if (fieldType === 'enum') {
      const enumOpts = CCM.getAttrEnumOptions(attr.name, def) || CCM.ON_ENUM;
      let opts = enumOpts.map(function (v) {
        const sel = attr.value === v ? ' selected' : '';
        return '<option value="' + escapeHtml(v) + '"' + sel + '>' + escapeHtml(v) + '</option>';
      }).join('');
      return (
        '<div class="cm-comp-card-item' + invalidClass + '"' + title + '>' +
        '<span>' + escapeHtml(attr.name) + '</span>' +
        '<div class="cm-comp-card-attr-field">' +
        '<select class="cm-comp-card-attr-input" data-attr="' + escapeHtml(attr.name) + '">' + opts + '</select>' +
        '</div>' +
        '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-remove" data-attr="' + escapeHtml(attr.name) + '">✕</button>' +
        '</div>'
      );
    }

    const inputType = fieldType === 'integer' ? 'number' : 'text';
    return (
      '<div class="cm-comp-card-item' + invalidClass + '"' + title + '>' +
      '<span>' + escapeHtml(attr.name) + '</span>' +
      '<div class="cm-comp-card-attr-field">' +
      '<input type="' + inputType + '" class="cm-comp-card-attr-input" data-attr="' + escapeHtml(attr.name) + '" value="' + escapeHtml(attr.value || '') + '">' +
      '</div>' +
      '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-remove" data-attr="' + escapeHtml(attr.name) + '">✕</button>' +
      '</div>'
    );
  }

  function renderSegmentField(seg, invalidSet) {
    const invalid = invalidSet.has(seg.name);
    const invalidClass = invalid ? ' cm-comp-card-item--invalid' : '';
    const active = seg.value === '1';
    return (
      '<div class="cm-comp-card-item cm-comp-card-item--segment' + invalidClass + '">' +
      '<span>' + escapeHtml(seg.name) + '</span>' +
      '<div class="cm-comp-card-attr-field">' +
      '<button type="button" class="cm-comp-card-segment-toggle' + (active ? ' is-on' : '') + '" data-seg="' + escapeHtml(seg.name) + '">' + escapeHtml(seg.value) + '</button>' +
      '</div>' +
      '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-remove" data-attr="' + escapeHtml(seg.name) + '">✕</button>' +
      '</div>'
    );
  }

  function renderEqualsField(model) {
    if (model.type === 'clcd' && CCM.getClcdSymbols(model).length) return '';
    const eq = CCM.getEqualsItem(model);
    if (!eq) return '';
    const rhs = CCM.getEqualsRhsText(eq);
    const multiline = eq.rawLines.length > 1 || rhs.includes('{');
    if (multiline) {
      return (
        '<div class="cm-comp-card-item cm-comp-card-item--equals">' +
        '<span>=</span>' +
        '<textarea class="cm-comp-card-equals-textarea" rows="4">' + escapeHtml(rhs) + '</textarea>' +
        '</div>'
      );
    }
    return (
      '<div class="cm-comp-card-item cm-comp-card-item--equals">' +
      '<span>=</span>' +
      '<input type="text" class="cm-comp-card-equals-input" value="' + escapeHtml(rhs) + '">' +
      '</div>'
    );
  }

  function renderPlcMapSection(model, mapName) {
    const entries = CCM.getPlcMapEntries(model, mapName);
    let rows = entries.map(function (e) {
      return (
        '<div class="cm-comp-card-nested-row">' +
        '<input type="text" class="cm-comp-card-plc-sym" data-map="' + escapeHtml(mapName) + '" data-old-sym="' + escapeHtml(e.symbol) + '" value="' + escapeHtml(e.symbol) + '">' +
        '<input type="text" class="cm-comp-card-plc-target" data-map="' + escapeHtml(mapName) + '" data-sym="' + escapeHtml(e.symbol) + '" value="' + escapeHtml(e.target) + '">' +
        '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-plc-remove" data-map="' + escapeHtml(mapName) + '" data-sym="' + escapeHtml(e.symbol) + '">✕</button>' +
        '</div>'
      );
    }).join('');
    return (
      '<div class="cm-comp-card-nested cm-comp-card-nested--plc-map">' +
      '<div class="cm-comp-card-nested-title">' + escapeHtml(mapName) + '</div>' +
      '<div class="cm-comp-card-nested-head"><span>symbol</span><span>target</span><span></span></div>' +
      rows +
      '<button type="button" class="cm-comp-card-plc-add" data-map="' + escapeHtml(mapName) + '">+ row</button>' +
      '</div>'
    );
  }

  function renderPlcGlobalsSection(model) {
    const entries = CCM.getPlcGlobalsEntries(model);
    let rows = entries.map(function (e) {
      const w = e.width != null && e.width !== 1 ? e.width : '';
      return (
        '<div class="cm-comp-card-nested-row">' +
        '<input type="text" class="cm-comp-card-plc-global-sym" data-old-sym="' + escapeHtml(e.symbol) + '" value="' + escapeHtml(e.symbol) + '">' +
        '<input type="number" class="cm-comp-card-plc-global-width" data-sym="' + escapeHtml(e.symbol) + '" value="' + escapeHtml(String(w)) + '" placeholder="1">' +
        '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-plc-global-remove" data-sym="' + escapeHtml(e.symbol) + '">✕</button>' +
        '</div>'
      );
    }).join('');
    return (
      '<div class="cm-comp-card-nested cm-comp-card-nested--plc-globals">' +
      '<div class="cm-comp-card-nested-title">globals</div>' +
      '<div class="cm-comp-card-nested-head"><span>symbol</span><span>width</span><span></span></div>' +
      rows +
      '<button type="button" class="cm-comp-card-plc-global-add">+ row</button>' +
      '</div>'
    );
  }

  function clcdKnownSymbolsDatalistId(model) {
    return 'cm-comp-card-clcd-symbols-' + (model.id || '0').replace(/:/g, '-');
  }

  function renderClcdKnownSymbolsDatalist(model) {
    const listId = clcdKnownSymbolsDatalistId(model);
    let opts = '';
    const known = (typeof CLCD_KNOWN_SYMBOLS !== 'undefined') ? CLCD_KNOWN_SYMBOLS : [];
    known.forEach(function (name) {
      opts += '<option value="' + escapeHtml(name) + '"></option>';
    });
    return '<datalist id="' + escapeHtml(listId) + '">' + opts + '</datalist>';
  }

  function clcdSymbolKey(sym) {
    return sym._id || sym.name || '';
  }

  function clcdPropDisplayValue(sym, prop) {
    if (prop === 'bits') {
      if (sym.bitsText != null && sym.bitsText !== '') return sym.bitsText;
      if (sym.bitsStart !== undefined) return sym.bitsStart + '-' + sym.bitsEnd;
      return '';
    }
    if (prop === 'color' || prop === 'bgColor') {
      const v = sym[prop];
      if (v === undefined || v === null || v === '') return '';
      const s = String(v);
      if (s.charAt(0) === '#') return '^' + s.slice(1);
      return s;
    }
    if (prop === 'text' || prop === 'hotkey') {
      if (sym[prop] == null) return '';
      return String(sym[prop]).replace(/^"|"$/g, '');
    }
    if (sym[prop] == null) return '';
    return String(sym[prop]);
  }

  function renderClcdPropField(sym, kind, prop, fieldErrs) {
    const invalid = fieldErrs.has(prop) ? ' cm-comp-card-field--invalid' : '';
    const val = clcdPropDisplayValue(sym, prop);
    if (prop === 'style') {
      const styleOpts = CCM.getClcdSymbolStyleOptions(sym.name);
      let opts = '<option value="">—</option>';
      styleOpts.forEach(function (v) {
        opts += '<option value="' + v + '"' + (String(sym.style) === String(v) ? ' selected' : '') + '>' +
          escapeHtml(CCM.clcdStyleOptionLabel(v, sym.name)) + '</option>';
      });
      return '<select class="cm-comp-card-nested-input cm-comp-card-clcd-prop-input' + invalid + '" data-prop="' + prop + '">' + opts + '</select>';
    }
    if (prop === 'family') {
      let opts = '<option value="">—</option>' + ['mono', 'sans', 'serif'].map(function (f) {
        return '<option value="' + f + '"' + (sym.family === f ? ' selected' : '') + '>' + f + '</option>';
      }).join('');
      return '<select class="cm-comp-card-nested-input cm-comp-card-clcd-prop-input' + invalid + '" data-prop="' + prop + '">' + opts + '</select>';
    }
    if (prop === 'weight') {
      let opts = '<option value="">—</option>' + ['normal', 'bold', 'italic', 'boldItalic'].map(function (w) {
        return '<option value="' + w + '"' + (sym.weight === w ? ' selected' : '') + '>' + w + '</option>';
      }).join('');
      return '<select class="cm-comp-card-nested-input cm-comp-card-clcd-prop-input' + invalid + '" data-prop="' + prop + '">' + opts + '</select>';
    }
    if (prop === 'touchType') {
      let opts = '<option value="">—</option>' + [
        { v: 1, l: '1 pr/rel' },
        { v: 2, l: '2 pulse' },
        { v: 3, l: '3 latch' }
      ].map(function (t) {
        return '<option value="' + t.v + '"' + (sym.touchType === t.v ? ' selected' : '') + '>' + t.l + '</option>';
      }).join('');
      return '<select class="cm-comp-card-nested-input cm-comp-card-clcd-prop-input' + invalid + '" data-prop="' + prop + '">' + opts + '</select>';
    }
    if (prop === 'bits') {
      return '<input type="text" class="cm-comp-card-nested-input cm-comp-card-clcd-prop-input' + invalid + '" data-prop="' + prop + '" placeholder="0-6" value="' + escapeHtml(val) + '">';
    }
    if (prop === 'text' || prop === 'hotkey') {
      return '<input type="text" class="cm-comp-card-nested-input cm-comp-card-clcd-prop-input' + invalid + '" data-prop="' + prop + '" value="' + escapeHtml(val) + '">';
    }
    if (prop === 'color' || prop === 'bgColor') {
      return '<input type="text" class="cm-comp-card-nested-input cm-comp-card-clcd-prop-input' + invalid + '" data-prop="' + prop + '" placeholder="^00ff00" value="' + escapeHtml(val) + '">';
    }
    const inputType = (prop === 'bit' || prop === 'bitOut' || prop === 'size' || prop === 'width' || prop === 'height' || prop === 'padding') ? 'number' : 'text';
    return '<input type="' + inputType + '" class="cm-comp-card-nested-input cm-comp-card-clcd-prop-input' + invalid + '" data-prop="' + prop + '" value="' + escapeHtml(val) + '">';
  }

  function renderClcdPropItem(sym, kind, prop, fieldErrs) {
    return (
      '<div class="cm-comp-card-item cm-comp-card-clcd-prop" data-prop="' + escapeHtml(prop) + '">' +
      '<span>' + escapeHtml(prop) + '</span>' +
      '<div class="cm-comp-card-attr-field">' + renderClcdPropField(sym, kind, prop, fieldErrs) + '</div>' +
      '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-clcd-prop-remove" data-prop="' + escapeHtml(prop) + '">✕</button>' +
      '</div>'
    );
  }

  function renderClcdSymbolCard(model, sym) {
    const listId = clcdKnownSymbolsDatalistId(model);
    const kind = CCM.getClcdUiKind(sym.name);
    const symKey = clcdSymbolKey(sym);
    const fieldErrs = CCM.getClcdSymbolFieldErrors(sym, kind);
    const nameInvalid = fieldErrs.has('name') ? ' cm-comp-card-field--invalid' : '';
    const fields = CCM.sortClcdSymbolFields(CCM.inferClcdSymbolFields(sym, kind), kind);
    const available = CCM.getClcdSymbolAvailableProps(sym, kind);
    const x = sym.x != null ? sym.x : 0;
    const y = sym.y != null ? sym.y : 0;
    let propsHtml = fields.map(function (prop) {
      return renderClcdPropItem(sym, kind, prop, fieldErrs);
    }).join('');
    let addHtml = '';
    if (available.length) {
      addHtml = '<div class="cm-comp-card-add-row cm-comp-card-clcd-prop-add-row">' +
        '<select class="cm-comp-card-clcd-prop-add" data-symbol-key="' + escapeHtml(symKey) + '">' +
        '<option value="">+property</option>';
      available.forEach(function (p) {
        addHtml += '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + '</option>';
      });
      addHtml += '</select></div>';
    }
    return (
      '<div class="cm-comp-card-clcd-symbol" data-symbol-key="' + escapeHtml(symKey) + '" data-old-name="' + escapeHtml(sym.name) + '">' +
      '<div class="cm-comp-card-clcd-symbol-head">' +
      '<input type="text" class="cm-comp-card-nested-input cm-comp-card-clcd-name' + nameInvalid + '" list="' + escapeHtml(listId) + '" value="' + escapeHtml(sym.name) + '">' +
      '<span class="cm-comp-card-clcd-kind">' + escapeHtml(kind) + '</span>' +
      '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-clcd-remove">✕</button>' +
      '</div>' +
      '<div class="cm-comp-card-clcd-xy-row">' +
      '<span class="cm-comp-card-clcd-xy-label">x:</span>' +
      '<input type="number" class="cm-comp-card-nested-input cm-comp-card-clcd-x" value="' + escapeHtml(String(x)) + '">' +
      '<span class="cm-comp-card-clcd-xy-label">y:</span>' +
      '<input type="number" class="cm-comp-card-nested-input cm-comp-card-clcd-y" value="' + escapeHtml(String(y)) + '">' +
      '</div>' +
      '<div class="cm-comp-card-clcd-props">' + propsHtml + '</div>' +
      addHtml +
      '</div>'
    );
  }

  function renderClcdSymbolsSection(model) {
    const hasBlock = model.bodyItems.some(function (i) { return i.kind === 'clcdSymbols'; });
    const symbols = CCM.getClcdSymbols(model);
    const cards = symbols.map(function (sym) { return renderClcdSymbolCard(model, sym); }).join('');
    const removeBtn = hasBlock
      ? '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-clcd-block-remove" title="Remove symbols block">✕</button>'
      : '';
    return (
      renderClcdKnownSymbolsDatalist(model) +
      '<div class="cm-comp-card-nested cm-comp-card-nested--clcd">' +
      '<div class="cm-comp-card-clcd-block-head">' +
      '<div class="cm-comp-card-nested-title">symbols { }</div>' +
      removeBtn +
      '</div>' +
      cards +
      '<button type="button" class="cm-comp-card-clcd-add">+symbol</button>' +
      '</div>'
    );
  }

  function renderHitboxLabeledRow(label, fieldHtml) {
    return (
      '<div class="cm-comp-card-hitbox-labeled-row">' +
      '<span class="cm-comp-card-hitbox-label">' + escapeHtml(label) + '</span>' +
      fieldHtml +
      '</div>'
    );
  }

  function renderHitboxPoutRow(zoneName, pout, pi) {
    const field = pout.field || '';
    const nameFmt = CCM.formatHitboxPoutNameFormat(pout);
    let eventOpts = ['press', 'release', 'drag', 'move'].map(function (ev) {
      const sel = ev === pout.event ? ' selected' : '';
      return '<option value="' + ev + '"' + sel + '>' + ev + '</option>';
    }).join('');
    let fieldOpts = ['', 'eventX', 'eventY'].map(function (f) {
      const sel = f === field ? ' selected' : '';
      const label = f || '—';
      return '<option value="' + escapeHtml(f) + '"' + sel + '>' + escapeHtml(label) + '</option>';
    }).join('');
    return (
      '<div class="cm-comp-card-nested-row cm-comp-card-nested-row--hitbox-pout" data-zone="' + escapeHtml(zoneName) + '" data-pout-idx="' + pi + '">' +
      '<select class="cm-comp-card-nested-input cm-comp-card-hitbox-pout-event">' + eventOpts + '</select>' +
      '<select class="cm-comp-card-nested-input cm-comp-card-hitbox-pout-field">' + fieldOpts + '</select>' +
      '<input type="text" class="cm-comp-card-nested-input cm-comp-card-hitbox-pout-namefmt" placeholder="pinName/s16" value="' + escapeHtml(nameFmt) + '">' +
      '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-hitbox-pout-remove">✕</button>' +
      '</div>'
    );
  }

  function renderHitboxZoneCard(zoneName, zone) {
    const shapeLine = CCM.hitboxZoneShapeLine(zone);
    const stroke = zone.stroke || '';
    const touchVal = zone.touchType != null ? zone.touchType : 1;
    let touchOpts = [
      { v: 1, label: '1 — press/release' },
      { v: 2, label: '2 — pulse' },
      { v: 3, label: '3 — latch' }
    ].map(function (t) {
      const sel = touchVal === t.v ? ' selected' : '';
      return '<option value="' + t.v + '"' + sel + '>' + escapeHtml(t.label) + '</option>';
    }).join('');
    let poutRows = (zone.pouts || []).map(function (p, pi) {
      return renderHitboxPoutRow(zoneName, p, pi);
    }).join('');
    return (
      '<div class="cm-comp-card-hitbox-zone" data-old-zone="' + escapeHtml(zoneName) + '">' +
      '<div class="cm-comp-card-hitbox-zone-head">' +
      '<input type="text" class="cm-comp-card-nested-input cm-comp-card-hitbox-zone-name" value="' + escapeHtml(zoneName) + '">' +
      '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-hitbox-zone-remove">✕</button>' +
      '</div>' +
      renderHitboxLabeledRow('shape', '<input type="text" class="cm-comp-card-nested-input cm-comp-card-hitbox-shape" value="' + escapeHtml(shapeLine) + '">') +
      renderHitboxLabeledRow('touchType:', '<select class="cm-comp-card-nested-input cm-comp-card-hitbox-touch">' + touchOpts + '</select>') +
      renderHitboxLabeledRow('stroke:', '<input type="text" class="cm-comp-card-nested-input cm-comp-card-hitbox-stroke" placeholder="ffff00" value="' + escapeHtml(stroke) + '">') +
      '<div class="cm-comp-card-hitbox-pouts">' + poutRows + '</div>' +
      '<button type="button" class="cm-comp-card-hitbox-pout-add" data-zone="' + escapeHtml(zoneName) + '">+ pout</button>' +
      '</div>'
    );
  }

  function renderHitboxSection(model) {
    const hb = CCM.getHitboxBlock(model);
    if (!hb && !model.bodyItems.some(function (i) { return i.kind === 'hitboxBlock'; })) return '';
    const zones = hb ? hb.zones : {};
    const zoneNames = Object.keys(zones);
    const cards = zoneNames.map(function (zn) { return renderHitboxZoneCard(zn, zones[zn]); }).join('');
    return (
      '<div class="cm-comp-card-nested cm-comp-card-nested--hitbox">' +
      '<div class="cm-comp-card-nested-title">hitbox { }</div>' +
      cards +
      '<button type="button" class="cm-comp-card-hitbox-zone-add">+ zone</button>' +
      '</div>'
    );
  }

  function parseClcdColorFromInput(text) {
    const t = String(text || '').trim();
    if (!t) return undefined;
    if (t.charAt(0) === '^') return '#' + t.slice(1);
    if (t.charAt(0) === '#') return t;
    return t;
  }

  function readClcdSymbolFromCard(card) {
    const symKey = card.getAttribute('data-symbol-key') || card.getAttribute('data-old-name') || '';
    const oldName = card.getAttribute('data-old-name') || '';
    const name = card.querySelector('.cm-comp-card-clcd-name').value.trim();
    const kind = CCM.getClcdUiKind(name);
    const sym = {
      _id: symKey.indexOf('sym_') === 0 ? symKey : undefined,
      name: name,
      x: parseInt(card.querySelector('.cm-comp-card-clcd-x').value, 10) || 0,
      y: parseInt(card.querySelector('.cm-comp-card-clcd-y').value, 10) || 0,
      _fields: []
    };
    if (symKey.indexOf('sym_') === 0) sym._id = symKey;

    card.querySelectorAll('.cm-comp-card-clcd-prop').forEach(function (row) {
      const prop = row.getAttribute('data-prop');
      if (!prop) return;
      sym._fields.push(prop);
      const el = row.querySelector('.cm-comp-card-clcd-prop-input');
      if (!el) return;
      const raw = el.tagName === 'SELECT' ? el.value : el.value.trim();

      if (prop === 'bits') {
        if (raw === '') return;
        sym.bitsText = raw;
        const parsed = CCM.parseClcdBitsRangeText(raw);
        if (parsed) {
          sym.bitsStart = parsed.bitsStart;
          sym.bitsEnd = parsed.bitsEnd;
        } else {
          delete sym.bitsStart;
          delete sym.bitsEnd;
        }
        return;
      }
      if (raw === '' || raw === '—') return;

      if (prop === 'bit' || prop === 'bitOut' || prop === 'size' || prop === 'width' || prop === 'height' || prop === 'padding' || prop === 'style' || prop === 'touchType') {
        sym[prop] = parseInt(raw, 10);
        if (isNaN(sym[prop])) delete sym[prop];
        return;
      }
      if (prop === 'color' || prop === 'bgColor') {
        const c = parseClcdColorFromInput(raw);
        if (c !== undefined) sym[prop] = c;
        return;
      }
      sym[prop] = raw;
    });

    return { oldKey: symKey || oldName, oldName: oldName, symbol: sym, kind: kind };
  }

  function refreshClcdSymbolFieldErrors(card, sym, kind) {
    const fieldErrs = CCM.getClcdSymbolFieldErrors(sym, kind);
    const nameEl = card.querySelector('.cm-comp-card-clcd-name');
    if (nameEl) nameEl.classList.toggle('cm-comp-card-field--invalid', fieldErrs.has('name'));
    card.querySelectorAll('.cm-comp-card-clcd-prop').forEach(function (row) {
      const prop = row.getAttribute('data-prop');
      const el = row.querySelector('.cm-comp-card-clcd-prop-input');
      if (el) el.classList.toggle('cm-comp-card-field--invalid', fieldErrs.has(prop));
    });
  }

  function isClcdKnownSymbolName(name) {
    const n = String(name || '').trim();
    if (!n) return false;
    if (typeof getClcdSymbolDef === 'function') return !!getClcdSymbolDef(n);
    return false;
  }

  function bindClcdSymbolCard(card, syncModel) {
    function syncFromCard() {
      const data = readClcdSymbolFromCard(card);
      const kindEl = card.querySelector('.cm-comp-card-clcd-kind');
      if (kindEl) kindEl.textContent = CCM.getClcdUiKind(data.symbol.name);
      refreshClcdSymbolFieldErrors(card, data.symbol, data.kind);
      syncModel(function (m) {
        return CCM.upsertClcdSymbol(m, data.oldKey, data.symbol, data.oldName);
      });
    }

    function previewClcdName(name) {
      const kindEl = card.querySelector('.cm-comp-card-clcd-kind');
      if (kindEl) kindEl.textContent = CCM.getClcdUiKind(name);
    }

    const nameInput = card.querySelector('.cm-comp-card-clcd-name');
    if (nameInput) {
      nameInput.addEventListener('focus', function () {
        nameInput.classList.remove('cm-comp-card-field--invalid');
      });
      nameInput.addEventListener('input', function () {
        const val = nameInput.value;
        previewClcdName(val);
        if (isClcdKnownSymbolName(val)) {
          syncFromCard();
        }
      });
      nameInput.addEventListener('change', syncFromCard);
    }

    card.querySelectorAll('input:not(.cm-comp-card-clcd-name), select').forEach(function (el) {
      el.addEventListener('change', syncFromCard);
    });

    card.querySelectorAll('.cm-comp-card-clcd-prop-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const prop = btn.getAttribute('data-prop');
        const symKey = card.getAttribute('data-symbol-key') || card.getAttribute('data-old-name') || '';
        const oldName = card.getAttribute('data-old-name') || '';
        syncModel(function (m) {
          return CCM.removeClcdSymbolProp(m, symKey, prop, oldName);
        });
      });
    });

    card.querySelectorAll('.cm-comp-card-clcd-prop-add').forEach(function (sel) {
      sel.addEventListener('change', function (e) {
        e.stopPropagation();
        const prop = e.target.value;
        if (!prop) return;
        e.target.value = '';
        const data = readClcdSymbolFromCard(card);
        syncModel(function (m) {
          m = CCM.upsertClcdSymbol(m, data.oldKey, data.symbol, data.oldName);
          return CCM.addClcdSymbolProp(m, data.oldKey, prop, data.oldName);
        });
      });
    });

    const removeBtn = card.querySelector('.cm-comp-card-clcd-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const symKey = card.getAttribute('data-symbol-key') || '';
        const oldName = card.getAttribute('data-old-name') || '';
        syncModel(function (m) { return CCM.removeClcdSymbol(m, symKey || oldName, oldName); });
      });
    }

    card.querySelectorAll('input').forEach(function (el) {
      el.addEventListener('keydown', function (e) { e.stopPropagation(); });
      bindInputNativeCaret(el);
    });
  }

  function readHitboxZoneFromCard(zoneCard) {
    const oldName = zoneCard.getAttribute('data-old-zone') || '';
    const name = zoneCard.querySelector('.cm-comp-card-hitbox-zone-name').value.trim();
    const zone = {
      name: name,
      shapeLine: zoneCard.querySelector('.cm-comp-card-hitbox-shape').value.trim(),
      touchType: parseInt(zoneCard.querySelector('.cm-comp-card-hitbox-touch').value, 10) || 1,
      stroke: zoneCard.querySelector('.cm-comp-card-hitbox-stroke').value.trim() || null,
      pouts: []
    };
    zoneCard.querySelectorAll('.cm-comp-card-nested-row--hitbox-pout').forEach(function (row) {
      const event = row.querySelector('.cm-comp-card-hitbox-pout-event').value;
      const field = row.querySelector('.cm-comp-card-hitbox-pout-field').value;
      const nameFmt = row.querySelector('.cm-comp-card-hitbox-pout-namefmt').value.trim();
      const parsed = CCM.parseHitboxPoutNameFormat(nameFmt);
      if (!parsed) return;
      const pout = { event: event, name: parsed.name, bindType: parsed.bindType || 'bool' };
      if (field) pout.field = field;
      if (parsed.numberFormat) pout.numberFormat = parsed.numberFormat;
      zone.pouts.push(pout);
    });
    return { oldName: oldName, zone: zone };
  }

  function bindHitboxZoneCard(zoneCard, syncModel) {
    function syncFromCard() {
      if (zoneCard.dataset.pending === '1') {
        const data = readHitboxZoneFromCard(zoneCard);
        if (!data.zone.name) return;
        zoneCard.dataset.pending = '0';
        zoneCard.setAttribute('data-old-zone', data.zone.name);
      }
      const data = readHitboxZoneFromCard(zoneCard);
      if (!data.zone.name) return;
      syncModel(function (m) {
        return CCM.setHitboxZone(m, data.oldName, data.zone);
      });
    }
    zoneCard.querySelectorAll('.cm-comp-card-hitbox-shape, .cm-comp-card-hitbox-touch, .cm-comp-card-hitbox-stroke, .cm-comp-card-hitbox-zone-name').forEach(function (el) {
      el.addEventListener('change', syncFromCard);
    });
    zoneCard.querySelectorAll('.cm-comp-card-nested-row--hitbox-pout input, .cm-comp-card-nested-row--hitbox-pout select').forEach(function (el) {
      el.addEventListener('change', syncFromCard);
    });
    zoneCard.querySelector('.cm-comp-card-hitbox-zone-remove').addEventListener('click', function () {
      if (zoneCard.dataset.pending === '1') {
        zoneCard.remove();
        return;
      }
      const name = zoneCard.getAttribute('data-old-zone');
      syncModel(function (m) { return CCM.removeHitboxZone(m, name); });
    });
    zoneCard.querySelectorAll('.cm-comp-card-hitbox-pout-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.closest('.cm-comp-card-nested-row--hitbox-pout').remove();
        syncFromCard();
      });
    });
    zoneCard.querySelectorAll('input').forEach(function (el) {
      el.addEventListener('keydown', function (e) { e.stopPropagation(); });
      bindInputNativeCaret(el);
    });
  }

  function appendHitboxPoutRow(zoneCard, zoneName) {
    const pouts = zoneCard.querySelector('.cm-comp-card-hitbox-pouts');
    const idx = pouts.querySelectorAll('.cm-comp-card-nested-row--hitbox-pout').length;
    const row = document.createElement('div');
    row.className = 'cm-comp-card-nested-row cm-comp-card-nested-row--hitbox-pout';
    row.dataset.zone = zoneName;
    row.dataset.poutIdx = String(idx);
    row.dataset.pending = '1';
    row.innerHTML =
      '<select class="cm-comp-card-nested-input cm-comp-card-hitbox-pout-event">' +
      '<option value="press" selected>press</option><option value="release">release</option>' +
      '<option value="drag">drag</option><option value="move">move</option></select>' +
      '<select class="cm-comp-card-nested-input cm-comp-card-hitbox-pout-field">' +
      '<option value="" selected>—</option><option value="eventX">eventX</option><option value="eventY">eventY</option></select>' +
      '<input type="text" class="cm-comp-card-nested-input cm-comp-card-hitbox-pout-namefmt" placeholder="pinName/s16" value="">' +
      '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-hitbox-pout-remove">✕</button>';
    pouts.appendChild(row);
    row.querySelector('.cm-comp-card-hitbox-pout-remove').addEventListener('click', function () {
      row.remove();
    });
    row.querySelectorAll('input, select').forEach(function (el) {
      el.addEventListener('keydown', function (e) { e.stopPropagation(); });
      if (el.tagName === 'INPUT') bindInputNativeCaret(el);
    });
    return row;
  }

  function renderProgramRefsField(model, editor) {
    const refs = CCM.getProgramRefs(model);
    const inlineRefs = CCM.findInlinePlcRefs(editor.getValue());
    const multiRef = refs.length > 1 ? refs.join(' ') : '';
    const currentRef = refs.length === 1 ? refs[0] : '';
    let selectHtml = '<select class="cm-comp-card-inline-ref cm-comp-card-nested-input cm-comp-card-plc-program-ref">';
    if (multiRef) {
      selectHtml += '<option value="' + escapeHtml(multiRef) + '" selected>' + escapeHtml(multiRef) + ' (multiple)</option>';
    } else if (currentRef && inlineRefs.indexOf(currentRef) === -1) {
      selectHtml += '<option value="' + escapeHtml(currentRef) + '" selected>' + escapeHtml(currentRef) + ' (missing inline)</option>';
    }
    if (!refs.length) {
      selectHtml += '<option value="">— select inline [plc] —</option>';
    }
    inlineRefs.forEach(function (ref) {
      const sel = ref === currentRef ? ' selected' : '';
      selectHtml += '<option value="' + escapeHtml(ref) + '"' + sel + '>' + escapeHtml(ref) + '</option>';
    });
    selectHtml += '</select>';
    return (
      '<div class="cm-comp-card-program-row">' +
      '<span class="cm-comp-card-program-label">program:</span>' +
      selectHtml +
      '</div>'
    );
  }

  function renderLogicProgramSection(model, editor) {
    const prog = CCM.getLogicProgram(model);
    if (!prog) return '';
    const inlineRefs = CCM.findInlineLogicRefs(editor.getValue());
    const currentRef = prog.ref || '';
    let refHtml = '<select class="cm-comp-card-inline-ref cm-comp-card-nested-input cm-comp-card-logic-ref">';
    if (inlineRefs.indexOf(currentRef) === -1 && currentRef) {
      refHtml += '<option value="' + escapeHtml(currentRef) + '" selected>' + escapeHtml(currentRef) + ' (missing inline)</option>';
    }
    inlineRefs.forEach(function (ref) {
      const sel = ref === currentRef ? ' selected' : '';
      refHtml += '<option value="' + escapeHtml(ref) + '"' + sel + '>' + escapeHtml(ref) + '</option>';
    });
    if (!inlineRefs.length && !currentRef) {
      refHtml += '<option value="">— no inline [logic] —</option>';
    }
    refHtml += '</select>';
    const refRowHtml =
      '<div class="cm-comp-card-inline-row">' +
      '<span class="cm-comp-card-inline-label">inline:</span>' +
      refHtml +
      '</div>';
    let bindRows = prog.bindings.map(function (b) {
      const typeText = CCM.formatLogicBindingType(b);
      const fieldErrs = CCM.getLogicBindingFieldErrors(b.logicVar, typeText, b.pinName);
      const varInvalid = fieldErrs.has('var') ? ' cm-comp-card-field--invalid' : '';
      const typeInvalid = fieldErrs.has('type') ? ' cm-comp-card-field--invalid' : '';
      const pinInvalid = fieldErrs.has('pin') ? ' cm-comp-card-field--invalid' : '';
      return (
        '<div class="cm-comp-card-nested-row cm-comp-card-nested-row--logic-bind" data-old-var="' + escapeHtml(b.logicVar) + '">' +
        '<input type="text" class="cm-comp-card-nested-input cm-comp-card-logic-var' + varInvalid + '" data-var="' + escapeHtml(b.logicVar) + '" value="' + escapeHtml(b.logicVar) + '">' +
        '<span class="cm-comp-card-logic-is">is</span>' +
        '<input type="text" class="cm-comp-card-nested-input cm-comp-card-logic-type' + typeInvalid + '" data-var="' + escapeHtml(b.logicVar) + '" value="' + escapeHtml(typeText) + '">' +
        '<input type="text" class="cm-comp-card-nested-input cm-comp-card-logic-pin' + pinInvalid + '" data-var="' + escapeHtml(b.logicVar) + '" value="' + escapeHtml(b.pinName) + '">' +
        '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-logic-remove" data-var="' + escapeHtml(b.logicVar) + '">✕</button>' +
        '</div>'
      );
    }).join('');
    let obsRows = prog.observeDefs.map(function (o, idx) {
      const line = o.rawLine || ('observe ' + o.logicVar);
      return (
        '<div class="cm-comp-card-nested-row cm-comp-card-nested-row--logic-obs">' +
        '<input type="text" class="cm-comp-card-nested-input cm-comp-card-logic-observe" data-obs-idx="' + idx + '" value="' + escapeHtml(line) + '" readonly>' +
        '</div>'
      );
    }).join('');
    return (
      '<div class="cm-comp-card-nested cm-comp-card-nested--logic">' +
      refRowHtml +
      bindRows +
      obsRows +
      '<button type="button" class="cm-comp-card-logic-add">+ binding</button>' +
      '</div>'
    );
  }

  const CANVAS_WHEN_EVENTS = ['press', 'release', 'drag', 'move'];

  function renderWhenHitboxField(w, wi, zoneNames) {
    const hb = w.hitbox || '';
    if (zoneNames.length) {
      let opts = zoneNames.map(function (z) {
        const sel = z === hb ? ' selected' : '';
        return '<option value="' + escapeHtml(z) + '"' + sel + '>' + escapeHtml(z) + '</option>';
      }).join('');
      if (hb && zoneNames.indexOf(hb) === -1) {
        opts = '<option value="' + escapeHtml(hb) + '" selected>' + escapeHtml(hb) + ' (not in hitbox)</option>' + opts;
      }
      return (
        '<select class="cm-comp-card-nested-input cm-comp-card-canvas-when-hitbox" data-when="' + wi + '">' +
        opts + '</select>'
      );
    }
    return (
      '<input type="text" class="cm-comp-card-nested-input cm-comp-card-canvas-when-hitbox" data-when="' + wi + '" value="' + escapeHtml(hb) + '">'
    );
  }

  function renderCanvasProgramSection(model, editor) {
    const cp = CCM.getCanvasProgram(model);
    if (!cp) return '';
    const program = cp.program || {};
    const zoneNames = CCM.getHitboxZoneNames(model);
    const inlineRefs = CCM.findInlineCanvasRefs(editor.getValue());
    const currentRef = cp.ref || '';
    let refHtml = '<select class="cm-comp-card-inline-ref cm-comp-card-nested-input cm-comp-card-canvas-ref">';
    if (inlineRefs.indexOf(currentRef) === -1 && currentRef) {
      refHtml += '<option value="' + escapeHtml(currentRef) + '" selected>' + escapeHtml(currentRef) + ' (missing inline)</option>';
    }
    inlineRefs.forEach(function (ref) {
      const sel = ref === currentRef ? ' selected' : '';
      refHtml += '<option value="' + escapeHtml(ref) + '"' + sel + '>' + escapeHtml(ref) + '</option>';
    });
    if (!inlineRefs.length && !currentRef) {
      refHtml += '<option value="">— no inline [canvas] —</option>';
    }
    refHtml += '</select>';
    const refRowHtml =
      '<div class="cm-comp-card-inline-row">' +
      '<span class="cm-comp-card-inline-label">inline:</span>' +
      refHtml +
      '</div>';

    let initHtml = '';
    if (program.initDraw != null) {
      initHtml = (
        '<div class="cm-comp-card-canvas-block">' +
        '<div class="cm-comp-card-canvas-block-head">' +
        '<span class="cm-comp-card-canvas-subtitle">initDraw</span>' +
        '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-canvas-init-section-remove" title="Remove initDraw">✕</button>' +
        '</div>'
      );
      (program.initDraw || []).forEach(function (call, idx) {
        initHtml += (
          '<div class="cm-comp-card-nested-row cm-comp-card-nested-row--canvas-call">' +
          '<input type="text" class="cm-comp-card-nested-input cm-comp-card-canvas-init-call" data-idx="' + idx + '" value="' + escapeHtml(CCM.callTextFromCanvasCall(call)) + '">' +
          '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-canvas-init-remove" data-idx="' + idx + '" title="Remove call">✕</button>' +
          '</div>'
        );
      });
      initHtml += '<button type="button" class="cm-comp-card-canvas-init-add">+ call</button></div>';
    } else {
      initHtml = '<button type="button" class="cm-comp-card-canvas-init-section-add">+ initDraw</button>';
    }

    let whenHtml = '';
    (program.whenRenderers || []).forEach(function (w, wi) {
      let evOpts = CANVAS_WHEN_EVENTS.map(function (ev) {
        const sel = (w.event || 'press') === ev ? ' selected' : '';
        return '<option value="' + ev + '"' + sel + '>' + ev + '</option>';
      }).join('');
      whenHtml += (
        '<div class="cm-comp-card-canvas-block" data-when-block="' + wi + '">' +
        '<div class="cm-comp-card-canvas-block-head cm-comp-card-canvas-when-head">' +
        '<span class="cm-comp-card-canvas-when-paren">when(</span>' +
        renderWhenHitboxField(w, wi, zoneNames) +
        '<select class="cm-comp-card-nested-input cm-comp-card-canvas-when-event" data-when="' + wi + '">' + evOpts + '</select>' +
        '<span class="cm-comp-card-canvas-when-paren">)</span>' +
        '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-canvas-when-section-remove" data-when="' + wi + '" title="Remove when block">✕</button>' +
        '</div>'
      );
      (w.calls || []).forEach(function (call, ci) {
        whenHtml += (
          '<div class="cm-comp-card-nested-row cm-comp-card-nested-row--canvas-call">' +
          '<input type="text" class="cm-comp-card-nested-input cm-comp-card-canvas-when-call" data-when="' + wi + '" data-call="' + ci + '" value="' + escapeHtml(CCM.callTextFromCanvasCall(call)) + '">' +
          '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-canvas-when-call-remove" data-when="' + wi + '" data-call="' + ci + '" title="Remove call">✕</button>' +
          '</div>'
        );
      });
      whenHtml += '<button type="button" class="cm-comp-card-canvas-when-call-add" data-when="' + wi + '">+ call</button></div>';
    });
    if (zoneNames.length) {
      whenHtml += '<button type="button" class="cm-comp-card-canvas-when-add">+ when block</button>';
    }

    return (
      '<div class="cm-comp-card-nested cm-comp-card-nested--canvas">' +
      refRowHtml +
      initHtml + whenHtml +
      '</div>'
    );
  }

  function renderNestedSections(model, editor) {
    let html = '';
    if (model.type === 'plc') {
      if (CCM.getPlcMapEntries(model, 'inputs').length || model.bodyItems.some(function (i) { return i.kind === 'plcMap' && i.name === 'inputs'; })) {
        html += renderPlcMapSection(model, 'inputs');
      }
      if (CCM.getPlcMapEntries(model, 'outputs').length || model.bodyItems.some(function (i) { return i.kind === 'plcMap' && i.name === 'outputs'; })) {
        html += renderPlcMapSection(model, 'outputs');
      }
      if (CCM.getPlcGlobalsEntries(model).length || model.bodyItems.some(function (i) { return i.kind === 'plcGlobals'; })) {
        html += renderPlcGlobalsSection(model);
      }
    }
    if (model.type === 'logic' && CCM.getLogicProgram(model)) {
      html += renderLogicProgramSection(model, editor);
    }
    if (model.type === 'canvas') {
      html += renderHitboxSection(model);
    }
    if (model.type === 'canvas' && CCM.getCanvasProgram(model)) {
      html += renderCanvasProgramSection(model, editor);
    }
    if (model.type === 'clcd') {
      html += renderClcdSymbolsSection(model);
    }
    return html;
  }

  function appendCanvasCallRow(container, className, attrs, syncOnChange) {
    const row = document.createElement('div');
    row.className = 'cm-comp-card-nested-row cm-comp-card-nested-row--canvas-call';
    row.dataset.pending = '1';
    let attrStr = '';
    Object.keys(attrs).forEach(function (k) {
      attrStr += ' data-' + k + '="' + escapeHtml(String(attrs[k])) + '"';
    });
    row.innerHTML =
      '<input type="text" class="cm-comp-card-nested-input ' + className + '"' + attrStr + ' value="">' +
      '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-canvas-call-remove" title="Remove call">✕</button>';
    const addBtn = container.querySelector('.cm-comp-card-canvas-init-add, .cm-comp-card-canvas-when-call-add');
    if (addBtn) container.insertBefore(row, addBtn);
    else container.appendChild(row);
    const input = row.querySelector('input');
    const removeBtn = row.querySelector('.cm-comp-card-canvas-call-remove');
    input.addEventListener('change', function (e) {
      row.dataset.pending = '0';
      syncOnChange(e.target.value, row);
    });
    removeBtn.addEventListener('click', function () {
      if (row.dataset.pending === '1') {
        row.remove();
        return;
      }
      syncOnChange(null, row);
    });
    input.addEventListener('keydown', function (e) { e.stopPropagation(); });
    bindInputNativeCaret(input);
    requestAnimationFrame(function () { input.focus(); });
  }

  function appendLogicBindingRow(container, oldVar) {
    const row = document.createElement('div');
    row.className = 'cm-comp-card-nested-row cm-comp-card-nested-row--logic-bind';
    row.dataset.oldVar = oldVar || '';
    row.dataset.pending = '1';
    row.innerHTML =
      '<input type="text" class="cm-comp-card-nested-input cm-comp-card-logic-var" data-var="' + escapeHtml(oldVar || '') + '" value="">' +
      '<span class="cm-comp-card-logic-is">is</span>' +
      '<input type="text" class="cm-comp-card-nested-input cm-comp-card-logic-type" data-var="' + escapeHtml(oldVar || '') + '" value="">' +
      '<input type="text" class="cm-comp-card-nested-input cm-comp-card-logic-pin" data-var="' + escapeHtml(oldVar || '') + '" value="">' +
      '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-logic-remove" data-var="' + escapeHtml(oldVar || '') + '">✕</button>';
    const addBtn = container.querySelector('.cm-comp-card-logic-add');
    if (addBtn) container.insertBefore(row, addBtn);
    else container.appendChild(row);
    return row;
  }

  function readLogicBindingRow(row) {
    const oldVar = row.getAttribute('data-old-var') || '';
    return {
      oldVar: oldVar,
      logicVar: row.querySelector('.cm-comp-card-logic-var').value,
      typeText: row.querySelector('.cm-comp-card-logic-type').value,
      pinName: row.querySelector('.cm-comp-card-logic-pin').value
    };
  }

  function updateLogicRowValidation(row) {
    const data = readLogicBindingRow(row);
    const fieldErrs = CCM.getLogicBindingFieldErrors(data.logicVar, data.typeText, data.pinName);
    row.querySelector('.cm-comp-card-logic-var').classList.toggle('cm-comp-card-field--invalid', fieldErrs.has('var'));
    row.querySelector('.cm-comp-card-logic-type').classList.toggle('cm-comp-card-field--invalid', fieldErrs.has('type'));
    row.querySelector('.cm-comp-card-logic-pin').classList.toggle('cm-comp-card-field--invalid', fieldErrs.has('pin'));
  }

  function bindLogicBindingRow(row, syncModel) {
    function syncFromRow() {
      const data = readLogicBindingRow(row);
      if (row.dataset.pending === '1') {
        if (!data.logicVar.trim() || !data.typeText.trim() || !data.pinName.trim()) {
          updateLogicRowValidation(row);
          return;
        }
        row.dataset.pending = '0';
        row.setAttribute('data-old-var', data.logicVar);
        row.querySelectorAll('[data-var]').forEach(function (el) {
          el.setAttribute('data-var', data.logicVar);
        });
        row.querySelector('.cm-comp-card-logic-remove').setAttribute('data-var', data.logicVar);
      }
      updateLogicRowValidation(row);
      syncModel(function (m) {
        return CCM.upsertLogicBinding(m, data.oldVar, data.logicVar, data.typeText, data.pinName);
      });
    }
    row.querySelectorAll('.cm-comp-card-logic-var, .cm-comp-card-logic-type, .cm-comp-card-logic-pin').forEach(function (el) {
      el.addEventListener('input', function () { updateLogicRowValidation(row); });
      el.addEventListener('change', syncFromRow);
    });
    updateLogicRowValidation(row);
    const removeBtn = row.querySelector('.cm-comp-card-logic-remove');
    removeBtn.addEventListener('click', function () {
      if (row.dataset.pending === '1') {
        row.remove();
        return;
      }
      const oldVar = row.getAttribute('data-old-var');
      syncModel(function (m) { return CCM.removeLogicBinding(m, oldVar); });
    });
    row.querySelectorAll('input').forEach(function (el) {
      el.addEventListener('keydown', function (e) { e.stopPropagation(); });
      bindInputNativeCaret(el);
    });
  }

  function buildCardDom(model, registry, catalog, editor, refreshImmediate, internalEditFlag, clearBlockMarker) {
    const div = document.createElement('div');
    div.className = 'cm-comp-card-main';
    div.dataset.blockId = model.id;

    const invalidSet = new Set(CCM.getInvalidAttrs(model, registry));
    const explicit = CCM.getExplicitAttrs(model);
    const missing = CCM.getMissingAttrNames(model, registry);

    let programHtml = '';
    if (model.type === 'plc' && explicit.some(function (a) { return a.name === 'program'; })) {
      programHtml = renderProgramRefsField(model, editor);
    }

    let gridHtml = '<div class="cm-comp-card-grid">';
    gridHtml += renderEqualsField(model);
    explicit.forEach(function (attr) {
      if (model.type === 'plc' && attr.name === 'program') {
        return;
      }
      if (attr.kind === 'segment') {
        gridHtml += renderSegmentField(attr, invalidSet);
      } else {
        gridHtml += renderAttrField(model, attr, registry, invalidSet);
      }
    });
    gridHtml += '</div>';
    gridHtml = programHtml + gridHtml;
    gridHtml += renderNestedSections(model, editor);

    let addHtml = '';
    if (missing.length) {
      addHtml = '<div class="cm-comp-card-add-row">' +
        '<select class="cm-comp-card-attr-add-select"><option value="">+attribute</option>';
      missing.forEach(function (n) {
        addHtml += '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>';
      });
      addHtml += '</select></div>';
    }

    const viewBtnLabel = model.viewMode === 'source' ? 'Show card' : 'Show source';

    div.innerHTML =
      '<button type="button" class="cm-comp-card-delete" title="Delete comp">✕</button>' +
      '<div class="cm-comp-card-header">' +
      '<input type="text" class="cm-comp-card-name-input" value="' + escapeHtml(model.name) + '">' +
      buildTypeSelectHtml(catalog, model.type) +
      '<button type="button" class="cm-comp-card-view-toggle">' + viewBtnLabel + '</button>' +
      '</div>' +
      (model.viewMode === 'source' ? '' : gridHtml + addHtml);

    function currentModel() {
      return CCM.resolveCompBlockById(editor.getValue(), model.id, registry) || model;
    }

    function syncModel(mutator) {
      const cur = currentModel();
      const next = mutator(CCM.cloneModel(cur));
      applyPatch(editor, cur, CCM.serializeCompBlock(next), refreshImmediate, internalEditFlag, clearBlockMarker);
    }

    div.querySelector('.cm-comp-card-name-input').addEventListener('change', function (e) {
      const v = e.target.value.trim();
      syncModel(function (m) { return CCM.setCompName(m, v); });
    });

    div.querySelector('.cm-comp-card-type-select').addEventListener('change', function (e) {
      syncModel(function (m) { return CCM.setCompType(m, e.target.value); });
    });

    div.querySelector('.cm-comp-card-view-toggle').addEventListener('click', function () {
      const holder = div.closest('.cm-comp-card-widget-root');
      if (holder && holder._toggleViewMode) holder._toggleViewMode();
    });

    div.querySelector('.cm-comp-card-delete').addEventListener('click', function () {
      const span = model.span;
      if (clearBlockMarker) clearBlockMarker(model.id);
      if (internalEditFlag) internalEditFlag.value = true;
      try {
        editor.operation(function () {
          editor.replaceRange('', { line: span.startLine, ch: 0 }, blockReplaceTo(editor, span));
        });
      } finally {
        if (internalEditFlag) internalEditFlag.value = false;
      }
    });

    div.querySelectorAll('.cm-comp-card-attr-input').forEach(function (el) {
      el.addEventListener('change', function (e) {
        const name = e.target.getAttribute('data-attr');
        syncModel(function (m) { return CCM.setAttrValue(m, name, e.target.value); });
      });
    });

    div.querySelectorAll('.cm-comp-card-flag-input').forEach(function (el) {
      el.addEventListener('change', function (e) {
        const name = e.target.getAttribute('data-attr');
        if (!e.target.checked) {
          syncModel(function (m) { return CCM.removeAttr(m, name); });
        }
      });
    });

    div.querySelectorAll('.cm-comp-card-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const name = btn.getAttribute('data-attr');
        syncModel(function (m) { return CCM.removeAttr(m, name); });
      });
    });

    div.querySelectorAll('.cm-comp-card-segment-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const name = btn.getAttribute('data-seg');
        syncModel(function (m) { return CCM.toggleSegment(m, name); });
      });
    });

    const eqInput = div.querySelector('.cm-comp-card-equals-input');
    if (eqInput) {
      eqInput.addEventListener('change', function (e) {
        syncModel(function (m) { return CCM.setEqualsRhs(m, e.target.value); });
      });
    }
    const eqTa = div.querySelector('.cm-comp-card-equals-textarea');
    if (eqTa) {
      eqTa.addEventListener('change', function (e) {
        syncModel(function (m) { return CCM.setEqualsRhs(m, e.target.value); });
      });
    }

    const addSel = div.querySelector('.cm-comp-card-attr-add-select');
    if (addSel) {
      addSel.addEventListener('change', function (e) {
        const name = e.target.value;
        if (!name) return;
        e.target.value = '';
        syncModel(function (m) { return CCM.addAttr(m, name, registry); });
      });
    }

    const plcProgSel = div.querySelector('.cm-comp-card-plc-program-ref');
    if (plcProgSel) {
      plcProgSel.addEventListener('change', function (e) {
        const val = e.target.value.trim();
        if (!val) return;
        const refs = val.split(/\s+/).filter(Boolean);
        syncModel(function (m) { return CCM.setProgramRefs(m, refs); });
      });
    }

    div.querySelectorAll('.cm-comp-card-plc-target').forEach(function (el) {
      el.addEventListener('change', function (e) {
        const mapName = e.target.getAttribute('data-map');
        const sym = e.target.getAttribute('data-sym');
        syncModel(function (m) { return CCM.setPlcMapEntry(m, mapName, sym, e.target.value.trim()); });
      });
    });

    div.querySelectorAll('.cm-comp-card-plc-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const mapName = btn.getAttribute('data-map');
        syncModel(function (m) { return CCM.addPlcMapEntry(m, mapName, 'NEW', 'wire'); });
      });
    });

    div.querySelectorAll('.cm-comp-card-plc-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const mapName = btn.getAttribute('data-map');
        const sym = btn.getAttribute('data-sym');
        syncModel(function (m) { return CCM.removePlcMapEntry(m, mapName, sym); });
      });
    });

    div.querySelectorAll('.cm-comp-card-plc-global-width').forEach(function (el) {
      el.addEventListener('change', function (e) {
        const sym = e.target.getAttribute('data-sym');
        const w = e.target.value.trim();
        syncModel(function (m) {
          return CCM.setPlcGlobalEntry(m, sym, w === '' ? 1 : parseInt(w, 10));
        });
      });
    });

    div.querySelectorAll('.cm-comp-card-plc-global-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncModel(function (m) { return CCM.setPlcGlobalEntry(m, 'NEW', 1); });
      });
    });

    div.querySelectorAll('.cm-comp-card-plc-global-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncModel(function (m) { return CCM.removePlcGlobalEntry(m, btn.getAttribute('data-sym')); });
      });
    });

    div.querySelectorAll('.cm-comp-card-nested-row--logic-bind').forEach(function (row) {
      bindLogicBindingRow(row, syncModel);
    });

    div.querySelectorAll('.cm-comp-card-logic-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const block = btn.closest('.cm-comp-card-nested--logic');
        const row = appendLogicBindingRow(block, '');
        bindLogicBindingRow(row, syncModel);
        const first = row.querySelector('.cm-comp-card-logic-var');
        if (first) first.focus();
      });
    });

    div.querySelectorAll('.cm-comp-card-clcd-symbol').forEach(function (card) {
      bindClcdSymbolCard(card, syncModel);
    });

    div.querySelectorAll('.cm-comp-card-clcd-block-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncModel(function (m) { return CCM.removeClcdSymbolsBlock(m); });
      });
    });

    div.querySelectorAll('.cm-comp-card-clcd-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncModel(function (m) { return CCM.addClcdSymbol(m, ''); });
      });
    });

    div.querySelectorAll('.cm-comp-card-hitbox-zone').forEach(function (zoneCard) {
      bindHitboxZoneCard(zoneCard, syncModel);
    });

    div.querySelectorAll('.cm-comp-card-hitbox-zone-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const block = btn.closest('.cm-comp-card-nested--hitbox');
        const zoneCard = document.createElement('div');
        zoneCard.className = 'cm-comp-card-hitbox-zone';
        zoneCard.dataset.pending = '1';
        zoneCard.dataset.oldZone = '';
        zoneCard.innerHTML =
          '<div class="cm-comp-card-hitbox-zone-head">' +
          '<input type="text" class="cm-comp-card-nested-input cm-comp-card-hitbox-zone-name" value="">' +
          '<button type="button" class="cm-comp-card-entry-remove cm-comp-card-hitbox-zone-remove">✕</button>' +
          '</div>' +
          renderHitboxLabeledRow('shape', '<input type="text" class="cm-comp-card-nested-input cm-comp-card-hitbox-shape" value="rect(0, 0, 30, 30)">') +
          renderHitboxLabeledRow('touchType:', '<select class="cm-comp-card-nested-input cm-comp-card-hitbox-touch">' +
          '<option value="1" selected>1 — press/release</option><option value="2">2 — pulse</option><option value="3">3 — latch</option></select>') +
          renderHitboxLabeledRow('stroke:', '<input type="text" class="cm-comp-card-nested-input cm-comp-card-hitbox-stroke" placeholder="ffff00" value="">') +
          '<div class="cm-comp-card-hitbox-pouts"></div>' +
          '<button type="button" class="cm-comp-card-hitbox-pout-add" data-zone="">+ pout</button>';
        block.insertBefore(zoneCard, btn);
        bindHitboxZoneCard(zoneCard, syncModel);
        zoneCard.querySelector('.cm-comp-card-hitbox-zone-name').focus();
      });
    });

    div.querySelectorAll('.cm-comp-card-hitbox-pout-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const zoneCard = btn.closest('.cm-comp-card-hitbox-zone');
        const zoneName = zoneCard.querySelector('.cm-comp-card-hitbox-zone-name').value.trim() || btn.getAttribute('data-zone') || 'zone';
        const row = appendHitboxPoutRow(zoneCard, zoneName);
        row.querySelectorAll('input, select').forEach(function (el) {
          el.addEventListener('change', function () {
            const data = readHitboxZoneFromCard(zoneCard);
            if (!data.zone.name) return;
            syncModel(function (m) {
              return CCM.setHitboxZone(m, data.oldName, data.zone);
            });
          });
        });
        const nameInput = row.querySelector('.cm-comp-card-hitbox-pout-namefmt');
        if (nameInput) nameInput.focus();
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-init-call').forEach(function (el) {
      el.addEventListener('change', function (e) {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        syncModel(function (m) { return CCM.setCanvasInitDrawCall(m, idx, e.target.value); });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-init-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const block = btn.closest('.cm-comp-card-canvas-block');
        const idx = block.querySelectorAll('.cm-comp-card-canvas-init-call').length;
        appendCanvasCallRow(block, 'cm-comp-card-canvas-init-call', { idx: idx }, function (value, row) {
          if (value == null) {
            syncModel(function (m) { return CCM.removeCanvasInitDrawCall(m, idx); });
            return;
          }
          syncModel(function (m) {
            let nm = m;
            const cp = CCM.getCanvasProgram(m);
            const len = cp && cp.program && cp.program.initDraw ? cp.program.initDraw.length : 0;
            for (let i = len; i < idx; i++) nm = CCM.addCanvasInitDrawCall(nm, '');
            if (len <= idx) nm = CCM.addCanvasInitDrawCall(nm, value);
            else nm = CCM.setCanvasInitDrawCall(nm, idx, value);
            return nm;
          });
        });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-init-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        syncModel(function (m) { return CCM.removeCanvasInitDrawCall(m, idx); });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-init-section-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncModel(function (m) { return CCM.addCanvasInitDrawSection(m); });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-init-section-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncModel(function (m) { return CCM.removeCanvasInitDrawSection(m); });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-when-call').forEach(function (el) {
      el.addEventListener('change', function (e) {
        const wi = parseInt(e.target.getAttribute('data-when'), 10);
        const ci = parseInt(e.target.getAttribute('data-call'), 10);
        syncModel(function (m) { return CCM.setCanvasWhenCall(m, wi, ci, e.target.value); });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-when-call-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const wi = parseInt(btn.getAttribute('data-when'), 10);
        const block = btn.closest('.cm-comp-card-canvas-block');
        const ci = block.querySelectorAll('.cm-comp-card-canvas-when-call').length;
        appendCanvasCallRow(block, 'cm-comp-card-canvas-when-call', { when: wi, call: ci }, function (value, row) {
          if (value == null) {
            syncModel(function (m) { return CCM.removeCanvasWhenCall(m, wi, ci); });
            return;
          }
          syncModel(function (m) {
            let nm = m;
            const cp = CCM.getCanvasProgram(m);
            const w = cp && cp.program && cp.program.whenRenderers[wi];
            const len = w && w.calls ? w.calls.length : 0;
            for (let i = len; i < ci; i++) nm = CCM.addCanvasWhenCall(nm, wi, '');
            if (len <= ci) nm = CCM.addCanvasWhenCall(nm, wi, value);
            else nm = CCM.setCanvasWhenCall(nm, wi, ci, value);
            return nm;
          });
        });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-when-call-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const wi = parseInt(btn.getAttribute('data-when'), 10);
        const ci = parseInt(btn.getAttribute('data-call'), 10);
        syncModel(function (m) { return CCM.removeCanvasWhenCall(m, wi, ci); });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-when-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncModel(function (m) {
          const zones = CCM.getHitboxZoneNames(m);
          const hb = zones.length ? zones[0] : 'zone';
          return CCM.addCanvasWhenBlock(m, hb, 'press', ['']);
        });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-when-section-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const wi = parseInt(btn.getAttribute('data-when'), 10);
        syncModel(function (m) { return CCM.removeCanvasWhenBlock(m, wi); });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-when-hitbox').forEach(function (el) {
      el.addEventListener('change', function (e) {
        const wi = parseInt(e.target.getAttribute('data-when'), 10);
        syncModel(function (m) {
          const cp = CCM.getCanvasProgram(m);
          const ev = cp && cp.program.whenRenderers[wi] ? cp.program.whenRenderers[wi].event : 'press';
          return CCM.setCanvasWhenMeta(m, wi, e.target.value.trim(), ev);
        });
      });
    });

    div.querySelectorAll('.cm-comp-card-canvas-when-event').forEach(function (el) {
      el.addEventListener('change', function (e) {
        const wi = parseInt(e.target.getAttribute('data-when'), 10);
        syncModel(function (m) {
          const cp = CCM.getCanvasProgram(m);
          const hb = cp && cp.program.whenRenderers[wi] ? cp.program.whenRenderers[wi].hitbox : 'zone';
          return CCM.setCanvasWhenMeta(m, wi, hb, e.target.value);
        });
      });
    });

    const logicRefSel = div.querySelector('.cm-comp-card-logic-ref');
    if (logicRefSel) {
      logicRefSel.addEventListener('change', function (e) {
        const ref = e.target.value;
        if (!ref) return;
        syncModel(function (m) { return CCM.setLogicProgramRef(m, ref); });
      });
    }

    const canvasRefSel = div.querySelector('.cm-comp-card-canvas-ref');
    if (canvasRefSel) {
      canvasRefSel.addEventListener('change', function (e) {
        const ref = e.target.value;
        if (!ref) return;
        syncModel(function (m) { return CCM.setCanvasProgramRef(m, ref); });
      });
    }

    div.querySelectorAll('input, select, textarea, button').forEach(function (el) {
      el.addEventListener('keydown', function (e) { e.stopPropagation(); });
      if (el.tagName === 'SELECT' || el.tagName === 'BUTTON' || el.type === 'checkbox') {
        el.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      } else if (isCaretEditableInput(el)) {
        bindInputNativeCaret(el);
      }
    });

    return div;
  }

  function attachCompCardWidgets(editor, registry) {
    const catalog = CCM.buildTypeCatalog(registry);
    const active = new Map();
    let debounceTimer = null;
    let updatingWidgets = false;
    const internalEditFlag = { value: false };
    let widgetInteractUntil = 0;

    function nodeInAnyWidget(node) {
      if (!node) return false;
      let inside = false;
      active.forEach(function (w) {
        if (w.root && w.root.contains(node)) inside = true;
      });
      return inside;
    }

    function markWidgetInteraction() {
      widgetInteractUntil = Date.now() + 300;
    }

    function shouldSkipCursorActivity() {
      if (focusInsideAnyWidget()) return true;
      if (Date.now() < widgetInteractUntil) return true;
      return false;
    }

    document.addEventListener('mousedown', function (e) {
      if (!nodeInAnyWidget(e.target)) return;
      markWidgetInteraction();
    }, true);

    document.addEventListener('mouseup', function (e) {
      if (!nodeInAnyWidget(e.target)) return;
      markWidgetInteraction();
    }, true);

    document.addEventListener('focusin', function (e) {
      if (!nodeInAnyWidget(e.target)) return;
      markWidgetInteraction();
    }, true);

    function getCardModeSpans() {
      const spans = [];
      active.forEach(function (w) {
        if (w.viewMode === 'card' && w.span) spans.push(w.span);
      });
      return spans;
    }

    function focusInsideAnyWidget() {
      const ae = document.activeElement;
      if (!ae) return false;
      let inside = false;
      active.forEach(function (w) {
        if (w.root && w.root.contains(ae)) inside = true;
      });
      return inside;
    }

    function onBeforeChange(cm, change) {
      if (internalEditFlag.value || updatingWidgets) return;
      if (!isUserEditOrigin(change.origin)) return;
      const spans = getCardModeSpans();
      for (let i = 0; i < spans.length; i++) {
        if (changeTouchesSpan(change, spans[i])) {
          change.cancel();
          return;
        }
      }
    }

    function onCursorActivity() {
      if (internalEditFlag.value || updatingWidgets) return;
      if (shouldSkipCursorActivity()) return;
      const cur = editor.getCursor();
      const spans = getCardModeSpans();
      for (let i = 0; i < spans.length; i++) {
        if (!cursorInsideSpan(cur, spans[i])) continue;
        if (moveCursorOutsideSpan(editor, spans[i])) return;
      }
    }

    function blockSpanForModel(model) {
      const endLine = model.span.endLine;
      return {
        startLine: model.span.startLine,
        endLine: endLine,
        startCh: 0,
        endCh: editor.getLine(endLine).length
      };
    }

    function markerIsLive(marker) {
      if (!marker) return false;
      try {
        return marker.find() != null;
      } catch (e) {
        return false;
      }
    }

    function createCollapseMarker(blockSpan) {
      try {
        return editor.markText(
          { line: blockSpan.startLine, ch: blockSpan.startCh },
          { line: blockSpan.endLine, ch: blockSpan.endCh },
          { collapsed: true, atomic: true, readOnly: true }
        );
      } catch (e) {
        console.warn('comp-card markText failed', e);
        return null;
      }
    }

    function ensureCollapseMarker(w, model, viewMode) {
      if (viewMode !== 'card') {
        if (w.marker) {
          w.marker.clear();
          w.marker = null;
        }
        return;
      }
      w.span = blockSpanForModel(model);
      if (markerIsLive(w.marker)) return;
      if (w.marker) {
        try { w.marker.clear(); } catch (e) { /* ignore */ }
      }
      w.marker = createCollapseMarker(w.span);
    }

    function clearWidget(id) {
      const w = active.get(id);
      if (!w) return;
      if (w.marker) w.marker.clear();
      if (w.lineWidget) w.lineWidget.clear();
      if (w.root && w.root.parentNode) w.root.parentNode.removeChild(w.root);
      active.delete(id);
    }

    function clearAll() {
      active.forEach(function (_, id) { clearWidget(id); });
    }

    function clearBlockMarker(blockId) {
      const w = active.get(blockId);
      if (w && w.marker) {
        w.marker.clear();
        w.marker = null;
      }
    }

    function attachBlock(model, viewModes) {
      const id = model.id;
      const viewMode = (viewModes && viewModes.get(id)) || model.viewMode || 'card';
      model.viewMode = viewMode;

      const root = document.createElement('div');
      root.className = 'cm-comp-card-widget-root';
      root.setAttribute('cm-ignore-events', 'true');

      const refreshImmediate = function () {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = null;
        updateWidgets();
      };

      const card = buildCardDom(model, registry, catalog, editor, refreshImmediate, internalEditFlag, clearBlockMarker);
      root.appendChild(card);

      root._toggleViewMode = function () {
        const cur = active.get(id);
        const current = (cur && cur.viewModes && cur.viewModes.get(id)) || viewMode;
        const next = current === 'card' ? 'source' : 'card';
        if (cur && cur.viewModes) cur.viewModes.set(id, next);
        updateWidgets();
      };

      const endLine = model.span.endLine;
      if (endLine < 0 || endLine >= editor.lineCount()) return;

      const blockSpan = blockSpanForModel(model);

      let marker = null;
      if (viewMode === 'card') {
        marker = createCollapseMarker(blockSpan);
      }

      const lineWidget = editor.addLineWidget(model.span.startLine, root, {
        coverGutter: false,
        noHScroll: true
      });

      const viewModesMap = (active.get(id) && active.get(id).viewModes) || viewModes || new Map();
      viewModesMap.set(id, viewMode);

      active.set(id, {
        marker: marker,
        lineWidget: lineWidget,
        root: root,
        spanKey: CCM.spanKey(model.span),
        contentKey: CCM.modelContentKey(model),
        span: blockSpan,
        viewMode: viewMode,
        viewModes: viewModesMap
      });
    }

    function scheduleUpdate() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateWidgets, 80);
    }

    function updateWidgets() {
      updatingWidgets = true;
      try {
        const src = editor.getValue();
        let blocks = [];
        try {
          blocks = CCM.parseCompBlocks(src, registry);
        } catch (e) {
          console.warn('comp-card parse failed', e);
          return;
        }

        const viewModes = new Map();
        active.forEach(function (w, id) {
          if (w.viewModes && w.viewModes.has(id)) viewModes.set(id, w.viewModes.get(id));
        });

        const seen = new Set();
        let didReattach = false;
        blocks.forEach(function (model) {
          seen.add(model.id);
          const prev = active.get(model.id);
          const key = CCM.spanKey(model.span);
          const contentKey = CCM.modelContentKey(model);
          const desiredMode = viewModes.get(model.id) || 'card';
          if (prev && prev.spanKey === key && prev.viewMode === desiredMode && prev.contentKey === contentKey) {
            ensureCollapseMarker(prev, model, desiredMode);
            return;
          }
          didReattach = true;
          clearWidget(model.id);
          attachBlock(model, viewModes);
        });

        active.forEach(function (_, id) {
          if (!seen.has(id)) clearWidget(id);
        });

        if (didReattach && typeof editor.refresh === 'function') editor.refresh();
      } finally {
        updatingWidgets = false;
      }
    }

    function onEditorChange() {
      if (!internalEditFlag.value &&
          (focusInsideAnyWidget() || Date.now() < widgetInteractUntil)) {
        return;
      }
      scheduleUpdate();
    }

    editor.on('change', onEditorChange);
    editor.on('beforeChange', onBeforeChange);
    editor.on('cursorActivity', onCursorActivity);
    updateWidgets();

    return {
      destroy: function () {
        if (debounceTimer) clearTimeout(debounceTimer);
        editor.off('change', onEditorChange);
        editor.off('beforeChange', onBeforeChange);
        editor.off('cursorActivity', onCursorActivity);
        clearAll();
      },
      refresh: updateWidgets
    };
  }

  root.attachCompCardWidgets = attachCompCardWidgets;

  if (!root.LogTScriptComponents) root.LogTScriptComponents = {};
  if (typeof createComponentRegistry === 'function') {
    root.LogTScriptComponents.createComponentRegistry = createComponentRegistry;
  }
})(typeof window !== 'undefined' ? window : globalThis);
