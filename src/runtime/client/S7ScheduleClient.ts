import nodeSnap7 from 'node-snap7';
import { IOLevel, IOScheduler } from '../../core/io-scheduler/index.js';
import { promisify, timeout as runWithTimeout } from '../../util/index.js';
import {
	S7IOError,
	S7TimeoutError,
	S7ValidationError,
} from '../../errors/index.js';
import { NoopIOTracker } from './NoopIOTracker.js';
import type {
	Area,
	WordLen,
	MultiVarRead,
	MultiVarsReadResult,
	MultiVarWrite,
	MultiVarsWriteResult,
	Status,
} from 'node-snap7';
import type { IIOTracker } from '../../core/io-tracker/index.js';
import type {
	IS7QueuedClient,
	S7ScheduleClientMethods,
} from './S7ScheduleClient.types.js';

function validateParams(options: {
	dbNumber?: number | undefined;
	start?: number;
	size?: number;
	amount?: number;
	buffer?: Buffer;
	timeout?: number;
	level?: IOLevel;
}) {
	if (options.dbNumber !== undefined && options.dbNumber < 0) {
		throw new S7ValidationError('dbNumber must be >= 0', {
			value: options.dbNumber,
		});
	}

	if (options.start !== undefined && options.start < 0) {
		throw new S7ValidationError('start must be >= 0', {
			value: options.start,
		});
	}

	if (options.size !== undefined && options.size < 1) {
		throw new S7ValidationError('size must be >= 1', {
			value: options.size,
		});
	}

	if (options.amount !== undefined && options.amount < 1) {
		throw new S7ValidationError('amount must be >= 1', {
			value: options.amount,
		});
	}

	if (options.buffer !== undefined && !options.buffer.length) {
		throw new S7ValidationError('buffer must be not empty', {
			value: options.buffer.length,
		});
	}

	if (options.timeout !== undefined && options.timeout < 10) {
		throw new S7ValidationError('timeout must be >= 10', {
			value: options.timeout,
		});
	}

	if (
		options.level !== undefined &&
		![IOLevel.NORMAL, IOLevel.URGENT].includes(options.level)
	) {
		throw new S7ValidationError('level must be one of [NORMAL, URGENT]', {
			value: options.level,
		});
	}
}

class S7ScheduleClient implements S7ScheduleClientMethods {
	private nativeClient = new nodeSnap7.S7Client();
	private promisifiedFns = new WeakMap<Function, Function>();
	private scheduler: IOScheduler;

	constructor(ioTracker?: IIOTracker) {
		const finalIOTracker = ioTracker ?? new NoopIOTracker();

		this.scheduler = new IOScheduler(finalIOTracker);
	}

	async Connect(timeout = 2000) {
		if (this.nativeClient.Connected()) return;

		if (timeout < 1000) {
			throw new S7ValidationError('timeout must ≥ 1000', {
				value: timeout,
			});
		}

		return this.executeIO(
			() => this.getPromisifiedFn<void>(this.nativeClient.Connect)(),
			IOLevel.RECONNECT,
			timeout,
			{ operation: 'Connect' },
		);
	}

