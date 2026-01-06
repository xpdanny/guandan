# 真机硬件部署清单

## 📋 部署前检查清单

### 第一步：硬件准备（3 天）

- [ ] **麻将机硬件检查**
  - [ ] 5G 模块已安装
  - [ ] 硬盘已安装（≥ 32GB）
  - [ ] 内存已安装（≥ 2GB）
  - [ ] 摄像头已连接
  - [ ] 电源正常

- [ ] **网络连接**
  - [ ] 5G 信号测试（-70 dBm 以上）
  - [ ] WiFi 信号测试（备用）
  - [ ] DNS 解析测试
  - [ ] 防火墙出站 443、8883 端口开放

- [ ] **时间同步**
  - [ ] 启用 NTP 客户端
  - [ ] 时间误差 < 5 秒

### 第二步：工厂烧录（1 天）

- [ ] **固件准备**
  - [ ] 烧录 Linux 系统镜像
  - [ ] 安装依赖软件包
    - [ ] curl/wget
    - [ ] openssl
    - [ ] nodejs/runtime

- [ ] **设备参数烧录**（不可逆）
  - [ ] 设备 SN（序列号）→ `/etc/guandan/device.sn`
  - [ ] Secret Key 密钥 → `/etc/guandan/device.secret` (600 权限)
  - [ ] MAC 地址记录（用于追踪）

- [ ] **证书配置**
  - [ ] 生产 CA 证书 → `/etc/ssl/certs/guandang-ca.pem`
  - [ ] 本地时间校准
  - [ ] 证书链验证通过

### 第三步：软件部署（2 天）

- [ ] **SDK 集成**
  - [ ] `deviceSDK.ts` 移植为 Rust/C 版本
  - [ ] 心跳周期配置：30 秒
  - [ ] 重连策略配置：指数退避
  - [ ] 离线缓存配置：SQLite/RocksDB

- [ ] **配置文件**
  ```ini
  # /etc/guandan/config.ini
  [network]
  api_base_url = https://api.guandang-cloud.com/api
  mqtt_broker = mqtt.guandang-cloud.com
  mqtt_port = 8883
  ws_url = wss://ws.guandang-cloud.com
  
  [security]
  tls_verify_peer = true
  tls_version = TLSv1.3
  ca_cert_path = /etc/ssl/certs/guandang-ca.pem
  
  [heartbeat]
  interval_seconds = 30
  timeout_seconds = 5
  ```

- [ ] **启动脚本**
  ```bash
  # /etc/systemd/system/guandan-device.service
  [Unit]
  Description=Guandan Device Service
  After=network.target
  
  [Service]
  Type=simple
  ExecStart=/usr/local/bin/guandan-device
  Restart=always
  RestartSec=10
  
  [Install]
  WantedBy=multi-user.target
  ```

- [ ] **启动及验证**
  ```bash
  systemctl enable guandan-device
  systemctl start guandan-device
  journalctl -u guandan-device -f  # 查看日志
  ```

### 第四步：现场测试（1 天）

#### 4.1 本地环境验证（实验室）

```bash
# 1. 检查设备参数
cat /etc/guandan/device.sn
cat /etc/guandan/device.secret

# 2. 检查网络连接
ping api.guandang-cloud.com
nslookup api.guandang-cloud.com

# 3. 检查 TLS 证书
openssl s_client -connect api.guandang-cloud.com:443

# 4. 启动设备并查看日志
journalctl -u guandan-device -n 50 --follow
```

#### 4.2 功能测试（按顺序）

| 测试项 | 预期结果 | 实际结果 | 备注 |
|--------|--------|--------|------|
| **网络连接** | 心跳发送成功 | \_\_\_\_ | 检查日志 |
| **设备注册** | 获得 JWT Token | \_\_\_\_ | 有效期 24h |
| **状态上报** | 状态变化被记录 | \_\_\_\_ | 管理后台可见 |
| **命令执行** | 下发命令被执行 | \_\_\_\_ | 执行结果上报 |
| **离线缓存** | 命令被缓存 | \_\_\_\_ | 网络恢复后同步 |
| **文件上传** | 截图上传成功 | \_\_\_\_ | URL 可访问 |
| **Token 刷新** | 自动获得新 Token | \_\_\_\_ | 无中断服务 |

#### 4.3 压力测试

```bash
# 模拟 200 台设备同时在线
./device-simulator.html &
# 期望结果：后台能处理 200+ 并发连接，无崩溃

# 监控服务器性能
top -p $(pgrep guandan-device)
# CPU < 50%, Memory < 500MB
```

#### 4.4 故障测试

```
断网 5 分钟后恢复
  ✓ 命令缓存（同类型覆盖）
  ✓ 网络恢复自动同步
  ✓ 无数据丢失

强信号 (-50dBm) → 弱信号 (-100dBm)
  ✓ 心跳仍然能发送
  ✓ 信号强度值正确更新

设备重启
  ✓ 服务自动启动（systemd）
  ✓ Token 从本地恢复
  ✓ 无需重新注册
```

