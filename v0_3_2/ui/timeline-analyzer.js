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

  function TimelineAnalyzer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.baseRowHeight = ROW_HEIGHT;
    this.isPaused = false;
    this.scrollOffsetY = 0;
    this.channelCount = 0;
    this.channelLabels = [];
    this.rows = [];
    this.holdStates = [];
    this.timeMarkers = [];
    this.isDragging = false;
    this.dragStartY = 0;
    this._rafId = null;

    this._bindGestures();
    this._loop = this._loop.bind(this);
    this._rafId = requestAnimationFrame(this._loop);
  }

  TimelineAnalyzer.prototype._bindGestures = function () {
    const canvas = this.canvas;
    const self = this;

    canvas.addEventListener('mousedown', (e) => {
      self.isDragging = true;
      self.dragStartY = e.clientY;
      self.isPaused = true;
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

    canvas.addEventListener('touchstart', (e) => {
      self.isDragging = true;
      self.dragStartY = e.touches[0].clientY;
      self.isPaused = true;
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (!self.isDragging) return;
      const currentTouchY = e.touches[0].clientY;
      const deltaY = currentTouchY - self.dragStartY;
      self.dragStartY = currentTouchY;
      self.scrollOffsetY += deltaY;
      if (self.scrollOffsetY < 0) self.scrollOffsetY = 0;
      self.render();
    }, { passive: true });
    canvas.addEventListener('touchend', () => { self.isDragging = false; });
    canvas.addEventListener('touchcancel', () => { self.isDragging = false; });
  };

  TimelineAnalyzer.prototype._loop = function () {
    if (!this.isPaused) {
      this.render();
    }
    this._rafId = requestAnimationFrame(this._loop);
  };

  TimelineAnalyzer.prototype.destroy = function () {
    if (this._rafId) cancelAnimationFrame(this._rafId);
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
    this.timeMarkers = [];
    this.scrollOffsetY = 0;
    this.isPaused = false;
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
    const lanesWidth = canvas.width - 52;
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
      const targetY = currentY - this.baseRowHeight;

      if (currentY > 0 && targetY < canvas.height) {
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
    ctx.fillRect(lanesWidth, 0, 52, canvas.height);
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
    logicLevelFromValueStr,
    colorForLevel(level) { return COLORS[level] || COLORS[STATE_LOW]; }
  };
})();
