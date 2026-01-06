/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// html5-qrcode 模块声明
declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string, verbose?: boolean);
    
    start(
      cameraIdOrConfig: string | { facingMode: string },
      configuration: {
        fps: number;
        qrbox?: number | { width: number; height: number };
        aspectRatio?: number;
      },
      qrCodeSuccessCallback: (decodedText: string, result?: any) => void,
      qrCodeErrorCallback?: (errorMessage: string, error?: any) => void
    ): Promise<void>;
    
    stop(): Promise<void>;
    
    clear(): void;
    
    scanFile(
      imageFile: File,
      showImage?: boolean
    ): Promise<string>;
    
    static getCameras(): Promise<Array<{ id: string; label: string }>>;
  }
  
  export class Html5QrcodeScanner {
    constructor(
      elementId: string,
      config: {
        fps: number;
        qrbox?: number | { width: number; height: number };
        aspectRatio?: number;
        rememberLastUsedCamera?: boolean;
      },
      verbose?: boolean
    );
    
    render(
      qrCodeSuccessCallback: (decodedText: string, result?: any) => void,
      qrCodeErrorCallback?: (errorMessage: string, error?: any) => void
    ): void;
    
    clear(): Promise<void>;
  }
}

// idb 模块声明
declare module 'idb' {
  export function openDB<T = any>(
    name: string,
    version: number,
    options?: {
      upgrade?: (db: any, oldVersion: number, newVersion: number | null, transaction: any) => void;
      blocked?: () => void;
      blocking?: () => void;
      terminated?: () => void;
    }
  ): Promise<any>;
}
