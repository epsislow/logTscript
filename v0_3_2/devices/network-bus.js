/* ================= NETWORK BUS (cross-instance) ================= */

const _endpoints = new Map();
const _channelIndex = new Map();

function _clampInstance(n) {
  if (typeof clampInstance === 'function') return clampInstance(n);
  const id = parseInt(n, 10);
  if (isNaN(id) || id < 1) return 1;
  if (id > 5) return 5;
  return id;
}

function networkEndpointId(instanceId, deviceId) {
  return _clampInstance(instanceId) + ':' + deviceId;
}

function _unregisterEndpointById(epId) {
  const ep = _endpoints.get(epId);
  if (!ep) return;
  const set = _channelIndex.get(ep.channel);
  if (set) {
    set.delete(epId);
    if (set.size === 0) _channelIndex.delete(ep.channel);
  }
  _endpoints.delete(epId);
}

function registerNetworkEndpoint({ instanceId, deviceId, channel, width, length }) {
  const inst = _clampInstance(instanceId);
  const epId = networkEndpointId(inst, deviceId);
  _unregisterEndpointById(epId);

  const ch = String(channel != null && channel !== '' ? channel : 'default');
  const ep = {
    instanceId: inst,
    deviceId,
    channel: ch,
    width,
    length,
    rx: {
      width,
      length,
      data: new Array(length).fill(''),
      head: 0,
      count: 0,
    },
    dropCount: 0,
  };
  _endpoints.set(epId, ep);
  if (!_channelIndex.has(ch)) _channelIndex.set(ch, new Set());
  _channelIndex.get(ch).add(epId);
  return epId;
}

function unregisterNetworkEndpoints(instanceId) {
  const inst = _clampInstance(instanceId);
  networkSocketCloseForInstance(inst);
  for (const [epId, ep] of [..._endpoints.entries()]) {
    if (ep.instanceId === inst) _unregisterEndpointById(epId);
  }
}

function _getEndpoint(instanceId, deviceId) {
  const ep = _endpoints.get(networkEndpointId(instanceId, deviceId));
  if (!ep) throw Error('Network endpoint not found: ' + networkEndpointId(instanceId, deviceId));
  return ep;
}

function _fifoPush(fifo, value) {
  if (fifo.count >= fifo.length) return false;
  const idx = (fifo.head + fifo.count) % fifo.length;
  fifo.data[idx] = value;
  fifo.count++;
  return true;
}

function _fifoPop(fifo) {
  if (fifo.count <= 0) throw Error('Network RX is empty');
  const value = fifo.data[fifo.head];
  fifo.data[fifo.head] = '';
  fifo.head = (fifo.head + 1) % fifo.length;
  fifo.count--;
  return value;
}

function _fifoPeek(fifo) {
  if (fifo.count <= 0) return null;
  return fifo.data[fifo.head];
}

function _validateTargetInstanceId(n) {
  const id = typeof n === 'number' ? n : parseInt(n, 10);
  if (isNaN(id) || id < 1 || id > 5) {
    throw Error('Invalid network target instance');
  }
  return id;
}

/* ================= NETWORK TRAFFIC LOG ================= */

let _trafficId = 0;
const _trafficLog = [];
const TRAFFIC_LOG_MAX = 200;
const TRAFFIC_LOG_TRIM = 50;

function _ensureTrafficLogCapacity() {
  if (_trafficLog.length >= TRAFFIC_LOG_MAX) {
    _trafficLog.splice(0, TRAFFIC_LOG_TRIM);
  }
}

function _packetIdBitWidth(packetId) {
  if (packetId <= 0) return 1;
  const s = packetId.toString(2);
  return s.length < 1 ? 1 : s.length;
}

function allocNetworkPacketId() {
  return ++_trafficId;
}

function _logNetworkSendEntry({ packetId, fromInstanceId, channel, packet, targetInstanceId, deliveredCount }) {
  const status = deliveredCount > 0 ? 'Received' : 'Dropped';
  const entry = {
    id: packetId,
    packetId,
    source: _clampInstance(fromInstanceId),
    target: targetInstanceId != null ? targetInstanceId : '*',
    channel: String(channel != null && channel !== '' ? channel : 'default'),
    size: packet.length,
    status,
    packet,
    ts: Date.now(),
  };
  _ensureTrafficLogCapacity();
  _trafficLog.push(entry);
  if (typeof notifyNetworkTrafficPanel === 'function') {
    notifyNetworkTrafficPanel();
  }
  return entry;
}

