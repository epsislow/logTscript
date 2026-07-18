/* ================= NETWORK TRAFFIC PANEL ================= */

const NETWORK_TRAFFIC_VIEWS = ['packets', 'sockets'];

const NETWORK_TRAFFIC_COLUMNS = [
  { key: 'id', label: 'Id', filterable: true, filterType: 'numeric' },
  { key: 'source', label: 'Source', filterable: true, filterType: 'numeric' },
  { key: 'target', label: 'Target', filterable: true, filterType: 'target' },
  { key: 'channel', label: 'Channel', filterable: true },
  { key: 'size', label: 'Size', filterable: true, filterType: 'numeric' },
  { key: 'status', label: 'Status', filterable: true, filterType: 'select' },
];

function _emptyPacketFilters() {
  return { id: '', source: '', target: '', channel: '', size: '', status: '' };
}

function _emptySocketFilters() {
  return {
    id: '', event: '', source: '', sourceSock: '', target: '', targetSock: '',
    channel: '', port: '', size: '', buf: '', status: '',
  };
}

function _emptyViewState(filters) {
  return {
    pageIndex: 0,
    filters,
    expandedId: null,
    activeFilterCol: null,
    live: true,
    pendingRefresh: false,
    lastRenderedMaxId: 0,
    suppressNewRowFlash: true,
    pausedLogSnapshot: null,
  };
}

const _trafficPanelState = {
  view: 'packets',
  packets: _emptyViewState(_emptyPacketFilters()),
  sockets: _emptyViewState(_emptySocketFilters()),
  initialized: false,
};

function _currentViewState() {
  return _trafficPanelState.view === 'sockets'
    ? _trafficPanelState.sockets
    : _trafficPanelState.packets;
}

function _currentColumns() {
  if (_trafficPanelState.view === 'sockets'
    && typeof NETWORK_SOCKET_COLUMNS !== 'undefined') {
    return NETWORK_SOCKET_COLUMNS;
  }
  return NETWORK_TRAFFIC_COLUMNS;
}

function _snapshotPacketsLog() {
  const log = typeof getNetworkTrafficLog === 'function' ? getNetworkTrafficLog() : [];
  return log.map((entry) => ({ ...entry }));
}

function _snapshotSocketsLog() {
  const log = typeof getNetworkSocketTrafficLog === 'function' ? getNetworkSocketTrafficLog() : [];
  return log.map((entry) => ({ ...entry }));
}

function _getDisplayLog() {
  const vs = _currentViewState();
  if (!vs.live && vs.pausedLogSnapshot != null) {
    return vs.pausedLogSnapshot;
  }
  if (_trafficPanelState.view === 'sockets') {
    return typeof getNetworkSocketTrafficLog === 'function' ? getNetworkSocketTrafficLog() : [];
  }
  return typeof getNetworkTrafficLog === 'function' ? getNetworkTrafficLog() : [];
}

function _updateLiveButton() {
  const btn = document.getElementById('networkTrafficLiveBtn');
  const title = document.getElementById('networkTrafficTitle');
  const vs = _currentViewState();
  if (title) {
    title.textContent = vs.live ? 'Network Traffic' : 'Network Traffic (paused)';
  }
  if (!btn) return;
  if (vs.live) {
    btn.textContent = 'Pause';
    btn.title = 'Pause live updates';
    btn.classList.remove('network-traffic-live-pending');
  } else {
    btn.textContent = 'Live';
    btn.title = vs.pendingRefresh
      ? 'Resume live updates (new entries waiting)'
      : 'Resume live updates';
    if (vs.pendingRefresh) {
      btn.classList.add('network-traffic-live-pending');
    } else {
      btn.classList.remove('network-traffic-live-pending');
    }
  }
}

function _updateViewButton() {
  const btn = document.getElementById('networkTrafficViewBtn');
  if (!btn) return;
  const view = _trafficPanelState.view;
  btn.textContent = view;
  btn.className = 'btn network-traffic-view-btn network-traffic-view--' + view;
  const other = view === 'packets' ? 'sockets' : 'packets';
  btn.title = 'Network traffic view: ' + view + ' (click to switch to ' + other + ')';
}

