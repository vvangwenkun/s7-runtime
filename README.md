# 🌟 S7-Runtime: 生产级S7 PLC通信库 | Production-Grade S7 PLC Communication Library

A production-grade S7 PLC communication library built on `node-snap7`, featuring high-availability session management, concurrent IO scheduling, automatic reconnection, and heartbeat detection. Designed for industrial PLC communication scenarios with Promise/async-await friendly APIs.

基于 `node-snap7` 封装的**生产级 S7 PLC 通信库**，提供高可用的会话管理、并发 IO 调度、自动重连、心跳检测能力，支持 Promise/async-await 风格 API，适配工业场景的 PLC 通信需求。

## 🚀 Core Features | 核心特性

✅ Layered Design: Lightweight IO client + high-availability session layer (choose as needed)  
✅ Auto Reconnection: Exponential backoff retry on connection failures (configurable strategy)  
✅ Heartbeat Detection: Toggle-bit/sequence heartbeat modes to detect connection status in real-time  
✅ Concurrent Scheduling: Multi-priority IO queues (NORMAL/URGENT/HEARTBEAT/RECONNECT) to eliminate concurrent access conflicts on shared resources (Job/Buffer) in asynchronous scenarios  
✅ State Management: State machine-based connection lifecycle with event-driven state notifications  
✅ Strict Validation: Built-in input validation to prevent illegal operations  
✅ Friendly Error Handling: Classified S7 error types with error codes and context  
✅ Thread Safety: Serialized IO operations for multi-scenario invocation

✅ **分层设计**：轻量 IO 客户端 + 高可用会话层，按需选择  
✅ **自动重连**：连接异常时指数退避重试，可配置重试策略  
✅ **心跳检测**：支持位翻转/序列两种心跳模式，及时感知连接状态  
✅ **并发调度**：多优先级 IO 队列，避免异步回调导致的共享资源（Job/Buffer）并发访问冲突，支持 NORMAL/URGENT/HEARTBEAT/RECONNECT 四级优先级  
✅ **完善的状态管理**：基于状态机的连接生命周期管理，事件化状态通知  
✅ **严格的参数校验**：内置输入参数校验，提前规避非法操作  
✅ **友好的错误处理**：分类封装 S7 错误类型，附带错误码和上下文信息  
✅ **线程安全**：串行化 IO 操作，适配多场景调用

## 📦 Installation | 安装

```bash
# npm
npm install @teamwang-design/s7-runtime

# yarn
yarn add @teamwang-design/s7-runtime

# pnpm
pnpm add @teamwang-design/s7-runtime
```

## 💡 Quick Start | 快速开始

### Scenario 1: Lightweight IO Operations | 场景1：轻量 IO 操作

For simple PLC read/write without reconnection/heartbeat requirements

适用于简单的 PLC 读写，无重连/心跳需求的场景

```typescript
import { createS7ScheduleClient, IOLevel } from '@teamwang-design/s7-runtime';

// Create client instance
const client = createS7ScheduleClient();

async function run() {
	try {
		// Connect to PLC
		await client.ConnectTo('192.168.1.10', 0, 1);
		console.log('PLC connected successfully');

		// Read 100 bytes from DB1 offset 0 (URGENT priority)
		const data = await client.DBRead(1, 0, 100, 2000, IOLevel.URGENT);
		console.log('Read data：', data);

		// Write 4 bytes to DB1 offset 0
		const buf = Buffer.alloc(4);
		buf.writeUInt32BE(123456, 0);
		await client.DBWrite(1, 0, 4, buf);

		// Disconnect
		client.Disconnect();
	} catch (error) {
		console.error('Operation failed：', error);
	}
}

run();
```

### Scenario 2: Production-Grade High-Availability Communication | 场景2：生产级高可用通信

For production environments requiring auto-reconnection, heartbeat detection, and state monitoring

适用于生产环境，需要自动重连、心跳检测、状态监控的场景

```typescript
import {
	S7ClientSession,
	AddressType,
	HeartbeatPingMode,
} from '@teamwang-design/s7-runtime';

// Create session instance (configure reconnection & heartbeat)
const session = new S7ClientSession({
	connect: {
		ip: '192.168.1.10',
		port: 102,
		addressType: AddressType.RACK_SLOT,
		rack: 0,
		slot: 1,
		timeout: 10000, // Connection timeout
	},
	reconnect: {
		disable: false, // Enable auto-reconnection
		initDelay: 1000, // Initial retry delay
		maxDelay: 30000, // Max retry delay
		maxRetries: 10, // Max retry attempts
	},
	heartbeat: {
		interval: 2000, // Heartbeat interval
		maxFailures: 3, // Max heartbeat failures
		mode: HeartbeatPingMode.TOGGLE_BIT, // Toggle-bit heartbeat mode
		dbNumber: 10, // Heartbeat DB number
		start: 0, // Heartbeat offset
	},
});

// Listen to session events
session.on('connect', (sessionId) => {
	console.log(`Session connected：${sessionId}`);
});
session.on('disconnect', (sessionId) => {
	console.log(`Session disconnected：${sessionId}`);
});
session.on('waitingForRetry', (sessionId, attempt) => {
	console.log(`Reconnecting [${attempt}]：${sessionId}`);
});
session.on('runtimeError', (sessionId, error) => {
	console.error(`Session error [${sessionId}]：`, error);
});

// Start session
session.start();

// Execute IO operations after connection
session.once('connect', async () => {
	try {
		// Read/write PLC data (session proxies IO methods automatically)
		const data = await session.dbRead(10, 10, 100);
		const buf = Buffer.alloc(4);
		buf.write('test', 'utf-8');
		await session.dbWrite(10, 20, 4, buf);
	} catch (error) {
		console.error('IO operation failed | IO操作失败：', error);
	}
});

// Gracefully close session on process exit
process.on('SIGINT', () => {
	session.end();
	process.exit(0);
});
```

