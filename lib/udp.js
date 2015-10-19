/**
 * lei-udp
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var util = require('util');
var events = require('events');
var async = require('async');
var createDebug = require('debug');
var debug = createDebug('lei-udp:main');


// 拆分Buffer
function splitBuffer (buf, size) {
  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf.toString());
  var list = [];
  for (var i = 0, j = 0; j = i + size; i = j) {
    var b = buf.slice(i, j);
    if (b.length > 0) {
      list.push(b);
    } else {
      break;
    }
  }
  return list;
}

// 合并Buffer
function concatBuffer (list) {
  return Buffer.concat(list);
}

// 定义数据包类型
var ACTION_SEND_SINGLE = 1;
var ACTION_SEND_MULTI = 2;
var ACTION_SEND_MULTI_END = 3;
var ACTION_SEND_SINGLE_SAFE = 4;
var ACTION_SEND_MULTI_SAFE = 5;
var ACTION_SEND_MULTI_SAFE_END = 6;
var ACTION_RESPONSE_SINGLE = 7;
var ACTION_RESPONSE_MULTI = 8;
var ACTION_PING = 9;
var ACTION_PONG = 10;

// 最大UDP消息长度
var DEFAULT_UDP_MSG_SIZE = 576 - 20 - 8;
// SESSION_ID最大值
var MAX_SESSION_ID_VALUE = Math.pow(2, 24) - 1;

// 默认重试次数
var DEFAULT_MAX_RETRY = 4;
// 数据块确认超时时间
var DEFAULT_RESPONSE_TIMEOUT = 12000;
// 发送数据缓存时间
var DEFAULT_CACHE_TIMEOUT = 90000;
// 清理缓存任务执行执行周期
var DEFAULT_CLEAN_CACHE_INTERVAL = 200;


// 取得秒时间戳
function getSecondTimestamp () {
  return parseInt(Date.now() / 1000, 10);
}

// 组装数据包
function packDataMessage (action, session, index, timestamp, data) {
  var buf = new Buffer(12 + data.length);
  buf.writeUInt8(action, 0);
  buf.writeUIntBE(session, 1, 3);
  buf.writeUInt32BE(index, 4);
  buf.writeUInt32BE(timestamp, 8);
  data.copy(buf, 12);
  return buf;
}

// 拆数据包
function unpackDataMessage (buf) {
  return {
    action: buf.readUInt8(0),
    session: buf.readUIntBE(1, 3),
    index: buf.readUInt32BE(4),
    timestamp: buf.readUInt32BE(8),
    data: buf.slice(12)
  };
}

function packResponseMessage () {

}

function packPingMessage (action, timestamp) {
  var buf = new Buffer(7);
  buf.writeUInt8(action, 0);
  buf.writeUIntBE(timestamp, 1, 6);
  return buf;
}

function unpackPingMessage (buf) {
  return {
    action: buf.readUInt8(0),
    timestamp: buf.readUIntBE(1, 6);
  };
}

// 读取数据包的action信息
function readMessageAction (buf) {
  return buf.readUInt8(0);
}

// 发送超时错误
function TimeoutError () {
  var err = new Error('timeout');
  err.code = 'ETIMEOUT';
  return err;
}


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
  options.type = options.type || 'udp4';
  options.host = options.host || 'localhost';
  options.maxRetry = options.maxRetry || DEFAULT_MAX_RETRY;
  options.responseTimeout = options.responseTimeout || DEFAULT_RESPONSE_TIMEOUT;
  options.cacheTimeout = options.cacheTimeout || DEFAULT_CACHE_TIMEOUT;
  options.cleanCacheInterval = options.cleanCacheInterval || DEFAULT_CLEAN_CACHE_INTERVAL;
  options.maxMessageSize = options.maxMessageSize || DEFAULT_UDP_MSG_SIZE;
  this._options = options;

  this._debug = createDebug('lei-udp:#' + UDP._counter++);
  this._sessionId = 0;
  this._cacheKeys = {};
  this._cacheList = [];

  this._startCleanCache();

  this._socket = dgram.createSocket(options.type);
  if (options.port) this.bind(options.host, options.port);
  this._bindSocketEvents();
}

util.inherits(fn, events.EventEmitter);

UDP._counter = 0;

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
        if (info.callback) info.callback(new TimeoutError());
      }
    }

  }, self._options.cleanCacheInterval);
};

UDP.prototype._bindSocketEvents = function () {
  var self = this;

  self._socket.on('listening', function () {
    self._listening = true;
    self._debug('listening: host=%s, port=%s', self._options.host, self._options.port);
    self.emit('listening');
  });

  self._socket.on('error', function (err) {
    self._debug('on error: err=%s', err);
    self.emit('error', err);
  });

  self._socket.on('close', function () {
    self._debug('server closed');
    self.emit('exit');
  });

  function formatAddress (addr) {
    return {host: addr.address, port: addr.port};
  }

  server.on('message', function (buf, addr) {
    addr = formatAddress(addr);
    var action = readMessageAction(buf);
    self._debug('received %d bytes from %s:%d, action=%s', buf.length, addr.host, addr.port, action);
    switch (action) {

      case ACTION_SEND_SINGLE:
        receivedSingleData(false, unpackDataMessage(buf), addr);
        break;

      case ACTION_SEND_SINGLE_SAFE:
        receivedSingleData(true, unpackDataMessage(buf), addr);
        break;

      case ACTION_SEND_MULTI:
        receivedMultiData(false, unpackDataMessage(buf), addr);
        break;

      case ACTION_SEND_MULTI_SAFE:
        receivedMultiData(true, unpackDataMessage(buf), addr);
        break;

      case ACTION_SEND_MULTI_END:
        receivedMultiDataEnd(false, unpackDataMessage(buf), addr);
        break;

      case ACTION_SEND_MULTI_SAFE_END:
        receivedMultiDataEnd(true, unpackDataMessage(buf), addr);
        break;

      case ACTION_RESPONSE_SINGLE:
        receviedResponseSingle(unpackDataMessage(buf), addr);
        break;

      case ACTION_RESPONSE_MULTI:
        receviedResponseMulti(unpackDataMessage(buf), addr);
        break;

      case ACTION_PING:
        receivedPing(buf, addr);
        break;

      case ACTION_PONG:
        receivedPong(buf, addr);
        break;

      default:
        self._debug('unknown message action: %s', info.action);
    }
  });

  function receivedSingleData (isSafe, info, addr) {
    self.emit('data', addr, info.data);

    if (isSafe) {

    }
  }

  function receivedMultiData (isSafe, info, addr) {

  }

  function receivedMultiDataEnd (isSafe, info, addr) {

  }

  function receviedResponseSingle (isSafe, info, addr) {

  }

  function receviedResponseMulti (isSafe, info, addr) {

  }

  function receivedPing (buf, addr) {

  }

  function receivedPong (buf, addr) {

  }
};

UDP.prototype._getSessionId = function () {
  this._sessionId++;
  if (this._sessionId >= MAX_SESSION_ID_VALUE) this._sessionId = 0;
  return this._sessionId;
};

UDP.prototype.bind = function (host, port, callback) {
  this._debug('bind: host=%s, port=%s', host, port);
  this._socket.bind({
    address: host,
    port: port
  });
};

UDP.prototype.send = function (host, port, data, callback) {
  this._send(false, host, port, data, callback);
};

UDP.prototype.sendSafe = function (host, port, data, callback) {
  this._send(true, host, port, data, callback);
};

UDP.prototype._send = function (isSafe, host, port, data, callback) {
  this._debug('send: isSafe=%s, host=%s, port=%s, data=%s', isSafe, host, port, data);
  var self = this;

  if (!Buffer.isBuffer(data)) data = new Buffer(data.toString());

  var dataList = splitBuffer(data, self._options.maxMessageSize);
  var action;
  if (dataList.length === 1) action = ACTION_SEND_SINGLE;
  else action = ACTION_SEND_MULTI;
  if (isSafe) action += 1;

  var session = self._getSessionId();

  var index = -1;
  async.eachSeries(dataList, function (data, next) {

    index++;
    var timestamp = getSecondTimestamp();
    var buf = packDataMessage(action, session, index, timestamp, data);
    self._socket.send(buf, 0, buf.length, port, host, next);

  }, function (err) {
    if (err) return callback(err);

    if (!isSafe) return callback(null, data.length);

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

UDP.prototype.ping = function (host, port, callback) {
  return callback(null, -1);
};

UDP.prototype.remote = function (host, port) {
  var self = this;
  return {
    send: function (data, callback) {
      return self.send(host, port, data, callback);
    },
    sendSafe: function (data, callback) {
      return self.sendSafe(host, port, data, callback);
    },
    ping: function (callback) {
      return self.ping(host, port, callback);
    }
  };
};

module.exports = UDP;
