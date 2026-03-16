import { S7Error, S7ErrorCode } from './S7Error.js';

export class S7HeartbeatError extends S7Error {
	readonly name = 'S7HeartbeatError';

	constructor(
		message: string,
		context?: {
			failures: number;
			maxFailures: number;
		},
	) {
		super(message, S7ErrorCode.ETIMEDOUT, { context });
	}
}
