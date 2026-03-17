import { EventEmitter } from 'node:events';
import { createS7ScheduleClient } from '../client/index.js';
import {
	Heartbeat,
	HeartbeatPingMode,
} from '../../features/keepalive/index.js';
import { consoleLogger } from '../../logger/index.js';
import { ExponentialBackoffPolicy } from '../../features/reconnect/index.js';
import {
	ActionType,
	ConnStateMachine,
	EffectType,
	State,
} from '../../state/connect/index.js';
import { resolveSessionOptions } from './resolveSessionOptions.js';
import { AddressType } from './S7ClientSession.types.js';
import { S7Error, S7ErrorCode } from '../../errors/index.js';
import { IOTracker } from '../../core/io-tracker/index.js';
import { IO_METHOD_MAP } from './defaults.js';
import type { IS7QueuedClient } from '../client/index.js';
import type { Logger } from '../../logger/index.js';
import type { ReconnectPolicy } from '../../features/reconnect/index.js';
import type { Effect } from '../../state/connect/index.js';
import type {
	ConnectOptions,
	S7ClientSessionOptions,
	S7ClientSessionEvent,
	SessionIOMethods,
} from './S7ClientSession.types.js';

function formatTSAP(TSAP: string | number | undefined) {
	if (TSAP === null || TSAP === undefined || isNaN(Number(TSAP))) {
		return '0000';
	}

	return Number(TSAP).toString(16).toUpperCase().padStart(4, '0');
}

