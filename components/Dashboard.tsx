
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Device, DeviceStatus, DeviceConfig, Group } from '../types';
import { ICONS } from '../constants';
import ControlPanel from './ControlPanel';

interface DashboardProps {
  devices: Device[];
  groups: Group[];
  onUpdateDevices: (ids: string[], config: Partial<Device>) => void;
  onAddGroup: (name: string, deviceIds: string[]) => void;
  onUpdateGroupName: (id: string, name: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ devices, groups, onUpdateDevices, onAddGroup, onUpdateGroupName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<DeviceStatus | 'ALL'>('ALL');
  const [activeGroupId, setActiveGroupId] = useState<string | 'ALL'>('ALL');

  // Marquee Selection State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Group Management UI
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const parseSearch = (term: string) => {
    if (!term.trim()) return null;
    
    const parts = term.split(/[,，\s]+/).filter(Boolean);
    const result = new Set<string>();

    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(p => p.trim());
        const startMatch = start.match(/(\d+)/);
        const endMatch = end.match(/(\d+)/);
        const prefixMatch = start.match(/([a-zA-Z-]+)/);
        
        if (startMatch && endMatch) {
          const s = parseInt(startMatch[1]);
          const e = parseInt(endMatch[1]);
          const prefix = prefixMatch ? prefixMatch[1] : 'DEV-';
          const padding = startMatch[1].length;
          
          for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
            result.add(`${prefix}${i.toString().padStart(padding, '0')}`);
          }
        }
      } else {
        result.add(part.toUpperCase());
        // Also support partial matches for names
        devices.forEach(d => {
          if (d.name.includes(part)) result.add(d.id);
        });
      }
    });
    return result;
  };

  const filteredDevices = useMemo(() => {
    const searchIds = parseSearch(searchTerm);
    return devices.filter(d => {
      const matchesSearch = searchIds ? searchIds.has(d.id) : true;
      const matchesFilter = filterStatus === 'ALL' || d.status === filterStatus;
      const matchesGroup = activeGroupId === 'ALL' || d.groupId === activeGroupId;
      return matchesSearch && matchesFilter && matchesGroup;
    });
  }, [devices, searchTerm, filterStatus, activeGroupId]);

  // Selection Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setIsSelecting(true);
    setSelectionBox({
      x1: e.clientX - rect.left + containerRef.current!.scrollLeft,
      y1: e.clientY - rect.top + containerRef.current!.scrollTop,
      x2: e.clientX - rect.left + containerRef.current!.scrollLeft,
      y2: e.clientY - rect.top + containerRef.current!.scrollTop
    });
    
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedDevices(new Set());
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionBox) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x2 = e.clientX - rect.left + containerRef.current!.scrollLeft;
    const y2 = e.clientY - rect.top + containerRef.current!.scrollTop;
    setSelectionBox(prev => prev ? { ...prev, x2, y2 } : null);

    // Calculate overlap
    const boxX = Math.min(selectionBox.x1, x2);
    const boxY = Math.min(selectionBox.y1, y2);
    const boxW = Math.abs(selectionBox.x1 - x2);
    const boxH = Math.abs(selectionBox.y1 - y2);

    const newSelected = new Set(selectedDevices);
    cardRefs.current.forEach((el, id) => {
      const cardRect = {
        left: el.offsetLeft,
        top: el.offsetTop,
        right: el.offsetLeft + el.offsetWidth,
        bottom: el.offsetTop + el.offsetHeight
      };

      const overlaps = !(cardRect.left > boxX + boxW || 
                         cardRect.right < boxX || 
                         cardRect.top > boxY + boxH || 
                         cardRect.bottom < boxY);

      if (overlaps) newSelected.add(id);
      else if (!e.shiftKey && !e.ctrlKey) newSelected.delete(id);
    });
    setSelectedDevices(newSelected);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectionBox(null);
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedDevices(newSelected);
  };

  const handleApplyConfig = (config: DeviceConfig) => {
    onUpdateDevices(Array.from(selectedDevices), { config, status: DeviceStatus.BUSY });
    setIsPanelOpen(false);
    setSelectedDevices(new Set());
  };

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.ONLINE: return 'text-green-500 bg-green-50';
      case DeviceStatus.BUSY: return 'text-amber-500 bg-amber-50';
      case DeviceStatus.OFFLINE: return 'text-gray-400 bg-gray-50';
      case DeviceStatus.ERROR: return 'text-red-500 bg-red-50';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Group Sidebar/Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveGroupId('ALL')}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
            activeGroupId === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部设备
        </button>
        {groups.map(group => (
          <div key={group.id} className="relative group">
            <button
              onClick={() => setActiveGroupId(group.id)}
              onDoubleClick={() => {
                setEditingGroupId(group.id);
                setNewGroupName(group.name);
              }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                activeGroupId === group.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {group.name}
              <span className="text-[10px] opacity-70">({group.deviceCount})</span>
            </button>
          </div>
        ))}
        {selectedDevices.size > 0 && (
          <button
            onClick={() => {
              setNewGroupName(`分组 ${groups.length + 1}`);
              setShowGroupModal(true);
            }}
            className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all"
          >
            + 将选中项设为新分组
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 scroll-smooth" ref={containerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        {/* Selection Marquee Visual */}
        {isSelecting && selectionBox && (
          <div
            className="absolute border-2 border-indigo-500 bg-indigo-500/10 pointer-events-none z-50"
            style={{
              left: Math.min(selectionBox.x1, selectionBox.x2),
              top: Math.min(selectionBox.y1, selectionBox.y2),
              width: Math.abs(selectionBox.x1 - selectionBox.x2),
              height: Math.abs(selectionBox.y1 - selectionBox.y2)
            }}
          />
        )}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center bg-white p-4 rounded-xl shadow-sm border select-none">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-96">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ICONS.Search />
              </span>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                placeholder="搜索编号 (如 DEV-001, DEV-005 或 DEV-001-010)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="ALL">全部状态</option>
              <option value={DeviceStatus.ONLINE}>在线</option>
              <option value={DeviceStatus.BUSY}>发牌中</option>
              <option value={DeviceStatus.OFFLINE}>离线</option>
            </select>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              disabled={selectedDevices.size === 0}
              onClick={() => setIsPanelOpen(true)}
              className={`flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-lg shadow-lg transition-all active:scale-95 ${
                selectedDevices.size === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <ICONS.Bolt />
              批量配置 ({selectedDevices.size})
            </button>
          </div>
        </div>

        {/* Device Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 select-none">
          {filteredDevices.map(device => (
            <div
              key={device.id}
              ref={el => { if (el) cardRefs.current.set(device.id, el); else cardRefs.current.delete(device.id); }}
              onClick={(e) => toggleSelect(e, device.id)}
              className={`relative group bg-white rounded-xl border-2 p-3 transition-all ${
                selectedDevices.has(device.id) ? 'border-indigo-500 shadow-md ring-2 ring-indigo-50' : 'border-gray-100 hover:border-indigo-200 shadow-sm'
              }`}
            >
              {selectedDevices.has(device.id) && (
                <div className="absolute -top-2 -right-2 bg-indigo-500 text-white rounded-full p-1 shadow-lg z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${getStatusColor(device.status)}`}>
                  {device.status === DeviceStatus.ONLINE ? '在线' : (device.status === DeviceStatus.BUSY ? '发牌中' : '离线')}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <ICONS.Battery />
                  {device.battery}%
                </div>
              </div>

              <div className="text-center py-2">
                <p className="text-xs font-mono text-gray-400 mb-1">{device.id}</p>
                <h3 className="font-bold text-gray-800 text-sm truncate">{device.name}</h3>
                {device.groupId && (
                  <p className="text-[9px] text-indigo-500 font-bold mt-1">
                    {groups.find(g => g.id === device.groupId)?.name}
                  </p>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-50 flex justify-center gap-2">
                 <div className="flex flex-col items-center">
                    <span className="text-[9px] text-gray-400">人数</span>
                    <span className="text-xs font-bold text-gray-600">{device.config.playerCount}</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="text-[9px] text-gray-400">当前</span>
                    <span className="text-xs font-bold text-indigo-600">{device.currentRound}/{device.config.gameRounds}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-bold mb-4">新建设备分组</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">组别名称</label>
              <input
                autoFocus
                type="text"
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (onAddGroup(newGroupName, Array.from(selectedDevices)), setShowGroupModal(false), setSelectedDevices(new Set()))}
              />
              <p className="text-xs text-gray-500 mt-2">将包含 {selectedDevices.size} 台选中的设备</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGroupModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onAddGroup(newGroupName, Array.from(selectedDevices));
                  setShowGroupModal(false);
                  setSelectedDevices(new Set());
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
              >
                创建分组
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Rename Modal */}
      {editingGroupId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">重命名分组</h2>
            <div className="mb-6">
              <input
                autoFocus
                type="text"
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingGroupId(null)} className="flex-1 px-4 py-2 border rounded-lg">取消</button>
              <button
                onClick={() => { onUpdateGroupName(editingGroupId, newGroupName); setEditingGroupId(null); }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {isPanelOpen && (
        <ControlPanel
          selectedCount={selectedDevices.size}
          onApply={handleApplyConfig}
          onCancel={() => setIsPanelOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
