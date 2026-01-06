# 掼蛋发牌机 设备通讯接口规范

## 一、通讯概览

### 架构
```
真实设备（5G模块） ─MQTT/TLS─> 云服务器（消息队列）
                          ↓
                   WebSocket实时推送 → 管理后台
                          ↓
                  API HTTP/JSON ← 离线回写
```

### 端口分配
| 服务 | 端口 | 协议 | 说明 |
|------|------|------|------|
| MQTT Broker | 8883 | TLS/MQTT | 设备心跳、状态、命令 |
| WebSocket | 8080 (开发) / 443 (生产) | WSS | 后台实时订阅 |
| HTTP API | 8081 (开发) / 443 (生产) | HTTPS | RESTful 接口 |
| 文件上传 | 8082 (开发) / 443 (生产) | HTTPS | Multipart 文件接收 |

---

## 二、设备注册与认证

### 1. 设备初次注册（HTTP POST）

**端点：** `https://api.guandang-cloud.com:8081/api/device/register`

**请求体：**
```json
{
  "sn": "GD20251225001",
  "secret_key": "a1b2c3d4e5f6g7h8",
  "model": "GD_DEALERV2",
  "firmware": "1.2.5",
  "5g_imei": "867123456789012",
  "imsi": "460001234567890"
}
```

**响应（200 OK）：**
```json
{
  "success": true,
  "device_id": "GD20251225001",
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_expires_in": 86400,
  "mqtt_broker": "mqtt.guandang-cloud.com:8883",
  "ws_url": "wss://ws.guandang-cloud.com",
  "api_base": "https://api.guandang-cloud.com:8081"
}
```

---

## 三、MQTT 主题结构与消息格式

### Topic 格式
```
gd/{device_sn}/{message_type}

示例：
  gd/GD20251225001/heartbeat      - 心跳
  gd/GD20251225001/status          - 状态上报
  gd/GD20251225001/telemetry       - 遥测数据
  gd/GD20251225001/cmd_ack         - 命令回执
  gd/GD20251225001/deal_complete   - 发牌完成
```

### QoS 策略
| 消息类型 | QoS | 说明 |
|---------|-----|------|
| heartbeat | 0 | 心跳，可丢失 |
| status | 1 | 状态变更，确保到达一次 |
| telemetry | 0 | 遥测数据，可丢失 |
| cmd_ack | 1 | 命令回执，确保到达一次 |
| emergency_stop | 2 | 紧急停止，确保精确一次 |

---

## 四、设备消息类型详细规范

### 1. 心跳消息（Heartbeat）

**Topic:** `gd/{sn}/heartbeat`  
**QoS:** 0  
**间隔:** 30 秒

**消息载荷：**
```json
{
  "sn": "GD20251225001",
  "type": "heartbeat",
  "ts": 1735104000000,
  "heartbeat": true,
  "signal": -65,
  "battery": 85,
  "status": "online",
  "uptime_seconds": 86400,
  "game_count": 24,
  "error_count": 0
}
```

---

### 2. 状态消息（Status）

**Topic:** `gd/{sn}/status`  
**QoS:** 1  
**触发:** 状态变更时立即发送

**消息载荷：**
```json
{
  "sn": "GD20251225001",
  "type": "status",
  "ts": 1735104000000,
  "status": "busy",
  "current_game": {
    "game_id": "GAME_20251225_001",
    "round": 5,
    "total_rounds": 8,
    "players": 4,
    "current_level": 3
  },
  "card_status": {
    "deck_count": 1,
    "cards_dealt": 25,
    "cards_remaining": 103
  }
}
```

**Status 枚举值：**
- `online` - 在线待命
- `busy` - 正在发牌
- `paused` - 已暂停
- `error` - 设备故障
- `offline` - 离线

---

### 3. 遥测数据（Telemetry）

**Topic:** `gd/{sn}/telemetry`  
**QoS:** 0  
**间隔:** 60 秒

