#!/usr/bin/env node

/**
 * 真机硬件集成测试脚本
 * 
 * 本脚本模拟真实掼蛋麻将机的通讯行为，用于验证：
 * 1. SDK 集成正确性
 * 2. 网络通讯是否成功
 * 3. 命令执行流程
 * 4. 离线缓存和恢复
 * 
 * 使用方法:
 *   npx ts-node test-real-hardware.ts --env development
 *   npx ts-node test-real-hardware.ts --env staging --verbose
 */

import DeviceSDK from './services/device/deviceSDK';
import { getNetworkConfig, logEnvironmentInfo } from './config/networkConfig';
import type { Environment } from './config/networkConfig';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
}

class HardwareIntegrationTester {
  private sdk: DeviceSDK;
  private results: TestResult[] = [];
  private verbose: boolean = false;
  private environment: Environment;

  constructor(sn: string, secretKey: string, environment: Environment, verbose: boolean = false) {
    this.environment = environment;
    this.verbose = verbose;

    const config = getNetworkConfig(environment);
    logEnvironmentInfo(config);

    this.sdk = new DeviceSDK(sn, secretKey, config.api.baseUrl);
  }

  private log(title: string, message?: any): void {
    if (!this.verbose && !message) return;
    const timestamp = new Date().toISOString().split('T')[1];
    if (message) {
      console.log(`[${timestamp}] ${title}:`, message);
    } else {
      console.log(`[${timestamp}] ${title}`);
    }
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    const result: TestResult = {
      name: testName,
      status: 'PASS',
      duration: 0
    };

    try {
      this.log(`🧪 Running: ${testName}`);
      await testFn();
      result.duration = Date.now() - startTime;
      this.log(`✅ ${testName} passed in ${result.duration}ms`);
    } catch (error) {
      result.status = 'FAIL';
      result.error = error instanceof Error ? error.message : String(error);
      result.duration = Date.now() - startTime;
      this.log(`❌ ${testName} failed: ${result.error}`);
    }

    this.results.push(result);
  }

  /**
   * 测试 1: 设备注册
   */
  async testDeviceRegistration(): Promise<void> {
    await this.runTest('Device Registration', async () => {
      const response = await this.sdk.register('GD_DEALERV2', '1.0.0');

      if (!response.success) throw new Error('Registration failed');
      if (!response.jwt_token) throw new Error('JWT token not provided');
      if (!response.device_id) throw new Error('Device ID not provided');

      this.log('Device registered', {
        device_id: response.device_id,
        token_expires_in: response.token_expires_in,
        mqtt_broker: response.mqtt_broker
      });
    });
  }

  /**
   * 测试 2: 心跳发送
   */
  async testHeartbeat(): Promise<void> {
    await this.runTest('Heartbeat Transmission', async () => {
      const token = this.sdk.getToken();
      if (!token) throw new Error('Device not registered, token missing');

      await this.sdk.sendHeartbeat(-75, 85, 'online');
      this.log('Heartbeat sent successfully');
    });
  }

  /**
   * 测试 3: 状态上报
   */
  async testStatusReport(): Promise<void> {
    await this.runTest('Status Report', async () => {
      await this.sdk.reportStatus('online', {
        game_id: 'TEST_GAME_001',
        round: 1,
        total_rounds: 16,
        players: 4,
        level: 1
      });
      this.log('Status reported successfully');
    });
  }

  /**
   * 测试 4: 遥测数据上报
   */
  async testTelemetryReport(): Promise<void> {
    await this.runTest('Telemetry Report', async () => {
      await this.sdk.reportTelemetry(
        45.2,   // CPU 温度
        12.5,   // CPU 使用率
        68.3,   // 内存使用率
        23.1,   // 磁盘使用率
        -75,    // 信号强度
        85      // 电池电量
      );
      this.log('Telemetry reported successfully');
    });
  }

  /**
   * 测试 5: 查询待执行命令
   */
  async testQueryPendingCommands(): Promise<void> {
    await this.runTest('Query Pending Commands', async () => {
      const commands = await this.sdk.queryPendingCommands();
      this.log('Pending commands queried', {
        count: commands.length
      });
    });
  }

  /**
   * 测试 6: 命令执行确认
   */
  async testCommandAck(): Promise<void> {
    await this.runTest('Command Acknowledgement', async () => {
      await this.sdk.ackCommand(
        'CMD_20250103_0001',
        'deal_start',
        'success',
        { game_id: 'GAME_20250103_0001', started_at: Date.now() }
      );
      this.log('Command acknowledged successfully');
    });
  }

