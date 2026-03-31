import { DEFAULT_HEARTBEAT_OPTIONS } from './defaults.js';
import { validateHeartbeatOptions } from './validateHeartbeatOptions.js';
import type {
	HeartbeatOptions,
	HeartbeatOptionsResolved,
} from './Heartbeat.types.js';

export function resolveHeartbeatOptions(
	options: HeartbeatOptions,
): HeartbeatOptionsResolved {
	const resolved = {
		interval: options.interval || DEFAULT_HEARTBEAT_OPTIONS.interval,
		maxFailures:
			options.maxFailures || DEFAULT_HEARTBEAT_OPTIONS.maxFailures,
		mode: options.mode ?? DEFAULT_HEARTBEAT_OPTIONS.mode,
		suppressWithTraffic:
			options.suppressWithTraffic ??
			DEFAULT_HEARTBEAT_OPTIONS.suppressWithTraffic,
		ping: options.ping,
	};

	validateHeartbeatOptions(resolved);

	return resolved;
}
