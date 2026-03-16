export enum EffectType {
	CONNECT = 'CONNECT',
	DISCONNECT = 'DISCONNECT',
	START_RETRY_TIMER = 'START_RETRY_TIMER',
	STOP_RETRY_TIMER = 'STOP_RETRY_TIMER',
	START_HEARTBEAT = 'START_HEARTBEAT',
	STOP_HEARTBEAT = 'STOP_HEARTBEAT',
}

export type Effect =
	| { type: EffectType.CONNECT; payload?: unknown }
	| { type: EffectType.DISCONNECT }
	| {
			type: EffectType.START_RETRY_TIMER;
			payload?: Error;
	  }
	| { type: EffectType.STOP_RETRY_TIMER }
	| { type: EffectType.START_HEARTBEAT }
	| { type: EffectType.STOP_HEARTBEAT };

export enum State {
	CONNECTING = 'CONNECTING',
	CONNECTED = 'CONNECTED',
	WAITING_FOR_RETRY = 'WAITING_FOR_RETRY',
	DISCONNECTED = 'DISCONNECTED',
}

export enum ActionType {
	CONNECT = 'CONNECT',
	CONNECT_OK = 'CONNECT_OK',
	CONNECT_NOK = 'CONNECT_NOK',
	DISCONNECT = 'DISCONNECT',
	RETRY = 'RETRY',
	IO_NETWORK_ERROR = 'IO_NETWORK_ERROR',
	HEARTBEAT_FAIL = 'HEARTBEAT_FAIL',
}

export type Action =
	| { type: ActionType.CONNECT; payload: unknown }
	| { type: ActionType.CONNECT_OK }
	| {
			type: ActionType.CONNECT_NOK;
			payload: Error;
	  }
	| { type: ActionType.DISCONNECT }
	| { type: ActionType.RETRY; payload?: unknown }
	| {
			type: ActionType.IO_NETWORK_ERROR;
			payload: Error;
	  }
	| {
			type: ActionType.HEARTBEAT_FAIL;
			payload: Error;
	  };

export type StateListener = (prev: State, next: State) => void;