function getNetworkTrafficLog() {
  return _trafficLog.slice();
}

function clearNetworkTrafficLog() {
  _trafficLog.length = 0;
}

function _resetNetworkTrafficForTests() {
  _trafficId = 0;
  _trafficLog.length = 0;
}

function _networkWidthMismatchError(receiverInstanceId, receiverWidth, packetBits) {
  return `Network send: receiver instance ${receiverInstanceId} (${receiverWidth}bits) cannot accept package ${packetBits}bits. Width mismatch.`;
}

function networkSend({ fromInstanceId, fromDeviceId, channel, packet, targetInstanceId }) {
  const packetId = allocNetworkPacketId();
  const fromEpId = networkEndpointId(fromInstanceId, fromDeviceId);
  const ch = String(channel != null && channel !== '' ? channel : 'default');
  const ids = _channelIndex.get(ch);
  const target = targetInstanceId != null ? _validateTargetInstanceId(targetInstanceId) : null;
  let deliveredCount = 0;

  const fromEp = _endpoints.get(fromEpId);
  if (fromEp) fromEp.lastSendPacketId = packetId;

  if (ids) {
    for (const epId of ids) {
      if (epId === fromEpId) continue;
      const ep = _endpoints.get(epId);
      if (!ep) continue;
      if (target != null && ep.instanceId !== target) continue;
      if (packet.length !== ep.width) {
        throw Error(_networkWidthMismatchError(ep.instanceId, ep.width, packet.length));
      }
      if (_fifoPush(ep.rx, packet)) {
        deliveredCount++;
        if (typeof notifyRunContextInstanceEvent === 'function') {
          notifyRunContextInstanceEvent(ep.instanceId, 'network-rx');
        }
      } else {
        ep.dropCount++;
      }
    }
  }

  _logNetworkSendEntry({
    packetId,
    fromInstanceId,
    channel: ch,
    packet,
    targetInstanceId: target,
    deliveredCount,
  });
  return { packetId, deliveredCount };
}

function networkGetLastSendPacketId(instanceId, deviceId) {
  const epId = networkEndpointId(instanceId, deviceId);
  const ep = _endpoints.get(epId);
  return ep && ep.lastSendPacketId != null ? ep.lastSendPacketId : 0;
}

function networkRxPeek(instanceId, deviceId) {
  const ep = _getEndpoint(instanceId, deviceId);
  const v = _fifoPeek(ep.rx);
  return v != null ? v : '0'.repeat(ep.width);
}

function networkRxPop(instanceId, deviceId) {
  const ep = _getEndpoint(instanceId, deviceId);
  _fifoPop(ep.rx);
}

function networkRxClear(instanceId, deviceId) {
  const ep = _getEndpoint(instanceId, deviceId);
  ep.rx.data.fill('');
  ep.rx.head = 0;
  ep.rx.count = 0;
}

function networkGetSize(instanceId, deviceId) {
  return _getEndpoint(instanceId, deviceId).rx.count;
}

function networkGetLength(instanceId, deviceId) {
  return _getEndpoint(instanceId, deviceId).length;
}

function networkIsEmpty(instanceId, deviceId) {
  return networkGetSize(instanceId, deviceId) === 0 ? '1' : '0';
}

function networkIsFull(instanceId, deviceId) {
  const ep = _getEndpoint(instanceId, deviceId);
  return ep.rx.count >= ep.length ? '1' : '0';
}

function networkGetDrops(instanceId, deviceId) {
  const epId = networkEndpointId(instanceId, deviceId);
  const ep = _endpoints.get(epId);
  return ep ? ep.dropCount : 0;
}

/* ================= NETWORK SOCKET PORTS (shared sock) ================= */

const _socketPorts = new Map();
const _pendingSockDetaches = new Map();

