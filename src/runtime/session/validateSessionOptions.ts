import { AddressType } from './S7ClientSession.types.js';
import { S7ValidationError } from '../../errors/index.js';
import type { S7ClientSessionOptionsResolved } from './S7ClientSession.types.js';

export function validateSessionOptions(
	options: S7ClientSessionOptionsResolved,
) {
	if (!options.connect.ip) {
		throw new S7ValidationError('connect.ip must be provided');
	}

	if (options.connect.addressType === AddressType.RACK_SLOT) {
		const { rack, slot } = options.connect;

		if (rack === undefined || rack < 0) {
			throw new S7ValidationError(
				'connect.rack must be provided and >= 0',
			);
		}

		if (slot === undefined || slot < 0) {
			throw new S7ValidationError(
				'connect.slot must be provided and >= 0',
			);
		}
	} else {
		const { localTSAP, remoteTSAP } = options.connect;

		if (typeof localTSAP === 'string' && localTSAP.trim() === '') {
			throw new S7ValidationError(
				'connect.localTSAP must not be empty string',
			);
		}
		if (typeof localTSAP === 'number' && localTSAP < 0) {
			throw new S7ValidationError('connect.localTSAP must be >= 0');
		}

		if (typeof remoteTSAP === 'string' && remoteTSAP.trim() === '') {
			throw new S7ValidationError(
				'connect.remoteTSAP must not be empty string',
			);
		}
		if (typeof remoteTSAP === 'number' && remoteTSAP < 0) {
			throw new S7ValidationError('connect.remoteTSAP must be >= 0');
		}
	}

	if (options.io.maxQueueSize < 100)
		throw new S7ValidationError('io.maxQueueSize must be >= 100', {
			value: options.io.maxQueueSize,
		});

	if (options.heartbeat.dbNumber < 0)
		throw new S7ValidationError('heartbeat.dbNumber must be >= 0', {
			value: options.heartbeat.dbNumber,
		});

	if (options.heartbeat.start < 0)
		throw new S7ValidationError('heartbeat.start must be >= 0', {
			value: options.heartbeat.start,
		});

	if (options.heartbeat.interval < 100)
		throw new S7ValidationError('heartbeat.interval must be >= 100', {
			value: options.heartbeat.interval,
		});

	if (options.heartbeat.maxFailures < 1)
		throw new S7ValidationError('heartbeat.interval must be >= 1', {
			value: options.heartbeat.maxFailures,
		});

	if (options.reconnect.initDelay < 10)
		throw new S7ValidationError('reconnect.initDelay must be >= 10', {
			value: options.reconnect.initDelay,
		});

	if (options.reconnect.maxDelay <= options.reconnect.initDelay)
		throw new S7ValidationError(
			'reconnect.maxDelay must be > reconnect.initDelay',
			{ value: options.reconnect.maxDelay },
		);

	if (options.reconnect.maxRetries < 1)
		throw new S7ValidationError('reconnect.maxRetries must be >= 1', {
			value: options.reconnect.maxRetries,
		});
}
