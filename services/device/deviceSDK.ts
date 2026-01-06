/**
 * 真机设备 MQTT + HTTP 通讯 SDK
 * 用于嵌入式设备与云服务器通讯
 * 
 * 本文件作为参考，在真实设备（嵌入式 Linux）上使用 Rust/C 实现更高效
 */

import type { DeviceCommand } from '../../types';

export interface RegisterResponse {
  success: boolean;
  device_id: string;
  jwt_token: string;
  token_expires_in: number;
  mqtt_broker: string;
  ws_url: string;
  api_base: string;
}

export interface HeartbeatPayload {
  sn: string;
  type: 'heartbeat';
  ts: number;
  heartbeat: true;
  signal: number;
  battery: number;
  status: 'online' | 'busy' | 'paused' | 'error' | 'offline';
  uptime_seconds: number;
  game_count: number;
  error_count: number;
}

export interface StatusPayload {
  sn: string;
  type: 'status';
  ts: number;
  status: 'online' | 'busy' | 'paused' | 'error' | 'offline';
  current_game: {
    game_id: string;
    round: number;
    total_rounds: number;
    players: number;
    current_level: number;
  };
  card_status: {
    deck_count: number;
    cards_dealt: number;
    cards_remaining: number;
  };
}

export interface TelemetryPayload {
  sn: string;
  type: 'telemetry';
  ts: number;
  hardware: {
    cpu_temp: number;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
  };
  network: {
    signal_strength: number;
    signal_bars: number;
    network_type: string;
    connected_ap: string;
  };
  power: {
    battery_level: number;
    charging: boolean;
    estimated_runtime_hours: number;
  };
}

export interface CommandAckPayload {
  sn: string;
  type: 'cmd_ack';
  ts: number;
  cmd_id: string;
  cmd_type: string;
  status: 'success' | 'pending' | 'failed' | 'timeout';
  result?: Record<string, any>;
  error?: string;
}

export interface PendingCommand {
  cmd_id: string;
  cmd_type: string;
  priority: string;
  payload: Record<string, any>;
  created_at: number;
  expires_at: number;
}

export interface UploadImageResponse {
  success: boolean;
  file_id: string;
  file_url: string;
  stored_path: string;
  upload_time_ms: number;
}

/**
 * 真机设备 SDK
 * 
 * 用法示例：
 * ```typescript
 * const sdk = new DeviceSDK('GD20251225001', 'a1b2c3d4e5f6g7h8');
 * await sdk.register();
 * sdk.startHeartbeat();
 * await sdk.reportStatus('busy', { ... });
 * ```
 */
export class DeviceSDK {
  private sn: string;
  private secretKey: string;
  private apiBase: string = 'https://api.guandang-cloud.com:8081/api';
  private jwtToken: string | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private uptimeSeconds = 0;
  private gameCount = 0;
  private errorCount = 0;

  constructor(sn: string, secretKey: string, apiBase?: string) {
    this.sn = sn;
    this.secretKey = secretKey;
    if (apiBase) this.apiBase = apiBase;
  }

  /**
   * 设备初次注册
   */
  async register(model: string = 'GD_DEALERV2', firmware: string = '1.0.0'): Promise<RegisterResponse> {
    const body = {
      sn: this.sn,
      secret_key: this.secretKey,
      model,
      firmware,
      '5g_imei': 'N/A',
      imsi: 'N/A'
    };

    const res = await fetch(`${this.apiBase}/device/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Register failed: ${res.status}`);

    const data = (await res.json()) as RegisterResponse;
    if (data.success) {
      this.jwtToken = data.jwt_token;
      this.apiBase = data.api_base;
    }
    return data;
  }

  /**
   * 发送心跳
   */
  async sendHeartbeat(signal: number, battery: number, status: 'online' | 'busy' | 'offline' = 'online'): Promise<void> {
    const payload: HeartbeatPayload = {
      sn: this.sn,
      type: 'heartbeat',
      ts: Date.now(),
      heartbeat: true,
      signal,
      battery,
      status,
      uptime_seconds: this.uptimeSeconds,
      game_count: this.gameCount,
      error_count: this.errorCount
    };

    await this._postAuth('/device/heartbeat', payload);
  }

