/**
 * 全局消息存储与订阅管理
 * 用于跨窗口通信（模拟器 <-> 管理后台）
 */

type MessageListener = (msg: DeviceMessage) => void;

export interface DeviceMessage {
  id: string;
  timestamp: number;
  sn: string;
  type: string;
  payload: Record<string, any>;
}

class MessageStore {
  private messages: DeviceMessage[] = [];
  private listeners: Set<MessageListener> = new Set();
  private channel: BroadcastChannel | null = null;
  private maxMessages = 500;

  constructor() {
    this.initBroadcastChannel();
  }

  private initBroadcastChannel() {
    try {
      this.channel = new BroadcastChannel('guandan_devices');
      this.channel.onmessage = (event) => {
        const msg = event.data as DeviceMessage;
        if (msg && msg.id && msg.timestamp) {
          this.addMessage(msg);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }
  }

  /**
   * 添加消息到存储
   */
  addMessage(msg: DeviceMessage): void {
    const record: DeviceMessage = {
      id: msg.id || `${Date.now()}_${Math.random()}`,
      timestamp: msg.timestamp || Date.now(),
      sn: msg.sn || 'unknown',
      type: msg.type || 'unknown',
      payload: msg.payload || {}
    };

    this.messages.unshift(record);
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(0, this.maxMessages);
    }

    this.notifyListeners(record);
  }

  /**
   * 订阅消息变化
   */
  subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 获取所有消息
   */
  getMessages(): DeviceMessage[] {
    return [...this.messages];
  }

  /**
   * 清空所有消息
   */
  clear(): void {
    this.messages = [];
    this.notifyListeners({ id: 'CLEAR', timestamp: Date.now(), sn: '', type: 'CLEAR', payload: {} });
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(msg: DeviceMessage): void {
    this.listeners.forEach(listener => {
      try {
        listener(msg);
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }
}

export const messageStore = new MessageStore();
export default messageStore;