function notifyNetworkTrafficPanel() {
  if (typeof renderNetworkTrafficPanel !== 'function') return;
  const panel = document.getElementById('networkTrafficPanel');
  if (!panel || panel.style.display === 'none') return;
  if (_trafficPanelState.view !== 'packets') return;
  const vs = _trafficPanelState.packets;
  if (!vs.live) {
    vs.pendingRefresh = true;
    _updateLiveButton();
    return;
  }
  vs.pendingRefresh = false;
  renderNetworkTrafficPanel();
}

function notifyNetworkSocketTrafficPanel() {
  if (typeof renderNetworkTrafficPanel !== 'function') return;
  const panel = document.getElementById('networkTrafficPanel');
  if (!panel || panel.style.display === 'none') return;
  if (_trafficPanelState.view !== 'sockets') return;
  const vs = _trafficPanelState.sockets;
  if (!vs.live) {
    vs.pendingRefresh = true;
    _updateLiveButton();
    return;
  }
  vs.pendingRefresh = false;
  renderNetworkTrafficPanel();
}

function cycleNetworkTrafficView() {
  const cur = _trafficPanelState.view;
  const curState = _currentViewState();
  curState.live = false;
  curState.pausedLogSnapshot = cur === 'packets' ? _snapshotPacketsLog() : _snapshotSocketsLog();

  const idx = NETWORK_TRAFFIC_VIEWS.indexOf(cur);
  _trafficPanelState.view = NETWORK_TRAFFIC_VIEWS[(idx + 1) % NETWORK_TRAFFIC_VIEWS.length];

  const nextState = _currentViewState();
  nextState.live = true;
  nextState.pausedLogSnapshot = null;
  nextState.pendingRefresh = false;
  nextState.activeFilterCol = null;
  nextState.suppressNewRowFlash = true;

  _updateViewButton();
  _updateLiveButton();
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
  return _currentColumns().find((col) => col.key === key) || null;
}

function _isNumericFilterCol(colKey) {
  const col = _trafficColumnByKey(colKey);
  return !!(col && col.filterType === 'numeric');
}

function _filterInputPlaceholder(colKey) {
  if (colKey === 'target') {
    return _trafficPanelState.view === 'sockets' ? '\u2014 or 23 or 1 - 20' : '* or 23 or 1 - 20';
  }
  if (_isNumericFilterCol(colKey)) return '23 or 1 - 20';
  return '';
}

function _isSelectFilterCol(colKey) {
  const col = _trafficColumnByKey(colKey);
  return !!(col && col.filterType === 'select');
}

function _clampPageIndex(pageIndex, total) {
  if (total <= 0) return 0;
  const pageSize = typeof NETWORK_TRAFFIC_PAGE_SIZE !== 'undefined' ? NETWORK_TRAFFIC_PAGE_SIZE : 5;
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  return Math.min(Math.max(0, pageIndex), maxPage);
}

function _populateFilterSelect(select, colKey) {
  if (!select) return;
  select.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '\u2014';
  select.appendChild(empty);

  let options = [];
  if (_trafficPanelState.view === 'packets' && colKey === 'status') {
    options = ['Received', 'Dropped'];
  } else if (_trafficPanelState.view === 'sockets' && colKey === 'event'
    && typeof SOCKET_EVENT_FILTER_OPTIONS !== 'undefined') {
    options = SOCKET_EVENT_FILTER_OPTIONS;
  } else if (_trafficPanelState.view === 'sockets' && colKey === 'status'
    && typeof SOCKET_STATUS_FILTER_OPTIONS !== 'undefined') {
    options = SOCKET_STATUS_FILTER_OPTIONS;
  }
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    select.appendChild(o);
  }
}

