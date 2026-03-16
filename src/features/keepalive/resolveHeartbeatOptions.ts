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
		ping: options.ping,
	};

	validateHeartbeatOptions(resolved);

	return resolved;
}
