export function delay(milliseconds: number) {
	if (milliseconds < 1) {
		throw new Error('milliseconds must be >= 1');
	}

	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
