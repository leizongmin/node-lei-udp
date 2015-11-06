## 安装

```bash
$ npm install lei-udp --save
```


## 使用方法

```javascript
var UDP = require('lei-udp');

// 创建实例
var socket = new UDP({
  type: 'udp4',             // 网络类型，可选udp4或udp6
  host: '127.0.0.1',        // IP地址
  port: 6789,               // 绑定端口，默认无
  maxRetry: 4,              // 数据包最大重试次数
  responseTimeout: 12000,   // 确认消息超时时间
  cacheTimeout: 90000,      // 缓存时间
  cleanCacheInterval: 200,  // 清理缓存程序执行时间间隔
  maxMessageSize: 548,      // UDP数据包最大长度
});

// 绑定端口，如果创建实例时已指定host和port，则以下参数可省略
socket.listen(host, port, callback);

// 测试网络延时
socket.ping(host, port, function (err, spent, timestamp) {
  if (err) console.error(err);
  else console.log('网络延时: %sms', spent);
});

// 发送数据（不检查是否发送成功）
socket.send(host, port, data, function (err, bytes) {
  if (err) console.error(err);
  console.log('发送了%s字节', bytes);
});

// 发送数据（可靠传输，确认数据是否发送成功）
socket.sendR(host, port, data, function (err, bytes, spent, retry) {
  if (err) console.error(err);
  console.log('发送了%s字节，耗时%sms，重试次数：%s', bytes, spent, retry);
});

// 关闭socket
socket.exit(function () {
  console.log('exited');
});

// 接收到数据
socket.on('data', function (addr, data) {
  console.log('接收到来自%s:%s的数据:%s', addr.host, addr.port, data);
});

// 出错事件
socket.on('error', function (err) {
  console.error(err);
});

// socket关闭
socket.on('exit', function () {
  console.log('exited');
});

// 绑定端口成功
socket.on('listening', function () {
  console.log('listening');
});

// 绑定目标IP地址和端口，发送数据时可省略地址信息
var a = socket.remote(host, port);
a.ping(callback);
a.send(data, callback);
a.sendR(data, callback);
```


## 协议

### 基本格式

1B              | ...
----------------|---
消息类型(action) | 数据(playload)

### Ping

1B            | 6B
--------------|----
`ACTION_PING` | 毫秒时间戳(timestamp)

### Pong

1B            | 6B
--------------|----
`ACTION_PONG` | 毫秒时间戳(timestamp) (原样返回Ping的时间戳)

说明：收到`ACTION_PING`消息后回复给对方一个`ACTION_PONG`消息

### 单个包无需确认的数据

1B              | ...
----------------|----
`ACTION_SINGLE` | 数据内容(data)

说明：接收到此消息后触发`data`事件

### 单个包需确认的数据

1B                       | 3B             | ...
-------------------------|----------------|----
`ACTION_SINGLE_RELIABLE` | 会话ID(session) | 数据内容(data)

说明：接收到此消息后触发`data`事件，并给对方回复`ACTION_SINGLE_CONFIRMED`消息

### 单个包数据确认

1B                        | 3B
--------------------------|----
`ACTION_SINGLE_CONFIRMED` | 会话ID(session)

说明：发送方收到此消息后执行回调，表示数据已发送成功

### 多个包无需确认的数据

1B             | 3B             | 4B           | 4B                 | ...
---------------|----------------|--------------|--------------------|----
`ACTION_MULTI` | 会话ID(session) | 包索引(index) | 秒时间戳(timestamp) | 数据内容(data)

### 多个包需确认的数据

1B                      | 3B             | 4B           | 4B                 | ...
------------------------|----------------|--------------|--------------------|----
`ACTION_MULTI_RELIABLE` | 会话ID(session) | 包索引(index) | 秒时间戳(timestamp) | 数据内容(data)

说明：接收到此消息后给对方回复`ACTION_MULTI_CONFIRMED`消息

### 多个包数据结束

1B                  | 3B            | 4B          | 4B
--------------------|---------------|-------------|---
`ACTION_MULTI_END` | 会话ID(session) | 包数量(size) | 秒时间戳(timestamp)

### 多个包需确认的数据结束

1B                          | 3B            | 4B          | 4B
----------------------------|---------------|-------------|---
`ACTION_MULTI_RELIABLE_END` | 会话ID(session) | 包数量(size) | 秒时间戳(timestamp)

说明：接收到此消息后给对方回复`ACTION_MULTI_END_CONFIRMED`消息

### 多个包数据确认

1B                       | 3B             | 4B
-------------------------|----------------|----
`ACTION_MULTI_CONFIRMED` | 会话ID(session) | 包索引(index)

### 多个包结束确认

1B                           | 3B
-----------------------------|----
`ACTION_MULTI_END_CONFIRMED` | 会话ID(session)

### 多包传输全部接收完毕确认

1B                           | 3B             | 4B
-----------------------------|----------------|----
`ACTION_MULTI_ALL_CONFIRMED` | 会话ID(session) | 包数量(size)

说明：当数据的所有包被接收，且收到结束消息后，给对方回复此消息，对方将执行回调函数表示发送成功

### 多包传输取消

1B                      | 3B
------------------------|----
`ACTION_MULTI_CANCELED` | 会话ID(session)

