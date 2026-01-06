/**
 * 待同步指令面板组件
 * 显示离线期间缓存的指令，支持手动重发或取消
 */

import React, { useEffect, useState, useCallback } from 'react';
import { cacheManager } from '../services/offline/cacheManager';
import type { CachedCommand, CommandType } from '../types';

interface PendingCommandsProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (command: CachedCommand) => Promise<void>;
}

// 指令类型显示名称
const COMMAND_TYPE_LABELS: Record<CommandType, string> = {
  'START_DEAL': '开始发牌',
  'STOP_DEAL': '停止发牌',
  'PAUSE_DEAL': '暂停发牌',
  'RESUME_DEAL': '继续发牌',
  'RESET': '复位设备',
  'EMERGENCY_STOP': '紧急停止',
  'UPDATE_CONFIG': '更新配置',
};

export const PendingCommands: React.FC<PendingCommandsProps> = ({
  isOpen,
  onClose,
  onRetry,
}) => {
  const [commands, setCommands] = useState<CachedCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // 加载缓存的指令
  const loadCommands = useCallback(async () => {
    try {
      setIsLoading(true);
      await cacheManager.init();
      const pending = await cacheManager.getAllCommands();
      setCommands(pending.sort((a, b) => b.cachedAt - a.cachedAt));
    } catch (err) {
      console.error('加载缓存指令失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCommands();
    }
  }, [isOpen, loadCommands]);

  // 重试发送指令
  const handleRetry = async (command: CachedCommand) => {
    try {
      setRetryingId(command.id);
      await cacheManager.updateCommandStatus(command.id, 'syncing');
      
      if (onRetry) {
        await onRetry(command);
      }
      
      await cacheManager.updateCommandStatus(command.id, 'synced');
      await loadCommands();
    } catch (err) {
      console.error('重试发送失败:', err);
      await cacheManager.updateCommandStatus(command.id, 'failed');
      await loadCommands();
    } finally {
      setRetryingId(null);
    }
  };

  // 删除指令
  const handleDelete = async (id: string) => {
    try {
      await cacheManager.deleteCommand(id);
      await loadCommands();
    } catch (err) {
      console.error('删除指令失败:', err);
    }
  };

  // 清空所有已完成
  const handleClearSynced = async () => {
    try {
      await cacheManager.clearSyncedCommands();
      await loadCommands();
    } catch (err) {
      console.error('清空已完成失败:', err);
    }
  };

  // 清空所有
  const handleClearAll = async () => {
    if (window.confirm('确定要清空所有缓存的指令吗？此操作不可恢复。')) {
      try {
        await cacheManager.clearAll();
        await loadCommands();
      } catch (err) {
        console.error('清空失败:', err);
      }
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 获取状态样式
  const getStatusStyle = (status: CachedCommand['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'syncing':
        return 'bg-blue-100 text-blue-800';
      case 'synced':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态文字
  const getStatusText = (status: CachedCommand['status']) => {
    switch (status) {
      case 'pending':
        return '待同步';
      case 'syncing':
        return '同步中';
      case 'synced':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return status;
    }
  };

  if (!isOpen) return null;

  // 统计
  const pendingCount = commands.filter(c => c.status === 'pending').length;
  const syncedCount = commands.filter(c => c.status === 'synced').length;
  const failedCount = commands.filter(c => c.status === 'failed').length;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">待同步指令</h3>
          <p className="text-sm text-gray-500">
            待同步 {pendingCount} | 已完成 {syncedCount} | 失败 {failedCount}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 提示信息 */}
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
        <p className="text-sm text-amber-700">
          💡 同一设备的同类型指令仅保留最后一条
        </p>
      </div>

      {/* 指令列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : commands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p>没有待同步的指令</p>
          </div>
        ) : (
          <div className="divide-y">
            {commands.map((command) => (
              <div
                key={command.id}
                className="px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 truncate">
                        {command.deviceId}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusStyle(command.status)}`}>
                        {getStatusText(command.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {COMMAND_TYPE_LABELS[command.commandType] || command.commandType}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      缓存于 {formatTime(command.cachedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    {command.status === 'pending' && (
                      <button
                        onClick={() => handleRetry(command)}
                        disabled={retryingId === command.id}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                        title="立即重试"
                      >
                        {retryingId === command.id ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                    )}
                    {command.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(command)}
                        disabled={retryingId === command.id}
                        className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                        title="重新发送"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(command.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="删除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {commands.length > 0 && (
        <div className="border-t px-4 py-3 bg-gray-50 flex gap-2">
          {syncedCount > 0 && (
            <button
              onClick={handleClearSynced}
              className="flex-1 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              清空已完成
            </button>
          )}
          <button
            onClick={handleClearAll}
            className="flex-1 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            清空全部
          </button>
        </div>
      )}
    </div>
  );
};

export default PendingCommands;
