import { IO_METHOD_MAP } from './defaults.js';
import type { ConnectionType } from 'node-snap7';
import type { IS7QueuedClient } from '../client/index.js';
import type { HeartbeatPingMode } from '../../features/keepalive/index.js';
import type { State } from '../../state/connect/index.js';

interface HeartbeatOptions {
	dbNumber: number;
	start: number;
	interval?: number;
	maxFailures?: number;
	mode?: HeartbeatPingMode;
}

interface ReconnectOptions {
	disable: boolean;
	initDelay?: number;
	maxDelay?: number;
	maxRetries?: number;
}

export enum AddressType {
	RACK_SLOT = 'RACK-SLOT',
	TSAP = 'TSAP',
}

export interface ConnectOptions {
	ip: string;
	port?: number;
	addressType?: AddressType;
	rack?: number;
	slot?: number;
	localTSAP?: number | string;
	remoteTSAP?: number | string;
	connectionType?: ConnectionType;
	timeout?: number;
}

export interface S7ClientSessionOptions {
	connect: ConnectOptions;
	io?: {
		maxQueueSize?: number;
	};
	heartbeat: HeartbeatOptions;
	reconnect: ReconnectOptions;
}

export interface S7ClientSessionOptionsResolved {
	connect: {
		ip: string;
		port: number;
		addressType: AddressType;
		rack?: number;
		slot?: number;
		localTSAP?: number | string;
		remoteTSAP?: number | string;
		connectionType: ConnectionType;
		timeout: number;
	};
	io: {
		maxQueueSize: number;
	};
	heartbeat: Required<HeartbeatOptions>;
	reconnect: Required<ReconnectOptions>;
}

export interface S7ClientSessionEvent {
	connecting: [sessionId: string];
	connect: [sessionId: string];
	waitingForRetry: [sessionId: string, attempt: number];
	disconnect: [sessionId: string];
	error: [sessionId: string, exception: Error];
	connState: [prev: State, next: State];
}

export type SessionIOMethods = {
	[K in keyof typeof IO_METHOD_MAP]: (
		...args: Parameters<IS7QueuedClient[(typeof IO_METHOD_MAP)[K]]>
	) => ReturnType<IS7QueuedClient[(typeof IO_METHOD_MAP)[K]]>;
};
