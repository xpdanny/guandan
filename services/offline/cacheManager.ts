/**
 * 离线缓存管理器
 * 使用 IndexedDB 存储离线指令，支持同类型指令覆盖策略
 */

import type { CachedCommand, CommandType, DeviceCommand } from '../../types';

// 数据库配置
const DB_NAME = 'guandan_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_commands';

/**
 * 离线缓存管理器类
 */
class CacheManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB 初始化成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建存储对象
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('deviceId', 'deviceId', { unique: false });
          store.createIndex('commandType', 'commandType', { unique: false });
          store.createIndex('deviceId_commandType', ['deviceId', 'commandType'], { unique: true });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureInit(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error('数据库未初始化');
    }
    return this.db;
  }

  /**
   * 缓存指令（同设备同类型指令会覆盖）
   */
  async cacheCommand(
    deviceId: string,
    commandType: CommandType,
    command: DeviceCommand
  ): Promise<CachedCommand> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('deviceId_commandType');

      // 先查找是否存在同设备同类型的指令
      const getRequest = index.get([deviceId, commandType]);

      getRequest.onsuccess = () => {
        const existing = getRequest.result as CachedCommand | undefined;
        
        const cachedCommand: CachedCommand = {
          id: existing?.id || `${deviceId}_${commandType}_${Date.now()}`,
          deviceId,
          commandType,
          command,
          cachedAt: Date.now(),
          status: 'pending',
        };

        // 使用 put 方法覆盖或新增
        const putRequest = store.put(cachedCommand);

        putRequest.onsuccess = () => {
          console.log(`指令已缓存: ${deviceId} - ${commandType}`);
          resolve(cachedCommand);
        };

        putRequest.onerror = () => {
          console.error('缓存指令失败:', putRequest.error);
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * 获取设备的所有待处理指令
   */
  async getPendingCommands(deviceId?: string): Promise<CachedCommand[]> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      let request: IDBRequest;

      if (deviceId) {
        const index = store.index('deviceId');
        request = index.getAll(deviceId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const commands = (request.result as CachedCommand[])
          .filter(cmd => cmd.status === 'pending')
          .sort((a, b) => a.cachedAt - b.cachedAt);
        resolve(commands);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 获取所有缓存的指令
   */
  async getAllCommands(): Promise<CachedCommand[]> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as CachedCommand[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 更新指令状态
   */
  async updateCommandStatus(
    id: string,
    status: CachedCommand['status']
  ): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const command = getRequest.result as CachedCommand;
        if (!command) {
          resolve();
          return;
        }

        command.status = status;
        const putRequest = store.put(command);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * 删除指令
   */
  async deleteCommand(id: string): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除设备的所有指令
   */
  async deleteDeviceCommands(deviceId: string): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('deviceId');
      const request = index.openCursor(deviceId);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空所有已完成的指令
   */
  async clearSyncedCommands(): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.openCursor('synced');

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取待处理指令数量
   */
  async getPendingCount(): Promise<number> {
    const commands = await this.getPendingCommands();
    return commands.length;
  }

  /**
   * 检查设备是否有待处理指令
   */
  async hasPendingCommands(deviceId: string): Promise<boolean> {
    const commands = await this.getPendingCommands(deviceId);
    return commands.length > 0;
  }
}

// 导出单例
export const cacheManager = new CacheManager();

export default cacheManager;
