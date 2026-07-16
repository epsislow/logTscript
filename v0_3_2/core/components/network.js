var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function _isActive(value) {
  return value === '1' || (value && value[value.length - 1] === '1');
}

var NetworkComponent = class NetworkComponent extends BuiltinComponent {
  static get type() { return 'network'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['width'] !== undefined ? parseInt(attributes['width'], 10) : 128;
  }

  _length(attributes) {
    return attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 64;
  }

  _channel(attributes) {
    const c = attributes['channel'];
    if (c === undefined || c === null || c === '') return 'default';
    return String(c);
  }

  _sizeWidth(length) {
    if (typeof bitIndexWidth === 'function') return bitIndexWidth(length + 1);
    return length <= 1 ? 1 : 32 - Math.clz32(length);
  }

  _dropsBitWidth(count) {
    const s = count.toString(2);
    return s.length < 1 ? 1 : s.length;
  }

  _instanceId(ctx) {
    if (!ctx || ctx._instanceId == null) return 1;
    return ctx._instanceId;
  }

  getSupportedProperties() {
    return ['get', 'front', 'empty', 'full', 'size', 'capacity', 'free', 'drops', 'sendId'];
  }

  getRedirectProperties() {
    return ['get', 'front', 'empty', 'full', 'size', 'capacity', 'free', 'drops', 'sendId'];
  }

  getDef() {
    return {
      attrs: [
        { name: 'width', value: 'integer' },
        { name: 'length', value: 'integer' },
        { name: 'channel', value: 'string' },
      ],
      initValue: null,
      pins: [
        { bits: '1', name: 'set' },
        { bits: 'X', name: 'send' },
        { bits: '4', name: 'target' },
        { bits: '1', name: 'pop' },
        { bits: '1', name: 'clear' },
        { bits: '8', name: 'port' },
        { bits: '1', name: 'closeSock' },
      ],
      pouts: [
        { bits: 'X', name: 'get' },
        { bits: 'X', name: 'front' },
        { bits: '1', name: 'empty' },
        { bits: '1', name: 'full' },
        { bits: 'X', name: 'size' },
        { bits: 'X', name: 'capacity' },
        { bits: 'X', name: 'free' },
        { bits: 'X', name: 'drops' },
        { bits: 'X', name: 'sendId' },
      ],
      returns: 'Xbit',
    };
  }

  _packetIdBitWidth(packetId) {
    if (packetId <= 0) return 1;
    const s = packetId.toString(2);
    return s.length < 1 ? 1 : s.length;
  }

  evalGetProperty(comp, property, a, ctx) {
    const id = comp.deviceIds[0];
    const inst = this._instanceId(ctx);
    const width = this.getWidthBits(comp.attributes);
    const length = this._length(comp.attributes);
    const sw = this._sizeWidth(length);
    let val = null;
    let bitWidth = width;

    switch (property) {
      case 'get':
      case 'front':
        val = typeof networkRxPeek === 'function' ? networkRxPeek(inst, id) : '0'.repeat(width);
        break;
      case 'empty':
        val = typeof networkIsEmpty === 'function' ? networkIsEmpty(inst, id) : '1';
        bitWidth = 1;
        break;
      case 'full':
        val = typeof networkIsFull === 'function' ? networkIsFull(inst, id) : '0';
        bitWidth = 1;
        break;
      case 'size': {
        const n = typeof networkGetSize === 'function' ? networkGetSize(inst, id) : 0;
        val = n.toString(2).padStart(sw, '0');
        bitWidth = sw;
        break;
      }
      case 'capacity':
        val = length.toString(2).padStart(sw, '0');
        bitWidth = sw;
        break;
      case 'free': {
        const n = typeof networkGetSize === 'function' ? networkGetSize(inst, id) : 0;
        val = (length - n).toString(2).padStart(sw, '0');
        bitWidth = sw;
        break;
      }
      case 'drops': {
        const n = typeof networkGetDrops === 'function' ? networkGetDrops(inst, id) : 0;
        val = n.toString(2);
        bitWidth = this._dropsBitWidth(n);
        break;
      }
      case 'sendId': {
        const n = typeof networkGetLastSendPacketId === 'function'
          ? networkGetLastSendPacketId(inst, id)
          : 0;
        val = n > 0 ? n.toString(2) : '0';
        bitWidth = this._packetIdBitWidth(n);
        break;
      }
      default:
        return null;
    }

    const br = this.handleBitRange(a, val, a.var, property, ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:${property}`, bitWidth };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const width = this.getWidthBits(attributes);
    const length = this._length(attributes);
    const channel = this._channel(attributes);
    if (width <= 0) throw Error(`Network width must be positive for component ${name}`);
    if (length <= 0) throw Error(`Network length must be positive for component ${name}`);
    const instanceId = this._instanceId(ctx);
    if (typeof registerNetworkEndpoint === 'function') {
      registerNetworkEndpoint({
        instanceId,
        deviceId: baseId,
        channel,
        width,
        length,
      });
    }
    return { deviceIds: [baseId], ref: null };
  }

  getForbidDirectAssign() {
    return 'Cannot assign a value to a network component. Use :send, :pop, :clear, socket pins, and :set properties instead.';
  }

  _resolveSockBind(pending, key, ctx) {
    const spec = pending[key];
    if (!spec || !spec.target || !spec.target.var) {
      throw Error(`Network ${key} requires a sock name`);
    }
    const sockName = spec.target.var;
    if (sockName.startsWith('.')) throw Error(`Invalid sock name for ${key}`);
    if (!ctx.socks || !ctx.socks.has(sockName)) {
      throw Error(`Undefined sock ${sockName}`);
    }
    const entry = ctx.socks.get(sockName);
    const len = typeof ctx.getSockRuntimeLength === 'function'
      ? ctx.getSockRuntimeLength(sockName)
      : (entry.bits || '').length;
    if (len !== 0) {
      throw Error(`sock must be empty at ${key}: ${sockName}`);
    }
    const cap = typeof ctx.getSockCap === 'function'
      ? ctx.getSockCap(entry.type)
      : entry.cap;
    return { sockName, cap };
  }

  _resolveSocketPort(pending, reEvaluate, ctx) {
    if (pending.port === undefined) throw Error('Network socket operation requires port');
    const raw = this.reEvalPendingValue(pending, 'port', reEvaluate, ctx);
    const port = parseInt(raw, 2);
    if (isNaN(port) || port < 1 || port > 255) {
      throw Error('Invalid network socket port (expected 1..255)');
    }
    return port;
  }

  _countSocketOps(pending) {
    let n = 0;
    if (pending.openSock) n++;
    if (pending.connSock) n++;
    if (pending.closeSock !== undefined
      && _isActive(this.reEvalPendingValue(pending, 'closeSock', false, null))) n++;
    return n;
  }

  _applySocketDetach(ctx, closeInfo, instanceId) {
    if (!closeInfo || !ctx) return;
    const inst = instanceId != null ? instanceId : this._instanceId(ctx);
    const prod = closeInfo.producer;
    const cons = closeInfo.consumer;
    if (prod && prod.instanceId === inst && typeof ctx.detachNetworkSock === 'function') {
      ctx.detachNetworkSock(prod.sockName, '');
    }
    if (cons && cons.instanceId === inst && typeof ctx.detachNetworkSock === 'function') {
      ctx.detachNetworkSock(cons.sockName, closeInfo.snapshot || '');
    }
  }

  _applyOpenSock(id, instanceId, channel, pending, reEvaluate, ctx) {
    const { sockName, cap } = this._resolveSockBind(pending, 'openSock', ctx);
    const port = this._resolveSocketPort(pending, reEvaluate, ctx);
    if (typeof networkSocketOpen !== 'function') throw Error('Network socket bus is not loaded');
    const sharedKey = networkSocketOpen({
      channel,
      instanceId,
      deviceId: id,
      port,
      sockName,
      cap,
    });
    if (typeof ctx.linkSockToNetwork === 'function') {
      ctx.linkSockToNetwork(sockName, sharedKey, 'producer');
    }
  }

  _applyConnSock(id, instanceId, channel, pending, reEvaluate, ctx) {
    const { sockName, cap } = this._resolveSockBind(pending, 'connSock', ctx);
    const port = this._resolveSocketPort(pending, reEvaluate, ctx);
    const target = this._resolveSendTarget(pending, reEvaluate, ctx);
    if (target === undefined) throw Error('connSock requires target instance');
    if (typeof networkSocketConnect !== 'function') throw Error('Network socket bus is not loaded');
    const sharedKey = networkSocketConnect({
      channel,
      targetInstanceId: target,
      port,
      instanceId,
      deviceId: id,
      sockName,
      consumerCap: cap,
    });
    if (typeof ctx.linkSockToNetwork === 'function') {
      ctx.linkSockToNetwork(sockName, sharedKey, 'consumer');
    }
  }

  _applyCloseSock(id, instanceId, channel, pending, reEvaluate, ctx) {
    const port = this._resolveSocketPort(pending, reEvaluate, ctx);
    let targetInst;
    if (pending.target !== undefined) {
      targetInst = this._resolveSendTarget(pending, reEvaluate, ctx);
    }
    if (typeof networkSocketResolveClose !== 'function') {
      throw Error('Network socket bus is not loaded');
    }
    const resolved = networkSocketResolveClose({
      channel,
      instanceId,
      port,
      targetInstanceId: targetInst,
    });
    if (!resolved) throw Error('Network socket close: port not open');
    if (typeof networkSocketClose !== 'function') throw Error('Network socket bus is not loaded');
    const closeInfo = networkSocketClose({
      channel,
      producerInstanceId: resolved.producerInstanceId,
      port,
      closedBy: resolved.closedBy,
      initiatingInstanceId: instanceId,
    });
    if (!closeInfo) throw Error('Network socket close: port not open');
    this._applySocketDetach(ctx, closeInfo, instanceId);
  }

  _applySocketOps(id, instanceId, channel, pending, reEvaluate, ctx) {
    const socketOpCount = this._countSocketOps(pending);
    const fifoOps = pending.send !== undefined || pending.pop !== undefined || pending.clear !== undefined;
    if (socketOpCount > 1) throw Error('Conflicting network socket operations');
    if (socketOpCount > 0 && fifoOps) throw Error('Conflicting network operations');
    if (pending.openSock && pending.connSock) throw Error('Conflicting network socket operations');

    const closeActive = pending.closeSock !== undefined
      && _isActive(this.reEvalPendingValue(pending, 'closeSock', reEvaluate, ctx));
    if (closeActive) {
      this._applyCloseSock(id, instanceId, channel, pending, reEvaluate, ctx);
      return;
    }
    if (pending.openSock) {
      this._applyOpenSock(id, instanceId, channel, pending, reEvaluate, ctx);
      return;
    }
    if (pending.connSock) {
      this._applyConnSock(id, instanceId, channel, pending, reEvaluate, ctx);
    }
  }

  _resolveSendTarget(pending, reEvaluate, ctx) {
    if (pending.target === undefined) return undefined;
    const raw = this.reEvalPendingValue(pending, 'target', reEvaluate, ctx);
    const id = parseInt(raw, 2);
    if (isNaN(id) || id < 1 || id > 5) {
      throw Error('Invalid network target instance');
    }
    return id;
  }

  _sendDedupKey(instanceId, id) {
    return instanceId + ':' + id;
  }

  _shouldSkipDuplicateSend(ctx, instanceId, id, sendValue, target, reEvaluate) {
    if (!reEvaluate) return false;
    if (!ctx || !ctx._networkSendDedup) return false;
    const prev = ctx._networkSendDedup.get(this._sendDedupKey(instanceId, id));
    if (!prev) return false;
    const targetKey = target !== undefined ? String(target) : '*';
    return prev.packet === sendValue && prev.target === targetKey;
  }

  _recordSendDedup(ctx, instanceId, id, sendValue, target) {
    if (!ctx) return;
    if (!ctx._networkSendDedup) ctx._networkSendDedup = new Map();
    ctx._networkSendDedup.set(this._sendDedupKey(instanceId, id), {
      packet: sendValue,
      target: target !== undefined ? String(target) : '*',
    });
  }

  _doNetworkSend(instanceId, id, channel, sendValue, pending, reEvaluate, ctx) {
    if (typeof networkSend !== 'function') return;
    const opts = {
      fromInstanceId: instanceId,
      fromDeviceId: id,
      channel,
      packet: sendValue,
    };
    const target = this._resolveSendTarget(pending, reEvaluate, ctx);
    if (target !== undefined) opts.targetInstanceId = target;
    networkSend(opts);
  }

  _applyNetworkOps(id, instanceId, channel, width, pending, reEvaluate, ctx) {
    const sendInBlock = pending.send !== undefined;
    const popActive = pending.pop !== undefined
      && _isActive(this.reEvalPendingValue(pending, 'pop', reEvaluate, ctx));
    const clearActive = pending.clear !== undefined
      && _isActive(this.reEvalPendingValue(pending, 'clear', reEvaluate, ctx));

    if (sendInBlock && popActive) {
      throw Error('Conflicting network operations');
    }

    if (clearActive && popActive) {
      if (typeof networkRxPop === 'function') networkRxPop(instanceId, id);
      if (typeof networkRxClear === 'function') networkRxClear(instanceId, id);
    } else if (clearActive && sendInBlock) {
      if (typeof networkRxClear === 'function') networkRxClear(instanceId, id);
      const sendValue = this.reEvalPendingValue(pending, 'send', reEvaluate, ctx);
      if (sendValue.length !== width) throw Error('send value width mismatch');
      const target = pending.target !== undefined
        ? this._resolveSendTarget(pending, reEvaluate, ctx)
        : undefined;
      if (!this._shouldSkipDuplicateSend(ctx, instanceId, id, sendValue, target, reEvaluate)) {
        this._doNetworkSend(instanceId, id, channel, sendValue, pending, reEvaluate, ctx);
        this._recordSendDedup(ctx, instanceId, id, sendValue, target);
      }
    } else if (clearActive) {
      if (typeof networkRxClear === 'function') networkRxClear(instanceId, id);
    } else if (popActive) {
      if (typeof networkRxPop === 'function') networkRxPop(instanceId, id);
    } else if (sendInBlock) {
      const sendValue = this.reEvalPendingValue(pending, 'send', reEvaluate, ctx);
      if (sendValue.length !== width) throw Error('send value width mismatch');
      const target = pending.target !== undefined
        ? this._resolveSendTarget(pending, reEvaluate, ctx)
        : undefined;
      if (!this._shouldSkipDuplicateSend(ctx, instanceId, id, sendValue, target, reEvaluate)) {
        this._doNetworkSend(instanceId, id, channel, sendValue, pending, reEvaluate, ctx);
        this._recordSendDedup(ctx, instanceId, id, sendValue, target);
      }
    }
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending || when !== 'immediate') return;
    if (pending.set === undefined) return;
    if (ctx && typeof applyNetworkSocketPendingDetaches === 'function') {
      applyNetworkSocketPendingDetaches(this._instanceId(ctx), ctx);
    }
    const setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
    if (!_isActive(setValue)) return;

    const id = comp.deviceIds[0];
    const width = this.getWidthBits(comp.attributes);
    const channel = this._channel(comp.attributes);
    const instanceId = this._instanceId(ctx);
    const socketOpCount = this._countSocketOps(pending);
    if (socketOpCount > 0) {
      this._applySocketOps(id, instanceId, channel, pending, reEvaluate, ctx);
    } else {
      this._applyNetworkOps(id, instanceId, channel, width, pending, reEvaluate, ctx);
    }

    if (!reEvaluate) {
      delete pending.send;
      delete pending.target;
      delete pending.pop;
      delete pending.clear;
      delete pending.openSock;
      delete pending.connSock;
      delete pending.port;
      delete pending.closeSock;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = NetworkComponent; }
