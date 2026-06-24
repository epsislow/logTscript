/* ================= NETWORK TRAFFIC PANEL ================= */

const NETWORK_TRAFFIC_COLUMNS = [
  { key: 'id', label: 'Id', filterable: true, filterType: 'numeric' },
  { key: 'source', label: 'Source', filterable: true, filterType: 'numeric' },
  { key: 'target', label: 'Target', filterable: true, filterType: 'target' },
  { key: 'channel', label: 'Channel', filterable: true },
  { key: 'size', label: 'Size', filterable: true, filterType: 'numeric' },
  { key: 'status', label: 'Status', filterable: true, filterType: 'select' },
];

const _trafficPanelState = {
  pageIndex: 0,
  filters: { id: '', source: '', target: '', channel: '', size: '', status: '' },
  expandedId: null,
  activeFilterCol: null,
  initialized: false,
  live: true,
  pendingRefresh: false,
  lastRenderedMaxId: 0,
  suppressNewRowFlash: true,
};

function _updateLiveButton() {
  const btn = document.getElementById('networkTrafficLiveBtn');
  const title = document.getElementById('networkTrafficTitle');
  if (title) {
    title.textContent = _trafficPanelState.live ? 'Network Traffic' : 'Network Traffic (paused)';
  }
  if (!btn) return;
  if (_trafficPanelState.live) {
    btn.textContent = 'Pause';
    btn.title = 'Pause live updates';
    btn.classList.remove('network-traffic-live-pending');
  } else {
    btn.textContent = 'Live';
    btn.title = _trafficPanelState.pendingRefresh
      ? 'Resume live updates (new packets waiting)'
      : 'Resume live updates';
    if (_trafficPanelState.pendingRefresh) {
      btn.classList.add('network-traffic-live-pending');
    } else {
      btn.classList.remove('network-traffic-live-pending');
    }
  }
}

function notifyNetworkTrafficPanel() {
  if (typeof renderNetworkTrafficPanel !== 'function') return;
  const panel = document.getElementById('networkTrafficPanel');
  if (!panel || panel.style.display === 'none') return;
  if (!_trafficPanelState.live) {
    _trafficPanelState.pendingRefresh = true;
    _updateLiveButton();
    return;
  }
  _trafficPanelState.pendingRefresh = false;
  renderNetworkTrafficPanel();
}

function _trafficFormatValue(packetBits, size) {
  const interp = typeof getActiveInterp === 'function' ? getActiveInterp() : null;
  if (interp && typeof interp.formatValue === 'function') {
    return interp.formatValue(packetBits, size);
  }
  return packetBits;
}

function _trafficColumnByKey(key) {
  return NETWORK_TRAFFIC_COLUMNS.find((col) => col.key === key) || null;
}

function _isNumericFilterCol(colKey) {
  const col = _trafficColumnByKey(colKey);
  return !!(col && col.filterType === 'numeric');
}

function _filterInputPlaceholder(colKey) {
  if (colKey === 'target') return '* or 23 or 1 - 20';
  if (_isNumericFilterCol(colKey)) return '23 or 1 - 20';
  return '';
}

function _isSelectFilterCol(colKey) {
  const col = _trafficColumnByKey(colKey);
  return !!(col && col.filterType === 'select');
}

function _clampPageIndex(pageIndex, total) {
  if (total <= 0) return 0;
  const maxPage = Math.max(0, Math.ceil(total / NETWORK_TRAFFIC_PAGE_SIZE) - 1);
  return Math.min(Math.max(0, pageIndex), maxPage);
}

function _syncFilterBarControls() {
  const filterBar = document.getElementById('networkTrafficFilterBar');
  const input = document.getElementById('networkTrafficFilterInput');
  const select = document.getElementById('networkTrafficFilterSelect');
  const col = _trafficPanelState.activeFilterCol;

  if (filterBar) {
    filterBar.style.display = col ? '' : 'none';
  }
  if (!col) return;

  const value = _trafficPanelState.filters[col] || '';
  const useSelect = _isSelectFilterCol(col);

  if (input) {
    input.style.display = useSelect ? 'none' : '';
    if (!useSelect) {
      input.value = value;
      input.placeholder = _filterInputPlaceholder(col);
    }
  }
  if (select) {
    select.style.display = useSelect ? '' : 'none';
    if (useSelect) select.value = value;
  }
}

function _readActiveFilterValue() {
  const col = _trafficPanelState.activeFilterCol;
  if (!col) return '';
  if (_isSelectFilterCol(col)) {
    const select = document.getElementById('networkTrafficFilterSelect');
    return select ? select.value : '';
  }
  const input = document.getElementById('networkTrafficFilterInput');
  return input ? input.value : '';
}