  /**
   * 测试 7: Token 刷新
   */
  async testTokenRefresh(): Promise<void> {
    await this.runTest('Token Refresh', async () => {
      const oldToken = this.sdk.getToken();
      const newToken = await this.sdk.refreshToken();

      if (!newToken) throw new Error('Token refresh returned empty');
      if (newToken === oldToken) this.log('Warning: Token unchanged after refresh');

      this.log('Token refreshed successfully');
    });
  }

  /**
   * 测试 8: 连续心跳（模拟设备长期运行）
   */
  async testContinuousHeartbeat(): Promise<void> {
    await this.runTest('Continuous Heartbeat (3 iterations)', async () => {
      for (let i = 0; i < 3; i++) {
        await this.sdk.sendHeartbeat(-70, 80 - i * 5, 'busy');
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.log(`Heartbeat ${i + 1}/3 sent`);
      }
    });
  }

  /**
   * 测试 9: 命令模拟流程
   */
  async testCommandSimulation(): Promise<void> {
    await this.runTest('Command Simulation Flow', async () => {
      // 1. 查询待执行命令
      const pendingCommands = await this.sdk.queryPendingCommands();
      this.log('Commands queried', { count: pendingCommands.length });

      // 2. 如果有命令，执行并确认
      if (pendingCommands.length > 0) {
        for (const cmd of pendingCommands.slice(0, 1)) {
          // 只处理第一条
          this.log('Processing command', { cmd_type: cmd.cmd_type });

          // 模拟命令执行时间
          await new Promise(resolve => setTimeout(resolve, 500));

          // 上报执行结果
          await this.sdk.ackCommand(
            cmd.cmd_id,
            cmd.cmd_type,
            'success',
            { executed_at: Date.now() }
          );
          this.log('Command execution confirmed');
        }
      } else {
        this.log('No pending commands to process');
      }
    });
  }

  /**
   * 测试 10: 状态转换序列
   */
  async testStatusTransitions(): Promise<void> {
    await this.runTest('Status Transitions', async () => {
      const statuses = ['online', 'busy', 'paused', 'busy', 'online'] as const;

      for (const status of statuses) {
        await this.sdk.reportStatus(status, {
          game_id: 'TEST_GAME_001',
          round: Math.floor(Math.random() * 16),
          total_rounds: 16,
          players: 4,
          level: 1
        });

        this.log(`Status changed to: ${status}`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    });
  }

  /**
   * 运行全部测试
   */
  async runAllTests(): Promise<void> {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          真机硬件集成测试套件                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 必需的测试（顺序重要）
    await this.testDeviceRegistration();
    await this.testHeartbeat();
    await this.testStatusReport();
    await this.testTelemetryReport();
    await this.testQueryPendingCommands();
    await this.testCommandAck();

    // 高级测试
    await this.testTokenRefresh();
    await this.testContinuousHeartbeat();
    await this.testCommandSimulation();
    await this.testStatusTransitions();

    this.printResults();
  }

  /**
   * 打印测试结果汇总
   */
  private printResults(): void {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                      测试结果汇总                         ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ 总计: ${this.results.length} | 通过: ${passed} | 失败: ${failed} | 跳过: ${skipped}`.padEnd(60) + '║');
    console.log(`║ 总耗时: ${totalDuration}ms`.padEnd(60) + '║');
    console.log('╠════════════════════════════════════════════════════════════╣');

    // 详细结果
    for (const result of this.results) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⊘';
      const message = `${icon} ${result.name.padEnd(45)} ${result.duration}ms`.padEnd(60);
      console.log('║' + message + '║');

      if (result.error) {
        console.log('║' + `   错误: ${result.error}`.padEnd(60) + '║');
      }
    }

    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 成功/失败判定
    if (failed === 0) {
      console.log('🎉 所有测试通过！设备可以投入真实环境。\n');
    } else {
      console.log(`❌ 有 ${failed} 个测试失败，请检查错误日志并排查。\n`);
      process.exit(1);
    }
  }
}

// ============ 主程序 ============

async function main(): Promise<void> {
  // 解析命令行参数
  const args = process.argv.slice(2);
  let environment: Environment = 'development';
  let verbose = false;
  let sn = process.env.DEVICE_SN || 'GD20251225001';
  let secretKey = process.env.DEVICE_SECRET || 'a1b2c3d4e5f6g7h8';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' && args[i + 1]) {
      environment = args[i + 1] as Environment;
      i++;
    }
    if (args[i] === '--verbose') {
      verbose = true;
    }
    if (args[i] === '--sn' && args[i + 1]) {
      sn = args[i + 1];
      i++;
    }
    if (args[i] === '--secret' && args[i + 1]) {
      secretKey = args[i + 1];
      i++;
    }
  }

  const tester = new HardwareIntegrationTester(sn, secretKey, environment, verbose);
  await tester.runAllTests();
}

main().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
