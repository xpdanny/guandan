/**
 * HTTP 客户端封装
 * 基于 Axios，包含 Token 拦截器和错误处理
 */

import type { ApiResponse } from '../../types';

// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.guandang-cloud.com/v1';
const REQUEST_TIMEOUT = 30000;

// Token 存储键
const TOKEN_KEY = 'auth_token';

/**
 * 获取存储的 Token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 设置 Token
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 清除 Token
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 构建请求头
 */
function buildHeaders(customHeaders?: Record<string, string>): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...customHeaders,
  });

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

/**
 * 处理响应
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    // 401 未授权，清除 Token 并跳转登录
    if (response.status === 401) {
      clearToken();
      window.location.href = '/login';
      throw new Error('认证已过期，请重新登录');
    }

    // 其他错误
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `请求失败: ${response.status}`);
  }

  return response.json();
}

/**
 * GET 请求
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean>
): Promise<ApiResponse<T>> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  return handleResponse<T>(response);
}

/**
 * POST 请求
 */
export async function post<T>(
  endpoint: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  return handleResponse<T>(response);
}

/**
 * PUT 请求
 */
export async function put<T>(
  endpoint: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  return handleResponse<T>(response);
}

/**
 * DELETE 请求
 */
export async function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: buildHeaders(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  return handleResponse<T>(response);
}

export default {
  get,
  post,
  put,
  delete: del,
  getToken,
  setToken,
  clearToken,
};
