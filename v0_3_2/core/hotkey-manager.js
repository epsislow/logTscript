/**
 * HotkeyManager — per-RUN registry for `hotkey` / `focuskey` on panel components.
 */
(function () {
  'use strict';

  function isEscapeKey(key) {
    return String(key) === 'Escape';
  }

  function assertQuotedString(value, compName, attrName) {
    if (typeof value !== 'string') {
      throw Error(`${attrName} must be a quoted string on ${compName}`);
    }
  }

  function formatKeyInUseError(key, compType, compName) {
    return `This key "${key}" is already used by comp [${compType}] ${compName}`;
  }

  function formatHoldInUseError(key, compType, compName) {
    return `This key "${key}" is already used with hold type by comp [${compType}] ${compName} (has type 1)`;
  }

  function matchHotkey(stored, event) {
    const k = String(stored);
    const evKey = event && event.key != null ? String(event.key) : '';
    const evCode = event && event.code != null ? String(event.code) : '';

    if (/^[0-9]$/.test(k)) {
      return evCode === ('Digit' + k) || (evKey === k && /^Digit/.test(evCode));
    }
    if (/^[a-zA-Z]$/.test(k)) {
      return evKey.toLowerCase() === k.toLowerCase();
    }
    const fnMatch = /^[fF](\d+)$/.exec(k);
    if (fnMatch) {
      const fn = 'F' + fnMatch[1];
      return evKey === fn || evKey.toLowerCase() === fn.toLowerCase();
    }
    return evKey === k;
  }

  function defaultCodeForKey(key) {
    const k = String(key);
    if (/^[0-9]$/.test(k)) return 'Digit' + k;
    if (/^[a-zA-Z]$/.test(k)) return 'Key' + k.toUpperCase();
    const fnMatch = /^[fF](\d+)$/.exec(k);
    if (fnMatch) return 'F' + fnMatch[1];
    return k;
  }

  function makeKeyEvent(opts) {
    const key = opts && opts.key != null ? String(opts.key) : '';
    return {
      key,
      code: (opts && opts.code) || defaultCodeForKey(key),
      repeat: !!(opts && opts.repeat),
      preventDefault: () => {},
      stopPropagation: () => {},
    };
  }

  function getPanelKey(keyId, ctx) {
    const maps = typeof getDeviceMapsForInterp === 'function'
      ? getDeviceMapsForInterp(ctx)
      : null;
    const panelKeys = maps ? maps.panelKeys : (typeof window !== 'undefined' ? window.panelKeys : null);
    if (!panelKeys) return null;
    return panelKeys.get(keyId) || null;
  }

  class HotkeyManager {
    constructor(interp) {
      this.interp = interp;
      this.actionBindings = [];
      this.focusBindings = new Map();
      this.keyOwners = new Map();
      this.type1HoldByHotkey = new Map();
      this.devicesPanelFocused = false;
      this.activeHold = null;
      this._boundDocKeyDown = null;
      this._boundDocKeyUp = null;
      this._boundDevicesPointerDown = null;
      this._boundEditorPointerDown = null;
    }

    clear() {
      this.actionBindings = [];
      this.focusBindings.clear();
      this.keyOwners.clear();
      this.type1HoldByHotkey.clear();
      this.devicesPanelFocused = false;
      this.activeHold = null;
      this.detachBrowserListeners();
    }

    _trackKey(key, compType, compName, kind) {
      const prev = this.keyOwners.get(key);
      if (prev) {
        if (prev.kind === 'focus' || kind === 'focus') {
          throw Error(formatKeyInUseError(key, prev.compType, prev.compName));
        }
      }
      this.keyOwners.set(key, { compType, compName, kind });
    }

    registerAction(binding) {
      const {
        hotkey, compName, compType, keyType, dipIndex, invokeDown, invokeUp,
      } = binding;
      assertQuotedString(hotkey, compName, 'hotkey');
      if (isEscapeKey(hotkey)) {
        throw Error(`"${hotkey}" is reserved for built-in focus navigation (not allowed as hotkey on ${compName})`);
      }

      const prevOwner = this.keyOwners.get(hotkey);
      if (prevOwner && prevOwner.kind === 'focus') {
        throw Error(formatKeyInUseError(hotkey, prevOwner.compType, prevOwner.compName));
      }

      const kt = keyType != null ? parseInt(keyType, 10) : 0;
      if (kt === 1) {
        const prevHold = this.type1HoldByHotkey.get(hotkey);
        if (prevHold) {
          throw Error(formatHoldInUseError(hotkey, prevHold.compType, prevHold.compName));
        }
        this.type1HoldByHotkey.set(hotkey, { compType, compName });
      }

      if (!prevOwner) {
        this.keyOwners.set(hotkey, { compType, compName, kind: 'action' });
      }

      this.actionBindings.push({
        hotkey,
        compName,
        compType,
        keyType: kt,
        dipIndex,
        invokeDown,
        invokeUp,
      });
    }

    registerFocus(binding) {
      const { hotkey, compName, compType, toggleFocus } = binding;
      assertQuotedString(hotkey, compName, 'focuskey');
      if (isEscapeKey(hotkey)) {
        throw Error(`"${hotkey}" is reserved for built-in focus navigation (not allowed as focuskey on ${compName})`);
      }

      const prevOwner = this.keyOwners.get(hotkey);
      if (prevOwner) {
        throw Error(formatKeyInUseError(hotkey, prevOwner.compType, prevOwner.compName));
      }

      this.keyOwners.set(hotkey, { compType, compName, kind: 'focus' });
      this.focusBindings.set(hotkey, { compName, compType, toggleFocus });
    }

    setDevicesPanelFocused(on) {
      this.devicesPanelFocused = !!on;
      this._syncDevicesFocusUi();
    }

    _syncDevicesFocusUi() {
      if (typeof document === 'undefined') return;
      const panel = document.getElementById('devicesPanel');
      if (!panel) return;
      panel.classList.toggle('devices-hotkey-focus', this.devicesPanelFocused);
    }

    _hasWidgetFocus() {
      if (typeof window === 'undefined') return false;
      return !!(window.focusedKeyboardId || window.focusedScannerId);
    }

    _findFocusBinding(event) {
      for (const [hotkey, binding] of this.focusBindings) {
        if (matchHotkey(hotkey, event)) return binding;
      }
      return null;
    }

    _shouldHandleFocusKey() {
      if (this._hasWidgetFocus()) return true;
      return this.devicesPanelFocused;
    }

    _unfocusActiveWidget() {
      if (typeof window === 'undefined') return;
      const kbId = window.focusedKeyboardId;
      if (kbId && this.interp && this.interp.components) {
        for (const comp of this.interp.components.values()) {
          if (comp.type === 'keyboard' && comp.deviceIds && comp.deviceIds[0] === kbId && comp.focusHandler) {
            comp.focusHandler.unfocus();
            return;
          }
        }
      }
      const scId = window.focusedScannerId;
      if (scId && this.interp && this.interp.components) {
        for (const comp of this.interp.components.values()) {
          if (comp.type === 'scanner' && comp.deviceIds && comp.deviceIds[0] === scId && comp.focusHandler) {
            comp.focusHandler.unfocus();
            return;
          }
        }
      }
    }

    _handleEscape() {
      if (this._hasWidgetFocus()) {
        this._unfocusActiveWidget();
        return true;
      }
      if (this.devicesPanelFocused) {
        this.setDevicesPanelFocused(false);
        return true;
      }
      return false;
    }

    dispatchKeyDown(event) {
      if (!event || event.repeat) return false;

      if (event.key === 'Escape') {
        const handled = this._handleEscape();
        if (handled && typeof event.preventDefault === 'function') event.preventDefault();
        return handled;
      }

      const focusBinding = this._findFocusBinding(event);
      if (focusBinding && this._shouldHandleFocusKey()) {
        focusBinding.toggleFocus();
        if (typeof event.preventDefault === 'function') event.preventDefault();
        return true;
      }

      if (!this.devicesPanelFocused || this._hasWidgetFocus()) return false;
      return this._dispatchActionHotkey(event);
    }

    dispatchKeyUp(event) {
      if (!this.activeHold) return false;
      if (!matchHotkey(this.activeHold.hotkey, event)) return false;
      if (typeof this.activeHold.invokeUp === 'function') {
        this.activeHold.invokeUp();
      }
      this.activeHold = null;
      if (typeof event.preventDefault === 'function') event.preventDefault();
      return true;
    }

    _dispatchActionHotkey(event) {
      const matching = [];
      for (const b of this.actionBindings) {
        if (matchHotkey(b.hotkey, event)) matching.push(b);
      }
      if (!matching.length) return false;

      for (const b of matching) {
        if (b.keyType !== 1 && typeof b.invokeDown === 'function') {
          b.invokeDown();
        }
      }
      const hold = matching.find(b => b.keyType === 1);
      if (hold && typeof hold.invokeDown === 'function') {
        hold.invokeDown();
        this.activeHold = hold;
      }

      if (typeof event.preventDefault === 'function') event.preventDefault();
      return true;
    }

    dispatchFromTest(opts, phase) {
      const event = makeKeyEvent(opts || {});
      if (phase === 'up') return this.dispatchKeyUp(event);
      return this.dispatchKeyDown(event);
    }

    attachBrowserListeners() {
      if (typeof document === 'undefined' || this._boundDocKeyDown) return;

      this._boundDocKeyDown = (e) => {
        if (!this.interp || this.interp._simulationStopped) return;
        this.dispatchKeyDown(e);
      };
      this._boundDocKeyUp = (e) => {
        if (!this.interp || this.interp._simulationStopped) return;
        this.dispatchKeyUp(e);
      };
      this._boundDevicesPointerDown = (e) => {
        const panel = document.getElementById('devicesPanel');
        if (panel && panel.contains(e.target)) {
          this.setDevicesPanelFocused(true);
        }
      };
      this._boundEditorPointerDown = (e) => {
        const codeEl = document.getElementById('code');
        const devicesPanel = document.getElementById('devicesPanel');
        if (codeEl && codeEl.contains(e.target)) {
          this.setDevicesPanelFocused(false);
        } else if (devicesPanel && !devicesPanel.contains(e.target)) {
          this.setDevicesPanelFocused(false);
        }
      };

      document.addEventListener('keydown', this._boundDocKeyDown, true);
      document.addEventListener('keyup', this._boundDocKeyUp, true);
      document.addEventListener('mousedown', this._boundDevicesPointerDown, true);
      document.addEventListener('mousedown', this._boundEditorPointerDown, true);
    }

    detachBrowserListeners() {
      if (typeof document === 'undefined' || !this._boundDocKeyDown) return;
      document.removeEventListener('keydown', this._boundDocKeyDown, true);
      document.removeEventListener('keyup', this._boundDocKeyUp, true);
      document.removeEventListener('mousedown', this._boundDevicesPointerDown, true);
      document.removeEventListener('mousedown', this._boundEditorPointerDown, true);
      this._boundDocKeyDown = null;
      this._boundDocKeyUp = null;
      this._boundDevicesPointerDown = null;
      this._boundEditorPointerDown = null;
      this._syncDevicesFocusUi();
    }
  }

  function registerKeyHotkey(ctx, compName, keyId, keyType, hotkey, keyHandler) {
    const mgr = ctx.getHotkeyManager && ctx.getHotkeyManager();
    if (!mgr || hotkey === undefined || hotkey === null || hotkey === '') return;

    const kt = keyType != null ? parseInt(keyType, 10) : 0;
    const invokeDown = () => {
      const pk = getPanelKey(keyId, ctx);
      if (pk && typeof pk.press === 'function' && kt !== 2) {
        pk.press();
        if (kt === 0 && typeof pk.release === 'function') {
          pk.release();
        }
        return;
      }
      if (keyHandler && typeof keyHandler.onPress === 'function') {
        keyHandler.onPress();
      }
      if (kt === 0 && keyHandler && typeof keyHandler.onRelease === 'function') {
        keyHandler.onRelease();
      }
    };
    const invokeUp = () => {
      const pk = getPanelKey(keyId, ctx);
      if (pk && typeof pk.release === 'function') {
        pk.release();
        return;
      }
      if (keyHandler && typeof keyHandler.onRelease === 'function') {
        keyHandler.onRelease();
      }
    };

    mgr.registerAction({
      hotkey,
      compName,
      compType: 'key',
      keyType: kt,
      invokeDown,
      invokeUp: kt === 1 ? invokeUp : null,
    });
  }

  function registerSwitchHotkey(ctx, compName, switchId, hotkey, switchHandler) {
    const mgr = ctx.getHotkeyManager && ctx.getHotkeyManager();
    if (!mgr || hotkey === undefined || hotkey === null || hotkey === '') return;
    mgr.registerAction({
      hotkey,
      compName,
      compType: 'switch',
      keyType: 0,
      invokeDown: () => {
        if (switchHandler && typeof switchHandler.toggle === 'function') {
          switchHandler.toggle();
        }
      },
    });
  }

  function registerDipHotkeys(ctx, compName, dipId, count, attributes, dipHandler) {
    const mgr = ctx.getHotkeyManager && ctx.getHotkeyManager();
    if (!mgr || !attributes) return;
    const hotkeyFor = attributes.hotkeyFor || {};
    const seen = new Set();
    for (const idxStr of Object.keys(hotkeyFor)) {
      const index = parseInt(idxStr, 10);
      if (isNaN(index)) continue;
      if (seen.has(index)) {
        throw Error(`Duplicate hotkeyFor.${index} on ${compName}`);
      }
      seen.add(index);
      if (index < 0 || index >= count) {
        throw Error(`hotkeyFor.${index} out of range (length ${count}) on ${compName}`);
      }
      const hotkey = hotkeyFor[idxStr];
      mgr.registerAction({
        hotkey,
        compName,
        compType: 'dip',
        keyType: 0,
        dipIndex: index,
        invokeDown: () => {
          if (dipHandler && typeof dipHandler.toggleBit === 'function') {
            dipHandler.toggleBit(index);
          }
        },
      });
    }
  }

  function registerKeyboardFocusKey(ctx, compName, keyboardId, focuskey, focusHandler) {
    const mgr = ctx.getHotkeyManager && ctx.getHotkeyManager();
    if (!mgr || focuskey === undefined || focuskey === null || focuskey === '') return;
    mgr.registerFocus({
      hotkey: focuskey,
      compName,
      compType: 'keyboard',
      toggleFocus: () => {
        if (focusHandler && typeof focusHandler.toggleFocus === 'function') {
          focusHandler.toggleFocus();
        }
      },
    });
  }

  function touchTypeToKeyType(touchType) {
    const tt = touchType != null ? parseInt(touchType, 10) : 1;
    if (tt === 1) return 1;
    if (tt === 2) return 0;
    if (tt === 3) return 2;
    return 0;
  }

  function registerClcdHotkeys(ctx, compName, symbols, touchHandler, touchEnabled) {
    const mgr = ctx.getHotkeyManager && ctx.getHotkeyManager();
    if (!mgr) return;
    const list = symbols || [];
    if (!touchEnabled) {
      for (const sym of list) {
        if (sym && sym.hotkey) {
          throw Error(`hotkey on CLCD symbol requires touch: 1 on ${compName}`);
        }
      }
      return;
    }
    for (const sym of list) {
      if (!sym || !sym.hotkey) continue;
      if (sym.bitOut === undefined) {
        throw Error(`hotkey on CLCD symbol requires bitOut on ${compName}`);
      }
      const tt = sym.touchType || 1;
      const keyType = touchTypeToKeyType(tt);
      const bitOut = sym.bitOut;
      const invokeDown = () => {
        if (touchHandler && typeof touchHandler.invokeHotkey === 'function') {
          touchHandler.invokeHotkey(bitOut, 'press');
        }
      };
      const invokeUp = () => {
        if (touchHandler && typeof touchHandler.invokeHotkey === 'function') {
          touchHandler.invokeHotkey(bitOut, 'release');
        }
      };
      mgr.registerAction({
        hotkey: sym.hotkey,
        compName,
        compType: 'clcd',
        keyType,
        dipIndex: bitOut,
        invokeDown,
        invokeUp: keyType === 1 ? invokeUp : null,
      });
    }
  }

  function registerScannerFocusKey(ctx, compName, scannerId, focuskey, focusHandler) {
    const mgr = ctx.getHotkeyManager && ctx.getHotkeyManager();
    if (!mgr || focuskey === undefined || focuskey === null || focuskey === '') return;
    mgr.registerFocus({
      hotkey: focuskey,
      compName,
      compType: 'scanner',
      toggleFocus: () => {
        if (focusHandler && typeof focusHandler.toggleFocus === 'function') {
          focusHandler.toggleFocus();
        }
      },
    });
  }

  const api = {
    HotkeyManager,
    matchHotkey,
    makeKeyEvent,
    registerKeyHotkey,
    registerSwitchHotkey,
    registerDipHotkeys,
    registerKeyboardFocusKey,
    registerScannerFocusKey,
    registerClcdHotkeys,
    touchTypeToKeyType,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.LogTScriptHotkeyManager = HotkeyManager;
    window.LogTScriptHotkeyRegister = api;
  }
})();
