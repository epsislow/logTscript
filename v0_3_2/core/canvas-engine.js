/* ================= CANVAS ENGINE (draw builtins + execution) ================= */

const CANVAS_BUILTIN_SET = (typeof CANVAS_BUILTINS !== 'undefined')
  ? CANVAS_BUILTINS
  : new Set([
    'styleFill', 'styleStroke', 'style',
    'drawRect', 'drawCircle', 'drawLine', 'drawText',
    'textAlign', 'textBaseline', 'fontSize',
  ]);

function canvasIsTransparentColor(c) {
  return c === 0 || c === '0' || c === null || c === undefined;
}

function canvasToCssColor(c) {
  if (canvasIsTransparentColor(c)) return null;
  const s = String(c);
  if (s.length === 6) return `#${s}`;
  if (s.length === 8) {
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    const a = parseInt(s.slice(6, 8), 16) / 255;
    return `rgba(${r},${g},${b},${a})`;
  }
  return `#${s}`;
}

function canvasEvalExpr(expr, env, callMethodFn, line, pinEnv) {
  if (!expr) return 0;
  switch (expr.kind) {
    case 'number':
      return expr.value;
    case 'string':
      return expr.value;
    case 'wireRef': {
      if (!pinEnv || !Object.prototype.hasOwnProperty.call(pinEnv, expr.pinName)) {
        throw new Error(`canvas: undefined pin '${expr.pinName}'${line != null ? ` (line ${line})` : ''}`);
      }
      return pinEnv[expr.pinName];
    }
    case 'var': {
      if (!Object.prototype.hasOwnProperty.call(env, expr.name)) {
        throw new Error(`canvas: undefined variable '${expr.name}'${line != null ? ` (line ${line})` : ''}`);
      }
      return env[expr.name];
    }
    case 'unary': {
      const v = canvasEvalExpr(expr.expr, env, callMethodFn, line, pinEnv);
      return expr.op === '-' ? -v : v;
    }
    case 'binop': {
      const l = canvasEvalExpr(expr.left, env, callMethodFn, line, pinEnv);
      const r = canvasEvalExpr(expr.right, env, callMethodFn, line, pinEnv);
      switch (expr.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        default: throw new Error(`canvas: unknown operator '${expr.op}'`);
      }
    }
    case 'call':
      if (CANVAS_BUILTIN_SET.has(expr.name)) {
        throw new Error(`canvas: builtin '${expr.name}' cannot be used as expression`);
      }
      return callMethodFn(expr.name, expr.args, line);
    default:
      throw new Error(`canvas: invalid expression node`);
  }
}

function createCanvasDrawState() {
  return {
    fillColor: 'ffffff',
    strokeColor: '000000',
    strokeWidth: 1,
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  };
}

function canvasApplyFont(ctx, state) {
  ctx.font = `${state.fontSize}px ${state.fontFamily}`;
  ctx.textAlign = state.textAlign;
  ctx.textBaseline = state.textBaseline;
}

