
import { Device, DeviceStatus } from '../types';
import { INITIAL_CONFIG } from '../constants';

export const generateMockDevices = (count: number): Device[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `DEV-${(i + 1).toString().padStart(3, '0')}`,
    name: `发牌机-${(i + 1).toString().padStart(3, '0')}`,
    status: Math.random() > 0.8 ? DeviceStatus.OFFLINE : (Math.random() > 0.7 ? DeviceStatus.BUSY : DeviceStatus.ONLINE),
    battery: Math.floor(Math.random() * 100),
    lastActive: new Date().toISOString(),
    config: { ...INITIAL_CONFIG },
    currentRound: Math.floor(Math.random() * 5)
  }));
};
