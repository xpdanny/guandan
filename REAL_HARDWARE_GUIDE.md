# 真机设备硬件测试指南

## 📋 概览

本文档指导如何在真实的掼蛋麻将机（5G设备）上部署和测试通讯系统。

## 🔌 网络端口分配

| 用途 | 协议 | 开发环境 | 生产环境 | 说明 |
|------|------|--------|--------|------|
| 设备管理 API | HTTP/HTTPS | `192.168.1.100:8081` | `api.guandang-cloud.com:443` | 注册、心跳、状态、遥测 |
| 文件上传 | HTTP/HTTPS | `192.168.1.100:8082` | `upload.guandang-cloud.com:443` | 游戏截图、日志上传 |
| WebSocket | WS/WSS | `192.168.1.100:8080` | `ws.guandang-cloud.com:443` | 实时命令推送 |
| MQTT Broker | MQTT(S) | `192.168.1.100:1883` | `mqtt.guandang-cloud.com:8883` | 心跳、状态、命令确认 |

## 🛠️ 设备端 SDK 集成

### 1. 初始化 SDK

```typescript
import DeviceSDK from './services/device/deviceSDK';

const device = new DeviceSDK(
  'GD20251225001',           // 设备 SN（工厂烧录）
  'a1b2c3d4e5f6g7h8',       // Secret Key（工厂烧录）
  'http://192.168.1.100:8081/api'  // 开发环境 API Base
);
```

### 2. 设备注册

**一次性操作**，获取 JWT Token（有效期 24 小时）：

```typescript
const response = await device.register('GD_DEALERV2', '1.0.0');
console.log('Device ID:', response.device_id);
console.log('JWT Token:', response.jwt_token);
console.log('Token Expires In:', response.token_expires_in, 'seconds');

// 保存 Token 到本地存储（掉电恢复）
localStorage.setItem('jwt_token', response.jwt_token);
```

**响应例子：**
```json
{
  "success": true,
  "device_id": "GD20251225001",
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_expires_in": 86400,
  "mqtt_broker": "mqtt.guandang-cloud.com:8883",
  "ws_url": "wss://ws.guandang-cloud.com:443",
  "api_base": "https://api.guandang-cloud.com:443/api"
}
```

### 3. 启动自动心跳

设备每 30 秒发送一次心跳，服务器 90 秒无心跳则判断掉线：

```typescript
// 获取信号强度（-dBm，范围 -110 到 -20）和电池（0-100%）
const signalStrength = -75;  // 5G 信号强度
const batteryLevel = 85;      // 电池剩余百分比

device.startHeartbeat(signalStrength, batteryLevel);

// 自动任务：每 30 秒运行一次
// ├─ 上传心跳（/device/heartbeat）
// ├─ 查询待执行命令（/device/commands/pending）
// └─ 重连服务器（指数退避：1s、2s、4s...30s）
```

**心跳消息格式：**
```json
{
  "sn": "GD20251225001",
  "type": "heartbeat",
  "ts": 1704067200000,
  "heartbeat": true,
  "signal": -75,
  "battery": 85,
  "status": "online",
  "uptime_seconds": 3600,
  "game_count": 152,
  "error_count": 2
}
```

### 4. 设备状态变化上报

```typescript
await device.reportStatus('busy', {
  game_id: 'GAME_20250103_0001',
  round: 5,
  total_rounds: 16,
  players: 4,
  level: 1
});
```

**可用状态：**
- `online` - 空闲，等待命令
- `busy` - 正在进行游戏
- `paused` - 暂停中
- `error` - 硬件故障
- `offline` - 离线

### 5. 遥测数据上报（每 5 分钟）

```typescript
await device.reportTelemetry(
  45.2,   // CPU 温度 (℃)
  12.5,   // CPU 使用率 (%)
  68.3,   // 内存使用率 (%)
  23.1,   // 磁盘使用率 (%)
  -75,    // 信号强度 (-dBm)
  85      // 电池电量 (%)
);
```

## 🎮 命令执行流程

### 查询待执行命令（在心跳间隔中调用）

```typescript
const pendingCommands = await device.queryPendingCommands();

for (const cmd of pendingCommands) {
  try {
    let result = {};
    
    switch (cmd.cmd_type) {
      case 'deal_start':
        // 启动新一局游戏
        const gameId = await startNewGame(cmd.payload);
        result = { game_id: gameId };
        break;
        
      case 'deal_pause':
        // 暂停当前游戏
        await pauseGame();
        break;
        
      case 'deal_resume':
        // 恢复游戏
        await resumeGame();
        break;
        
      case 'deal_stop':
        // 停止并结束游戏
        await stopGame();
        break;
        
      case 'device_restart':
        // 重启设备
        await rebootDevice();
        break;
    }
    
    // 上报命令执行成功
    await device.ackCommand(cmd.cmd_id, cmd.cmd_type, 'success', result);
    
  } catch (error) {
    // 上报命令执行失败
    await device.ackCommand(
      cmd.cmd_id,
      cmd.cmd_type,
      'failed',
      undefined,
      error.message
    );
  }
}
```

