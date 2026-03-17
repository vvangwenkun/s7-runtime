# S7ScheduleClient API Documentation | S7ScheduleClient 接口文档

> A thread-safe, Promise-based S7 PLC client with concurrent IO scheduling | 支持并发 IO 调度的线程安全、Promise 风格 S7 PLC 客户端

---

## Table of Contents | 目录

1. [Overview | 概述](#overview--概述)
2. [Installation | 安装](#installation--安装)
3. [Quick Start | 快速开始](#quick-start--快速开始)
4. [API Reference | API 参考](#api-reference--api-参考)
5. [Error Handling | 错误处理](#error-handling--错误处理)
6. [Best Practices | 最佳实践](#best-practices--最佳实践)

---

## Overview | 概述

[S7ScheduleClient](../src/runtime/client/S7ScheduleClient.ts#L78-L733) is a secondary encapsulation of `node-snap7` that provides:

- **Concurrency Control**: Serializes IO operations to prevent shared buffer corruption
- **Promise-Based API**: Converts all callback operations to `Promise/async-await`
- **Timeout Management**: Built-in timeout control for all IO operations
- **Priority Scheduling**: Supports `NORMAL`, `URGENT`, `RECONNECT`, and `HEARTBEAT` priority levels
- **Parameter Validation**: Automatic validation of input parameters

[S7ScheduleClient](../src/runtime/client/S7ScheduleClient.ts#L78-L733) 是 `node-snap7` 的二次封装，提供以下功能：

- **并发控制**：串行化 IO 操作，防止共享缓冲区数据混乱
- **Promise 风格 API**：将所有回调操作转换为 `Promise/async-await`
- **超时管理**：所有 IO 操作内置超时控制
- **优先级调度**：支持 `NORMAL`, `URGENT`, `RECONNECT`, and `HEARTBEAT` 优先级
- **参数验证**：自动验证输入参数

---

## Installation | 安装

```bash
npm install @teamwang-design/s7-runtime
```

---

## Quick Start | 快速开始

```typescript
import { createS7ScheduleClient, IOLevel } from '@teamwang-design/s7-runtime';

// Create client instance
const client = createS7ScheduleClient();

// Connect to PLC
await client.ConnectTo('192.168.1.10', 0, 1);

// Read data from DB
const data = await client.DBRead(1, 0, 100, 2000, IOLevel.NORMAL);

// Write data to DB
await client.DBWrite(1, 0, 100, buffer, 2000, IOLevel.URGENT);

// Disconnect
client.Disconnect();
```

---

## API Reference | API 参考

### Client Creation | 客户端创建

#### `createS7ScheduleClient(ioTracker?: IIOTracker): IS7QueuedClient`

| Parameter | Type                                                          | Required | Description                   |
| --------- | ------------------------------------------------------------- | -------- | ----------------------------- |
| ioTracker | [IIOTracker](../src/core/io-tracker/IOTracker.types.ts#L0-L4) | No       | IO operation tracker instance |

**Returns**: [IS7QueuedClient](../src/runtime/client/S7ScheduleClient.types.ts#L186-L186) - Proxy-wrapped client instance

---

### Connection Methods | 连接方法

#### `Connect(timeout?: number): Promise<void>`

Connect to PLC with default connection parameters.

使用默认连接参数连接到 PLC。

| Parameter | Type     | Default | Description                                      |
| --------- | -------- | ------- | ------------------------------------------------ |
| timeout   | `number` | `2000`  | Connection timeout in milliseconds (must ≥ 1000) |

**Throws**: [S7ValidationError](../src/errors/S7ValidationError.ts#L2-L14) if timeout < 1000

---

#### `ConnectTo(ip: string, rack?: number, slot?: number, timeout?: number): Promise<void>`

Connect to specific PLC with IP address, rack, and slot.

通过 IP 地址、机架号和槽位号连接到指定 PLC。

| Parameter | Type     | Default | Description                                      |
| --------- | -------- | ------- | ------------------------------------------------ |
| ip        | `string` | -       | PLC IP address (required)                        |
| rack      | `number` | `0`     | PLC rack number (must ≥ 0)                       |
| slot      | `number` | `1`     | PLC slot number (must ≥ 0)                       |
| timeout   | `number` | `2000`  | Connection timeout in milliseconds (must ≥ 1000) |

**Throws**: [S7ValidationError](../src/errors/S7ValidationError.ts#L2-L14) if timeout < 1000

**Example**:

```typescript
await client.ConnectTo('192.168.1.10', 0, 1, 3000);
```

---

### Data Read Methods | 数据读取方法

#### `DBRead(dbNumber: number, start: number, size: number, timeout?: number, level?: IOLevel): Promise<Buffer>`

Read data from Data Block (DB).

从数据块（DB）读取数据。

| Parameter | Type                                                           | Default  | Description                                        |
| --------- | -------------------------------------------------------------- | -------- | -------------------------------------------------- |
| dbNumber  | `number`                                                       | -        | DB number (must ≥ 0)                               |
| start     | `number`                                                       | -        | Start offset (must ≥ 0)                            |
| size      | `number`                                                       | -        | Data size in bytes (must ≥ 1)                      |
| timeout   | `number`                                                       | `2000`   | Operation timeout (must ≥ 10)                      |
| level     | [IOLevel](../src/runtime/client/S7ScheduleClient.types.ts#L13) | `NORMAL` | Priority level, Allowed values: `NORMAL`, `URGENT` |

**Returns**: `Buffer` - Read data

---

#### `ReadArea(area: Area, dbNumber: number, start: number, amount: number, wordLen: WordLen, timeout?: number, level?: IOLevel): Promise<Buffer>`

Read data from specified area (I, Q, M, DB, etc.).

从指定区域（I、Q、M、DB 等）读取数据。

| Parameter | Type                                                                                                                          | Default  | Description                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------- |
| area      | [Area](https://github.com/mathiask88/node-snap7/blob/1b15218c7a2b7d6b6455454e43fdf4c4797285d3/doc/client.md#table-area)       | -        | Memory area type                                   |
| dbNumber  | `number`                                                                                                                      | -        | DB number (must ≥ 0)                               |
| start     | `number`                                                                                                                      | -        | Start offset (must ≥ 0)                            |
| amount    | `number`                                                                                                                      | -        | Amount of words to read (must ≥ 1)                 |
| wordLen   | [WordLen](https://github.com/mathiask88/node-snap7/blob/1b15218c7a2b7d6b6455454e43fdf4c4797285d3/doc/client.md#table-wordlen) | -        | Word size                                          |
| timeout   | `number`                                                                                                                      | `2000`   | Operation timeout                                  |
| level     | [IOLevel](../src/runtime/client/S7ScheduleClient.types.ts#L13)                                                                | `NORMAL` | Priority level, Allowed values: `NORMAL`, `URGENT` |

---

#### `ABRead(start: number, size: number, timeout?: number, level?: IOLevel): Promise<Buffer>`

Read from Output Area (Q/outputs).

从输出区域（Q/outputs）读取数据。

---

#### `EBRead(start: number, size: number, timeout?: number, level?: IOLevel): Promise<Buffer>`

Read from Input Area (I/Inputs).

从输入区域（I/Inputs）读取数据。

---

#### `MBRead(start: number, size: number, timeout?: number, level?: IOLevel): Promise<Buffer>`

Read from Memory Area (M/Merker).

从位存储区（M/Merker）读取数据。

---

#### `TMRead(start: number, amount: number, timeout?: number, level?: IOLevel): Promise<Buffer>`

Read Timer values.

读取定时器值。

---

#### `CTRead(start: number, amount: number, timeout?: number, level?: IOLevel): Promise<Buffer>`

Read Counter values.

读取计数器值。

---

### Data Write Methods | 数据写入方法

#### `DBWrite(dbNumber: number, start: number, size: number, buffer: Buffer, timeout?: number, level?: IOLevel): Promise<void>`

Write data to Data Block (DB).

写入数据到数据块（DB）。

| Parameter | Type                                                           | Default  | Description                                        |
| --------- | -------------------------------------------------------------- | -------- | -------------------------------------------------- |
| dbNumber  | `number`                                                       | -        | DB number (must ≥ 0)                               |
| start     | `number`                                                       | -        | Start offset (must ≥ 0)                            |
| size      | `number`                                                       | -        | Data size in bytes (must ≥ 1)                      |
| buffer    | `Buffer`                                                       | -        | Data buffer (must not be empty)                    |
| timeout   | `number`                                                       | `2000`   | Operation timeout                                  |
| level     | [IOLevel](../src/runtime/client/S7ScheduleClient.types.ts#L13) | `NORMAL` | Priority level, Allowed values: `NORMAL`, `URGENT` |

---

#### `WriteArea(area: Area, dbNumber: number, start: number, amount: number, wordLen: WordLen, buffer: Buffer, timeout?: number, level?: IOLevel): Promise<void>`

Write data to specified area.

写入数据到指定区域。

---

#### `ABWrite(start: number, size: number, buffer: Buffer, timeout?: number, level?: IOLevel): Promise<void>`

Write to Outputs Area (Q/Outputs).

写入到输出区域（Q/Outputs）。

---

#### `EBWrite(start: number, size: number, buffer: Buffer, timeout?: number, level?: IOLevel): Promise<void>`

Write to Input Area (I/Inputs).

写入到输入区域（I/Inputs）。

---

#### `MBWrite(start: number, size: number, buffer: Buffer, timeout?: number, level?: IOLevel): Promise<void>`

Write to Memory Area (M/Merker).

写入到位存储区（M/Merker）。

---

#### `TMWrite(start: number, amount: number, buffer: Buffer, timeout?: number, level?: IOLevel): Promise<void>`

Write Timer values.

写入定时器值。

---

#### `CTWrite(start: number, amount: number, buffer: Buffer, timeout?: number, level?: IOLevel): Promise<void>`

Write Counter values.

写入计数器值。

---

### Multi-Variable Operations | 多变量操作

#### `ReadMultiVars(multiVars: MultiVarRead[], timeout?: number, level?: IOLevel): Promise<MultiVarsReadResult[]>`

Read multiple variables in a single operation.

单次操作读取多个变量。

| Parameter | Type                                                           | Default  | Description                                                |
| --------- | -------------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| multiVars | `MultiVarRead[]`                                               | -        | Array of objects with read information (must not be empty) |
| timeout   | `number`                                                       | `2000`   | Operation timeout                                          |
| level     | [IOLevel](../src/runtime/client/S7ScheduleClient.types.ts#L13) | `NORMAL` | Priority level, Allowed values: `NORMAL`, `URGENT`         |

**Example | 示例**:

```typescript
const results = await client.ReadMultiVars([
	{ Area: 0x84, DBNumber: 1, Start: 0, WordLen: 0x02, Amount: 10 },
	{ Area: 0x84, DBNumber: 2, Start: 0, WordLen: 0x02, Amount: 5 },
]);
```

---

#### `WriteMultiVars(multiVars: MultiVarWrite[], timeout?: number, level?: IOLevel): Promise<MultiVarsWriteResult[]>`

Write multiple variables in a single operation.

单次操作写入多个变量。

---

### Heartbeat Methods | 心跳方法

#### `DBWriteHeartbeatBit(dbNumber: number, start: number, buffer: Buffer, timeout?: number): Promise<void>`

Write heartbeat bit to DB.

写入心跳位到 DB。

| Parameter | Type     | Default | Description       |
| --------- | -------- | ------- | ----------------- |
| dbNumber  | `number` | -       | DB number         |
| start     | `number` | -       | Start offset      |
| buffer    | `Buffer` | -       | Heartbeat data    |
| timeout   | `number` | `2000`  | Operation timeout |

**Note | 注意**: Uses `IOLevel.HEARTBEAT` priority automatically

---

#### `DBWriteHeartbeatSequence(dbNumber: number, start: number, size: number, buffer: Buffer, timeout?: number): Promise<void>`

Write heartbeat sequence to DB.

写入心跳序列到 DB。

---

### PLC Information Methods | PLC 信息方法

#### `GetPlcDateTime(timeout?: number, level?: IOLevel): Promise<Date>`

Get PLC date and time.

获取 PLC 日期和时间。

**Returns | 返回值**: `Date` - PLC current datetime | PLC 当前日期时间

---

#### `SetPlcDateTime(dateTime: Date, timeout?: number, level?: IOLevel): Promise<void>`

Set PLC date and time.

设置 PLC 日期和时间。

| Parameter | Type   | Description            |
| --------- | ------ | ---------------------- |
| dateTime  | `Date` | Target datetime to set |

---

#### `SetPlcSystemDateTime(timeout?: number, level?: IOLevel): Promise<void>`

Set PLC datetime to system (local) datetime.

将 PLC 日期时间设置为系统（本地）日期时间。

---

#### `GetCpuInfo(timeout?: number, level?: IOLevel): Promise<any>`

Get CPU information.

获取 CPU 信息。

---

#### `GetCpInfo(timeout?: number, level?: IOLevel): Promise<any>`

Get Communication Processor information.

获取通信处理器信息。

---

#### `PlcStatus(timeout?: number, level?: IOLevel): Promise<Status>`

Get PLC status.

获取 PLC 状态。

**Returns | 返回值**: `Status` - PLC current status | PLC 当前状态

---

## IOLevel Priority | IO 优先级

| Level     | Description               |
| --------- | ------------------------- |
| NORMAL    | lowest priority ⚡        |
| HEARTBEAT | High priority ⚡⚡        |
| URGENT    | critical priority ⚡⚡⚡  |
| RECONNECT | highest priority ⚡⚡⚡⚡ |

---

## Error Handling | 错误处理

### Error Types | 错误类型

| Error Class                                                    | Description                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| [S7ValidationError](../src/errors/S7ValidationError.ts#L2-L14) | Parameter validation failed                                     |
| [S7TimeoutError](../src/errors/S7TimeoutError.ts#L2-L14)       | IO operation timeout                                            |
| [S7IOError](../src/errors/S7IOError.ts#L26-L45)                | General IO operation error (includes snap7 numeric error codes) |

### Example | 示例

```typescript
import {
	S7ValidationError,
	S7TimeoutError,
	S7IOError,
} from '@teamwang-design/s7-runtime';

try {
	await client.DBRead(1, 0, 100);
} catch (error) {
	if (error instanceof S7ValidationError) {
		console.error('Invalid parameters:', error);
	} else if (error instanceof S7TimeoutError) {
		console.error('Operation timeout:', error);
	} else if (error instanceof S7IOError) {
		console.error('IO error code:', error.errno, 'message:', error.message);
	}
}
```

---

## Best Practices | 最佳实践

1. **Reuse Client Instance**: Create one client instance per PLC connection
2. **Set Appropriate Timeouts**: Adjust timeout based on network conditions
3. **Use Priority Levels**: Assign [URGENT](../src/core/io-scheduler/IOScheduler.types.ts#L3-L3) for critical operations
4. **Handle Errors Gracefully**: Always wrap IO calls in try-catch blocks
5. **Monitor Connection Status**: Check connection before operations
6. **Respect Queue Limits**: Do not exceed the built-in queue size limits (NORMAL: 1000, URGENT: 20, HEARTBEAT: 10, RECONNECT: 2) to avoid "IO queue overflow" errors.

<div><!-- 中文版 --></div>

1. **复用客户端实例**：每个 PLC 连接创建一个客户端实例
2. **设置合适的超时**：根据网络条件调整超时时间
3. **使用优先级**：为关键操作分配 [URGENT](../src/core/io-scheduler/IOScheduler.types.ts#L3-L3) 优先级
4. **优雅处理错误**：始终用 try-catch 包裹 IO 调用
5. **监控连接状态**：操作前检查连接状态
6. **遵守队列限制**：不要超过内置队列容量限制（NORMAL: 1000、URGENT: 20、HEARTBEAT: 10、RECONNECT: 2），避免触发“IO queue overflow”错误。

---

## License | 许可证

MIT License | MIT 许可证
