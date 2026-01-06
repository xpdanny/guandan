import React, { useEffect, useState } from 'react';
import { wsClient } from '../services/websocket/wsClient';
import type { WSMessage } from '../types';

const MAX_MESSAGES = 200;

const pretty = (obj: any) => {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
};

const MessageInspector: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<WSMessage[]>([]);

  useEffect(() => {
    const unsub = wsClient.on('all', (msg: WSMessage) => {
      setMessages(prev => {
        const next = [msg, ...prev].slice(0, MAX_MESSAGES);
        return next;
      });
    });

    return () => { unsub(); };
  }, []);

  return (
    <div className={`w-full border-t bg-white shadow-inner ${open ? '' : ''}`}>
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <strong className="text-sm">消息检测器</strong>
          <span className="text-xs text-gray-500">展示来自 WebSocket 的原始消息（最新在上）</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setMessages([]); }} className="text-xs text-gray-500">清空</button>
          <button onClick={() => setOpen(v => !v)} className="px-3 py-1 bg-indigo-600 text-white text-sm rounded">{open ? '收起' : '展开'}</button>
        </div>
      </div>

      {open && (
        <div className="p-4 grid grid-cols-3 gap-4 max-h-64 overflow-auto">
          {messages.length === 0 ? (
            <div className="col-span-3 text-sm text-gray-500">暂无消息</div>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} className="border rounded p-2 bg-slate-50 text-xs">
                <div className="text-[11px] text-gray-600 mb-1">{new Date(m.ts || Date.now()).toLocaleString()}</div>
                <div className="font-medium text-sm mb-1">{m.type || m.topic || '消息'}</div>
                <pre className="whitespace-pre-wrap break-words text-xs">{pretty(m)}</pre>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MessageInspector;