## 📤 文件上传

### 上传游戏截图

```typescript
import * as fs from 'fs';
import * as crypto from 'crypto';

// 读取图片文件
const imageBuffer = fs.readFileSync('/tmp/game_screenshot.jpg');

// 计算 MD5 校验和
const md5 = crypto.createHash('md5');
md5.update(imageBuffer);
const checksum = md5.digest('hex');

// 上传
const uploadRes = await device.uploadImage(
  'GAME_20250103_0001',  // 游戏 ID
  5,                      // 当前局数
  imageBuffer,
  checksum
);

console.log('Upload Success:', uploadRes.file_url);
```

**响应例子：**
```json
{
  "success": true,
  "file_id": "FILE_20250103_0001_005",
  "file_url": "https://cdn.guandang-cloud.com/games/2025/01/03/GAME_20250103_0001_005.jpg",
  "stored_path": "s3://guandang-bucket/games/2025/01/03/GAME_20250103_0001_005.jpg",
  "upload_time_ms": 2345
}
```

## 🔐 认证与 Token 刷新

### Token 自动刷新

当 API 返回 401（未授权）时，SDK 自动刷新 Token：

```typescript
// SDK 内部自动处理，无需手动调用
const freshToken = await device.refreshToken();
```

### 掉电恢复

重启后从本地存储恢复 Token（有效期内可直接使用）：

```typescript
const savedToken = localStorage.getItem('jwt_token');
if (savedToken) {
  device.setToken(savedToken);
  // 无需重新注册，直接使用
  await device.sendHeartbeat(-75, 85);
}
```

## 🚨 离线缓存策略

设备断网时的本地缓存规则：

### 缓存规则
- **缓存位置：** IndexedDB（浏览器） 或 SQLite（嵌入式 Linux）
- **缓存内容：** 待执行命令，心跳/状态消息
- **缓存策略：** **同设备+同命令类型=保留最新一条**
  - 例：收到 3 条 `deal_start` 命令 → 只保存最后一条
  - 不同命令类型并存：`deal_start` + `device_restart` 都保存

### 示例场景

```
设备收到命令序列（断网状态）：
  1. deal_start(game_id=A, round=10)     ← 缓存
  2. deal_start(game_id=B, round=12)     ← 覆盖上一条
  3. device_restart()                     ← 缓存（不同类型）

本地缓存结果：
  deal_start: game_id=B, round=12
  device_restart: (无参数)

网络恢复后按顺序执行：deal_start(B) → device_restart()
```

## 📊 硬件信息数据结构

### 信号强度 (Signal Strength)

5G 信号强度范围和对应图标：

```typescript
Signal (dBm)  →  Bars  →  Status
-20 ~ -60     →  ████  →  Excellent
-60 ~ -75     →  ███   →  Good
-75 ~ -90     →  ██    →  Fair
-90 ~ -110    →  █     →  Poor
< -110        →  ✗     →  No Signal
```

### 电池电量 (Battery Level)

```typescript
Battery (%)   →  Color    →  Status
90-100        →  Green    →  Full
70-89         →  Blue     →  Good
50-69         →  Yellow   →  Fair
30-49         →  Orange   →  Low
0-29          →  Red      →  Critical (需充电)
```

## 🔌 网络超时与重连策略

### 连接超时设置

```typescript
const TIMEOUTS = {
  register: 10000,         // 注册超时
  heartbeat: 5000,         // 心跳超时
  api_call: 10000,         // API 调用超时
  file_upload: 30000,      // 文件上传超时
};

const RECONNECT_INTERVALS = [
  1000,    // 第 1 次：1 秒
  2000,    // 第 2 次：2 秒
  4000,    // 第 3 次：4 秒
  8000,    // 第 4 次：8 秒
  16000,   // 第 5 次：16 秒
  30000,   // 第 6+ 次：30 秒（保持）
];
```

### 网络故障处理流程

```
网络故障检测（心跳无响应 > 90s）
    ↓
缓存待执行命令（IndexedDB）
    ↓
尝试重连（指数退避）
    ├─ 1s 后重试 → 成功 ✓
    ├─ 2s 后重试 → 成功 ✓
    ├─ 4s 后重试 → 失败
    ├─ 8s 后重试 → 成功 ✓
    └─ 网络恢复，同步缓存命令
```