  /**
   * 启动自动心跳（每 30 秒一次）
   */
  startHeartbeat(signal: number, battery: number): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      this.uptimeSeconds += 30;
      this.sendHeartbeat(signal, battery).catch(e => console.error('Heartbeat failed:', e));
    }, 30000);
  }

  /**
   * 停止自动心跳
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 上报设备状态
   */
  async reportStatus(
    status: 'online' | 'busy' | 'paused' | 'error' | 'offline',
    gameInfo: { game_id: string; round: number; total_rounds: number; players: number; level: number }
  ): Promise<void> {
    const payload: StatusPayload = {
      sn: this.sn,
      type: 'status',
      ts: Date.now(),
      status,
      current_game: {
        game_id: gameInfo.game_id,
        round: gameInfo.round,
        total_rounds: gameInfo.total_rounds,
        players: gameInfo.players,
        current_level: gameInfo.level
      },
      card_status: {
        deck_count: 1,
        cards_dealt: gameInfo.round * 27,
        cards_remaining: 108 - gameInfo.round * 27
      }
    };

    await this._postAuth('/device/status', payload);
  }

  /**
   * 上报遥测数据
   */
  async reportTelemetry(
    cpuTemp: number,
    cpuUsage: number,
    memUsage: number,
    diskUsage: number,
    signal: number,
    battery: number
  ): Promise<void> {
    const payload: TelemetryPayload = {
      sn: this.sn,
      type: 'telemetry',
      ts: Date.now(),
      hardware: {
        cpu_temp: cpuTemp,
        cpu_usage: cpuUsage,
        memory_usage: memUsage,
        disk_usage: diskUsage
      },
      network: {
        signal_strength: signal,
        signal_bars: this._getSignalBars(signal),
        network_type: '5G',
        connected_ap: 'TOWER-01'
      },
      power: {
        battery_level: battery,
        charging: false,
        estimated_runtime_hours: Math.ceil((battery / 100) * 24)
      }
    };

    await this._postAuth('/device/telemetry', payload);
  }

  /**
   * 查询待执行命令
   */
  async queryPendingCommands(): Promise<PendingCommand[]> {
    const res = await this._getAuth(`/device/commands/pending?sn=${this.sn}`);
    const data = (await res.json()) as { commands: PendingCommand[] };
    return data.commands;
  }

  /**
   * 上报命令执行结果
   */
  async ackCommand(
    cmdId: string,
    cmdType: string,
    status: 'success' | 'pending' | 'failed' | 'timeout',
    result?: Record<string, any>,
    error?: string
  ): Promise<void> {
    const payload: CommandAckPayload = {
      sn: this.sn,
      type: 'cmd_ack',
      ts: Date.now(),
      cmd_id: cmdId,
      cmd_type: cmdType,
      status,
      result,
      error
    };

    await this._postAuth('/device/commands/ack', payload);
  }

  /**
   * 上传图片文件（Multipart）
   */
  async uploadImage(
    gameId: string,
    round: number,
    imageBuffer: Buffer,
    checksum: string
  ): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('sn', this.sn);
    formData.append('game_id', gameId);
    formData.append('round', String(round));
    formData.append('file_type', 'image/jpeg');
    formData.append('file_size', String(imageBuffer.length));
    formData.append('checksum_md5', checksum);
    formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }));

    const res = await fetch(`${this.apiBase}/device/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.jwtToken}` },
      body: formData
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  }

  /**
   * 刷新 JWT Token
   */
  async refreshToken(): Promise<string> {
    const res = await fetch(`${this.apiBase}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sn: this.sn })
    });

    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

    const data = (await res.json()) as { jwt_token: string };
    this.jwtToken = data.jwt_token;
    return this.jwtToken;
  }

  /**
   * 获取已设置的 JWT Token
   */
  getToken(): string | null {
    return this.jwtToken;
  }

  /**
   * 设置 JWT Token（用于恢复会话）
   */
  setToken(token: string): void {
    this.jwtToken = token;
  }

  // ============ 私有方法 ============

  private async _postAuth(path: string, body: any): Promise<Response> {
    if (!this.jwtToken) throw new Error('Not authenticated');

    const res = await fetch(`${this.apiBase}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (res.status === 401) {
      // Token 过期，尝试刷新
      await this.refreshToken();
      return this._postAuth(path, body); // 递归重试
    }

    if (!res.ok) {
      throw new Error(`API call failed: ${res.status} ${await res.text()}`);
    }

    return res;
  }

  private async _getAuth(path: string): Promise<Response> {
    if (!this.jwtToken) throw new Error('Not authenticated');

    const res = await fetch(`${this.apiBase}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.jwtToken}`
      }
    });

    if (res.status === 401) {
      await this.refreshToken();
      return this._getAuth(path);
    }

    if (!res.ok) {
      throw new Error(`API call failed: ${res.status}`);
    }

    return res;
  }

  private _getSignalBars(signal: number): number {
    if (signal > -60) return 4;
    if (signal > -75) return 3;
    if (signal > -90) return 2;
    return 1;
  }
}

export default DeviceSDK;
