/**
 * 二维码扫描组件
 * 支持摄像头扫描和图片上传识别
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// 二维码扫描结果
export interface QRScanResult {
  sn: string;
  key: string;
}

interface QRScannerProps {
  onScanSuccess: (result: QRScanResult) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
}

// 动态导入 html5-qrcode
let Html5Qrcode: typeof import('html5-qrcode').Html5Qrcode | null = null;

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode').Html5Qrcode> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化扫描库
  useEffect(() => {
    const loadScanner = async () => {
      try {
        const module = await import('html5-qrcode');
        Html5Qrcode = module.Html5Qrcode;

        // 获取摄像头列表
        const devices = await module.Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // 优先选择后置摄像头
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('后')
          );
          setSelectedCamera(backCamera?.id || devices[0].id);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('加载扫描库失败:', err);
        setError('加载扫描组件失败，请刷新页面重试');
        setIsLoading(false);
      }
    };

    loadScanner();

    return () => {
      stopScanning();
    };
  }, []);

  // 解析二维码内容
  const parseQRContent = (content: string): QRScanResult | null => {
    try {
      // 尝试解析 JSON 格式
      const data = JSON.parse(content);
      if (data.sn && data.key) {
        return { sn: data.sn, key: data.key };
      }
    } catch {
      // 如果不是 JSON，尝试其他格式
      // 格式: GD:SN:KEY
      const parts = content.split(':');
      if (parts.length === 3 && parts[0] === 'GD') {
        return { sn: parts[1], key: parts[2] };
      }
    }
    return null;
  };

  // 处理扫描成功
  const handleScanSuccess = useCallback((decodedText: string) => {
    const result = parseQRContent(decodedText);
    if (result) {
      stopScanning();
      onScanSuccess(result);
    } else {
      setError('无效的设备二维码格式');
      onScanError?.('无效的设备二维码格式');
    }
  }, [onScanSuccess, onScanError]);

  // 开始扫描
  const startScanning = async () => {
    if (!Html5Qrcode || !selectedCamera) return;

    try {
      setError(null);
      scannerRef.current = new Html5Qrcode('qr-reader');
      
      await scannerRef.current.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        () => {} // 忽略扫描失败的回调
      );
      
      setIsScanning(true);
    } catch (err) {
      console.error('启动摄像头失败:', err);
      setError('无法访问摄像头，请检查权限设置');
    }
  };

  // 停止扫描
  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('停止扫描失败:', err);
      }
    }
    setIsScanning(false);
  };

  // 切换摄像头
  const switchCamera = async () => {
    if (cameras.length < 2) return;

    const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];

    await stopScanning();
    setSelectedCamera(nextCamera.id);
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !Html5Qrcode) return;

    try {
      setError(null);
      const scanner = new Html5Qrcode('qr-reader-file');
      const result = await scanner.scanFile(file, true);
      const parsed = parseQRContent(result);
      
      if (parsed) {
        onScanSuccess(parsed);
      } else {
        setError('无法识别二维码内容');
        onScanError?.('无法识别二维码内容');
      }
    } catch (err) {
      console.error('识别图片失败:', err);
      setError('无法识别图片中的二维码');
      onScanError?.('无法识别图片中的二维码');
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 自动开始扫描
  useEffect(() => {
    if (!isLoading && selectedCamera && cameras.length > 0 && !isScanning) {
      startScanning();
    }
  }, [isLoading, selectedCamera, cameras.length]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">正在加载扫描组件...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">扫描设备二维码</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 摄像头预览区域 */}
      <div className="relative">
        <div 
          id="qr-reader" 
          className="w-full bg-gray-100 rounded-lg overflow-hidden"
          style={{ minHeight: '300px' }}
        ></div>
        <div id="qr-reader-file" className="hidden"></div>

        {/* 扫描框提示 */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-blue-500 rounded-lg">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex flex-wrap gap-3">
        {/* 切换摄像头 */}
        {cameras.length > 1 && (
          <button
            onClick={switchCamera}
            disabled={!isScanning}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            切换摄像头
          </button>
        )}

        {/* 上传图片 */}
        <label className="flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg cursor-pointer transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          上传图片识别
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* 开始/停止扫描 */}
        <button
          onClick={isScanning ? stopScanning : startScanning}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            isScanning
              ? 'bg-red-50 hover:bg-red-100 text-red-600'
              : 'bg-green-50 hover:bg-green-100 text-green-600'
          }`}
        >
          {isScanning ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              停止扫描
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              开始扫描
            </>
          )}
        </button>
      </div>

      {/* 提示信息 */}
      <p className="mt-4 text-sm text-gray-500 text-center">
        将设备上的二维码对准扫描框，或点击"上传图片识别"选择二维码图片
      </p>
    </div>
  );
};

export default QRScanner;