function _queueSockDetach(instanceId, sockName, snapshot) {
  const inst = _clampInstance(instanceId);
  if (!_pendingSockDetaches.has(inst)) _pendingSockDetaches.set(inst, []);
  _pendingSockDetaches.get(inst).push({ sockName, snapshot: snapshot != null ? snapshot : '' });
}

function _queueRemoteSockDetach(closeInfo, initiatingInstanceId) {
  if (!closeInfo || initiatingInstanceId == null) return;
  const initiator = _clampInstance(initiatingInstanceId);
  if (closeInfo.producer && closeInfo.producer.instanceId !== initiator) {
    _queueSockDetach(closeInfo.producer.instanceId, closeInfo.producer.sockName, '');
  }
  if (closeInfo.consumer && closeInfo.consumer.instanceId !== initiator) {
    _queueSockDetach(closeInfo.consumer.instanceId, closeInfo.consumer.sockName, closeInfo.snapshot || '');
  }
}

function applyNetworkSocketPendingDetaches(instanceId, ctx) {
  const inst = _clampInstance(instanceId);
  const list = _pendingSockDetaches.get(inst);
  if (!list || !list.length || !ctx || typeof ctx.detachNetworkSock !== 'function') return;
  for (const item of list) {
    ctx.detachNetworkSock(item.sockName, item.snapshot);
  }
  _pendingSockDetaches.delete(inst);
}

function networkSocketPortKey(channel, producerInstanceId, port) {
  const ch = String(channel != null && channel !== '' ? channel : 'default');
  return ch + ':' + _clampInstance(producerInstanceId) + ':' + port;
}

function _validateSocketPort(port) {
  const p = typeof port === 'number' ? port : parseInt(port, 10);
  if (isNaN(p) || p < 1 || p > 255) {
    throw Error('Invalid network socket port (expected 1..255)');
  }
  return p;
}

function getSharedSockState(sharedKey) {
  const rec = _socketPorts.get(sharedKey);
  return rec ? rec.shared : null;
}

function isSocketPortOpen(sharedKey) {
  const rec = _socketPorts.get(sharedKey);
  return !!(rec && (rec.state === 'open' || rec.state === 'connected'));
}

function networkSocketOpen({ channel, instanceId, deviceId, port, sockName, cap }) {
  const inst = _clampInstance(instanceId);
  const p = _validateSocketPort(port);
  const ch = String(channel != null && channel !== '' ? channel : 'default');
  const key = networkSocketPortKey(ch, inst, p);
  const existing = _socketPorts.get(key);
  if (existing) {
    if (existing.state === 'closed') {
      _socketPorts.delete(key);
    } else if (existing.producer.instanceId === inst
      && existing.producer.sockName === sockName) {
      return key;
    } else {
      throw Error('Network socket port already in use');
    }
  }
  const shared = { bits: '', cap };
  _socketPorts.set(key, {
    channel: ch,
    producerInstanceId: inst,
    port: p,
    shared,
    state: 'open',
    producer: { instanceId: inst, deviceId, sockName },
    consumer: null,
  });
  return key;
}

function networkSocketConnect({
  channel, targetInstanceId, port, instanceId, deviceId, sockName, consumerCap,
}) {
  const targetInst = _clampInstance(targetInstanceId);
  const consumerInst = _clampInstance(instanceId);
  const p = _validateSocketPort(port);
  const ch = String(channel != null && channel !== '' ? channel : 'default');
  const key = networkSocketPortKey(ch, targetInst, p);
  const rec = _socketPorts.get(key);
  if (!rec || rec.state === 'closed') {
    throw Error('Network socket port not available for connect');
  }
  if (rec.channel !== ch) {
    throw Error('Network socket channel mismatch');
  }
  if (rec.state === 'connected' && rec.consumer) {
    throw Error('Network socket port already has a consumer');
  }
  const cap = consumerCap != null ? consumerCap : 0;
  if (cap < rec.shared.cap) {
    throw Error(`Network socket consumer cap ${cap} is less than producer cap ${rec.shared.cap}`);
  }
  rec.consumer = { instanceId: consumerInst, deviceId, sockName };
  rec.state = 'connected';
  return key;
}

