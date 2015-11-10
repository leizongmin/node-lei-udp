/**
 * lei-udp tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var support = require('./support');


describe('lei-udp', function () {

  it('ping', function (done) {
    var address = support.getListenAddress();
    var s, c1, c2;

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
        s.on('ping', function (addr) {
          s.remote(addr.host, addr.port).ping(function (err, delay) {
            assert.equal(err, null);
            serverData.push(delay);
          });
        });
      },
      function (next) {
        // 客户端连接
        c1 = support.createSocket();
        c1.remote(address.host, address.port).ping(function (err, delay) {
          clientData.push(delay);
          next(err);
        });
      },
      function (next) {
        // 客户端连接
        c2 = support.createSocket();
        c2.remote(address.host, address.port).ping(function (err, delay) {
          clientData.push(delay);
          next(err);
        });
      },
      support.wait(200),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, 2);
        assert.equal(clientData.length, 2);
        serverData.forEach(function (d) {
          assert.ok(d >= 0);
        });
        clientData.forEach(function (d) {
          assert.ok(d >= 0);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, c2, s, next);
      }
    ], done);
  });

  it('send', function (done) {
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
          s.remote(addr.host, addr.port).send(msgBuf1);
        });
      },
      function (next) {
        // 客户端发送数据
        c1 = support.createSocket();
        c1.remote(address.host, address.port).send(msgBuf2, next);
        c1.on('data', function (addr, d) {
          clientData.push([addr, d]);
        });
      },
      function (next) {
        // 客户端连接
        c2 = support.createSocket();
        c2.remote(address.host, address.port).send(msgBuf2);
        c2.remote(address.host, address.port).send(msgBuf2, next);
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

  it('sendR', function (done) {
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
          s.remote(addr.host, addr.port).sendR(msgBuf1);
        });
      },
      function (next) {
        // 客户端发送数据
        c1 = support.createSocket();
        c1.remote(address.host, address.port).sendR(msgBuf2, next);
        c1.on('data', function (addr, d) {
          clientData.push([addr, d]);
        });
      },
      function (next) {
        // 客户端连接
        c2 = support.createSocket();
        c2.remote(address.host, address.port).sendR(msgBuf2);
        c2.remote(address.host, address.port).sendR(msgBuf2, next);
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

});
