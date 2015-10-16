/**
 * lei-udp
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

exports.version = require('./package').version;

var UDP = require('./lib/udp');
exports.UDP = UDP;
exports.create = function (options) {
  return new UDP(options);
};
