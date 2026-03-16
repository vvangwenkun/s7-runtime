import { State } from './ConnState.types.js';
import { ConnStateReducer } from './ConnStateReducer.js';
import type { Action, Effect, StateListener } from './ConnState.types.js';

export class ConnStateMachine {
	private state = State.DISCONNECTED;
	private listeners = new Set<StateListener>();

	constructor(
		private maxListenerSize = 10,
		private effectRunner: (effect: Effect) => void,
	) {
		if (this.maxListenerSize < 1 || this.maxListenerSize > 10) {
			throw new Error('maxListenerSize must be >= 1 && <= 10');
		}
	}

	dispatch(action: Action) {
		const prev = this.state;
		const { state: next, effects } = ConnStateReducer(prev, action);
		if (next === prev) return;

		this.state = next;
		this.emitState(prev, next);

		effects.forEach((e) => this.effectRunner(e));
	}

	getState() {
		return this.state;
	}

	onState(listener: StateListener) {
		if (this.listeners.size >= this.maxListenerSize) {
			throw new Error(
				`Cannot add more listeners, Max allowed: ${this.maxListenerSize}`,
			);
		}

		this.listeners.add(listener);

		return () => this.listeners.delete(listener);
	}

	emitState(prev: State, next: State) {
		for (const listener of this.listeners) {
			try {
				listener(prev, next);
			} catch (err) {}
		}
	}
}
