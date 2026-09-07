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

  function isTextLikeInput(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    const t = (el.type || 'text').toLowerCase();
    return t === 'text' || t === 'number' || t === 'search' || t === 'tel' || t === 'url' || t === 'email' || t === 'password';
  }

  function bindInputCursorToEnd(el) {
    if (!isTextLikeInput(el)) return;
    function moveEnd() {
      const len = (el.value || '').length;
      try {
        if (el.type === 'number') {
          const prevType = el.type;
          el.type = 'text';
          el.setSelectionRange(len, len);
          el.type = prevType;
        } else if (typeof el.setSelectionRange === 'function') {
          el.setSelectionRange(len, len);
        }
      } catch (e) { /* ignore */ }
    }
    el.addEventListener('focus', moveEnd);
    el.addEventListener('mouseup', function () {
      requestAnimationFrame(moveEnd);
    });
  }

  function bindCardTextInputsCursorToEnd(container) {
    container.querySelectorAll('input').forEach(function (el) {
      bindInputCursorToEnd(el);
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
        '<button type="button" class="cm-comp-card-remove" data-attr="' + escapeHtml(attr.name) + '">✕</button>' +
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
        '<select class="cm-comp-card-attr-input" data-attr="' + escapeHtml(attr.name) + '">' + opts + '</select>' +
        '<button type="button" class="cm-comp-card-remove" data-attr="' + escapeHtml(attr.name) + '">✕</button>' +
        '</div>'
      );
    }

    const inputType = fieldType === 'integer' ? 'number' : 'text';
    return (
      '<div class="cm-comp-card-item' + invalidClass + '"' + title + '>' +
      '<span>' + escapeHtml(attr.name) + '</span>' +
      '<input type="' + inputType + '" class="cm-comp-card-attr-input" data-attr="' + escapeHtml(attr.name) + '" value="' + escapeHtml(attr.value || '') + '">' +
      '<button type="button" class="cm-comp-card-remove" data-attr="' + escapeHtml(attr.name) + '">✕</button>' +
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
      '<button type="button" class="cm-comp-card-segment-toggle' + (active ? ' is-on' : '') + '" data-seg="' + escapeHtml(seg.name) + '">' + escapeHtml(seg.value) + '</button>' +
      '<button type="button" class="cm-comp-card-remove" data-attr="' + escapeHtml(seg.name) + '">✕</button>' +
      '</div>'
    );
  }

  function renderEqualsField(model) {
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

  function buildCardDom(model, registry, catalog, editor, refreshImmediate, internalEditFlag, clearBlockMarker) {
    const div = document.createElement('div');
    div.className = 'cm-comp-card-main';
    div.dataset.blockId = model.id;

    const invalidSet = new Set(CCM.getInvalidAttrs(model, registry));
    const explicit = CCM.getExplicitAttrs(model);
    const missing = CCM.getMissingAttrNames(model, registry);

    let gridHtml = '<div class="cm-comp-card-grid">';
    gridHtml += renderEqualsField(model);
    explicit.forEach(function (attr) {
      if (attr.kind === 'segment') {
        gridHtml += renderSegmentField(attr, invalidSet);
      } else {
        gridHtml += renderAttrField(model, attr, registry, invalidSet);
      }
    });
    gridHtml += '</div>';

    let addHtml = '';
    if (missing.length) {
      addHtml = '<div class="cm-comp-card-add-row">' +
        '<select class="cm-comp-card-add-select"><option value="">+ Attribute</option>';
      missing.forEach(function (n) {
        addHtml += '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>';
      });
      addHtml += '</select></div>';
    }

    const viewBtnLabel = model.viewMode === 'source' ? 'Show card' : 'Show source';

    div.innerHTML =
      '<button type="button" class="cm-comp-card-delete" title="Delete comp">❌</button>' +
      '<div class="cm-comp-card-header">' +
      '<input type="text" class="cm-comp-card-name-input" value="' + escapeHtml(model.name) + '">' +
      buildTypeSelectHtml(catalog, model.type) +
      '<button type="button" class="cm-comp-card-view-toggle">' + viewBtnLabel + '</button>' +
      '</div>' +
      (model.viewMode === 'source' ? '' : gridHtml + addHtml);

    function syncModel(mutator) {
      let next = mutator(CCM.cloneModel(model));
      applyPatch(editor, model, CCM.serializeCompBlock(next), refreshImmediate, internalEditFlag, clearBlockMarker);
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

    bindCardTextInputsCursorToEnd(div);

    div.querySelectorAll('input.cm-comp-card-attr-input').forEach(function (el) {
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

    const addSel = div.querySelector('.cm-comp-card-add-select');
    if (addSel) {
      addSel.addEventListener('change', function (e) {
        const name = e.target.value;
        if (!name) return;
        e.target.value = '';
        syncModel(function (m) { return CCM.addAttr(m, name, registry); });
      });
    }

    div.querySelectorAll('input, select, textarea, button').forEach(function (el) {
      el.addEventListener('keydown', function (e) { e.stopPropagation(); });
      el.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    });

    return div;
  }

  function attachCompCardWidgets(editor, registry) {
    const catalog = CCM.buildTypeCatalog(registry);
    const active = new Map();
    let debounceTimer = null;
    let updatingWidgets = false;
    const internalEditFlag = { value: false };

    function getCardModeSpans() {
      const spans = [];
      active.forEach(function (w) {
        if (w.viewMode === 'card' && w.span) spans.push(w.span);
      });
      return spans;
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
      const cur = editor.getCursor();
      const spans = getCardModeSpans();
      for (let i = 0; i < spans.length; i++) {
        if (!cursorInsideSpan(cur, spans[i])) continue;
        if (moveCursorOutsideSpan(editor, spans[i])) return;
      }
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

      const blockSpan = {
        startLine: model.span.startLine,
        endLine: endLine,
        startCh: 0,
        endCh: editor.getLine(endLine).length
      };

      let marker = null;
      if (viewMode === 'card') {
        try {
          marker = editor.markText(
            { line: blockSpan.startLine, ch: blockSpan.startCh },
            { line: blockSpan.endLine, ch: blockSpan.endCh },
            { collapsed: true, atomic: true, readOnly: true }
          );
        } catch (e) {
          console.warn('comp-card markText failed', e);
        }
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
        blocks.forEach(function (model) {
          seen.add(model.id);
          const prev = active.get(model.id);
          const key = CCM.spanKey(model.span);
          const desiredMode = viewModes.get(model.id) || 'card';
          const markerOk = desiredMode !== 'card' || (prev && prev.marker);
          if (prev && prev.spanKey === key && prev.viewMode === desiredMode && markerOk) return;
          clearWidget(model.id);
          attachBlock(model, viewModes);
        });

        active.forEach(function (_, id) {
          if (!seen.has(id)) clearWidget(id);
        });

        if (typeof editor.refresh === 'function') editor.refresh();
      } finally {
        updatingWidgets = false;
      }
    }

    function onEditorChange() {
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
