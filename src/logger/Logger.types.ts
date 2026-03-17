type LogPayload = {
	message: string;
	[key: string]: any;
};

export interface Logger {
	debug(payload: LogPayload): void;
	info(payload: LogPayload): void;
	warn(payload: LogPayload): void;
	error(payload: LogPayload): void;
}
