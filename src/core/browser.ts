/**
 * Browser detection utilities
 * Replaces SvelteKit's $app/environment dependency
 */

/**
 * Whether code is running in a browser environment
 * SSR-safe - returns false during server-side rendering
 */
export const browser = typeof window !== 'undefined';

/**
 * Function version for lazy evaluation
 */
export function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

/**
 * Check if running in a secure context (HTTPS or localhost)
 * Required for DeviceMotion and some Web APIs
 */
export function isSecureContext(): boolean {
	if (!browser) return false;
	return window.isSecureContext ?? false;
}

/**
 * Check if a specific API is available
 */
export function hasAPI(apiName: string): boolean {
	if (!browser) return false;
	return apiName in window;
}