function canvasRunBuiltin(name, args, state, ctx, evalArg, line) {
  const nargs = (args || []).map((a) => evalArg(a));
  switch (name) {
    case 'styleFill': {
      if (nargs.length !== 1) throw new Error(`canvas: styleFill expects 1 arg (line ${line})`);
      state.fillColor = canvasIsTransparentColor(nargs[0]) ? 0 : String(nargs[0]);
      return;
    }
    case 'styleStroke': {
      if (nargs.length < 1 || nargs.length > 2) {
        throw new Error(`canvas: styleStroke expects 1 or 2 args (line ${line})`);
      }
      state.strokeColor = canvasIsTransparentColor(nargs[0]) ? 0 : String(nargs[0]);
      if (nargs.length === 2) state.strokeWidth = Number(nargs[1]);
      return;
    }
    case 'style': {
      if (nargs.length < 2 || nargs.length > 3) {
        throw new Error(`canvas: style expects 2 or 3 args (line ${line})`);
      }
      state.strokeColor = canvasIsTransparentColor(nargs[0]) ? 0 : String(nargs[0]);
      state.fillColor = canvasIsTransparentColor(nargs[1]) ? 0 : String(nargs[1]);
      if (nargs.length === 3) state.strokeWidth = Number(nargs[2]);
      return;
    }
    case 'fontSize': {
      if (nargs.length !== 1) throw new Error(`canvas: fontSize expects 1 arg (line ${line})`);
      state.fontSize = Number(nargs[0]);
      return;
    }
    case 'textAlign': {
      if (nargs.length !== 1) throw new Error(`canvas: textAlign expects 1 arg (line ${line})`);
      const v = String(nargs[0]);
      if (v !== 'left' && v !== 'center' && v !== 'right') {
        throw new Error(`canvas: textAlign must be left|center|right (line ${line})`);
      }
      state.textAlign = v;
      return;
    }
    case 'textBaseline': {
      if (nargs.length !== 1) throw new Error(`canvas: textBaseline expects 1 arg (line ${line})`);
      const v = String(nargs[0]);
      if (v !== 'top' && v !== 'middle' && v !== 'alphabetic' && v !== 'bottom') {
        throw new Error(`canvas: textBaseline must be top|middle|alphabetic|bottom (line ${line})`);
      }
      state.textBaseline = v;
      return;
    }
    case 'drawRect': {
      if (nargs.length < 4 || nargs.length > 6) {
        throw new Error(`canvas: drawRect expects 4–6 args (line ${line})`);
      }
      const x = Number(nargs[0]);
      const y = Number(nargs[1]);
      const w = Number(nargs[2]);
      const h = Number(nargs[3]);
      const fill = nargs.length >= 5 ? nargs[4] : state.fillColor;
      const stroke = nargs.length >= 6 ? nargs[5] : state.strokeColor;
      const sw = state.strokeWidth;
      if (!canvasIsTransparentColor(fill)) {
        const css = canvasToCssColor(fill);
        if (css) {
          ctx.fillStyle = css;
          ctx.fillRect(x, y, w, h);
        }
      }
      if (!canvasIsTransparentColor(stroke)) {
        const css = canvasToCssColor(stroke);
        if (css) {
          ctx.strokeStyle = css;
          ctx.lineWidth = sw;
          ctx.strokeRect(x, y, w, h);
        }
      }
      return;
    }
    case 'drawCircle': {
      if (nargs.length < 3 || nargs.length > 5) {
        throw new Error(`canvas: drawCircle expects 3–5 args (line ${line})`);
      }
      const cx = Number(nargs[0]);
      const cy = Number(nargs[1]);
      const r = Number(nargs[2]);
      const fill = nargs.length >= 4 ? nargs[3] : state.fillColor;
      const stroke = nargs.length >= 5 ? nargs[4] : state.strokeColor;
      const sw = state.strokeWidth;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (!canvasIsTransparentColor(fill)) {
        const css = canvasToCssColor(fill);
        if (css) {
          ctx.fillStyle = css;
          ctx.fill();
        }
      }
      if (!canvasIsTransparentColor(stroke)) {
        const css = canvasToCssColor(stroke);
        if (css) {
          ctx.strokeStyle = css;
          ctx.lineWidth = sw;
          ctx.stroke();
        }
      }
      return;
    }
    case 'drawLine': {
      if (nargs.length !== 4) throw new Error(`canvas: drawLine expects 4 args (line ${line})`);
      const stroke = state.strokeColor;
      if (canvasIsTransparentColor(stroke)) return;
      const css = canvasToCssColor(stroke);
      if (!css) return;
      ctx.strokeStyle = css;
      ctx.lineWidth = state.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(Number(nargs[0]), Number(nargs[1]));
      ctx.lineTo(Number(nargs[2]), Number(nargs[3]));
      ctx.stroke();
      return;
    }
    case 'drawText': {
      if (nargs.length !== 3) throw new Error(`canvas: drawText expects 3 args (line ${line})`);
      const fill = state.fillColor;
      if (canvasIsTransparentColor(fill)) return;
      const css = canvasToCssColor(fill);
      if (!css) return;
      canvasApplyFont(ctx, state);
      ctx.fillStyle = css;
      ctx.fillText(String(nargs[2]), Number(nargs[0]), Number(nargs[1]));
      return;
    }
    default:
      throw new Error(`canvas: unknown builtin '${name}' (line ${line})`);
  }
}

