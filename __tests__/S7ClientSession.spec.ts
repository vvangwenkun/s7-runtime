import {
	describe,
	it,
	expect,
	beforeEach,
	afterEach,
	vi,
	type Mock,
} from 'vitest';
import { S7ClientSession } from '../src/runtime/session/S7ClientSession';
import { AddressType } from '../src/runtime/session/S7ClientSession.types.js';
import { createS7ScheduleClient } from '../src/runtime/client/index.js';
import { Heartbeat } from '../src/features/keepalive/index.js';
import { ConnStateMachine } from '../src/state/connect/index.js';
import { ExponentialBackoffPolicy } from '../src/features/reconnect/index.js';
import { resolveSessionOptions } from '../src/runtime/session/resolveSessionOptions.js';
import { S7Error, S7ErrorCode } from '../src/errors/index.js';
import { State, ActionType, EffectType } from '../src/state/connect/index.js';

vi.mock('../src/runtime/client/index.js');
vi.mock('../src/features/keepalive/index.js');
vi.mock('../src/state/connect/index.js');
vi.mock('../src/features/reconnect/index.js');
vi.mock('../src/logger/index.js', () => ({
	consoleLogger: {
		debug: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
	},
}));
vi.mock('../src/features/reconnect/ExponentialBackoffPolicy.js', () => {
	return {
		ExponentialBackoffPolicy: vi.fn(function () {
			return {
				next: vi.fn().mockReturnValue(5000),
				reset: vi.fn(),
				getAttempt: vi.fn().mockReturnValue(1),
			};
		}),
	};
});
vi.mock('../src/state/connect/ConnStateMachine.js', () => {
	return {
		ConnStateMachine: vi.fn(function (_, handler) {
			effectHandlerCallback = handler;
			return mockStateMachineInstance;
		}),
	};
});
vi.mock('../src/features/keepalive/Heartbeat.js', () => {
	return {
		Heartbeat: vi.fn(function () {
			return mockHeartbeatInstance;
		}),
	};
});

const mockS7Client = {
	SetConnectionType: vi.fn(),
	SetParam: vi.fn(),
	SetConnectionParams: vi.fn(),
	Connect: vi.fn(),
	ConnectTo: vi.fn(),
	Disconnect: vi.fn(),
	DBWriteHeartbeatSequence: vi.fn(),
	DBRead: vi.fn(),
};

const mockHeartbeatInstance = {
	start: vi.fn(),
	stop: vi.fn(),
	on: vi.fn(),
	removeAllListeners: vi.fn(),
};

const mockStateMachineInstance = {
	getState: vi.fn(),
	dispatch: vi.fn(),
	onState: vi.fn(),
};

let effectHandlerCallback: any = null;

