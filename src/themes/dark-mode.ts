// Multi-signal dark detection. Consumers signal dark in different ways:
// a `.dark` class (Tailwind `darkMode: 'class'`), Skeleton v4's
// `data-mode="dark"` attribute, or a `color-scheme: dark` computed on the
// root element. Any one of them counts as dark.

export function isDarkMode(): boolean {
	if (typeof document === 'undefined') return false;
	const root = document.documentElement;
	return (
		root.classList.contains('dark') ||
		root.getAttribute('data-mode') === 'dark' ||
		(typeof getComputedStyle === 'function' &&
			getComputedStyle(root).colorScheme === 'dark')
	);
}

// Explicit override beats detection: a boolean is authoritative,
// null/undefined falls back to the detected signal.
export function resolveDark(
	override: boolean | null | undefined,
	detected: boolean,
): boolean {
	return override ?? detected;
}

export function watchDarkMode(callback: (isDark: boolean) => void): () => void {
	if (typeof document === 'undefined') return () => {};

	const notify = () => callback(isDarkMode());

	const observer = new MutationObserver(notify);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['class', 'data-mode'],
	});

	const media =
		typeof matchMedia === 'function'
			? matchMedia('(prefers-color-scheme: dark)')
			: null;
	media?.addEventListener('change', notify);

	notify();

	return () => {
		observer.disconnect();
		media?.removeEventListener('change', notify);
	};
}
