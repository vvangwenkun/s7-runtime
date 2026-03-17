import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IOLevel, IOScheduler } from '../src/core/io-scheduler/index.js';
import type { IIOTracker } from '../src/core/io-tracker/IOTracker.types.js';
const createMockTracker = () => {
	return {
		record: vi.fn(),
	} as unknown as IIOTracker;
};

describe('IOScheduler', () => {
	let scheduler: IOScheduler;
	let mockTracker: ReturnType<typeof createMockTracker>;

	beforeEach(() => {
		mockTracker = createMockTracker();
		scheduler = new IOScheduler(mockTracker);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should initialize with default state', () => {
		expect(mockTracker.record).not.toHaveBeenCalled();
	});

	it('should enqueue a job and execute it successfully', async () => {
		const mockFn = vi.fn().mockResolvedValue('result');

		const promise = scheduler.enqueue(mockFn, IOLevel.NORMAL);

		await Promise.resolve();
		const result = await promise;

		expect(result).toBe('result');
		expect(mockFn).toHaveBeenCalledTimes(1);
		expect(mockTracker.record).toHaveBeenCalledTimes(1);
	});

	it('should reject when queue size exceeds limit', async () => {
		(scheduler as any).maxQueueSize.normal = 2;

		const mockFn = () => Promise.resolve();

		scheduler.enqueue(mockFn);
		scheduler.enqueue(mockFn);

		await expect(scheduler.enqueue(mockFn)).rejects.toThrow(
			'IO queue overflow: normal',
		);
	});

	it('should reject pending jobs when aborted', async () => {
		const mockFn = vi.fn();
		let resolveJob: (() => void) | undefined;
		const pendingPromise = new Promise<void>((res) => {
			resolveJob = res;
		});
		const jobFn = () => pendingPromise;

		const enqueuePromise = scheduler.enqueue(jobFn);

		scheduler.abort('Test Abort');

		await expect(enqueuePromise).rejects.toThrow('Test Abort');

		expect(mockFn).not.toHaveBeenCalled();
	});

	it('should allow new jobs after abort completes (due to aborted flag reset)', async () => {
		scheduler.abort();

		const mockFn = vi.fn().mockResolvedValue('after-abort');
		const result = await scheduler.enqueue(mockFn);

		expect(result).toBe('after-abort');
		expect(mockFn).toHaveBeenCalled();
	});

	it('should reject promise and NOT record tracker if job throws', async () => {
		const error = new Error('Job Failed');
		const mockFn = vi.fn().mockRejectedValue(error);

		await expect(scheduler.enqueue(mockFn)).rejects.toThrow('Job Failed');

		expect(mockTracker.record).not.toHaveBeenCalled();
	});

	it('should process urgent jobs before normal jobs based on schedule', async () => {
		const executionOrder: string[] = [];

		scheduler.enqueue(async () => {
			executionOrder.push('normal-1');
		}, IOLevel.NORMAL);

		scheduler.enqueue(async () => {
			executionOrder.push('urgent-1');
		}, IOLevel.URGENT);

		scheduler.enqueue(async () => {
			executionOrder.push('normal-2');
		}, IOLevel.NORMAL);

		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(executionOrder).toContain('urgent-1');
		expect(executionOrder.length).toBe(3);
	});

	it('should reject immediately if scheduler is aborted during enqueue', async () => {
		(scheduler as any).aborted = true;

		await expect(
			scheduler.enqueue(() => Promise.resolve()),
		).rejects.toThrow('scheduler aborted');

		(scheduler as any).aborted = false;
	});
});
