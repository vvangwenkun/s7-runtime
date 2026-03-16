import { S7ValidationError } from '../../errors/index.js';
import type { HeartbeatOptionsResolved } from './Heartbeat.types.js';

export function validateHeartbeatOptions(options: HeartbeatOptionsResolved) {
	if (options.interval < 100)
		throw new S7ValidationError('ping.interval must be >= 100', {
			value: options.interval,
		});

	if (options.maxFailures < 1)
		throw new S7ValidationError('ping.maxFailures must be >= 1', {
			value: options.maxFailures,
		});
}