## 📱 5G 网络特殊处理

### 信号切换（4G ↔ 5G）

```typescript
// 监听网络变化
device.on('network_changed', (oldType, newType) => {
  console.log(`网络从 ${oldType} 切换到 ${newType}`);
  
  if (newType === '5G') {
    // 升级到 5G，可以启用高分辨率上传
    enableHighResUpload = true;
  } else {
    // 降级到 4G，降低上传分辨率
    enableHighResUpload = false;
  }
});
```

### 信号延迟监控

```typescript
// 每 60 秒报告一次网络延迟
setInterval(async () => {
  const startTime = Date.now();
  try {
    await device.sendHeartbeat(signal, battery);
    const latency = Date.now() - startTime;
    console.log(`网络延迟: ${latency}ms`);
  } catch (error) {
    console.log(`心跳超时，网络不可达`);
  }
}, 60000);
```

## ✅ 硬件测试检查清单

### 初始化阶段
- [ ] 设备 SN 正确读取（从烧录芯片）
- [ ] Secret Key 正确读取（从烧录芯片）
- [ ] 时间同步（NTP），误差 < 5s
- [ ] TLS 证书验证通过

### 注册阶段
- [ ] POST `/api/device/register` 成功
- [ ] JWT Token 获取成功
- [ ] Token 本地存储完成
- [ ] Token 有效期 24 小时

### 心跳阶段
- [ ] 心跳每 30 秒发送一次
- [ ] 信号强度值在合理范围（-110 ~ -20 dBm）
- [ ] 电池电量值在合理范围（0-100%）
- [ ] 查询待执行命令返回数组（即使为空）

### 命令执行
- [ ] 收到 deal_start 命令后游戏启动
- [ ] 收到 deal_pause 命令后游戏暂停
- [ ] 收到 device_restart 命令后设备重启
- [ ] 命令执行结果及时上报（ack_command）

### 文件上传
- [ ] 游戏截图上传成功
- [ ] 文件 URL 可访问
- [ ] MD5 校验和验证通过
- [ ] 上传时间 < 5 秒（1MB 文件，5G 环境）

### 离线处理
- [ ] 断网后命令缓存到本地
- [ ] 网络恢复后缓存命令自动同步
- [ ] 同命令类型覆盖（保留最新）
- [ ] 网络恢复延迟 < 2 分钟

### 生产部署
- [ ] API 端点切换为生产地址
- [ ] MQTT Broker 切换为生产地址
- [ ] TLS 证书验证启用（不跳过）
- [ ] Token 刷新在 Token 过期前 1 小时执行
- [ ] 日志仅保存错误和警告级别

## 🐛 常见问题排查

### 设备无法连接服务器

**症状：** 注册失败，显示"网络不可达"

**排查步骤：**
```bash
# 1. 检查网络连接
ping api.guandang-cloud.com

# 2. 检查 DNS 解析
nslookup api.guandang-cloud.com

# 3. 检查 TLS 握手
openssl s_client -connect api.guandang-cloud.com:443

# 4. 检查防火墙
# 确保出站 443、8883 端口开放
```

### 心跳超时，频繁重连

**症状：** 日志显示"Heartbeat timeout"，重连多次

**排查步骤：**
1. 检查网络延迟：`ping -c 10 api.guandang-cloud.com`
2. 增加超时时间：`HEARTBEAT_TIMEOUT = 10000`（从 5000ms）
3. 检查服务器日志是否收到心跳
4. 查看是否同时有多个连接（重复注册）

### 命令未收到

**症状：** 执行 `queryPendingCommands()` 返回空数组

**排查步骤：**
1. 确认在管理后台下发了命令
2. 检查命令有效期：`expires_at > now()`
3. 检查设备是否在线（管理后台查看信号强度）
4. 检查 JWT Token 是否过期（ < 24 小时）

### 文件上传失败

**症状：** 上传返回 413（Payload Too Large）

**排查步骤：**
1. 检查文件大小（单个文件最大 50MB）
2. 检查 Content-Type：`image/jpeg` 或 `image/png`
3. 检查 MD5 校验和是否正确
4. 分割大文件为多个请求

## 📚 相关文档

- [API_SPEC.md](./API_SPEC.md) - 完整 API 规范
- [services/device/deviceSDK.ts](./services/device/deviceSDK.ts) - TypeScript SDK
- [device-simulator.html](./device-simulator.html) - 模拟器（测试用）

