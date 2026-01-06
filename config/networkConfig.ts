/**
 * 网络环境配置
 * 根据开发/测试/生产环境切换
 */

export type Environment = 'development' | 'staging' | 'production';

export interface NetworkConfig {
  environment: Environment;
  api: {
    baseUrl: string;
    uploadUrl: string;
    timeout: number;
  };
  websocket: {
    url: string;
    reconnectIntervals: number[];
    heartbeatInterval: number;
    heartbeatTimeout: number;
  };
  mqtt: {
    broker: string;
    port: number;
    protocol: 'mqtt' | 'mqtts';
    ca?: string; // TLS CA 证书路径
  };
  tls: {
    verifyPeer: boolean;
    verifyCertificateChain: boolean;
    minTlsVersion: string;
  };
}

/**
 * 开发环境配置
 * 用于本地 Docker 容器或本地开发服务器
 */
export const DEVELOPMENT_CONFIG: NetworkConfig = {
  environment: 'development',
  api: {
    baseUrl: 'http://192.168.1.100:8081/api',
    uploadUrl: 'http://192.168.1.100:8082/api',
    timeout: 10000
  },
  websocket: {
    url: 'ws://192.168.1.100:8080',
    reconnectIntervals: [1000, 2000, 4000, 8000, 16000, 30000],
    heartbeatInterval: 30000,
    heartbeatTimeout: 5000
  },
  mqtt: {
    broker: '192.168.1.100',
    port: 1883,
    protocol: 'mqtt'
  },
  tls: {
    verifyPeer: false,
    verifyCertificateChain: false,
    minTlsVersion: 'TLSv1.2'
  }
};

/**
 * 测试环境配置
 * 用于 QA 测试和验收测试
 */
export const STAGING_CONFIG: NetworkConfig = {
  environment: 'staging',
  api: {
    baseUrl: 'https://staging-api.guandang-cloud.com/api',
    uploadUrl: 'https://staging-upload.guandang-cloud.com/api',
    timeout: 10000
  },
  websocket: {
    url: 'wss://staging-ws.guandang-cloud.com',
    reconnectIntervals: [1000, 2000, 4000, 8000, 16000, 30000],
    heartbeatInterval: 30000,
    heartbeatTimeout: 5000
  },
  mqtt: {
    broker: 'staging-mqtt.guandang-cloud.com',
    port: 8883,
    protocol: 'mqtts',
    ca: '/etc/ssl/certs/staging-ca.pem'
  },
  tls: {
    verifyPeer: true,
    verifyCertificateChain: true,
    minTlsVersion: 'TLSv1.3'
  }
};

/**
 * 生产环境配置
 * 用于真实硬件设备在实际场景中的通讯
 */
export const PRODUCTION_CONFIG: NetworkConfig = {
  environment: 'production',
  api: {
    baseUrl: 'https://api.guandang-cloud.com/api',
    uploadUrl: 'https://upload.guandang-cloud.com/api',
    timeout: 10000
  },
  websocket: {
    url: 'wss://ws.guandang-cloud.com',
    reconnectIntervals: [1000, 2000, 4000, 8000, 16000, 30000],
    heartbeatInterval: 30000,
    heartbeatTimeout: 5000
  },
  mqtt: {
    broker: 'mqtt.guandang-cloud.com',
    port: 8883,
    protocol: 'mqtts',
    ca: '/etc/ssl/certs/production-ca.pem'
  },
  tls: {
    verifyPeer: true,
    verifyCertificateChain: true,
    minTlsVersion: 'TLSv1.3'
  }
};

/**
 * 获取当前环境的网络配置
 */
export function getNetworkConfig(env?: Environment): NetworkConfig {
  const environment = env || process.env.NODE_ENV || 'development';

  switch (environment) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'staging':
      return STAGING_CONFIG;
    case 'development':
    default:
      return DEVELOPMENT_CONFIG;
  }
}

/**
 * 环境特定的信息日志
 */
export function logEnvironmentInfo(config: NetworkConfig): void {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                  环境配置信息                             ║
╠════════════════════════════════════════════════════════════╣
║ 环境: ${config.environment.toUpperCase().padEnd(54)}║
║                                                            ║
║ API 基础 URL:                                              ║
║   ${config.api.baseUrl.padEnd(52)}║
║                                                            ║
║ 文件上传 URL:                                              ║
║   ${config.api.uploadUrl.padEnd(52)}║
║                                                            ║
║ WebSocket URL:                                             ║
║   ${config.websocket.url.padEnd(52)}║
║                                                            ║
║ MQTT Broker:                                               ║
║   ${(config.mqtt.broker + ':' + config.mqtt.port).padEnd(52)}║
║   协议: ${config.mqtt.protocol.toUpperCase().padEnd(47)}║
║                                                            ║
║ TLS 配置:                                                  ║
║   证书验证: ${(config.tls.verifyPeer ? '启用' : '禁用').padEnd(42)}║
║   最小 TLS 版本: ${config.tls.minTlsVersion.padEnd(35)}║
║                                                            ║
║ 心跳配置:                                                  ║
║   间隔: ${config.websocket.heartbeatInterval}ms                   ║
║   超时: ${config.websocket.heartbeatTimeout}ms                    ║
╚════════════════════════════════════════════════════════════╝
  `);
}

export default getNetworkConfig;
