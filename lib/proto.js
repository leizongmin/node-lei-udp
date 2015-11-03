/**
 * lei-udp
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */



var DATA_TYPES = ['int', 'uint', 'float', 'double', 'string', 'buffer'];

function NotSupportDataType (parameter, type) {
  var err = new Error('not support type `' + type + '`');
  err.code = 'NOT_SUPPORT_TYPE';
  err.parameter = parameter;
  err.type = type;
  return err;
}

function IncorrectDataType (parameter, type) {
  var err = new Error('`' + parameter + '` is not a ' + type);
  err.code = 'INCORRECT_TYPE';
  err.parameter = parameter;
  err.type = type;
  return err;
}

function IncorrectDataSize (parameter, size) {
  var err = new Error('incorrect size for `' + parameter + '`');
  err.code = 'INCORRECT_DATA_SIZE';
  err.parameter = parameter;
  err.size = size;
  return err;
}

function IncorrectBufferSize (expectedSize, actualSize) {
  var err = new Error('incorrect buffer size, expected >= ' + expectedSize + ', actual = ' + actualSize);
  err.code = 'INCORRECT_BUFFER_SIZE';
  err.expectedSize = expectedSize;
  err.actualSize = actualSize;
  return err;
}


/*
  proto = [['a', 'uint', 2, 'be'], ['b', 'uint', 4, 'le'], ['c', 'buffer', 10], ['d', 'string', 5]]

  function encode (a, b, c, d) {
    if (isNaN(a)) throw new IncorrectDataType('a', 'uint');
    if (isNaN(b)) throw new IncorrectDataType('b', 'uint');
    if (!Buffer.isBuffer(c)) IncorrectDataType('c', 'buffer');
    if (typeof d !== 'string') IncorrectDataType('d', 'string');

    var $buf = new Buffer(21);
    var $offset = 0;
    $buf.writeUInt16BE(a, $offset);
    $offset += 2;
    $buf.writeUInt32LE(b, $offset);
    $offset += 4;
    c.copy($buf, $offset, 0, 10);
    $offset += 10;
    $buf.write(d, $offset, 5);

    return $buf;
  }

  function decode ($buf) {
    if ($buf.length < 21) throw new IncorrectBufferSize(21, $buf.length);
    return {
      a: $buf.readUInt16BE(0),
      b: $buf.readUInt32LE(2),
      c: $buf.slice(6, 16),
      d: $buf.slice(16, 21).toString()
    };
  }
*/
function parseProto (list) {
  var encodeArgs = [];
  var encodeCheck = [];
  var encodeBody = [];
  var decodeBody = [];
  var offset = 0;

  list.forEach(function (item, i) {
    var name = String(item[0]);
    var type = String(item[1]).toLowerCase();
    var size = Number(item[2]);
    var bytes = String(item[3]).toUpperCase();
    if (!(size > 0)) size = 0;
    if (bytes !== 'LE') bytes = 'BE';
    if (type === 'float') size = 4;
    if (type === 'double') size = 8;

    if (DATA_TYPES.indexOf(type) === -1) throw new NotSupportDataType(name, type);

    if (type === 'string' || type === 'buffer') {
      if (size < 1 && i < list.length - 1) {
        throw new IncorrectDataSize(name, size);
      }
    }

    encodeArgs.push(name);
    switch (type) {
      case 'int':
        encodeCheck.push('if (isNaN(' + name + ')) throw new IncorrectDataType("' + name + '", "' + type + '");');
        if (size === 1) {
          encodeBody.push('$buf.writeUInt8(' + name + ', ' + offset + ');');
          decodeBody.push(name + ': $buf.readUInt8(' + offset + ')');
        } else if (size === 2) {
          encodeBody.push('$buf.writeInt16' + bytes + '(' + name + ', ' + offset + ');');
          decodeBody.push(name + ': $buf.readInt16' + bytes + '(' + offset + ')');
        } else if (size === 4) {
          encodeBody.push('$buf.writeInt32' + bytes + '(' + name + ', ' + offset + ');');
          decodeBody.push(name + ': $buf.readInt32' + bytes + '(' + offset + ')');
        } else {
          encodeBody.push('$buf.writeInt' + bytes + '(' + name + ', ' + offset + ', ' + size + ');');
          decodeBody.push(name + ': $buf.readInt' + bytes + '(' + offset + ', ' + size + ')');
        }
        break;
      case 'uint':
        encodeCheck.push('if (isNaN(' + name + ')) throw new IncorrectDataType("' + name + '", "' + type + '");');
        if (size === 1) {
          encodeBody.push('$buf.writeUInt8(' + name + ', ' + offset + ');');
          decodeBody.push(name + ': $buf.readUInt8(' + offset + ')');
        } else if (size === 2) {
          encodeBody.push('$buf.writeUInt16' + bytes + '(' + name + ', ' + offset + ');');
          decodeBody.push(name + ': $buf.readUInt16' + bytes + '(' + offset + ')');
        } else if (size === 4) {
          encodeBody.push('$buf.writeUInt32' + bytes + '(' + name + ', ' + offset + ');');
          decodeBody.push(name + ': $buf.readUInt32' + bytes + '(' + offset + ')');
        } else {
          encodeBody.push('$buf.writeUInt' + bytes + '(' + name + ', ' + offset + ', ' + size + ');');
          decodeBody.push(name + ': $buf.readUInt' + bytes + '(' + offset + ', ' + size + ')');
        }
        break;
      case 'float':
        encodeCheck.push('if (isNaN(' + name + ')) throw new IncorrectDataType("' + name + '", "' + type + '");');
        encodeBody.push('$buf.writeFloat' + bytes + '(' + name + ', ' + offset + ');');
        decodeBody.push(name + ': $buf.readFloat' + bytes + '(' + offset + ')');
        break;
      case 'double':
        encodeCheck.push('if (isNaN(' + name + ')) throw new IncorrectDataType("' + name + '", "' + type + '");');
        encodeBody.push('$buf.writeDouble' + bytes + '(' + name + ', ' + offset + ');');
        decodeBody.push(name + ': $buf.readDouble' + bytes + '(' + offset + ')');
        break;
      case 'string':
        encodeCheck.push('if (typeof ' + name + ' !== "string") throw new IncorrectDataType("' + name + '", "' + type + '");');
        if (size > 0) {
          encodeBody.push('new Buffer(' + name + ').copy($buf, ' + offset + ', 0, ' + size + ')');
          decodeBody.push(name + ': $buf.slice(' + offset + ', ' + (offset + size) + ').toString()');
        } else {
          encodeBody.push('new Buffer(' + name + ').copy($buf, ' + offset + ', 0).toString()');
          decodeBody.push(name + ': $buf.slice(' + offset + ')');
        }
        break;
      case 'buffer':
        encodeCheck.push('if (!Buffer.isBuffer(' + name + ')) throw new IncorrectDataType("' + name + '", "' + type + '");');
        if (size > 0) {
          encodeBody.push(name + '.copy($buf, ' + offset + ', 0, ' + size + ')');
          decodeBody.push(name + ': $buf.slice(' + offset + ', ' + (offset + size) + ')');
        } else {
          encodeBody.push(name + '.copy($buf, ' + offset + ', 0)');
          decodeBody.push(name + ': $buf.slice(' + offset + ')');
        }
        break;
      default:
        throw new NotSupportDataType(name, type);
    }

    offset += size;
  });

  var lastItemSize = Number(list[list.length - 1][2]);
  var lastItemName = list[list.length - 1][0];
  var encodeSource = '(function (' + encodeArgs.join(', ') + ') {\n' +
                     encodeCheck.join('\n') + '\n' +
                     'var $buf = new Buffer(' + (lastItemSize > 0 ? offset : offset + ' + ' + lastItemName + '.length') + ')\n' +
                     encodeBody.join('\n') + '\n' +
                     'return $buf;\n' +
                     '})';
  var decodeSource = '(function ($buf) {\n' +
                     'if ($buf.length < ' + offset + ') throw new IncorrectBufferSize(' + offset + ', $buf.length);\n' +
                     'return {\n' +
                     decodeBody.join(',\n') + '\n' +
                     '};\n' +
                     '})';

  return {encode: eval(encodeSource), decode: eval(decodeSource)};
}


var ret = parseProto([
  ['a', 'int', 1],
  ['b', 'int', 2],
  ['c', 'int', 3],
  ['d', 'int', 4],
  ['e', 'uint', 1],
  ['f', 'uint', 2],
  ['g', 'uint', 3],
  ['h', 'uint', 4],
  ['i', 'float'],
  ['j', 'double'],
  ['k', 'string', 30],
  ['l', 'buffer', 10]
]);
console.log(ret.encode.toString());
console.log(ret.decode.toString());

var b = ret.encode(1, 2, 3, 4, 5, 6, 7, 8, 9.5, 10.10, '今天的天气真好', new Buffer('xxxx2xxxx2xxxx0'));
console.log(b);
console.log(new Buffer('xxxx2xxxx2xxxx0'))

var c = ret.decode(b);
console.log(c);

var c = ret.decode(b.slice(0, -1));
console.log(c);