## 📖 Key Concepts | 关键概念

- **IO Priority**：NORMAL < HEARTBEAT < URGENT < RECONNECT (scheduler executes serially by priority)
- **Connection State**：DISCONNECTED → CONNECTING → CONNECTED → WAITING_FOR_RETRY (full event-driven notifications)
- **Heartbeat Mode**：`TOGGLE_BIT` (single bit flip) / `SEQUENCE` (16-bit auto-increment) (adapt to PLC logic)

- **IO 优先级**：NORMAL < HEARTBEAT < URGENT < RECONNECT，调度器按优先级串行执行
- **连接状态**：DISCONNECTED → CONNECTING → CONNECTED → WAITING_FOR_RETRY，全状态事件化通知
- **心跳模式**：`TOGGLE_BIT`（单比特翻转）/ `SEQUENCE`（16位序列自增），按需选择适配 PLC 逻辑

## 🛠 Best Practices | 最佳实践

1. **Instance Reuse**: One `S7ScheduleClient`/`S7ClientSession` per PLC (avoid duplicate creation)
2. **Use Session Layer in Production**: Recommend `S7ClientSession` for built-in reconnection/heartbeat (improves availability)
3. **Reasonable Timeout Configuration**: Increase timeout for unstable networks (connection ≥1000ms, IO ≥10ms)
4. **Monitor State Events**: Use `connect`/`disconnect`/`waitingForRetry` for business-side monitoring/alerts
5. **IO Error Handling**: Wrap all IO operations in try/catch (distinguish retryable/fatal errors)
6. **Check Connection Before Critical Operations**: Validate status with `session.isAlive()` to avoid invalid IO calls
7. **Respect Queue Limits**: Do not exceed queue capacity (NORMAL:1000, HEARTBEAT:10, URGENT:20, RECONNECT:2)

<div></div>

1. **实例复用**：每个 PLC 对应一个 `S7ScheduleClient` / `S7ClientSession` 实例，避免重复创建
2. **生产环境使用会话层**：推荐使用 `S7ClientSession`，自带的重连/心跳能大幅提升可用性
3. **合理配置超时**：网络不稳定场景适当增大连接/IO 超时时间，连接超时≥1000ms，IO 超时≥10ms
4. **监听状态事件**：通过 `connect` / `disconnect` / `waitingForRetry` 事件实现业务侧的状态监控和告警
5. **IO 操作异常处理**：所有 IO 操作包裹 try/catch，区分可重试错误（如 ETIMEDOUT）和致命错误（如 ESHUTDOWN）
6. **关键操作前检查连接**：通过 `session.isAlive()` 验证连接状态，避免无效 IO 调用
7. **遵守队列限制**：不超过内置队列容量（NORMAL:1000、HEARTBEAT:10、URGENT:20、RECONNECT:2），避免队列溢出

## ❗ Error Handling | 错误处理

Classified error types for precise business handling:

库中封装了三类核心错误类型，便于业务侧精准处理：

```typescript
import {
	S7ValidationError,
	S7TimeoutError,
	S7IOError,
} from '@teamwang-design/s7-runtime';

try {
	await session.dbRead(1, -1, 100); // Invalid offset
} catch (error) {
	if (error instanceof S7ValidationError) {
		console.error('Parameter error：', error.message);
	} else if (error instanceof S7TimeoutError) {
		console.error('Operation timeout：', error);
	} else if (error instanceof S7IOError) {
		console.error('Communication error：', error.errno, error.message);
	}
}
```

## 📄 License | 许可证

This project is open-source under the **MIT License** - see the [LICENSE](LICENSE.txt) file for details.

本项目基于 **MIT 许可证** 开源，详情请查看 [LICENSE](LICENSE.txt) 文件。

## 📚 Dependencies | 依赖

Core underlying dependency: [node-snap7](https://github.com/mathiask88/node-snap7) - Node.js binding for S7 protocol

核心底层依赖：[node-snap7](https://github.com/mathiask88/node-snap7) - S7 协议的 Node.js 封装实现

---

### 📌 API Documentation | API 文档

| Class/Method             | Use Case                                         | Documentation                 |
| ------------------------ | ------------------------------------------------ | ----------------------------- |
| `createS7ScheduleClient` | Lightweight PLC read/write (no reconnection)     | [client.md](docs/client.md)   |
| `S7ClientSession`        | Production-grade high-availability communication | [session.md](docs/session.md) |

---

> 💬 Community Tips | 社区提示：  
> If you encounter issues or have feature requests, please submit an issue on the repository. Contributions are welcome!  
> 如遇问题或有功能需求，欢迎在仓库提交 Issue，也欢迎贡献代码！