function _syncFilterBarControls() {
  const filterBar = document.getElementById('networkTrafficFilterBar');
  const input = document.getElementById('networkTrafficFilterInput');
  const select = document.getElementById('networkTrafficFilterSelect');
  const vs = _currentViewState();
  const col = vs.activeFilterCol;
  const colCount = _currentColumns().length;

  if (filterBar) {
    filterBar.style.display = col ? '' : 'none';
    const td = filterBar.querySelector('td');
    if (td) td.colSpan = colCount;
  }
  if (!col) return;

  const value = vs.filters[col] || '';
  const useSelect = _isSelectFilterCol(col);

  if (select && useSelect) {
    _populateFilterSelect(select, col);
  }

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
  const vs = _currentViewState();
  const col = vs.activeFilterCol;
  if (!col) return '';
  if (_isSelectFilterCol(col)) {
    const select = document.getElementById('networkTrafficFilterSelect');
    return select ? select.value : '';
  }
  const input = document.getElementById('networkTrafficFilterInput');
  return input ? input.value : '';
}

function _applyActiveFilter() {
  const vs = _currentViewState();
  const col = vs.activeFilterCol;
  if (!col) return;
  vs.filters[col] = _readActiveFilterValue();
  vs.pageIndex = 0;
  vs.activeFilterCol = null;
  renderNetworkTrafficPanel();
}

function _clearActiveFilter() {
  const vs = _currentViewState();
  const col = vs.activeFilterCol;
  if (col) {
    vs.filters[col] = '';
    vs.pageIndex = 0;
  }
  vs.activeFilterCol = null;
  renderNetworkTrafficPanel();
}

function _entryCellValue(entry, colKey) {
  if (_trafficPanelState.view === 'sockets'
    && typeof socketTrafficCellValue === 'function') {
    return socketTrafficCellValue(entry, colKey);
  }
  if (typeof trafficCellValue === 'function') {
    return trafficCellValue(entry, colKey);
  }
  return entry[colKey] != null ? String(entry[colKey]) : '';
}

function _filterLog(log) {
  const vs = _currentViewState();
  if (_trafficPanelState.view === 'sockets'
    && typeof getFilteredSocketTrafficLog === 'function') {
    return getFilteredSocketTrafficLog(log, vs.filters);
  }
  if (typeof getFilteredTrafficLog === 'function') {
    return getFilteredTrafficLog(log, vs.filters);
  }
  return log;
}

function _socketRowFlashClass(entry) {
  if (entry.event === 'Close' && entry.status === 'Abrupt') {
    return 'network-traffic-row--flash-dropped';
  }
  if (entry.event === 'Append' || entry.event === 'Consume' || entry.event === 'Connect') {
    return 'network-traffic-row--flash-received';
  }
  return 'network-traffic-row--flash-received';
}

function _packetRowFlashClass(entry) {
  return entry.status === 'Dropped'
    ? 'network-traffic-row--flash-dropped'
    : 'network-traffic-row--flash-received';
}

function _statusCellClass(entry, colKey) {
  if (colKey !== 'status') return '';
  if (_trafficPanelState.view === 'packets') {
    if (entry.status === 'Dropped') return 'network-traffic-status-dropped';
    if (entry.status === 'Received') return 'network-traffic-status-received';
    return '';
  }
  if (entry.status === 'Abrupt') return 'network-traffic-status-dropped';
  if (entry.status === 'Graceful' || entry.status === 'Connected') {
    return 'network-traffic-status-received';
  }
  return '';
}

function _expandPayloadLines(entry) {
  const payload = _trafficPanelState.view === 'packets' ? entry.packet : entry.bits;
  const size = entry.size || 0;
  if (_trafficPanelState.view === 'sockets'
    && typeof formatSocketTrafficLines === 'function') {
    return formatSocketTrafficLines(payload, size, _trafficFormatValue);
  }
  if (typeof formatPacketLines === 'function') {
    return formatPacketLines(payload, size, _trafficFormatValue);
  }
  return [payload || ''];
}

function _syncTableColgroup() {
  const table = document.getElementById('networkTrafficTable');
  if (!table) return;
  let colgroup = table.querySelector('colgroup');
  if (!colgroup) {
    colgroup = document.createElement('colgroup');
    table.insertBefore(colgroup, table.firstChild);
  }
  const cols = _currentColumns();
  colgroup.innerHTML = '';
  for (const col of cols) {
    const c = document.createElement('col');
    c.className = 'network-traffic-col-' + col.key;
    colgroup.appendChild(c);
  }
}

