import { createS7ScheduleClient, IOLevel } from '@teamwang-design/s7-runtime';

const client = createS7ScheduleClient();

async function run() {
	try {
		await client.ConnectTo('127.0.0.1', 0, 1);
		console.log('PLC connected successfully.');

		const data = await client.DBRead(10, 0, 6, 2000, IOLevel.URGENT);
		console.log('read data: ', data.toString('utf-8', 2));

		const buf = Buffer.alloc(4);
		buf.writeUInt32BE(2026, 0);
		await client.DBWrite(10, 10, 4, buf);

		client.Disconnect();
	} catch (error) {
		console.error('Operation failed', error);
	}
}

run();
