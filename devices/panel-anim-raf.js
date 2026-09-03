/* ================= Shared panel animation rAF + canvas glow ================= */

const PanelAnimRaf = (function () {
  const items = new Map();
  let rafId = null;

  function loop(now) {
    rafId = null;
    const finished = [];
    items.forEach((tick, id) => {
      try {
        if (tick(now) === false) finished.push(id);
      } catch (_) {
        finished.push(id);
      }
    });
    for (let i = 0; i < finished.length; i++) items.delete(finished[i]);
    if (items.size > 0) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function start(id, tickFn) {
    if (!id || typeof tickFn !== 'function') return;
    items.set(id, tickFn);
    if (rafId == null && typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(loop);
    }
  }

  function stop(id) {
    items.delete(id);
    if (items.size === 0 && rafId != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function isRunning(id) {
    return items.has(id);
  }

  /** Match character-lcd / panel-key / rotary-knob: shadowBlur then reset. */
  function withGlow(ctx, color, blur, drawFn) {
    if (!ctx || typeof drawFn !== 'function') return;
    ctx.save();
    ctx.shadowColor = color || '#6dff9c';
    ctx.shadowBlur = blur != null ? blur : 10;
    drawFn();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function easeOutCubic(t) {
    const u = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - u, 3);
  }

  return { start, stop, isRunning, withGlow, easeOutCubic };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PanelAnimRaf;
}
