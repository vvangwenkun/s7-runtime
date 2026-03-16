export enum S7ErrorCode {
	ECONNREFUSED = 'ECONNREFUSED',
	ECONNRESET = 'ECONNRESET',
	ETIMEDOUT = 'ETIMEDOUT',
	ETIME = 'ETIME',
	EIO = 'EIO',
	EINVAL = 'EINVAL',
	ESHUTDOWN = 'ESHUTDOWN',
}

interface S7ErrContext {
	[index: string]: any;
}

export class S7Error extends Error {
	name = 'S7Error';
	context: S7ErrContext | undefined;
	errno: number | undefined;

	constructor(
		message: string,
		readonly code: S7ErrorCode,
		options?: {
			context?: S7ErrContext | undefined;
			errno?: number;
		},
	) {
		super(message);

		Error.captureStackTrace?.(this, this.constructor);

		Object.setPrototypeOf(this, new.target.prototype);

		this.errno = options?.errno;
		this.context = options?.context;
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			errno: this.errno,
			context: this.context,
		};
	}
}