function renderNetworkTrafficPanel() {
  const panel = document.getElementById('networkTrafficPanel');
  if (!panel || panel.style.display === 'none') return;

  const vs = _currentViewState();
  const columns = _currentColumns();
  const tbody = document.getElementById('networkTrafficTableBody');
  const summary = document.getElementById('networkTrafficPagerSummary');
  const prevBtn = document.getElementById('networkTrafficPrev');
  const nextBtn = document.getElementById('networkTrafficNext');
  if (!tbody || !summary) return;

  _syncTableColgroup();

  const log = _getDisplayLog();
  const filtered = _filterLog(log);
  vs.pageIndex = _clampPageIndex(vs.pageIndex, filtered.length);
  const page = typeof getDisplayPage === 'function'
    ? getDisplayPage(filtered, vs.pageIndex)
    : { entries: [], total: 0, shown: 0, rowStart: 0, rowEnd: 0, pageIndex: 0 };

  if (typeof formatPagerSummary === 'function') {
    summary.textContent = formatPagerSummary(page);
  }

  if (prevBtn) prevBtn.disabled = page.pageIndex <= 0;
  if (nextBtn) {
    const pageSize = typeof NETWORK_TRAFFIC_PAGE_SIZE !== 'undefined' ? NETWORK_TRAFFIC_PAGE_SIZE : 5;
    const maxPage = page.total > 0 ? Math.ceil(page.total / pageSize) - 1 : 0;
    nextBtn.disabled = page.pageIndex >= maxPage;
  }

  _renderTrafficHeaders();
  _syncFilterBarControls();
  _updateViewButton();
  _updateLiveButton();

  const prevMaxId = vs.lastRenderedMaxId || 0;
  let logMaxId = prevMaxId;
  for (let i = 0; i < log.length; i++) {
    if (log[i].id > logMaxId) logMaxId = log[i].id;
  }

  const emptyMsg = _trafficPanelState.view === 'sockets'
    ? (log.length ? 'No matching socket traffic' : 'No socket traffic yet')
    : (log.length ? 'No matching traffic' : 'No network traffic yet');

  tbody.innerHTML = '';
  if (!page.total) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = columns.length;
    td.className = 'network-traffic-empty';
    td.textContent = emptyMsg;
    tr.appendChild(td);
    tbody.appendChild(tr);
    vs.lastRenderedMaxId = logMaxId;
    vs.suppressNewRowFlash = false;
    return;
  }

  for (const entry of page.entries) {
    const tr = document.createElement('tr');
    tr.className = 'network-traffic-row';
    if (vs.expandedId === entry.id) {
      tr.classList.add('network-traffic-row--selected');
    }
    if (entry.id > prevMaxId && !vs.suppressNewRowFlash) {
      tr.classList.add(_trafficPanelState.view === 'sockets'
        ? _socketRowFlashClass(entry)
        : _packetRowFlashClass(entry));
    }
    tr.dataset.trafficId = String(entry.id);

    for (const col of columns) {
      const td = document.createElement('td');
      const cell = _entryCellValue(entry, col.key);
      td.textContent = cell;
      td.className = 'network-traffic-col-' + col.key;
      if (col.key === 'channel' || col.key === 'sourceSock' || col.key === 'targetSock') td.title = cell;
      const statusCls = _statusCellClass(entry, col.key);
      if (statusCls) td.classList.add(statusCls);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);

    if (vs.expandedId === entry.id) {
      const payload = _trafficPanelState.view === 'packets' ? entry.packet : entry.bits;
      if (payload) {
        const expTr = document.createElement('tr');
        expTr.className = 'network-traffic-row-expanded';
        const expTd = document.createElement('td');
        expTd.colSpan = columns.length;
        const pre = document.createElement('pre');
        pre.className = 'network-traffic-packet';
        pre.textContent = _expandPayloadLines(entry).join('\n');
        expTd.appendChild(pre);
        expTr.appendChild(expTd);
        tbody.appendChild(expTr);
      }
    }
  }

  vs.lastRenderedMaxId = logMaxId;
  vs.suppressNewRowFlash = false;
}

