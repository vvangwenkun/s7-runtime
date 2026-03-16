export function promisify<T>(fn: (...args: any[]) => void) {
	return (...args: any[]) => {
		return new Promise<T>((resolve, reject) => {
			try {
				fn(...args, (err: number, data?: T) => {
					if (err) reject(err);
					else resolve(data as T);
				});
			} catch (err) {
				reject(err);
			}
		});
	};
}
