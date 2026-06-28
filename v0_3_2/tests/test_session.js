/**
 * Per-test isolated session: fresh registry + Interpreter per run().
 */
(function () {
  'use strict';

  function createSession(options = {}) {
    const propagation = options.propagation || 'legacy';
    const instanceId = options.instanceId != null ? options.instanceId : 1;
    const session = {
      propagation,
      instanceId,
      registry: null,
      signalPropagationStrategy: null,
      interp: null,
      out: [],
      aliases: null,

      _ensureSignalPropagationStrategy() {
        if (!this.signalPropagationStrategy) {
          this.signalPropagationStrategy = typeof createSignalPropagationStrategy === 'function'
            ? createSignalPropagationStrategy(this.propagation)
            : null;
        }
        return this.signalPropagationStrategy;
      },
      _ensureRegistry() {
        if (!this.registry) {
          this.registry = typeof createComponentRegistry === 'function'
            ? createComponentRegistry()
            : null;
        }
        return this.registry;
      },

      tokenize(src) {
        const processed = preprocessLoop(src);
        const t = new Tokenizer(processed);
        const tokens = [];
        let tok;
        while ((tok = t.get()).type !== 'EOF') tokens.push(tok);
        return { processed, tokens };
      },

      parse(src) {
        const processed = preprocessLoop(src);
        const registry = this._ensureRegistry();
        const p = new Parser(new Tokenizer(processed), registry);
        return p.parse();
      },

      run(src) {
        const processed = preprocessLoop(src);
        const registry = this._ensureRegistry();
        const signalPropagationStrategy = this._ensureSignalPropagationStrategy();
        const p = new Parser(new Tokenizer(processed), registry);
        const stmts = p.parse();
        this.out = [];
        this.interp = new Interpreter(p.funcs, this.out, p.pcbs, registry, signalPropagationStrategy, p.chips, p.boards);
        this.interp._instanceId = instanceId;
        if (typeof setDeviceOperationInstanceId === 'function') {
          setDeviceOperationInstanceId(instanceId);
        }
        this.interp.pendingProbeExprs = p.probes || [];
        this.interp.pendingWatchExprs = p.watches || [];
        this.interp.aliases = p.aliases;
        this.aliases = p.aliases;
        for (const s of stmts) {
          this.interp.exec(s);
        }
        this.interp.postExecSrc();

        if (this.interp.firstRun) {
          this.interp.firstRun = false;
          this.interp.vars.set('%', { type: '1bit', value: '0', ref: null });
        }
        return { out: this.out, interp: this.interp };
      },

      runDoc(src) {
        return this.run(src).out;
      },

      runArith(src) {
        return this.run(src).interp;
      },

      getWire(interp, name) {
        const i = interp || this.interp;
        if (!i) return null;
        const w = i.wires.get(name);
        if (!w) return null;
        return i.getValueFromRef(w.ref);
      },

      setWire(interp, name, val) {
        const i = interp || this.interp;
        if (!i) return;
        const w = i.wires.get(name);
        if (!w) return;
        if (i.deferWirePropagation()) {
          i.scheduleWireChange(name, val);
          if (i.signalPropagationStrategy) {
            i.signalPropagationStrategy.propagate();
          }
        } else {
          if (w.ref) i.setValueAtRef(w.ref, val);
          i.updateConnectedComponents(name, val);
        }
      },

      getComp(interp, name) {
        const i = interp || this.interp;
        if (!i) return null;
        const comp = i.components.get(name);
        if (!comp) return null;
        if (comp.ref && comp.ref !== '&-') return i.getValueFromRef(comp.ref);
        return comp.lastValue || null;
      },

      getCompProperty(interp, compName, property) {
        const i = interp || this.interp;
        if (!i || !i.componentRegistry) return null;
        const comp = i.components.get(compName);
        if (!comp) return null;
        const handler = i.componentRegistry.get(comp.type);
        if (!handler || !handler.evalGetProperty) return null;
        const result = handler.evalGetProperty(comp, property, { var: compName, property }, i);
        return result ? result.value : null;
      },

      triggerClcdTouch(interp, compName, opts) {
        const i = interp || this.interp;
        if (!i) return;
        const comp = i.components.get(compName);
        if (!comp || !comp.touchHandler) return;
        const phase = (opts && opts.phase) || 'press';
        const x = opts && opts.x !== undefined ? opts.x : 0;
        const y = opts && opts.y !== undefined ? opts.y : 0;
        if (phase === 'press' && typeof comp.touchHandler.onPress === 'function') {
          comp.touchHandler.onPress(x, y);
        } else if (phase === 'release' && typeof comp.touchHandler.onRelease === 'function') {
          comp.touchHandler.onRelease(x, y);
        }
      },

      triggerKeyPress(interp, compName, opts) {
        const i = interp || this.interp;
        if (!i) return;
        const comp = i.components.get(compName);
        if (!comp || !comp.keyHandler) return;
        const phase = (opts && opts.phase) || 'press';
        if (phase === 'press' && typeof comp.keyHandler.onPress === 'function') {
          comp.keyHandler.onPress();
        } else if (phase === 'release' && typeof comp.keyHandler.onRelease === 'function') {
          comp.keyHandler.onRelease();
        }
      },

      triggerKeyboardKey(interp, compName, opts) {
        const i = interp || this.interp;
        if (!i) return false;
        const comp = i.components.get(compName);
        if (!comp || !comp.keyboardHandler || typeof comp.keyboardHandler.onKey !== 'function') {
          return false;
        }
        const o = Object.assign({ force: true }, opts || {});
        if (o.charCode !== undefined && o.key === undefined) {
          return comp.keyboardHandler.onKey(o.charCode, o);
        }
        if (o.key !== undefined) {
          return comp.keyboardHandler.onKey(o.key, o);
        }
        return false;
      },

      setComp(interp, name, val) {
        const i = interp || this.interp;
        if (!i) return;
        i.scheduleComponentOutputChange(name, val);
      },

      execNext(interp, count = 1) {
        const i = interp || this.interp;
        if (!i) return;
        i.exec({ next: count });
        i.postExecNext();
      },

      getPcbPout(interp, instanceName, poutName) {
        const i = interp || this.interp;
        if (!i) return null;
        const inst = i.pcbInstances.get(instanceName) || i.chipInstances.get(instanceName) || i.boardInstances.get(instanceName);
        if (!inst) return null;
        const poutInfo = inst.poutStorage.get(poutName);
        if (!poutInfo) return null;
        return i.getValueFromRef(poutInfo.ref) || '0'.repeat(poutInfo.bits);
      },

      execStmts(interp, src) {
        const i = interp || this.interp;
        if (!i) return;
        const processed = preprocessLoop(src);
        const p = new Parser(new Tokenizer(processed), this._ensureRegistry());
        for (const s of p.parse()) {
          i.exec(s);
        }
      },

      /** Output lines from interpreter (same buffer the editor copies to ctx.out). */
      outLines(interp) {
        const i = interp || this.interp;
        return i && i.out ? i.out.slice() : [];
      },

      outIncludes(interp, needle) {
        const n = String(needle);
        return this.outLines(interp).some(line => String(line).includes(n));
      },

      /** Mirrors editor notify on network RX — re-read probes after external bus change. */
      refreshProbes(interp, reason) {
        const i = interp || this.interp;
        if (i && typeof i.refreshProbeOutputs === 'function') {
          i.refreshProbeOutputs({ reason: reason || 'changed' });
        }
      },

      cleanup() {
        if (this.interp && this.interp.oscTimers) {
          for (const tid of this.interp.oscTimers) {
            clearTimeout(tid);
          }
          this.interp.oscTimers = [];
        }
        if (typeof resetFallbackDeviceMapsForTests === 'function') {
          resetFallbackDeviceMapsForTests();
        }
        if (typeof _resetNetworkBusForTests === 'function') {
          _resetNetworkBusForTests();
        }
        if (typeof setDeviceOperationInstanceId === 'function') {
          setDeviceOperationInstanceId(null);
        }
        this.interp = null;
        this.out = [];
        this.registry = null;
        this.signalPropagationStrategy = null;
      }
    };
    return session;
  }

  window.LogTScriptSession = { createSession };
})();
