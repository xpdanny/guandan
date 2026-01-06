/**
 * WebSocket 消息处理器
 * 处理不同类型的设备状态消息
 */

import type { WSMessage, Device, DeviceStatus, CommandAck } from '../../types';

// 设备状态变更回调
type DeviceStatusCallback = (deviceId: string, status: DeviceStatus, data?: Record<string, unknown>) => void;

// 设备上线回调
type DeviceOnlineCallback = (deviceId: string, device: Partial<Device>) => void;

// 设备离线回调
type DeviceOfflineCallback = (deviceId: string) => void;

// 指令响应回调
type CommandAckCallback = (ack: CommandAck) => void;

// 低电量告警回调
type LowBatteryCallback = (deviceId: string, battery: number) => void;

// 消息处理器配置
interface MessageHandlerConfig {
  onDeviceOnline?: DeviceOnlineCallback;
  onDeviceOffline?: DeviceOfflineCallback;
  onStatusUpdate?: DeviceStatusCallback;
  onCommandAck?: CommandAckCallback;
  onLowBattery?: LowBatteryCallback;
}

/**
 * 创建消息处理器
 */
export function createMessageHandler(config: MessageHandlerConfig) {
  return (message: WSMessage) => {
    const { type, deviceId, data } = message;

    switch (type) {
      case 'DEVICE_ONLINE':
        config.onDeviceOnline?.(deviceId, data as Partial<Device>);
        break;

      case 'DEVICE_OFFLINE':
        config.onDeviceOffline?.(deviceId);
        break;

      case 'STATUS_UPDATE':
        config.onStatusUpdate?.(
          deviceId,
          data.status as DeviceStatus,
          data
        );
        break;

      case 'COMMAND_ACK':
        config.onCommandAck?.(data as unknown as CommandAck);
        break;

      case 'LOW_BATTERY_ALERT':
        config.onLowBattery?.(deviceId, data.battery as number);
        break;

      default:
        console.warn('未知消息类型:', type);
    }
  };
}

/**
 * 设备状态管理器
 * 维护设备在线状态的本地缓存
 */
export class DeviceStatusManager {
  private deviceStatus: Map<string, {
    isOnline: boolean;
    status: DeviceStatus;
    lastUpdate: number;
  }> = new Map();

  private listeners: Set<() => void> = new Set();

  /**
   * 更新设备状态
   */
  updateStatus(deviceId: string, status: DeviceStatus, isOnline: boolean): void {
    this.deviceStatus.set(deviceId, {
      isOnline,
      status,
      lastUpdate: Date.now(),
    });
    this.notifyListeners();
  }

  /**
   * 设置设备上线
   */
  setOnline(deviceId: string): void {
    const current = this.deviceStatus.get(deviceId);
    this.deviceStatus.set(deviceId, {
      isOnline: true,
      status: current?.status || ('ONLINE' as DeviceStatus),
      lastUpdate: Date.now(),
    });
    this.notifyListeners();
  }

  /**
   * 设置设备离线
   */
  setOffline(deviceId: string): void {
    const current = this.deviceStatus.get(deviceId);
    this.deviceStatus.set(deviceId, {
      isOnline: false,
      status: 'OFFLINE' as DeviceStatus,
      lastUpdate: Date.now(),
    });
    this.notifyListeners();
  }

  /**
   * 获取设备状态
   */
  getStatus(deviceId: string): { isOnline: boolean; status: DeviceStatus } | undefined {
    return this.deviceStatus.get(deviceId);
  }

  /**
   * 检查设备是否在线
   */
  isOnline(deviceId: string): boolean {
    return this.deviceStatus.get(deviceId)?.isOnline ?? false;
  }

  /**
   * 获取所有在线设备ID
   */
  getOnlineDevices(): string[] {
    const online: string[] = [];
    this.deviceStatus.forEach((value, key) => {
      if (value.isOnline) {
        online.push(key);
      }
    });
    return online;
  }

  /**
   * 获取所有离线设备ID
   */
  getOfflineDevices(): string[] {
    const offline: string[] = [];
    this.deviceStatus.forEach((value, key) => {
      if (!value.isOnline) {
        offline.push(key);
      }
    });
    return offline;
  }

  /**
   * 订阅状态变更
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * 清空所有状态
   */
  clear(): void {
    this.deviceStatus.clear();
    this.notifyListeners();
  }
}

// 导出单例
export const deviceStatusManager = new DeviceStatusManager();

export default {
  createMessageHandler,
  deviceStatusManager,
};
