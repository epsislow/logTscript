/**
 * Oscillator timing — shared by osc component and interpreter fallback.
 */
(function (global) {
  'use strict';

  function oscDelayMs(value, delayIsSec) {
    const v = typeof value === 'number' ? value : parseFloat(value);
    if (!(v > 0) || !isFinite(v)) {
      throw Error(`Oscillator delay must be positive (got ${value})`);
    }
    if (delayIsSec === 1) return v * 1000;
    const iv = Math.floor(v);
    if (iv < 1 || Math.abs(iv - v) > 1e-9) {
      throw Error(`Oscillator delay must be a positive integer when delayIsSec is 0 (got ${value})`);
    }
    return 1000 / iv;
  }

  function parseOscAttributes(attributes, compName) {
    const name = compName || 'osc';
    const afterSettle = !!attributes.afterSettle;
    const length = attributes.length !== undefined ? parseInt(attributes.length, 10) : 4;
    const eachCycle = attributes.eachCycle !== undefined ? parseInt(attributes.eachCycle, 10) : 1;

    if (length < 1) {
      throw Error(`Oscillator length must be positive for component ${name}`);
    }
    if (eachCycle !== 0 && eachCycle !== 1) {
      throw Error(`Oscillator eachCycle must be 0 (each state) or 1 (each cycle) for component ${name}`);
    }

    let highTime;
    let lowTime;

    if (afterSettle) {
      const delay0 = attributes.delay0 !== undefined ? parseFloat(attributes.delay0) : 4;
      const delay1 = attributes.delay1 !== undefined ? parseFloat(attributes.delay1) : 4;
      const delayIsSec = attributes.delayIsSec !== undefined ? parseInt(attributes.delayIsSec, 10) : 0;
      if (delayIsSec !== 0 && delayIsSec !== 1) {
        throw Error(`Oscillator delayIsSec must be 0 (sub-second inverse) or 1 (seconds) for component ${name}`);
      }
      lowTime = oscDelayMs(delay0, delayIsSec);
      highTime = oscDelayMs(delay1, delayIsSec);
    } else {
      const duration1 = attributes.duration1 !== undefined ? parseInt(attributes.duration1, 10) : 4;
      const duration0 = attributes.duration0 !== undefined ? parseInt(attributes.duration0, 10) : 4;
      const freq = attributes.freq !== undefined ? parseFloat(attributes.freq) : 1;
      const freqIsSec = attributes.freqIsSec !== undefined ? parseInt(attributes.freqIsSec, 10) : 0;

      if (duration1 < 1 || duration1 > 8) {
        throw Error(`Oscillator duration1 must be between 1 and 8 for component ${name}`);
      }
      if (duration0 < 1 || duration0 > 8) {
        throw Error(`Oscillator duration0 must be between 1 and 8 for component ${name}`);
      }
      if (freq <= 0) {
        throw Error(`Oscillator freq must be positive for component ${name}`);
      }
      if (freqIsSec !== 0 && freqIsSec !== 1) {
        throw Error(`Oscillator freqIsSec must be 0 (Hz) or 1 (seconds) for component ${name}`);
      }

      const period = freqIsSec === 1 ? freq * 1000 : 1000 / freq;
      highTime = period * duration1 / (duration1 + duration0);
      lowTime = period * duration0 / (duration1 + duration0);
    }

    return { afterSettle, highTime, lowTime, length, eachCycle };
  }

  function startOscLoop(ctx, compName, oscState, highTime, lowTime, eachCycle) {
    function incrementCounter() {
      const maxVal = (1 << oscState.length) - 1;
      let current = parseInt(oscState.counterValue, 2);
      current = (current + 1) > maxVal ? 0 : current + 1;
      oscState.counterValue = current.toString(2).padStart(oscState.length, '0');
    }

    function goHigh() {
      if (eachCycle === 0) incrementCounter();
      ctx.scheduleComponentOutputChange(compName, '1');
      const tid = setTimeout(goLow, highTime);
      ctx.oscTimers.push(tid);
    }

    function goLow() {
      incrementCounter();
      ctx.scheduleComponentOutputChange(compName, '0');
      const tid = setTimeout(goHigh, lowTime);
      ctx.oscTimers.push(tid);
    }

    const startTid = setTimeout(goHigh, lowTime);
    ctx.oscTimers.push(startTid);
  }

  const api = {
    oscDelayMs,
    parseOscAttributes,
    startOscLoop,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptOscTiming = api;
})(typeof window !== 'undefined' ? window : global);
