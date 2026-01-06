/**
 * WebSocket 客户端
 * 用于接收设备状态实时推送
 */

import type { WSMessage, WSMessageType } from '../../types';

// WebSocket 配置
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://ws.guandang-cloud.com';
const HEARTBEAT_INTERVAL = 5000; // 5秒心跳
const RECONNECT_INITIAL_DELAY = 1000; // 初始重连延迟
const RECONNECT_MAX_DELAY = 30000; // 最大重连延迟
const RECONNECT_MULTIPLIER = 2; // 重连延迟倍数

// 消息处理器类型
type MessageHandler = (message: WSMessage) => void;

// WebSocket 客户端类
class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private isConnected = false;
  private isManualClose = false;
  private reconnectDelay = RECONNECT_INITIAL_DELAY;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private handlers: Map<WSMessageType | 'all', Set<MessageHandler>> = new Map();

  constructor(url: string = WS_URL) {
    this.url = url;
  }

  /**
   * 连接 WebSocket
   */
  connect(token: string): void {
    if (this.ws && this.isConnected) {
      console.warn('WebSocket 已连接');
      return;
    }

    this.token = token;
    this.isManualClose = false;
    this.createConnection();
  }

  /**
   * 创建 WebSocket 连接
   */
  private createConnection(): void {
    try {
      const wsUrl = `${this.url}?token=${this.token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * 处理连接打开
   */
  private handleOpen(): void {
    console.log('WebSocket 连接成功');
    this.isConnected = true;
    this.reconnectDelay = RECONNECT_INITIAL_DELAY;
    this.startHeartbeat();
  }

  /**
   * 处理收到消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WSMessage = JSON.parse(event.data);

      // 心跳响应
      if ((message as unknown as { type: string }).type === 'PONG') {
        return;
      }

      // 触发对应类型的处理器
      this.triggerHandlers(message.type, message);
      // 触发通用处理器
      this.triggerHandlers('all', message);
    } catch (error) {
      console.error('解析 WebSocket 消息失败:', error);
    }
  }

  /**
   * 处理连接关闭
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket 连接关闭:', event.code, event.reason);
    this.isConnected = false;
    this.stopHeartbeat();

    if (!this.isManualClose) {
      this.scheduleReconnect();
    }
  }

  /**
   * 处理连接错误
   */
  private handleError(event: Event): void {
    console.error('WebSocket 错误:', event);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    this.cancelReconnect();

    if (this.ws) {
      this.ws.close(1000, '用户主动断开');
      this.ws = null;
    }

    this.isConnected = false;
  }

  /**
   * 发送消息
   */
  send(data: unknown): void {
    if (!this.ws || !this.isConnected) {
      console.warn('WebSocket 未连接，无法发送消息');
      return;
    }

    this.ws.send(JSON.stringify(data));
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: 'PING', timestamp: Date.now() });
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    console.log(`${this.reconnectDelay / 1000} 秒后尝试重连...`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.createConnection();

      // 增加重连延迟（指数退避）
      this.reconnectDelay = Math.min(
        this.reconnectDelay * RECONNECT_MULTIPLIER,
        RECONNECT_MAX_DELAY
      );
    }, this.reconnectDelay);
  }

  /**
   * 取消重连
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 注册消息处理器
   */
  on(type: WSMessageType | 'all', handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  /**
   * 取消注册消息处理器
   */
  off(type: WSMessageType | 'all', handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  /**
   * 触发消息处理器
   */
  private triggerHandlers(type: WSMessageType | 'all', message: WSMessage): void {
    this.handlers.get(type)?.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('消息处理器执行失败:', error);
      }
    });
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// 导出单例
export const wsClient = new WSClient();

export default wsClient;
