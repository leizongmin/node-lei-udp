/**
 * lei-udp tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var support = require('./support');


describe('sendR()', function () {

  it('send simple data', function (done) {
    var address = support.getListenAddress();
    var s, c1, c2;

    var msg1 = support.randomString(20);
    var msgBuf1 = new Buffer(msg1);
    var msg2 = support.randomString(20);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createSocket(address);
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
        s.on('data', function (addr, d) {
          serverData.push([addr, d]);
          s.sendR(addr.host, addr.port, msgBuf1);
        });
      },
      function (next) {
        // 客户端发送数据
        c1 = support.createSocket();
        c1.sendR(address.host, address.port, msgBuf2, next);
        c1.on('data', function (addr, d) {
          clientData.push([addr, d]);
        });
      },
      function (next) {
        // 客户端连接
        c2 = support.createSocket();
        c2.sendR(address.host, address.port, msgBuf2);
        c2.sendR(address.host, address.port, msgBuf2, next);
        c2.on('data', function (addr, d) {
          clientData.push([addr, d]);
        });
      },
      support.wait(200),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, 3);
        assert.equal(clientData.length, 3);
        serverData.forEach(function (item) {
          assert.equal(item[1].length, msgBuf1.length);
          assert.equal(item[1].toString(), msg2);
        });
        clientData.forEach(function (item) {
          assert.equal(item[1].length, msgBuf2.length);
          assert.equal(item[1].toString(), msg1);
          assert.equal(item[0].port, address.port);
          assert.equal(item[0].host, address.host);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, c2, s, next);
      }
    ], done);
  });

  it('send simple data (string)', function (done) {
    var address = support.getListenAddress();
    var s, c1, c2;

    var msg1 = support.randomString(20);
    var msgBuf1 = new Buffer(msg1);
    var msg2 = support.randomString(20);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createSocket(address);
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
        s.on('data', function (addr, d) {
          serverData.push([addr, d]);
          s.sendR(addr.host, addr.port, msgBuf1.toString());
        });
      },
      function (next) {
        // 客户端发送数据
        c1 = support.createSocket();
        c1.sendR(address.host, address.port, msgBuf2, next);
        c1.on('data', function (addr, d) {
          clientData.push([addr, d]);
        });
      },
      function (next) {
        // 客户端连接
        c2 = support.createSocket();
        c2.sendR(address.host, address.port, msgBuf2.toString());
        c2.sendR(address.host, address.port, msgBuf2, next);
        c2.on('data', function (addr, d) {
          clientData.push([addr, d]);
        });
      },
      support.wait(200),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, 3);
        assert.equal(clientData.length, 3);
        serverData.forEach(function (item) {
          assert.equal(item[1].length, msgBuf1.length);
          assert.equal(item[1].toString(), msg2);
        });
        clientData.forEach(function (item) {
          assert.equal(item[1].length, msgBuf2.length);
          assert.equal(item[1].toString(), msg1);
          assert.equal(item[0].port, address.port);
          assert.equal(item[0].host, address.host);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, c2, s, next);
      }
    ], done);
  });

  it('send big data', function (done) {
    var len = 65536 * 1;
    var address = support.getListenAddress();
    address.maxMessageSize = 5000;
    var s, c1, c2;

    var msg1 = support.randomString(len);
    var msgBuf1 = new Buffer(msg1);
    var msg2 = support.randomString(len);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createSocket(address);
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
        s.on('data', function (addr, d) {
          serverData.push([addr, d]);
          s.sendR(addr.host, addr.port, msgBuf1);
        });
      },
      function (next) {
        // 客户端发送数据
        c1 = support.createSocket({maxMessageSize: 1500});
        c1.sendR(address.host, address.port, msgBuf2);
        c1.sendR(address.host, address.port, msgBuf2);
        c1.sendR(address.host, address.port, msgBuf2);
        c1.sendR(address.host, address.port, msgBuf2);
        c1.sendR(address.host, address.port, msgBuf2, next);
        c1.on('data', function (addr, d) {
          clientData.push([addr, d]);
        });
      },
      function (next) {
        // 客户端连接
        c2 = support.createSocket({maxMessageSize: 3000});
        c2.sendR(address.host, address.port, msgBuf2);
        c2.sendR(address.host, address.port, msgBuf2);
        c2.sendR(address.host, address.port, msgBuf2);
        c2.sendR(address.host, address.port, msgBuf2);
        c2.sendR(address.host, address.port, msgBuf2, next);
        c2.on('data', function (addr, d) {
          clientData.push([addr, d]);
        });
      },
      support.wait(1000),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, 10);
        assert.equal(clientData.length, 10);
        serverData.forEach(function (item) {
          assert.equal(item[1].length, msgBuf1.length);
          assert.equal(item[1].toString(), msg2);
        });
        clientData.forEach(function (item) {
          assert.equal(item[1].length, msgBuf2.length);
          assert.equal(item[1].toString(), msg1);
          assert.equal(item[0].port, address.port);
          assert.equal(item[0].host, address.host);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, c2, s, next);
      }
    ], done);
  });

  it('send small data many times', function (done) {
    var address = support.getListenAddress();
    var s, c1;

    var len = 100;
    var times = 10000;
    var msg1 = support.randomString(len);
    var msgBuf1 = new Buffer(msg1);
    var msg2 = support.randomString(len);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createSocket(address);
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
        s.on('data', function (addr, d) {
          serverData.push([addr, d]);
          s.sendR(addr.host, addr.port, msgBuf1);
        });
      },
      function (next) {
        // 客户端连接
        c1 = support.createSocket();

        c1.on('data', function (addr, d) {
          clientData.push([addr, d]);
          if (clientData.length >= times) {
            allDone(done2 = true);
          }
        });

        var done1 = false;
        var done2 = false;
        function allDone () {
          if (done1 && done2) {
            next();
          }
        }

        var counter = 0;
        function callback (err) {
          assert.equal(err, null);
          counter++;
          if (counter >= times) {
            allDone(done1 = true);
          }
        }
        for (var i = 0; i < times; i++) {
          setTimeout(function () {
            c1.sendR(address.host, address.port, msgBuf2, callback);
          }, i);
        }
      },
      support.wait(200),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, times);
        assert.equal(clientData.length, times);
        serverData.forEach(function (item) {
          assert.equal(item[1].length, msgBuf1.length);
          assert.equal(item[1].toString(), msg2);
        });
        clientData.forEach(function (item) {
          assert.equal(item[1].length, msgBuf2.length);
          assert.equal(item[1].toString(), msg1);
          assert.equal(item[0].port, address.port);
          assert.equal(item[0].host, address.host);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, s, next);
      }
    ], done);
  });

});
