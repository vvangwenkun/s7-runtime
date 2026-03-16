import { ActionType, EffectType, State } from './ConnState.types.js';
import type { Action, Effect } from './ConnState.types.js';

const transitions: Record<State, Record<string, State>> = {
	[State.CONNECTING]: {
		[ActionType.CONNECT_OK]: State.CONNECTED,
		[ActionType.CONNECT_NOK]: State.WAITING_FOR_RETRY,
		[ActionType.DISCONNECT]: State.DISCONNECTED,
	},
	[State.CONNECTED]: {
		[ActionType.IO_NETWORK_ERROR]: State.WAITING_FOR_RETRY,
		[ActionType.HEARTBEAT_FAIL]: State.WAITING_FOR_RETRY,
		[ActionType.DISCONNECT]: State.DISCONNECTED,
	},
	[State.WAITING_FOR_RETRY]: {
		[ActionType.RETRY]: State.CONNECTING,
		[ActionType.DISCONNECT]: State.DISCONNECTED,
	},
	[State.DISCONNECTED]: {
		[ActionType.CONNECT]: State.CONNECTING,
	},
};

export function ConnStateReducer(state: State, action: Action) {
	const next = transitions[state]?.[action.type];
	if (!next) return { state, effects: [] };

	const effects: Effect[] = [];

	if (next === State.CONNECTING) {
		if (
			action.type === ActionType.CONNECT ||
			action.type === ActionType.RETRY
		) {
			effects.push({
				type: EffectType.CONNECT,
				payload: action.payload,
			});
		}
	}

	if (next === State.WAITING_FOR_RETRY) {
		if (
			action.type === ActionType.CONNECT_NOK ||
			action.type === ActionType.HEARTBEAT_FAIL ||
			action.type === ActionType.IO_NETWORK_ERROR
		) {
			effects.push(
				{ type: EffectType.DISCONNECT },
				{ type: EffectType.STOP_HEARTBEAT },
				{ type: EffectType.STOP_RETRY_TIMER },
				{ type: EffectType.START_RETRY_TIMER, payload: action.payload },
			);
		}
	}

	if (next === State.DISCONNECTED) {
		effects.push(
			{ type: EffectType.STOP_HEARTBEAT },
			{ type: EffectType.STOP_RETRY_TIMER },
			{ type: EffectType.DISCONNECT },
		);
	}

	if (next === State.CONNECTED) {
		effects.push(
			{ type: EffectType.STOP_RETRY_TIMER },
			{ type: EffectType.START_HEARTBEAT },
		);
	}

	return { state: next, effects };
}
