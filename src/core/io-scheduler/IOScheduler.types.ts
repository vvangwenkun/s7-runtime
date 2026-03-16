export enum IOLevel {
	RECONNECT = 'reconnect',
	URGENT = 'urgent',
	HEARTBEAT = 'heartbeat',
	NORMAL = 'normal',
}

export type IOJob<T> = {
	level: IOLevel;
	run: () => Promise<T>;
	resolve: (v: T) => void;
	reject: (e: any) => void;
};
