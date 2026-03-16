import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	afterEach,
	beforeAll,
	afterAll,
	MockedFunction,
	Mock,
} from 'vitest';
import { Heartbeat } from '../src/features/keepalive/Heartbeat.js';
import { resolveHeartbeatOptions } from '../src/features/keepalive/resolveHeartbeatOptions.js';
import { S7HeartbeatError } from '../src/errors/index.js';
import { HeartbeatPingMode } from '../src/features/keepalive/Heartbeat.types.js';
import type { IIOTracker } from '../src/core/io-tracker/index.js';
import type { HeartbeatOptions } from '../src/features/keepalive/Heartbeat.types.js';

vi.mock('../src/features/keepalive/resolveHeartbeatOptions.js');

describe('Heartbeat Class', () => {
	let mockIoTracker: IIOTracker;
	let mockPingFn: Mock<(signal: number) => Promise<void>>;
	let mockResolveOptions: MockedFunction<typeof resolveHeartbeatOptions>;

	beforeAll(() => {
		vi.useFakeTimers();
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockIoTracker = {
			getLastCallSuccessTime: vi.fn().mockReturnValue(0),
		} as unknown as IIOTracker;

		mockPingFn = vi
			.fn()
			.mockImplementation((signal: number) => Promise.resolve());

		mockResolveOptions = vi.mocked(resolveHeartbeatOptions);
		mockResolveOptions.mockReturnValue({
			mode: HeartbeatPingMode.SEQUENCE,
			interval: 1000,
			maxFailures: 3,
			ping: mockPingFn,
		});
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	it('should initialize correctly with resolved options', () => {
		const options = {
			ping: mockPingFn,
		} as HeartbeatOptions;

		const heartbeat = new Heartbeat(mockIoTracker, options);

		expect(resolveHeartbeatOptions).toHaveBeenCalledWith(options);
		expect((heartbeat as any).options).toBeDefined();
		expect((heartbeat as any).running).toBe(false);
		expect((heartbeat as any).dead).toBe(false);
	});

	it('start() should set running state and trigger worker', () => {
		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);

		const workerSpy = vi.spyOn(heartbeat as any, 'worker');

		heartbeat.start();

		expect((heartbeat as any).running).toBe(true);
		expect((heartbeat as any).failures).toBe(0);
		expect((heartbeat as any).dead).toBe(false);
		expect(workerSpy).toHaveBeenCalledTimes(1);
	});

	it('start() should return early if already running', () => {
		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);
		const workerSpy = vi.spyOn(heartbeat as any, 'worker');

		heartbeat.start();
		vi.clearAllMocks();

		heartbeat.start();

		expect(workerSpy).not.toHaveBeenCalled();
	});

	it('stop() should clear timer and set running to false', () => {
		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);
		heartbeat.start();

		const timerSpy = vi.spyOn(global, 'clearTimeout');

		heartbeat.stop();

		expect((heartbeat as any).running).toBe(false);
		expect(timerSpy).toHaveBeenCalled();
	});

	it('getStatus() should return current state snapshot', () => {
		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);
		heartbeat.start();

		(heartbeat as any).failures = 2;
		(heartbeat as any).dead = false;

		const status = heartbeat.getStatus();

		expect(status).toEqual({
			running: true,
			dead: false,
			failures: 2,
		});
	});

	it('nextSignal() should toggle bit in TOGGLE_BIT mode', () => {
		mockResolveOptions.mockReturnValue({
			mode: HeartbeatPingMode.TOGGLE_BIT,
			interval: 1000,
			maxFailures: 3,
			ping: mockPingFn,
		});

		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);

		expect((heartbeat as any).nextSignal()).toBe(1);
		expect((heartbeat as any).nextSignal()).toBe(0);
		expect((heartbeat as any).nextSignal()).toBe(1);
	});

	it('nextSignal() should increment in INCREMENT mode', () => {
		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);

		expect((heartbeat as any).nextSignal()).toBe(1);
		expect((heartbeat as any).nextSignal()).toBe(2);
	});

	it('worker should skip ping if shouldSkip returns true', async () => {
		const now = Date.now();
		vi.spyOn(Date, 'now').mockReturnValue(now);
		(
			mockIoTracker.getLastCallSuccessTime as ReturnType<typeof vi.fn>
		).mockReturnValue(now);

		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);
		heartbeat.start();

		await vi.runOnlyPendingTimersAsync();

		expect(mockPingFn).not.toHaveBeenCalled();
	});

	it('worker should reset failures on successful ping', async () => {
		mockPingFn.mockResolvedValue(undefined);
		(
			mockIoTracker.getLastCallSuccessTime as ReturnType<typeof vi.fn>
		).mockReturnValue(0);

		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);
		(heartbeat as any).failures = 2;
		heartbeat.start();

		await vi.runOnlyPendingTimersAsync();

		expect(mockPingFn).toHaveBeenCalledTimes(1);
		expect((heartbeat as any).failures).toBe(0);
		expect((heartbeat as any).dead).toBe(false);
	});

	it('worker should increment failures on ping error', async () => {
		mockPingFn.mockRejectedValue(new Error('Network Error'));
		(
			mockIoTracker.getLastCallSuccessTime as ReturnType<typeof vi.fn>
		).mockReturnValue(0);

		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);
		heartbeat.start();

		await vi.runOnlyPendingTimersAsync();

		expect((heartbeat as any).failures).toBe(1);
	});

	it('worker should emit "dead" event when maxFailures exceeded', async () => {
		mockPingFn.mockRejectedValue(new Error('Fail'));
		(
			mockIoTracker.getLastCallSuccessTime as ReturnType<typeof vi.fn>
		).mockReturnValue(0);

		mockResolveOptions.mockReturnValue({
			mode: HeartbeatPingMode.SEQUENCE,
			interval: 1000,
			maxFailures: 1,
			ping: mockPingFn,
		});

		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);

		const deadListener = vi.fn();
		heartbeat.on('dead', deadListener);

		heartbeat.start();

		await vi.runOnlyPendingTimersAsync();
		await vi.runOnlyPendingTimersAsync();

		expect((heartbeat as any).running).toBe(false);
		expect((heartbeat as any).dead).toBe(true);
		expect(deadListener).toHaveBeenCalledTimes(1);

		const emittedError = deadListener.mock.calls[0][0];
		expect(emittedError).toBeInstanceOf(S7HeartbeatError);
		expect((emittedError as S7HeartbeatError).context).toEqual({
			failures: 2,
			maxFailures: 1,
		});
	});

	it('worker should not reschedule timer if running becomes false', async () => {
		mockPingFn.mockRejectedValue(new Error('Fail'));
		mockResolveOptions.mockReturnValue({
			mode: HeartbeatPingMode.SEQUENCE,
			interval: 1000,
			maxFailures: 0,
			ping: mockPingFn,
		});

		const heartbeat = new Heartbeat(mockIoTracker, {} as HeartbeatOptions);
		heartbeat.start();

		await vi.runOnlyPendingTimersAsync();
		expect(mockPingFn).toHaveBeenCalledTimes(1);

		heartbeat.stop();

		await (heartbeat as any).worker();

		expect(mockPingFn).toHaveBeenCalledTimes(1);
		expect((heartbeat as any).running).toBe(false);
	});
});
