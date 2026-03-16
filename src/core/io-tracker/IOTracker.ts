import { IIOTracker } from './IOTracker.types.js';

export class IOTracker implements IIOTracker {
	private lastCallSuccessTime = Date.now();

	record() {
		this.lastCallSuccessTime = Date.now();
	}

	getLastCallSuccessTime() {
		return this.lastCallSuccessTime;
	}
}