说明：发送方收到此消息将取消余下包的发送，并执行回调函数返回`send_canceled`错误；接收方收到此消息将清空该`session`的所有包缓存


## 配置

+ `UDP_MSG_SIZE` - **UDP数据包最大长度**，当数据长度超出此值时将被拆分为多个长度不超过此值的包来发送，默认`548`
+ `RESPONSE_TIMEOUT` - **确认消息超时时间**，当发送`*_RELIABLE`这类需要确认的数据包时，如果超过该时间还未收到对方的确认，则会尝试重新发送该数据包，默认`12000ms`
+ `MAX_RETRY` - **发送数据最大重试次数**，当重试次数超过该值将触发`send_failed`错误，该条消息所有数据包终止发送，默认`4`
+ `CACHE_TIMEOUT` - **缓存时间**，当接收到多个包的消息时，在未接收完所有包时会将已收到部分保存到内存中，当缓存时间超过该值时将数据包删除，并给对方发送一条`ACTION_MULTI_CANCELED`消息，默认`90000ms`
+ `CLEAN_CACHE_INTERVAL` - **清理缓存程序执行时间间隔**，默认`200ms`


## 原理

以下描述中，`A`表示数据发送方，`B`表示数据接收方。

### ping 测试网络延时

```javascript
socket.ping(host, port, function (err, spent, timestamp) {
  if (err) throw err;
  console.log('延时: %s, 发起时间戳: %s', spent, timestamp);
});
```

+ `A` send `PING,timestamp` --> `B`
+ `B` send `PONG, timestamp` --> `A`
+ `A`: ` callback(null, now - timestamp, timestamp)`
+ `A`: 超过`RESPONSE_TIMEOUT`未收到`PONG`消息，`callback(Error('timeout'))`

### send 发送不需要确认的数据

```javascript
socket.send(host, port, data, function (err) {
  if (err) throw err;
  console.log('已发送');
});
```

#### 发送

`data.length <= UDP_MSG_SIZE`（单个数据包）:

+ `A` send `ACTION_SINGLE,data` --> `B`
+ `A`: `callback(null)`

`data.length > UDP_MSG_SIZE`（拆分为多个数据包）:

+ A: `list = splitData(data, UDP_MSG_SIZE)`
+ `forEach(list as index => item)`: `A` send `ACTION_MULTI,session,index,timestamp,item` --> `B`
+ `A` send `ACTION_MULTI_END,session,size(list)` --> `B`
+ `A`: `callback(null)`

#### 接收

message `ACTION_SINGLE,data`:

+ `B` `emit('data', data)`

message `ACTION_MULTI,session,index,timestamp,data`:

+ `B`: `cache.data[session][index] = data`
+ `B`: `checkMulti(session)`

message `ACTION_MULTI_END,size`:

+ `B`: `cache.size[session] = size`
+ `B`: `checkMulti(session)`

```javascript
function checkMulti (session) {
  var size = cache.size[session];
  if (size > 0) {
    // 检查所有包是否接收完整
    // 触发data事件
    emit('data', concatList(cache.list[session]));
  }
}
```


### sendR 发送需要确认的数据

```javascript
socket.sendR(host, port, data, function (err) {
  if (err) throw err;
  console.log('已发送');
});
```

#### 发送

`data.length <= UDP_MSG_SIZE`（单个数据包）:

+ `A` send `ACTION_SINGLE_RELIABLE,session,data` --> `B`
+ `B` send `ACTION_SINGLE_CONFIRMED,session` --> `A`
+ `A`: `callback(null)`

`data.length > UDP_MSG_SIZE`（拆分为多个数据包）:

+ A: `list = splitData(data, UDP_MSG_SIZE)`
+ `forEach(list as index => item)`: `A` send `ACTION_MULTI_RELIABLE,session,index,timestamp,item` --> `B`
+ `A` send `ACTION_MULTI_RELIABLE_END,session,size(list)` --> `B`
+ `A`: on message `ACTION_MULTI_ALL_CONFIRMED,session,size`: `callback(null)`

#### 接收

message `ACTION_SINGLE_RELIABLE,session,data`:

+ `B` `emit('data', data)`
+ `B` send `ACTION_SINGLE_CONFIRMED,session` --> `A`

message `ACTION_MULTI,session,index,timestamp,data`:

+ `B`: `cache.data[session][index] = data`
+ `B`: `checkMulti(session)`
+ `B` send `ACTION_MULTI_CONFIRMED,session,index` --> `A`

message `ACTION_MULTI_END,size`:

+ `B`: `cache.size[session] = size`
+ `B`: `checkMulti(session)`
+ `B` send `ACTION_MULTI_END_CONFIRMED,session` --> `A`

```javascript
function checkMulti (session) {
  var size = cache.size[session];
  if (size > 0) {
    // 检查所有包是否接收完整
    // 触发data事件
    emit('data', concatList(cache.list[session]));
    // 回复ACTION_MULTI_ALL_CONFIRMED
    reply(ACTION_MULTI_ALL_CONFIRMED, session, size);
  }
}
```


## The MIT License

```
The MIT License (MIT)

Copyright (c) 2015 Zongmin Lei <leizongmin@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
