import { AddressType } from './S7ClientSession.types.js';
import { HeartbeatPingMode } from '../../features/keepalive/index.js';

export const DEFAULT_S7_CLIENT_RUNTIME_OPTIONS = {
	connect: {
		addressType: AddressType.TSAP,
		ConnectionType: 0x03,
		port: 102,
		timeout: 3000,
	},
	io: {
		maxQueueSize: 1000,
	},
	heartbeat: {
		interval: 2000,
		maxFailures: 5,
		mode: HeartbeatPingMode.TOGGLE_BIT,
		suppressWithTraffic: true,
	},
	reconnect: {
		disable: false,
		initDelay: 1000,
		maxDelay: 30000,
		maxRetries: Infinity,
	},
} as const;

export const IO_METHOD_MAP = {
	readArea: 'ReadArea',
	writeArea: 'WriteArea',
	dbRead: 'DBRead',
	dbWrite: 'DBWrite',
	dbWriteHeartbeatBit: 'DBWriteHeartbeatBit',
	dbWriteHeartbeatSequence: 'DBWriteHeartbeatSequence',
	abRead: 'ABRead',
	abWrite: 'ABWrite',
	ebRead: 'EBRead',
	ebWrite: 'EBWrite',
	mbRead: 'MBRead',
	mbWrite: 'MBWrite',
	tmRead: 'TMRead',
	tmWrite: 'TMWrite',
	ctRead: 'CTRead',
	ctWrite: 'CTWrite',
	readMultiVars: 'ReadMultiVars',
	writeMultiVars: 'WriteMultiVars',
	getPlcDateTime: 'GetPlcDateTime',
	setPlcDateTime: 'SetPlcDateTime',
	setPlcSystemDateTime: 'SetPlcSystemDateTime',
	getCpuInfo: 'GetCpuInfo',
	getCpInfo: 'GetCpInfo',
	plcStatus: 'PlcStatus',
} as const;
