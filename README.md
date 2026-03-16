# @teamwang-design/s7-runtime

基于 `node-snap7` 封装的**生产级 S7 PLC 通信库**，提供高可用的会话管理、并发 IO 调度、自动重连、心跳检测能力，支持 Promise/async-await 风格 API，适配工业场景的 PLC 通信需求。

## 核心特性

✅ **分层设计**：轻量 IO 客户端 + 高可用会话层，按需选择  
✅ **自动重连**：连接异常时指数退避重试，可配置重试策略  
✅ **心跳检测**：支持位翻转/序列两种心跳模式，及时感知连接状态  
✅ **并发调度**：多优先级 IO 队列，避免共享缓冲区混乱，支持 NORMAL/URGENT/HEARTBEAT/RECONNECT 四级优先级  
✅ **完善的状态管理**：基于状态机的连接生命周期管理，事件化状态通知  
✅ **严格的参数校验**：内置输入参数校验，提前规避非法操作  
✅ **友好的错误处理**：分类封装 S7 错误类型，附带错误码和上下文信息  
✅ **线程安全**：串行化 IO 操作，适配多场景调用

## 安装

```bash
# npm
npm install @teamwang-design/s7-runtime

# yarn
yarn add @teamwang-design/s7-runtime

# pnpm
pnpm add @teamwang-design/s7-runtime
```

## 快速开始

### 场景1：轻量 IO 操作（直接使用 S7ScheduleClient）

适用于简单的 PLC 读写，无重连/心跳需求的场景

```typescript
import { createS7ScheduleClient, IOLevel } from '@teamwang-design/s7-runtime';

// 创建客户端实例
const client = createS7ScheduleClient();

async function run() {
	try {
		// 连接 PLC
		await client.ConnectTo('192.168.1.10', 0, 1);
		console.log('PLC 连接成功');

		// 读取 DB1 从0偏移开始的100字节数据（URGENT 优先级）
		const data = await client.DBRead(1, 0, 100, 2000, IOLevel.URGENT);
		console.log('读取数据：', data);

		// 写入数据到 DB1 从0偏移开始的4字节
		const buf = Buffer.alloc(4);
		buf.writeUInt32BE(123456, 0);
		await client.DBWrite(1, 0, 4, buf);

		// 断开连接
		client.Disconnect();
	} catch (error) {
		console.error('操作失败：', error);
	}
}

run();
```

### 场景2：生产级高可用通信（使用 S7ClientSession）

适用于生产环境，需要自动重连、心跳检测、状态监控的场景

```typescript
import {
	S7ClientSession,
	AddressType,
	HeartbeatPingMode,
} from '@teamwang-design/s7-runtime';

// 创建会话实例（配置重连、心跳）
const session = new S7ClientSession({
	connect: {
		ip: '192.168.1.10',
		port: 102,
		addressType: AddressType.RACK_SLOT,
		rack: 0,
		slot: 1,
		timeout: 10000, // 连接超时时间
	},
	reconnect: {
		disable: false, // 启用自动重连
		initDelay: 1000, // 初始重试延迟
		maxDelay: 30000, // 最大重试延迟
		maxRetries: 10, // 最大重试次数
	},
	heartbeat: {
		interval: 2000, // 心跳间隔
		maxFailures: 3, // 最大心跳失败次数
		mode: HeartbeatPingMode.TOGGLE_BIT, // 位翻转心跳模式
		dbNumber: 2026, // 心跳存储DB块
		start: 0, // 心跳存储偏移量
	},
});

// 监听会话事件
session.on('connect', (sessionId) => {
	console.log(`会话连接成功：${sessionId}`);
});
session.on('disconnect', (sessionId) => {
	console.log(`会话断开：${sessionId}`);
});
session.on('waitingForRetry', (sessionId, attempt) => {
	console.log(`正在重连[${attempt}]：${sessionId}`);
});
session.on('error', (sessionId, error) => {
	console.error(`会话错误[${sessionId}]：`, error);
});

// 启动会话
session.start();

// 连接成功后执行IO操作
session.once('connect', async () => {
	try {
		// 读写PLC数据（会话自动代理IO方法）
		const data = await session.dbRead(1, 0, 100);
		const buf = Buffer.alloc(4);
		buf.write('test', 'utf-8');
		await session.dbWrite(2026, 10, 4, buf);
	} catch (error) {
		console.error('IO操作失败：', error);
	}
});

// 进程退出时优雅关闭会话
process.on('SIGINT', () => {
	session.end();
	process.exit(0);
});
```

## 核心 API 文档

| 类/方法                  | 适用场景                      | 详细文档链接                  |
| ------------------------ | ----------------------------- | ----------------------------- |
| `createS7ScheduleClient` | 轻量 PLC 读写，无重连需求     | [client.md](docs/client.md)   |
| `S7ClientSession`        | 生产级高可用通信，需重连/心跳 | [session.md](docs/session.md) |

### 关键概念

- **IO 优先级**：NORMAL（普通）< HEARTBEAT（心跳）< URGENT（紧急）< RECONNECT（重连），调度器按优先级串行执行
- **连接状态**：DISCONNECTED → CONNECTING → CONNECTED → WAITING_FOR_RETRY，全状态事件化通知
- **心跳模式**：`TOGGLE_BIT`（单比特翻转）/ `SEQUENCE`（16位序列自增），按需选择适配 PLC 逻辑

## 最佳实践

1. **实例复用**：每个 PLC 对应一个 `S7ScheduleClient` / `S7ClientSession` 实例，避免重复创建
2. **生产环境使用会话层**：推荐使用 `S7ClientSession`，自带的重连/心跳能大幅提升可用性
3. **合理配置超时**：网络不稳定场景适当增大连接/IO 超时时间，连接超时≥1000ms，IO 超时≥10ms
4. **监听状态事件**：通过 `connect` / `disconnect` / `waitingForRetry` 事件实现业务侧的状态监控和告警
5. **IO 操作异常处理**：所有 IO 操作包裹 try/catch，区分可重试错误（如 ETIMEDOUT）和致命错误（如 ESHUTDOWN）
6. **关键操作前检查连接**：通过 `session.isAlive()` 验证连接状态，避免无效 IO 调用
7. **遵守队列限制**：不超过内置队列容量（NORMAL:1000、HEARTBEAT:10、URGENT:20、RECONNECT:2），避免队列溢出

## 错误处理

库中封装了三类核心错误类型，便于业务侧精准处理：

- `S7ValidationError`：参数校验失败，如非法 DB 号、负偏移量
- `S7TimeoutError`：IO 操作/连接超时，附带超时时间和操作上下文
- `S7IOError`：PLC 通信错误，包含 snap7 原生错误码和详细信息

```typescript
import {
	S7ValidationError,
	S7TimeoutError,
	S7IOError,
} from '@teamwang-design/s7-runtime';

try {
	await session.dbRead(1, -1, 100); // 非法偏移量
} catch (error) {
	if (error instanceof S7ValidationError) {
		console.error('参数错误：', error.message);
	} else if (error instanceof S7TimeoutError) {
		console.error('操作超时：', error);
	} else if (error instanceof S7IOError) {
		console.error('通信错误：', error.errno, error.message);
	}
}
```

## 许可证

本项目基于 **MIT 许可证** 开源，详情请查看 [LICENSE](LICENSE.txt) 文件。

## 依赖

核心底层依赖：[node-snap7](https://github.com/mathiask88/node-snap7) - S7 协议的 Node.js 封装实现