function _applyActiveFilter() {
  const col = _trafficPanelState.activeFilterCol;
  if (!col) return;
  _trafficPanelState.filters[col] = _readActiveFilterValue();
  _trafficPanelState.pageIndex = 0;
  _trafficPanelState.activeFilterCol = null;
  renderNetworkTrafficPanel();
}

function _clearActiveFilter() {
  const col = _trafficPanelState.activeFilterCol;
  if (col) {
    _trafficPanelState.filters[col] = '';
    _trafficPanelState.pageIndex = 0;
  }
  _trafficPanelState.activeFilterCol = null;
  renderNetworkTrafficPanel();
}

function renderNetworkTrafficPanel() {
  const panel = document.getElementById('networkTrafficPanel');
  if (!panel || panel.style.display === 'none') return;

  const tbody = document.getElementById('networkTrafficTableBody');
  const summary = document.getElementById('networkTrafficPagerSummary');
  const prevBtn = document.getElementById('networkTrafficPrev');
  const nextBtn = document.getElementById('networkTrafficNext');
  if (!tbody || !summary) return;

  const log = typeof getNetworkTrafficLog === 'function' ? getNetworkTrafficLog() : [];
  const filtered = typeof getFilteredTrafficLog === 'function'
    ? getFilteredTrafficLog(log, _trafficPanelState.filters)
    : log;
  _trafficPanelState.pageIndex = _clampPageIndex(_trafficPanelState.pageIndex, filtered.length);
  const page = typeof getDisplayPage === 'function'
    ? getDisplayPage(filtered, _trafficPanelState.pageIndex)
    : { entries: [], total: 0, shown: 0, rowStart: 0, rowEnd: 0 };

  if (typeof formatPagerSummary === 'function') {
    summary.textContent = formatPagerSummary(page);
  }

  if (prevBtn) prevBtn.disabled = page.pageIndex <= 0;
  if (nextBtn) {
    const maxPage = page.total > 0
      ? Math.ceil(page.total / NETWORK_TRAFFIC_PAGE_SIZE) - 1
      : 0;
    nextBtn.disabled = page.pageIndex >= maxPage;
  }

  _renderTrafficHeaders();
  _syncFilterBarControls();

  const prevMaxId = _trafficPanelState.lastRenderedMaxId || 0;
  let logMaxId = prevMaxId;
  for (let i = 0; i < log.length; i++) {
    if (log[i].id > logMaxId) logMaxId = log[i].id;
  }

  tbody.innerHTML = '';
  if (!page.total) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = NETWORK_TRAFFIC_COLUMNS.length;
    td.className = 'network-traffic-empty';
    td.textContent = log.length ? 'No matching traffic' : 'No network traffic yet';
    tr.appendChild(td);
    tbody.appendChild(tr);
    _trafficPanelState.lastRenderedMaxId = logMaxId;
    _trafficPanelState.suppressNewRowFlash = false;
    return;
  }

  for (const entry of page.entries) {
    const tr = document.createElement('tr');
    tr.className = 'network-traffic-row';
    if (_trafficPanelState.expandedId === entry.id) {
      tr.classList.add('network-traffic-row--selected');
    }
    if (entry.id > prevMaxId && !_trafficPanelState.suppressNewRowFlash) {
      tr.classList.add(entry.status === 'Dropped'
        ? 'network-traffic-row--flash-dropped'
        : 'network-traffic-row--flash-received');
    }
    tr.dataset.trafficId = String(entry.id);

    const cells = [
      entry.id,
      entry.source,
      entry.target,
      entry.channel,
      entry.size,
      entry.status,
    ];
    for (let i = 0; i < cells.length; i++) {
      const td = document.createElement('td');
      td.textContent = String(cells[i]);
      td.className = 'network-traffic-col-' + NETWORK_TRAFFIC_COLUMNS[i].key;
      if (NETWORK_TRAFFIC_COLUMNS[i].key === 'channel') {
        td.title = String(cells[i]);
      }
      if (NETWORK_TRAFFIC_COLUMNS[i].key === 'status') {
        if (entry.status === 'Dropped') {
          td.classList.add('network-traffic-status-dropped');
        } else if (entry.status === 'Received') {
          td.classList.add('network-traffic-status-received');
        }
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);

    if (_trafficPanelState.expandedId === entry.id) {
      const expTr = document.createElement('tr');
      expTr.className = 'network-traffic-row-expanded';
      const expTd = document.createElement('td');
      expTd.colSpan = NETWORK_TRAFFIC_COLUMNS.length;
      const pre = document.createElement('pre');
      pre.className = 'network-traffic-packet';
      const lines = typeof formatPacketLines === 'function'
        ? formatPacketLines(entry.packet, entry.size, _trafficFormatValue)
        : [entry.packet];
      pre.textContent = lines.join('\n');
      expTd.appendChild(pre);
      expTr.appendChild(expTd);
      tbody.appendChild(expTr);
    }
  }

  _trafficPanelState.lastRenderedMaxId = logMaxId;
  _trafficPanelState.suppressNewRowFlash = false;
}

