import { DEFAULT_S7_CLIENT_RUNTIME_OPTIONS } from './defaults.js';
import { validateSessionOptions } from './validateSessionOptions.js';
import type {
	S7ClientSessionOptions,
	S7ClientSessionOptionsResolved,
} from './S7ClientSession.types.js';

export function resolveSessionOptions(
	options: S7ClientSessionOptions,
): S7ClientSessionOptionsResolved {
	const resolved = {
		connect: {
			...options.connect,
			port:
				options.connect.port ||
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.connect.port,
			addressType:
				options.connect.addressType ||
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.connect.addressType,
			connectionType:
				options.connect.connectionType ||
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.connect.ConnectionType,
			timeout:
				options.connect.timeout ||
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.connect.timeout,
		},
		io: {
			maxQueueSize: 1000,
		},
		heartbeat: {
			dbNumber: options.heartbeat.dbNumber,
			start: options.heartbeat.start,
			interval:
				options.heartbeat.interval ||
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.heartbeat.interval,
			maxFailures:
				options.heartbeat.maxFailures ||
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.heartbeat.maxFailures,
			mode:
				options.heartbeat.mode ??
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.heartbeat.mode,
			suppressWithTraffic:
				options.heartbeat.suppressWithTraffic ??
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.heartbeat.suppressWithTraffic,
		},
		reconnect: {
			disable:
				options.reconnect.disable ??
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.reconnect.disable,
			initDelay:
				options.reconnect.initDelay ||
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.reconnect.initDelay,
			maxDelay:
				options.reconnect.maxDelay ||
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.reconnect.maxDelay,
			maxRetries:
				options.reconnect.maxRetries ||
				DEFAULT_S7_CLIENT_RUNTIME_OPTIONS.reconnect.maxRetries,
		},
	};

	validateSessionOptions(resolved);

	return resolved;
}
