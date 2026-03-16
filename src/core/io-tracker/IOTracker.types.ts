export interface IIOTracker {
	record(): void;

	getLastCallSuccessTime(): number;
}
