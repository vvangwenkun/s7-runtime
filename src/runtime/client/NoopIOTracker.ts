import { IIOTracker } from '../../core/io-tracker/IOTracker.types.js';

export class NoopIOTracker implements IIOTracker {
	record() {}

	getLastCallSuccessTime() {
		return 0;
	}
}
