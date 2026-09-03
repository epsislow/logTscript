/* ================= QUEUE / STACK STORAGE ================= */

function bitIndexWidth(len) {
  return len <= 1 ? 1 : 32 - Math.clz32(len - 1);
}

function addQueueStorage({ id, width, length, mode }) {
  if (width <= 0) throw Error('Queue storage width must be positive');
  if (length <= 0) throw Error('Queue storage length must be positive');
  if (mode !== 'fifo' && mode !== 'lifo') throw Error('Queue storage mode must be fifo or lifo');
  dm().stores.set(id, {
    width,
    length,
    mode,
    data: new Array(length).fill(''),
    head: 0,
    count: 0,
  });
}

function _getStore(id) {
  const s = dm().stores.get(id);
  if (!s) throw Error('Queue storage not found: ' + id);
  return s;
}

function _fullLabel(mode) {
  return mode === 'fifo' ? 'Queue' : 'Stack';
}

function queuePush(id, value) {
  const s = _getStore(id);
  if (value.length !== s.width) throw Error('push value width mismatch');
  if (s.count >= s.length) throw Error(_fullLabel(s.mode) + ' is full');
  if (s.mode === 'fifo') {
    const idx = (s.head + s.count) % s.length;
    s.data[idx] = value;
    s.count++;
  } else {
    s.data[s.count] = value;
    s.count++;
  }
}

function queuePop(id) {
  const s = _getStore(id);
  if (s.count <= 0) throw Error(_fullLabel(s.mode) + ' is empty');
  let value;
  if (s.mode === 'fifo') {
    value = s.data[s.head];
    s.data[s.head] = '';
    s.head = (s.head + 1) % s.length;
    s.count--;
  } else {
    s.count--;
    value = s.data[s.count];
    s.data[s.count] = '';
  }
  return value;
}

function queuePeek(id) {
  const s = _getStore(id);
  if (s.count <= 0) return '0'.repeat(s.width);
  if (s.mode === 'fifo') return s.data[s.head];
  return s.data[s.count - 1];
}

function queueGetSize(id) {
  return _getStore(id).count;
}

function queueGetLength(id) {
  return _getStore(id).length;
}

function queueIsEmpty(id) {
  return queueGetSize(id) === 0 ? '1' : '0';
}

function queueIsFull(id) {
  const s = _getStore(id);
  return s.count >= s.length ? '1' : '0';
}

function queueClear(id) {
  const s = _getStore(id);
  s.data.fill('');
  s.head = 0;
  s.count = 0;
}

function queueCountBits(id) {
  return bitIndexWidth(queueGetLength(id) + 1);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    bitIndexWidth,
    addQueueStorage,
    queuePush,
    queuePop,
    queuePeek,
    queueGetSize,
    queueGetLength,
    queueIsEmpty,
    queueIsFull,
    queueClear,
    queueCountBits,
  };
}
