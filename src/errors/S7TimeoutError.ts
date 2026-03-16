import { S7Error, S7ErrorCode } from './S7Error.js';

export class S7TimeoutError extends S7Error {
	readonly name = 'S7TimeoutError';

	constructor(
		message: string,
		context?: {
			timeout: number;
			operation: string;
		},
	) {
		super(message, S7ErrorCode.ETIME, { context });
	}
}
