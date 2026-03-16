import { IOLevel } from '../../core/io-scheduler/index.js';
import type {
	Area,
	WordLen,
	MultiVarRead,
	MultiVarsReadResult,
	MultiVarWrite,
	MultiVarsWriteResult,
	Status,
	S7Client,
} from 'node-snap7';

type PublicIOLevel = IOLevel.NORMAL | IOLevel.URGENT;

export interface S7ScheduleClientMethods {
	Connect(timeout?: number): Promise<void>;

	ConnectTo(
		ip: string,
		rack: number,
		slot: number,
		timeout?: number,
	): Promise<void>;

	ReadArea(
		area: Area,
		dbNumber: number,
		start: number,
		amount: number,
		wordLen: WordLen,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<Buffer>;

	WriteArea(
		area: Area,
		dbNumber: number,
		start: number,
		amount: number,
		wordLen: WordLen,
		buffer: Buffer,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<void>;

	DBRead(
		dbNumber: number,
		start: number,
		size: number,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<Buffer>;

	DBWrite(
		dbNumber: number,
		start: number,
		size: number,
		buffer: Buffer,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<void>;

	DBWriteHeartbeatBit(
		dbNumber: number,
		start: number,
		buffer: Buffer,
		timeout?: number,
	): Promise<void>;

	DBWriteHeartbeatSequence(
		dbNumber: number,
		start: number,
		size: number,
		buffer: Buffer,
		timeout?: number,
	): Promise<void>;

	ABRead(
		start: number,
		size: number,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<Buffer>;

	ABWrite(
		start: number,
		size: number,
		buffer: Buffer,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<void>;

	EBRead(
		start: number,
		size: number,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<Buffer>;

	EBWrite(
		start: number,
		size: number,
		buffer: Buffer,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<void>;

	MBRead(
		start: number,
		size: number,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<Buffer>;

	MBWrite(
		start: number,
		size: number,
		buffer: Buffer,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<void>;

	TMRead(
		start: number,
		amount: number,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<Buffer>;

	TMWrite(
		start: number,
		amount: number,
		buffer: Buffer,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<void>;

	CTRead(
		start: number,
		amount: number,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<Buffer>;

	CTWrite(
		start: number,
		amount: number,
		buffer: Buffer,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<void>;

	ReadMultiVars(
		multiVars: MultiVarRead[],
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<MultiVarsReadResult[]>;

	WriteMultiVars(
		multiVars: MultiVarWrite[],
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<MultiVarsWriteResult[]>;

	GetPlcDateTime(timeout?: number, level?: PublicIOLevel): Promise<Date>;

	SetPlcDateTime(
		dateTime?: Date,
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<void>;

	SetPlcSystemDateTime(
		timeout?: number,
		level?: PublicIOLevel,
	): Promise<void>;

	GetCpuInfo(timeout?: number, level?: PublicIOLevel): Promise<any>;

	GetCpInfo(timeout?: number, level?: PublicIOLevel): Promise<any>;

	PlcStatus(timeout?: number, level?: PublicIOLevel): Promise<Status>;
}

type S7ClientNativeMethods = Omit<S7Client, keyof S7ScheduleClientMethods>;

export type IS7QueuedClient = S7ClientNativeMethods & S7ScheduleClientMethods;