function _renderTrafficHeaders() {
  const headRow = document.getElementById('networkTrafficHeaderRow');
  const vs = _currentViewState();
  const columns = _currentColumns();
  if (!headRow) return;
  headRow.innerHTML = '';
  for (const col of columns) {
    const th = document.createElement('th');
    th.className = 'network-traffic-col-' + col.key;
    th.textContent = col.label;
    if (col.filterable) {
      th.classList.add('network-traffic-th-filterable');
      th.dataset.filterCol = col.key;
      if ((vs.filters[col.key] || '').trim()) {
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
  const viewBtn = document.getElementById('networkTrafficViewBtn');
  const filterApply = document.getElementById('networkTrafficFilterApply');
  const filterClear = document.getElementById('networkTrafficFilterClear');
  const filterInput = document.getElementById('networkTrafficFilterInput');
  const filterSelect = document.getElementById('networkTrafficFilterSelect');
  const headRow = document.getElementById('networkTrafficHeaderRow');

  if (viewBtn) {
    viewBtn.addEventListener('click', cycleNetworkTrafficView);
  }

  if (headRow) {
    headRow.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-filter-col]');
      if (!th) return;
      const vs = _currentViewState();
      vs.activeFilterCol = th.dataset.filterCol;
      renderNetworkTrafficPanel();
      if (_isSelectFilterCol(vs.activeFilterCol)) {
        if (filterSelect) filterSelect.focus();
      } else if (filterInput) {
        filterInput.focus();
        filterInput.select();
      }
    });
  }

  if (filterApply) filterApply.addEventListener('click', _applyActiveFilter);
  if (filterClear) filterClear.addEventListener('click', _clearActiveFilter);

  if (filterInput) {
    filterInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        _applyActiveFilter();
      } else if (e.key === 'Escape') {
        _currentViewState().activeFilterCol = null;
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
        _currentViewState().activeFilterCol = null;
        renderNetworkTrafficPanel();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const vs = _currentViewState();
      if (vs.pageIndex > 0) {
        vs.pageIndex--;
        renderNetworkTrafficPanel();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      _currentViewState().pageIndex++;
      renderNetworkTrafficPanel();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const vs = _currentViewState();
      if (_trafficPanelState.view === 'sockets') {
        if (typeof clearNetworkSocketTrafficLog === 'function') {
          clearNetworkSocketTrafficLog();
        }
      } else if (typeof clearNetworkTrafficLog === 'function') {
        clearNetworkTrafficLog();
      }
      vs.pageIndex = 0;
      vs.expandedId = null;
      vs.pendingRefresh = false;
      vs.lastRenderedMaxId = 0;
      vs.suppressNewRowFlash = true;
      vs.pausedLogSnapshot = [];
      renderNetworkTrafficPanel();
      _updateLiveButton();
    });
  }

  if (liveBtn) {
    liveBtn.addEventListener('click', () => {
      const vs = _currentViewState();
      if (vs.live) {
        vs.live = false;
        vs.pausedLogSnapshot = _trafficPanelState.view === 'sockets'
          ? _snapshotSocketsLog()
          : _snapshotPacketsLog();
        _updateLiveButton();
        renderNetworkTrafficPanel();
        return;
      }
      vs.live = true;
      vs.pausedLogSnapshot = null;
      vs.pendingRefresh = false;
      _updateLiveButton();
      renderNetworkTrafficPanel();
    });
  }

  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr.network-traffic-row');
      if (!tr) return;
      const vs = _currentViewState();
      const id = parseInt(tr.dataset.trafficId, 10);
      vs.expandedId = vs.expandedId === id ? null : id;
      renderNetworkTrafficPanel();
    });
  }

  _updateViewButton();
  _updateLiveButton();
  renderNetworkTrafficPanel();
}

function toggleNetworkTraffic() {
  const panel = document.getElementById('networkTrafficPanel');
  if (!panel) return;
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    initNetworkTrafficPanel();
    _currentViewState().suppressNewRowFlash = true;
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
