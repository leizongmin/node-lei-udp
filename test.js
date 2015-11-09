process.env.DEBUG = 'lei-udp:*';

var util = require('util');
var UDP = require('./');
console.log(UDP);

var udp = UDP.create({
  responseTimeout: 1000,
  cacheTimeout: 5000,
  pocketLossProb: 0.5
});
console.log(udp);

function dump (obj) {
  console.log(util.inspect(obj, {depth: 10}));
}

function takeChar (n, c) {
  var s = '';
  for (var i = 0; i < n; i++) {
    s += c;
  }
  return s;
}

var callback = {a: 0, b: 0, c: 0, d: 0};
udp.bind('127.0.0.1', 5555, function (err) {
  if (err) throw err;
  console.log('listening');

  //udp.ping('127.0.0.1', 5555, console.log);

  setTimeout(function () {
    udp.exit(function () {
      console.log('exited');
    })
  }, 10000);

  var remote = udp.remote('127.0.0.1', 5555);

  udp.on('exit', function () {
    dump(udp._remoteNamespace);
    dump(callback);
  });

  udp.on('data', function (addr, data) {
    console.log('on data', addr, data.length, data.toString());
  });

  remote.send(takeChar(100, 'a'), function () {
    callback.a++;
    console.log('sent', arguments);
  });
  remote.send(takeChar(2000, 'b'), function () {
    callback.b++;
    console.log('sent', arguments);
  });

  remote.sendR(takeChar(200, 'c'), function () {
    callback.c++;
    console.log('sent(R)', arguments);
  });
  remote.sendR(takeChar(1000, 'd'), function () {
    callback.d++;
    console.log('sent(R)', arguments);
  });

});

