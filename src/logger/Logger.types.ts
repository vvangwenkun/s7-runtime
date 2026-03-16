export interface Logger {
	trace?(msg: string, ...args: any[]): void;
	debug(msg: string, ...args: any[]): void;
	info(msg: string, ...args: any[]): void;
	warn(msg: string, ...args: any[]): void;
	error(msg: string, ...args: any[]): void;
}
