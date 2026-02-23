








export const browser = typeof window !== 'undefined';




export function isBrowser(): boolean {
	return typeof window !== 'undefined';
}





export function isSecureContext(): boolean {
	if (!browser) return false;
	return window.isSecureContext ?? false;
}




export function hasAPI(apiName: string): boolean {
	if (!browser) return false;
	return apiName in window;
}