export class S7ClientSession
	extends EventEmitter<S7ClientSessionEvent>
	implements SessionIOMethods
{
	private options;
	private s7Client;
	private sessionId: string | undefined;
	private hb: Heartbeat;
	private sm: ConnStateMachine;
	private reconn: ReconnectPolicy;
	private retryTimer: NodeJS.Timeout | null = null;
	private destroyed = false;
	private retrying = false;
	private ioTracker = new IOTracker();
	private heartbeatSignalBuf = Buffer.alloc(2);

	private static readonly RETRYABLE_ERRORS = new Set([
		S7ErrorCode.ECONNREFUSED,
		S7ErrorCode.ECONNRESET,
		S7ErrorCode.ETIMEDOUT,
	]);

	constructor(
		options: S7ClientSessionOptions,
		private logger: Logger = consoleLogger,
	) {
		super();

		this.options = resolveSessionOptions(options);

		this.s7Client = this.initS7Client();
		this.bindingIO();

		this.reconn = this.initReconnect();
		this.sm = this.initStateMachine();
		this.hb = this.initHeartbeat();
	}

	start() {
		if (this.sm.getState() !== State.DISCONNECTED) return;

		this.destroyed = false;
		this.retrying = false;

		this.sm.dispatch({
			type: ActionType.CONNECT,
			payload: this.options.connect,
		});
	}

	end() {
		if (this.destroyed) return;

		this.destroyed = true;

		if (this.retryTimer) {
			clearTimeout(this.retryTimer);
			this.retryTimer = null;
		}

		this.sm.dispatch({ type: ActionType.DISCONNECT });

		this.hb.removeAllListeners();
	}

	getSessionId() {
		if (!this.sessionId) {
			const { connect } = this.options;
			if (connect.addressType === AddressType.TSAP)
				this.sessionId = `${connect.ip}:${formatTSAP(connect.localTSAP)}:${formatTSAP(connect.remoteTSAP)}`;
			else
				this.sessionId = `${connect.ip}:${connect.rack}:${connect.slot}`;
		}

		return this.sessionId;
	}

	isAlive() {
		return this.sm.getState() === State.CONNECTED;
	}

	readArea!: SessionIOMethods['readArea'];
	writeArea!: SessionIOMethods['writeArea'];
	dbRead!: SessionIOMethods['dbRead'];
	dbWrite!: SessionIOMethods['dbWrite'];
	dbWriteHeartbeatBit!: SessionIOMethods['dbWriteHeartbeatBit'];
	dbWriteHeartbeatSequence!: SessionIOMethods['dbWriteHeartbeatSequence'];
	abRead!: SessionIOMethods['abRead'];
	abWrite!: SessionIOMethods['abWrite'];
	ebRead!: SessionIOMethods['ebRead'];
	ebWrite!: SessionIOMethods['ebWrite'];
	mbRead!: SessionIOMethods['mbRead'];
	mbWrite!: SessionIOMethods['mbWrite'];
	tmRead!: SessionIOMethods['tmRead'];
	tmWrite!: SessionIOMethods['tmWrite'];
	ctRead!: SessionIOMethods['ctRead'];
	ctWrite!: SessionIOMethods['ctWrite'];
	readMultiVars!: SessionIOMethods['readMultiVars'];
	writeMultiVars!: SessionIOMethods['writeMultiVars'];
	getPlcDateTime!: SessionIOMethods['getPlcDateTime'];
	setPlcDateTime!: SessionIOMethods['setPlcDateTime'];
	setPlcSystemDateTime!: SessionIOMethods['setPlcSystemDateTime'];
	getCpuInfo!: SessionIOMethods['getCpuInfo'];
	getCpInfo!: SessionIOMethods['getCpInfo'];
	plcStatus!: SessionIOMethods['plcStatus'];

	private shouldReconnect(code: S7ErrorCode) {
		if (this.options.reconnect.disable) return false;

		return S7ClientSession.RETRYABLE_ERRORS.has(code);
	}

	private bindingIO() {
		for (const [sessionName, clientName] of Object.entries(IO_METHOD_MAP)) {
			(this as any)[sessionName] = async (...args: any[]) => {
				return this.executeIO(clientName, ...args);
			};
		}
	}

	private async executeIO(method: keyof IS7QueuedClient, ...args: any[]) {
		if (this.destroyed) {
			throw new S7Error('Session destroyed', S7ErrorCode.ESHUTDOWN);
		}

		try {
			const result = await (this.s7Client[method] as any)(...args);

			return result;
		} catch (err) {
			this.sm.dispatch({
				type: ActionType.IO_NETWORK_ERROR,
				payload: err as S7Error,
			});

			throw err;
		}
	}

	private initS7Client() {
		const s7Client = createS7ScheduleClient(this.ioTracker);

		const { connect } = this.options;

		s7Client.SetConnectionType(connect.connectionType);
		s7Client.SetParam(2, connect.port);

		if (connect.localTSAP && connect.remoteTSAP) {
			s7Client.SetConnectionParams(
				connect.ip,
				connect.localTSAP,
				connect.remoteTSAP,
			);
		}

		return s7Client;
	}

	private initStateMachine() {
		const sm = new ConnStateMachine(3, this.handleEffect.bind(this));

		sm.onState((prev, next) => {
			this.logger.debug({
				message: 'state change',
				module: 'S7ClientRuntime',
				sessionId: this.getSessionId(),
				prevState: prev,
				nextState: next,
			});

			this.emit('connState', prev, next);
		});

		return sm;
	}

	private initReconnect() {
		const { initDelay, maxDelay, maxRetries } = this.options.reconnect;

		const reconn = new ExponentialBackoffPolicy(
			initDelay,
			maxDelay,
			maxRetries,
		);

		return reconn;
	}

	private initHeartbeat() {
		const { heartbeat } = this.options;

		const hb = new Heartbeat(this.ioTracker, {
			...heartbeat,
			ping: async (signal) => {
				if (this.destroyed) return;

				this.heartbeatSignalBuf.fill(0);

				if (
					this.options.heartbeat.mode === HeartbeatPingMode.SEQUENCE
				) {
					this.heartbeatSignalBuf.writeUint16BE(signal, 0);
					await this.s7Client.DBWriteHeartbeatSequence(
						heartbeat.dbNumber,
						heartbeat.start,
						2,
						this.heartbeatSignalBuf,
						1000,
					);
				} else {
					this.heartbeatSignalBuf.writeUInt8(signal, 0);
					await this.s7Client.DBWriteHeartbeatSequence(
						heartbeat.dbNumber,
						heartbeat.start,
						1,
						this.heartbeatSignalBuf,
						1000,
					);
				}
			},
		});

		hb.on('dead', (error) => {
			this.logger.error({
				message: 'heartbeat dead',
				module: 'S7ClientRuntime',
				sessionId: this.getSessionId(),
				error: error.toJSON(),
			});

			this.emit('heartbeatDead', this.getSessionId(), error);

			this.sm.dispatch({
				type: ActionType.IO_NETWORK_ERROR,
				payload: error,
			});
		});

		return hb;
	}

	private async connect(params: ConnectOptions) {
		if (params.addressType === AddressType.TSAP)
			return this.s7Client.Connect(this.options.connect.timeout);

		return this.s7Client.ConnectTo(
			params.ip,
			params.rack!,
			params.slot!,
			this.options.connect.timeout,
		);
	}

	private async handleEffect(e: Effect) {
		const sessionId = this.getSessionId();

		this.logger.debug({
			message: 'handle effect',
			module: 'S7ClientRuntime',
			sessionId,
			effect: e.type,
			state: this.sm.getState(),
		});

		try {
			switch (e.type) {
				case EffectType.CONNECT:
					if (this.destroyed) return;

					this.logger.info({
						message: 'connecting',
						module: 'S7ClientRuntime',
						sessionId,
					});

					this.emit('connecting', this.getSessionId());

					try {
						await this.connect(e.payload as ConnectOptions);
					} catch (err) {
						this.sm.dispatch({
							type: ActionType.CONNECT_NOK,
							payload: err as Error,
						});
						throw err;
					}

					this.sm.dispatch({
						type: ActionType.CONNECT_OK,
					});

					this.emit('connect', this.getSessionId());

					break;

				case EffectType.DISCONNECT:
					this.logger.info({
						message: 'disconnecting',
						module: 'S7ClientRuntime',
						sessionId,
					});

					this.s7Client.Disconnect();

					this.emit('disconnect', this.getSessionId());

					break;

				case EffectType.START_RETRY_TIMER:
					if (this.retrying) return;

					if (
						e.payload instanceof S7Error &&
						this.shouldReconnect(e.payload.code)
					) {
						this.logger.debug({
							message: 'start reconnect retry',
							module: 'S7ClientRuntime',
							sessionId,
						});

						this.retrying = true;

						if (this.retryTimer) clearTimeout(this.retryTimer);

						this.retryTimer = setTimeout(() => {
							this.sm.dispatch({
								type: ActionType.RETRY,
								payload: this.options.connect,
							});
						}, this.reconn.next());

						this.emit(
							'waitingForRetry',
							this.getSessionId(),
							this.reconn.getAttempt(),
						);
					}

					break;

				case EffectType.STOP_RETRY_TIMER:
					this.logger.debug({
						message: 'stop reconnect retry',
						module: 'S7ClientRuntime',
						sessionId,
					});

					this.retrying = false;

					if (this.retryTimer) {
						clearTimeout(this.retryTimer);
						this.retryTimer = null;
					}

					this.reconn.reset();

					break;

				case EffectType.START_HEARTBEAT:
					this.hb.start();

					break;

				case EffectType.STOP_HEARTBEAT:
					this.hb.stop();

					break;

				default:
					break;
			}
		} catch (err) {
			this.logger.error({
				message: 'handle effect error',
				module: 'S7ClientRuntime',
				sessionId,
				error: err,
			});

			this.emit('runtimeError', this.getSessionId(), err as Error);
		}
	}
}
