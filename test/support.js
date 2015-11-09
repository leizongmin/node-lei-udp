/**
 * clouds-socket test
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var assert = require('assert');
var os = require('os');
var path = require('path');
var async = require('async');
var utils = require('lei-utils');
var socket = require('../');


var basePort = 7001;
var unixDomainPath = path.resolve(os.tmpDir(), 'clouds-socket-' + Date.now() + '-');
var isUseUnixDomain = (process.env.TEST_USE_UNIX_DOMAIN == 'true');


global.async = async;
global.assert = assert;

exports.utils = utils;

exports.createSocket = function (options) {
  return socket.create(exports.mergeOptions(options));
};

exports.getListenAddress = function () {
  return {port: basePort++, host: '127.0.0.1'};
};

exports.mergeOptions = function (opts) {
  return utils.merge({
    responseTimeout: 80,
    cacheTimeout: 1000,
    cleanCacheInterval: 100
  }, opts || {});
};

exports.exit = function () {
  var args = Array.prototype.slice.call(arguments);
  var callback = args.pop();
  async.eachSeries(args, function (client, next) {
    client.exit(next);
  }, callback);
};

exports.wait = function (ms) {
  return function (next) {
    setTimeout(next, ms);
  };
};

exports.randomString = function (len) {
  var buf = new Buffer(len);
  for (var i = 0; i < len; i++) {
    var c = 96 + parseInt(Math.random() * 26, 10);
    buf[i] = c;
  }
  return buf.toString();
};
