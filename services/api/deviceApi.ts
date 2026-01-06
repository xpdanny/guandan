/**
 * 设备 API 接口
 */

import { get, post, put, del } from './httpClient';
import type { 
  Device, 
  DeviceConfig, 
  DeviceCommand, 
  CommandAck,
  CommandType 
} from '../../types';

// ============ 请求/响应类型 ============

interface DeviceListParams {
  page?: number;
  size?: number;
  status?: string;
  groupId?: string;
  search?: string;
}

interface DeviceListResponse {
  devices: Device[];
  total: number;
  page: number;
  size: number;
}

interface SendCommandRequest {
  command: CommandType;
  payload?: Record<string, unknown>;
}

// ============ API 方法 ============

/**
 * 获取设备列表
 */
export async function getDevices(params?: DeviceListParams): Promise<DeviceListResponse> {
  const response = await get<DeviceListResponse>('/devices', params as Record<string, string | number | boolean>);

  if (response.code !== 0) {
    throw new Error(response.message || '获取设备列表失败');
  }

  return response.data;
}

/**
 * 获取单个设备详情
 */
export async function getDevice(deviceId: string): Promise<Device> {
  const response = await get<Device>(`/devices/${deviceId}`);

  if (response.code !== 0) {
    throw new Error(response.message || '获取设备详情失败');
  }

  return response.data;
}

/**
 * 更新设备信息
 */
export async function updateDevice(
  deviceId: string,
  data: Partial<Device>
): Promise<Device> {
  const response = await put<Device>(`/devices/${deviceId}`, data);

  if (response.code !== 0) {
    throw new Error(response.message || '更新设备失败');
  }

  return response.data;
}

/**
 * 删除设备
 */
export async function deleteDevice(deviceId: string): Promise<void> {
  const response = await del(`/devices/${deviceId}`);

  if (response.code !== 0) {
    throw new Error(response.message || '删除设备失败');
  }
}

/**
 * 更新设备配置
 */
export async function updateDeviceConfig(
  deviceId: string,
  config: Partial<DeviceConfig>
): Promise<Device> {
  const response = await put<Device>(`/devices/${deviceId}/config`, config);

  if (response.code !== 0) {
    throw new Error(response.message || '更新配置失败');
  }

  return response.data;
}

/**
 * 批量更新设备配置
 */
export async function batchUpdateConfig(
  deviceIds: string[],
  config: Partial<DeviceConfig>
): Promise<{ success: number; failed: number }> {
  const response = await post<{ success: number; failed: number }>(
    '/devices/batch-config',
    { deviceIds, config }
  );

  if (response.code !== 0) {
    throw new Error(response.message || '批量更新配置失败');
  }

  return response.data;
}

/**
 * 发送设备指令
 */
export async function sendCommand(
  deviceId: string,
  command: CommandType,
  payload?: Record<string, unknown>
): Promise<CommandAck> {
  const response = await post<CommandAck>(`/devices/${deviceId}/command`, {
    command,
    payload,
  } as SendCommandRequest);

  if (response.code !== 0) {
    throw new Error(response.message || '发送指令失败');
  }

  return response.data;
}

/**
 * 批量发送设备指令
 */
export async function batchSendCommand(
  deviceIds: string[],
  command: CommandType,
  payload?: Record<string, unknown>
): Promise<{ success: number; failed: number; results: CommandAck[] }> {
  const response = await post<{ success: number; failed: number; results: CommandAck[] }>(
    '/devices/batch-command',
    { deviceIds, command, payload }
  );

  if (response.code !== 0) {
    throw new Error(response.message || '批量发送指令失败');
  }

  return response.data;
}

/**
 * 开始发牌
 */
export async function startDeal(deviceId: string, roundNumber?: number): Promise<CommandAck> {
  return sendCommand(deviceId, 'START_DEAL', { roundNumber: roundNumber || 1 });
}

/**
 * 停止发牌
 */
export async function stopDeal(deviceId: string): Promise<CommandAck> {
  return sendCommand(deviceId, 'STOP_DEAL');
}

/**
 * 暂停发牌
 */
export async function pauseDeal(deviceId: string): Promise<CommandAck> {
  return sendCommand(deviceId, 'PAUSE_DEAL');
}

/**
 * 继续发牌
 */
export async function resumeDeal(deviceId: string): Promise<CommandAck> {
  return sendCommand(deviceId, 'RESUME_DEAL');
}

/**
 * 复位设备
 */
export async function resetDevice(deviceId: string): Promise<CommandAck> {
  return sendCommand(deviceId, 'RESET');
}

/**
 * 紧急停止
 */
export async function emergencyStop(deviceId: string): Promise<CommandAck> {
  return sendCommand(deviceId, 'EMERGENCY_STOP');
}

/**
 * 获取设备分组列表
 */
export async function getGroups(): Promise<{ id: string; name: string; deviceCount: number }[]> {
  const response = await get<{ id: string; name: string; deviceCount: number }[]>('/groups');

  if (response.code !== 0) {
    throw new Error(response.message || '获取分组列表失败');
  }

  return response.data;
}

/**
 * 创建设备分组
 */
export async function createGroup(
  name: string,
  deviceIds: string[]
): Promise<{ id: string; name: string }> {
  const response = await post<{ id: string; name: string }>('/groups', {
    name,
    deviceIds,
  });

  if (response.code !== 0) {
    throw new Error(response.message || '创建分组失败');
  }

  return response.data;
}

/**
 * 删除设备分组
 */
export async function deleteGroup(groupId: string): Promise<void> {
  const response = await del(`/groups/${groupId}`);

  if (response.code !== 0) {
    throw new Error(response.message || '删除分组失败');
  }
}

export default {
  getDevices,
  getDevice,
  updateDevice,
  deleteDevice,
  updateDeviceConfig,
  batchUpdateConfig,
  sendCommand,
  batchSendCommand,
  startDeal,
  stopDeal,
  pauseDeal,
  resumeDeal,
  resetDevice,
  emergencyStop,
  getGroups,
  createGroup,
  deleteGroup,
};
