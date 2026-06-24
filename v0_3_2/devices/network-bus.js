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

function networkSend({ fromInstanceId, fromDeviceId, channel, packet }) {
  const fromEpId = networkEndpointId(fromInstanceId, fromDeviceId);
  const ch = String(channel != null && channel !== '' ? channel : 'default');
  const ids = _channelIndex.get(ch);
  if (!ids) return;
  for (const epId of ids) {
    if (epId === fromEpId) continue;
    const ep = _endpoints.get(epId);
    if (!ep) continue;
    if (packet.length !== ep.width) throw Error('Network send value width mismatch');
    if (_fifoPush(ep.rx, packet)) {
      if (typeof notifyRunContextInstanceEvent === 'function') {
        notifyRunContextInstanceEvent(ep.instanceId, 'network-rx');
      }
    } else {
      ep.dropCount++;
    }
  }
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

function _resetNetworkBusForTests() {
  _endpoints.clear();
  _channelIndex.clear();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    networkEndpointId,
    registerNetworkEndpoint,
    unregisterNetworkEndpoints,
    networkSend,
    networkRxPeek,
    networkRxPop,
    networkRxClear,
    networkGetSize,
    networkGetLength,
    networkIsEmpty,
    networkIsFull,
    networkGetDrops,
    _resetNetworkBusForTests,
  };
}
