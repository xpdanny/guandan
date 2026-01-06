# 掼蛋设备智能管理平台 - 技术文档

## 目录

1. [系统概述](#1-系统概述)
2. [系统架构](#2-系统架构)
3. [终端设备通信协议](#3-终端设备通信协议)
4. [前端技术规范](#4-前端技术规范)
5. [API接口规范](#5-api接口规范)
6. [数据模型定义](#6-数据模型定义)
7. [功能模块说明](#7-功能模块说明)
8. [部署说明](#8-部署说明)

---

## 1. 系统概述

### 1.1 项目简介

掼蛋设备智能管理平台是一套用于批量管理掼蛋发牌机设备的Web应用系统。平台支持设备注册绑定、实时状态监控、远程配置下发、分组管理等功能。

### 1.2 系统特性

| 特性 | 说明 |
|------|------|
| 设备连接 | 5G蜂窝网络，支持全国范围联网 |
| 通信协议 | MQTT over TLS |
| 实时性 | WebSocket推送，秒级状态同步 |
| 离线支持 | 设备断网时本地缓存，恢复后自动同步 |
| 批量操作 | 支持批量配置、批量注册 |

### 1.3 术语定义

| 术语 | 定义 |
|------|------|
| 发牌机 | 掼蛋游戏自动发牌终端设备 |
| SN | Serial Number，设备序列号，全局唯一 |
| SecretKey | 设备密钥，出厂烧录，用于身份认证 |
| QoS | Quality of Service，MQTT消息服务质量等级 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                用户层                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                │
│    │   PC浏览器    │    │  手机浏览器   │    │  平板浏览器   │                │
│    └──────────────┘    └──────────────┘    └──────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS / WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               云服务层                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                │
│    │  API Gateway │    │  WebSocket   │    │    MQTT      │                │
│    │   (REST)     │    │   Server     │    │   Broker     │                │
│    └──────────────┘    └──────────────┘    └──────────────┘                │
│            │                   │                   │                        │
│            └───────────────────┴───────────────────┘                        │
│                                │                                            │
│                    ┌───────────┴───────────┐                               │
│                    │     业务服务层         │                               │
│                    │  - 设备管理服务        │                               │
│                    │  - 用户认证服务        │                               │
│                    │  - 指令下发服务        │                               │
│                    └───────────────────────┘                               │
│                                │                                            │
│                    ┌───────────┴───────────┐                               │
│                    │       数据层          │                                │
│                    │  - MySQL (业务数据)   │                                │
│                    │  - Redis (会话/缓存)  │                                │
│                    └───────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ MQTT over TLS (Port 8883)
                                    │ 5G蜂窝网络
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              设备层                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                │
│    │  发牌机 #1   │    │  发牌机 #2   │    │  发牌机 #N   │                │
│    │  5G模块      │    │  5G模块      │    │  5G模块      │                │
│    │  唯一密钥    │    │  唯一密钥    │    │  唯一密钥    │                │
│    └──────────────┘    └──────────────┘    └──────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 6 |
| 样式方案 | Tailwind CSS |
| 状态管理 | Zustand (推荐) |
| HTTP客户端 | Axios |
| 二维码扫描 | html5-qrcode |
| 实时通信 | WebSocket |
| 离线存储 | IndexedDB |

---

## 3. 终端设备通信协议

### 3.1 连接参数

| 参数 | 值 |
|------|-----|
| 协议 | MQTT v3.1.1 / v5.0 |
| 传输层 | TLS 1.2+ |
| 端口 | 8883 (TLS) |
| Broker地址 | mqtt.guandang-cloud.com (示例) |
| Keep Alive | 30秒 |
| Clean Session | false |

### 3.2 设备认证流程

```
┌──────────────┐                              ┌──────────────┐
│   发牌机      │                              │  云端服务器   │
└──────┬───────┘                              └──────┬───────┘
       │                                             │
       │  1. HTTPS POST /api/device/auth             │
       │  {                                          │
       │    "sn": "GD20241224001",                   │
       │    "secretKey": "a1b2c3d4e5f6",             │
       │    "timestamp": 1703404800,                 │
       │    "signature": "sha256(...)"               │
       │  }                                          │
       │ ──────────────────────────────────────────► │
       │                                             │
       │  2. 验证密钥，生成Token                      │
       │  {                                          │
       │    "code": 0,                               │
       │    "token": "eyJhbGciOiJIUzI1NiIs...",      │
       │    "expiresIn": 86400                       │
       │  }                                          │
       │ ◄────────────────────────────────────────── │
       │                                             │
       │  3. MQTT CONNECT                            │
       │  ClientId: GD20241224001                    │
       │  Username: GD20241224001                    │
       │  Password: {token}                          │
       │ ──────────────────────────────────────────► │
       │                                             │
       │  4. CONNACK (成功)                          │
       │ ◄────────────────────────────────────────── │
       │                                             │
       │  5. SUBSCRIBE 订阅指令Topic                  │
       │  Topic: gd/GD20241224001/cmd                │
       │ ──────────────────────────────────────────► │
       │                                             │
```

### 3.3 MQTT Topic规范

| Topic格式 | 方向 | 说明 | QoS |
|-----------|------|------|-----|
| `gd/{deviceId}/status` | 设备→云端 | 设备状态上报 | 1 |
| `gd/{deviceId}/heartbeat` | 设备→云端 | 心跳包 | 0 |
| `gd/{deviceId}/event` | 设备→云端 | 事件上报（发牌完成等） | 1 |
| `gd/{deviceId}/cmd` | 云端→设备 | 指令下发 | 1/2 |
| `gd/{deviceId}/cmd/ack` | 设备→云端 | 指令执行响应 | 1 |
| `gd/{deviceId}/config` | 云端→设备 | 配置更新 | 1 |

### 3.4 消息格式定义

#### 3.4.1 心跳包 (设备→云端)

**Topic**: `gd/{deviceId}/heartbeat`  
**QoS**: 0  
**频率**: 每30秒一次

```json
{
  "type": "HEARTBEAT",
  "deviceId": "GD20241224001",
  "timestamp": 1703404800000,
  "data": {
    "battery": 85,
    "signalStrength": -67,
    "temperature": 36.5,
    "firmwareVersion": "1.2.3"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| battery | number | 电池电量百分比 (0-100) |
| signalStrength | number | 5G信号强度 dBm (-120 ~ -40) |
| temperature | number | 设备温度 ℃ |
| firmwareVersion | string | 固件版本号 |

#### 3.4.2 状态上报 (设备→云端)

**Topic**: `gd/{deviceId}/status`  
**QoS**: 1  
**触发**: 状态变化时主动上报

```json
{
  "type": "STATUS",
  "deviceId": "GD20241224001",
  "timestamp": 1703404800000,
  "data": {
    "status": "BUSY",
    "currentRound": 3,
    "totalRounds": 10,
    "playerCount": 4,
    "deckCount": 2
  }
}
```

| status值 | 说明 |
|----------|------|
| ONLINE | 在线空闲 |
| BUSY | 发牌中 |
| OFFLINE | 离线 |
| ERROR | 故障 |

#### 3.4.3 事件上报 (设备→云端)

**Topic**: `gd/{deviceId}/event`  
**QoS**: 1

```json
{
  "type": "EVENT",
  "deviceId": "GD20241224001",
  "timestamp": 1703404800000,
  "eventType": "DEAL_COMPLETE",
  "data": {
    "roundNumber": 5,
    "duration": 12500,
    "cardsDealt": 108
  }
}
```

| eventType | 说明 |
|-----------|------|
| DEAL_COMPLETE | 单局发牌完成 |
| GAME_COMPLETE | 整场游戏结束 |
| LOW_BATTERY | 低电量告警 (<20%) |
| ERROR | 设备故障 |
| CARD_JAM | 卡牌故障 |

#### 3.4.4 指令下发 (云端→设备)

**Topic**: `gd/{deviceId}/cmd`  
**QoS**: 根据指令类型

```json
{
  "type": "COMMAND",
  "commandId": "cmd_1703404800000_abc123",
  "timestamp": 1703404800000,
  "command": "START_DEAL",
  "payload": {
    "roundNumber": 1
  }
}
```

| command | 说明 | QoS |
|---------|------|-----|
| START_DEAL | 开始发牌 | 1 |
| STOP_DEAL | 停止发牌 | 2 |
| PAUSE_DEAL | 暂停发牌 | 1 |
| RESUME_DEAL | 继续发牌 | 1 |
| RESET | 复位设备 | 1 |
| EMERGENCY_STOP | 紧急停止 | 2 |

#### 3.4.5 配置更新 (云端→设备)

**Topic**: `gd/{deviceId}/config`  
**QoS**: 1

```json
{
  "type": "CONFIG_UPDATE",
  "commandId": "cfg_1703404800000_def456",
  "timestamp": 1703404800000,
  "config": {
    "playerCount": 4,
    "deckCount": 2,
    "dealSpeed": 3,
    "gameRounds": 10,
    "startLevel": 2,
    "isTribute": true,
    "difficulty": 5
  }
}
```

| 配置项 | 类型 | 范围 | 说明 |
|--------|------|------|------|
| playerCount | number | 4 \| 8 | 游戏人数 |
| deckCount | number | 1 \| 2 | 牌副数 |
| dealSpeed | number | 1-5 | 发牌速度档位 |
| gameRounds | number | 1-10 | 游戏局数 |
| startLevel | number | 1-13 | 起始级数 (1=A, 13=K) |
| isTribute | boolean | - | 是否开启上供 |
| difficulty | number | 1-10 | 难易度 |

#### 3.4.6 指令响应 (设备→云端)

**Topic**: `gd/{deviceId}/cmd/ack`  
**QoS**: 1

```json
{
  "type": "COMMAND_ACK",
  "commandId": "cmd_1703404800000_abc123",
  "deviceId": "GD20241224001",
  "timestamp": 1703404800100,
  "success": true,
  "errorCode": null,
  "errorMessage": null
}
```

| errorCode | 说明 |
|-----------|------|
| null | 成功 |
| E001 | 设备忙，无法执行 |
| E002 | 参数错误 |
| E003 | 硬件故障 |
| E004 | 电量不足 |

### 3.5 离线与重连机制

#### 3.5.1 离线判定

| 角色 | 判定规则 |
|------|----------|
| 云端 | 90秒未收到心跳，标记设备离线 |
| 前端 | 收到云端推送的离线事件，更新UI |

#### 3.5.2 设备端离线缓存

```
设备本地存储结构:
├── pending_events/          # 待上报事件
│   ├── event_1703404800.json
│   └── event_1703404801.json
└── game_data/               # 游戏数据
    └── current_game.json
```

设备恢复在线后，按时间顺序上报缓存事件。

#### 3.5.3 前端离线指令处理

```
IndexedDB 结构:
├── pending_commands         # 待发送指令表
│   ├── deviceId (索引)
│   ├── commandType (索引)
│   ├── command (JSON)
│   └── cachedAt (时间戳)
```

**覆盖策略**: 同一设备的同类型指令，仅保留最后一条。

### 3.6 设备二维码规范

#### 3.6.1 二维码内容格式

```json
{
  "sn": "GD20241224001",
  "key": "a1b2c3d4e5f6g7h8"
}
```

| 字段 | 说明 | 格式 |
|------|------|------|
| sn | 设备序列号 | GD + 8位日期 + 3位序号 |
| key | 设备密钥 | 16位十六进制字符串 |

#### 3.6.2 二维码生成参数

| 参数 | 值 |
|------|-----|
| 纠错级别 | M (15%) |
| 版本 | 自动 |
| 编码 | UTF-8 |
| 尺寸 | 3cm × 3cm (设备标签) |

---

## 4. 前端技术规范

### 4.1 项目结构

```
掼蛋设备智能管理平台/
├── index.html
├── index.tsx                 # 应用入口
├── App.tsx                   # 根组件
├── types.ts                  # 类型定义
├── constants.tsx             # 常量配置
├── vite.config.ts
├── tsconfig.json
├── package.json
│
├── components/               # UI组件
│   ├── Layout.tsx           # 布局框架
│   ├── Login.tsx            # 登录页
│   ├── Dashboard.tsx        # 设备仪表盘
│   ├── ControlPanel.tsx     # 控制面板
│   ├── UserManagement.tsx   # 用户管理
│   ├── DeviceBinding.tsx    # 设备绑定 (新增)
│   ├── QRScanner.tsx        # 二维码扫描 (新增)
│   ├── BatchQRUpload.tsx    # 批量上传 (新增)
│   └── PendingCommands.tsx  # 待同步队列 (新增)
│
└── services/                 # 服务层
    ├── api/                  # HTTP API
    │   ├── httpClient.ts
    │   ├── deviceApi.ts
    │   └── authApi.ts
    ├── websocket/            # WebSocket
    │   ├── wsClient.ts
    │   └── messageHandler.ts
    ├── mqtt/                 # MQTT协议定义
    │   └── protocol.ts
    └── offline/              # 离线管理
        └── cacheManager.ts
```

### 4.2 依赖清单

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "axios": "^1.6.0",
    "html5-qrcode": "^2.3.8",
    "zustand": "^4.4.0",
    "idb": "^7.1.1"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vite": "^6.2.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

### 4.3 WebSocket客户端规范

```typescript
// services/websocket/wsClient.ts

interface WSClientConfig {
  url: string;
  heartbeatInterval: number;  // 5000ms
  reconnectStrategy: {
    initialDelay: number;     // 1000ms
    maxDelay: number;         // 30000ms
    multiplier: number;       // 2
  };
}

// 消息类型
type WSMessageType = 
  | 'DEVICE_ONLINE'
  | 'DEVICE_OFFLINE'
  | 'STATUS_UPDATE'
  | 'COMMAND_ACK'
  | 'LOW_BATTERY_ALERT';
```

---

## 5. API接口规范

### 5.1 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | https://api.guandang-cloud.com/v1 |
| 认证方式 | Bearer Token |
| 内容类型 | application/json |

### 5.2 认证接口

#### 5.2.1 用户登录

```
POST /auth/login
```

**请求体**:
```json
{
  "username": "admin",
  "password": "sha256_hashed_password"
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400,
    "user": {
      "id": "user_001",
      "username": "admin",
      "role": "super_admin"
    }
  }
}
```

### 5.3 设备接口

#### 5.3.1 获取设备列表

```
GET /devices?page=1&size=20&status=ONLINE
```

#### 5.3.2 注册单个设备

```
POST /devices/register
```

**请求体**:
```json
{
  "sn": "GD20241224001",
  "secretKey": "a1b2c3d4e5f6g7h8"
}
```

#### 5.3.3 批量注册设备

```
POST /devices/batch-register
```

**请求体**:
```json
{
  "devices": [
    { "sn": "GD20241224001", "secretKey": "a1b2c3d4e5f6g7h8" },
    { "sn": "GD20241224002", "secretKey": "b2c3d4e5f6g7h8i9" }
  ]
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "total": 2,
    "success": 1,
    "failed": 1,
    "results": [
      { "sn": "GD20241224001", "success": true },
      { "sn": "GD20241224002", "success": false, "error": "设备已被绑定" }
    ]
  }
}
```

#### 5.3.4 发送指令

```
POST /devices/{deviceId}/command
```

**请求体**:
```json
{
  "command": "START_DEAL",
  "payload": {
    "roundNumber": 1
  }
}
```

#### 5.3.5 更新配置

```
PUT /devices/{deviceId}/config
```

---

## 6. 数据模型定义

### 6.1 TypeScript类型定义

```typescript
// types.ts

// ============ 设备状态枚举 ============
export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BUSY = 'BUSY',
  ERROR = 'ERROR'
}

// ============ 设备配置 ============
export interface DeviceConfig {
  playerCount: 4 | 8;
  deckCount: 1 | 2;
  dealSpeed: 1 | 2 | 3 | 4 | 5;
  gameRounds: number;        // 1-10
  startLevel: number;        // 1-13
  isTribute: boolean;
  difficulty: number;        // 1-10
}

// ============ 设备连接信息 ============
export interface DeviceConnection {
  signalStrength: number;    // dBm, -120 ~ -40
  ipAddress: string;
  lastHeartbeat: string;     // ISO8601
  isOnline: boolean;
  firmwareVersion: string;
}

// ============ 设备模型 ============
export interface Device {
  id: string;
  sn: string;
  name: string;
  status: DeviceStatus;
  battery: number;
  config: DeviceConfig;
  connection: DeviceConnection;
  currentRound: number;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ 指令定义 ============
export type CommandType = 
  | 'START_DEAL'
  | 'STOP_DEAL'
  | 'PAUSE_DEAL'
  | 'RESUME_DEAL'
  | 'RESET'
  | 'EMERGENCY_STOP'
  | 'UPDATE_CONFIG';

export interface DeviceCommand {
  commandId: string;
  type: CommandType;
  payload: Record<string, any>;
  qos: 0 | 1 | 2;
  timestamp: number;
}

// ============ 指令响应 ============
export interface CommandAck {
  commandId: string;
  deviceId: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  executedAt: string;
}

// ============ 设备事件 ============
export type EventType = 
  | 'DEAL_COMPLETE'
  | 'GAME_COMPLETE'
  | 'LOW_BATTERY'
  | 'ERROR'
  | 'CARD_JAM';

export interface DeviceEvent {
  deviceId: string;
  eventType: EventType;
  data: Record<string, any>;
  timestamp: number;
}

// ============ 离线缓存指令 ============
export interface CachedCommand {
  id: string;
  deviceId: string;
  commandType: CommandType;
  command: DeviceCommand;
  cachedAt: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

// ============ 用户模型 ============
export type UserRole = 'super_admin' | 'admin' | 'operator';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  status: 'active' | 'suspended';
  createdAt: string;
}

// ============ 设备分组 ============
export interface DeviceGroup {
  id: string;
  name: string;
  deviceIds: string[];
  createdAt: string;
}
```

---

## 7. 功能模块说明

### 7.1 设备绑定模块

支持三种绑定方式：

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| 扫码绑定 | 手机摄像头扫描设备二维码 | 单台设备，现场操作 |
| 手动输入 | 输入序列号和密钥 | 二维码损坏时 |
| 批量上传 | 上传多张二维码图片 | 大批量设备入库 |

### 7.2 设备监控模块

- 设备卡片网格展示
- 实时状态更新（WebSocket推送）
- 在线/离线状态徽章
- 5G信号强度指示（4格图标）
- 电池电量显示
- 支持框选多选、范围搜索

### 7.3 远程控制模块

- 单台/批量配置下发
- 游戏参数设置（人数、牌数、速度等）
- 远程开始/停止/暂停发牌
- 紧急停止（QoS 2保证送达）

### 7.4 离线处理模块

- 自动检测设备离线状态
- 离线设备禁用远程操作
- 指令缓存到IndexedDB
- 同类型指令自动覆盖（仅保留最后一条）
- 设备上线自动重发

### 7.5 用户权限模块

| 角色 | 权限 |
|------|------|
| super_admin | 全部权限 |
| admin | 设备管理、用户查看 |
| operator | 设备查看、基础操作 |

---

## 8. 部署说明

### 8.1 前端部署

```bash
# 安装依赖
npm install

# 开发环境
npm run dev

# 生产构建
npm run build

# 产物目录
dist/
```

### 8.2 环境变量

```env
# .env.production
VITE_API_BASE_URL=https://api.guandang-cloud.com/v1
VITE_WS_URL=wss://ws.guandang-cloud.com
```

### 8.3 服务器要求

| 组件 | 要求 |
|------|------|
| MQTT Broker | EMQX / Mosquitto，支持TLS |
| API服务器 | Node.js 18+ / Java 17+ |
| 数据库 | MySQL 8.0+ |
| 缓存 | Redis 7.0+ |

---

## 附录 A: 信号强度等级

| 等级 | dBm范围 | 图标 |
|------|---------|------|
| 优秀 | > -70 | ████ |
| 良好 | -70 ~ -85 | ███░ |
| 一般 | -85 ~ -100 | ██░░ |
| 较差 | < -100 | █░░░ |

## 附录 B: 错误码表

| 错误码 | 说明 |
|--------|------|
| E001 | 设备忙，无法执行指令 |
| E002 | 参数错误 |
| E003 | 硬件故障 |
| E004 | 电量不足 |
| E005 | 通信超时 |
| E006 | 认证失败 |
| E007 | 设备已被其他账号绑定 |
| E008 | 设备序列号不存在 |
| E009 | 密钥验证失败 |

---

**文档版本**: v1.0  
**更新日期**: 2025年12月24日  
**编写**: 掼蛋设备智能管理平台技术团队
    