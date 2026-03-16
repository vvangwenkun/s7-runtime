import { IOLevel, IOJob } from './IOScheduler.types.js';
import type { IIOTracker } from '../io-tracker/index.js';

export class IOScheduler {
	private running = false;
	private aborted = false;

	private reconnectQueue: IOJob<any>[] = [];
	private urgentQueue: IOJob<any>[] = [];
	private heartbeatQueue: IOJob<any>[] = [];
	private normalQueue: IOJob<any>[] = [];
	private maxQueueSize = {
		[IOLevel.RECONNECT]: 2,
		[IOLevel.URGENT]: 20,
		[IOLevel.HEARTBEAT]: 10,
		[IOLevel.NORMAL]: 1000,
	};

	private schedule = [
		IOLevel.RECONNECT,
		IOLevel.URGENT,
		IOLevel.URGENT,
		IOLevel.URGENT,
		IOLevel.URGENT,
		IOLevel.URGENT,
		IOLevel.HEARTBEAT,
		IOLevel.NORMAL,
		IOLevel.NORMAL,
		IOLevel.NORMAL,
		IOLevel.NORMAL,
		IOLevel.NORMAL,
		IOLevel.NORMAL,
		IOLevel.NORMAL,
		IOLevel.NORMAL,
		IOLevel.NORMAL,
		IOLevel.NORMAL,
	] as const;
	private scheduleIndex = 0;

	constructor(private ioTracker: IIOTracker) {}

	enqueue<T>(
		fn: () => Promise<T>,
		level: IOLevel = IOLevel.NORMAL,
	): Promise<T> {
		if (this.aborted) {
			return Promise.reject(new Error('scheduler aborted'));
		}

		const queue = this.getQueue(level);

		if (queue.length >= this.maxQueueSize[level]) {
			return Promise.reject(new Error(`IO queue overflow: ${level}`));
		}

		return new Promise((resolve, reject) => {
			const job: IOJob<T> = {
				level,
				run: fn,
				resolve,
				reject,
			};

			queue.push(job);

			this.wakeUp();
		});
	}

	abort(reason?: string) {
		this.aborted = true;

		const err = new Error(reason ?? 'scheduler aborted');

		const queues = [
			this.reconnectQueue,
			this.urgentQueue,
			this.heartbeatQueue,
			this.normalQueue,
		];

		for (const q of queues) {
			while (q.length) {
				q.shift()!.reject(err);
			}
		}

		this.aborted = false;
	}

	private getQueue(level: IOLevel) {
		switch (level) {
			case IOLevel.RECONNECT:
				return this.reconnectQueue;
			case IOLevel.URGENT:
				return this.urgentQueue;
			case IOLevel.HEARTBEAT:
				return this.heartbeatQueue;
			case IOLevel.NORMAL:
				return this.normalQueue;
		}
	}

	private dequeue(): IOJob<any> | undefined {
		for (let i = 0; i < this.schedule.length; i++) {
			const level = this.schedule[this.scheduleIndex];
			const queue = this.getQueue(level!);

			this.scheduleIndex =
				(this.scheduleIndex + 1) % this.schedule.length;

			if (queue.length > 0) return queue.shift();
		}

		return undefined;
	}

	private wakeUp() {
		if (!this.running) {
			this.running = true;
			queueMicrotask(this.worker.bind(this));
		}
	}

	private async worker() {
		while (!this.aborted) {
			const job = this.dequeue();

			if (!job) {
				this.running = false;
				return;
			}

			try {
				const result = await job.run();

				this.ioTracker.record();

				job.resolve(result);
			} catch (err) {
				job.reject(err);
			}
		}
	}
}
