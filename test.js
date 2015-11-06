process.env.DEBUG = 'lei-udp:*';

var UDP = require('./');
console.log(UDP);

var udp = UDP.create();
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
  }, 1000);

  udp.on('data', function (addr, data) {
    console.log('on data', addr, data.length, data.toString());
  });

  udp.send('127.0.0.1', 5555, takeChar(100, 'a'), console.log);
  udp.send('127.0.0.1', 5555, takeChar(2000, 'b'), console.log);

});