**消息载荷：**
```json
{
  "sn": "GD20251225001",
  "type": "telemetry",
  "ts": 1735104000000,
  "hardware": {
    "cpu_temp": 45.5,
    "cpu_usage": 18,
    "memory_usage": 62,
    "disk_usage": 45
  },
  "network": {
    "signal_strength": -65,
    "signal_bars": 3,
    "network_type": "5G",
    "connected_ap": "5G-TOWER-01"
  },
  "power": {
    "battery_level": 85,
    "charging": false,
    "estimated_runtime_hours": 12
  }
}
```

---

### 4. 命令回执（Command ACK）

**Topic:** `gd/{sn}/cmd_ack`  
**QoS:** 1  
**触发:** 收到并执行命令后立即发送

**消息载荷：**
```json
{
  "sn": "GD20251225001",
  "type": "cmd_ack",
  "ts": 1735104000000,
  "cmd_id": "CMD_20251225_001",
  "cmd_type": "CONFIG_UPDATE",
  "status": "success",
  "result": {
    "player_count": 4,
    "deck_count": 1,
    "game_rounds": 8,
    "deal_speed": 3,
    "difficulty_level": 5,
    "tribute_enabled": true
  },
  "error": null
}
```

**Status 枚举值：**
- `success` - 执行成功
- `pending` - 执行中
- `failed` - 执行失败
- `timeout` - 执行超时

---

### 5. 发牌完成（Deal Complete）

**Topic:** `gd/{sn}/deal_complete`  
**QoS:** 1

**消息载荷：**
```json
{
  "sn": "GD20251225001",
  "type": "deal_complete",
  "ts": 1735104000000,
  "game_id": "GAME_20251225_001",
  "round": 8,
  "total_rounds": 8,
  "duration_seconds": 480,
  "cards_dealt": 108,
  "deal_speed_actual": 3.2,
  "error_count": 0,
  "images_captured": 8,
  "images_uploaded": 8
}
```

---

## 五、HTTP REST API 接口

### 基础配置
```
Base URL: https://api.guandang-cloud.com:8081/api
Authentication: Bearer {jwt_token}
Content-Type: application/json
```

### 1. 发送心跳确认

**POST** `/device/heartbeat`

```json
{
  "sn": "GD20251225001",
  "ts": 1735104000000,
  "signal": -65,
  "battery": 85
}
```

**Response (200):**
```json
{
  "success": true,
  "device_online": true,
  "next_heartbeat_interval": 30
}
```

---

### 2. 上报设备状态

**POST** `/device/status`

```json
{
  "sn": "GD20251225001",
  "status": "busy",
  "game_id": "GAME_20251225_001",
  "round": 5,
  "battery": 85,
  "signal": -65
}
```

**Response (200):**
```json
{
  "success": true,
  "status_recorded": true,
  "timestamp": 1735104000000
}
```

---

### 3. 上传遥测数据

**POST** `/device/telemetry`

```json
{
  "sn": "GD20251225001",
  "ts": 1735104000000,
  "cpu_temp": 45.5,
  "memory_usage": 62,
  "signal_strength": -65,
  "battery": 85
}
```

**Response (200):**
```json
{
  "success": true,
  "data_stored": true
}
```

---

### 4. 上传图片文件

**POST** `/device/upload` (Multipart/form-data)

**Form Fields:**
```
sn: GD20251225001
game_id: GAME_20251225_001
round: 5
file: [binary image data]
file_type: image/jpeg
file_size: 524288
checksum_md5: abc123def456...
```

**Response (200):**
```json
{
  "success": true,
  "file_id": "FILE_20251225_001",
  "file_url": "https://cdn.guandang-cloud.com/images/...",
  "stored_path": "/data/devices/GD20251225001/images/...",
  "upload_time_ms": 245
}
```

---

### 5. 查询待执行命令

**GET** `/device/commands/pending?sn=GD20251225001`

