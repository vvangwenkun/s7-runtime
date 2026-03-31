import { S7HeartbeatError } from '../../errors/index.js';

export enum HeartbeatPingMode {
	TOGGLE_BIT = 0,
	SEQUENCE = 1,
}

export interface HeartbeatOptions {
	interval?: number;
	maxFailures?: number;
	mode?: HeartbeatPingMode;
	suppressWithTraffic?: boolean;
	ping: (signal: number) => Promise<void>;
}

export type HeartbeatOptionsResolved = Required<HeartbeatOptions>;

export interface HeartbeatEvents {
	dead: [error: S7HeartbeatError];
}
