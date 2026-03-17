import type { Logger } from './Logger.types.js';

export const consoleLogger: Logger = {
	debug: console.debug,
	info: console.info,
	warn: console.warn,
	error: console.error,
};
