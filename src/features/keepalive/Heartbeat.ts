import { EventEmitter } from 'node:events';
import { resolveHeartbeatOptions } from './resolveHeartbeatOptions.js';
import { S7HeartbeatError } from '../../errors/index.js';
import { HeartbeatPingMode } from './Heartbeat.types.js';
import type { IIOTracker } from '../../core/io-tracker/index.js';
import type { HeartbeatOptions, HeartbeatEvents } from './Heartbeat.types.js';

export class Heartbeat extends EventEmitter<HeartbeatEvents> {
	private options;
	private running = false;
	private dead = false;
	private failures = 0;
	private signal = 0;
	private timer: NodeJS.Timeout | null = null;

	constructor(
		private ioTracker: IIOTracker,
		heartbeatOptions: HeartbeatOptions,
	) {
		super();

		this.options = resolveHeartbeatOptions(heartbeatOptions);
	}

	start() {
		if (this.running) return;

		this.failures = 0;
		this.signal = 0;

		this.dead = false;
		this.running = true;

		this.worker();
	}

	stop() {
		this.running = false;

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	getStatus() {
		return {
			running: this.running,
			dead: this.dead,
			failures: this.failures,
		};
	}

	private nextSignal() {
		if (this.options.mode === HeartbeatPingMode.TOGGLE_BIT)
			this.signal ^= 1;
		else this.signal = (this.signal + 1) & 0xffff;

		return this.signal;
	}

	private shouldSkip() {
		if (!this.options.suppressWithTraffic) return false;

		return (
			Date.now() - this.ioTracker.getLastCallSuccessTime() <
			this.options.interval
		);
	}

	private worker() {
		if (this.timer) clearTimeout(this.timer);

		const loop = async () => {
			try {
				if (this.shouldSkip()) return;

				await this.options.ping(this.nextSignal());

				this.failures = 0;
				this.dead = false;
			} catch (err) {
				this.failures++;

				if (this.failures > this.options.maxFailures) {
					this.running = false;

					if (!this.dead) {
						this.dead = true;
						this.emit(
							'dead',
							new S7HeartbeatError((err as Error).message, {
								failures: this.failures,
								maxFailures: this.options.maxFailures,
							}),
						);
					}
				}
			} finally {
				if (this.running)
					this.timer = setTimeout(loop, this.options.interval);
			}
		};

		this.timer = setTimeout(loop, this.options.interval);
	}
}
