import { S7Error, S7ErrorCode } from './S7Error.js';

enum S7NativeErrorCodes {
	// Unix/macOS
	ECONNREFUSED_UNIX = 61,
	ECONNRESET_UNIX = 54,
	ETIMEDOUT_UNIX = 60,

	// Windows
	ECONNREFUSED_WIN = 10061,
	ECONNRESET_WIN = 10054,
	ETIMEDOUT_WIN = 10060,
}

const snap7ErrorMap: Record<number, S7ErrorCode> = {
	// Unix/macOS
	[S7NativeErrorCodes.ECONNREFUSED_UNIX]: S7ErrorCode.ECONNREFUSED,
	[S7NativeErrorCodes.ECONNRESET_UNIX]: S7ErrorCode.ECONNRESET,
	[S7NativeErrorCodes.ETIMEDOUT_UNIX]: S7ErrorCode.ETIMEDOUT,

	// Windows
	[S7NativeErrorCodes.ECONNREFUSED_WIN]: S7ErrorCode.ECONNREFUSED,
	[S7NativeErrorCodes.ECONNRESET_WIN]: S7ErrorCode.ECONNRESET,
	[S7NativeErrorCodes.ETIMEDOUT_WIN]: S7ErrorCode.ETIMEDOUT,
};

export class S7IOError extends S7Error {
	readonly name = 'S7IOError';

	constructor(
		message: string,
		options: {
			errno?: number;
			context?: {
				operation: string;
				[index: string]: any;
			};
		},
	) {
		const code = options.errno
			? (snap7ErrorMap[options.errno] ?? S7ErrorCode.EIO)
			: S7ErrorCode.EIO;

		super(message, code, options);
	}
}
