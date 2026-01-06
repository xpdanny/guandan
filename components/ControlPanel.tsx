
import React, { useState } from 'react';
import { DeviceConfig } from '../types';
import { INITIAL_CONFIG } from '../constants';

interface ControlPanelProps {
  selectedCount: number;
  onApply: (config: DeviceConfig) => void;
  onCancel: () => void;
  hasOfflineDevices?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ selectedCount, onApply, onCancel, hasOfflineDevices = false }) => {
  const [config, setConfig] = useState<DeviceConfig>(INITIAL_CONFIG);

  const handleChange = (key: keyof DeviceConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">批量控制</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg mb-6">
          <p className="text-sm text-blue-700 font-medium">已选择设备：{selectedCount} 台</p>
          {hasOfflineDevices && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              包含离线设备，指令将暂存等待设备上线
            </p>
          )}
        </div>

        <div className="space-y-6">
          {/* Player Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">游戏人数</label>
            <div className="flex gap-2">
              {[4, 8].map(count => (
                <button
                  key={count}
                  onClick={() => handleChange('playerCount', count)}
                  className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                    config.playerCount === count ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-300'
                  }`}
                >
                  {count}人
                </button>
              ))}
            </div>
          </div>

          {/* Deck Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">牌的数量</label>
            <div className="flex gap-2">
              {[1, 2].map(count => (
                <button
                  key={count}
                  onClick={() => handleChange('deckCount', count)}
                  className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                    config.deckCount === count ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-300'
                  }`}
                >
                  {count}付牌
                </button>
              ))}
            </div>
          </div>

          {/* Speed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">发牌速度 (1-5级)</label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={config.dealSpeed}
              onChange={(e) => handleChange('dealSpeed', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>慢</span>
              <span>中</span>
              <span>快</span>
            </div>
          </div>

          {/* Rounds */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">牌局数 (1-10局)</label>
            <select
              value={config.gameRounds}
              onChange={(e) => handleChange('gameRounds', parseInt(e.target.value))}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>{num}局</option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">初始级数 (1-13级)</label>
            <select
              value={config.startLevel}
              onChange={(e) => handleChange('startLevel', parseInt(e.target.value))}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2"
            >
              {Array.from({ length: 13 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>级数 {num}</option>
              ))}
            </select>
          </div>

          {/* Tribute */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">启用上供</span>
            <button
              onClick={() => handleChange('isTribute', !config.isTribute)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.isTribute ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.isTribute ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">牌库难易度 (1-10级)</label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={config.difficulty}
              onChange={(e) => handleChange('difficulty', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>简单</span>
              <span>极难</span>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => onApply(config)}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 shadow-lg transition-all active:scale-95"
          >
            {hasOfflineDevices ? '应用设置（离线设备将暂存）' : '应用设置并执行'}
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
