import {
	S7ClientSession,
	AddressType,
	HeartbeatPingMode,
} from '@teamwang-design/s7-runtime';

const session = new S7ClientSession({
	connect: {
		ip: '127.0.0.1',
		port: 102,
		addressType: AddressType.RACK_SLOT,
		rack: 0,
		slot: 1,
		timeout: 10000,
	},
	reconnect: {
		disable: false,
		initDelay: 1000,
		maxDelay: 30000,
		maxRetries: 10,
	},
	heartbeat: {
		interval: 2000,
		maxFailures: 3,
		mode: HeartbeatPingMode.TOGGLE_BIT,
		dbNumber: 10,
		start: 0,
	},
});

session.on('connect', (sessionId) => {
	console.log(`session connected successfully: ${sessionId}`);
});
session.on('disconnect', (sessionId) => {
	console.log(`session disconnected: ${sessionId}`);
});
session.on('waitingForRetry', (sessionId, attempt) => {
	console.log(`reconnecting[${attempt}]: ${sessionId}`);
});
session.on('runtimeError', (sessionId, error) => {
	console.error(`session error[${sessionId}]: `, error);
});

session.start();

session.once('connect', async () => {
	try {
		const data = await session.dbRead(10, 10, 6);
		console.log('read data: ', data.toString('utf-8', 2));
		const buf = Buffer.alloc(4);
		buf.write('test', 'utf-8');
		await session.dbWrite(10, 20, 4, buf);
	} catch (error) {
		console.error('IO operation failed: ', error);
	}
});

process.on('SIGINT', () => {
	session.end();
	process.exit(0);
});
