import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	Mock,
	MockedFunction,
} from 'vitest';
import {
	ActionType,
	State,
	Effect,
	EffectType,
} from '../src/state/connect/ConnState.types.js';
import { ConnStateMachine } from '../src/state/connect/ConnStateMachine.js';
import { ConnStateReducer } from '../src/state/connect/ConnStateReducer.js';

vi.mock('../src/state/connect/ConnStateReducer.js', () => ({
	ConnStateReducer: vi.fn(),
}));

describe('ConnStateMachine', () => {
	let effectRunnerMock: Mock<(e: Effect) => void>;
	let mockedConnStateReducer: MockedFunction<typeof ConnStateReducer>;

	beforeEach(() => {
		vi.clearAllMocks();
		effectRunnerMock = vi.fn();
		mockedConnStateReducer = vi.mocked(ConnStateReducer);

		mockedConnStateReducer.mockReturnValue({
			state: State.DISCONNECTED,
			effects: [],
		});
	});

	it('should create instance with valid maxListenerSize (1-10)', () => {
		expect(() => new ConnStateMachine(5, effectRunnerMock)).not.toThrow();
		expect(() => new ConnStateMachine(1, effectRunnerMock)).not.toThrow();
		expect(() => new ConnStateMachine(10, effectRunnerMock)).not.toThrow();
	});

	it('should throw error if maxListenerSize is out of range', () => {
		expect(() => new ConnStateMachine(0, effectRunnerMock)).toThrow(
			'maxListenerSize must be >= 1 && <= 10',
		);
		expect(() => new ConnStateMachine(11, effectRunnerMock)).toThrow(
			'maxListenerSize must be >= 1 && <= 10',
		);
	});

	it('should use default maxListenerSize of 10', () => {
		const machine = new ConnStateMachine(
			undefined as any,
			effectRunnerMock,
		);

		for (let i = 0; i < 10; i++) {
			expect(() => machine.onState(vi.fn())).not.toThrow();
		}

		expect(() => machine.onState(vi.fn())).toThrow(
			'Cannot add more listeners',
		);
	});

	it('should return initial state DISCONNECTED', () => {
		const machine = new ConnStateMachine(5, effectRunnerMock);
		expect(machine.getState()).toBe(State.DISCONNECTED);
	});

	it('should not update state or run effects if reducer returns same state', () => {
		const machine = new ConnStateMachine(5, effectRunnerMock);
		const listenerMock = vi.fn();
		machine.onState(listenerMock);

		mockedConnStateReducer.mockReturnValueOnce({
			state: State.DISCONNECTED,
			effects: [{ type: EffectType.CONNECT }],
		});

		machine.dispatch({ type: ActionType.DISCONNECT });

		expect(machine.getState()).toBe(State.DISCONNECTED);
		expect(listenerMock).not.toHaveBeenCalled();
		expect(effectRunnerMock).not.toHaveBeenCalled();
	});

	it('should update state and emit when reducer returns new state', () => {
		const machine = new ConnStateMachine(5, effectRunnerMock);
		const listenerMock = vi.fn();
		machine.onState(listenerMock);

		mockedConnStateReducer.mockReturnValueOnce({
			state: State.CONNECTING,
			effects: [],
		});

		machine.dispatch({
			type: ActionType.CONNECT,
			payload: { ip: '127.0.0.1' },
		});

		expect(machine.getState()).toBe(State.CONNECTING);
		expect(listenerMock).toHaveBeenCalledWith(
			State.DISCONNECTED,
			State.CONNECTING,
		);
	});

	it('should run effects via effectRunner when present', () => {
		const machine = new ConnStateMachine(5, effectRunnerMock);
		const effect1 = { type: EffectType.STOP_RETRY_TIMER };
		const effect2 = { type: EffectType.START_HEARTBEAT };

		mockedConnStateReducer.mockReturnValueOnce({
			state: State.CONNECTED,
			effects: [effect1, effect2],
		});

		machine.dispatch({ type: ActionType.CONNECT_OK });

		expect(effectRunnerMock).toHaveBeenCalledTimes(2);
		expect(effectRunnerMock).toHaveBeenNthCalledWith(1, effect1);
		expect(effectRunnerMock).toHaveBeenNthCalledWith(2, effect2);
	});

	it('should add listener and return unsubscribe function', () => {
		const machine = new ConnStateMachine(5, effectRunnerMock);
		const listenerMock = vi.fn();

		const unsubscribe = machine.onState(listenerMock);

		mockedConnStateReducer.mockReturnValueOnce({
			state: State.CONNECTING,
			effects: [],
		});
		machine.dispatch({
			type: ActionType.CONNECT,
			payload: { ip: '127.0.0.1' },
		});
		expect(listenerMock).toHaveBeenCalledTimes(1);

		unsubscribe();

		mockedConnStateReducer.mockReturnValueOnce({
			state: State.CONNECTED,
			effects: [],
		});
		machine.dispatch({ type: ActionType.CONNECT_OK });
		expect(listenerMock).toHaveBeenCalledTimes(1);
	});

	it('should throw error when adding listeners exceeds maxListenerSize', () => {
		const max = 2;
		const machine = new ConnStateMachine(max, effectRunnerMock);

		machine.onState(vi.fn());
		machine.onState(vi.fn());

		expect(() => machine.onState(vi.fn())).toThrow(
			`Cannot add more listeners, Max allowed: ${max}`,
		);
	});

	it('should swallow errors thrown by state listeners', () => {
		const machine = new ConnStateMachine(5, effectRunnerMock);

		const errorListener = vi.fn(() => {
			throw new Error('Listener Error');
		});
		const normalListener = vi.fn();

		machine.onState(errorListener);
		machine.onState(normalListener);

		mockedConnStateReducer.mockReturnValueOnce({
			state: State.CONNECTING,
			effects: [],
		});

		expect(() => {
			machine.dispatch({
				type: ActionType.CONNECT,
				payload: { ip: '127.0.0.1' },
			});
		}).not.toThrow();

		expect(errorListener).toHaveBeenCalled();
		expect(normalListener).toHaveBeenCalled();
	});
});