function _renderTrafficHeaders() {
  const headRow = document.getElementById('networkTrafficHeaderRow');
  if (!headRow) return;
  headRow.innerHTML = '';
  for (const col of NETWORK_TRAFFIC_COLUMNS) {
    const th = document.createElement('th');
    th.className = 'network-traffic-col-' + col.key;
    th.textContent = col.label;
    if (col.filterable) {
      th.classList.add('network-traffic-th-filterable');
      th.dataset.filterCol = col.key;
      if ((_trafficPanelState.filters[col.key] || '').trim()) {
        th.classList.add('network-traffic-th-filtered');
      }
    }
    headRow.appendChild(th);
  }
}

function initNetworkTrafficPanel() {
  if (_trafficPanelState.initialized) return;
  _trafficPanelState.initialized = true;

  const tbody = document.getElementById('networkTrafficTableBody');
  const prevBtn = document.getElementById('networkTrafficPrev');
  const nextBtn = document.getElementById('networkTrafficNext');
  const clearBtn = document.getElementById('networkTrafficClear');
  const liveBtn = document.getElementById('networkTrafficLiveBtn');
  const filterApply = document.getElementById('networkTrafficFilterApply');
  const filterClear = document.getElementById('networkTrafficFilterClear');
  const filterInput = document.getElementById('networkTrafficFilterInput');
  const filterSelect = document.getElementById('networkTrafficFilterSelect');
  const headRow = document.getElementById('networkTrafficHeaderRow');

  if (headRow) {
    headRow.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-filter-col]');
      if (!th) return;
      const col = th.dataset.filterCol;
      _trafficPanelState.activeFilterCol = col;
      renderNetworkTrafficPanel();
      if (_isSelectFilterCol(col)) {
        if (filterSelect) filterSelect.focus();
      } else if (filterInput) {
        filterInput.focus();
        filterInput.select();
      }
    });
  }

  if (filterApply) {
    filterApply.addEventListener('click', _applyActiveFilter);
  }

  if (filterClear) {
    filterClear.addEventListener('click', _clearActiveFilter);
  }

  if (filterInput) {
    filterInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        _applyActiveFilter();
      } else if (e.key === 'Escape') {
        _trafficPanelState.activeFilterCol = null;
        renderNetworkTrafficPanel();
      }
    });
  }

  if (filterSelect) {
    filterSelect.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        _applyActiveFilter();
      } else if (e.key === 'Escape') {
        _trafficPanelState.activeFilterCol = null;
        renderNetworkTrafficPanel();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (_trafficPanelState.pageIndex > 0) {
        _trafficPanelState.pageIndex--;
        renderNetworkTrafficPanel();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      _trafficPanelState.pageIndex++;
      renderNetworkTrafficPanel();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (typeof clearNetworkTrafficLog === 'function') {
        clearNetworkTrafficLog();
      }
      _trafficPanelState.pageIndex = 0;
      _trafficPanelState.expandedId = null;
      _trafficPanelState.pendingRefresh = false;
      _trafficPanelState.lastRenderedMaxId = 0;
      _trafficPanelState.suppressNewRowFlash = true;
      renderNetworkTrafficPanel();
      _updateLiveButton();
    });
  }

  if (liveBtn) {
    liveBtn.addEventListener('click', () => {
      if (_trafficPanelState.live) {
        _trafficPanelState.live = false;
        _updateLiveButton();
        return;
      }
      _trafficPanelState.live = true;
      _trafficPanelState.pendingRefresh = false;
      _updateLiveButton();
      renderNetworkTrafficPanel();
    });
  }

  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr.network-traffic-row');
      if (!tr) return;
      const id = parseInt(tr.dataset.trafficId, 10);
      _trafficPanelState.expandedId = _trafficPanelState.expandedId === id ? null : id;
      renderNetworkTrafficPanel();
    });
  }

  _updateLiveButton();
  renderNetworkTrafficPanel();
}

function toggleNetworkTraffic() {
  const panel = document.getElementById('networkTrafficPanel');
  if (!panel) return;
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    initNetworkTrafficPanel();
    _trafficPanelState.suppressNewRowFlash = true;
    renderNetworkTrafficPanel();
  } else {
    panel.style.display = 'none';
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNetworkTrafficPanel);
  } else {
    initNetworkTrafficPanel();
  }
}
