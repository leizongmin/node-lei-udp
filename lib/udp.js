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

  /*
  this._cacheKeys = {};
  this._cacheList = [];
  this._startCleanCache();
  */

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
    console.log(addr, buf);
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

      default:
        debug('unknown message action: %s', action);
    }
  });

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
};

UDP.prototype._getSessionId = function () {
  this._sessionId++;
  if (this._sessionId >= MAX_SESSION_ID_VALUE) this._sessionId = 0;
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
UDP.prototype.send = function (host, port, data, callback) {
  this._send(false, host, port, data, callback);
};

UDP.prototype.sendR = function (host, port, data, callback) {
  this._send(true, host, port, data, callback);
};

UDP.prototype._send = function (isReliable, host, port, data, callback) {
  this._debug('send: isReliable=%s, host=%s, port=%s, data=%s', isReliable, host, port, data);
  var self = this;

  if (!Buffer.isBuffer(data)) data = new Buffer(data.toString());

  var dataList = splitBuffer(data, self._options.maxMessageSize);
  var action;
  if (dataList.length === 1) action = ACTION_SEND_SINGLE;
  else action = ACTION_SEND_MULTI;
  if (isReliable) action += 1;

  var session = self._getSessionId();

  var index = -1;
  async.eachSeries(dataList, function (data, next) {

    index++;
    var timestamp = getSecondTimestamp();
    var buf = packDataMessage(action, session, index, timestamp, data);
    self._socket.send(buf, 0, buf.length, port, host, next);

  }, function (err) {
    if (err) return callback(err);

    if (!isReliable) return callback(null, data.length);

    // 添加到缓存中
    var key = [host, port, session].join(':');
    var cacheInfo = {
      key: key,
      timestamp: Date.now(),
      dataList: dataList.map(function (item) {
        return {OK: false, buf: item};
      },
      callback: callback
    };
    self._cacheKeys[key] = cacheInfo;
    self._cacheList.push(cacheInfo);
  });
};
*/
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
