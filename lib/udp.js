/**
 * lei-udp
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var dgram = require('dgram');
var async = require('async');
var utils = require('./utils');
var define = require('./define');
var proto = require('./proto');
var debug = utils.debug('udp');


/**
 * 创建UDP客户端
 *
 * @param {Object} options
 *   - {String} type
 *   - {String} host
 *   - {Number} port
 *   - {Number} maxRetry
 *   - {Number} responseTimeout
 *   - {Number} cacheTimeout
 *   - {Number} cleanCacheInterval
 *   - {Number} maxMessageSize
 */
function UDP (options) {
  options = options || {};
  options.type = options.type || define.DEFAULT_SOCKET_TYPE;
  options.host = options.host || define.DEFAULT_HOST;
  options.maxRetry = options.maxRetry || define.DEFAULT_MAX_RETRY;
  options.responseTimeout = options.responseTimeout || define.DEFAULT_RESPONSE_TIMEOUT;
  options.cacheTimeout = options.cacheTimeout || define.DEFAULT_CACHE_TIMEOUT;
  options.cleanCacheInterval = options.cleanCacheInterval || define.DEFAULT_CLEAN_CACHE_INTERVAL;
  options.maxMessageSize = options.maxMessageSize || define.DEFAULT_UDP_MSG_SIZE;
  this._options = options;

  this._debug = utils.debug('socket:#' + UDP._counter++);
  this._sessionId = 0;
  this._remoteNamespace = {};

  // TODO: 定期清理tid
  this._timeoutTids = [];
  this._intervalTids = [];

  this._socket = dgram.createSocket(options.type);
  if (options.port) this.bind(options.host, options.port);
  this._bindSocketEvents();
}

utils.inheritsEventEmitter(UDP);

UDP._counter = 0;

UDP.prototype._setTimeout = function (fn, t) {
  var tid = setTimeout(fn, t);
  this._timeoutTids.push(tid);
};

UDP.prototype._setInterval = function (fn, t) {
  var tid = setInterval(fn, t);
  this._intervalTids.push(tid);
};

UDP.prototype._getRemoteNamespace = function (host, port, name, initValue) {
  var key = host + ':' + port;
  if (!this._remoteNamespace[key]) this._remoteNamespace[key] = {};
  if (!this._remoteNamespace[key][name]) this._remoteNamespace[key][name] = initValue;
  return this._remoteNamespace[key][name];
};

UDP.prototype._getSessionId = function () {
  this._sessionId++;
  if (this._sessionId >= define.MAX_SESSION_ID_VALUE) this._sessionId = 0;
  return this._sessionId;
};

UDP.prototype.bind = function (host, port, callback) {
  this._debug('bind: host=%s, port=%s', host, port);
  this.once('listening', callback);
  this._socket.bind({
    address: host,
    port: port
  });
};

