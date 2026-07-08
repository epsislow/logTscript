/**
 * Timeline analyzer — vertical logic trace (watch() samples).
 */
(function () {
  'use strict';

  const STATE_LOW = 0;
  const STATE_RISE = 1;
  const STATE_HIGH = 2;
  const STATE_FALL = 3;
  const STATE_Z = 4;
  const STATE_X = 5;

  const COLORS = {
    [STATE_LOW]: '#3d2020',
    [STATE_HIGH]: '#22c55e',
    [STATE_RISE]: '#22c55e',
    [STATE_FALL]: '#3d2020',
    [STATE_Z]: '#6b7280',
    [STATE_X]: '#dc2626'
  };

  const MAX_HISTORY = 1500;
  const ROW_HEIGHT = 8;
  const LABEL_BAND = 18;
  const GUTTER_WIDTH = 52;
  const TAP_MOVE_PX = 10;
  const VIEWPORT_PAD = 8;

  function steadyLevel(state) {
    if (state === STATE_Z || state === STATE_X) return state;
    return (state === STATE_RISE || state === STATE_HIGH) ? STATE_HIGH : STATE_LOW;
  }

  function logicLevelFromValueStr(valueStr, bitWidth) {
    if (typeof LogicValue !== 'undefined' && LogicValue.classifyWatchState) {
      return LogicValue.classifyWatchState(valueStr, bitWidth);
    }
    if (valueStr == null || valueStr === '-' || valueStr === '') return STATE_LOW;
    const s = String(valueStr);
    if (bitWidth === 1) {
      if (s === '1') return STATE_HIGH;
      if (s === 'Z') return STATE_Z;
      if (s === 'X') return STATE_X;
      return STATE_LOW;
    }
    if (/X/.test(s)) return STATE_X;
    if (/Z/.test(s)) return STATE_Z;
    return /1/.test(s) ? STATE_HIGH : STATE_LOW;
  }

  /** Map client (screen) coords to canvas backing-store coords. */
  function clientToCanvasCoords(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return { x: 0, y: 0, rect, scaleX: 1, scaleY: 1 };
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      rect,
      scaleX,
      scaleY,
    };
  }

  /** Canvas Y → client Y; lanes anchor X in client space. */
  function canvasPointToClient(canvas, canvasX, canvasY, rectOptional, scaleXOptional, scaleYOptional) {
    const rect = rectOptional || canvas.getBoundingClientRect();
    const scaleX = scaleXOptional != null ? scaleXOptional : (rect.width ? canvas.width / rect.width : 1);
    const scaleY = scaleYOptional != null ? scaleYOptional : (rect.height ? canvas.height / rect.height : 1);
    return {
      x: rect.left + canvasX / scaleX,
      y: rect.top + canvasY / scaleY,
    };
  }

  function rowIndexAtCanvasY(canvasY, canvasHeight, scrollOffsetY, rowCount, rowHeight, labelBand) {
    if (canvasY < labelBand) return -1;
    let currentY = canvasHeight + scrollOffsetY;
    for (let idx = 0; idx < rowCount; idx++) {
      const targetY = currentY - rowHeight;
      if (canvasY >= targetY && canvasY < currentY) return idx;
      currentY = targetY;
      if (currentY < -rowHeight) break;
    }
    return -1;
  }

  function rowBandCenterCanvasY(rowIndex, canvasHeight, scrollOffsetY, rowCount, rowHeight) {
    let currentY = canvasHeight + scrollOffsetY;
    for (let idx = 0; idx < rowCount; idx++) {
      const targetY = currentY - rowHeight;
      if (idx === rowIndex) return (targetY + currentY) / 2;
      currentY = targetY;
      if (currentY < -rowHeight) break;
    }
    return null;
  }

  function columnIndexAtCanvasX(canvasX, lanesWidth, colCount) {
    const cols = Math.max(colCount, 1);
    if (canvasX < 0 || canvasX >= lanesWidth) return -1;
    const columnWidth = lanesWidth / cols;
    return Math.min(cols - 1, Math.floor(canvasX / columnWidth));
  }

  /** Row center Y + client X (clamped to lanes) → client anchor for tooltip. */
  function anchorClientPosForRow(canvas, rowIndex, clientX, scrollOffsetY, rowCount, rowHeight) {
    const centerY = rowBandCenterCanvasY(
      rowIndex,
      canvas.height,
      scrollOffsetY,
      rowCount,
      rowHeight
    );
    if (centerY == null) return null;
    const cc = clientToCanvasCoords(canvas, clientX, 0);
    const lanesWidth = canvas.width - GUTTER_WIDTH;
    const canvasX = Math.max(0, Math.min(cc.x, lanesWidth));
    return canvasPointToClient(canvas, canvasX, centerY, cc.rect, cc.scaleX, cc.scaleY);
  }

  function placeTooltipNearAnchor(anchorClientX, anchorClientY, width, height) {
    const pad = 10;
    const maxW = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : anchorClientX + width + pad + VIEWPORT_PAD;
    let left = anchorClientX + pad;
    let top = anchorClientY - height / 2;
    if (left + width > maxW - VIEWPORT_PAD) {
      left = anchorClientX - width - pad;
    }
    return clampTooltipPosition(left, top, width, height);
  }

  function clampTooltipPosition(left, top, width, height) {
    const maxW = typeof window !== 'undefined' ? window.innerWidth : width + left + VIEWPORT_PAD;
    const maxH = typeof window !== 'undefined' ? window.innerHeight : height + top + VIEWPORT_PAD;
    let x = left;
    let y = top;
    if (x + width > maxW - VIEWPORT_PAD) x = maxW - VIEWPORT_PAD - width;
    if (y + height > maxH - VIEWPORT_PAD) y = maxH - VIEWPORT_PAD - height;
    if (x < VIEWPORT_PAD) x = VIEWPORT_PAD;
    if (y < VIEWPORT_PAD) y = VIEWPORT_PAD;
    return { left: x, top: y };
  }

  function TimelineAnalyzer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.baseRowHeight = ROW_HEIGHT;
    this.isPaused = false;
    this.scrollOffsetY = 0;
    this.channelCount = 0;
    this.channelLabels = [];
    this.rows = [];
    this.rowMetas = [];
    this.holdStates = [];
    this.timeMarkers = [];
    this.isDragging = false;
    this.dragStartY = 0;
    this._touchDragged = false;
    this._touchPinRow = false;
    this._pinnedRowIndex = -1;
    this._rafId = null;
    this._hoverRowIndex = -1;
    this._tooltipEl = null;

    this._ensureTooltip();
    this._bindGestures();
    this._loop = this._loop.bind(this);
    this._rafId = requestAnimationFrame(this._loop);
  }

  TimelineAnalyzer.prototype._ensureTooltip = function () {
    if (this._tooltipEl) return;
    const el = document.createElement('div');
    el.className = 'timeline-watch-tooltip';
    el.style.cssText = 'position:fixed;display:none;pointer-events:none;z-index:10050;'
      + 'max-width:min(420px,calc(100vw - 16px));padding:6px 8px;border-radius:4px;font:11px/1.35 monospace;'
      + 'color:#e2e8f0;background:#1e1e24;border:1px solid #3d3d46;white-space:pre-wrap;'
      + 'box-shadow:0 4px 12px rgba(0,0,0,0.45);';
    document.body.appendChild(el);
    this._tooltipEl = el;
  };

  TimelineAnalyzer.prototype._hideTooltip = function () {
    if (this._tooltipEl) this._tooltipEl.style.display = 'none';
    this._hoverRowIndex = -1;
    this._pinnedRowIndex = -1;
    this._touchPinRow = false;
  };

  TimelineAnalyzer.prototype._showTooltipAtAnchor = function (text, anchorClientX, anchorClientY) {
    if (!this._tooltipEl || !text) {
      this._hideTooltip();
      return;
    }
    this._tooltipEl.textContent = text;
    this._tooltipEl.style.display = 'block';
    const tipRect = this._tooltipEl.getBoundingClientRect();
    const placed = placeTooltipNearAnchor(anchorClientX, anchorClientY, tipRect.width, tipRect.height);
    this._tooltipEl.style.left = placed.left + 'px';
    this._tooltipEl.style.top = placed.top + 'px';
  };

  TimelineAnalyzer.prototype._rowIndexAtCanvasY = function (canvasY) {
    return rowIndexAtCanvasY(
      canvasY,
      this.canvas.height,
      this.scrollOffsetY,
      this.rows.length,
      this.baseRowHeight,
      LABEL_BAND
    );
  };

  TimelineAnalyzer.prototype._rowAnchorClientPos = function (rowIndex, clientX) {
    return anchorClientPosForRow(
      this.canvas,
      rowIndex,
      clientX,
      this.scrollOffsetY,
      this.rows.length,
      this.baseRowHeight
    );
  };

  TimelineAnalyzer.prototype._tooltipTextForRow = function (rowIndex) {
    const meta = this.rowMetas[rowIndex];
    if (!meta) return '';
    const lines = [];
    if (meta.seq != null) {
      const cyclePart = meta.cycle != null ? ` cycle ${meta.cycle}` : '';
      lines.push(`seq ${meta.seq}${cyclePart}`);
    }
    if (!meta.watchLevel || meta.watchLevel < 1) {
      return lines.length ? lines.join('\n') : '';
    }
    if (meta.watchReason) lines.push('— ' + meta.watchReason);
    const cause = meta.watchLevel >= 2
      ? (meta.causeLines || [])
      : (meta.causeDominant ? [meta.causeDominant] : (meta.causeLines || []).slice(0, 1));
    for (const c of cause) lines.push(String(c));
    return lines.join('\n');
  };

  TimelineAnalyzer.prototype._updateTooltipForClient = function (clientX, clientY, pin) {
    const cc = clientToCanvasCoords(this.canvas, clientX, clientY);
    const rowIndex = this._rowIndexAtCanvasY(cc.y);
    if (rowIndex < 0) {
      if (!pin) this._hideTooltip();
      return;
    }
    const text = this._tooltipTextForRow(rowIndex);
    if (!text) {
      if (!pin) this._hideTooltip();
      return;
    }
    const anchor = this._rowAnchorClientPos(rowIndex, clientX);
    if (!anchor) {
      if (!pin) this._hideTooltip();
      return;
    }
    this._hoverRowIndex = rowIndex;
    if (pin) {
      this._pinnedRowIndex = rowIndex;
      this._touchPinRow = true;
    }
    this._showTooltipAtAnchor(text, anchor.x, anchor.y);
  };

  TimelineAnalyzer.prototype._bindGestures = function () {
    const canvas = this.canvas;
    const self = this;

    canvas.addEventListener('mousedown', (e) => {
      self._touchPinRow = false;
      self._pinnedRowIndex = -1;
      self.isDragging = true;
      self._touchDragged = false;
      self.dragStartY = e.clientY;
      self.isPaused = true;
      self._hideTooltip();
    });
    window.addEventListener('mousemove', (e) => {
      if (!self.isDragging) return;
      const deltaY = e.clientY - self.dragStartY;
      self.dragStartY = e.clientY;
      self.scrollOffsetY += deltaY;
      if (self.scrollOffsetY < 0) self.scrollOffsetY = 0;
      self.render();
    });
    window.addEventListener('mouseup', () => { self.isDragging = false; });

    canvas.addEventListener('mousemove', (e) => {
      if (self.isDragging || self._touchPinRow) return;
      self._updateTooltipForClient(e.clientX, e.clientY, false);
    });
    canvas.addEventListener('mouseleave', () => {
      if (!self._touchPinRow) self._hideTooltip();
    });

    canvas.addEventListener('touchstart', (e) => {
      if (!e.touches.length) return;
      const t = e.touches[0];
      self._touchPinRow = false;
      self._pinnedRowIndex = -1;
      self.isDragging = true;
      self._touchDragged = false;
      self.dragStartY = t.clientY;
      self._touchStartX = t.clientX;
      self._touchStartY = t.clientY;
      self.isPaused = true;
      self._hideTooltip();
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!self.isDragging || !e.touches.length) return;
      const t = e.touches[0];
      const dx = t.clientX - (self._touchStartX || t.clientX);
      const dy = t.clientY - (self._touchStartY || t.clientY);
      if (Math.abs(dx) > TAP_MOVE_PX || Math.abs(dy) > TAP_MOVE_PX) {
        self._touchDragged = true;
        self._hideTooltip();
      }
      const deltaY = t.clientY - self.dragStartY;
      self.dragStartY = t.clientY;
      self.scrollOffsetY += deltaY;
      if (self.scrollOffsetY < 0) self.scrollOffsetY = 0;
      self.render();
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      self.isDragging = false;
      if (!self._touchDragged && e.changedTouches.length) {
        const t = e.changedTouches[0];
        self._updateTooltipForClient(t.clientX, t.clientY, true);
      }
      self._touchDragged = false;
    });
    canvas.addEventListener('touchcancel', () => {
      self.isDragging = false;
      self._touchDragged = false;
    });

    document.addEventListener('touchstart', (e) => {
      if (!self._touchPinRow || !self.canvas) return;
      if (e.target === self.canvas || self.canvas.contains(e.target)) return;
      self._hideTooltip();
    }, { passive: true });
  };

  TimelineAnalyzer.prototype._loop = function () {
    if (!this.isPaused) {
      this.render();
    }
    this._rafId = requestAnimationFrame(this._loop);
  };

  TimelineAnalyzer.prototype.destroy = function () {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._tooltipEl && this._tooltipEl.parentNode) {
      this._tooltipEl.parentNode.removeChild(this._tooltipEl);
    }
    this._tooltipEl = null;
  };

  TimelineAnalyzer.prototype.setPaused = function (paused) {
    this.isPaused = !!paused;
    if (!this.isPaused) this.resetScroll();
  };

  TimelineAnalyzer.prototype.resetScroll = function () {
    this.scrollOffsetY = 0;
    this.render();
  };

  TimelineAnalyzer.prototype.reset = function (channelLabels) {
    this.channelLabels = channelLabels || [];
    this.channelCount = this.channelLabels.length;
    this.holdStates = Array.from({ length: Math.max(this.channelCount, 1) }, () => ({
      level: STATE_LOW,
      seq: 0,
      cycle: 0,
      valueStr: '0'
    }));
    this.rows = [];
    this.rowMetas = [];
    this.timeMarkers = [];
    this.scrollOffsetY = 0;
    this.isPaused = false;
    this._hideTooltip();
    this.render();
  };

  TimelineAnalyzer.prototype.ingest = function (payload) {
    if (!payload) return;
    const seq = payload.seq != null ? payload.seq : 0;
    const cycle = payload.cycle != null ? payload.cycle : 0;
    const updates = payload.channels || [{
      channelIndex: payload.channelIndex,
      state: payload.state,
      valueStr: payload.valueStr
    }];

    const row = [];
    for (let i = 0; i < this.channelCount; i++) {
      row.push({
        level: this.holdStates[i].level,
        valueStr: this.holdStates[i].valueStr,
        seq: this.holdStates[i].seq,
        cycle: this.holdStates[i].cycle
      });
    }

    for (const ch of updates) {
      if (ch.channelIndex == null || ch.channelIndex < 0 || ch.channelIndex >= this.channelCount) continue;
      const level = steadyLevel(ch.state != null ? ch.state : logicLevelFromValueStr(ch.valueStr, 1));
      const prevLevel = this.holdStates[ch.channelIndex].level;
      this.holdStates[ch.channelIndex] = {
        level,
        seq,
        cycle,
        valueStr: ch.valueStr != null ? ch.valueStr : ''
      };
      row[ch.channelIndex] = {
        level,
        edge: prevLevel !== level,
        valueStr: ch.valueStr != null ? ch.valueStr : '',
        seq,
        cycle
      };
    }

    this.rows.unshift(row);
    if (this.rows.length > MAX_HISTORY) this.rows.pop();

    const PC = typeof LogTScriptProbeCause !== 'undefined' ? LogTScriptProbeCause : null;
    const hasReeval = PC && payload.causeLines && PC.hasReevalCause(payload.causeLines);
    this.rowMetas.unshift({
      seq,
      cycle,
      watchLevel: payload.watchLevel || 0,
      watchReason: payload.watchReason || null,
      causeLines: payload.causeLines ? payload.causeLines.slice() : null,
      causeDominant: payload.causeDominant || null,
      hasReeval: !!hasReeval,
    });
    if (this.rowMetas.length > MAX_HISTORY) this.rowMetas.pop();

    this.timeMarkers.unshift({
      isMarker: seq % 25 === 0,
      seq,
      cycle
    });
    if (this.timeMarkers.length > MAX_HISTORY) this.timeMarkers.pop();

    if (!this.isPaused) {
      this.render();
    }
  };

  TimelineAnalyzer.prototype._drawColumnHeader = function (ctx, cols, columnWidth, lanesWidth, canvasWidth) {
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, canvasWidth, LABEL_BAND);
    ctx.strokeStyle = '#3d3d46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, LABEL_BAND - 0.5);
    ctx.lineTo(lanesWidth, LABEL_BAND - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let col = 0; col < cols; col++) {
      if (!this.channelLabels[col]) continue;
      const xStart = col * columnWidth;
      ctx.fillText(this.channelLabels[col], xStart + columnWidth / 2, LABEL_BAND / 2);
    }
    ctx.textBaseline = 'alphabetic';
  };

  TimelineAnalyzer.prototype.render = function () {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cols = Math.max(this.channelCount, 1);
    const lanesWidth = canvas.width - GUTTER_WIDTH;
    const columnWidth = lanesWidth / cols;
    const rowCount = this.rows.length;
    if (!rowCount) {
      if (this.channelCount > 0) {
        this._drawColumnHeader(ctx, cols, columnWidth, lanesWidth, canvas.width);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Run script with watch() to capture signal history', canvas.width / 2, canvas.height / 2);
      }
      return;
    }

    let currentY = canvas.height + this.scrollOffsetY;

    for (let idx = 0; idx < rowCount; idx++) {
      if (currentY < -ROW_HEIGHT) break;

      const row = this.rows[idx];
      const rowMeta = this.rowMetas[idx];
      const targetY = currentY - this.baseRowHeight;

      if (currentY > 0 && targetY < canvas.height) {
        if (rowMeta && rowMeta.hasReeval && rowMeta.watchLevel >= 1) {
          const clipTop = LABEL_BAND;
          const drawTop = Math.max(targetY, clipTop);
          const drawBottom = Math.min(currentY, canvas.height);
          const drawH = drawBottom - drawTop;
          if (drawH > 0) {
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(0, drawTop, 2, drawH);
          }
        }

        const marker = this.timeMarkers[idx];
        if (marker && marker.isMarker) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, targetY);
          ctx.lineTo(lanesWidth, targetY);
          ctx.stroke();
          ctx.fillStyle = '#64748b';
          ctx.font = '9px monospace';
          ctx.textAlign = 'left';
          ctx.fillText('#' + marker.seq, lanesWidth + 6, targetY + 7);
        }

        for (let col = 0; col < cols; col++) {
          const node = row[col];
          if (!node) continue;

          const xStart = col * columnWidth;
          const lowWidth = columnWidth * 0.18;
          const highWidth = columnWidth * 0.72;
          const midWidth = columnWidth * 0.55;
          const lowX = xStart + (columnWidth - lowWidth) / 2;
          const highX = xStart + (columnWidth - highWidth) / 2;
          const midX = xStart + (columnWidth - midWidth) / 2;
          const isHigh = node.level === STATE_HIGH;
          const isZ = node.level === STATE_Z;
          const isX = node.level === STATE_X;
          let barX = lowX;
          let barW = lowWidth;
          if (isHigh) {
            barX = highX;
            barW = highWidth;
          } else if (isZ || isX) {
            barX = midX;
            barW = midWidth;
          }

          const clipTop = LABEL_BAND;
          const drawTop = Math.max(targetY, clipTop);
          const drawBottom = Math.min(currentY, canvas.height);
          const drawH = drawBottom - drawTop;
          if (drawH <= 0) continue;

          ctx.fillStyle = COLORS[node.level] || COLORS[STATE_LOW];
          ctx.fillRect(barX, drawTop, barW, drawH);

          if (node.edge && targetY >= clipTop) {
            ctx.strokeStyle = isX ? 'rgba(255,255,255,0.45)' : (isHigh ? 'rgba(255,255,255,0.55)' : (isZ ? 'rgba(200,200,200,0.35)' : 'rgba(168,85,247,0.7)'));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(barX, targetY);
            ctx.lineTo(barX + barW, targetY);
            ctx.stroke();
          }
        }
      }
      currentY = targetY;
    }

    ctx.strokeStyle = '#222227';
    ctx.lineWidth = 1;
    for (let col = 1; col < cols; col++) {
      ctx.beginPath();
      ctx.moveTo(col * columnWidth, LABEL_BAND);
      ctx.lineTo(col * columnWidth, canvas.height);
      ctx.stroke();
    }

    ctx.fillStyle = '#141416';
    ctx.fillRect(lanesWidth, 0, GUTTER_WIDTH, canvas.height);
    ctx.strokeStyle = '#2d2d34';
    ctx.beginPath();
    ctx.moveTo(lanesWidth, 0);
    ctx.lineTo(lanesWidth, canvas.height);
    ctx.stroke();

    this._drawColumnHeader(ctx, cols, columnWidth, lanesWidth, canvas.width);
  };

  window.TimelineAnalyzer = TimelineAnalyzer;
  window.TimelineLogic = {
    STATE_LOW,
    STATE_HIGH,
    STATE_Z,
    STATE_X,
    LABEL_BAND,
    ROW_HEIGHT,
    GUTTER_WIDTH,
    logicLevelFromValueStr,
    clientToCanvasCoords,
    canvasPointToClient,
    rowIndexAtCanvasY,
    rowBandCenterCanvasY,
    columnIndexAtCanvasX,
    anchorClientPosForRow,
    placeTooltipNearAnchor,
    clampTooltipPosition,
    colorForLevel(level) { return COLORS[level] || COLORS[STATE_LOW]; }
  };
})();