	async ConnectTo(ip: string, rack = 0, slot = 1, timeout = 2000) {
		if (this.nativeClient.Connected()) return;

		if (!ip) {
			throw new S7ValidationError('ip must be not empty');
		}
		if (rack < 0) {
			throw new S7ValidationError('rack must ≥ 0', { value: rack });
		}
		if (slot < 0) {
			throw new S7ValidationError('slot must ≥ 0', { value: slot });
		}
		if (timeout < 1000) {
			throw new S7ValidationError('timeout must ≥ 1000', {
				value: timeout,
			});
		}

		await this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.ConnectTo)(
					ip,
					rack,
					slot,
				),
			IOLevel.RECONNECT,
			timeout,
			{
				operation: 'ConnectTo',
			},
		);
	}

	async ReadArea(
		area: Area,
		dbNumber: number,
		start: number,
		amount: number,
		wordLen: WordLen,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ dbNumber, start, amount, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<Buffer>(this.nativeClient.ReadArea)(
					area,
					dbNumber,
					start,
					amount,
					wordLen,
				),
			level,
			timeout,
			{ operation: 'ReadArea', area, dbNumber, start, amount, wordLen },
		);
	}

	async WriteArea(
		area: Area,
		dbNumber: number,
		start: number,
		amount: number,
		wordLen: WordLen,
		buffer: Buffer,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({
			dbNumber,
			start,
			amount,
			timeout,
			level,
		});

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.WriteArea)(
					area,
					dbNumber,
					start,
					amount,
					wordLen,
					buffer,
				),
			level,
			timeout,
			{
				operation: 'WriteArea',
				area,
				dbNumber,
				start,
				amount,
				wordLen,
				bufferSize: buffer.length,
			},
		);
	}

	async DBRead(
		dbNumber: number,
		start: number,
		size: number,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({
			dbNumber,
			start,
			size,
			timeout,
			level,
		});

		return this.executeIO(
			() =>
				this.getPromisifiedFn<Buffer>(this.nativeClient.DBRead)(
					dbNumber,
					start,
					size,
				),
			level,
			timeout,
			{ operation: 'DBRead', dbNumber, start, size },
		);
	}

	async DBWrite(
		dbNumber: number,
		start: number,
		size: number,
		buffer: Buffer,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ dbNumber, start, size, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.DBWrite)(
					dbNumber,
					start,
					size,
					buffer,
				),
			level,
			timeout,
			{
				operation: 'DBWrite',
				dbNumber,
				start,
				size,
				bufferSize: buffer.length,
			},
		);
	}

	async DBWriteHeartbeatBit(
		dbNumber: number,
		start: number,
		buffer: Buffer,
		timeout = 2000,
	) {
		validateParams({
			dbNumber,
			start,
			timeout,
		});

		const area = 0x84;
		const amount = 1;
		const wordLen = 0x01;

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.WriteArea)(
					area,
					dbNumber,
					start,
					amount,
					wordLen,
					buffer,
				),
			IOLevel.HEARTBEAT,
			timeout,
			{
				operation: 'WriteArea',
				area,
				dbNumber,
				start,
				amount,
				wordLen,
				bufferSize: buffer.length,
			},
		);
	}

	async DBWriteHeartbeatSequence(
		dbNumber: number,
		start: number,
		size: number,
		buffer: Buffer,
		timeout = 2000,
	) {
		validateParams({ dbNumber, start, size, timeout });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.DBWrite)(
					dbNumber,
					start,
					size,
					buffer,
				),
			IOLevel.HEARTBEAT,
			timeout,
			{
				operation: 'DBWrite',
				dbNumber,
				start,
				size,
				bufferSize: buffer.length,
			},
		);
	}

	async ABRead(
		start: number,
		size: number,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ start, size, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<Buffer>(this.nativeClient.ABRead)(
					start,
					size,
				),
			level,
			timeout,
			{ operation: 'ABRead', start, size },
		);
	}

	async ABWrite(
		start: number,
		size: number,
		buffer: Buffer,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ start, size, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.ABWrite)(
					start,
					size,
					buffer,
				),
			level,
			timeout,
			{ operation: 'ABWrite', start, size, bufferSize: buffer.length },
		);
	}

	async EBRead(
		start: number,
		size: number,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ start, size, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<Buffer>(this.nativeClient.EBRead)(
					start,
					size,
				),
			level,
			timeout,
			{ operation: 'EBRead', start, size },
		);
	}

	async EBWrite(
		start: number,
		size: number,
		buffer: Buffer,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ start, size, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.EBWrite)(
					start,
					size,
					buffer,
				),
			level,
			timeout,
			{ operation: 'EBWrite', start, size, bufferSize: buffer.length },
		);
	}

	async MBRead(
		start: number,
		size: number,
		timeout = 2000,
		level = IOLevel.NORMAL,
	): Promise<Buffer> {
		validateParams({ start, size, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<Buffer>(this.nativeClient.MBRead)(
					start,
					size,
				),
			level,
			timeout,
			{ operation: 'MBRead', start, size },
		);
	}

	async MBWrite(
		start: number,
		size: number,
		buffer: Buffer,
		timeout = 2000,
		level = IOLevel.NORMAL,
	): Promise<void> {
		validateParams({ start, size, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.MBWrite)(
					start,
					size,
					buffer,
				),
			level,
			timeout,
			{ operation: 'MBWrite', start, size, bufferSize: buffer.length },
		);
	}

	async TMRead(
		start: number,
		amount: number,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ start, amount, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<Buffer>(this.nativeClient.TMRead)(
					start,
					amount,
				),
			level,
			timeout,
			{ operation: 'TMRead', start, amount },
		);
	}

	async TMWrite(
		start: number,
		amount: number,
		buffer: Buffer,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ start, amount, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.TMWrite)(
					start,
					amount,
					buffer,
				),
			level,
			timeout,
			{ operation: 'TMWrite', start, amount, bufferSize: buffer.length },
		);
	}

	async CTRead(
		start: number,
		amount: number,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ start, amount, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<Buffer>(this.nativeClient.CTRead)(
					start,
					amount,
				),
			level,
			timeout,
			{ operation: 'CTRead', start, amount },
		);
	}

	async CTWrite(
		start: number,
		amount: number,
		buffer: Buffer,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ start, amount, timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.CTWrite)(
					start,
					amount,
					buffer,
				),
			level,
			timeout,
			{ operation: 'CTWrite', start, amount, bufferSize: buffer.length },
		);
	}

	async ReadMultiVars(
		multiVars: MultiVarRead[],
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		if (multiVars.length <= 0) {
			throw new S7ValidationError('multiVars must be provided');
		}

		validateParams({ timeout, level });

		multiVars.forEach((item) =>
			validateParams({
				dbNumber: item.DBNumber,
				start: item.Start,
				amount: item.Amount,
			}),
		);

		return this.executeIO(
			() =>
				this.getPromisifiedFn<MultiVarsReadResult[]>(
					this.nativeClient.ReadMultiVars,
				)(multiVars),
			level,
			timeout,
			{ operation: 'ReadMultiVars', multiVars },
		);
	}

	async WriteMultiVars(
		multiVars: MultiVarWrite[],
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		if (multiVars.length <= 0) {
			throw new S7ValidationError('multiVars must be provided');
		}

		validateParams({ timeout, level });

		multiVars.forEach((item) =>
			validateParams({
				dbNumber: item.DBNumber,
				start: item.Start,
				amount: item.Amount,
			}),
		);

		return this.executeIO(
			() =>
				this.getPromisifiedFn<MultiVarsWriteResult[]>(
					this.nativeClient.WriteMultiVars,
				)(multiVars),
			level,
			timeout,
			{ operation: 'WriteMultiVars', multiVars },
		);
	}

	async GetPlcDateTime(timeout = 2000, level = IOLevel.NORMAL) {
		validateParams({ timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<Date>(this.nativeClient.GetPlcDateTime)(),
			level,
			timeout,
			{ operation: 'GetPlcDateTime' },
		);
	}

	async SetPlcDateTime(
		dateTime: Date,
		timeout = 2000,
		level = IOLevel.NORMAL,
	) {
		validateParams({ timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(this.nativeClient.SetPlcDateTime)(
					dateTime,
				),
			level,
			timeout,
			{ operation: 'SetPlcDateTime' },
		);
	}

	async SetPlcSystemDateTime(timeout = 2000, level = IOLevel.NORMAL) {
		validateParams({ timeout, level });

		return this.executeIO(
			() =>
				this.getPromisifiedFn<void>(
					this.nativeClient.SetPlcSystemDateTime,
				)(),
			level,
			timeout,
			{ operation: 'SetPlcSystemDateTime' },
		);
	}

	async GetCpuInfo(timeout = 2000, level = IOLevel.NORMAL) {
		validateParams({ timeout, level });

		return this.executeIO(
			() => this.getPromisifiedFn<any>(this.nativeClient.GetCpuInfo)(),
			level,
			timeout,
			{ operation: 'GetCpuInfo' },
		);
	}

	async GetCpInfo(timeout = 2000, level = IOLevel.NORMAL) {
		validateParams({ timeout, level });

		return this.executeIO(
			() => this.getPromisifiedFn<any>(this.nativeClient.GetCpInfo)(),
			level,
			timeout,
			{
				operation: 'GetCpInfo',
			},
		);
	}

	async PlcStatus(timeout = 2000, level = IOLevel.NORMAL) {
		validateParams({ timeout, level });

		return this.executeIO(
			() => this.getPromisifiedFn<Status>(this.nativeClient.PlcStatus)(),
			level,
			timeout,
			{ operation: 'PlcStatus' },
		);
	}

	private getPromisifiedFn<T>(fn: Function) {
		if (this.promisifiedFns.has(fn))
			return this.promisifiedFns.get(fn) as (
				...args: any[]
			) => Promise<T>;

		const promisifiedFn = promisify<T>(fn.bind(this.nativeClient));

		this.promisifiedFns.set(fn, promisifiedFn);

		return promisifiedFn;
	}

	private async executeIO<T>(
		ioFn: (...args: any[]) => Promise<T>,
		level: IOLevel,
		timeout: number,
		context: {
			operation: string;
			[index: string]: any;
		},
	) {
		try {
			const result = await this.scheduler.enqueue<T>(
				() =>
					runWithTimeout(
						ioFn,
						timeout,
						new S7TimeoutError('IO execution timeout', {
							operation: context.operation,
							timeout,
						}),
					),
				level,
			);
			return result;
		} catch (err) {
			if (
				err instanceof S7IOError ||
				err instanceof S7TimeoutError ||
				err instanceof S7ValidationError
			) {
				throw err;
			}

			if (typeof err === 'number') {
				throw new S7IOError(this.nativeClient.ErrorText(err), {
					errno: err,
					context,
				});
			}

			throw new S7IOError((err as Error).message, {
				context,
			});
		}
	}

	private createProxy(): IS7QueuedClient {
		return new Proxy(this, {
			get: (target, prop: keyof IS7QueuedClient) => {
				if ((prop as string) === 'nativeClient') {
					throw new Error('Direct nativeClient access not allowed');
				}

				if (
					prop in target &&
					typeof target[prop as keyof S7ScheduleClient] === 'function'
				) {
					return target[prop as keyof S7ScheduleClient].bind(target);
				}

				const nativeProp = prop as keyof nodeSnap7.S7Client;
				const value = target.nativeClient[nativeProp];

				return typeof value === 'function'
					? value.bind(target.nativeClient)
					: value;
			},
		}) as unknown as IS7QueuedClient;
	}

	public static create(ioTracker?: IIOTracker): IS7QueuedClient {
		const instance = new S7ScheduleClient(ioTracker);
		return instance.createProxy();
	}
}

export const createS7ScheduleClient = S7ScheduleClient.create;