/*
UDP.prototype._startCleanCache = function () {
  var self = this;
  self._cleanCacheTid = setInterval(function () {

    var cacheList = self._cacheList;
    var timeout = Date.now() - self._options.cacheTimeout;
    for (var i = 0; i < cacheList.length; i++) {
      var info = cacheList[i];
      if (info.timestamp < timeout) {
        cacheList.splice(i, 1);
        i--;

        self._debug('clean cache: key=%s, timestamp=%s', info.key, info.timestamp);
        if (info.callback) info.callback(new utils.TimeoutError());
      }
    }

  }, self._options.cleanCacheInterval);
};
*/
UDP.prototype._bindSocketEvents = function () {
  var self = this;
  var socket = self._socket;
  var debug = self._debug;

  socket.on('listening', function () {
    self._listening = true;
    debug('listening: host=%s, port=%s', self._options.host, self._options.port);
    self.emit('listening');
  });

  socket.on('error', function (err) {
    debug('on error: err=%s', err);
    self.emit('error', err);
  });

  socket.on('close', function () {
    debug('server closed');
    self.emit('exit');
  });

  function formatAddress (addr) {
    return {host: addr.address, port: addr.port};
  }

  socket.on('message', function (buf, addr) {
    //console.log(addr, buf);
    addr = formatAddress(addr);
    var action = buf[0];
    debug('received %d bytes from %s:%d, action=%s', buf.length, addr.host, addr.port, action);
    switch (action) {

      case proto.ACTION_PING:
        onActionPing(buf, addr);
        break;

      case proto.ACTION_PONG:
        onActionPong(buf, addr);
        break;

      case proto.ACTION_SINGLE:
        onActionSingle(buf, addr);
        break;

      case proto.ACTION_MULTI:
        onActionMulti(buf, addr);
        break;

      case proto.ACTION_MULTI_END:
        onActionMultiEnd(buf, addr);
        break;

      case proto.ACTION_MULTI_CANCELED:
        onActionMultiCanceled(buf, addr);
        break;

      case proto.ACTION_SINGLE_RELIABLE:
        onActionSingleReliable(buf, addr);
        break;

      case proto.ACTION_SINGLE_CONFIRMED:
        onActionSingleConfirmed(buf, addr);
        break;

      case proto.ACTION_MULTI_RELIABLE:
        onActionMultiReliable(buf, addr);
        break;

      case proto.ACTION_MULTI_RELIABLE_END:
        onActionMultiReliableEnd(buf, addr);
        break;

      case proto.ACTION_MULTI_ALL_CONFIRMED:
        onActionMultiAllConfirmed(buf, addr);
        break;

      default:
        debug('unknown message action: %s', action);
    }
  });

  //----------------------------------------------------------------------------

  function onActionPing (buf, addr) {
    var msg = proto.ping.decode(buf);
    var buf2 = proto.pong.encode(proto.ACTION_PONG, msg.timestamp);
    socket.send(buf2, 0, buf2.length, addr.port, addr.host);
  }

  function onActionPong (buf, addr) {
    var msg = proto.pong.decode(buf);
    var pingCallback = self._getRemoteNamespace(addr.host, addr.port, 'ping', {});
    var callback = pingCallback[msg.timestamp];
    if (callback) {
      callback(null, Date.now() - msg.timestamp, msg.timestamp);
    } else {
      debug('unhandle ping callback #%s from %j', msg.timestamp, addr);
    }
  }

  //----------------------------------------------------------------------------

  function onActionSingle (buf, addr) {
    var msg = proto.single.decode(buf);
    self.emit('data', addr, msg.data);
  }

  //----------------------------------------------------------------------------

  function getReceivedCacheList (addr, session) {
    var caches = self._getRemoteNamespace(addr.host, addr.port, 'receivedCache', {});
    if (!caches[session]) caches[session] = {size: 0, received: 0, list: []};
    return caches[session];
  }

  function checkReceivedCacheList (addr, cache, session) {
    if (cache.size > 0 && cache.received === cache.size) {
      deleteReceivedCache(addr, session);
      self.emit('data', addr, utils.concatBuffer(cache.list));
      return true;
    }
  }

  function deleteReceivedCache (addr, session) {
    var caches = self._getRemoteNamespace(addr.host, addr.port, 'receivedCache', {});
    delete caches[session];
  }

  //----------------------------------------------------------------------------

  function onActionMulti (buf, addr) {
    var msg = proto.multi.decode(buf);
    var cache = getReceivedCacheList(addr, msg.session);
    if (!cache.list[msg.index]) cache.received++;
    cache.list[msg.index] = msg.data;
    checkReceivedCacheList(addr, cache, msg.session);
  }

  function onActionMultiEnd (buf, addr) {
    var msg = proto.multiEnd.decode(buf);
    var cache = getReceivedCacheList(addr, msg.session);
    cache.size = msg.size;
    checkReceivedCacheList(addr, cache, msg.session);
  }

  //----------------------------------------------------------------------------

  function onActionMultiCanceled (buf, addr) {
    var msg = proto.multiCanceled.decode(buf);
    deleteReceivedCache(addr, msg.session);
  }

  //----------------------------------------------------------------------------

  function onActionSingleReliable (buf, addr) {
    var msg = proto.singleReliable.decode(buf);
    self.emit('data', addr, msg.data);

    var buf2 = proto.singleConfirmed.encode(proto.ACTION_SINGLE_CONFIRMED, msg.session);
    socket.send(buf2, 0, buf2.length, addr.port, addr.host);
  }

  function onActionSingleConfirmed (buf, addr) {
    var msg = proto.singleConfirmed.decode(buf);
    var sentSingle = self._getRemoteNamespace(addr.host, addr.port, 'sentSingle', {});
    if (sentSingle[msg.session]) {
      var info = sentSingle[msg.session];
      delete sentSingle[msg.session];
      if (info && info.callback) {
        info.callback(null, info.data.length, Date.now() - info.timestamp, info.retry);
      }
    }
  }

  //----------------------------------------------------------------------------

  function checkReceivedCacheListReliable (addr, cache, session) {
    if (checkReceivedCacheList(addr, cache, session)) {
      var buf = proto.multiAllConfirmed.encode(proto.ACTION_MULTI_ALL_CONFIRMED, session, cache.size);
      socket.send(buf, 0, buf.length, addr.port, addr.host);
    }
  }

  function onActionMultiReliable (buf, addr) {
    var msg = proto.multiReliable.decode(buf);
    var cache = getReceivedCacheList(addr, msg.session);
    if (!cache.list[msg.index]) cache.received++;
    cache.list[msg.index] = msg.data;
    checkReceivedCacheListReliable(addr, cache, msg.session);
  }

  function onActionMultiReliableEnd (buf, addr) {
    var msg = proto.multiReliableEnd.decode(buf);
    var cache = getReceivedCacheList(addr, msg.session);
    cache.size = msg.size;
    checkReceivedCacheListReliable(addr, cache, msg.session);
  }

  function onActionMultiAllConfirmed (buf, addr) {
    var msg = proto.multiAllConfirmed.decode(buf);
    var sentMulti = self._getRemoteNamespace(addr.host, addr.port, 'sentMulti', {});
    var info = sentMulti[msg.session];
    delete sentMulti[msg.session];
    if (info && info.callback) {
      info.callback(null, info.totalLength, Date.now() - info.timestamp, info.retry);
    }
  }
};

