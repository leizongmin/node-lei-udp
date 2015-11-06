process.env.DEBUG = 'lei-udp:*';

var UDP = require('./');
console.log(UDP);

var udp = UDP.create();
console.log(udp);

udp.bind('127.0.0.1', 5555, function (err) {
  if (err) throw err;
  console.log('listening');

  udp.ping('127.0.0.1', 5555, console.log);

  setTimeout(function () {
    udp.exit(function () {
      console.log('exited');
    })
  }, 1000);
});