describe('S7ClientSession', () => {
	let session: S7ClientSession;
	let mockLogger: any;

	const getDefaultOptions = () => ({
		connect: {
			ip: '192.168.1.1',
			port: 102,
			rack: 0,
			slot: 1,
			addressType: AddressType.RACK_SLOT,
			connectionType: 1,
			timeout: 5000,
			localTSAP: '0100',
			remoteTSAP: '0100',
		},
		reconnect: {
			disable: false,
			initDelay: 1000,
			maxDelay: 30000,
			maxRetries: 5,
		},
		heartbeat: {
			dbNumber: 1,
			start: 0,
			interval: 5000,
		},
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		(createS7ScheduleClient as Mock).mockReturnValue(mockS7Client);

		mockLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
		};

		session = new S7ClientSession(getDefaultOptions() as any, mockLogger);
		session.on('error', () => {});
	});

	afterEach(() => {
		vi.useRealTimers();
		session?.end();
	});

	describe('Constructor', () => {
		it('should initialize all components correctly', () => {
			expect(createS7ScheduleClient).toHaveBeenCalled();
			expect(Heartbeat).toHaveBeenCalled();
			expect(ConnStateMachine).toHaveBeenCalled();
			expect(ExponentialBackoffPolicy).toHaveBeenCalled();
			expect(mockS7Client.SetConnectionType).toHaveBeenCalledWith(1);
			expect(mockS7Client.SetParam).toHaveBeenCalledWith(2, 102);
		});
	});

	describe('start', () => {
		it('should dispatch CONNECT action if state is DISCONNECTED', () => {
			(mockStateMachineInstance.getState as Mock).mockReturnValue(
				State.DISCONNECTED,
			);

			session.start();

			expect(mockStateMachineInstance.dispatch).toHaveBeenCalledWith({
				type: ActionType.CONNECT,
				payload: expect.any(Object),
			});
		});

		it('should do nothing if state is not DISCONNECTED', () => {
			(mockStateMachineInstance.getState as Mock).mockReturnValue(
				State.CONNECTED,
			);

			session.start();

			expect(mockStateMachineInstance.dispatch).not.toHaveBeenCalled();
		});
	});

	describe('end', () => {
		it('should cleanup resources and dispatch DISCONNECT', () => {
			session.start();

			session.end();

			expect(mockStateMachineInstance.dispatch).toHaveBeenCalledWith({
				type: ActionType.DISCONNECT,
			});
			expect(mockHeartbeatInstance.removeAllListeners).toHaveBeenCalled();
		});

		it('should be idempotent (calling twice does not crash)', () => {
			session.end();
			expect(() => session.end()).not.toThrow();
		});

		it('should clear retry timer if exists', () => {
			const timerMock = setTimeout(() => {}, 1000);
			(session as any).retryTimer = timerMock;

			session.end();

			expect(vi.getTimerCount()).toBe(0);
			expect((session as any).retryTimer).toBeNull();
		});
	});

	describe('getSessionId', () => {
		it('should generate ID based on Rack/Slot (covering existing logic bug)', () => {
			const id = session.getSessionId();
			expect(id).toBe('192.168.1.1:0:1');
		});
	});

	describe('handleEffect (Private Method Logic)', () => {
		it('should handle CONNECT effect successfully', async () => {
			(mockS7Client.Connect as Mock).mockResolvedValue(undefined);
			(mockStateMachineInstance.getState as Mock).mockReturnValue(
				State.CONNECTING,
			);

			const effect = {
				type: EffectType.CONNECT,
				payload: { addressType: AddressType.TSAP },
			};

			await effectHandlerCallback(effect);

			expect(mockS7Client.Connect).toHaveBeenCalled();
			expect(mockStateMachineInstance.dispatch).toHaveBeenCalledWith({
				type: ActionType.CONNECT_OK,
			});
		});

		it('should handle CONNECT effect failure', async () => {
			const error = new Error('Connection Failed');
			(mockS7Client.Connect as Mock).mockRejectedValue(error);

			const effect = {
				type: EffectType.CONNECT,
				payload: { addressType: AddressType.TSAP },
			};

			await effectHandlerCallback(effect);

			expect(mockStateMachineInstance.dispatch).toHaveBeenCalledWith({
				type: ActionType.CONNECT_NOK,
				payload: error,
			});
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should handle DISCONNECT effect', async () => {
			const effect = { type: EffectType.DISCONNECT };
			await effectHandlerCallback(effect);

			expect(mockS7Client.Disconnect).toHaveBeenCalled();
		});

		it('should handle START_RETRY_TIMER if reconnectable', async () => {
			const s7Error = new S7Error(
				'Conn Refused',
				S7ErrorCode.ECONNREFUSED,
			);
			const effect = {
				type: EffectType.START_RETRY_TIMER,
				payload: s7Error,
			};

			await effectHandlerCallback(effect);

			expect(vi.getTimerCount()).toBe(1);
		});

		it('should NOT retry if error code is not reconnectable', async () => {
			const s7Error = new S7Error('Unknown', S7ErrorCode.EINVAL);
			const effect = {
				type: EffectType.START_RETRY_TIMER,
				payload: s7Error,
			};

			await effectHandlerCallback(effect);

			expect(vi.getTimerCount()).toBe(0);
		});

		it('should handle STOP_RETRY_TIMER', async () => {
			const effect = { type: EffectType.STOP_RETRY_TIMER };
			await effectHandlerCallback(effect);

			expect((session as any).reconn.reset).toHaveBeenCalled();
			expect((session as any).retrying).toBe(false);
		});

		it('should respect destroyed state in effects', async () => {
			session.end();
			const effect = { type: EffectType.CONNECT, payload: {} };

			await effectHandlerCallback(effect);

			expect(mockS7Client.Connect).not.toHaveBeenCalled();
		});
	});

	describe('IO Method', () => {
		it('should dispatch IO_NETWORK_ERROR on method failure', async () => {
			const err = new S7Error('IO Error', S7ErrorCode.ECONNREFUSED);
			(mockS7Client.DBWriteHeartbeatSequence as Mock).mockRejectedValue(
				err,
			);

			const buf = Buffer.alloc(2);
			buf.writeUint16BE(10086);

			try {
				await session.dbWriteHeartbeatSequence(1, 1, 1, buf, 50000);
			} catch (e) {
				// Expected
			}

			expect(mockStateMachineInstance.dispatch).toHaveBeenCalledWith({
				type: ActionType.IO_NETWORK_ERROR,
				payload: err,
			});
		});
	});
});