UDP.prototype.send = function (host, port, data, callback) {
  this._debug('send: host=%s, port=%s, data=%s', host, port, data);
  if (!Buffer.isBuffer(data)) data = new Buffer(data);
  var dataList = utils.splitBuffer(data, this._options.maxMessageSize);
  if (dataList.length > 1) {
    this._sendMulti(host, port, dataList, callback);
  } else {
    this._sendSingle(host, port, data, callback);
  }
};

UDP.prototype._sendSingle = function (host, port, data, callback) {
  var buf = proto.single.encode(proto.ACTION_SINGLE, data);
  this._socket.send(buf, 0, buf.length, port, host, function (err) {
    callback(err, data.length);
  });
};

UDP.prototype._sendMulti = function (host, port, dataList, callback) {
  var debug = this._debug;
  var socket = this._socket;
  var session = this._getSessionId();
  var timestamp = utils.getSecondTimestamp();
  var totalLength = 0;

  var sendErr = null;
  function sendCallback (err) {
    if (err) {
      debug('socket send error: %s', err);
      sendErr = err;
    }
  }
  dataList.forEach(function (data, index) {
    if (sendErr) return;
    var buf = proto.multi.encode(proto.ACTION_MULTI, session, index, timestamp, data);
    socket.send(buf, 0, buf.length, port, host, sendCallback);
    totalLength += data.length;
  });

  if (sendErr) {
    var buf = proto.multiCanceled.encode(proto.ACTION_MULTI_CANCELED, session);
    socket.send(buf, 0, buf.length, port, host);
    callback(sendErr);
  } else {
    var buf = proto.multiEnd.encode(proto.ACTION_MULTI_END, session, dataList.length, timestamp);
    socket.send(buf, 0, buf.length, port, host, function (err) {
      callback(err, totalLength);
    });
  }
};