function canvasExecuteMethod(method, argValues, program, state, ctx, options) {
  const env = {};
  for (let i = 0; i < method.params.length; i++) {
    env[method.params[i]] = argValues[i];
  }
  const locals = new Set(method.params);

  const callMethodFn = (name, args, line) => {
    const m = program.methods[name];
    if (!m) throw new Error(`canvas: unknown method '${name}'${line != null ? ` (line ${line})` : ''}`);
    const vals = (args || []).map((a) => canvasEvalExpr(a, env, callMethodFn, line));
    return canvasExecuteMethod(m, vals, program, state, ctx, options);
  };

  const evalArg = (a) => canvasEvalExpr(a, env, callMethodFn, null);

  for (const stmt of method.body) {
    try {
      if (stmt.kind === 'assign') {
        env[stmt.name] = canvasEvalExpr(stmt.expr, env, callMethodFn, stmt.line);
        locals.add(stmt.name);
      } else if (stmt.kind === 'call') {
        if (CANVAS_BUILTIN_SET.has(stmt.name)) {
          canvasRunBuiltin(stmt.name, stmt.args, state, ctx, evalArg, stmt.line);
        } else {
          const vals = (stmt.args || []).map((a) => evalArg(a));
          const m = program.methods[stmt.name];
          if (!m) throw new Error(`canvas: unknown method '${stmt.name}' (line ${stmt.line})`);
          canvasExecuteMethod(m, vals, program, state, ctx, options);
        }
      }
    } catch (err) {
      if (options && options.logErrors) {
        const msg = err && err.message ? err.message : String(err);
        if (typeof console !== 'undefined' && console.warn) console.warn(msg);
      }
      if (!(options && options.skipOnError)) throw err;
    }
  }
  return 0;
}

function executeCanvasRenderer(program, calls, ctx, options) {
  const state = createCanvasDrawState();
  const pinEnv = (options && options.pinEnv) || {};
  const callMethodFn = (name, args, line) => {
    const m = program.methods[name];
    if (!m) throw new Error(`canvas: unknown method '${name}'${line != null ? ` (line ${line})` : ''}`);
    const vals = (args || []).map((a) => canvasEvalExpr(a, {}, callMethodFn, line, pinEnv));
    return canvasExecuteMethod(m, vals, program, state, ctx, options);
  };
  const evalArg = (a) => canvasEvalExpr(a, {}, callMethodFn, null, pinEnv);

  for (const stmt of calls || []) {
    if (!stmt || stmt.kind !== 'call') continue;
    try {
      if (CANVAS_BUILTIN_SET.has(stmt.name)) {
        canvasRunBuiltin(stmt.name, stmt.args, state, ctx, evalArg, stmt.line);
      } else {
        const m = program.methods[stmt.name];
        if (!m) throw new Error(`canvas: unknown method '${stmt.name}' (line ${stmt.line})`);
        const vals = (stmt.args || []).map((a) => evalArg(a));
        canvasExecuteMethod(m, vals, program, state, ctx, options);
      }
    } catch (err) {
      if (options && options.logErrors) {
        const msg = err && err.message ? err.message : String(err);
        if (typeof console !== 'undefined' && console.warn) console.warn(msg);
      }
      if (!(options && options.skipOnError)) throw err;
    }
  }
  return state;
}

function createCanvasMockCtx() {
  const calls = [];
  const ctx = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '14px monospace',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillRect(x, y, w, h) { calls.push({ op: 'fillRect', x, y, w, h, fillStyle: this.fillStyle }); },
    strokeRect(x, y, w, h) { calls.push({ op: 'strokeRect', x, y, w, h, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth }); },
    beginPath() { calls.push({ op: 'beginPath' }); },
    arc(cx, cy, r, sa, ea) { calls.push({ op: 'arc', cx, cy, r, sa, ea }); },
    fill() { calls.push({ op: 'fill', fillStyle: this.fillStyle }); },
    stroke() { calls.push({ op: 'stroke', strokeStyle: this.strokeStyle, lineWidth: this.lineWidth }); },
    moveTo(x, y) { calls.push({ op: 'moveTo', x, y }); },
    lineTo(x, y) { calls.push({ op: 'lineTo', x, y }); },
    fillText(text, x, y) { calls.push({ op: 'fillText', text, x, y, font: this.font, fillStyle: this.fillStyle }); },
  };
  return { ctx, calls, getCalls() { return calls.slice(); }, clearCalls() { calls.length = 0; } };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    canvasIsTransparentColor,
    canvasToCssColor,
    canvasEvalExpr,
    createCanvasDrawState,
    canvasExecuteMethod,
    executeCanvasRenderer,
    createCanvasMockCtx,
    canvasRunBuiltin,
  };
}
