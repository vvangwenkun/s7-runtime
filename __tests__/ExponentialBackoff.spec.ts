import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExponentialBackoffPolicy } from '../src/features/reconnect/ExponentialBackoff.js';

describe('ExponentialBackoffPolicy', () => {
	let randomSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
	});

	afterEach(() => {
		randomSpy.mockRestore();
	});

	describe('Constructor', () => {
		it('should initialize with default values', () => {
			const policy = new ExponentialBackoffPolicy();

			expect(policy.getAttempt()).toBe(0);
			expect(policy.canRetry()).toBe(true);
		});

		it('should initialize with custom values', () => {
			const policy = new ExponentialBackoffPolicy(2000, 10000, 3);
			expect(policy.getAttempt()).toBe(0);
			expect(policy.canRetry()).toBe(true);
		});
	});

	describe('next()', () => {
		it('should calculate exponential backoff correctly', () => {
			const policy = new ExponentialBackoffPolicy(1000, 5000, 5);

			const delay1 = policy.next();
			expect(delay1).toBe(500);
			expect(policy.getAttempt()).toBe(1);

			const delay2 = policy.next();
			expect(delay2).toBe(1000);
			expect(policy.getAttempt()).toBe(2);
		});

		it('should cap delay at maxDelay', () => {
			const policy = new ExponentialBackoffPolicy(1000, 1500, 5);

			expect(policy.next()).toBe(500);
			expect(policy.next()).toBe(750);
		});

		it('should throw error when maxRetries is reached', () => {
			const policy = new ExponentialBackoffPolicy(1000, 5000, 2);

			policy.next(); // attempt becomes 1
			policy.next(); // attempt becomes 2

			expect(() => policy.next()).toThrow(
				'Reconnect policy exhausted: maximum attempts (2) reached',
			);

			expect(policy.getAttempt()).toBe(2);
		});
	});

	describe('canRetry()', () => {
		it('should return true initially', () => {
			const policy = new ExponentialBackoffPolicy(1000, 5000, 1);
			expect(policy.canRetry()).toBe(true);
		});

		it('should return false when attempts equal maxRetries', () => {
			const policy = new ExponentialBackoffPolicy(1000, 5000, 1);

			policy.next(); // attempt becomes 1

			expect(policy.canRetry()).toBe(false);
		});

		it('should always return true if maxRetries is Infinity', () => {
			const policy = new ExponentialBackoffPolicy(1000, 5000, Infinity);

			for (let i = 0; i < 100; i++) {
				policy.next();
			}

			expect(policy.canRetry()).toBe(true);
		});
	});

	describe('reset()', () => {
		it('should reset attempt count to 0', () => {
			const policy = new ExponentialBackoffPolicy(1000, 5000, 2);

			policy.next();
			policy.next();
			expect(policy.getAttempt()).toBe(2);
			expect(policy.canRetry()).toBe(false);

			policy.reset();
			expect(policy.getAttempt()).toBe(0);
			expect(policy.canRetry()).toBe(true);
		});

		it('should allow retrying after reset', () => {
			const policy = new ExponentialBackoffPolicy(1000, 5000, 1);

			policy.next(); // Exhaust retries

			expect(() => policy.next()).toThrow();

			policy.reset(); // Reset state

			expect(() => policy.next()).not.toThrow();
			expect(policy.getAttempt()).toBe(1);
		});
	});
});
