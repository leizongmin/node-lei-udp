/**
 * lei-udp
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var UDP = require('./lib/udp');
module.exports = exports = UDP;

exports.version = require('./package').version;

exports.create = function (options) {
  return new UDP(options);
};
