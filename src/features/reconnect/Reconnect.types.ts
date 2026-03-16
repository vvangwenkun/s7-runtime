export interface ReconnectPolicy {
	next(): number;
	canRetry(): boolean;
	getAttempt(): number;
	reset(): void;
}
