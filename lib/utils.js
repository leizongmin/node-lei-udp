/**
 * lei-udp
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var util = require('util');
var events = require('events');
var createDebug = require('debug');


exports.debug = function (name) {
  return createDebug('lei-udp:' + name);
};
var debug = exports.debug('utils');

exports.inheritsEventEmitter = function (fn) {
  util.inherits(fn, events.EventEmitter);
};

// 拆分Buffer
exports.splitBuffer = function (buf, size) {
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
};

// 合并Buffer
exports.concatBuffer = function (list) {
  return Buffer.concat(list);
};

// 取得秒时间戳
exports.getSecondTimestamp = function () {
  return parseInt(Date.now() / 1000, 10);
};

// 发送超时错误
exports.TimeoutError = function () {
  var err = new Error('timeout');
  err.code = 'ETIMEOUT';
  return err;
};

exports.generateFailProbFn = function (prob) {
  if (prob > 0) {
    debug('generateFailProbFn: prob=%s, yes', prob);
    return function () {
      return (Math.random() > prob);
    };
  } else {
    debug('generateFailProbFn: prob=%s, no', prob);
    return function () { return true; };
  }
};
