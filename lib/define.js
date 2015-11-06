/**
 * lei-udp
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

// 最大UDP消息长度
exports.DEFAULT_UDP_MSG_SIZE = 576 - 20 - 8;
// SESSION_ID最大值
exports.MAX_SESSION_ID_VALUE = Math.pow(2, 24) - 1;

// 默认重试次数
exports.DEFAULT_MAX_RETRY = 4;
// 数据块确认超时时间
exports.DEFAULT_RESPONSE_TIMEOUT = 12000;
// 发送数据缓存时间
exports.DEFAULT_CACHE_TIMEOUT = 90000;
// 清理缓存任务执行执行周期
exports.DEFAULT_CLEAN_CACHE_INTERVAL = 200;

// 默认网络类型
exports.DEFAULT_SOCKET_TYPE = 'udp4';
// 默认网络地址
exports.DEFAULT_HOST = 'localhost';
