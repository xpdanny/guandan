/**
 * 批量二维码上传组件
 * 支持拖拽上传、多图选择、并行解析
 */

import React, { useState, useRef, useCallback } from 'react';

// 解析结果项
export interface ParsedQRItem {
  id: string;
  fileName: string;
  sn: string | null;
  key: string | null;
  success: boolean;
  error?: string;
}

interface BatchQRUploadProps {
  onParseComplete: (results: ParsedQRItem[]) => void;
  onClose?: () => void;
}

export const BatchQRUpload: React.FC<BatchQRUploadProps> = ({
  onParseComplete,
  onClose,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ParsedQRItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 解析二维码内容
  const parseQRContent = (content: string): { sn: string; key: string } | null => {
    try {
      const data = JSON.parse(content);
      if (data.sn && data.key) {
        return { sn: data.sn, key: data.key };
      }
    } catch {
      const parts = content.split(':');
      if (parts.length === 3 && parts[0] === 'GD') {
        return { sn: parts[1], key: parts[2] };
      }
    }
    return null;
  };

  // 处理单个文件
  const processFile = async (file: File): Promise<ParsedQRItem> => {
    const id = `${file.name}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(`scanner-${id}`);
      const result = await scanner.scanFile(file, true);
      const parsed = parseQRContent(result);

      if (parsed) {
        return {
          id,
          fileName: file.name,
          sn: parsed.sn,
          key: parsed.key,
          success: true,
        };
      } else {
        return {
          id,
          fileName: file.name,
          sn: null,
          key: null,
          success: false,
          error: '无法解析二维码内容',
        };
      }
    } catch (err) {
      return {
        id,
        fileName: file.name,
        sn: null,
        key: null,
        success: false,
        error: '无法识别二维码',
      };
    }
  };

  // 处理所有文件
  const processAllFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });
    const newResults: ParsedQRItem[] = [];

    // 并行处理，但限制并发数
    const concurrency = 3;
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(processFile));
      newResults.push(...batchResults);
      setProgress({ current: Math.min(i + concurrency, files.length), total: files.length });
      setResults([...newResults]);
    }

    setIsProcessing(false);
    onParseComplete(newResults);
  };

  // 处理文件选择
  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const imageFiles = Array.from(selectedFiles).filter(file =>
      file.type.startsWith('image/')
    );

    setFiles(prev => [...prev, ...imageFiles]);
    setResults([]);
  };

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  // 移除文件
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 移除解析失败的结果
  const removeFailedResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  // 清空所有
  const clearAll = () => {
    setFiles([]);
    setResults([]);
    setProgress({ current: 0, total: 0 });
  };

  // 统计
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">批量上传二维码</h3>
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

      {/* 上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="mt-2 text-gray-600">
          拖拽二维码图片到此处，或{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
            点击选择文件
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </label>
        </p>
        <p className="mt-1 text-sm text-gray-500">支持 JPG、PNG 格式，可一次选择多张</p>
      </div>

      {/* 已选择的文件列表 */}
      {files.length > 0 && results.length === 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">已选择 {files.length} 张图片</span>
            <button
              onClick={clearAll}
              className="text-sm text-red-600 hover:text-red-700"
            >
              清空
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
            {files.map((file, index) => (
              <div
                key={`${file.name}_${index}`}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
              >
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 处理进度 */}
      {isProcessing && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              解析进度: {progress.current} / {progress.total}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 解析结果列表 */}
      {results.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              解析结果: 成功 {successCount} 张，失败 {failedCount} 张
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600">图片名</th>
                  <th className="px-3 py-2 text-left text-gray-600">序列号</th>
                  <th className="px-3 py-2 text-left text-gray-600">状态</th>
                  <th className="px-3 py-2 text-center text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700 truncate max-w-32">
                      {result.fileName}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {result.sn || '-'}
                    </td>
                    <td className="px-3 py-2">
                      {result.success ? (
                        <span className="inline-flex items-center text-green-600">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          解析成功
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-600">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          {result.error}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {!result.success && (
                        <button
                          onClick={() => removeFailedResult(result.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 隐藏的扫描器容器 */}
      <div className="hidden">
        {files.map((file, index) => (
          <div key={`scanner-${file.name}_${index}`} id={`scanner-${file.name}_${Date.now()}_${index}`}></div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex justify-end gap-3">
        {files.length > 0 && results.length === 0 && (
          <button
            onClick={processAllFiles}
            disabled={isProcessing}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '解析中...' : `开始解析 (${files.length} 张)`}
          </button>
        )}

        {results.length > 0 && successCount > 0 && (
          <>
            <button
              onClick={() => {
                setFiles([]);
                setResults([]);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              补充上传
            </button>
            <button
              onClick={() => onParseComplete(results.filter(r => r.success))}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              确认注册 ({successCount} 台设备)
            </button>
          </>
        )}
      </div>

      {/* 提示信息 */}
      {results.length > 0 && failedCount > 0 && (
        <p className="mt-3 text-sm text-amber-600 text-center">
          ⚠️ 部分图片解析失败，可点击"补充上传"重新上传失败的图片
        </p>
      )}
    </div>
  );
};

export default BatchQRUpload;
