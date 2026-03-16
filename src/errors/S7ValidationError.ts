import { S7Error, S7ErrorCode } from './S7Error.js';

export class S7ValidationError extends S7Error {
	readonly name = 'S7ValidationError';

	constructor(
		message: string,
		context?: {
			value: number | string | boolean;
			expect?: number | string | boolean;
		},
	) {
		super(message, S7ErrorCode.EINVAL, { context });
	}
}