### 第五步：上线部署（生产）

#### 5.1 机房配置

- [ ] 设备摆放位置确认
- [ ] 5G 信号强度验证（> -80 dBm）
- [ ] 电源接入（带 UPS）
- [ ] 冷却系统启用

#### 5.2 用户培训

- [ ] 操作员培训（启动、停止、故障处理）
- [ ] 管理员培训（后台管理、命令下发）
- [ ] 应急响应流程

#### 5.3 监控部署

- [ ] 部署监控告警系统
  ```typescript
  监控指标：
  • 设备在线状态（实时）
  • 心跳延迟（应 < 5s）
  • 信号强度（应 > -80 dBm）
  • 错误率（应 < 0.1%）
  • 命令执行成功率（应 > 99%)
  ```

- [ ] 日志收集
  ```bash
  # 收集到日志服务器
  /var/log/guandan/device.log → ELK Stack
  ```

#### 5.4 故障处理

| 故障现象 | 第一步 | 第二步 | 第三步 |
|--------|--------|--------|--------|
| 离线 | 检查 5G 信号 | 检查网络连接 | 重启设备 |
| 心跳延迟 > 10s | 检查 CPU/Memory | 检查网络延迟 | 通知运维 |
| 命令未执行 | 检查 Token 有效性 | 检查设备日志 | 重新下发 |
| 文件上传失败 | 检查文件大小 < 50MB | 重试上传 | 通知技术支持 |

### 第六步：文件清单

部署时应包含以下文件：

```
掼蛋设备智能管理平台/
├── 代码文件
│   ├── services/
│   │   ├── device/deviceSDK.ts        ← 核心 SDK
│   │   ├── api/
│   │   │   ├── httpClient.ts
│   │   │   └── authApi.ts
│   │   ├── websocket/
│   │   │   └── wsClient.ts
│   │   ├── mqtt/
│   │   │   └── protocol.ts
│   │   └── offline/
│   │       └── cacheManager.ts
│   ├── config/
│   │   └── networkConfig.ts            ← 环境配置
│   └── components/
│       ├── Dashboard.tsx
│       └── ...
│
├── 配置文件
│   └── /etc/guandan/config.ini         ← 设备配置
│
├── 文档
│   ├── API_SPEC.md                    ← API 规范
│   ├── REAL_HARDWARE_GUIDE.md          ← 硬件指南
│   ├── QUICK_REFERENCE.md              ← 快速参考
│   └── DEPLOYMENT_CHECKLIST.md         ← 本文档
│
└── 工具
    ├── test-real-hardware.ts           ← 集成测试
    └── device-simulator.html           ← 开发用模拟器
```

### 第七步：上线后监控

#### 周期检查

**每天：**
- [ ] 检查设备在线状态
- [ ] 检查错误日志
- [ ] 检查心跳延迟

**每周：**
- [ ] 检查 Token 刷新日志
- [ ] 检查命令执行成功率
- [ ] 备份日志文件

**每月：**
- [ ] 生成性能报告
- [ ] 安全性审计
- [ ] 容量规划

#### 关键指标

```
可用性指标：
  目标: 99.5% 以上
  = (总运行时间 - 故障时间) / 总运行时间

命令执行指标：
  目标: 99% 以上成功率
  失败原因统计（网络、超时、业务错误等）

响应时间指标：
  心跳延迟: < 5s（目标）
  命令下发到执行: < 30s（目标）
  文件上传: < 10s（目标）
```

### 第八步：版本升级

#### 固件更新流程

```
1. 新固件发布
   ↓
2. 推送到设备（OTA 更新）
3. 设备下载新固件
4. 设备重启应用新固件
5. 上报版本号
6. 升级完成日志记录
```

#### 回滚方案

```
若新版本发现严重问题：
1. 暂停新版本部署
2. 生成回滚指令
3. 下发至全部设备
4. 验证回滚成功
5. 问题分析报告
```

---

## ✅ 最终交付检查

- [ ] 所有文档完整
- [ ] 所有测试通过
- [ ] 生产环境配置就位
- [ ] 监控系统就位
- [ ] 运维团队培训完成
- [ ] 应急预案已制定
- [ ] 性能基线已建立

---

## 📞 紧急联系

| 岗位 | 姓名 | 电话 | 备注 |
|------|------|------|------|
| 技术负责人 | \_\_\_\_ | \_\_\_\_ | \_\_\_\_ |
| 运维负责人 | \_\_\_\_ | \_\_\_\_ | \_\_\_\_ |
| 厂商技术支持 | \_\_\_\_ | \_\_\_\_ | 硬件故障 |

---

**版本:** 1.0.0 | **最后更新:** 2025-01-03 | **状态:** Ready for Deployment
