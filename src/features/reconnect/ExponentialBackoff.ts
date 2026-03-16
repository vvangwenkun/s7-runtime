import type { ReconnectPolicy } from './Reconnect.types.js';

export class ExponentialBackoffPolicy implements ReconnectPolicy {
	private attempt = 0;

	constructor(
		private initialDelay = 1000,
		private maxDelay = 5000,
		private maxRetries = Infinity,
	) {}

	next(): number {
		if (!this.canRetry()) {
			throw new Error(
				`Reconnect policy exhausted: maximum attempts (${this.maxRetries}) reached`,
			);
		}

		const delay = Math.min(
			this.initialDelay * Math.pow(2, this.attempt),
			this.maxDelay,
		);

		this.attempt++;

		return Math.random() * delay;
	}

	canRetry(): boolean {
		return this.attempt < this.maxRetries;
	}

	getAttempt() {
		return this.attempt;
	}

	reset(): void {
		this.attempt = 0;
	}
}
