# 真机硬件通讯快速参考

## 🚀 30 秒快速上手

### 1️⃣ 初始化（工厂烧录的值）
```typescript
const device = new DeviceSDK('GD20251225001', 'a1b2c3d4e5f6g7h8');
```

### 2️⃣ 注册获取 Token
```typescript
const response = await device.register();
localStorage.setItem('jwt_token', response.jwt_token);  // 掉电保存
```

### 3️⃣ 启动心跳（自动）
```typescript
device.startHeartbeat(-75, 85);  // 信号强度, 电池%
// 每 30 秒自动发送一次
```

### 4️⃣ 处理命令（在循环中）
```typescript
const cmds = await device.queryPendingCommands();
for (const cmd of cmds) {
  // 执行 cmd.cmd_type: deal_start, deal_pause 等
  await device.ackCommand(cmd.cmd_id, cmd.cmd_type, 'success');
}
```

---

## 📋 网络端口速查表

| 功能 | 开发 | 生产 | 说明 |
|------|------|------|------|
| 设备 API | `192.168.1.100:8081` | `api.guandang-cloud.com:443` | 注册、心跳、命令 |
| 文件上传 | `192.168.1.100:8082` | `upload.guandang-cloud.com:443` | 截图、日志 |
| WebSocket | `192.168.1.100:8080` | `ws.guandang-cloud.com:443` | 实时推送 |
| MQTT | `192.168.1.100:1883` | `mqtt.guandang-cloud.com:8883` | 心跳、状态 |

---

## 🔄 数据流向

```
初始化
  ↓
[register] → 获取 JWT Token (24小时有效)
  ↓
启动心跳循环 (30秒周期)
  ├─ [heartbeat] → 上报设备在线
  ├─ [queryPendingCommands] → 获取待执行命令
  └─ 若有命令：执行 → [ackCommand] → 上报执行结果
  
额外任务 (按需)
  ├─ [reportStatus] → 上报状态变化
  ├─ [reportTelemetry] → 上报硬件信息 (5分钟一次)
  └─ [uploadImage] → 上传游戏截图
```

---

## 💾 本地缓存规则

**断网时自动缓存命令，规则：**

```
同一设备 + 同一命令类型 = 保留最新一条（覆盖旧的）
```

### 示例
```
收到3条 deal_start 命令（都缓存，但只保存最后一条）
收到1条 device_restart 命令（并存）

缓存结果：
  deal_start: [最新的参数]
  device_restart: [已缓存]

网络恢复后自动按队列执行
```

---

## ⏱️ 关键时间配置

```
心跳间隔:    30 秒
心跳超时:    5 秒
Token 有效期: 24 小时
Token 过期前刷新: 1 小时

网络故障重连策略:
  1s → 2s → 4s → 8s → 16s → 30s (保持)
```

---

## 🔐 身份认证流程

```
┌─────────────────────────────┐
│  工厂烧录的固定值             │
├─────────────────────────────┤
│ • SN (设备序列号)            │
│ • Secret Key (密钥)         │
└──────────────┬──────────────┘
               ↓ [register 端点]
        ┌──────────────┐
        │ HTTPS POST   │
        └──────────────┘
               ↓
┌──────────────────────────────┐
│   获得 JWT Token (24h)        │
│   Bearer xxxxx.yyyyy.zzzzz    │
└──────────┬───────────────────┘
           ↓ [所有 API 调用]
   ┌──────────────┐
   │ Authorization│
   │ Bearer Token │
   └──────────────┘
           ↓
        成功 ✓
        
Token 即将过期时:
  [refreshToken 端点] → 获取新 Token
```

---

## 📊 命令类型速查

```
deal_start          - 启动新游戏
deal_pause          - 暂停游戏
deal_resume         - 恢复游戏
deal_stop           - 结束游戏
device_restart      - 重启设备
device_update_fw    - 固件更新
device_change_config- 修改配置
```

---

## 📱 信号强度对应表

```
-20 ~ -60 dBm   →  ████  Excellent   (最强)
-60 ~ -75 dBm   →  ███   Good
-75 ~ -90 dBm   →  ██    Fair
-90 ~ -110 dBm  →  █     Poor
< -110 dBm      →  ✗     No Signal   (最弱)

使用方法：
  await device.sendHeartbeat(-75, 85, 'online');
                              ↑    ↑
                          信号强 电池%
```

---

## 🔧 常见问题一句话解决

| 问题 | 解决方案 |
|------|--------|
| 注册失败 (网络) | 检查服务器 DNS 和防火墙出站 443 端口 |
| 心跳超时 | 增加超时时间：`HEARTBEAT_TIMEOUT = 10000` |
| 命令未收到 | 检查 Token 是否过期，后台是否下发命令 |
| 掉电丢数据 | 使用 `localStorage` 保存 Token，支持恢复 |
| 上传太慢 | 检查文件大小 < 50MB，分割大文件 |

---

## 📝 测试检查清单（5分钟）

```
✓ 设备 SN 和 Secret 正确
✓ 时间同步（NTP，误差 < 5s）
✓ 网络连接正常
✓ 注册成功，Token 获取
✓ 心跳每 30s 发送
✓ 命令查询返回数组
✓ 命令执行结果上报
✓ 离线时命令缓存
✓ 网络恢复自动同步
✓ 生产环境 TLS 验证启用
```

---

## 🌐 环境切换

```typescript
// 开发环境（本地测试）
const device = new DeviceSDK(sn, key);  // 默认连接 192.168.1.100:8081

// 生产环境（真实部署）
import { getNetworkConfig } from './config/networkConfig';
const config = getNetworkConfig('production');
const device = new DeviceSDK(sn, key, config.api.baseUrl);
```

---

## 🐛 调试技巧

```bash
# 查看完整日志（调试模式）
npx ts-node test-real-hardware.ts --env development --verbose

# 指定设备 SN 和密钥
npx ts-node test-real-hardware.ts --sn GD20251225001 --secret a1b2c3d4e5f6g7h8

# 测试生产环境
npx ts-node test-real-hardware.ts --env production
```

---

## 🔗 相关文件

- [deviceSDK.ts](./services/device/deviceSDK.ts) - SDK 完整实现
- [REAL_HARDWARE_GUIDE.md](./REAL_HARDWARE_GUIDE.md) - 详细指南
- [networkConfig.ts](./config/networkConfig.ts) - 环境配置
- [API_SPEC.md](./API_SPEC.md) - API 规范

---

**版本:** 1.0.0 | **最后更新:** 2025-01-03 | **状态:** Ready for Production ✓
