export function timeout<T>(
	asyncFn: () => Promise<T>,
	milliseconds: number,
	reason?: Error,
) {
	if (milliseconds < 1) {
		throw new Error('milliseconds must be >= 1');
	}

	return new Promise<T>((resolve, reject) => {
		let aborted = false;

		const timer = setTimeout(() => {
			aborted = true;
			reject(reason || new Error('Asynchronous call timeout'));
		}, milliseconds);

		asyncFn()
			.then((data: T) => {
				if (!aborted) resolve(data);
			})
			.catch((err) => {
				if (!aborted) reject(err);
			})
			.finally(() => clearTimeout(timer));
	});
}
