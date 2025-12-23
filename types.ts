
export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BUSY = 'BUSY',
  ERROR = 'ERROR'
}

export interface DeviceConfig {
  playerCount: 4 | 8;
  deckCount: 1 | 2;
  dealSpeed: 1 | 2 | 3 | 4 | 5;
  gameRounds: number; // 1-10
  startLevel: number; // 1-13
  isTribute: boolean;
  difficulty: number; // 1-10
}

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  battery: number;
  lastActive: string;
  config: DeviceConfig;
  currentRound: number;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  deviceCount: number;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'super_admin' | 'operator';
  createdAt: string;
  status: 'active' | 'suspended';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}
