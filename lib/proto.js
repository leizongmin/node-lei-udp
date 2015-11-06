/**
 * lei-udp
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var parseProto = require('lei-proto');


exports.ACTION_PING = 1;
exports.ACTION_PONG = 2;
exports.ACTION_SINGLE = 3;
exports.ACTION_SINGLE_RELIABLE = 4;
exports.ACTION_SINGLE_CONFIRMED = 5;
exports.ACTION_MULTI = 6;
exports.ACTION_MULTI_RELIABLE = 7;
exports.ACTION_MULTI_END = 8;
exports.ACTION_MULTI_RELIABLE_END = 9;
exports.ACTION_MULTI_CONFIRMED = 10;
exports.ACTION_MULTI_END_CONFIRMED = 11;
exports.ACTION_MULTI_ALL_CONFIRMED = 12;
exports.ACTION_MULTI_CANCELED = 13;

exports.message = parseProto([
  ['action', 'uint', 1],
  ['playload', 'buffer']
]);

exports.ping = parseProto([
  ['action', 'uint', 1],
  ['timestamp', 'uint', 6]
]);

exports.pong = parseProto([
  ['action', 'uint', 1],
  ['timestamp', 'uint', 6]
]);

exports.single = parseProto([
  ['action', 'uint', 1],
  ['data', 'buffer']
]);

exports.singleReliable = parseProto([
  ['action', 'uint', 1],
  ['session', 'uint', 3],
  ['data', 'buffer']
]);

exports.singleConfirmed = parseProto([
  ['action', 'uint', 1],
  ['session', 'uint', 3]
]);

exports.multi = parseProto([
  ['action', 'uint', 1],
  ['session', 'uint', 3],
  ['index', 'uint', 4],
  ['timestamp', 'uint', 4],
  ['data', 'buffer']
]);

exports.multiReliable = parseProto([
  ['action', 'uint', 1],
  ['session', 'uint', 3],
  ['index', 'uint', 4],
  ['timestamp', 'uint', 4],
  ['data', 'buffer']
]);

exports.multiEnd = parseProto([
  ['action', 'uint', 1],
  ['session', 'uint', 3],
  ['size', 'uint', 4],
  ['timestamp', 'uint', 4]
]);

exports.multiReliableEnd = parseProto([
  ['action', 'uint', 1],
  ['session', 'uint', 3],
  ['size', 'uint', 4],
  ['timestamp', 'uint', 4]
]);

exports.multiConfirmed = parseProto([
  ['action', 'uint', 1],
  ['session', 'uint', 3],
  ['index', 'uint', 4]
]);

exports.multiEndConfirmed = parseProto([
  ['action', 'uint', 1],
  ['session', 'uint', 3]
]);

exports.multiAllConfirmed = parseProto([
  ['action', 'uint', 1],
  ['session', 'uint', 3],
  ['size', 'uint', 4]
]);

exports.multiCanceled = parseProto([
  ['action', 'uint', 1],
  ['session', 'uint', 3]
]);

