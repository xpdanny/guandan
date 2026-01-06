/**
 * MQTT 协议定义
 * 定义 Topic 规范、消息格式、QoS 级别
 */

import type { CommandType, DeviceConfig } from '../../types';

// ============ Topic 定义 ============

/**
 * 生成设备状态上报 Topic
 */
export function getStatusTopic(deviceId: string): string {
  return `gd/${deviceId}/status`;
}

/**
 * 生成设备心跳 Topic
 */
export function getHeartbeatTopic(deviceId: string): string {
  return `gd/${deviceId}/heartbeat`;
}

/**
 * 生成设备事件 Topic
 */
export function getEventTopic(deviceId: string): string {
  return `gd/${deviceId}/event`;
}

/**
 * 生成指令下发 Topic
 */
export function getCommandTopic(deviceId: string): string {
  return `gd/${deviceId}/cmd`;
}

/**
 * 生成指令响应 Topic
 */
export function getCommandAckTopic(deviceId: string): string {
  return `gd/${deviceId}/cmd/ack`;
}

/**
 * 生成配置更新 Topic
 */
export function getConfigTopic(deviceId: string): string {
  return `gd/${deviceId}/config`;
}

// ============ QoS 级别定义 ============

export enum QoS {
  AT_MOST_ONCE = 0,  // 最多一次（尽力而为）
  AT_LEAST_ONCE = 1, // 至少一次
  EXACTLY_ONCE = 2,  // 恰好一次
}

/**
 * 获取指令对应的 QoS 级别
 */
export function getCommandQoS(command: CommandType): QoS {
  switch (command) {
    // 紧急停止类指令使用 QoS 2，确保恰好送达一次
    case 'STOP_DEAL':
    case 'EMERGENCY_STOP':
      return QoS.EXACTLY_ONCE;

    // 配置更新和普通控制指令使用 QoS 1
    case 'START_DEAL':
    case 'PAUSE_DEAL':
    case 'RESUME_DEAL':
    case 'RESET':
    case 'UPDATE_CONFIG':
      return QoS.AT_LEAST_ONCE;

    default:
      return QoS.AT_LEAST_ONCE;
  }
}

// ============ 消息格式定义 ============

/**
 * 心跳消息
 */
export interface HeartbeatMessage {
  type: 'HEARTBEAT';
  deviceId: string;
  timestamp: number;
  data: {
    battery: number;
    signalStrength: number;
    temperature: number;
    firmwareVersion: string;
  };
}

/**
 * 状态上报消息
 */
export interface StatusMessage {
  type: 'STATUS';
  deviceId: string;
  timestamp: number;
  data: {
    status: 'ONLINE' | 'BUSY' | 'OFFLINE' | 'ERROR';
    currentRound: number;
    totalRounds: number;
    playerCount: number;
    deckCount: number;
  };
}

/**
 * 事件消息
 */
export interface EventMessage {
  type: 'EVENT';
  deviceId: string;
  timestamp: number;
  eventType: 'DEAL_COMPLETE' | 'GAME_COMPLETE' | 'LOW_BATTERY' | 'ERROR' | 'CARD_JAM';
  data: Record<string, unknown>;
}

/**
 * 指令消息
 */
export interface CommandMessage {
  type: 'COMMAND';
  commandId: string;
  timestamp: number;
  command: CommandType;
  payload: Record<string, unknown>;
}

/**
 * 配置更新消息
 */
export interface ConfigUpdateMessage {
  type: 'CONFIG_UPDATE';
  commandId: string;
  timestamp: number;
  config: Partial<DeviceConfig>;
}

/**
 * 指令响应消息
 */
export interface CommandAckMessage {
  type: 'COMMAND_ACK';
  commandId: string;
  deviceId: string;
  timestamp: number;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
}

// ============ 消息构建器 ============

/**
 * 生成唯一指令ID
 */
export function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * 构建指令消息
 */
export function buildCommandMessage(
  command: CommandType,
  payload: Record<string, unknown> = {}
): CommandMessage {
  return {
    type: 'COMMAND',
    commandId: generateCommandId(),
    timestamp: Date.now(),
    command,
    payload,
  };
}

/**
 * 构建配置更新消息
 */
export function buildConfigUpdateMessage(
  config: Partial<DeviceConfig>
): ConfigUpdateMessage {
  return {
    type: 'CONFIG_UPDATE',
    commandId: generateCommandId(),
    timestamp: Date.now(),
    config,
  };
}

// ============ 错误码定义 ============

export const ERROR_CODES = {
  E001: '设备忙，无法执行指令',
  E002: '参数错误',
  E003: '硬件故障',
  E004: '电量不足',
  E005: '通信超时',
  E006: '认证失败',
  E007: '设备已被其他账号绑定',
  E008: '设备序列号不存在',
  E009: '密钥验证失败',
} as const;

/**
 * 获取错误码描述
 */
export function getErrorMessage(code: string): string {
  return ERROR_CODES[code as keyof typeof ERROR_CODES] || '未知错误';
}

// ============ 常量 ============

export const MQTT_CONFIG = {
  HEARTBEAT_INTERVAL: 30000,      // 30秒心跳间隔
  OFFLINE_TIMEOUT: 90000,         // 90秒离线超时
  RECONNECT_INTERVAL: 5000,       // 5秒重连间隔
  MAX_RECONNECT_ATTEMPTS: 10,     // 最大重连次数
} as const;

export default {
  getStatusTopic,
  getHeartbeatTopic,
  getEventTopic,
  getCommandTopic,
  getCommandAckTopic,
  getConfigTopic,
  getCommandQoS,
  generateCommandId,
  buildCommandMessage,
  buildConfigUpdateMessage,
  getErrorMessage,
  QoS,
  ERROR_CODES,
  MQTT_CONFIG,
};
