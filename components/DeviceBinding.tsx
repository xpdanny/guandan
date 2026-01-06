/**
 * 设备绑定组件
 * 支持三种绑定方式：扫码、手动输入、批量上传
 */

import React, { useState } from 'react';
import { QRScanner, QRScanResult } from './QRScanner';
import { BatchQRUpload, ParsedQRItem } from './BatchQRUpload';

type BindingMode = 'scan' | 'manual' | 'batch';

interface DeviceBindingProps {
  onBindingSuccess: (devices: { sn: string; key: string }[]) => void;
  onClose?: () => void;
}

export const DeviceBinding: React.FC<DeviceBindingProps> = ({
  onBindingSuccess,
  onClose,
}) => {
  const [mode, setMode] = useState<BindingMode>('scan');
  const [manualSN, setManualSN] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 处理扫码成功
  const handleScanSuccess = async (result: QRScanResult) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // 这里调用注册API
      // await registerDevice(result.sn, result.key);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage(`设备 ${result.sn} 绑定成功！`);
      onBindingSuccess([{ sn: result.sn, key: result.key }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理手动提交
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualSN.trim() || !manualKey.trim()) {
      setError('请输入完整的设备序列号和密钥');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      // 这里调用注册API
      // await registerDevice(manualSN, manualKey);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage(`设备 ${manualSN} 绑定成功！`);
      onBindingSuccess([{ sn: manualSN, key: manualKey }]);
      
      // 清空表单
      setManualSN('');
      setManualKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理批量上传完成
  const handleBatchComplete = async (results: ParsedQRItem[]) => {
    const successItems = results.filter(r => r.success && r.sn && r.key);
    
    if (successItems.length === 0) {
      setError('没有可注册的设备');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      // 这里调用批量注册API
      // await batchRegisterDevices(successItems.map(item => ({ sn: item.sn!, secretKey: item.key! })));
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccessMessage(`成功绑定 ${successItems.length} 台设备！`);
      onBindingSuccess(successItems.map(item => ({ sn: item.sn!, key: item.key! })));
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量绑定失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tab 样式
  const getTabClass = (tabMode: BindingMode) => {
    const baseClass = 'flex-1 py-3 px-4 text-center font-medium transition-colors';
    if (mode === tabMode) {
      return `${baseClass} text-blue-600 border-b-2 border-blue-600 bg-blue-50`;
    }
    return `${baseClass} text-gray-600 hover:text-gray-800 hover:bg-gray-50`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">添加设备</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b">
          <button
            onClick={() => { setMode('scan'); setError(null); setSuccessMessage(null); }}
            className={getTabClass('scan')}
          >
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              扫码绑定
            </span>
          </button>
          <button
            onClick={() => { setMode('manual'); setError(null); setSuccessMessage(null); }}
            className={getTabClass('manual')}
          >
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              手动输入
            </span>
          </button>
          <button
            onClick={() => { setMode('batch'); setError(null); setSuccessMessage(null); }}
            className={getTabClass('batch')}
          >
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              批量上传
            </span>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 成功提示 */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* 加载状态 */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">正在绑定设备...</p>
              </div>
            </div>
          )}

          {/* 扫码模式 */}
          {mode === 'scan' && (
            <QRScanner
              onScanSuccess={handleScanSuccess}
              onScanError={(err) => setError(err)}
            />
          )}

          {/* 手动输入模式 */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  设备序列号
                </label>
                <input
                  type="text"
                  value={manualSN}
                  onChange={(e) => setManualSN(e.target.value)}
                  placeholder="例如: GD20241224001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  设备密钥
                </label>
                <input
                  type="text"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="例如: a1b2c3d4e5f6g7h8"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !manualSN.trim() || !manualKey.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                验证并绑定
              </button>

              <p className="text-sm text-gray-500 text-center">
                设备序列号和密钥可在设备底部标签上找到
              </p>
            </form>
          )}

          {/* 批量上传模式 */}
          {mode === 'batch' && (
            <BatchQRUpload
              onParseComplete={handleBatchComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceBinding;