**Response (200):**
```json
{
  "success": true,
  "commands": [
    {
      "cmd_id": "CMD_20251225_001",
      "cmd_type": "CONFIG_UPDATE",
      "priority": "high",
      "payload": {
        "player_count": 4,
        "deck_count": 1,
        "game_rounds": 8,
        "deal_speed": 3,
        "difficulty_level": 5,
        "start_level": 5
      },
      "created_at": 1735103900000,
      "expires_at": 1735104300000
    },
    {
      "cmd_id": "CMD_20251225_002",
      "cmd_type": "START_DEAL",
      "priority": "high",
      "payload": {
        "game_id": "GAME_20251225_002"
      },
      "created_at": 1735104000000,
      "expires_at": 1735104600000
    }
  ],
  "total_count": 2
}
```

---

### 6. 报告命令执行结果

**POST** `/device/commands/ack`

```json
{
  "sn": "GD20251225001",
  "cmd_id": "CMD_20251225_001",
  "status": "success",
  "result": {
    "player_count": 4,
    "deck_count": 1,
    "game_rounds": 8,
    "deal_speed": 3
  },
  "error": null,
  "execution_time_ms": 245
}
```

**Response (200):**
```json
{
  "success": true,
  "ack_recorded": true,
  "next_command_id": "CMD_20251225_002"
}
```

---

## 六、错误码定义

```json
{
  "200": "成功",
  "400": "请求参数错误",
  "401": "未授权或 Token 过期",
  "403": "禁止访问（设备未注册或被禁用）",
  "404": "资源不存在",
  "409": "冲突（如设备已注册）",
  "429": "请求过于频繁",
  "500": "服务器内部错误",
  "503": "服务不可用"
}
```

---

## 七、真机部署配置示例

### 嵌入式设备端（C/Rust）配置
```c
#define MQTT_BROKER "mqtt.guandang-cloud.com"
#define MQTT_PORT 8883
#define MQTT_USE_TLS 1
#define API_BASE_URL "https://api.guandang-cloud.com:8081/api"
#define HEARTBEAT_INTERVAL_SEC 30
#define OFFLINE_DETECT_TIMEOUT_SEC 90
#define COMMAND_CHECK_INTERVAL_SEC 10
```

### 网络超时与重试策略
```json
{
  "mqtt": {
    "connect_timeout": 10000,
    "reconnect_delay_min": 1000,
    "reconnect_delay_max": 30000,
    "keepalive": 60
  },
  "http": {
    "connect_timeout": 5000,
    "read_timeout": 15000,
    "max_retries": 3,
    "retry_backoff_multiplier": 2.0
  }
}
```

---

## 八、安全性建议

### TLS/SSL 证书
- 在生产环境强制 HTTPS + TLS 1.3
- 设备端内置根证书，用于验证服务器证书

### 身份验证
- 初次注册时使用设备秘钥（工厂写入）
- 之后所有请求使用 JWT Token（24 小时有效期）
- Token 过期时通过刷新接口获取新 Token

### 消息签名
```
HMAC-SHA256(payload + timestamp, secret_key)
包含在请求头 X-Signature 中
```

---

## 九、前端接口层修改建议

现有 `services/api/` 目录可保持不变，新增设备真机接口层：

```typescript
// services/device/deviceClient.ts
class DeviceClientSDK {
  async register(sn: string, secretKey: string): Promise<RegisterResponse>
  async heartbeat(sn: string, signal: number, battery: number): Promise<void>
  async reportStatus(sn: string, status: DeviceStatus): Promise<void>
  async uploadImage(sn: string, gameId: string, imageBuffer: Buffer): Promise<string>
  async queryPendingCommands(sn: string): Promise<Command[]>
  async ackCommand(sn: string, cmdId: string, status: string): Promise<void>
}
```

**建议使用场景：**
- 开发测试（localhost:3000）：使用模拟器 + BroadcastChannel
- 离线演示（内网）：使用模拟器 + HTTP 本地 API
- 生产真机：使用真实 MQTT + HTTPS API（此 SDK）

---

## 十、测试清单

- [ ] 设备注册并获取 JWT Token
- [ ] 验证心跳每 30 秒发送一次
- [ ] 检查状态变更时立即上报
- [ ] 确认图片上传成功（含 MD5 校验）
- [ ] 测试 Token 过期和刷新
- [ ] 验证离线命令缓存与回写
- [ ] 压力测试：200 台设备同时连接
- [ ] 网络中断恢复测试

