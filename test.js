process.env.DEBUG = 'lei-udp:*';

var UDP = require('./');
console.log(UDP);

var udp = UDP.create({
  responseTimeout: 1000,
  cacheTimeout: 5000
});
console.log(udp);

function takeChar (n, c) {
  var s = '';
  for (var i = 0; i < n; i++) {
    s += c;
  }
  return s;
}

udp.bind('127.0.0.1', 5555, function (err) {
  if (err) throw err;
  console.log('listening');

  //udp.ping('127.0.0.1', 5555, console.log);

  setTimeout(function () {
    udp.exit(function () {
      console.log('exited');
    })
  }, 6000);

  var remote = udp.remote('127.0.0.1', 5555);

  udp.on('exit', function () {
    console.log(udp._remoteNamespace);
  });

  udp.on('data', function (addr, data) {
    console.log('on data', addr, data.length, data.toString());
  });

  remote.send(takeChar(100, 'a'), function () {
    console.log('sent', arguments);
  });
  remote.send(takeChar(2000, 'b'), function () {
    console.log('sent', arguments);
  });

  remote.sendR(takeChar(200, 'c'), function () {
    console.log('sent(R)', arguments);
  });
  remote.sendR(takeChar(1000, 'd'), function () {
    console.log('sent(R)', arguments);
  });

});