UDP.prototype.sendR = function (host, port, data, callback) {
  this._debug('sendR: host=%s, port=%s, data=%s', host, port, data);
  if (!Buffer.isBuffer(data)) data = new Buffer(data);
  var dataList = utils.splitBuffer(data, this._options.maxMessageSize);
  if (dataList.length > 1) {
    this._sendRMulti(host, port, dataList, callback);
  } else {
    this._sendRSingle(host, port, data, callback);
  }
};

UDP.prototype._sendRSingle = function (host, port, data, callback) {
  var session = this._getSessionId();
  var buf = proto.singleReliable.encode(proto.ACTION_SINGLE_RELIABLE, session, data);
  this._socket.send(buf, 0, buf.length, port, host);

  var sentSingle = this._getRemoteNamespace(host, port, 'sentSingle', {});
  sentSingle[session] = {
    timestamp: Date.now(),
    data: data,
    retry: 0,
    callback: callback
  };
};

UDP.prototype._sendRMulti = function (host, port, dataList, callback) {
  var debug = this._debug;
  var socket = this._socket;
  var session = this._getSessionId();
  var timestamp = utils.getSecondTimestamp();
  var timestampM = Date.now();
  var sentMulti = this._getRemoteNamespace(host, port, 'sentMulti', {});
  var cache = sentMulti[session] = {
    timestamp: timestampM,
    totalLength: 0,
    list: [],
    retry: 0,
    callback: callback
  };

  var sendErr = null;
  function sendCallback (err) {
    if (err) {
      debug('socket send error: %s', err);
      sendErr = err;
    }
  }
  dataList.forEach(function (data, index) {
    if (sendErr) return;
    var buf = proto.multiReliable.encode(proto.ACTION_MULTI_RELIABLE, session, index, timestamp, data);
    cache.list[index] = {
      timestamp: timestampM,
      data: data,
      retry: 0,
      confirmed: false
    };
    cache.totalLength += data.length;
    socket.send(buf, 0, buf.length, port, host, sendCallback);
  });

  if (sendErr) {
    delete sentMulti[session];
    var buf = proto.multiCanceled.encode(proto.ACTION_MULTI_CANCELED, session);
    socket.send(buf, 0, buf.length, port, host);
    callback(sendErr);
  } else {
    var buf = proto.multiReliableEnd.encode(proto.ACTION_MULTI_RELIABLE_END, session, dataList.length, timestamp);
    socket.send(buf, 0, buf.length, port, host);
  }
};

UDP.prototype.ping = function (host, port, callback) {
  var self = this;

  var pingCallback = self._getRemoteNamespace(host, port, 'ping', {});
  var timestamp = Date.now();
  var key = timestamp;
  pingCallback[key] = function (err, spent, timestamp) {
    delete pingCallback[key];
    callback(err, spent, timestamp);
  };
  self._setTimeout(function () {
    if (pingCallback[key]) {
      delete pingCallback[key];
      callback(new utils.TimeoutError());
    }
  }, self._options.responseTimeout);

  var buf = proto.pong.encode(proto.ACTION_PING, timestamp);
  self._socket.send(buf, 0, buf.length, port, host);
};

UDP.prototype.remote = function (host, port) {
  var self = this;
  return {
    send: function (data, callback) {
      return self.send(host, port, data, callback);
    },
    sendR: function (data, callback) {
      return self.sendR(host, port, data, callback);
    },
    ping: function (callback) {
      return self.ping(host, port, callback);
    }
  };
};

UDP.prototype.exit = function (callback) {
  var self = this;
  if (callback) self.once('exit', callback);
  self._socket.close();

  // 清理资源
  self.once('exit', function () {
    self._timeoutTids.forEach(function (tid) {
      clearTimeout(tid);
    });
    self._intervalTids.forEach(function (tid) {
      clearInterval(tid);
    });
    Object.keys(self).forEach(function (k) {
      self[k] = undefined;
    });
  });
};

module.exports = UDP;
