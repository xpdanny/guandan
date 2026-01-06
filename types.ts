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
  gameRounds: number; // 1-10
  startLevel: number; // 1-13
  isTribute: boolean;
  difficulty: number; // 1-10
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
  lastActive: string;
  config: DeviceConfig;
  connection: DeviceConnection;
  currentRound: number;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ 设备分组 ============
export interface Group {
  id: string;
  name: string;
  deviceIds: string[];
  deviceCount: number;
  createdAt: string;
}

// ============ 指令类型 ============
export type CommandType = 
  | 'START_DEAL'
  | 'STOP_DEAL'
  | 'PAUSE_DEAL'
  | 'RESUME_DEAL'
  | 'RESET'
  | 'EMERGENCY_STOP'
  | 'UPDATE_CONFIG';

// ============ 设备指令 ============
export interface DeviceCommand {
  commandId: string;
  type: CommandType;
  payload: Record<string, unknown>;
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

// ============ 事件类型 ============
export type EventType = 
  | 'DEAL_COMPLETE'
  | 'GAME_COMPLETE'
  | 'LOW_BATTERY'
  | 'ERROR'
  | 'CARD_JAM';

// ============ 设备事件 ============
export interface DeviceEvent {
  deviceId: string;
  eventType: EventType;
  data: Record<string, unknown>;
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

// ============ 设备注册信息 ============
export interface DeviceRegistration {
  sn: string;
  secretKey: string;
}

// ============ 批量注册结果 ============
export interface BatchRegisterResult {
  sn: string;
  success: boolean;
  error?: string;
}

// ============ 用户角色 ============
export type UserRole = 'super_admin' | 'admin' | 'operator';

// ============ 用户模型 ============
export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
  status: 'active' | 'suspended';
}

// ============ 认证状态 ============
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token?: string;
}

// ============ API响应 ============
export interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

// ============ WebSocket消息类型 ============
export type WSMessageType = 
  | 'DEVICE_ONLINE'
  | 'DEVICE_OFFLINE'
  | 'STATUS_UPDATE'
  | 'COMMAND_ACK'
  | 'LOW_BATTERY_ALERT';

// ============ WebSocket消息 ============
export interface WSMessage {
  type: WSMessageType;
  deviceId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ============ 信号强度等级 ============
export type SignalLevel = 'excellent' | 'good' | 'fair' | 'poor';

// ============ 获取信号强度等级 ============
export function getSignalLevel(dBm: number): SignalLevel {
  if (dBm > -70) return 'excellent';
  if (dBm > -85) return 'good';
  if (dBm > -100) return 'fair';
  return 'poor';
}