function networkSocketResolveClose({ channel, instanceId, port, targetInstanceId }) {
  const p = _validateSocketPort(port);
  const ch = String(channel != null && channel !== '' ? channel : 'default');
  const inst = _clampInstance(instanceId);

  if (targetInstanceId != null) {
    const key = networkSocketPortKey(ch, _clampInstance(targetInstanceId), p);
    const rec = _socketPorts.get(key);
    if (rec && rec.state !== 'closed') {
      if (rec.consumer && rec.consumer.instanceId === inst) {
        return { producerInstanceId: rec.producerInstanceId, closedBy: 'consumer', key };
      }
      if (rec.producer.instanceId === inst) {
        return { producerInstanceId: rec.producerInstanceId, closedBy: 'producer', key };
      }
    }
  }

  for (const [key, rec] of _socketPorts.entries()) {
    if (rec.state === 'closed' || rec.channel !== ch || rec.port !== p) continue;
    if (rec.consumer && rec.consumer.instanceId === inst) {
      return { producerInstanceId: rec.producerInstanceId, closedBy: 'consumer', key };
    }
    if (rec.producer.instanceId === inst) {
      return { producerInstanceId: rec.producerInstanceId, closedBy: 'producer', key };
    }
  }
  return null;
}

function networkSocketClose({ channel, producerInstanceId, port, closedBy, initiatingInstanceId }) {
  const p = _validateSocketPort(port);
  const ch = String(channel != null && channel !== '' ? channel : 'default');
  const key = networkSocketPortKey(ch, _clampInstance(producerInstanceId), p);
  const rec = _socketPorts.get(key);
  if (!rec || rec.state === 'closed') return null;
  const snapshot = rec.shared.bits || '';
  rec.shared.bits = '';
  rec.state = 'closed';
  const result = {
    key,
    snapshot,
    closedBy: closedBy === 'consumer' ? 'consumer' : 'producer',
    producer: { ...rec.producer },
    consumer: rec.consumer ? { ...rec.consumer } : null,
  };
  _socketPorts.delete(key);
  if (initiatingInstanceId != null) {
    _queueRemoteSockDetach(result, initiatingInstanceId);
  }
  return result;
}

function networkSocketCloseForInstance(instanceId) {
  const inst = _clampInstance(instanceId);
  const toClose = [];
  for (const [key, rec] of _socketPorts.entries()) {
    if (rec.state === 'closed') continue;
    if (rec.producer.instanceId === inst
      || (rec.consumer && rec.consumer.instanceId === inst)) {
      toClose.push({
        channel: rec.channel,
        producerInstanceId: rec.producerInstanceId,
        port: rec.port,
        closedBy: rec.consumer && rec.consumer.instanceId === inst ? 'consumer' : 'producer',
      });
    }
  }
  const results = [];
  for (const item of toClose) {
    const r = networkSocketClose({ ...item, initiatingInstanceId: inst });
    if (r) results.push(r);
  }
  return results;
}

function _resetNetworkBusForTests() {
  _endpoints.clear();
  _channelIndex.clear();
  _socketPorts.clear();
  _pendingSockDetaches.clear();
  _resetNetworkTrafficForTests();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    networkEndpointId,
    registerNetworkEndpoint,
    unregisterNetworkEndpoints,
    networkSend,
    allocNetworkPacketId,
    networkGetLastSendPacketId,
    networkRxPeek,
    networkRxPop,
    networkRxClear,
    networkGetSize,
    networkGetLength,
    networkIsEmpty,
    networkIsFull,
    networkGetDrops,
    getNetworkTrafficLog,
    clearNetworkTrafficLog,
    TRAFFIC_LOG_MAX,
    TRAFFIC_LOG_TRIM,
    networkSocketPortKey,
    networkSocketOpen,
    networkSocketConnect,
    networkSocketClose,
    networkSocketResolveClose,
    networkSocketCloseForInstance,
    applyNetworkSocketPendingDetaches,
    getSharedSockState,
    isSocketPortOpen,
    _resetNetworkBusForTests,
    _resetNetworkTrafficForTests,
  };
}
