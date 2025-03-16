/**
 * Wrap a callback in a debounced timeout.
 * Delay execution of the callback function until the function has not been called for delay milliseconds
 * @param {Function} callback       A function to execute once the debounced threshold has been passed
 * @param {number} delay            An amount of time in milliseconds to delay
 */
export function debounce(callback, delay) {
	let timeoutId;
	return function (...args) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			callback.apply(this, args);
		}, delay);
	};
}
