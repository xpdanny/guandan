import React, { useEffect, useState } from 'react';
import { messageStore, type DeviceMessage } from '../services/messageStore';

const Settings: React.FC = () => {
  const [messages, setMessages] = useState<DeviceMessage[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<DeviceMessage | null>(null);

  useEffect(() => {
    // 初始化已有的消息
    setMessages(messageStore.getMessages());

    // 订阅新消息
    const unsub = messageStore.subscribe((msg) => {
      if (msg.type !== 'CLEAR') {
        setMessages(prev => [msg, ...prev].slice(0, 500));
      } else {
        setMessages([]);
        setSelectedMsg(null);
      }
    });

    return () => { unsub(); };
  }, []);

  const exportMessages = () => {
    const json = JSON.stringify(messages, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearMessages = () => {
    if (confirm('确定要清空所有消息日志吗？')) {
      messageStore.clear();
    }
  };

  const getFieldStats = () => {
    const stats: Record<string, number> = {};
    messages.forEach(m => {
      const fields = m.payload || {};
      Object.keys(fields).forEach(k => {
        stats[k] = (stats[k] || 0) + 1;
      });
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b p-6 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">系统设置</h2>
        <p className="text-gray-600">监控与分析测试页面发送的消息字段</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Left: Message List */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-bold">消息日志</h3>
              <div className="text-sm text-gray-500">共 {messages.length} 条 · 最新消息在顶部</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearMessages}
                className="px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100"
              >
                清空日志
              </button>
              <button
                onClick={exportMessages}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
              >
                导出 JSON
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                等待消息...（从设备模拟器或真实设备发送）
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMsg(msg)}
                  className={`border-b p-3 cursor-pointer transition ${
                    selectedMsg?.id === msg.id ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-mono text-sm font-bold text-indigo-600">{msg.type}</div>
                    <div className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                  </div>
                  <div className="text-xs text-gray-600">{msg.sn}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Details & Stats */}
        <div className="w-96 flex flex-col gap-4">
          {/* Message Detail */}
          <div className="bg-white rounded-lg shadow p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="font-bold mb-3 flex-shrink-0">消息详情</h3>
            {selectedMsg ? (
              <div className="flex-1 overflow-y-auto">
                <div className="mb-3 pb-3 border-b">
                  <div className="text-xs text-gray-500">类型</div>
                  <div className="font-mono text-sm">{selectedMsg.type}</div>
                </div>
                <div className="mb-3 pb-3 border-b">
                  <div className="text-xs text-gray-500">设备 SN</div>
                  <div className="font-mono text-sm">{selectedMsg.sn}</div>
                </div>
                <div className="mb-3 pb-3 border-b">
                  <div className="text-xs text-gray-500">时间戳</div>
                  <div className="font-mono text-sm">{new Date(selectedMsg.timestamp).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-2">字段 (Payload)</div>
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(selectedMsg.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                选择消息查看详情
              </div>
            )}
          </div>

          {/* Field Statistics */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-3">字段统计</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {getFieldStats().length === 0 ? (
                <div className="text-sm text-gray-500">暂无数据</div>
              ) : (
                getFieldStats().map(([field, count]) => (
                  <div key={field} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-indigo-600">{field}</span>
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-100 px-2 py-0.5 rounded text-xs">{count}</div>
                      <div className="w-20 bg-gray-200 rounded h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full"
                          style={{ width: `${(count / messages.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
