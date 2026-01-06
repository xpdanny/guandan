/**
 * 认证 API 接口
 */

import { post } from './httpClient';
import type { User, DeviceRegistration, BatchRegisterResult } from '../../types';

// ============ 请求/响应类型 ============

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  expiresIn: number;
  user: User;
}

interface DeviceAuthRequest {
  sn: string;
  secretKey: string;
  timestamp: number;
  signature: string;
}

interface DeviceAuthResponse {
  token: string;
  expiresIn: number;
}

interface RegisterDeviceResponse {
  deviceId: string;
  sn: string;
}

interface BatchRegisterResponse {
  total: number;
  success: number;
  failed: number;
  results: BatchRegisterResult[];
}

// ============ API 方法 ============

/**
 * 用户登录
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await post<LoginResponse>('/auth/login', {
    username,
    password,
  } as LoginRequest);

  if (response.code !== 0) {
    throw new Error(response.message || '登录失败');
  }

  return response.data;
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  await post('/auth/logout');
}

/**
 * 刷新 Token
 */
export async function refreshToken(): Promise<{ token: string; expiresIn: number }> {
  const response = await post<{ token: string; expiresIn: number }>('/auth/refresh');

  if (response.code !== 0) {
    throw new Error(response.message || 'Token 刷新失败');
  }

  return response.data;
}

/**
 * 设备认证（设备端使用）
 */
export async function deviceAuth(
  sn: string,
  secretKey: string
): Promise<DeviceAuthResponse> {
  const timestamp = Date.now();
  // 实际应用中需要根据密钥生成签名
  const signature = await generateSignature(sn, secretKey, timestamp);

  const response = await post<DeviceAuthResponse>('/api/device/auth', {
    sn,
    secretKey,
    timestamp,
    signature,
  } as DeviceAuthRequest);

  if (response.code !== 0) {
    throw new Error(response.message || '设备认证失败');
  }

  return response.data;
}

/**
 * 注册单个设备
 */
export async function registerDevice(
  sn: string,
  secretKey: string
): Promise<RegisterDeviceResponse> {
  const response = await post<RegisterDeviceResponse>('/devices/register', {
    sn,
    secretKey,
  });

  if (response.code !== 0) {
    throw new Error(response.message || '设备注册失败');
  }

  return response.data;
}

/**
 * 批量注册设备
 */
export async function batchRegisterDevices(
  devices: DeviceRegistration[]
): Promise<BatchRegisterResponse> {
  const response = await post<BatchRegisterResponse>('/devices/batch-register', {
    devices,
  });

  if (response.code !== 0) {
    throw new Error(response.message || '批量注册失败');
  }

  return response.data;
}

/**
 * 生成签名（简化版本，实际应使用 HMAC-SHA256）
 */
async function generateSignature(
  sn: string,
  secretKey: string,
  timestamp: number
): Promise<string> {
  const message = `${sn}:${timestamp}:${secretKey}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  login,
  logout,
  refreshToken,
  deviceAuth,
  registerDevice,
  batchRegisterDevices,
};
